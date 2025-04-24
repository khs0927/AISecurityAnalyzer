아래와 같이 실제 API 키를 바로 사용할 수 있도록 환경 변수 파일(.env), 코드 내 수정 사항, 그리고 한글 README.md를 준비했습니다. 이대로 프로젝트 루트에 배치하시면 곧바로 “실제” 환경에서 구동 가능합니다.

⸻

1. .env 파일

프로젝트 최상위에 .env 파일을 생성하고, 다음 내용을 그대로 복사해 넣어 주세요:

# .env
# Hugging Face API 토큰 (모델 다운로드·로드용)
HUGGINGFACE_TOKEN=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

# PubMed E-utilities API 키
PUBMED_API_KEY=4b2e41e756fdc8f0f3f5ebb7bf41a3a11509

# 기타 환경
APP_ENV=production
DEBUG=False



⸻

2. 주요 코드 수정

2.1 app/config/settings.py

from pydantic_settings import BaseSettings
from typing import List, Optional

class Settings(BaseSettings):
    APP_NAME: str = "MedModal Fusion"
    API_VERSION: str = "v1"
    DEBUG: bool = False

    # 모델 경로
    QWEN_MODEL_PATH: str = "models/qwen2.5-omni-7b-onnx"
    MMED_LLAMA_MODEL_PATH: str = "models/mmed-llama3-8b-enins-onnx"
    FUSION_WEIGHTS_PATH: str = "models/fusion_weights.bin"

    # 양자화 & LoRA
    QUANTIZATION: bool = True
    QUANTIZATION_TYPE: str = "int8"
    LORA_ENABLED: bool = True
    LORA_R: int = 8
    LORA_ALPHA: int = 16
    LORA_DROPOUT: float = 0.05

    # 리소스 제한
    MAX_MEMORY: str = "4GB"
    CPU_THREADS: int = 4

    # 캐시
    CACHE_ENABLED: bool = True
    CACHE_DIR: str = "/tmp/model_cache"

    # 의료 영역
    MEDICAL_DOMAINS: List[str] = [
        "cardiology", "radiology", "neurology",
        "dermatology", "oncology", "internal_medicine"
    ]

    # Hugging Face & PubMed API
    HUGGINGFACE_TOKEN: str
    PUBMED_API_KEY: str
    PUBMED_SEARCH_URL: str = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
    PUBMED_SUMMARY_URL: str = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"

    class Config:
        env_file = ".env"

settings = Settings()

2.2 scripts/download_models.sh

#!/usr/bin/env bash
set -e
# .env에서 HUGGINGFACE_TOKEN을 읽어옵니다
export HUGGINGFACE_TOKEN=$(grep HUGGINGFACE_TOKEN .env | cut -d '=' -f2)

# QWEN 모델 다운로드
git lfs install
git clone https://${HUGGINGFACE_TOKEN}@huggingface.co/Qwen/Qwen2.5-Omni-7B models/qwen2.5-omni-7b
python scripts/optimize_models.py --input models/qwen2.5-omni-7b --output models/qwen2.5-omni-7b-onnx

# MMed-Llama 모델 다운로드
git clone https://${HUGGINGFACE_TOKEN}@huggingface.co/Henrychur/MMed-Llama-3-8B-EnIns models/mmed-llama3-8b-enins
python scripts/optimize_models.py --input models/mmed-llama3-8b-enins --output models/mmed-llama3-8b-enins-onnx

2.3 app/models/qwen_model.py (토크나이저/프로세서 로드 부분)

import os
# … 생략 …
from transformers import AutoTokenizer, AutoProcessor

class QwenModel:
    # … 생략 …

    def load_model(self):
        token = os.environ.get("HUGGINGFACE_TOKEN")
        # Processor & Tokenizer
        self.processor = AutoProcessor.from_pretrained(
            "Qwen/Qwen2.5-Omni-7B",
            trust_remote_code=True,
            use_auth_token=token
        )
        self.tokenizer = AutoTokenizer.from_pretrained(
            "Qwen/Qwen2.5-Omni-7B",
            trust_remote_code=True,
            use_auth_token=token
        )
        # ONNX 세션 로드 (이전 코드 유지)
        # …

2.4 app/models/mmed_llama_model.py

import os
# … 생략 …
from transformers import AutoTokenizer

class MMedLlamaModel:
    # … 생략 …

    def load_model(self):
        token = os.environ.get("HUGGINGFACE_TOKEN")
        # Tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(
            "Henrychur/MMed-Llama-3-8B-EnIns",
            trust_remote_code=True,
            use_auth_token=token
        )
        # ONNX 세션 로드 (이전 코드 유지)
        # …

2.5 app/utils/data_utils.py

import requests
from typing import List, Dict
from app.config.settings import settings

def fetch_latest_pubmed() -> List[Dict]:
    """
    PubMed E-utilities를 통해 최신 논문 메타데이터를 가져옵니다.
    """
    # 1) ID 목록 검색
    params = {
        "db": "pubmed",
        "term": "medical",       # 필요에 따라 검색어 조정
        "retmode": "json",
        "retmax": 20,
        "api_key": settings.PUBMED_API_KEY
    }
    resp = requests.get(settings.PUBMED_SEARCH_URL, params=params)
    resp.raise_for_status()
    id_list = resp.json().get("esearchresult", {}).get("idlist", [])

    if not id_list:
        return []

    # 2) 요약 정보 조회
    params = {
        "db": "pubmed",
        "id": ",".join(id_list),
        "retmode": "json",
        "api_key": settings.PUBMED_API_KEY
    }
    resp = requests.get(settings.PUBMED_SUMMARY_URL, params=params)
    resp.raise_for_status()
    result = resp.json().get("result", {})
    # 첫 키는 'uids'이므로 그 외 키를 메타데이터로 반환
    return [result[idx] for idx in result.get("uids", [])]



⸻

3. README.md (한글)

# MedModal Fusion

## 📌 개요
QWEN2.5-Omni-7B와 MMed-Llama-3-8B-EnIns 모델을 융합한 멀티모달 의료 AI 프레임워크  
- 텍스트·이미지·음성·시계열 데이터 처리  
- ONNX 양자화, LoRA 파인튜닝으로 저사양 환경 지원  
- PubMed 최신 논문 기반 지속적 학습  

## ⚙️ 환경 설정

1. **클론 및 이동**
    ```bash
    git clone <repo-url>
    cd medmodal_fusion
    ```

2. **`.env` 파일 생성**  
   프로젝트 루트에 `.env` 파일을 만들고, 아래 값 입력:
    ```dotenv
    HUGGINGFACE_TOKEN=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
    PUBMED_API_KEY=4b2e41e756fdc8f0f3f5ebb7bf41a3a11509
    APP_ENV=production
    DEBUG=False
    ```

3. **의존성 설치 & 모델 다운로드**  
   ```bash
   # Docker 없이 로컬 실행 시
   pip install -r requirements.txt
   bash scripts/download_models.sh

	4.	Docker 사용

docker-compose up --build -d



🚀 실행
	•	FastAPI 서버 기동

uvicorn app.main:app --host 0.0.0.0 --port 8000


	•	엔드포인트
	•	POST /api/v1/analyze
	•	Body: { "text": "...", "image": "...", "audio": "...", "video": "..." }
	•	POST /api/v1/realtime-risk
	•	POST /api/v1/consult

📂 주요 디렉터리

medmodal_fusion/
├── .env
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── README.md
├── app/
│   ├── main.py
│   ├── config/
│   ├── api/
│   ├── models/
│   ├── services/
│   └── utils/
└── scripts/
    ├── download_models.sh
    ├── optimize_models.py
    └── train_lora.py

🔑 추가 설정
	•	settings.PUBMED_SEARCH_URL, settings.PUBMED_SUMMARY_URL 변경 가능
	•	scripts/optimize_models.py 내부에 use_auth_token=os.environ["HUGGINGFACE_TOKEN"] 적용됨

⸻

이제 .env 파일만 프로젝트 루트에 두고, bash scripts/download_models.sh → uvicorn ... 순으로 실행하시면 실제 API 키가 적용된 환경에서 바로 사용 가능합니다. 추가로 궁금하시거나 다른 부분이 필요하시면 알려주세요!