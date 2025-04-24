// healthDataProcessor.js
// 건강 데이터 처리 및 분석을 위한 유틸리티

/**
 * 건강 데이터 처리 유틸리티
 */
export default {
  /**
   * 심박수 분석
   * @param {number} heartRate 심박수
   * @returns {Object} 분석 결과
   */
  analyzeHeartRate(heartRate) {
    if (!heartRate) return { status: 'unknown', message: '데이터 없음' };
    
    if (heartRate < 60) {
      return {
        status: 'warning',
        message: '서맥',
        details: '심박수가 분당 60회 미만입니다. 운동선수에게는 정상일 수 있으나, 어지러움이나 피로감이 있다면 의사와 상담하세요.'
      };
    } else if (heartRate > 100) {
      return {
        status: 'warning',
        message: '빈맥',
        details: '심박수가 분당 100회 이상입니다. 운동, 스트레스, 카페인 등의 영향일 수 있으나, 지속되면 의사와 상담하세요.'
      };
    } else {
      return {
        status: 'normal',
        message: '정상',
        details: '심박수가 정상 범위(60-100 BPM) 내에 있습니다.'
      };
    }
  },

  /**
   * 산소포화도 분석
   * @param {number} oxygenLevel 산소포화도
   * @returns {Object} 분석 결과
   */
  analyzeOxygenLevel(oxygenLevel) {
    if (!oxygenLevel) return { status: 'unknown', message: '데이터 없음' };
    
    if (oxygenLevel < 90) {
      return {
        status: 'danger',
        message: '심각한 저산소증',
        details: '산소포화도가 90% 미만입니다. 즉시 의료 도움을 받으세요.'
      };
    } else if (oxygenLevel < 95) {
      return {
        status: 'warning',
        message: '경미한 저산소증',
        details: '산소포화도가 95% 미만입니다. 의사와 상담하세요.'
      };
    } else {
      return {
        status: 'normal',
        message: '정상',
        details: '산소포화도가 정상 범위(95% 이상) 내에 있습니다.'
      };
    }
  },
  
  /**
   * 혈압 분석
   * @param {number} systolic 수축기 혈압
   * @param {number} diastolic 이완기 혈압
   * @returns {Object} 분석 결과
   */
  analyzeBloodPressure(systolic, diastolic) {
    if (!systolic || !diastolic) return { status: 'unknown', message: '데이터 없음' };
    
    if (systolic >= 180 || diastolic >= 120) {
      return {
        status: 'danger',
        message: '고혈압 위기',
        details: '혈압이 매우 높습니다. 즉시 의료 도움을 받으세요.'
      };
    } else if (systolic >= 140 || diastolic >= 90) {
      return {
        status: 'warning',
        message: '고혈압',
        details: '고혈압 상태입니다. 의사와 상담하세요.'
      };
    } else if (systolic >= 120 || diastolic >= 80) {
      return {
        status: 'caution',
        message: '주의 단계',
        details: '혈압이 약간 높습니다. 생활 습관 개선을 고려하세요.'
      };
    } else if (systolic >= 90 && diastolic >= 60) {
      return {
        status: 'normal',
        message: '정상',
        details: '혈압이 정상 범위 내에 있습니다.'
      };
    } else {
      return {
        status: 'warning',
        message: '저혈압',
        details: '혈압이 낮습니다. 어지러움이나 기절 증상이 있다면 의사와 상담하세요.'
      };
    }
  },
  
  /**
   * ECG 데이터 이상 검출
   * @param {Array} ecgData ECG 데이터 배열
   * @returns {Object} 분석 결과
   */
  detectEcgAnomalies(ecgData) {
    if (!ecgData || !ecgData.length) return { status: 'unknown', message: '데이터 없음' };
    
    // 간단한 이상 탐지 (실제로는 더 복잡한 알고리즘 필요)
    // 이 구현은 단순 시연용이며, 실제 의료 진단에 사용해서는 안 됨
    let anomalies = 0;
    let peaks = 0;
    let lastValue = ecgData[0];
    let rising = false;
    
    for (let i = 1; i < ecgData.length; i++) {
      if (!rising && ecgData[i] > lastValue) {
        rising = true;
      } else if (rising && ecgData[i] < lastValue) {
        peaks++;
        rising = false;
      }
      
      // 급격한 변화 탐지
      if (Math.abs(ecgData[i] - lastValue) > 0.5) {
        anomalies++;
      }
      
      lastValue = ecgData[i];
    }
    
    const anomalyRate = anomalies / ecgData.length;
    
    if (anomalyRate > 0.1) {
      return {
        status: 'danger',
        message: '심각한 ECG 이상',
        details: '심전도에서 심각한 이상이 감지되었습니다. 즉시 의료 도움을 받으세요.',
        anomalies
      };
    } else if (anomalyRate > 0.05) {
      return {
        status: 'warning',
        message: 'ECG 이상',
        details: '심전도에서 이상이 감지되었습니다. 의사와 상담하세요.',
        anomalies
      };
    } else {
      return {
        status: 'normal',
        message: '정상',
        details: '심전도가 정상적으로 보입니다.',
        anomalies
      };
    }
  },
  
  /**
   * 모든 건강 데이터 종합 분석
   * @param {Object} healthData 건강 데이터 객체
   * @returns {Object} 종합 분석 결과
   */
  analyzeAllData(healthData) {
    const {
      heartRate,
      oxygenLevel,
      systolic,
      diastolic,
      ecgData
    } = healthData;
    
    const heartAnalysis = this.analyzeHeartRate(heartRate);
    const oxygenAnalysis = this.analyzeOxygenLevel(oxygenLevel);
    const bpAnalysis = this.analyzeBloodPressure(systolic, diastolic);
    const ecgAnalysis = this.detectEcgAnomalies(ecgData);
    
    // 위험도 점수 계산 (0-100)
    let riskScore = 0;
    
    if (heartAnalysis.status === 'warning') riskScore += 20;
    if (heartAnalysis.status === 'danger') riskScore += 40;
    
    if (oxygenAnalysis.status === 'warning') riskScore += 30;
    if (oxygenAnalysis.status === 'danger') riskScore += 60;
    
    if (bpAnalysis.status === 'warning') riskScore += 20;
    if (bpAnalysis.status === 'danger') riskScore += 40;
    
    if (ecgAnalysis.status === 'warning') riskScore += 30;
    if (ecgAnalysis.status === 'danger') riskScore += 60;
    
    // 최대 100으로 제한
    riskScore = Math.min(riskScore, 100);
    
    // 위험 수준 결정
    let riskLevel;
    if (riskScore >= 60) {
      riskLevel = '높음';
    } else if (riskScore >= 30) {
      riskLevel = '중간';
    } else {
      riskLevel = '낮음';
    }
    
    return {
      heartRate: heartAnalysis,
      oxygenLevel: oxygenAnalysis,
      bloodPressure: bpAnalysis,
      ecg: ecgAnalysis,
      overallRisk: {
        score: riskScore,
        level: riskLevel
      },
      timestamp: new Date().toISOString()
    };
  }
}; 