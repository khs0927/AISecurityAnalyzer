import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Activity, LineChart } from 'lucide-react';

// 차트 데이터 인터페이스
interface ChartData {
  labels: string[];
  values: number[];
}

// 컴포넌트 Props 정의
interface MedicalDataChartProps {
  heartRateData?: ChartData;
  oxygenLevelData?: ChartData;
  bloodPressureData?: {
    labels: string[];
    systolic: number[];
    diastolic: number[];
  };
  ecgData?: number[];
  refreshInterval?: number; // 밀리초 단위
}

const MedicalDataChart: React.FC<MedicalDataChartProps> = ({
  heartRateData: initialHeartRateData,
  oxygenLevelData: initialOxygenLevelData,
  bloodPressureData: initialBloodPressureData,
  ecgData: initialEcgData,
  refreshInterval = 5000 // 기본 5초
}) => {
  // 탭 상태
  const [activeTab, setActiveTab] = useState('heart-rate');
  
  // 차트 데이터 상태
  const [heartRateData, setHeartRateData] = useState<ChartData>(initialHeartRateData || {
    labels: Array.from({ length: 12 }, (_, i) => `${i * 5}초`),
    values: Array.from({ length: 12 }, () => Math.floor(Math.random() * 20) + 70)
  });
  
  const [oxygenLevelData, setOxygenLevelData] = useState<ChartData>(initialOxygenLevelData || {
    labels: Array.from({ length: 12 }, (_, i) => `${i * 5}초`),
    values: Array.from({ length: 12 }, () => Math.floor(Math.random() * 5) + 95)
  });
  
  const [bloodPressureData, setBloodPressureData] = useState(initialBloodPressureData || {
    labels: Array.from({ length: 12 }, (_, i) => `${i * 5}초`),
    systolic: Array.from({ length: 12 }, () => Math.floor(Math.random() * 20) + 120),
    diastolic: Array.from({ length: 12 }, () => Math.floor(Math.random() * 15) + 75)
  });
  
  const [ecgData, setEcgData] = useState<number[]>(initialEcgData || 
    Array.from({ length: 100 }, () => Math.sin(Math.random() * Math.PI * 2) * 0.5 + Math.random() * 0.2)
  );
  
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // 실시간 데이터 업데이트 시뮬레이션
  useEffect(() => {
    if (!refreshInterval) return;
    
    const updateTimer = setInterval(() => {
      // 심박수 데이터 업데이트
      setHeartRateData(prev => {
        const newValues = [...prev.values.slice(1), Math.floor(Math.random() * 20) + 70];
        return {
          ...prev,
          values: newValues
        };
      });
      
      // 산소포화도 데이터 업데이트
      setOxygenLevelData(prev => {
        const newValues = [...prev.values.slice(1), Math.floor(Math.random() * 5) + 95];
        return {
          ...prev,
          values: newValues
        };
      });
      
      // 혈압 데이터 업데이트
      setBloodPressureData(prev => {
        const newSystolic = [...prev.systolic.slice(1), Math.floor(Math.random() * 20) + 120];
        const newDiastolic = [...prev.diastolic.slice(1), Math.floor(Math.random() * 15) + 75];
        return {
          ...prev,
          systolic: newSystolic,
          diastolic: newDiastolic
        };
      });
      
      // ECG 데이터 업데이트
      setEcgData(prev => {
        const newData = [...prev.slice(10)]; 
        for (let i = 0; i < 10; i++) {
          newData.push(Math.sin(Math.random() * Math.PI * 2) * 0.5 + Math.random() * 0.2);
        }
        return newData;
      });
      
      setLastUpdate(new Date());
    }, refreshInterval);
    
    return () => clearInterval(updateTimer);
  }, [refreshInterval]);
  
  // ECG 차트 패스 생성
  const createEcgPath = (data: number[]): string => {
    let path = `M 0,50`;
    data.forEach((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 50 - value * 40;
      path += ` L ${x},${y}`;
    });
    return path;
  };
  
  return (
    <Card className="border border-[#FFD6D6]">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-base">실시간 건강 지표</h3>
          <span className="text-xs text-gray-500">
            마지막 업데이트: {lastUpdate.toLocaleTimeString()}
          </span>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="heart-rate" className="text-xs">
              <Heart className="h-4 w-4 mr-1" />
              심박수
            </TabsTrigger>
            <TabsTrigger value="oxygen" className="text-xs">
              <Activity className="h-4 w-4 mr-1" />
              산소포화도
            </TabsTrigger>
            <TabsTrigger value="ecg" className="text-xs">
              <LineChart className="h-4 w-4 mr-1" />
              ECG
            </TabsTrigger>
          </TabsList>
          
          {/* 심박수 차트 */}
          <TabsContent value="heart-rate">
            <div className="bg-[#FFF5F5] p-3 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  <Heart className="h-5 w-5 mr-1 text-[#FF6D70]" />
                  <span className="font-bold">
                    {heartRateData.values[heartRateData.values.length - 1]} BPM
                  </span>
                </div>
                <span className="text-xs bg-[#FFE2E9] text-[#FF6D70] py-1 px-2 rounded-full">
                  정상
                </span>
              </div>
              
              <div className="h-40 w-full relative">
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {/* 수평 그리드 라인 */}
                  {[0, 25, 50, 75, 100].map(y => (
                    <line
                      key={`h-${y}`}
                      x1="0"
                      y1={y}
                      x2="100"
                      y2={y}
                      stroke="#e5e7eb"
                      strokeWidth="0.5"
                    />
                  ))}
                  
                  {/* 수직 그리드 라인 */}
                  {heartRateData.labels.map((_, i) => (
                    <line
                      key={`v-${i}`}
                      x1={i * (100 / (heartRateData.labels.length - 1))}
                      y1="0"
                      x2={i * (100 / (heartRateData.labels.length - 1))}
                      y2="100"
                      stroke="#e5e7eb"
                      strokeWidth="0.5"
                    />
                  ))}
                  
                  {/* 데이터 포인트 연결 */}
                  <path
                    d={`M ${heartRateData.values.map((value, index) => {
                      const x = index * (100 / (heartRateData.values.length - 1));
                      const y = 100 - ((value - 50) * 2);
                      return `${x},${y}`;
                    }).join(' L ')}`}
                    fill="none"
                    stroke="#FF6D70"
                    strokeWidth="2"
                  />
                  
                  {/* 데이터 포인트 */}
                  {heartRateData.values.map((value, index) => {
                    const x = index * (100 / (heartRateData.values.length - 1));
                    const y = 100 - ((value - 50) * 2);
                    return (
                      <circle
                        key={`point-${index}`}
                        cx={x}
                        cy={y}
                        r="1.5"
                        fill="#FF0000"
                      />
                    );
                  })}
                </svg>
              </div>
              
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                {heartRateData.labels.filter((_, i) => i % 2 === 0).map((label, i) => (
                  <span key={`label-${i}`}>{label}</span>
                ))}
              </div>
            </div>
          </TabsContent>
          
          {/* 산소포화도 차트 */}
          <TabsContent value="oxygen">
            <div className="bg-[#FFF5F5] p-3 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  <Activity className="h-5 w-5 mr-1 text-[#FF6D70]" />
                  <span className="font-bold">
                    {oxygenLevelData.values[oxygenLevelData.values.length - 1]}%
                  </span>
                </div>
                <span className="text-xs bg-[#FFE2E9] text-[#FF6D70] py-1 px-2 rounded-full">
                  정상
                </span>
              </div>
              
              <div className="h-40 w-full relative">
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {/* 수평 그리드 라인 */}
                  {[0, 25, 50, 75, 100].map(y => (
                    <line
                      key={`h-${y}`}
                      x1="0"
                      y1={y}
                      x2="100"
                      y2={y}
                      stroke="#e5e7eb"
                      strokeWidth="0.5"
                    />
                  ))}
                  
                  {/* 수직 그리드 라인 */}
                  {oxygenLevelData.labels.map((_, i) => (
                    <line
                      key={`v-${i}`}
                      x1={i * (100 / (oxygenLevelData.labels.length - 1))}
                      y1="0"
                      x2={i * (100 / (oxygenLevelData.labels.length - 1))}
                      y2="100"
                      stroke="#e5e7eb"
                      strokeWidth="0.5"
                    />
                  ))}
                  
                  {/* 데이터 포인트 연결 */}
                  <path
                    d={`M ${oxygenLevelData.values.map((value, index) => {
                      const x = index * (100 / (oxygenLevelData.values.length - 1));
                      // 산소포화도 범위가 90-100이므로 스케일 조정
                      const y = 100 - ((value - 90) * 10);
                      return `${x},${y}`;
                    }).join(' L ')}`}
                    fill="none"
                    stroke="#FF6D70"
                    strokeWidth="2"
                  />
                  
                  {/* 데이터 포인트 */}
                  {oxygenLevelData.values.map((value, index) => {
                    const x = index * (100 / (oxygenLevelData.values.length - 1));
                    const y = 100 - ((value - 90) * 10);
                    return (
                      <circle
                        key={`point-${index}`}
                        cx={x}
                        cy={y}
                        r="1.5"
                        fill="#FF0000"
                      />
                    );
                  })}
                </svg>
              </div>
              
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                {oxygenLevelData.labels.filter((_, i) => i % 2 === 0).map((label, i) => (
                  <span key={`label-${i}`}>{label}</span>
                ))}
              </div>
            </div>
          </TabsContent>
          
          {/* ECG 차트 */}
          <TabsContent value="ecg">
            <div className="bg-[#FFF5F5] p-3 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  <LineChart className="h-5 w-5 mr-1 text-[#FF6D70]" />
                  <span className="font-bold">ECG 파형</span>
                </div>
                <span className="text-xs bg-[#FFE2E9] text-[#FF6D70] py-1 px-2 rounded-full">
                  실시간
                </span>
              </div>
              
              <div className="h-40 w-full relative bg-white rounded border border-[#FFD6D6]">
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {/* 수평 그리드 라인 */}
                  {[0, 25, 50, 75, 100].map(y => (
                    <line
                      key={`h-${y}`}
                      x1="0"
                      y1={y}
                      x2="100"
                      y2={y}
                      stroke="#e5e7eb"
                      strokeWidth="0.5"
                    />
                  ))}
                  
                  {/* 수직 그리드 라인 */}
                  {Array.from({ length: 10 }).map((_, i) => (
                    <line
                      key={`v-${i}`}
                      x1={i * 10}
                      y1="0"
                      x2={i * 10}
                      y2="100"
                      stroke="#e5e7eb"
                      strokeWidth="0.5"
                    />
                  ))}
                  
                  {/* ECG 파형 */}
                  <path
                    d={createEcgPath(ecgData)}
                    fill="none"
                    stroke="#FF0000"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
              
              <div className="flex justify-between mt-2">
                <span className="text-xs text-gray-500">0초</span>
                <span className="text-xs text-gray-500">10초</span>
              </div>
            </div>
            
            <div className="mt-4 p-3 border border-[#FFD6D6] rounded-lg">
              <div className="flex items-center mb-2">
                <Activity className="h-5 w-5 mr-1 text-[#FF6D70]" />
                <span className="font-bold text-sm">ECG 분석 결과</span>
              </div>
              <p className="text-sm text-gray-700">
                정상 심박 리듬이 감지되었습니다. P, QRS, T 파형이 모두 정상 범위 내에 있으며, 
                부정맥이나 다른 이상 징후는 관찰되지 않았습니다.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MedicalDataChart;