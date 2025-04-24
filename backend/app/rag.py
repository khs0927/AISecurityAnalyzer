"""
Retrieval Augmented Generation (RAG) 유틸리티 모듈

이 모듈은 대형 언어 모델(LLM)을 위한 RAG 시스템을 제공합니다.
RAG 시스템은 쿼리에 관련된 문서를 검색하고, 이를 컨텍스트로 사용하여 LLM의 응답을 향상시킵니다.
"""

import os
from typing import List, Dict, Any, Optional, Tuple
import json
import numpy as np
from dotenv import load_dotenv
import logging
import httpx
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import pandas as pd
from pymongo import MongoClient
from fastapi import HTTPException, status, Depends
from openai import OpenAI
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorCollection, AsyncIOMotorDatabase
from pymongo.errors import PyMongoError
from .core.config import settings
from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.vectorstores import Chroma
from langchain.chat_models import ChatOpenAI
from langchain.chains import RetrievalQA
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.document_loaders import TextLoader, PyPDFLoader, CSVLoader
from langchain.schema import Document
from pydantic import BaseModel
from .deps import get_database
from datetime import datetime

# 환경 변수 로드
load_dotenv()

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# API 키 및 설정
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "nottoday")
COLLECTION_NAME = os.getenv("KNOWLEDGE_COLLECTION", "knowledge_base")
CHROMA_PERSIST_DIRECTORY = os.getenv("CHROMA_PERSIST_DIRECTORY", "./chroma_db")

# OpenAI 클라이언트 설정
client = OpenAI(api_key=settings.OPENAI_API_KEY)

# 임베딩 모델 로드 (한국어 지원 모델)
try:
    embedding_model = SentenceTransformer('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')
    logger.info("임베딩 모델이 성공적으로 로드되었습니다.")
except Exception as e:
    logger.error(f"임베딩 모델 로드 실패: {e}")
    embedding_model = None

# 문서 및 청크 모델
class DocumentChunk(BaseModel):
    id: str
    text: str
    metadata: Dict[str, Any]
    embedding: Optional[List[float]] = None

class RAGRequest(BaseModel):
    query: str
    collection_name: str
    max_docs: int = 4
    temperature: float = 0.0

class RAGResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]]
    query: str

class RAGUtility:
    """RAG(Retrieval Augmented Generation) 유틸리티 클래스"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.embeddings = OpenAIEmbeddings(openai_api_key=OPENAI_API_KEY)
        self.collections = {}
        self.llm = ChatOpenAI(
            temperature=0,
            model_name="gpt-4-turbo-preview",
            openai_api_key=OPENAI_API_KEY
        )
    
    async def init_collection(self, collection_name: str, force_reload: bool = False) -> None:
        """벡터 스토어 컬렉션 초기화"""
        if collection_name in self.collections and not force_reload:
            return
        
        try:
            # 컬렉션 설정 확인
            collection_config = await self.db.rag_collections.find_one({"name": collection_name})
            if not collection_config:
                logger.error(f"컬렉션을 찾을 수 없음: {collection_name}")
                raise ValueError(f"컬렉션 '{collection_name}'이 존재하지 않습니다")
            
            # 컬렉션에 대한 벡터 스토어 생성
            persist_directory = os.path.join(CHROMA_PERSIST_DIRECTORY, collection_name)
            
            # 강제 리로드 또는 새로운 컬렉션인 경우 문서 로드 및 처리
            if force_reload or not os.path.exists(persist_directory):
                # 문서 로드
                documents = await self._load_collection_documents(collection_name)
                
                # 문서 청크로 분할
                text_splitter = RecursiveCharacterTextSplitter(
                    chunk_size=1000,
                    chunk_overlap=100
                )
                splits = text_splitter.split_documents(documents)
                
                # 벡터 스토어 초기화 및 문서 저장
                vectorstore = Chroma.from_documents(
                    documents=splits,
                    embedding=self.embeddings,
                    persist_directory=persist_directory
                )
                vectorstore.persist()
            else:
                # 기존 벡터 스토어 로드
                vectorstore = Chroma(
                    persist_directory=persist_directory,
                    embedding_function=self.embeddings
                )
            
            # 검색기 생성
            retriever = vectorstore.as_retriever(search_kwargs={"k": 4})
            
            # QA 체인 생성
            qa_chain = RetrievalQA.from_chain_type(
                llm=self.llm,
                chain_type="stuff",
                retriever=retriever,
                return_source_documents=True
            )
            
            self.collections[collection_name] = {
                "vectorstore": vectorstore,
                "retriever": retriever,
                "qa_chain": qa_chain,
                "config": collection_config
            }
            
            logger.info(f"컬렉션 초기화 완료: {collection_name}")
        
        except Exception as e:
            logger.error(f"컬렉션 초기화 오류: {str(e)}")
            raise
    
    async def _load_collection_documents(self, collection_name: str) -> List[Document]:
        """컬렉션 문서 로드"""
        documents = []
        
        # DB에서 문서 목록 가져오기
        doc_cursors = self.db.rag_documents.find({"collection_name": collection_name})
        doc_list = await doc_cursors.to_list(length=100)
        
        for doc in doc_list:
            file_path = doc.get("file_path")
            content_type = doc.get("content_type", "text")
            
            if not os.path.exists(file_path):
                logger.warning(f"파일을 찾을 수 없음: {file_path}")
                continue
            
            try:
                # 파일 타입에 따라 적절한 로더 사용
                if content_type == "pdf" or file_path.endswith(".pdf"):
                    loader = PyPDFLoader(file_path)
                elif content_type == "csv" or file_path.endswith(".csv"):
                    loader = CSVLoader(file_path)
                else:
                    # 기본은 텍스트 파일로 간주
                    loader = TextLoader(file_path, encoding="utf-8")
                
                loaded_docs = loader.load()
                
                # 메타데이터 추가
                for loaded_doc in loaded_docs:
                    loaded_doc.metadata.update({
                        "source": doc.get("source", file_path),
                        "title": doc.get("title", os.path.basename(file_path)),
                        "author": doc.get("author", ""),
                        "date": doc.get("date", ""),
                        "document_id": str(doc.get("_id")),
                        "collection_name": collection_name
                    })
                
                documents.extend(loaded_docs)
                logger.info(f"문서 로드 완료: {file_path}")
            
            except Exception as e:
                logger.error(f"문서 로드 오류 ({file_path}): {str(e)}")
        
        return documents
    
    async def query(self, request: RAGRequest) -> RAGResponse:
        """RAG 쿼리 실행"""
        collection_name = request.collection_name
        
        # 컬렉션 초기화 확인
        if collection_name not in self.collections:
            await self.init_collection(collection_name)
        
        try:
            # QA 체인 실행
            qa_chain = self.collections[collection_name]["qa_chain"]
            result = qa_chain({"query": request.query})
            
            # 결과 추출
            answer = result.get("result", "")
            source_documents = result.get("source_documents", [])
            
            # 소스 정보 구성
            sources = []
            for doc in source_documents:
                sources.append({
                    "content": doc.page_content,
                    "metadata": doc.metadata
                })
            
            return RAGResponse(
                answer=answer,
                sources=sources[:request.max_docs],
                query=request.query
            )
        
        except Exception as e:
            logger.error(f"쿼리 실행 오류: {str(e)}")
            raise
    
    async def add_document(self, collection_name: str, file_path: str, metadata: Dict[str, Any]) -> str:
        """문서를 컬렉션에 추가"""
        # 문서 메타데이터 저장
        doc_data = {
            "collection_name": collection_name,
            "file_path": file_path,
            "content_type": metadata.get("content_type", "text"),
            "title": metadata.get("title", os.path.basename(file_path)),
            "author": metadata.get("author", ""),
            "date": metadata.get("date", ""),
            "source": metadata.get("source", file_path),
            "created_at": metadata.get("created_at", datetime.utcnow())
        }
        
        # DB에 문서 정보 저장
        result = await self.db.rag_documents.insert_one(doc_data)
        document_id = str(result.inserted_id)
        
        # 벡터 스토어 갱신
        await self.init_collection(collection_name, force_reload=True)
        
        return document_id
    
    async def delete_document(self, document_id: str) -> bool:
        """문서 삭제"""
        # 문서 정보 조회
        doc = await self.db.rag_documents.find_one_and_delete({"_id": document_id})
        
        if not doc:
            return False
        
        # 관련 컬렉션 갱신
        collection_name = doc.get("collection_name")
        if collection_name:
            await self.init_collection(collection_name, force_reload=True)
        
        return True
    
    async def list_collections(self) -> List[Dict[str, Any]]:
        """사용 가능한 컬렉션 목록 반환"""
        collections = await self.db.rag_collections.find().to_list(length=100)
        return collections

# RAG 유틸리티 의존성
async def get_rag_utility(db: AsyncIOMotorDatabase = Depends(get_database)) -> RAGUtility:
    return RAGUtility(db)

async def initialize_rag(
    db,
    collection_name: str = "knowledge_base",
    embedding_model: str = "text-embedding-3-small",
    completion_model: str = "gpt-4-turbo"
) -> RAGSystem:
    """
    RAG 시스템을 초기화하고 반환
    
    Parameters:
    - db: 데이터베이스 연결
    - collection_name: 컬렉션 이름
    - embedding_model: 임베딩 모델 이름
    - completion_model: 응답 생성 모델 이름
    
    Returns:
    - 초기화된 RAG 시스템
    """
    collection = db[collection_name]
    
    # 벡터 인덱스 확인 및 생성
    index_info = await collection.index_information()
    if "content_embedding" not in index_info:
        logger.info(f"컬렉션 {collection_name}에 벡터 인덱스 생성 중...")
        await collection.create_index(
            [("embedding", "vector")],
            name="content_embedding",
            dimensions=1536 if "3-small" in embedding_model else 3072
        )
    
    return RAGSystem(
        collection=collection,
        embedding_model=embedding_model,
        completion_model=completion_model
    )

# 싱글톤 인스턴스
rag_system = initialize_rag(MongoClient(MONGODB_URI)[DB_NAME]) 