import numpy as np
from typing import Tuple, List, Dict, Any
from scipy import signal

def process_ecg_signal(ecg_signal: np.ndarray, sampling_rate: int) -> np.ndarray:
    """
    ECG 신호를 전처리하는 함수
    
    Args:
        ecg_signal: 원본 ECG 신호
        sampling_rate: 샘플링 레이트 (Hz)
        
    Returns:
        전처리된 ECG 신호
    """
    # 신호 길이 확인 및 조정
    if len(ecg_signal) < sampling_rate * 5:  # 최소 5초 이상의 데이터 필요
        # 신호가 너무 짧으면 복제하여 확장
        repeat_count = int(np.ceil((sampling_rate * 5) / len(ecg_signal)))
        ecg_signal = np.tile(ecg_signal, repeat_count)
        ecg_signal = ecg_signal[:sampling_rate * 5]  # 5초 데이터로 맞춤
    
    # 기준선 변동 제거 (고주파 통과 필터)
    b, a = signal.butter(2, 0.5/(sampling_rate/2), 'highpass')
    ecg_filtered = signal.filtfilt(b, a, ecg_signal)
    
    # 전원 노이즈 제거 (노치 필터 - 60Hz)
    b, a = signal.iirnotch(60, 30, sampling_rate)
    ecg_filtered = signal.filtfilt(b, a, ecg_filtered)
    
    # 근육 노이즈 제거 (저주파 통과 필터)
    b, a = signal.butter(2, 45/(sampling_rate/2), 'lowpass')
    ecg_filtered = signal.filtfilt(b, a, ecg_filtered)
    
    # 정규화
    ecg_normalized = (ecg_filtered - np.mean(ecg_filtered)) / np.std(ecg_filtered)
    
    return ecg_normalized

def detect_r_peaks(ecg_signal: np.ndarray, sampling_rate: int) -> np.ndarray:
    """
    ECG 신호에서 R 피크를 검출하는 함수
    
    Args:
        ecg_signal: 전처리된 ECG 신호
        sampling_rate: 샘플링 레이트 (Hz)
        
    Returns:
        R 피크 위치의 인덱스 배열
    """
    # Pan-Tompkins 알고리즘을 간략화한 구현
    # 미분
    diff_ecg = np.diff(ecg_signal)
    
    # 제곱
    squared = diff_ecg ** 2
    
    # 적분 (이동 평균)
    window_size = int(sampling_rate * 0.12)  # 약 120ms 윈도우
    window = np.ones(window_size) / window_size
    integrated = np.convolve(squared, window, mode='same')
    
    # 피크 탐지를 위한 임계값 설정
    threshold = 0.6 * np.max(integrated)
    
    # 피크 탐지
    peaks, _ = signal.find_peaks(integrated, height=threshold, distance=int(sampling_rate * 0.3))
    
    return peaks

def calculate_rr_intervals(r_peaks: np.ndarray, sampling_rate: int) -> np.ndarray:
    """
    R 피크 간격을 계산하는 함수
    
    Args:
        r_peaks: R 피크 위치의 인덱스 배열
        sampling_rate: 샘플링 레이트 (Hz)
        
    Returns:
        RR 간격 (초 단위)
    """
    # R 피크 간 샘플 수 계산
    rr_samples = np.diff(r_peaks)
    
    # 샘플 수를 시간(초)으로 변환
    rr_intervals = rr_samples / sampling_rate
    
    return rr_intervals

def detect_arrhythmia(ecg_signal: np.ndarray, sampling_rate: int) -> Tuple[bool, float]:
    """
    부정맥을 탐지하는 함수
    
    Args:
        ecg_signal: 전처리된 ECG 신호
        sampling_rate: 샘플링 레이트 (Hz)
        
    Returns:
        부정맥 탐지 결과 (True/False)와 신뢰도
    """
    # R 피크 탐지
    r_peaks = detect_r_peaks(ecg_signal, sampling_rate)
    
    # RR 간격 계산
    rr_intervals = calculate_rr_intervals(r_peaks, sampling_rate)
    
    if len(rr_intervals) < 2:
        return False, 0.0
    
    # 부정맥 탐지 로직 (RR 간격의 변동성 분석)
    rr_mean = np.mean(rr_intervals)
    rr_std = np.std(rr_intervals)
    
    # RR 간격 변동 계수
    rr_cv = rr_std / rr_mean if rr_mean > 0 else 0
    
    # 연속적인 RR 간격 차이 계산
    rr_diff = np.abs(np.diff(rr_intervals))
    rr_diff_mean = np.mean(rr_diff) if len(rr_diff) > 0 else 0
    
    # 심박 변이도 (HRV) 지표 계산
    if len(rr_intervals) > 1:
        # NN50: 연속된 RR 간격의 차이가 50ms를 초과하는 횟수
        nn50 = sum(np.abs(np.diff(rr_intervals * 1000)) > 50)
        pnn50 = (nn50 / len(rr_intervals)) * 100 if len(rr_intervals) > 0 else 0
    else:
        pnn50 = 0
    
    # 부정맥 점수 계산
    arrhythmia_score = 0.0
    confidence = 0.0
    
    # 심박수 계산 및 정상 범위 (60-100 BPM) 확인
    heart_rate = 60 / rr_mean if rr_mean > 0 else 0
    if heart_rate < 60 or heart_rate > 100:
        arrhythmia_score += 0.3
    
    # RR 간격 변동성 확인
    if rr_cv > 0.15:  # 변동 계수가 15% 이상이면 부정맥 의심
        arrhythmia_score += 0.4
    
    # 연속 RR 간격 차이 확인
    if rr_diff_mean > 0.1:  # 연속 RR 간격 차이 평균이 100ms 이상이면 부정맥 의심
        arrhythmia_score += 0.3
    
    # pNN50 지표 확인 (20% 이상이면 부정맥 의심)
    if pnn50 > 20:
        arrhythmia_score += 0.2
    
    # 최종 결정
    is_arrhythmia = arrhythmia_score > 0.5
    confidence = min(1.0, arrhythmia_score * 1.5) if is_arrhythmia else 1.0 - (arrhythmia_score * 1.5)
    
    return is_arrhythmia, confidence

def extract_ecg_features(ecg_signal: np.ndarray, sampling_rate: int) -> Tuple[float, np.ndarray, Dict[str, Any]]:
    """
    ECG 신호에서 특성을 추출하는 함수
    
    Args:
        ecg_signal: 전처리된 ECG 신호
        sampling_rate: 샘플링 레이트 (Hz)
        
    Returns:
        심박수, RR 간격 배열, 추출된 특성 사전
    """
    # R 피크 탐지
    r_peaks = detect_r_peaks(ecg_signal, sampling_rate)
    
    # RR 간격 계산
    rr_intervals = calculate_rr_intervals(r_peaks, sampling_rate)
    
    # 심박수 계산
    if len(rr_intervals) > 0:
        heart_rate = 60 / np.mean(rr_intervals)
    else:
        heart_rate = 0.0
    
    # 시간 영역 HRV 지표 계산
    if len(rr_intervals) > 1:
        sdnn = np.std(rr_intervals)  # RR 간격의 표준편차
        rmssd = np.sqrt(np.mean(np.diff(rr_intervals) ** 2))  # RR 간격 차이의 RMS
        nn50 = sum(np.abs(np.diff(rr_intervals * 1000)) > 50)  # 50ms 이상 차이나는 연속 RR 간격 수
        pnn50 = (nn50 / len(rr_intervals)) * 100 if len(rr_intervals) > 0 else 0  # NN50의 비율
    else:
        sdnn, rmssd, nn50, pnn50 = 0, 0, 0, 0
    
    # 주파수 영역 분석 (간략화된 버전)
    # 실제 구현에서는 파워 스펙트럼 밀도 분석을 통해 LF/HF 비율 등을 계산할 수 있음
    
    # 추출된 특성 사전
    features = {
        "time_domain": {
            "sdnn": float(sdnn),
            "rmssd": float(rmssd),
            "nn50": int(nn50),
            "pnn50": float(pnn50)
        },
        "frequency_domain": {
            # 간략화된 구현으로 더미 값 반환
            "lf": 0.4,
            "hf": 0.3,
            "lf_hf_ratio": 1.33
        },
        "morphology": {
            # QRS 폭, QT 간격 등 형태학적 특성 (이 예제에서는 미구현)
            "qrs_width": 0.08,  # 더미 값
            "qt_interval": 0.4   # 더미 값
        }
    }
    
    return heart_rate, rr_intervals, features 