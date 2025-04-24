import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Heart, Activity, Zap, AlertTriangle, Eye, Play, Pause, RefreshCw } from 'lucide-react';

// 프로그레스 바 CSS 클래스 정의
import "./styles.css";

interface HealthData {
  timestamp: number;
  heartRate: number;
  oxygenLevel: number;
  riskScore?: number;
}

const BioMonitoring: React.FC = () => {
  const [isMonitoring, setIsMonitoring] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [healthData, setHealthData] = useState<HealthData[]>([]);
  const [currentData, setCurrentData] = useState<HealthData>({
    timestamp: Date.now(),
    heartRate: 72,
    oxygenLevel: 98
  });
  const [riskLevel, setRiskLevel] = useState<number>(0);
  const [riskFactors, setRiskFactors] = useState<string[]>([]);
  const [abnormalDetection, setAbnormalDetection] = useState<boolean>(false);
  
  // 실시간 데이터 시뮬레이션 (실제로는 WebSocket 또는 API로 대체)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isMonitoring) {
      interval = setInterval(() => {
        // 실시간 데이터 생성 (실제로는 웨어러블 기기에서 수신)
        const timestamp = Date.now();
        const heartRate = Math.max(60, Math.min(100, Math.floor(72 + (Math.random() * 20 - 10))));
        const oxygenLevel = Math.max(94, Math.min(100, Math.floor(98 + (Math.random() * 4 - 2))));
        
        // 임의의 위험도 계산 (실제로는 AI 모델에서 계산)
        const baseRisk = (100 - oxygenLevel) * 5 + Math.max(0, Math.abs(heartRate - 70) - 5);
        const riskScore = Math.min(100, Math.max(0, baseRisk));
        
        // 새 데이터 추가
        const newData = { 
          timestamp, 
          heartRate, 
          oxygenLevel,
          riskScore 
        };
        
        setCurrentData(newData);
        setHealthData(prev => {
          const newHealthData = [...prev, newData];
          // 최대 60개 데이터만 유지 (실시간 차트에 표시)
          return newHealthData.slice(-60);
        });
        
        // 위험도 및 비정상 감지 업데이트
        setRiskLevel(riskScore);
        
        const factors = [];
        if (heartRate > 90) factors.push('빠른 심박수');
        if (heartRate < 65) factors.push('느린 심박수');
        if (oxygenLevel < 95) factors.push('낮은 산소포화도');
        setRiskFactors(factors);
        
        // 비정상 감지 (임계값 기반)
        const isAbnormal = riskScore > 40 || oxygenLevel < 95 || heartRate > 95 || heartRate < 60;
        setAbnormalDetection(isAbnormal);
        
        setLastUpdated(new Date());
      }, 2000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isMonitoring]);
  
  // 위험도 색상 계산
  const getRiskColor = (value: number): string => {
    if (value < 20) return 'bg-green-500';
    if (value < 40) return 'bg-green-400';
    if (value < 60) return 'bg-yellow-400';
    if (value < 80) return 'bg-orange-500';
    return 'bg-red-500';
  };
  
  // 차트 데이터 포맷팅
  const chartData = healthData.map(data => ({
    time: new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    심박수: data.heartRate,
    산소포화도: data.oxygenLevel,
    위험도: data.riskScore || 0
  }));
  
  return (
    <div className="space-y-4">
      {/* 상태 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* 심박수 카드 */}
        <Card className="shadow-sm border border-[#FFD6D6]">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-md font-medium flex items-center">
                <Heart className="h-5 w-5 mr-2 text-[#FF6D70]" />
                심박수
              </CardTitle>
              <Badge variant="outline" className={
                currentData.heartRate > 90 ? 'bg-red-100 text-red-800' : 
                currentData.heartRate < 60 ? 'bg-blue-100 text-blue-800' : 
                'bg-green-100 text-green-800'
              }>
                {currentData.heartRate > 90 ? '빠름' : 
                 currentData.heartRate < 60 ? '느림' : '정상'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-center text-[#FF6D70]">
              {currentData.heartRate}
              <span className="text-lg font-normal text-gray-600 ml-1">bpm</span>
            </div>
            <p className="text-xs text-gray-500 text-center mt-1">
              정상 범위: 60-100 bpm
            </p>
          </CardContent>
        </Card>
        
        {/* 산소포화도 카드 */}
        <Card className="shadow-sm border border-[#FFD6D6]">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-md font-medium flex items-center">
                <Activity className="h-5 w-5 mr-2 text-[#FF6D70]" />
                산소포화도
              </CardTitle>
              <Badge variant="outline" className={
                currentData.oxygenLevel < 95 ? 'bg-red-100 text-red-800' : 
                'bg-green-100 text-green-800'
              }>
                {currentData.oxygenLevel < 90 ? '위험' : 
                 currentData.oxygenLevel < 95 ? '주의' : '정상'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-center text-[#FF6D70]">
              {currentData.oxygenLevel}
              <span className="text-lg font-normal text-gray-600 ml-1">%</span>
            </div>
            <p className="text-xs text-gray-500 text-center mt-1">
              정상 범위: 95-100%
            </p>
          </CardContent>
        </Card>
        
        {/* 위험도 카드 */}
        <Card className="shadow-sm border border-[#FFD6D6]">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-md font-medium flex items-center">
                <Zap className="h-5 w-5 mr-2 text-[#FF6D70]" />
                심장 위험도
              </CardTitle>
              {abnormalDetection && (
                <Badge className="bg-red-500 hover:bg-red-600">
                  <AlertTriangle className="h-3 w-3 mr-1" /> 비정상 감지
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span>낮음</span>
                <span>중간</span>
                <span>높음</span>
              </div>
              <Progress 
                value={riskLevel} 
                className={`h-2 ${getRiskColor(riskLevel)}`}
              />
              <div className="text-center">
                <span className="text-xl font-semibold">{Math.round(riskLevel)}%</span>
              </div>
              {riskFactors.length > 0 && (
                <div className="text-xs mt-1">
                  <span className="text-gray-600">위험 요소: </span>
                  {riskFactors.map((factor, i) => (
                    <Badge key={i} variant="outline" className="mr-1 mt-1 bg-red-50 text-red-800 border-red-200">
                      {factor}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* 실시간 차트 */}
      <Card className="shadow-sm border border-[#FFD6D6]">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2 text-[#FF6D70]" />
              실시간 생체 데이터
              <span className="text-xs font-normal text-gray-500 ml-2">
                최근 업데이트: {lastUpdated.toLocaleTimeString()}
              </span>
            </CardTitle>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => setHealthData([])}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                초기화
              </Button>
              <Button 
                variant={isMonitoring ? "destructive" : "default"}
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={() => setIsMonitoring(!isMonitoring)}
              >
                {isMonitoring ? (
                  <>
                    <Pause className="h-3 w-3 mr-1" />
                    일시정지
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 mr-1" />
                    모니터링 시작
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 10 }}
                  tickCount={6}
                />
                <YAxis 
                  yAxisId="left"
                  tick={{ fontSize: 10 }}
                  domain={[40, 120]}
                  label={{ 
                    value: '심박수 (bpm)', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fontSize: '10px', fill: '#FF6D70' },
                    dx: -15
                  }}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right"
                  tick={{ fontSize: 10 }}
                  domain={[85, 100]} 
                  label={{
                    value: '산소포화도 (%)', 
                    angle: 90, 
                    position: 'insideRight',
                    style: { fontSize: '10px', fill: '#36A2EB' },
                    dx: 15
                  }}
                />
                <YAxis 
                  yAxisId="risk" 
                  orientation="right"
                  tick={{ fontSize: 10 }}
                  domain={[0, 100]} 
                  hide={true}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid #FFD6D6',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="심박수" 
                  stroke="#FF6D70" 
                  strokeWidth={2}
                  dot={false}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="산소포화도" 
                  stroke="#36A2EB" 
                  strokeWidth={2}
                  dot={false}
                />
                <Line 
                  yAxisId="risk"
                  type="monotone" 
                  dataKey="위험도" 
                  stroke="#FF9F40" 
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="3 3"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center space-x-4 mt-2">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-[#FF6D70] rounded-full mr-1"></div>
              <span className="text-xs text-gray-600">심박수</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-[#36A2EB] rounded-full mr-1"></div>
              <span className="text-xs text-gray-600">산소포화도</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-[#FF9F40] rounded-full mr-1"></div>
              <span className="text-xs text-gray-600">위험도</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* AI 분석 및 권장사항 */}
      <Card className="shadow-sm border border-[#FFD6D6]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center">
            <Eye className="h-5 w-5 mr-2 text-[#FF6D70]" />
            AI 건강 분석 및 권장사항
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <p>
              <strong>AI 헬퍼 분석:</strong> {' '}
              {riskLevel < 20 
                ? '현재 심장 건강 상태는 양호한 것으로 보입니다. 정상적인 범위 내에서 생체 신호가 유지되고 있습니다.' 
                : riskLevel < 40 
                  ? '약간의 변동이 감지되었으나 심각한 수준은 아닙니다. 평소보다 심박수가 약간 높거나 변동이 있는 상태입니다.' 
                  : riskLevel < 60 
                    ? '주의가 필요한 상태입니다. 생체 신호에 변화가 감지되었습니다. 휴식을 취하고 상태를 지속적으로 모니터링하세요.' 
                    : riskLevel < 80 
                      ? '위험 신호가 감지되었습니다. 생체 지표에 유의미한 변화가 관찰됩니다. 의료 전문가와 상담하는 것을 권장합니다.' 
                      : '심각한 위험 신호가 감지되었습니다. 즉시 휴식을 취하고 필요한 경우 응급 의료 지원을 요청하세요.'
              }
            </p>
            
            <div className="mt-2">
              <strong>권장사항:</strong>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                {riskLevel < 40 ? (
                  <>
                    <li>규칙적인 운동을 통해 심장 건강을 유지하세요.</li>
                    <li>충분한 수분 섭취와 균형 잡힌 식이를 유지하세요.</li>
                    <li>정기적인 건강 검진을 통해 심장 건강을 확인하세요.</li>
                  </>
                ) : riskLevel < 60 ? (
                  <>
                    <li>스트레스를 줄이고 적절한 휴식을 취하세요.</li>
                    <li>카페인이나 알코올 섭취를 제한하세요.</li>
                    <li>심호흡이나 명상을 통해 안정을 취하세요.</li>
                  </>
                ) : (
                  <>
                    <li>무리한 활동을 중단하고 즉시 휴식을 취하세요.</li>
                    <li>증상이 지속되면 의료 전문가에게 연락하세요.</li>
                    <li>니트로글리세린 등 처방된 약물이 있다면 복용을 고려하세요.</li>
                    <li>심각한 증상(심한 흉통, 호흡곤란 등)이 나타나면 119에 연락하세요.</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BioMonitoring;