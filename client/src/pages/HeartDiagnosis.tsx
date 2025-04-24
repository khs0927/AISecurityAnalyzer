import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { 
  Heart, 
  Activity, 
  FileText, 
  ChevronRight, 
  ArrowRight,
  Info,
  Zap,
  HeartPulse,
  AlertCircle,
  Bed,
  FileBarChart,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ECG 데이터 포인트 (간단한 예시)
const ECG_SAMPLE_DATA = [
  0, 0.1, 0.2, 0.1, 0, 0, -0.1, 1.5, -0.5, 0.2, 0.3, 0.2, 0, 0, 0, 
  0, 0.1, 0.2, 0.1, 0, 0, -0.1, 1.5, -0.5, 0.2, 0.3, 0.2, 0, 0, 0
];

const HeartDiagnosis = () => {
  const [, navigate] = useLocation();
  const ecgCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // 모니터링 데이터
  const monitoringData = {
    heartRate: 78,
    oxygenLevel: 98,
    bloodPressure: '125/82',
    stSegment: '0mm',
    qtInterval: '정상 (350-430ms)'
  };

  // 위험 요소 데이터
  const riskFactors = [
    { name: '흡연', status: 'low', value: '비흡연' },
    { name: '고혈압', status: 'medium', value: '130/85' },
    { name: '당뇨', status: 'low', value: '정상' },
    { name: '고지혈증', status: 'high', value: 'LDL 150' },
    { name: '심장질환 가족력', status: 'medium', value: '있음' }
  ];

  // ECG 시뮬레이션
  useEffect(() => {
    if (!ecgCanvasRef.current) return;
    
    const canvas = ecgCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 캔버스 크기 설정
    const setCanvasSize = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;
      }
    };
    
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);
    
    let offset = 0;
    
    // ECG 그리기 함수
    const drawECG = () => {
      if (!ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 배경 그리드 그리기
      ctx.beginPath();
      ctx.strokeStyle = '#FFD6D6';
      ctx.lineWidth = 0.5;
      
      // 수직 그리드 라인
      for (let x = 0; x < canvas.width; x += 20) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
      }
      
      // 수평 그리드 라인
      for (let y = 0; y < canvas.height; y += 20) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
      }
      
      ctx.stroke();
      
      // ECG 라인 그리기
      ctx.beginPath();
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      
      const centerY = canvas.height / 2;
      const amplitude = canvas.height / 3; // 파형 높이 조정
      const pointSpacing = canvas.width / (ECG_SAMPLE_DATA.length - 1);
      
      // 시작점 이동
      ctx.moveTo(0, centerY - ECG_SAMPLE_DATA[0] * amplitude);
      
      // ECG 포인트 그리기
      for (let i = 0; i < ECG_SAMPLE_DATA.length; i++) {
        const x = (i * pointSpacing + offset) % canvas.width;
        const y = centerY - ECG_SAMPLE_DATA[i] * amplitude;
        ctx.lineTo(x, y);
      }
      
      ctx.stroke();
      
      // 오프셋 업데이트하여 애니메이션 효과 생성
      offset += 1;
      if (offset > pointSpacing * ECG_SAMPLE_DATA.length) {
        offset = 0;
      }
      
      // 애니메이션 계속 실행
      const animation = requestAnimationFrame(drawECG);
      return () => cancelAnimationFrame(animation);
    };
    
    // 처음 그리기 시작
    const animation = requestAnimationFrame(drawECG);
    
    // 클린업 함수
    return () => {
      window.removeEventListener('resize', setCanvasSize);
      cancelAnimationFrame(animation);
    };
  }, []);

  // 위험도 점수 계산
  const calculateRiskScore = () => {
    const highCount = riskFactors.filter(factor => factor.status === 'high').length;
    const mediumCount = riskFactors.filter(factor => factor.status === 'medium').length;
    
    return 100 - (highCount * 20 + mediumCount * 10);
  };

  const riskScore = calculateRiskScore();

  // 카드 배경 스타일
  const cardStyle = {
    boxShadow: '0 4px 8px rgba(255, 0, 0, 0.08), 0 1px 2px rgba(255, 0, 0, 0.1)',
    borderColor: '#FFD6D6',
    borderRadius: '0.5rem'
  };

  return (
    <div className="p-3">
      {/* 메인 그리드 - 2x2 */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* 1. 심장건강점수 (좌상) */}
        <Card className="border border-[#FFD6D6] bg-gradient-to-br from-[#FF0000] to-[#FF5757]" style={cardStyle}>
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-white text-sm flex items-center">
              <Heart className="w-3 h-3 mr-1.5" />
              심장건강점수
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="flex justify-between items-center mb-2">
              <div>
                <p className="text-white/80 text-xs">총 평가 점수</p>
                <p className="text-white text-2xl font-bold">{riskScore}/100</p>
              </div>
              <Badge className="bg-white/20 text-white hover:bg-white/30 whitespace-nowrap text-xs">
                {riskScore >= 80 ? '매우 좋음' : riskScore >= 60 ? '좋음' : riskScore >= 40 ? '보통' : '낮음'}
              </Badge>
            </div>
            
            <div className="mt-1 mb-2">
              <div className="flex justify-between text-white/90 text-[10px] mb-1">
                <span>낮음</span>
                <span>보통</span>
                <span>좋음</span>
                <span>매우 좋음</span>
              </div>
              <div className="h-1.5 bg-white/30 rounded-full overflow-hidden">
                <div className="h-full bg-white" style={{width: `${riskScore}%`}}></div>
              </div>
            </div>
            
            <div className="text-[10px] text-white/80 mt-2">
              <span>
                지난 측정 대비 <span className="text-white">3% 향상</span>
              </span>
            </div>
            
            <button 
              className="w-full mt-2 py-1 bg-white/20 rounded text-white text-xs flex items-center justify-center hover:bg-white/30 transition-colors"
              onClick={() => navigate('/health-score-details')}
            >
              상세보기 <ChevronRight className="w-3 h-3 ml-1" />
            </button>
          </CardContent>
        </Card>
        
        {/* 2. 모니터링 분석 (우상) */}
        <Card className="border border-[#FFD6D6]" style={cardStyle}>
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-[#FF0000] text-sm flex items-center">
              <HeartPulse className="w-3 h-3 mr-1.5" />
              모니터링 분석
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="bg-[#FFFAFA] rounded border border-[#FFD6D6] h-[60px] mb-2 overflow-hidden">
              <canvas ref={ecgCanvasRef} className="w-full h-full" />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#FFF5F5] p-1.5 rounded text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Heart className="w-3 h-3 text-[#FF0000]" />
                  <p className="text-[10px] text-gray-700">심박수</p>
                </div>
                <p className="text-[#FF0000] text-base font-bold">{monitoringData.heartRate}<span className="text-[10px] ml-0.5">BPM</span></p>
              </div>
              
              <div className="bg-[#FFF5F5] p-1.5 rounded text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Activity className="w-3 h-3 text-[#FF0000]" />
                  <p className="text-[10px] text-gray-700">산소포화도</p>
                </div>
                <p className="text-[#FF0000] text-base font-bold">{monitoringData.oxygenLevel}<span className="text-[10px] ml-0.5">%</span></p>
              </div>
            </div>
            
            <div className="flex items-center mt-1.5">
              <Badge className="bg-green-100 text-green-600 text-[10px]">정상</Badge>
            </div>
            
            <button 
              className="w-full mt-2 text-xs py-1 border border-[#FFD6D6] bg-white text-[#FF0000] rounded flex items-center justify-center hover:bg-[#FFF5F5] transition-colors"
              onClick={() => navigate('/vital-signs-monitoring')}
            >
              자세히 <ChevronRight className="w-3 h-3 ml-0.5" />
            </button>
          </CardContent>
        </Card>
        
        {/* 3. 위험도 분석 (좌하) */}
        <Card className="border border-[#FFD6D6]" style={cardStyle}>
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-[#FF0000] text-sm flex items-center">
              <AlertCircle className="w-3 h-3 mr-1.5" />
              위험도 분석
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            {/* ECG 패턴 확률 그래프 */}
            <div className="mb-2">
              <div className="flex justify-between text-[10px] mb-0.5">
                <span className="text-gray-500">정상 동리듬</span>
                <span className="font-medium">95%</span>
              </div>
              <div className="h-1.5 bg-[#FFE2E9] rounded-full overflow-hidden">
                <div className="h-full bg-[#FF0000]" style={{width: '95%'}}></div>
              </div>
            </div>
            
            {/* 주요 위험 요소 */}
            <div>
              <p className="text-[10px] text-gray-500 mb-1">주요 위험 요소</p>
              <div className="space-y-1">
                {riskFactors.filter(f => f.status === 'high' || f.status === 'medium').map((factor, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-[10px]">{factor.name}</span>
                    <Badge 
                      className={
                        factor.status === 'low' 
                          ? 'bg-green-100 text-green-700 text-[10px]' 
                          : factor.status === 'medium' 
                            ? 'bg-yellow-100 text-yellow-700 text-[10px]' 
                            : 'bg-red-100 text-red-700 text-[10px]'
                      }
                    >
                      {factor.value}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
            
            <button 
              className="w-full mt-2 text-xs py-1 border border-[#FFD6D6] bg-white text-[#FF0000] rounded flex items-center justify-center hover:bg-[#FFF5F5] transition-colors"
              onClick={() => navigate('/risk-analysis')}
            >
              자세히 <ChevronRight className="w-3 h-3 ml-0.5" />
            </button>
          </CardContent>
        </Card>
        
        {/* 4. 건강기록 분석 (우하) */}
        <Card className="border border-[#FFD6D6]" style={cardStyle}>
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-[#FF0000] text-sm flex items-center">
              <FileBarChart className="w-3 h-3 mr-1.5" />
              건강기록 분석
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            {/* 주간 심박수 차트 */}
            <div className="p-1 mb-2">
              <div className="flex items-end h-16 justify-between">
                {['월', '화', '수', '목', '금', '토', '일'].map((day, i) => {
                  // 고정된 값을 사용하여 의사 난수 생성 (실제로는 데이터 기반이어야 함)
                  const values = [70, 68, 75, 83, 72, 65, 69];
                  const height = (values[i] - 60) * 1.3; // 60bpm을 기준으로 스케일링
                  
                  return (
                    <div key={i} className="flex flex-col items-center">
                      <div 
                        className="w-4 bg-[#FF0000] rounded-t"
                        style={{
                          height: `${height}px`,
                          opacity: i === 3 ? 1 : 0.7 // 목요일 강조
                        }}
                      ></div>
                      <span className="text-[8px] mt-0.5 text-gray-500">{day}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
                <span>평균: 76 BPM</span>
                <span>전주 대비: -2%</span>
              </div>
            </div>
            
            {/* 생활습관 요약 */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col items-center bg-[#FFF5F5] p-1.5 rounded">
                <Bed className="w-3 h-3 text-[#FF0000] mb-0.5" />
                <p className="text-[10px] text-gray-700">평균 수면</p>
                <p className="text-xs font-medium">7시간</p>
              </div>
              <div className="flex flex-col items-center bg-[#FFF5F5] p-1.5 rounded">
                <Zap className="w-3 h-3 text-[#FF0000] mb-0.5" />
                <p className="text-[10px] text-gray-700">활동량</p>
                <p className="text-xs font-medium">보통</p>
              </div>
            </div>
            
            <button 
              className="w-full mt-2 text-xs py-1 border border-[#FFD6D6] bg-white text-[#FF0000] rounded flex items-center justify-center hover:bg-[#FFF5F5] transition-colors"
              onClick={() => navigate('/health-records')}
            >
              자세히 <ChevronRight className="w-3 h-3 ml-0.5" />
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HeartDiagnosis;