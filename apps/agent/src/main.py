from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import firebase_admin
from firebase_admin import credentials, firestore
import os
import json
import time
from datetime import datetime
import logging
import aiohttp
import asyncio
import uvicorn
from typing import Dict, Any, List, Optional

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Firebase 초기화
cred_path = os.environ.get("FIREBASE_CREDENTIALS", "./firebase-credentials.json")

try:
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        logger.info("Firebase 초기화 성공")
    else:
        logger.error(f"Firebase 인증 파일을 찾을 수 없습니다: {cred_path}")
        # 개발 환경에서는 Firebase 없이도 실행 가능하도록 함
        db = None
except Exception as e:
    logger.error(f"Firebase 초기화 오류: {str(e)}")
    db = None

# FastAPI 애플리케이션 초기화
app = FastAPI(title="Medical AI Agent API")

# CORS 미들웨어 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 실제 배포 시 특정 출처만 허용하도록 수정
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 모델 정의
class AiQuery(BaseModel):
    query: str
    user_id: Optional[str] = None
    context_data: Optional[Dict[str, Any]] = None

class AiResponse(BaseModel):
    answer: str
    confidence: float
    sources: Optional[List[Dict[str, str]]] = None
    followup_questions: Optional[List[str]] = None

# 의료 AI 응답 생성 함수
async def generate_ai_response(query: str, context_data: Optional[Dict] = None) -> Dict[str, Any]:
    """
    의료 AI 모델을 사용하여 응답을 생성합니다.
    실제 구현에서는 외부 AI API를 호출하거나 로컬 모델을 사용할 수 있습니다.
    """
    # 실제 프로덕션에서는 이 부분을 실제 AI 모델 API 호출로 대체해야 합니다.
    # 예시 코드는 시뮬레이션된 응답을 반환합니다.
    try:
        # 실제 API 호출 시뮬레이션을 위한 인위적 지연
        await asyncio.sleep(2)
        
        # 심박수 관련 질문 처리
        if "심박수" in query or "맥박" in query:
            heart_rate = context_data.get("heartRate", "알 수 없음") if context_data else "알 수 없음"
            
            if heart_rate != "알 수 없음":
                if int(heart_rate) > 100:
                    return {
                        "answer": f"현재 심박수가 {heart_rate}bpm으로 다소 높습니다. 휴식을 취하고 진정하는 것이 좋습니다. 지속적으로 100bpm 이상이 유지된다면 의사의 상담을 받아보세요.",
                        "confidence": 0.92,
                        "sources": [{"title": "성인 심박수 가이드라인", "url": "https://www.heart.org/heartrate"}],
                        "followup_questions": ["평소에도 심박수가 높은 편인가요?", "다른 증상도 함께 있나요?"]
                    }
                elif int(heart_rate) < 60:
                    return {
                        "answer": f"현재 심박수가 {heart_rate}bpm으로 다소 낮습니다. 운동선수나 평소 운동을 많이 하는 경우 정상일 수 있지만, 어지러움이나 피로감이 동반된다면 의사의 상담을 받아보세요.",
                        "confidence": 0.88,
                        "sources": [{"title": "서맥성 부정맥", "url": "https://www.mayoclinic.org/bradycardia"}],
                        "followup_questions": ["어지러움이나 피로감을 느끼나요?", "약물을 복용 중인가요?"]
                    }
                else:
                    return {
                        "answer": f"현재 심박수는 {heart_rate}bpm으로 정상 범위 내에 있습니다. 건강한 성인의 안정 시 심박수는 60-100bpm 사이입니다.",
                        "confidence": 0.95,
                        "sources": [{"title": "정상 심박수 범위", "url": "https://www.heart.org/normalrange"}],
                        "followup_questions": ["평소 운동은 어느 정도 하시나요?", "심박수가 갑자기 변한 적이 있나요?"]
                    }
            else:
                return {
                    "answer": "심박수에 대한 정보가 없어 정확한 판단이 어렵습니다. 건강한 성인의 안정 시 심박수는 일반적으로 60-100bpm 사이입니다. 측정된 심박수를 알려주시면 더 자세한 정보를 제공해 드릴 수 있습니다.",
                    "confidence": 0.85,
                    "followup_questions": ["심박수를 측정해 보셨나요?", "어떤 상황에서 심박수가 궁금하신가요?"]
                }
        
        # 혈압 관련 질문 처리
        elif "혈압" in query:
            blood_pressure = context_data.get("bloodPressure", "알 수 없음") if context_data else "알 수 없음"
            
            if blood_pressure != "알 수 없음" and "/" in blood_pressure:
                systolic, diastolic = map(int, blood_pressure.split("/"))
                
                if systolic >= 140 or diastolic >= 90:
                    return {
                        "answer": f"현재 혈압이 {blood_pressure}mmHg로 고혈압 범위에 속합니다. 스트레스를 줄이고, 소금 섭취를 제한하며, 규칙적인 운동을 권장합니다. 지속적으로 높은 혈압이 측정된다면 의사의 진료를 받으세요.",
                        "confidence": 0.93,
                        "sources": [{"title": "고혈압 가이드라인", "url": "https://www.heart.org/hypertension"}],
                        "followup_questions": ["고혈압 약을 복용 중인가요?", "두통이나 어지러움이 있나요?"]
                    }
                elif systolic <= 90 or diastolic <= 60:
                    return {
                        "answer": f"현재 혈압이 {blood_pressure}mmHg로 저혈압 범위에 속할 수 있습니다. 충분한 수분 섭취와 갑작스러운 자세 변화를 피하는 것이 좋습니다. 어지러움이나 실신 증상이 있다면 의사와 상담하세요.",
                        "confidence": 0.87,
                        "sources": [{"title": "저혈압 관리", "url": "https://www.mayoclinic.org/hypotension"}],
                        "followup_questions": ["어지러움을 느끼나요?", "탈수 증상이 있나요?"]
                    }
                else:
                    return {
                        "answer": f"현재 혈압은 {blood_pressure}mmHg로 정상 범위 내에 있습니다. 건강한 성인의 이상적인 혈압은 120/80mmHg 이하입니다.",
                        "confidence": 0.96,
                        "sources": [{"title": "정상 혈압 범위", "url": "https://www.heart.org/bloodpressure"}],
                        "followup_questions": ["식습관은 어떻게 되시나요?", "정기적으로 혈압을 측정하시나요?"]
                    }
            else:
                return {
                    "answer": "혈압에 대한 정보가 없어 정확한 판단이 어렵습니다. 건강한 성인의 이상적인 혈압은 120/80mmHg 이하입니다. 측정된 혈압을 알려주시면 더 자세한 정보를 제공해 드릴 수 있습니다.",
                    "confidence": 0.85,
                    "followup_questions": ["혈압을 측정해 보셨나요?", "평소 혈압 관리는 어떻게 하시나요?"]
                }
        
        # 가슴 통증 관련 질문 처리
        elif "가슴" in query and ("통증" in query or "아파" in query):
            return {
                "answer": "가슴 통증은 여러 원인에 의해 발생할 수 있으며, 심장 문제의 신호일 수도 있습니다. 통증이 심하거나, 압박감, 짓누르는 느낌, 팔이나 턱으로 퍼지는 통증, 숨가쁨, 식은땀 등이 동반된다면 즉시 응급실을 방문하세요. 특히 통증이 30분 이상 지속된다면 더욱 신속한 대응이 필요합니다.",
                "confidence": 0.97,
                "sources": [{"title": "가슴 통증의 응급 대응", "url": "https://www.heart.org/chestpain"}],
                "followup_questions": ["통증이 어느 정도 지속되나요?", "어떤 상황에서 통증이 악화되나요?"]
            }
        
        # 기본 응답
        else:
            return {
                "answer": f"'{query}'에 대한 질문을 받았습니다. 심장 건강과 관련하여 더 구체적인 질문을 해주시면 더 정확한 정보를 제공해 드릴 수 있습니다. 심박수, 혈압, 증상, 생활 습관 등에 대해 물어보실 수 있습니다.",
                "confidence": 0.75,
                "followup_questions": ["심장 건강에 관한 특정 증상이 있으신가요?", "건강 데이터에 대해 알고 싶으신가요?"]
            }
    
    except Exception as e:
        logger.error(f"AI 응답 생성 오류: {str(e)}")
        return {
            "answer": "죄송합니다. 질문을 처리하는 중에 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
            "confidence": 0.1,
            "error": str(e)
        }

# Firestore에서 질문을 처리하는 백그라운드 태스크
async def process_firestore_question(doc_id: str, user_id: str, query_data: dict):
    """
    Firestore에 저장된 질문을 처리하고 응답을 업데이트합니다.
    """
    try:
        logger.info(f"질문 처리 시작: {doc_id}, 사용자: {user_id}")
        
        # 질문 텍스트 추출
        query = query_data.get('q', '')
        context_data = query_data.get('contextData', {})
        
        if not query:
            logger.error(f"질문 텍스트가 없음: {doc_id}")
            return
        
        # AI 응답 생성
        response = await generate_ai_response(query, context_data)
        
        # Firebase가 초기화되지 않은 경우 로그만 남김
        if db is None:
            logger.info(f"테스트 모드: Firebase 없이 실행. 응답: {response}")
            return
        
        # Firestore 문서 업데이트
        doc_ref = db.collection(f'users/{user_id}/aiQuestions').document(doc_id)
        
        doc_ref.update({
            'answer': response['answer'],
            'confidence': response.get('confidence', 0),
            'sources': response.get('sources', []),
            'followupQuestions': response.get('followup_questions', []),
            'status': 'completed',
            'answeredAt': firestore.SERVER_TIMESTAMP
        })
        
        logger.info(f"질문 처리 완료: {doc_id}")
    
    except Exception as e:
        logger.error(f"Firestore 질문 처리 오류: {str(e)}")
        
        # 오류 상태 업데이트 (Firebase가 초기화된 경우)
        if db is not None:
            try:
                doc_ref = db.collection(f'users/{user_id}/aiQuestions').document(doc_id)
                doc_ref.update({
                    'status': 'error',
                    'errorMessage': str(e),
                    'updatedAt': firestore.SERVER_TIMESTAMP
                })
            except Exception as update_error:
                logger.error(f"오류 상태 업데이트 실패: {str(update_error)}")

# Firestore 리스너 설정
if db is not None:
    @app.on_event("startup")
    async def setup_firestore_listener():
        # 백그라운드 태스크로 실행할 함수
        async def listen_for_new_questions():
            # 가장 최근 처리된 문서 ID를 저장
            last_processed_doc = None
            
            while True:
                try:
                    # 모든 사용자의 컬렉션 그룹을 쿼리
                    query = db.collection_group('aiQuestions').where('status', '==', 'pending')
                    
                    if last_processed_doc:
                        # 마지막으로 처리된 문서 이후의 문서만 쿼리
                        query = query.start_after(last_processed_doc)
                    
                    docs = query.limit(10).get()
                    
                    for doc in docs:
                        doc_data = doc.to_dict()
                        user_id = doc.reference.parent.parent.id
                        
                        # 백그라운드에서 질문 처리
                        asyncio.create_task(process_firestore_question(doc.id, user_id, doc_data))
                        
                        # 마지막 처리된 문서 업데이트
                        last_processed_doc = doc
                    
                    # 문서가 없으면 약간의 대기 후 다시 쿼리
                    if not docs:
                        await asyncio.sleep(5)
                    
                except Exception as e:
                    logger.error(f"Firestore 리스너 오류: {str(e)}")
                    await asyncio.sleep(10)  # 오류 발생 시 더 긴 대기 시간
        
        # 백그라운드 태스크 시작
        asyncio.create_task(listen_for_new_questions())
        logger.info("Firestore 리스너 시작됨")

# API 엔드포인트 정의
@app.get("/")
async def root():
    """
    API 상태 확인을 위한 루트 엔드포인트
    """
    return {"status": "online", "message": "Medical AI Agent API is running"}

@app.post("/api/query", response_model=AiResponse)
async def query_ai(ai_query: AiQuery, background_tasks: BackgroundTasks):
    """
    AI에게 의료 관련 질문을 하고 응답을 받는 엔드포인트
    """
    try:
        # Firebase에 저장 (사용자 ID가 제공된 경우)
        if ai_query.user_id and db is not None:
            doc_ref = db.collection(f'users/{ai_query.user_id}/aiQuestions').document()
            doc_ref.set({
                'q': ai_query.query,
                'createdAt': firestore.SERVER_TIMESTAMP,
                'status': 'pending',
                'contextData': ai_query.context_data or {}
            })
            
            # 백그라운드에서 처리
            background_tasks.add_task(
                process_firestore_question, 
                doc_ref.id, 
                ai_query.user_id, 
                {'q': ai_query.query, 'contextData': ai_query.context_data or {}}
            )
            
            # 즉시 응답 - 처리 중임을 알림
            return {
                "answer": "질문을 처리 중입니다. 잠시 후 결과를 확인하세요.",
                "confidence": 1.0,
                "processing": True
            }
        
        # 직접 처리 (Firebase 없이)
        response = await generate_ai_response(ai_query.query, ai_query.context_data)
        
        return {
            "answer": response["answer"],
            "confidence": response.get("confidence", 0),
            "sources": response.get("sources"),
            "followup_questions": response.get("followup_questions")
        }
    
    except Exception as e:
        logger.error(f"API 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health_check():
    """
    서비스 상태 확인을 위한 헬스체크 엔드포인트
    """
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "firebase": "connected" if db is not None else "disconnected"
    }

# 서버 실행 코드 (직접 실행 시)
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True) 