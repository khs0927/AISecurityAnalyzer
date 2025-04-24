import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime
from pydantic import BaseModel, Field
import pickle
import os
from scipy import signal
from scipy.stats import zscore
import neurokit2 as nk

# 로거 설정
logger = logging.getLogger(__name__)

class ECGInterval(BaseModel):
    """ECG 간격 정보"""
    p_onset: Optional[float] = None
    p_offset: Optional[float] = None
    qrs_onset: Optional[float] = None
    qrs_offset: Optional[float] = None
    t_offset: Optional[float] = None
    pr_interval: Optional[float] = None
    qrs_interval: Optional[float] = None
    qt_interval: Optional[float] = None
    corrected_qt: Optional[float] = None

class ECGPeak(BaseModel):
    """ECG 피크 정보"""
    p_peaks: List[int] = Field(default_factory=list)
    q_peaks: List[int] = Field(default_factory=list)
    r_peaks: List[int] = Field(default_factory=list)
    s_peaks: List[int] = Field(default_factory=list)
    t_peaks: List[int] = Field(default_factory=list)

class HRVMetrics(BaseModel):
    """심박변이도(HRV) 지표"""
    rmssd: Optional[float] = None  # Root Mean Square of Successive Differences
    sdnn: Optional[float] = None   # Standard Deviation of NN Intervals
    pnn50: Optional[float] = None  # Percentage of successive NN intervals > 50ms
    lf: Optional[float] = None     # Low Frequency Power
    hf: Optional[float] = None     # High Frequency Power
    lf_hf_ratio: Optional[float] = None  # LF/HF Ratio

class ECGResult(BaseModel):
    """ECG 분석 결과"""
    mean_hr: float
    min_hr: float
    max_hr: float
    avg_rr_interval: float
    signal_quality: float
    num_beats: int
    irregular_beats: List[int] = Field(default_factory=list)
    intervals: ECGInterval
    hrv_metrics: HRVMetrics
    anomaly_score: float = 0.0
    anomaly_detected: bool = False
    anomaly_type: Optional[str] = None
    confidence: float = 0.0
    analysis_notes: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
class ECGAnalyzer:
    """
    ECG 신호 분석 클래스
    
    주요 기능:
    1. ECG 신호 전처리 (노이즈 제거, 베이스라인 보정)
    2. R 피크 검출
    3. 심박수 계산
    4. 심박변이도(HRV) 분석
    5. 부정맥 검출
    6. 신호 품질 평가
    """
    
    def __init__(self, sampling_rate: int = 250, model_path: Optional[str] = None):
        """
        ECG 분석기 초기화
        
        Args:
            sampling_rate: ECG 신호의 샘플링 레이트 (Hz)
            model_path: 부정맥 검출 모델 경로 (선택 사항)
        """
        self.sampling_rate = sampling_rate
        self.model = None
        
        # 부정맥 검출 모델 로드 (있는 경우)
        if model_path and os.path.exists(model_path):
            try:
                with open(model_path, 'rb') as f:
                    self.model = pickle.load(f)
                logger.info(f"부정맥 검출 모델 로드 완료: {model_path}")
            except Exception as e:
                logger.error(f"부정맥 모델 로드 오류: {str(e)}")
    
    def preprocess(self, signal_raw: np.ndarray) -> np.ndarray:
        """
        ECG 신호 전처리
        
        Args:
            signal_raw: 원시 ECG 신호
            
        Returns:
            전처리된 ECG 신호
        """
        try:
            # 2차원 배열이면 첫 번째 채널만 사용
            if len(signal_raw.shape) > 1:
                if signal_raw.shape[1] > 1:
                    signal_raw = signal_raw[:, 0]
                else:
                    signal_raw = signal_raw.flatten()
            
            # NaN 값 처리
            signal_raw = np.nan_to_num(signal_raw)
            
            # 이상치 제거 (z-score 기반)
            z_scores = zscore(signal_raw, nan_policy='omit')
            abs_z_scores = np.abs(z_scores)
            filtered_indices = abs_z_scores < 3
            signal_raw = signal_raw[filtered_indices]
            
            # 대역 통과 필터 적용 (0.5-40Hz)
            filtered = nk.signal_filter(
                signal_raw,
                sampling_rate=self.sampling_rate,
                lowcut=0.5,
                highcut=40,
                method="butterworth",
                order=4
            )
            
            # 기준선 보정
            filtered = nk.signal_detrend(filtered, method="polynomial", order=2)
            
            return filtered
        
        except Exception as e:
            logger.error(f"ECG 전처리 오류: {str(e)}")
            return signal_raw  # 오류 발생시 원본 반환
    
    def detect_r_peaks(self, signal_processed: np.ndarray) -> np.ndarray:
        """
        R 피크 검출
        
        Args:
            signal_processed: 전처리된 ECG 신호
            
        Returns:
            R 피크 인덱스 배열
        """
        try:
            # R 피크 검출 방법들 시도
            try:
                _, rpeaks = nk.ecg_peaks(
                    signal_processed, 
                    sampling_rate=self.sampling_rate,
                    method="pantompkins"
                )
                rpeaks = rpeaks["ECG_R_Peaks"]
            except:
                try:
                    # 첫 번째 방법이 실패한 경우 다른 방법 시도
                    _, rpeaks = nk.ecg_peaks(
                        signal_processed, 
                        sampling_rate=self.sampling_rate,
                        method="neurokit"
                    )
                    rpeaks = rpeaks["ECG_R_Peaks"]
                except:
                    # 마지막 방법으로 Hamilton 알고리즘 시도
                    _, rpeaks = nk.ecg_peaks(
                        signal_processed, 
                        sampling_rate=self.sampling_rate,
                        method="hamilton"
                    )
                    rpeaks = rpeaks["ECG_R_Peaks"]
            
            # 유효한 R 피크가 없는 경우 처리
            if len(rpeaks) < 2:
                logger.warning("유효한 R 피크를 찾을 수 없음")
                # 더미 피크 생성 (실제 분석에서는 사용하지 않음)
                rpeaks = np.array([0, len(signal_processed) - 1])
            
            return rpeaks
        
        except Exception as e:
            logger.error(f"R 피크 검출 오류: {str(e)}")
            # 오류 발생시 더미 피크 반환
            return np.array([0, len(signal_processed) - 1])
    
    def extract_ecg_features(self, signal_processed: np.ndarray, rpeaks: np.ndarray) -> Dict[str, Any]:
        """
        ECG 특징 추출
        
        Args:
            signal_processed: 전처리된 ECG 신호
            rpeaks: R 피크 인덱스 배열
            
        Returns:
            ECG 특징 딕셔너리
        """
        features = {}
        
        try:
            # RR 간격 계산
            rr_intervals = np.diff(rpeaks) / self.sampling_rate * 1000  # ms 단위
            
            # 심박수 계산
            hr = 60000 / rr_intervals  # 60000 ms = 1 minute
            
            features["mean_hr"] = np.mean(hr)
            features["min_hr"] = np.min(hr)
            features["max_hr"] = np.max(hr)
            features["avg_rr_interval"] = np.mean(rr_intervals)
            features["num_beats"] = len(rpeaks)
            
            # HRV 지표 계산
            hrv_features = self.calculate_hrv(rr_intervals)
            features["hrv_metrics"] = hrv_features
            
            # ECG 파형 분석
            try:
                waves = nk.ecg_delineate(
                    signal_processed, 
                    rpeaks, 
                    sampling_rate=self.sampling_rate,
                    method="dwt"
                )
                
                intervals = ECGInterval(
                    p_onset=None,
                    p_offset=None,
                    qrs_onset=None,
                    qrs_offset=None,
                    t_offset=None
                )
                
                # P, QRS, T 파형 인덱스 추출
                p_peaks = waves["ECG_P_Peaks"]
                q_peaks = waves["ECG_Q_Peaks"]
                s_peaks = waves["ECG_S_Peaks"]
                t_peaks = waves["ECG_T_Peaks"]
                
                # 간격 계산
                if len(p_peaks) > 0 and len(waves["ECG_P_Onsets"]) > 0 and len(waves["ECG_P_Offsets"]) > 0:
                    intervals.p_onset = np.mean(np.diff(waves["ECG_P_Onsets"])) / self.sampling_rate * 1000
                    intervals.p_offset = np.mean(np.diff(waves["ECG_P_Offsets"])) / self.sampling_rate * 1000
                
                if len(waves["ECG_QRS_Onsets"]) > 0 and len(waves["ECG_QRS_Offsets"]) > 0:
                    intervals.qrs_onset = np.mean(np.diff(waves["ECG_QRS_Onsets"])) / self.sampling_rate * 1000
                    intervals.qrs_offset = np.mean(np.diff(waves["ECG_QRS_Offsets"])) / self.sampling_rate * 1000
                
                if len(waves["ECG_T_Offsets"]) > 0:
                    intervals.t_offset = np.mean(np.diff(waves["ECG_T_Offsets"])) / self.sampling_rate * 1000
                
                # PR, QRS, QT 간격 계산
                if intervals.p_onset is not None and intervals.qrs_onset is not None:
                    intervals.pr_interval = intervals.qrs_onset - intervals.p_onset
                
                if intervals.qrs_offset is not None and intervals.qrs_onset is not None:
                    intervals.qrs_interval = intervals.qrs_offset - intervals.qrs_onset
                
                if intervals.qrs_onset is not None and intervals.t_offset is not None:
                    intervals.qt_interval = intervals.t_offset - intervals.qrs_onset
                    # 보정된 QT 간격 (Bazett 공식)
                    if features["avg_rr_interval"] > 0:
                        intervals.corrected_qt = intervals.qt_interval / np.sqrt(features["avg_rr_interval"] / 1000)
                
                features["intervals"] = intervals
                
            except Exception as e:
                logger.warning(f"ECG 파형 분석 오류: {str(e)}")
                # 기본 간격 값 설정
                features["intervals"] = ECGInterval()
            
            # 부정맥 검출
            irregular_beats = self.detect_irregular_beats(rr_intervals)
            features["irregular_beats"] = irregular_beats
            
            # 신호 품질 평가
            signal_quality = self.assess_signal_quality(signal_processed, rpeaks)
            features["signal_quality"] = signal_quality
            
            # 모델 기반 부정맥 분류 (모델이 있는 경우)
            if self.model is not None:
                try:
                    X = self.extract_model_features(signal_processed, rpeaks, rr_intervals)
                    prediction = self.model.predict_proba([X])[0]
                    anomaly_score = prediction[1] if len(prediction) > 1 else 0
                    anomaly_detected = anomaly_score > 0.6
                    
                    features["anomaly_score"] = float(anomaly_score)
                    features["anomaly_detected"] = bool(anomaly_detected)
                    features["confidence"] = float(max(prediction))
                    
                    if anomaly_detected:
                        anomaly_types = ["정상", "부정맥"]
                        features["anomaly_type"] = anomaly_types[np.argmax(prediction)]
                except Exception as e:
                    logger.error(f"모델 기반 분류 오류: {str(e)}")
            
            # 분석 노트 생성
            notes = []
            
            if features["mean_hr"] < 60:
                notes.append("서맥(느린 심박수)이 감지되었습니다.")
            elif features["mean_hr"] > 100:
                notes.append("빈맥(빠른 심박수)이 감지되었습니다.")
            
            if len(irregular_beats) > 0.1 * len(rpeaks):
                notes.append("불규칙한 심박이 다수 감지되었습니다.")
            
            if signal_quality < 0.6:
                notes.append("신호 품질이 좋지 않아 결과가 부정확할 수 있습니다.")
            
            features["analysis_notes"] = notes
            
        except Exception as e:
            logger.error(f"ECG 특징 추출 오류: {str(e)}")
            # 기본 특징 설정
            features = {
                "mean_hr": 0,
                "min_hr": 0,
                "max_hr": 0,
                "avg_rr_interval": 0,
                "num_beats": 0,
                "hrv_metrics": HRVMetrics(),
                "intervals": ECGInterval(),
                "irregular_beats": [],
                "signal_quality": 0,
                "anomaly_score": 0,
                "anomaly_detected": False,
                "confidence": 0,
                "analysis_notes": ["분석 중 오류가 발생했습니다."]
            }
        
        return features
    
    def calculate_hrv(self, rr_intervals: np.ndarray) -> HRVMetrics:
        """
        심박변이도(HRV) 지표 계산
        
        Args:
            rr_intervals: RR 간격 배열 (ms)
            
        Returns:
            HRV 지표
        """
        hrv = HRVMetrics()
        
        try:
            # RR 간격이 너무 적은 경우 처리
            if len(rr_intervals) < 3:
                return hrv
            
            # NeuroKit2를 사용한 HRV 계산
            nk_hrv = nk.hrv_time(rr_intervals, sampling_rate=self.sampling_rate)
            nk_hrv_freq = nk.hrv_frequency(rr_intervals, sampling_rate=self.sampling_rate)
            
            # 시간 영역 지표
            hrv.rmssd = float(nk_hrv["HRV_RMSSD"].iloc[0]) if not nk_hrv["HRV_RMSSD"].empty else None
            hrv.sdnn = float(nk_hrv["HRV_SDNN"].iloc[0]) if not nk_hrv["HRV_SDNN"].empty else None
            hrv.pnn50 = float(nk_hrv["HRV_pNN50"].iloc[0]) if not nk_hrv["HRV_pNN50"].empty else None
            
            # 주파수 영역 지표
            hrv.lf = float(nk_hrv_freq["HRV_LF"].iloc[0]) if not nk_hrv_freq["HRV_LF"].empty else None
            hrv.hf = float(nk_hrv_freq["HRV_HF"].iloc[0]) if not nk_hrv_freq["HRV_HF"].empty else None
            
            # LF/HF 비율
            if hrv.lf is not None and hrv.hf is not None and hrv.hf > 0:
                hrv.lf_hf_ratio = hrv.lf / hrv.hf
        
        except Exception as e:
            logger.error(f"HRV 계산 오류: {str(e)}")
        
        return hrv
    
    def detect_irregular_beats(self, rr_intervals: np.ndarray) -> List[int]:
        """
        불규칙한 심박 검출
        
        Args:
            rr_intervals: RR 간격 배열 (ms)
            
        Returns:
            불규칙한 심박 인덱스 목록
        """
        irregular_beats = []
        
        try:
            # RR 간격이 너무 적은 경우 처리
            if len(rr_intervals) < 3:
                return irregular_beats
            
            # RR 간격 표준편차 계산
            rr_mean = np.mean(rr_intervals)
            rr_std = np.std(rr_intervals)
            
            # 정상 범위 설정 (평균 ± 2*표준편차)
            lower_bound = rr_mean - 2 * rr_std
            upper_bound = rr_mean + 2 * rr_std
            
            # 불규칙한 간격 식별
            for i, rr in enumerate(rr_intervals):
                if rr < lower_bound or rr > upper_bound:
                    irregular_beats.append(i)
        
        except Exception as e:
            logger.error(f"불규칙 심박 검출 오류: {str(e)}")
        
        return irregular_beats
    
    def assess_signal_quality(self, signal: np.ndarray, rpeaks: np.ndarray) -> float:
        """
        신호 품질 평가
        
        Args:
            signal: ECG 신호
            rpeaks: R 피크 인덱스 배열
            
        Returns:
            신호 품질 점수 (0-1)
        """
        try:
            # 신호가 너무 짧은 경우
            # 최소 3초 이상의 신호 필요
            MIN_SIGNAL_DURATION = 3  # 초
            if len(signal) < self.sampling_rate * MIN_SIGNAL_DURATION:
                return 0.4
            
            # 너무 적은 R 피크
            if len(rpeaks) < 5:
                return 0.3
            
            # SNR(신호대잡음비) 추정
            clean_segments = []
            for peak in rpeaks:
                if peak > 50 and peak < len(signal) - 50:
                    segment = signal[peak-50:peak+50]
                    clean_segments.append(segment)
            
            if len(clean_segments) > 0:
                clean_signal = np.concatenate(clean_segments)
                signal_power = np.mean(np.square(clean_signal))
                
                # 잡음 추정
                noise_segments = []
                for i in range(1, len(rpeaks)):
                    mid_point = rpeaks[i-1] + (rpeaks[i] - rpeaks[i-1]) // 2
                    if mid_point > 20 and mid_point < len(signal) - 20:
                        segment = signal[mid_point-20:mid_point+20]
                        noise_segments.append(segment)
                
                if len(noise_segments) > 0:
                    noise_signal = np.concatenate(noise_segments)
                    noise_power = np.mean(np.square(noise_signal))
                    
                    if noise_power > 0:
                        snr = 10 * np.log10(signal_power / noise_power)
                        
                        # SNR을 0-1 점수로 변환
                        quality_score = min(1.0, max(0.0, (snr + 5) / 20))
                        return quality_score
            
            # 기본 품질 점수
            return 0.6
        
        except Exception as e:
            logger.error(f"신호 품질 평가 오류: {str(e)}")
            return 0.5
    
    def extract_model_features(self, signal: np.ndarray, rpeaks: np.ndarray, rr_intervals: np.ndarray) -> List[float]:
        """
        모델용 특징 추출
        
        Args:
            signal: ECG 신호
            rpeaks: R 피크 인덱스 배열
            rr_intervals: RR 간격 배열
            
        Returns:
            모델용 특징 벡터
        """
        features = []
        
        try:
            # RR 간격 통계
            features.append(np.mean(rr_intervals))
            features.append(np.std(rr_intervals))
            features.append(np.min(rr_intervals))
            features.append(np.max(rr_intervals))
            
            # 심박수
            heart_rates = 60000 / rr_intervals
            features.append(np.mean(heart_rates))
            features.append(np.std(heart_rates))
            
            # HRV 지표
            hrv = self.calculate_hrv(rr_intervals)
            features.append(hrv.rmssd if hrv.rmssd is not None else 0)
            features.append(hrv.sdnn if hrv.sdnn is not None else 0)
            features.append(hrv.pnn50 if hrv.pnn50 is not None else 0)
            
            # 주파수 영역 특징
            freqs, psd = signal.welch(signal, fs=self.sampling_rate, nperseg=2048)
            
            # 주요 주파수 대역 파워
            delta_idx = np.logical_and(freqs >= 0.5, freqs < 4)
            theta_idx = np.logical_and(freqs >= 4, freqs < 8)
            alpha_idx = np.logical_and(freqs >= 8, freqs < 13)
            beta_idx = np.logical_and(freqs >= 13, freqs < 30)
            
            features.append(np.sum(psd[delta_idx]))
            features.append(np.sum(psd[theta_idx]))
            features.append(np.sum(psd[alpha_idx]))
            features.append(np.sum(psd[beta_idx]))
            
            # 신호 통계
            features.append(np.mean(signal))
            features.append(np.std(signal))
            features.append(np.max(signal) - np.min(signal))
            features.append(np.percentile(signal, 75) - np.percentile(signal, 25))
            
        except Exception as e:
            logger.error(f"모델 특징 추출 오류: {str(e)}")
            # 오류 발생 시 0으로 채운 특징 벡터 반환
            features = [0] * 18
        
        return features
    
    def analyze(self, signal_raw: np.ndarray) -> ECGResult:
        """
        ECG 신호 분석 수행
        
        Args:
            signal_raw: 원시 ECG 신호
            
        Returns:
            ECG 분석 결과
        """
        try:
            # 전처리
            signal_processed = self.preprocess(signal_raw)
            
            # R 피크 검출
            rpeaks = self.detect_r_peaks(signal_processed)
            
            # 특징 추출
            features = self.extract_ecg_features(signal_processed, rpeaks)
            
            # 결과 생성
            result = ECGResult(
                mean_hr=features["mean_hr"],
                min_hr=features["min_hr"],
                max_hr=features["max_hr"],
                avg_rr_interval=features["avg_rr_interval"],
                signal_quality=features["signal_quality"],
                num_beats=features["num_beats"],
                irregular_beats=features["irregular_beats"],
                intervals=features["intervals"],
                hrv_metrics=features["hrv_metrics"],
                anomaly_score=features.get("anomaly_score", 0.0),
                anomaly_detected=features.get("anomaly_detected", False),
                anomaly_type=features.get("anomaly_type", None),
                confidence=features.get("confidence", 0.0),
                analysis_notes=features["analysis_notes"],
                created_at=datetime.utcnow()
            )
            
            return result
        
        except Exception as e:
            logger.error(f"ECG 분석 오류: {str(e)}")
            # 오류 발생 시 기본 결과 반환
            return ECGResult(
                mean_hr=0,
                min_hr=0,
                max_hr=0,
                avg_rr_interval=0,
                signal_quality=0,
                num_beats=0,
                analysis_notes=["분석 중 오류가 발생했습니다."]
            ) 