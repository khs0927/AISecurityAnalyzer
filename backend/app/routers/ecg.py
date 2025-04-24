from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query, Body, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import io
import tempfile
import os
import time
import uuid
from ..models.ecg import process_ecg_signal, detect_arrhythmia, extract_ecg_features
from ..deps import get_current_user, get_db, get_async_db, get_current_active_user
import json
import logging
from ..services.ecg_analysis import (
    preprocess_ecg_data,
    detect_qrs_complex,
    calculate_heart_rate,
    classify_ecg_signal,
    analyze_ecg,
    detect_anomalies
)
from bson.objectid import ObjectId
from ..models.user import User
from scipy import signal

router = APIRouter(
    prefix="/ecg",
    tags=["ECG 분석"],
    responses={404: {"description": "찾을 수 없음"}},
)

logger = logging.getLogger(__name__)

class ECGDataPoint(BaseModel):
    value: float
    timestamp: datetime

class ECGDataInput(BaseModel):
    user_id: str
    device_id: str = Field(..., description="기기 ID")
    data: List[ECGDataPoint]
    sampling_rate: int = Field(250, description="샘플링 레이트(Hz)")

class ECGDataOutput(BaseModel):
    id: str
    user_id: str
    device_id: str
    timestamp: datetime
    heart_rate: int
    avg_rr_interval: float
    hrv_sdnn: float
    risk_level: int = Field(0, description="위험도 (0-5)")
    risk_factors: List[str] = Field([], description="감지된 위험 요소")
    
    class Config:
        json_encoders = {
            ObjectId: lambda v: str(v)
        }

class ECGAnalysisResult(BaseModel):
    id: str = Field(..., description="분석 ID")
    user_id: str = Field(..., description="사용자 ID")
    timestamp: datetime = Field(..., description="분석 시간")
    heart_rate: float = Field(..., description="심박수(BPM)")
    rr_intervals: List[float] = Field(..., description="RR 간격(초)")
    analysis_result: Dict[str, Any] = Field(..., description="분석 결과")
    arrhythmia_detected: bool = Field(..., description="부정맥 탐지 여부")
    confidence: float = Field(..., description="분석 신뢰도")
    risk_level: str = Field(..., description="위험 수준")
    recommendation: str = Field(..., description="권장 사항")

@router.post("/analyze", response_model=Dict[str, Any])
async def analyze_ecg_data(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    업로드된 ECG 데이터를 분석하여 심박수, 부정맥 여부 등의 정보를 반환합니다.
    """
    try:
        # 파일 확장자 검증
        if not file.filename.endswith(('.csv', '.json', '.txt')):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="지원되지 않는 파일 형식입니다. CSV, JSON 또는 TXT 파일만 지원합니다."
            )
        
        # 파일 내용 읽기
        contents = await file.read()
        
        # 파일 형식에 따라 데이터 파싱
        ecg_data = None
        if file.filename.endswith('.csv'):
            try:
                # CSV 파일을 pandas DataFrame으로 변환
                df = pd.read_csv(pd.io.common.BytesIO(contents))
                ecg_data = df['ecg'].values if 'ecg' in df.columns else df.iloc[:, 0].values
            except Exception as e:
                logger.error(f"CSV 파싱 오류: {str(e)}")
                raise HTTPException(status_code=400, detail=f"CSV 파싱 오류: {str(e)}")
        
        elif file.filename.endswith('.json'):
            try:
                # JSON 파일 파싱
                data = json.loads(contents)
                ecg_data = np.array(data.get('ecg_data', data.get('data', [])))
            except Exception as e:
                logger.error(f"JSON 파싱 오류: {str(e)}")
                raise HTTPException(status_code=400, detail=f"JSON 파싱 오류: {str(e)}")
        
        elif file.filename.endswith('.txt'):
            try:
                # TXT 파일은 한 줄에 하나의 ECG 값이 있다고 가정
                lines = contents.decode('utf-8').strip().split('\n')
                ecg_data = np.array([float(line.strip()) for line in lines if line.strip()])
            except Exception as e:
                logger.error(f"TXT 파싱 오류: {str(e)}")
                raise HTTPException(status_code=400, detail=f"TXT 파싱 오류: {str(e)}")
        
        # ECG 데이터 전처리
        processed_data = preprocess_ecg_data(ecg_data)
        
        # QRS 복합체 검출
        qrs_peaks = detect_qrs_complex(processed_data)
        
        # 심박수 계산
        heart_rate = calculate_heart_rate(qrs_peaks, sampling_rate=250)  # 샘플링 레이트는 데이터에 따라 조정
        
        # 부정맥 검출
        arrhythmia_results = detect_arrhythmia(processed_data, qrs_peaks)
        
        # ECG 신호 분류
        classification_result = classify_ecg_signal(processed_data)
        
        # 분석 결과 저장 (사용자와 연결)
        analysis_result = {
            "user_id": current_user.id,
            "timestamp": datetime.now().isoformat(),
            "heart_rate": heart_rate,
            "arrhythmia_detected": arrhythmia_results["arrhythmia_detected"],
            "arrhythmia_type": arrhythmia_results["arrhythmia_type"],
            "classification": classification_result["classification"],
            "confidence": classification_result["confidence"],
            "risk_level": classification_result["risk_level"],
            "recommendation": classification_result["recommendation"]
        }
        
        # 데이터베이스에 결과 저장
        db.ecg_analysis.insert_one(analysis_result)
        
        # 결과에서 MongoDB ObjectId 제거
        analysis_result.pop("_id", None)
        
        return analysis_result
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ECG 분석 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"ECG 분석 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/history", response_model=List[Dict[str, Any]])
async def get_ecg_history(
    limit: int = 10,
    skip: int = 0,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    사용자의 ECG 분석 기록을 반환합니다.
    """
    try:
        # 사용자의 ECG 분석 기록 조회
        history = list(
            db.ecg_analysis
            .find({"user_id": current_user.id})
            .sort("timestamp", -1)
            .skip(skip)
            .limit(limit)
        )
        
        # MongoDB ObjectId를 문자열로 변환
        for item in history:
            item["_id"] = str(item["_id"])
        
        return history
    except Exception as e:
        logger.error(f"ECG 기록 조회 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"ECG 기록 조회 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/stats", response_model=Dict[str, Any])
async def get_ecg_stats(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    사용자의 ECG 분석 통계를 반환합니다.
    """
    try:
        # 날짜 필터 설정
        query = {"user_id": current_user.id}
        if start_date:
            query["timestamp"] = {"$gte": start_date}
        if end_date:
            if "timestamp" in query:
                query["timestamp"]["$lte"] = end_date
            else:
                query["timestamp"] = {"$lte": end_date}
        
        # 통계 계산을 위한 데이터 조회
        ecg_records = list(db.ecg_analysis.find(query))
        
        if not ecg_records:
            return {
                "heart_rate": {
                    "avg": 0,
                    "min": 0,
                    "max": 0
                },
                "arrhythmia_count": 0,
                "arrhythmia_types": {},
                "risk_levels": {}
            }
        
        # 심박수 통계
        heart_rates = [record.get("heart_rate", 0) for record in ecg_records]
        
        # 부정맥 통계
        arrhythmia_records = [r for r in ecg_records if r.get("arrhythmia_detected", False)]
        arrhythmia_types = {}
        for record in arrhythmia_records:
            arrhythmia_type = record.get("arrhythmia_type", "unknown")
            arrhythmia_types[arrhythmia_type] = arrhythmia_types.get(arrhythmia_type, 0) + 1
        
        # 위험도 통계
        risk_levels = {}
        for record in ecg_records:
            risk_level = record.get("risk_level", "unknown")
            risk_levels[risk_level] = risk_levels.get(risk_level, 0) + 1
        
        # 통계 결과 반환
        return {
            "heart_rate": {
                "avg": sum(heart_rates) / len(heart_rates) if heart_rates else 0,
                "min": min(heart_rates) if heart_rates else 0,
                "max": max(heart_rates) if heart_rates else 0
            },
            "arrhythmia_count": len(arrhythmia_records),
            "arrhythmia_types": arrhythmia_types,
            "risk_levels": risk_levels
        }
    except Exception as e:
        logger.error(f"ECG 통계 계산 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"ECG 통계 계산 중 오류가 발생했습니다: {str(e)}"
        )

@router.delete("/record/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ecg_record(
    record_id: str,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    특정 ECG 분석 기록을 삭제합니다.
    """
    from bson import ObjectId
    
    try:
        # 기록 ID 검증
        if not ObjectId.is_valid(record_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="유효하지 않은 기록 ID입니다."
            )
        
        # 기록 삭제
        result = db.ecg_analysis.delete_one({
            "_id": ObjectId(record_id),
            "user_id": current_user.id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="해당 기록을 찾을 수 없거나 삭제 권한이 없습니다."
            )
        
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ECG 기록 삭제 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"ECG 기록 삭제 중 오류가 발생했습니다: {str(e)}"
        )

@router.post("/upload", response_model=Dict[str, Any])
async def upload_ecg_data(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db = Depends(get_async_db)
):
    """
    ECG 데이터 파일 업로드 및 초기 분석
    """
    if not file.filename.endswith(('.csv', '.json', '.npy')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="지원되지 않는 파일 형식입니다. CSV, JSON 또는 NPY 파일만 허용됩니다."
        )
    
    try:
        contents = await file.read()
        
        # 파일 형식에 따라 데이터 로딩
        if file.filename.endswith('.csv'):
            data = np.loadtxt(io.StringIO(contents.decode('utf-8')), delimiter=',')
        elif file.filename.endswith('.json'):
            data = json.loads(contents.decode('utf-8'))
        elif file.filename.endswith('.npy'):
            data = np.load(io.BytesIO(contents))
        
        # ECG 메타데이터 생성
        ecg_record = {
            "user_id": current_user.id,
            "filename": file.filename,
            "upload_date": datetime.utcnow(),
            "processed": False,
            "analysis_results": None,
            "anomalies_detected": False
        }
        
        # MongoDB에 메타데이터 저장
        result = await db.ecg_records.insert_one(ecg_record)
        record_id = str(result.inserted_id)
        
        # 저장 경로 생성
        file_path = f"data/ecg/{current_user.id}/{record_id}.npy"
        
        # 데이터 분석을 백그라운드 작업으로 실행
        background_tasks.add_task(
            process_ecg_data,
            data, 
            db, 
            record_id,
            file_path,
            current_user.id
        )
        
        return {
            "message": "ECG 데이터가 성공적으로 업로드되었습니다. 분석이 백그라운드에서 진행 중입니다.",
            "record_id": record_id
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"데이터 처리 중 오류가 발생했습니다: {str(e)}"
        )

async def process_ecg_data(data, db, record_id, file_path, user_id):
    """
    ECG 데이터 분석 백그라운드 작업
    """
    try:
        # 데이터 분석 수행
        analysis_results = analyze_ecg(data)
        
        # 이상 징후 탐지
        anomalies = detect_anomalies(data, analysis_results)
        
        # 분석 결과 업데이트
        await db.ecg_records.update_one(
            {"_id": ObjectId(record_id)},
            {"$set": {
                "processed": True,
                "analysis_results": analysis_results,
                "anomalies_detected": len(anomalies) > 0,
                "anomalies": anomalies,
                "processed_date": datetime.utcnow()
            }}
        )
        
        # 심각한 이상 징후가 발견되면 알림 발송
        if any(anomaly.get("severity") == "high" for anomaly in anomalies):
            await db.notifications.insert_one({
                "user_id": user_id,
                "type": "ecg_alert",
                "title": "ECG 이상 징후 발견",
                "message": "ECG 데이터에서 심각한 이상 징후가 발견되었습니다. 자세한 분석 결과를 확인하세요.",
                "record_id": record_id,
                "created_at": datetime.utcnow(),
                "read": False
            })
    
    except Exception as e:
        # 오류 발생 시 레코드 업데이트
        await db.ecg_records.update_one(
            {"_id": ObjectId(record_id)},
            {"$set": {
                "processed": True,
                "error": str(e),
                "processed_date": datetime.utcnow()
            }}
        )

@router.get("/records", response_model=List[Dict[str, Any]])
async def get_ecg_records(
    limit: int = 10,
    skip: int = 0,
    current_user: User = Depends(get_current_active_user),
    db = Depends(get_async_db)
):
    """
    사용자의 ECG 데이터 레코드 목록 조회
    """
    cursor = db.ecg_records.find(
        {"user_id": current_user.id}
    ).sort("upload_date", -1).skip(skip).limit(limit)
    
    records = []
    async for record in cursor:
        record["id"] = str(record.pop("_id"))
        records.append(record)
    
    return records

@router.get("/records/{record_id}", response_model=Dict[str, Any])
async def get_ecg_record(
    record_id: str,
    current_user: User = Depends(get_current_active_user),
    db = Depends(get_async_db)
):
    """
    특정 ECG 데이터 레코드 상세 조회
    """
    try:
        record = await db.ecg_records.find_one({"_id": ObjectId(record_id)})
        
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="요청한 ECG 레코드를 찾을 수 없습니다."
            )
        
        if record["user_id"] != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="이 레코드에 접근할 권한이 없습니다."
            )
        
        record["id"] = str(record.pop("_id"))
        return record
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"레코드 조회 중 오류가 발생했습니다: {str(e)}"
        )

@router.delete("/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ecg_record(
    record_id: str,
    current_user: User = Depends(get_current_active_user),
    db = Depends(get_async_db)
):
    """
    특정 ECG 데이터 레코드 삭제
    """
    try:
        record = await db.ecg_records.find_one({"_id": ObjectId(record_id)})
        
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="요청한 ECG 레코드를 찾을 수 없습니다."
            )
        
        if record["user_id"] != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="이 레코드를 삭제할 권한이 없습니다."
            )
        
        await db.ecg_records.delete_one({"_id": ObjectId(record_id)})
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"레코드 삭제 중 오류가 발생했습니다: {str(e)}"
        )

@router.post("/data", response_model=dict, status_code=status.HTTP_201_CREATED)
async def upload_ecg_data(
    data: ECGDataInput,
    background_tasks: BackgroundTasks,
    db: AsyncIOMotorDatabase = Depends(get_async_db),
    current_user = Depends(get_current_user),
):
    """
    ECG 데이터 업로드 및 분석
    """
    if current_user["id"] != data.user_id and not current_user.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="다른 사용자의 데이터에 접근할 권한이 없습니다"
        )
    
    # 데이터 저장
    ecg_raw_data = {
        "user_id": data.user_id,
        "device_id": data.device_id,
        "timestamp": datetime.utcnow(),
        "data": [{"value": point.value, "timestamp": point.timestamp} for point in data.data],
        "sampling_rate": data.sampling_rate
    }
    
    # 배경 작업으로 ECG 분석 수행
    background_tasks.add_task(
        analyze_and_save_ecg_data, 
        ecg_raw_data, 
        db
    )
    
    return {"status": "success", "message": "ECG 데이터가 업로드되었으며 분석이 진행 중입니다"}

@router.get("/data/{user_id}", response_model=List[ECGDataOutput])
async def get_ecg_data(
    user_id: str,
    limit: int = Query(10, ge=1, le=100),
    skip: int = Query(0, ge=0),
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: AsyncIOMotorDatabase = Depends(get_async_db),
    current_user = Depends(get_current_user)
):
    """
    사용자의 ECG 분석 데이터 조회
    """
    if current_user["id"] != user_id and not current_user.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="다른 사용자의 데이터에 접근할 권한이 없습니다"
        )
    
    # 쿼리 필터 설정
    query = {"user_id": user_id}
    
    if start_date and end_date:
        query["timestamp"] = {"$gte": start_date, "$lte": end_date}
    elif start_date:
        query["timestamp"] = {"$gte": start_date}
    elif end_date:
        query["timestamp"] = {"$lte": end_date}
    
    # 데이터 조회
    cursor = db.ecg_analysis.find(query).sort("timestamp", -1).skip(skip).limit(limit)
    results = []
    
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        results.append(ECGDataOutput(**doc))
    
    return results

@router.get("/risk-assessment/{user_id}", response_model=Dict[str, Any])
async def get_risk_assessment(
    user_id: str,
    days: int = Query(7, ge=1, le=30),
    db: AsyncIOMotorDatabase = Depends(get_async_db),
    current_user = Depends(get_current_user)
):
    """
    사용자의 ECG 기반 심장 위험도 평가
    """
    if current_user["id"] != user_id and not current_user.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="다른 사용자의 데이터에 접근할 권한이 없습니다"
        )
    
    # 최근 N일 데이터 조회
    start_date = datetime.utcnow() - timedelta(days=days)
    query = {
        "user_id": user_id,
        "timestamp": {"$gte": start_date}
    }
    
    cursor = db.ecg_analysis.find(query).sort("timestamp", 1)
    
    # 위험도 데이터 집계
    risk_data = []
    risk_factors_count = {}
    total_samples = 0
    
    async for doc in cursor:
        risk_data.append({
            "timestamp": doc["timestamp"],
            "risk_level": doc["risk_level"]
        })
        
        total_samples += 1
        
        # 위험 요소 집계
        for factor in doc.get("risk_factors", []):
            if factor in risk_factors_count:
                risk_factors_count[factor] += 1
            else:
                risk_factors_count[factor] = 1
    
    # 데이터가 없는 경우
    if not risk_data:
        return {
            "avg_risk_level": 0,
            "max_risk_level": 0,
            "risk_trend": [],
            "risk_factors": [],
            "recommendations": ["충분한 데이터가 없습니다. 더 많은 ECG 측정을 진행해주세요."]
        }
    
    # 일별 평균 위험도 계산
    df = pd.DataFrame(risk_data)
    df["date"] = df["timestamp"].dt.date
    daily_risk = df.groupby("date")["risk_level"].mean().reset_index()
    
    # 위험 요소 정렬
    risk_factors = [
        {"factor": k, "count": v, "percentage": round(v / total_samples * 100, 1)}
        for k, v in sorted(risk_factors_count.items(), key=lambda x: x[1], reverse=True)
    ]
    
    # 추천 사항 생성
    recommendations = generate_recommendations(risk_factors, daily_risk["risk_level"].mean())
    
    return {
        "avg_risk_level": round(df["risk_level"].mean(), 2),
        "max_risk_level": int(df["risk_level"].max()),
        "risk_trend": [
            {"date": row["date"].isoformat(), "risk_level": round(row["risk_level"], 2)}
            for _, row in daily_risk.iterrows()
        ],
        "risk_factors": risk_factors[:5],  # 상위 5개 위험 요소만 반환
        "recommendations": recommendations
    }

# 내부 함수: ECG 분석 및 결과 저장
async def analyze_and_save_ecg_data(ecg_data: dict, db: AsyncIOMotorDatabase):
    try:
        # ECG 신호 추출
        ecg_signal = np.array([point["value"] for point in ecg_data["data"]])
        sampling_rate = ecg_data["sampling_rate"]
        
        # 분석 수행
        analysis_result = analyze_ecg(ecg_signal, sampling_rate)
        
        # 분석 결과 저장
        analysis_doc = {
            "user_id": ecg_data["user_id"],
            "device_id": ecg_data["device_id"],
            "timestamp": ecg_data["timestamp"],
            "heart_rate": analysis_result["heart_rate"],
            "avg_rr_interval": analysis_result["avg_rr_interval"],
            "hrv_sdnn": analysis_result["hrv_sdnn"],
            "risk_level": analysis_result["risk_level"],
            "risk_factors": analysis_result["risk_factors"]
        }
        
        await db.ecg_analysis.insert_one(analysis_doc)
        
        # 위험도가 3 이상인 경우 알림 저장
        if analysis_result["risk_level"] >= 3:
            notification = {
                "user_id": ecg_data["user_id"],
                "type": "ecg_risk_alert",
                "timestamp": datetime.utcnow(),
                "title": f"심전도 이상 감지 (위험도: {analysis_result['risk_level']})",
                "message": f"ECG 분석 결과 다음 위험 요소가 감지되었습니다: {', '.join(analysis_result['risk_factors'])}",
                "read": False,
                "data": {
                    "risk_level": analysis_result["risk_level"],
                    "risk_factors": analysis_result["risk_factors"]
                }
            }
            await db.notifications.insert_one(notification)
            
        logger.info(f"ECG 분석 완료: 사용자 {ecg_data['user_id']}, 위험도 {analysis_result['risk_level']}")
        
    except Exception as e:
        logger.error(f"ECG 분석 중 오류 발생: {str(e)}")

# ECG 신호 분석 함수
def analyze_ecg(ecg_signal: np.ndarray, sampling_rate: int) -> ECGAnalysisResult:
    """ECG 신호를 분석하여 심박수, RR 간격, HRV 등을 계산"""
    
    # 신호 전처리 (노이즈 제거)
    ecg_filtered = preprocess_ecg(ecg_signal, sampling_rate)
    
    # R-peak 검출
    r_peaks, _ = signal.find_peaks(ecg_filtered, height=0.6*np.max(ecg_filtered), distance=sampling_rate*0.5)
    
    # R-peak가 충분하지 않은 경우
    if len(r_peaks) < 2:
        return {
            "heart_rate": 0,
            "avg_rr_interval": 0,
            "hrv_sdnn": 0,
            "risk_level": 0,
            "risk_factors": ["데이터 불충분"]
        }
    
    # RR 간격 계산 (초 단위)
    rr_intervals = np.diff(r_peaks) / sampling_rate
    
    # 비정상적인 RR 간격 필터링 (0.4초 미만, 2.0초 초과)
    valid_rr = rr_intervals[(rr_intervals >= 0.4) & (rr_intervals <= 2.0)]
    
    if len(valid_rr) < 2:
        return {
            "heart_rate": 0,
            "avg_rr_interval": 0,
            "hrv_sdnn": 0,
            "risk_level": 0,
            "risk_factors": ["유효하지 않은 RR 간격"]
        }
    
    # 심박수 계산 (BPM)
    avg_rr = np.mean(valid_rr)
    heart_rate = int(60 / avg_rr)
    
    # HRV (SDNN) 계산
    hrv_sdnn = np.std(valid_rr) * 1000  # ms 단위
    
    # 부정맥 검출
    risk_factors = []
    risk_level = 0
    
    # 빈맥(빠른 심박수)
    if heart_rate > 100:
        risk_factors.append("빈맥")
        risk_level += 1
    
    # 서맥(느린 심박수)
    if heart_rate < 50:
        risk_factors.append("서맥")
        risk_level += 1
    
    # 불규칙한 심박 (RR 간격의 변동이 큰 경우)
    rr_variability = np.max(valid_rr) / np.min(valid_rr)
    if rr_variability > 1.5:
        risk_factors.append("불규칙한 심박")
        risk_level += 1
    
    # 낮은 HRV (스트레스 지표)
    if hrv_sdnn < 20:
        risk_factors.append("낮은 HRV")
        risk_level += 1
    
    # 비정상적으로 긴 RR 간격 (2초 급)
    if np.any(rr_intervals > 1.8):
        risk_factors.append("심장 일시 정지 의심")
        risk_level += 2
    
    # 위험도 상한선 설정
    risk_level = min(risk_level, 5)
    
    return {
        "heart_rate": heart_rate,
        "avg_rr_interval": round(avg_rr * 1000, 2),  # ms 단위로 변환
        "hrv_sdnn": round(hrv_sdnn, 2),
        "risk_level": risk_level,
        "risk_factors": risk_factors
    }

def preprocess_ecg(ecg_signal: np.ndarray, sampling_rate: int) -> np.ndarray:
    """ECG 신호 전처리 (노이즈 제거 및 기준선 보정)"""
    
    # 기준선 보정 (고역 필터)
    b, a = signal.butter(2, 0.5, 'highpass', fs=sampling_rate)
    ecg_highpass = signal.filtfilt(b, a, ecg_signal)
    
    # 노이즈 제거 (저역 필터)
    b, a = signal.butter(3, 20, 'lowpass', fs=sampling_rate)
    ecg_filtered = signal.filtfilt(b, a, ecg_highpass)
    
    # 정규화
    ecg_normalized = (ecg_filtered - np.min(ecg_filtered)) / (np.max(ecg_filtered) - np.min(ecg_filtered))
    
    return ecg_normalized

def generate_recommendations(risk_factors: List[Dict], avg_risk_level: float) -> List[str]:
    """위험 요소 기반 추천 사항 생성"""
    recommendations = []
    
    # 위험 요소별 추천 사항
    for factor in risk_factors:
        factor_name = factor["factor"]
        
        if factor_name == "빈맥":
            recommendations.append("카페인 섭취를 줄이고 충분한 휴식을 취하세요.")
        elif factor_name == "서맥":
            recommendations.append("규칙적인 운동을 통해 심장 기능을 강화하세요.")
        elif factor_name == "불규칙한 심박":
            recommendations.append("스트레스 관리와 충분한 수면이 필요합니다.")
        elif factor_name == "낮은 HRV":
            recommendations.append("명상과 호흡 운동을 통해 스트레스를 관리하세요.")
        elif factor_name == "심장 일시 정지 의심":
            recommendations.append("즉시 의사와 상담하고 정밀 검사를 받으세요.")
    
    # 위험도 기반 일반 추천 사항
    if avg_risk_level < 1:
        recommendations.append("심장 건강이 좋습니다. 현재 생활 습관을 유지하세요.")
    elif 1 <= avg_risk_level < 2:
        recommendations.append("규칙적인 심장 건강 체크를 권장합니다.")
    elif 2 <= avg_risk_level < 3:
        recommendations.append("건강한 식습관과 중간 강도의 유산소 운동을 권장합니다.")
    elif avg_risk_level >= 3:
        recommendations.append("전문의와 상담하여 정밀 검사를 받아보세요.")
    
    # 중복 제거 및 최대 5개 추천 사항으로 제한
    unique_recommendations = list(set(recommendations))
    return unique_recommendations[:5] 