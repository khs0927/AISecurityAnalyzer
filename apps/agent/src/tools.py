import numpy as np
import onnxruntime as ort
from typing import List, Dict, Any
from transformers import pipeline, AutoTokenizer, AutoModel
from .retriever import search
import os
import torch

# 메모리 사용량 제한 설정 (Oracle Cloud 무료 VM 1GB RAM 제약)
os.environ["PYTORCH_MPS_HIGH_WATERMARK_RATIO"] = "0.0"
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "max_split_size_mb:128"

# ONNX 런타임 설정 (CPU 최적화)
_ecg_sess = ort.InferenceSession(
    'models/ecgnet-small.onnx', 
    providers=['CPUExecutionProvider'], 
    sess_options=ort.SessionOptions()
)

def classify_ecg(samples: List[float]) -> Dict[str, Any]:
    """
    ECG 신호를 분석하여 부정맥 진단 및 위험도를 계산합니다.
    Oracle Cloud 무료 VM(1GB RAM)에 최적화된 경량 모델 사용.
    """
    # 입력 데이터 준비
    arr = np.array(samples, dtype=np.float32).reshape(1, 1, -1)[:, :, :5000]
    
    # ONNX 모델 추론 실행
    logits = _ecg_sess.run(None, {'input': arr})[0]
    
    # 진단 결과 (0: 정상, 1: 심방세동, 2: 기타 부정맥...)
    diagnosis = int(logits.argmax())
    
    # 심장 상태 분류
    diagnosis_map = {
        0: "정상",
        1: "심방세동",
        2: "1도 방실차단",
        3: "완전 우각차단",
        4: "조기심실수축",
        5: "조기심방수축",
        6: "동서맥",
        7: "기타 부정맥"
    }
    
    # 위험도 계산 (0-100)
    risk_levels = {
        0: max(10, min(30, np.mean(samples) / 10)),  # 정상: 10-30
        1: max(50, min(80, np.mean(logits[0][1]) * 100)),  # 심방세동: 50-80
        2: max(30, min(60, np.mean(logits[0][2]) * 100)),  # 1도 방실차단: 30-60
        3: max(40, min(70, np.mean(logits[0][3]) * 100)),  # 완전 우각차단: 40-70
        4: max(60, min(90, np.mean(logits[0][4]) * 100)),  # 조기심실수축: 60-90
        5: max(40, min(70, np.mean(logits[0][5]) * 100)),  # 조기심방수축: 40-70
        6: max(30, min(60, np.mean(logits[0][6]) * 100)),  # 동서맥: 30-60
        7: max(50, min(80, np.mean(logits[0][7]) * 100))   # 기타 부정맥: 50-80
    }
    
    risk_score = risk_levels.get(diagnosis, 10)
    
    return {
        "diagnosis": diagnosis,
        "diagnosisText": diagnosis_map.get(diagnosis, "알 수 없음"),
        "riskScore": float(risk_score),
        "confidence": float(logits[0][diagnosis])
    }

# Bio_ClinicalBERT 모델 로드 (메모리 제약을 위한 최적화 설정)
model_name = "emilyalsentzer/Bio_ClinicalBERT"
tokenizer = AutoTokenizer.from_pretrained(model_name)

# 메모리 최적화를 위한 함수
def create_optimized_model():
    # 8비트 양자화 설정 (메모리 사용량 감소)
    model_kwargs = {}
    if torch.cuda.is_available():
        # GPU 사용 가능한 경우 GPU에 로드
        model_kwargs = {"device_map": "auto", "torch_dtype": torch.float16}
    else:
        # CPU 전용 최적화 설정
        model_kwargs = {
            "low_cpu_mem_usage": True,
            "use_safetensors": True,
        }
    
    # 질의응답 파이프라인 생성
    qa_pipeline = pipeline(
        "question-answering", 
        model=model_name,
        tokenizer=tokenizer,
        **model_kwargs
    )
    
    return qa_pipeline

# 초기 로드 시 한 번만 모델 생성
consult_model = create_optimized_model()

def consult_tool(question: str) -> str:
    """
    의료 상담 질의에 답변합니다.
    오라클 클라우드 무료 VM(1GB RAM)에 최적화된 Bio_ClinicalBERT 모델 사용.
    """
    try:
        # RAG로 관련 문서 검색
        related_pmids = search(question, k=2)
        context = "의학적 질문에 대한 응답입니다. "
        
        if related_pmids:
            context += "관련 연구 ID: " + ", ".join(related_pmids)
        else:
            context += "심장질환은 심장이나 혈관에 영향을 미치는 여러 상태를 포함합니다. 주요 증상으로는 흉통, 호흡 곤란, 심계항진 등이 있습니다."
        
        # 메모리 제약으로 입력 길이 제한
        inputs = tokenizer(
            question, 
            context, 
            return_tensors="pt", 
            max_length=384, 
            truncation=True
        )
        
        # 모델 추론
        result = consult_model(
            question=question, 
            context=context, 
            max_answer_len=100
        )
        
        return result['answer']
    except Exception as e:
        print(f"상담 처리 중 오류 발생: {e}")
        return "현재 AI 상담 시스템에 기술적 문제가 있습니다. 나중에 다시 시도해주세요." 