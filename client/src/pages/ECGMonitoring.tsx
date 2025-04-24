import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { startECGSimulation, ECGPattern } from '@/lib/ecgSimulator';
import { Line } from 'recharts';
import { CartesianGrid, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

const ECGMonitoring = () => {
  const { 
    isMonitoring, 
    startMonitoring, 
    stopMonitoring, 
    ecgStatus, 
    simulateEcgAnomaly 
  } = useApp();
  
  const [activeTab, setActiveTab] = useState("realtime");
  const [ecgData, setEcgData] = useState<{ value: number, time: number }[]>([]);
  const [ecgFeatures, setEcgFeatures] = useState({
    hrv: '42ms',
    qtInterval: '380ms',
    stDeviation: '0.05mV'
  });
  const [patterns, setPatterns] = useState([
    { name: '정상 동리듬', probability: 98 },
    { name: 'ST 분절 상승', probability: 1 },
    { name: '심방세동', probability: 1 }
  ]);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const maxDataPoints = 100;
  
  // ECG simulation for real-time tab
  useEffect(() => {
    if (activeTab === "realtime" && isMonitoring) {
      let pattern = ECGPattern.NORMAL;
      
      if (ecgStatus === 'warning') {
        pattern = ECGPattern.TACHYCARDIA;
      } else if (ecgStatus === 'critical') {
        pattern = ECGPattern.ST_ELEVATION;
      }
      
      const stopSimulation = startECGSimulation(pattern, (dataPoint) => {
        // Add timestamp for the chart
        const time = Date.now();
        
        // Update data for charts
        setEcgData(prevData => {
          const newData = [...prevData, { value: dataPoint, time }];
          if (newData.length > 50) {
            return newData.slice(newData.length - 50);
          }
          return newData;
        });
      });
      
      return () => stopSimulation();
    }
  }, [activeTab, isMonitoring, ecgStatus]);

  // Draw the ECG line in the realtime SVG
  useEffect(() => {
    if (!svgRef.current || ecgData.length === 0) return;
    
    const svg = svgRef.current;
    const path = svg.querySelector('path');
    
    if (path) {
      // Generate path data
      let pathData = `M0,50`;
      
      ecgData.forEach((point, index) => {
        // Scale point to fit SVG and invert (SVG y is top-down)
        const x = (index / (ecgData.length - 1)) * 400;
        const y = 50 - (point.value * 40); // Scale amplitude
        
        pathData += ` L${x},${y}`;
      });
      
      // Set the path data
      path.setAttribute('d', pathData);
    }
  }, [ecgData]);

  // Generate history chart data for the history tab
  const generateHistoryData = () => {
    const historyData = [];
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(now - (i * oneDay));
      historyData.push({
        date: date.toLocaleDateString(),
        '최대 심박수': Math.floor(Math.random() * 30) + 100,
        '최소 심박수': Math.floor(Math.random() * 20) + 50,
        '평균 심박수': Math.floor(Math.random() * 20) + 65
      });
    }
    
    return historyData.reverse();
  };

  const handleStartMonitoring = () => {
    startMonitoring();
  };

  const handleStopMonitoring = () => {
    stopMonitoring();
  };

  const handleSimulateAnomaly = (anomalyType: string) => {
    simulateEcgAnomaly(anomalyType);
  };

  return (
    <div className="space-y-4">
      {/* 헤더에 뒤로가기 버튼이 있으므로 여기서는 제거 */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
          고급 심전도(ECG) 모니터링
          <span className="ml-2 px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
            멀티모달 AI 알고리즘
          </span>
        </h2>

        <Tabs defaultValue="realtime" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="realtime">실시간 모니터링</TabsTrigger>
            <TabsTrigger value="analysis">패턴 분석</TabsTrigger>
            <TabsTrigger value="history">이력</TabsTrigger>
            <TabsTrigger value="aianalysis">AI 진단</TabsTrigger>
          </TabsList>

          {/* Realtime tab */}
          <TabsContent value="realtime" className="py-4">
            <div className="bg-[#f8fafb] rounded-xl p-4 mb-4">
              <div className="h-40 w-full relative overflow-hidden">
                <svg ref={svgRef} width="100%" height="100%" viewBox="0 0 400 100" preserveAspectRatio="none">
                  <path 
                    d="M0,50 L0,50"
                    fill="none" 
                    stroke="#2c90e2" 
                    strokeWidth="2"
                    className={isMonitoring ? "ecg-line" : ""}
                  />
                </svg>
                
                {!isMonitoring && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[#507695] text-sm">모니터링을 시작하려면 실시간 모니터링 시작 버튼을 누르세요</span>
                  </div>
                )}
                
                {isMonitoring && (
                  <div className="absolute top-4 right-4 flex flex-col items-end">
                    <div className="text-2xl font-bold text-primary mb-1">
                      {ecgStatus === 'normal' ? '72' : ecgStatus === 'warning' ? '95' : '118'} <span className="text-sm">BPM</span>
                    </div>
                    <div className={`text-sm font-medium ${
                      ecgStatus === 'normal' ? 'text-green-500' : 
                      ecgStatus === 'warning' ? 'text-amber-500' : 'text-red-500'
                    }`}>
                      {ecgStatus === 'normal' ? '정상' : ecgStatus === 'warning' ? '주의' : '위험'}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3 mb-4">
              <Button 
                variant={isMonitoring ? "destructive" : "default"}
                className="flex-1"
                onClick={isMonitoring ? handleStopMonitoring : handleStartMonitoring}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  {isMonitoring ? (
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                  ) : (
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  )}
                </svg>
                {isMonitoring ? '실시간 모니터링 중지' : '실시간 모니터링 시작'}
              </Button>
              <Button 
                variant="outline"
                onClick={() => handleSimulateAnomaly('심방세동')}
                className="flex-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
                위험 상황 시뮬레이션
              </Button>
            </div>
            
            <div className="bg-[#f8fafb] rounded-xl p-4">
              <h4 className="text-sm font-semibold mb-2">멀티모달 심근경색 감지 알고리즘</h4>
              <p className="text-xs text-[#507695] mb-3">실시간 ECG 데이터와 생체신호를 종합 분석하여 심근경색 조기 징후를 감지합니다.</p>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-lg text-center">
                  <div className="text-xs text-[#507695] mb-1">감지 정확도</div>
                  <div className="text-sm font-semibold text-[#0e151b]">97.5%</div>
                </div>
                <div className="bg-white p-3 rounded-lg text-center">
                  <div className="text-xs text-[#507695] mb-1">조기 감지 시간</div>
                  <div className="text-sm font-semibold text-[#0e151b]">8-15초</div>
                </div>
                <div className="bg-white p-3 rounded-lg text-center">
                  <div className="text-xs text-[#507695] mb-1">오경보율</div>
                  <div className="text-sm font-semibold text-[#0e151b]">1.8%</div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Analysis tab */}
          <TabsContent value="analysis" className="py-4">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-[#f8fafb] p-3 rounded-xl">
                <div className="text-center">
                  <div className="text-xs text-[#507695] mb-1">심박 변이도(HRV)</div>
                  <div className="text-lg font-bold text-[#0e151b]">{ecgFeatures.hrv}</div>
                  <div className="text-xs text-[#507695]">건강한 범위: 30-60ms</div>
                </div>
              </div>
              <div className="bg-[#f8fafb] p-3 rounded-xl">
                <div className="text-center">
                  <div className="text-xs text-[#507695] mb-1">QT 간격</div>
                  <div className="text-lg font-bold text-[#0e151b]">{ecgFeatures.qtInterval}</div>
                  <div className="text-xs text-[#507695]">정상: 350-440ms</div>
                </div>
              </div>
              <div className="bg-[#f8fafb] p-3 rounded-xl">
                <div className="text-center">
                  <div className="text-xs text-[#507695] mb-1">ST 분절 편차</div>
                  <div className="text-lg font-bold text-[#0e151b]">{ecgFeatures.stDeviation}</div>
                  <div className="text-xs text-[#507695]">정상: ±0.1mV</div>
                </div>
              </div>
            </div>
            
            <div className="bg-[#f8fafb] rounded-xl p-4 mb-4">
              <h3 className="text-sm font-semibold mb-2">멀티모달 AI 패턴 분석</h3>
              <p className="text-xs text-[#507695] mb-3">Kaggle의 최신 심장질환 데이터셋(20,000+ 케이스)을 학습한 AI가 심전도 패턴을 실시간으로 분석합니다.</p>
              
              <div className="space-y-2">
                {patterns.map((pattern, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-white rounded-lg">
                    <span className="text-sm text-[#0e151b]">{pattern.name}</span>
                    <div className="flex items-center">
                      <div className="w-32 h-2 bg-gray-200 rounded-full mr-2 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            pattern.probability > 90 ? 'bg-green-500' : 
                            pattern.probability > 50 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${pattern.probability}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{pattern.probability}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* History tab */}
          <TabsContent value="history" className="py-4">
            <div className="mb-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold">ECG 기록 추이</h3>
                <select className="text-xs rounded-lg border border-gray-300 bg-white px-2 py-1">
                  <option value="week">지난 주</option>
                  <option value="month">지난 달</option>
                  <option value="year">지난 해</option>
                </select>
              </div>
              
              <div className="h-64 bg-[#f8fafb] rounded-xl p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={generateHistoryData()} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" scale="band" fontSize={10} />
                    <YAxis fontSize={10} />
                    <Tooltip />
                    <Line type="monotone" dataKey="최대 심박수" stroke="#ef4444" dot={{ r: 1 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="평균 심박수" stroke="#2c90e2" dot={{ r: 1 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="최소 심박수" stroke="#10b981" dot={{ r: 1 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-[#f8fafb] p-3 rounded-xl text-center">
                <div className="text-xs text-[#507695] mb-1">총 ECG 기록</div>
                <div className="text-lg font-bold text-[#0e151b]">87회</div>
              </div>
              <div className="bg-[#f8fafb] p-3 rounded-xl text-center">
                <div className="text-xs text-[#507695] mb-1">이상 감지</div>
                <div className="text-lg font-bold text-[#0e151b]">3회</div>
              </div>
              <div className="bg-[#f8fafb] p-3 rounded-xl text-center">
                <div className="text-xs text-[#507695] mb-1">특이사항</div>
                <div className="text-lg font-bold text-[#0e151b]">2회</div>
              </div>
            </div>
            
            <Button variant="outline" className="w-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              ECG 기록 내보내기
            </Button>
          </TabsContent>

          {/* AI analysis tab */}
          <TabsContent value="aianalysis" className="py-4">
            <div className="space-y-4">
              <div className="bg-[#f8fafb] rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-2">AI 심장 분석 리포트</h3>
                <p className="text-xs text-[#507695] mb-3">최신 머신러닝 알고리즘을 통한 심장 건강 분석 결과입니다.</p>
                
                <div className="space-y-3">
                  <div className="bg-white p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="text-sm font-medium">ECG 패턴 요약</h4>
                      <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-green-100 text-green-800">정상</span>
                    </div>
                    <p className="text-xs text-[#507695]">
                      분석된 ECG 패턴은 정상 동리듬을 보이고 있으며, QRS 복합체, PR 간격, QT 간격이 모두 정상 범위 내에 있습니다.
                    </p>
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="text-sm font-medium">심장 건강 지표</h4>
                      <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-[#e8eef3] text-[#2c90e2]">양호</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div className="text-xs">
                        <div className="text-[#507695] mb-1">심장 리듬</div>
                        <div className="text-[#0e151b] font-medium">정상 동리듬</div>
                      </div>
                      <div className="text-xs">
                        <div className="text-[#507695] mb-1">심박수 변동</div>
                        <div className="text-[#0e151b] font-medium">정상 범위</div>
                      </div>
                      <div className="text-xs">
                        <div className="text-[#507695] mb-1">ST 분절</div>
                        <div className="text-[#0e151b] font-medium">이상 없음</div>
                      </div>
                      <div className="text-xs">
                        <div className="text-[#507695] mb-1">QT 간격</div>
                        <div className="text-[#0e151b] font-medium">380ms (정상)</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="text-sm font-medium">AI 권장 사항</h4>
                    </div>
                    <ul className="text-xs text-[#507695] list-disc list-inside space-y-1">
                      <li>현재의 건강 상태를 유지하고 정기적인 심장 검진 계속하기</li>
                      <li>중등도 심장 강화 운동을 주 3회 이상 유지하기</li>
                      <li>저염식 식이요법 유지하고 충분한 수분 섭취하기</li>
                      <li>혈압과 콜레스테롤 수치 관리에 주의하기</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <Button className="w-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                </svg>
                AI 분석 결과 상세 보기
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default ECGMonitoring;
