#!/bin/bash

# NotToday Medical-AI-Agent 모델 다운로드 스크립트
# CPU 전용 경량 모델 - v3.4

set -e
echo "NotToday Medical-AI-Agent 모델 다운로드를 시작합니다..."
mkdir -p models

# aria2c 설치 확인
if ! command -v aria2c &> /dev/null; then
    echo "aria2c가 필요합니다. 설치합니다..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y aria2
    elif command -v yum &> /dev/null; then
        sudo yum install -y aria2
    elif command -v brew &> /dev/null; then
        brew install aria2
    else
        echo "패키지 관리자를 찾을 수 없습니다. aria2c를 수동으로 설치하세요."
        exit 1
    fi
fi

# wget 설치 확인
if ! command -v wget &> /dev/null; then
    echo "wget이 필요합니다. 설치합니다..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y wget
    elif command -v yum &> /dev/null; then
        sudo yum install -y wget
    elif command -v brew &> /dev/null; then
        brew install wget
    else
        echo "패키지 관리자를 찾을 수 없습니다. wget을 수동으로 설치하세요."
        exit 1
    fi
fi

# 다운로드 함수
download_with_progress() {
    local url=$1
    local output=$2
    local model_name=$3
    
    echo "다운로드 중: $model_name"
    
    if [ -f "$output" ]; then
        echo "$output 파일이 이미 존재합니다. 건너뜁니다."
        return 0
    fi
    
    aria2c -x4 -s4 "$url" -o "$output"
    
    if [ $? -eq 0 ]; then
        echo "$model_name 다운로드 완료!"
    else
        echo "$model_name 다운로드 실패"
        exit 1
    fi
}

# 모델 다운로드 시작
cd models

# TinyLlama - 약 1.2GB
download_with_progress \
    "https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/TinyLlama-1.1B-Chat-v1.0.Q4_K_M.gguf" \
    "TinyLlama-1.1B-Chat-v1.0.Q4_K_M.gguf" \
    "TinyLlamaMed-1.1B (임상 추론 모델)"

# Bio-MiniCPM - 약 2GB
download_with_progress \
    "https://huggingface.co/OpenBMB/MiniCPM-Med-2B-sft-gguf/resolve/main/MiniCPM-Med-2B-sft.Q4_K_M.gguf" \
    "Bio-MiniCPM-2B.Q4_K_M.gguf" \
    "Bio-MiniCPM-2B (심층 임상 Q&A 모델)"

# BioGPT - 약 0.6GB
download_with_progress \
    "https://huggingface.co/plaguss/bioGPT-350m-gguf/resolve/main/bioGPT-350m.Q4_K_M.gguf" \
    "bioGPT-350M.Q4_K_M.gguf" \
    "BioGPT-350M (PubMed RAG 인코더)"

# ECGNet-small - 약 80MB
download_with_progress \
    "https://huggingface.co/MIT-CSAIL/ecgnet-small/resolve/main/ecgnet-small.onnx" \
    "ecgnet-small.onnx" \
    "ECGNet-small (ECG 부정맥 모델)"

echo "모든 모델 다운로드가 완료되었습니다!"
echo "총 4개 모델이 './models' 디렉토리에 저장되었습니다."
echo "총 용량: 약 4GB"

# 모델 용량 확인
if command -v du &> /dev/null; then
    echo "모델 디렉토리 용량:"
    du -sh ./
fi

cd .. 