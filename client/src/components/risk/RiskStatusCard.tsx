import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { getRiskStatusDescription, getRiskRecommendation, RiskLevel, getRiskLevel } from '@/lib/riskCalculator';

const RiskStatusCard = () => {
  const { healthData } = useApp();
  const [riskPercentage, setRiskPercentage] = useState(0);
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  
  // Stroke dash values for the circle
  const circumference = 2 * Math.PI * 54; // 2πr where r = 54
  const [strokeDashoffset, setStrokeDashoffset] = useState(circumference);
  
  useEffect(() => {
    if (healthData) {
      setRiskPercentage(healthData.riskLevel || 0);
    }
  }, [healthData]);
  
  // Animate risk gauge
  useEffect(() => {
    // Animate from current value to target value
    let start = animatedPercentage;
    const end = riskPercentage;
    const duration = 1000; // ms
    const startTime = performance.now();
    
    const animateGauge = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = start + (end - start) * progress;
      
      setAnimatedPercentage(current);
      setStrokeDashoffset(circumference - (circumference * current) / 100);
      
      if (progress < 1) {
        requestAnimationFrame(animateGauge);
      }
    };
    
    requestAnimationFrame(animateGauge);
  }, [riskPercentage, circumference]);
  
  const getRiskStatusColor = () => {
    const level = getRiskLevel(riskPercentage);
    switch (level) {
      case RiskLevel.LOW:
        return 'text-[#FF6D70]';
      case RiskLevel.MODERATE:
        return 'text-[#FF6D70]';
      case RiskLevel.HIGH:
        return 'text-[#FF6D70]';
      case RiskLevel.CRITICAL:
        return 'text-[#FF6D70]';
    }
  };
  
  const getRiskFactorBadges = () => {
    const badges = [];
    const level = getRiskLevel(riskPercentage);
    
    if (level === RiskLevel.LOW) {
      badges.push(
        <span key="heart-rate" className="px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-[#FF6D70]">
          정상 심박수
        </span>
      );
      badges.push(
        <span key="ecg" className="px-2 py-1 rounded-full text-xs font-medium bg-pink-50 text-[#FF6D70]">
          정상 ECG
        </span>
      );
    } else if (level === RiskLevel.MODERATE) {
      badges.push(
        <span key="high-bp" className="px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-[#FF6D70]">
          높은 혈압
        </span>
      );
    } else if (level === RiskLevel.HIGH || level === RiskLevel.CRITICAL) {
      badges.push(
        <span key="abnormal-ecg" className="px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-[#FF6D70]">
          ECG 이상
        </span>
      );
      badges.push(
        <span key="high-hr" className="px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-[#FF6D70]">
          비정상 심박수
        </span>
      );
    }
    
    return badges;
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm p-5 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-bold text-[#0e151b]">심근경색 위험도</h2>
        <a href="#" className="text-xs text-[#FF6D70] font-medium">자세히 보기</a>
      </div>
      
      <div className="flex items-center">
        {/* Risk gauge */}
        <div className="relative w-24 h-24">
          <svg viewBox="0 0 120 120" className="w-full h-full">
            {/* Background circle */}
            <circle cx="60" cy="60" r="54" fill="none" stroke="#f8e3ea" strokeWidth="12" />
            
            {/* Risk indicator arc */}
            <circle 
              cx="60" 
              cy="60" 
              r="54" 
              fill="none" 
              stroke="#FF6D70" 
              strokeWidth="12" 
              strokeDasharray={circumference} 
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-[#0e151b]">{Math.round(animatedPercentage)}%</span>
            <span className="text-xs text-[#FF6D70]">위험도</span>
          </div>
        </div>
        
        {/* Risk description */}
        <div className="ml-4 flex-1">
          <div className={`text-sm font-medium mb-1 ${getRiskStatusColor()}`}>
            {getRiskStatusDescription(riskPercentage)}
          </div>
          <p className="text-xs text-[#507695] mb-2">
            {getRiskRecommendation(riskPercentage)}
          </p>
          <div className="flex flex-wrap gap-1">
            {getRiskFactorBadges()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskStatusCard;
