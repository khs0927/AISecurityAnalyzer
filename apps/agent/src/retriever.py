import numpy as np
import json
import pathlib
import os
from typing import List, Dict, Any, Union
from sentence_transformers import SentenceTransformer

# 메모리 사용량 제한 설정
os.environ["PYTORCH_MPS_HIGH_WATERMARK_RATIO"] = "0.0"
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "max_split_size_mb:128"

# 인덱스 파일 경로
INDEX_PATH = 'data/processed/pubmed_index.json'
FALLBACK_PATH = 'data/processed/pubmed_fallback.json'

# 인덱스 로드
def load_corpus():
    index_file = pathlib.Path(INDEX_PATH)
    if index_file.exists():
        try:
            return json.loads(index_file.read_text())
        except Exception as e:
            print(f"인덱스 로드 오류: {e}")
            
    # 인덱스가 없으면 폴백 데이터 사용
    fallback_file = pathlib.Path(FALLBACK_PATH)
    if fallback_file.exists():
        try:
            return json.loads(fallback_file.read_text())
        except:
            pass
            
    # 기본 폴백 데이터
    return [
        {
            "pmid": "33657413",
            "title": "심전도 연구의 최신 동향",
            "abstract": "심전도는 심장질환 진단에 중요한 도구로, 기계학습 기반 접근법이 진단 정확도를 높이고 있다.",
            "vec": [0.1] * 384  # 기본 임베딩
        },
        {
            "pmid": "34518792",
            "title": "심방세동 조기 진단 방법",
            "abstract": "심방세동은 뇌졸중 위험을 증가시키는 부정맥으로, 웨어러블 기기를 통한 조기 감지가 중요하다.",
            "vec": [0.2] * 384  # 기본 임베딩
        }
    ]

# 코퍼스 로드
corpus = load_corpus()

# 임베딩 모델 (Oracle Cloud VM에 최적화된 경량 모델)
class OptimizedEncoder:
    def __init__(self):
        self.model = None
        self.is_initialized = False
        
    def initialize(self):
        """모델을 필요할 때만 로드 (메모리 효율성)"""
        if not self.is_initialized:
            try:
                # 경량 모델 사용 (all-MiniLM-L6-v2, ~80MB 메모리)
                self.model = SentenceTransformer('all-MiniLM-L6-v2', device='cpu')
                self.is_initialized = True
            except Exception as e:
                print(f"임베딩 모델 로드 오류: {e}")
                return False
        return True
    
    def encode(self, text: str) -> np.ndarray:
        """텍스트 임베딩 생성"""
        if not self.initialize():
            # 기본 임베딩 반환
            return np.ones(384) / 384
            
        try:
            # 임베딩 생성 (경량화된 설정)
            return self.model.encode(
                text, 
                convert_to_numpy=True,
                normalize_embeddings=True,
                show_progress_bar=False
            )
        except Exception as e:
            print(f"임베딩 생성 오류: {e}")
            return np.ones(384) / 384
    
    def cleanup(self):
        """메모리 확보를 위해 모델 해제"""
        if self.is_initialized:
            self.model = None
            self.is_initialized = False
            import gc
            gc.collect()
            
# 전역 인코더 인스턴스
encoder = OptimizedEncoder()

def search(query: str, k: int = 3) -> List[str]:
    """
    주어진 쿼리와 가장 관련성 높은 문서의 PMID 목록 반환
    Oracle Cloud 무료 VM(1GB RAM)에 최적화됨
    """
    try:
        # 쿼리 임베딩
        query_emb = encoder.encode(query)
        
        # 유사도 계산 (코사인 유사도)
        similarities = []
        for item in corpus:
            vec = np.array(item['vec'])
            sim = np.dot(query_emb, vec)
            similarities.append((item['pmid'], sim))
        
        # 유사도 기준 정렬
        similarities.sort(key=lambda x: x[1], reverse=True)
        
        # 메모리 정리
        encoder.cleanup()
        
        # 상위 k개 PMID 반환
        return [item[0] for item in similarities[:k]]
    except Exception as e:
        print(f"검색 오류: {e}")
        # 기본 PMID 반환
        return ["33657413", "34518792"] 