/**
 * Risk calculator module to determine cardiac risk levels
 * based on user health data and ECG patterns
 */

// Risk factors to consider
export enum RiskFactor {
  AGE = 'age',
  GENDER = 'gender',
  SMOKING = 'smoking',
  DIABETES = 'diabetes',
  HYPERTENSION = 'hypertension',
  HIGH_CHOLESTEROL = 'highCholesterol',
  FAMILY_HISTORY = 'familyHistory',
  PREVIOUS_CARDIAC_EVENT = 'previousCardiacEvent',
  OBESITY = 'obesity',
  SEDENTARY_LIFESTYLE = 'sedentaryLifestyle',
  STRESS = 'stress',
  SLEEP_DISORDER = 'sleepDisorder'
}

// Risk level categories
export enum RiskLevel {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// ECG feature types that can indicate risks
export enum ECGFeature {
  NORMAL = 'normal',
  TACHYCARDIA = 'tachycardia', // fast heart rate
  BRADYCARDIA = 'bradycardia', // slow heart rate
  ST_ELEVATION = 'stElevation', // indicates myocardial injury
  ST_DEPRESSION = 'stDepression',
  T_WAVE_INVERSION = 'tWaveInversion',
  QT_PROLONGATION = 'qtProlongation',
  HEART_BLOCK = 'heartBlock',
  AFIB = 'atrialFibrillation',
  PREMATURE_COMPLEXES = 'prematureComplexes'
}

// ECG Feature weights (out of 10)
const ECG_FEATURE_WEIGHTS = {
  [ECGFeature.NORMAL]: 0,
  [ECGFeature.TACHYCARDIA]: 3,
  [ECGFeature.BRADYCARDIA]: 2,
  [ECGFeature.ST_ELEVATION]: 9, // High risk - indicates possible MI
  [ECGFeature.ST_DEPRESSION]: 7,
  [ECGFeature.T_WAVE_INVERSION]: 6,
  [ECGFeature.QT_PROLONGATION]: 4,
  [ECGFeature.HEART_BLOCK]: 5,
  [ECGFeature.AFIB]: 6,
  [ECGFeature.PREMATURE_COMPLEXES]: 3
};

// Risk factor weights (out of 10)
const RISK_FACTOR_WEIGHTS = {
  [RiskFactor.AGE]: 5, // Higher weights for age
  [RiskFactor.GENDER]: 1,
  [RiskFactor.SMOKING]: 7,
  [RiskFactor.DIABETES]: 6,
  [RiskFactor.HYPERTENSION]: 7,
  [RiskFactor.HIGH_CHOLESTEROL]: 6,
  [RiskFactor.FAMILY_HISTORY]: 4,
  [RiskFactor.PREVIOUS_CARDIAC_EVENT]: 9, // One of the highest weights
  [RiskFactor.OBESITY]: 5,
  [RiskFactor.SEDENTARY_LIFESTYLE]: 4,
  [RiskFactor.STRESS]: 3,
  [RiskFactor.SLEEP_DISORDER]: 2
};

// Vital sign weights (out of 10)
const VITAL_SIGN_WEIGHTS = {
  heartRate: 7,
  bloodPressure: 8,
  oxygenSaturation: 6,
  temperature: 4
};

// Vital sign thresholds
const VITAL_SIGN_THRESHOLDS = {
  heartRate: {
    min: 60,
    max: 100,
    critical_low: 40,
    critical_high: 130
  },
  bloodPressureSystolic: {
    min: 90,
    max: 120,
    critical_low: 80,
    critical_high: 180
  },
  bloodPressureDiastolic: {
    min: 60,
    max: 80,
    critical_low: 50,
    critical_high: 120
  },
  oxygenSaturation: {
    min: 95,
    critical_low: 90
  },
  temperature: {
    min: 36,
    max: 37.5,
    critical_low: 35,
    critical_high: 39
  }
};

// Age risk calculation
function calculateAgeRisk(age: number): number {
  if (age < 40) return 1;
  if (age < 50) return 3;
  if (age < 60) return 5;
  if (age < 70) return 7;
  return 9; // 70+
}

// Vital sign risk calculation
function calculateVitalSignRisk(
  heartRate: number,
  bloodPressureSystolic: number,
  bloodPressureDiastolic: number,
  oxygenSaturation: number,
  temperature: number
): number {
  let riskScore = 0;
  let maxPossibleScore = 0;
  
  // Heart rate risk
  if (heartRate !== undefined) {
    maxPossibleScore += VITAL_SIGN_WEIGHTS.heartRate;
    
    if (heartRate <= VITAL_SIGN_THRESHOLDS.heartRate.critical_low || 
        heartRate >= VITAL_SIGN_THRESHOLDS.heartRate.critical_high) {
      riskScore += VITAL_SIGN_WEIGHTS.heartRate;
    } else if (heartRate < VITAL_SIGN_THRESHOLDS.heartRate.min) {
      const severity = (VITAL_SIGN_THRESHOLDS.heartRate.min - heartRate) / 
                      (VITAL_SIGN_THRESHOLDS.heartRate.min - VITAL_SIGN_THRESHOLDS.heartRate.critical_low);
      riskScore += VITAL_SIGN_WEIGHTS.heartRate * Math.min(1, severity);
    } else if (heartRate > VITAL_SIGN_THRESHOLDS.heartRate.max) {
      const severity = (heartRate - VITAL_SIGN_THRESHOLDS.heartRate.max) / 
                      (VITAL_SIGN_THRESHOLDS.heartRate.critical_high - VITAL_SIGN_THRESHOLDS.heartRate.max);
      riskScore += VITAL_SIGN_WEIGHTS.heartRate * Math.min(1, severity);
    }
  }
  
  // Blood pressure risk
  if (bloodPressureSystolic !== undefined && bloodPressureDiastolic !== undefined) {
    maxPossibleScore += VITAL_SIGN_WEIGHTS.bloodPressure;
    
    let bpRisk = 0;
    
    // Systolic risk
    if (bloodPressureSystolic <= VITAL_SIGN_THRESHOLDS.bloodPressureSystolic.critical_low || 
        bloodPressureSystolic >= VITAL_SIGN_THRESHOLDS.bloodPressureSystolic.critical_high) {
      bpRisk += 1;
    } else if (bloodPressureSystolic < VITAL_SIGN_THRESHOLDS.bloodPressureSystolic.min) {
      const severity = (VITAL_SIGN_THRESHOLDS.bloodPressureSystolic.min - bloodPressureSystolic) / 
                      (VITAL_SIGN_THRESHOLDS.bloodPressureSystolic.min - VITAL_SIGN_THRESHOLDS.bloodPressureSystolic.critical_low);
      bpRisk += Math.min(1, severity) * 0.5;
    } else if (bloodPressureSystolic > VITAL_SIGN_THRESHOLDS.bloodPressureSystolic.max) {
      const severity = (bloodPressureSystolic - VITAL_SIGN_THRESHOLDS.bloodPressureSystolic.max) / 
                      (VITAL_SIGN_THRESHOLDS.bloodPressureSystolic.critical_high - VITAL_SIGN_THRESHOLDS.bloodPressureSystolic.max);
      bpRisk += Math.min(1, severity) * 0.5;
    }
    
    // Diastolic risk
    if (bloodPressureDiastolic <= VITAL_SIGN_THRESHOLDS.bloodPressureDiastolic.critical_low || 
        bloodPressureDiastolic >= VITAL_SIGN_THRESHOLDS.bloodPressureDiastolic.critical_high) {
      bpRisk += 1;
    } else if (bloodPressureDiastolic < VITAL_SIGN_THRESHOLDS.bloodPressureDiastolic.min) {
      const severity = (VITAL_SIGN_THRESHOLDS.bloodPressureDiastolic.min - bloodPressureDiastolic) / 
                      (VITAL_SIGN_THRESHOLDS.bloodPressureDiastolic.min - VITAL_SIGN_THRESHOLDS.bloodPressureDiastolic.critical_low);
      bpRisk += Math.min(1, severity) * 0.5;
    } else if (bloodPressureDiastolic > VITAL_SIGN_THRESHOLDS.bloodPressureDiastolic.max) {
      const severity = (bloodPressureDiastolic - VITAL_SIGN_THRESHOLDS.bloodPressureDiastolic.max) / 
                      (VITAL_SIGN_THRESHOLDS.bloodPressureDiastolic.critical_high - VITAL_SIGN_THRESHOLDS.bloodPressureDiastolic.max);
      bpRisk += Math.min(1, severity) * 0.5;
    }
    
    riskScore += VITAL_SIGN_WEIGHTS.bloodPressure * bpRisk;
  }
  
  // Oxygen saturation risk
  if (oxygenSaturation !== undefined) {
    maxPossibleScore += VITAL_SIGN_WEIGHTS.oxygenSaturation;
    
    if (oxygenSaturation <= VITAL_SIGN_THRESHOLDS.oxygenSaturation.critical_low) {
      riskScore += VITAL_SIGN_WEIGHTS.oxygenSaturation;
    } else if (oxygenSaturation < VITAL_SIGN_THRESHOLDS.oxygenSaturation.min) {
      const severity = (VITAL_SIGN_THRESHOLDS.oxygenSaturation.min - oxygenSaturation) / 
                       (VITAL_SIGN_THRESHOLDS.oxygenSaturation.min - VITAL_SIGN_THRESHOLDS.oxygenSaturation.critical_low);
      riskScore += VITAL_SIGN_WEIGHTS.oxygenSaturation * Math.min(1, severity);
    }
  }
  
  // Temperature risk
  if (temperature !== undefined) {
    maxPossibleScore += VITAL_SIGN_WEIGHTS.temperature;
    
    if (temperature <= VITAL_SIGN_THRESHOLDS.temperature.critical_low || 
        temperature >= VITAL_SIGN_THRESHOLDS.temperature.critical_high) {
      riskScore += VITAL_SIGN_WEIGHTS.temperature;
    } else if (temperature < VITAL_SIGN_THRESHOLDS.temperature.min) {
      const severity = (VITAL_SIGN_THRESHOLDS.temperature.min - temperature) / 
                      (VITAL_SIGN_THRESHOLDS.temperature.min - VITAL_SIGN_THRESHOLDS.temperature.critical_low);
      riskScore += VITAL_SIGN_WEIGHTS.temperature * Math.min(1, severity);
    } else if (temperature > VITAL_SIGN_THRESHOLDS.temperature.max) {
      const severity = (temperature - VITAL_SIGN_THRESHOLDS.temperature.max) / 
                      (VITAL_SIGN_THRESHOLDS.temperature.critical_high - VITAL_SIGN_THRESHOLDS.temperature.max);
      riskScore += VITAL_SIGN_WEIGHTS.temperature * Math.min(1, severity);
    }
  }
  
  // Normalize to 0-10 scale
  return maxPossibleScore > 0 ? (riskScore / maxPossibleScore) * 10 : 0;
}

// Calculate risk based on ECG features
function calculateECGRisk(features: ECGFeature[]): number {
  if (features.length === 0 || (features.length === 1 && features[0] === ECGFeature.NORMAL)) {
    return 0;
  }
  
  let totalWeight = 0;
  let maxPossibleWeight = 0;
  
  // Sum the weights of all present features
  features.forEach(feature => {
    if (feature !== ECGFeature.NORMAL) {
      totalWeight += ECG_FEATURE_WEIGHTS[feature];
      maxPossibleWeight += 10; // Maximum possible weight is 10 for each feature
    }
  });
  
  // Normalize to 0-10 scale
  return maxPossibleWeight > 0 ? (totalWeight / maxPossibleWeight) * 10 : 0;
}

// Calculate risk based on risk factors
function calculateRiskFactorScore(factors: RiskFactor[]): number {
  if (factors.length === 0) {
    return 0;
  }
  
  let totalWeight = 0;
  let maxPossibleWeight = 0;
  
  // Sum the weights of all present factors
  factors.forEach(factor => {
    totalWeight += RISK_FACTOR_WEIGHTS[factor];
    maxPossibleWeight += 10; // Maximum possible weight is 10 for each factor
  });
  
  // Normalize to 0-10 scale
  return (totalWeight / maxPossibleWeight) * 10;
}

// Interface for risk calculation input
export interface RiskCalculationInput {
  age?: number;
  gender?: 'male' | 'female';
  riskFactors?: RiskFactor[];
  ecgFeatures?: ECGFeature[];
  heartRate?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  oxygenSaturation?: number;
  temperature?: number;
}

// Calculate the overall risk score
export function calculateRiskScore(input: RiskCalculationInput): number {
  const {
    age,
    riskFactors = [],
    ecgFeatures = [ECGFeature.NORMAL],
    heartRate,
    bloodPressureSystolic,
    bloodPressureDiastolic,
    oxygenSaturation,
    temperature
  } = input;
  
  let riskScores = [];
  let weights = [];
  
  // Age risk (if provided)
  if (age !== undefined) {
    riskScores.push(calculateAgeRisk(age));
    weights.push(0.15); // 15% weight
  }
  
  // Risk factors risk
  if (riskFactors.length > 0) {
    riskScores.push(calculateRiskFactorScore(riskFactors));
    weights.push(0.25); // 25% weight
  }
  
  // ECG features risk
  if (ecgFeatures.length > 0) {
    riskScores.push(calculateECGRisk(ecgFeatures));
    weights.push(0.35); // 35% weight
  }
  
  // Vital signs risk
  if (heartRate !== undefined || bloodPressureSystolic !== undefined || 
      oxygenSaturation !== undefined || temperature !== undefined) {
    riskScores.push(calculateVitalSignRisk(
      heartRate || 72, // Default normal values if not provided
      bloodPressureSystolic || 120,
      bloodPressureDiastolic || 80,
      oxygenSaturation || 98,
      temperature || 36.8
    ));
    weights.push(0.25); // 25% weight
  }
  
  // If no risk scores are calculated, return 0
  if (riskScores.length === 0) {
    return 0;
  }
  
  // Calculate weighted average
  let totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let weightedSum = riskScores.reduce((sum, score, index) => sum + score * weights[index], 0);
  
  // Normalize to 0-100 scale
  const finalScore = (weightedSum / totalWeight) * 10;
  return Math.min(100, Math.max(0, Math.round(finalScore)));
}

// Get risk level category based on risk score
export function getRiskLevel(riskScore: number): RiskLevel {
  if (riskScore < 25) return RiskLevel.LOW;
  if (riskScore < 50) return RiskLevel.MODERATE;
  if (riskScore < 75) return RiskLevel.HIGH;
  return RiskLevel.CRITICAL;
}

// Get risk factors from health conditions
export function getRiskFactorsFromConditions(conditions: string[]): RiskFactor[] {
  const factorMap: { [key: string]: RiskFactor } = {
    '고혈압': RiskFactor.HYPERTENSION,
    '당뇨': RiskFactor.DIABETES,
    '고지혈증': RiskFactor.HIGH_CHOLESTEROL,
    '비만': RiskFactor.OBESITY,
    '심장질환': RiskFactor.PREVIOUS_CARDIAC_EVENT,
    '가족력': RiskFactor.FAMILY_HISTORY,
    '스트레스': RiskFactor.STRESS,
    '수면장애': RiskFactor.SLEEP_DISORDER,
    '흡연': RiskFactor.SMOKING
  };
  
  return conditions
    .map(condition => factorMap[condition])
    .filter(factor => factor !== undefined);
}

// Get risk status description
export function getRiskStatusDescription(riskScore: number): string {
  const riskLevel = getRiskLevel(riskScore);
  
  switch (riskLevel) {
    case RiskLevel.LOW:
      return '낮은 위험';
    case RiskLevel.MODERATE:
      return '주의 필요';
    case RiskLevel.HIGH:
      return '높은 위험';
    case RiskLevel.CRITICAL:
      return '심각한 위험';
  }
}

// Get recommendation based on risk level
export function getRiskRecommendation(riskScore: number): string {
  const riskLevel = getRiskLevel(riskScore);
  
  switch (riskLevel) {
    case RiskLevel.LOW:
      return '현재 특별한 조치가 필요하지 않습니다.';
    case RiskLevel.MODERATE:
      return '정기적인 모니터링과 건강 체크를 유지하세요.';
    case RiskLevel.HIGH:
      return '의사와 상담하고 심장 건강에 대한 평가가 필요합니다.';
    case RiskLevel.CRITICAL:
      return '즉시 의료 조치가 필요합니다. 응급 서비스에 연락하세요.';
  }
}
