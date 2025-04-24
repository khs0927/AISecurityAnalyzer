import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CartesianGrid, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Line, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, subDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useApp } from '@/contexts/AppContext';

const HealthRecord = () => {
  const { healthData } = useApp();
  const [activeTab, setActiveTab] = useState("heart-rate");
  const [period, setPeriod] = useState("week");

  // Generate sample data for charts
  const generateHeartRateData = () => {
    const data = [];
    const now = new Date();
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;
    
    for (let i = 0; i < days; i++) {
      const date = subDays(now, days - i - 1);
      
      // Generate more realistic heart rate data with some variation
      const baseRate = healthData?.heartRate || 72;
      const min = Math.max(50, baseRate - Math.floor(Math.random() * 15));
      const max = Math.min(160, baseRate + Math.floor(Math.random() * 25));
      const average = Math.floor((min + max) / 2);
      
      data.push({
        date: format(date, 'M/d', { locale: ko }),
        average,
        min,
        max
      });
    }
    
    return data;
  };

  const generateBloodPressureData = () => {
    const data = [];
    const now = new Date();
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;
    
    for (let i = 0; i < days; i++) {
      const date = subDays(now, days - i - 1);
      
      // Generate realistic blood pressure data
      const systolic = Math.floor(Math.random() * 30) + 110;
      const diastolic = Math.floor(Math.random() * 20) + 70;
      
      data.push({
        date: format(date, 'M/d', { locale: ko }),
        systolic,
        diastolic
      });
    }
    
    return data;
  };

  const generateSleepData = () => {
    const data = [];
    const now = new Date();
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;
    
    for (let i = 0; i < days; i++) {
      const date = subDays(now, days - i - 1);
      
      // Generate sleep data in hours
      const deep = Math.random() * 2 + 1;
      const light = Math.random() * 4 + 2;
      const rem = Math.random() * 2 + 1;
      
      data.push({
        date: format(date, 'M/d', { locale: ko }),
        deep: parseFloat(deep.toFixed(1)),
        light: parseFloat(light.toFixed(1)),
        rem: parseFloat(rem.toFixed(1)),
        total: parseFloat((deep + light + rem).toFixed(1))
      });
    }
    
    return data;
  };

  const generateActivityData = () => {
    const data = [];
    const now = new Date();
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;
    
    for (let i = 0; i < days; i++) {
      const date = subDays(now, days - i - 1);
      
      // Generate steps and calories
      const steps = Math.floor(Math.random() * 6000) + 4000;
      const calories = Math.floor(steps * 0.05);
      const distance = parseFloat((steps * 0.0007).toFixed(2));
      
      data.push({
        date: format(date, 'M/d', { locale: ko }),
        steps,
        calories,
        distance
      });
    }
    
    return data;
  };

  const generateRiskPieData = () => {
    return [
      { name: '정상 심박', value: 65 },
      { name: '약간 상승', value: 20 },
      { name: '주의 필요', value: 10 },
      { name: '심각 상승', value: 5 }
    ];
  };

  const COLORS = ['#10b981', '#2c90e2', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">건강 기록</h2>
          <select 
            className="text-sm rounded-lg border border-gray-300 bg-white px-3 py-1.5"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="week">최근 1주</option>
            <option value="month">최근 1개월</option>
            <option value="quarter">최근 3개월</option>
          </select>
        </div>

        <Tabs defaultValue="heart-rate" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="heart-rate">심박수</TabsTrigger>
            <TabsTrigger value="blood-pressure">혈압</TabsTrigger>
            <TabsTrigger value="sleep">수면</TabsTrigger>
            <TabsTrigger value="activity">활동</TabsTrigger>
          </TabsList>

          {/* Heart Rate Tab */}
          <TabsContent value="heart-rate" className="py-4">
            <div className="h-72 bg-[#f8fafb] rounded-xl p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={generateHeartRateData()} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" scale="band" fontSize={10} />
                  <YAxis domain={[40, 'auto']} fontSize={10} />
                  <Tooltip />
                  <Line type="monotone" dataKey="max" name="최대 심박수" stroke="#ef4444" dot={{ r: 1 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="average" name="평균 심박수" stroke="#2c90e2" dot={{ r: 1 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="min" name="최소 심박수" stroke="#10b981" dot={{ r: 1 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="bg-[#f8fafb] p-3 rounded-xl text-center">
                <div className="text-xs text-[#507695] mb-1">평균 심박수</div>
                <div className="text-lg font-bold text-[#0e151b]">72 BPM</div>
                <div className="text-xs text-[#507695]">정상 범위</div>
              </div>
              <div className="bg-[#f8fafb] p-3 rounded-xl text-center">
                <div className="text-xs text-[#507695] mb-1">최대 심박수</div>
                <div className="text-lg font-bold text-[#0e151b]">124 BPM</div>
                <div className="text-xs text-[#507695]">운동 중</div>
              </div>
              <div className="bg-[#f8fafb] p-3 rounded-xl text-center">
                <div className="text-xs text-[#507695] mb-1">안정시 심박수</div>
                <div className="text-lg font-bold text-[#0e151b]">58 BPM</div>
                <div className="text-xs text-[#507695]">수면 중</div>
              </div>
            </div>
            
            <div className="bg-[#f8fafb] p-4 rounded-xl mt-4">
              <h3 className="text-sm font-semibold mb-3">심박수 패턴 분석</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={generateRiskPieData()}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={60}
                        paddingAngle={2}
                        dataKey="value"
                        label={false}
                      >
                        {generateRiskPieData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend 
                        verticalAlign="bottom" 
                        height={36} 
                        formatter={(value, entry, index) => (
                          <span className="text-xs">{value}</span>
                        )}
                      />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-xs text-[#507695] space-y-2">
                  <p>심박수 분석에 따르면 대부분의 시간(65%)을 건강한 심박수 범위 내에서 유지하고 있습니다.</p>
                  <p>주로 <span className="text-[#0e151b] font-medium">오후 3시~5시</span> 사이에 심박수가 상승하는 경향이 있으며, 이는 일반적인 일과 중 신체 활동과 연관되어 있을 수 있습니다.</p>
                  <p>전반적으로 심박 변이도(HRV)는 <span className="text-[#0e151b] font-medium">42ms</span>로 건강한 범위 내에 있습니다.</p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Blood Pressure Tab */}
          <TabsContent value="blood-pressure" className="py-4">
            <div className="h-72 bg-[#f8fafb] rounded-xl p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={generateBloodPressureData()} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" scale="band" fontSize={10} />
                  <YAxis domain={[60, 160]} fontSize={10} />
                  <Tooltip />
                  <Line type="monotone" dataKey="systolic" name="수축기 혈압" stroke="#ef4444" dot={{ r: 1 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="diastolic" name="이완기 혈압" stroke="#2c90e2" dot={{ r: 1 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-[#f8fafb] p-3 rounded-xl text-center">
                <div className="text-xs text-[#507695] mb-1">평균 수축기 혈압</div>
                <div className="text-lg font-bold text-[#0e151b]">120 mmHg</div>
                <div className="text-xs text-[#507695]">정상 범위</div>
              </div>
              <div className="bg-[#f8fafb] p-3 rounded-xl text-center">
                <div className="text-xs text-[#507695] mb-1">평균 이완기 혈압</div>
                <div className="text-lg font-bold text-[#0e151b]">78 mmHg</div>
                <div className="text-xs text-[#507695]">정상 범위</div>
              </div>
            </div>
            
            <div className="bg-[#f8fafb] p-4 rounded-xl mt-4">
              <h3 className="text-sm font-semibold mb-2">혈압 분류</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="w-24 text-xs">정상</div>
                  <div className="flex-1 h-4 bg-gray-200 rounded-full">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: '80%' }}></div>
                  </div>
                  <div className="w-8 text-xs text-right">80%</div>
                </div>
                <div className="flex items-center">
                  <div className="w-24 text-xs">고혈압 전단계</div>
                  <div className="flex-1 h-4 bg-gray-200 rounded-full">
                    <div className="h-full bg-yellow-500 rounded-full" style={{ width: '15%' }}></div>
                  </div>
                  <div className="w-8 text-xs text-right">15%</div>
                </div>
                <div className="flex items-center">
                  <div className="w-24 text-xs">고혈압 1기</div>
                  <div className="flex-1 h-4 bg-gray-200 rounded-full">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: '5%' }}></div>
                  </div>
                  <div className="w-8 text-xs text-right">5%</div>
                </div>
                <div className="flex items-center">
                  <div className="w-24 text-xs">고혈압 2기</div>
                  <div className="flex-1 h-4 bg-gray-200 rounded-full">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: '0%' }}></div>
                  </div>
                  <div className="w-8 text-xs text-right">0%</div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Sleep Tab */}
          <TabsContent value="sleep" className="py-4">
            <div className="h-72 bg-[#f8fafb] rounded-xl p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={generateSleepData()} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" scale="band" fontSize={10} />
                  <YAxis domain={[0, 12]} fontSize={10} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="deep" name="깊은 수면" stackId="a" fill="#2c90e2" />
                  <Bar dataKey="light" name="얕은 수면" stackId="a" fill="#93c5fd" />
                  <Bar dataKey="rem" name="REM 수면" stackId="a" fill="#c4b5fd" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="bg-[#f8fafb] p-3 rounded-xl text-center">
                <div className="text-xs text-[#507695] mb-1">평균 수면 시간</div>
                <div className="text-lg font-bold text-[#0e151b]">7.2시간</div>
                <div className="text-xs text-[#507695]">양호</div>
              </div>
              <div className="bg-[#f8fafb] p-3 rounded-xl text-center">
                <div className="text-xs text-[#507695] mb-1">수면 효율</div>
                <div className="text-lg font-bold text-[#0e151b]">87%</div>
                <div className="text-xs text-[#507695]">양호</div>
              </div>
              <div className="bg-[#f8fafb] p-3 rounded-xl text-center">
                <div className="text-xs text-[#507695] mb-1">깊은 수면 비율</div>
                <div className="text-lg font-bold text-[#0e151b]">23%</div>
                <div className="text-xs text-[#507695]">정상 범위</div>
              </div>
            </div>
            
            <div className="bg-[#f8fafb] p-4 rounded-xl mt-4">
              <h3 className="text-sm font-semibold mb-2">수면 패턴 분석</h3>
              <div className="text-xs text-[#507695] space-y-2">
                <p>평균 수면 시간은 <span className="text-[#0e151b] font-medium">7.2시간</span>으로 건강한 성인에게 권장되는 7-9시간 범위 내에 있습니다.</p>
                <p>주중 평균 취침 시간은 <span className="text-[#0e151b] font-medium">오후 11:35</span>, 기상 시간은 <span className="text-[#0e151b] font-medium">오전 6:45</span>으로 비교적 규칙적인 패턴을 보이고 있습니다.</p>
                <p>깊은 수면 비율이 <span className="text-[#0e151b] font-medium">23%</span>로 정상 범위(20-25%)에 있으며, 이는 심장 건강에 긍정적인 영향을 줍니다.</p>
                <p>수면 효율이 <span className="text-[#0e151b] font-medium">87%</span>로 양호한 수준입니다. (침대에서 보낸 시간 대비 실제 수면 시간)</p>
              </div>
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="py-4">
            <div className="h-72 bg-[#f8fafb] rounded-xl p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={generateActivityData()} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" scale="band" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="steps" name="걸음 수" fill="#2c90e2" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="bg-[#f8fafb] p-3 rounded-xl text-center">
                <div className="text-xs text-[#507695] mb-1">평균 걸음 수</div>
                <div className="text-lg font-bold text-[#0e151b]">7,842</div>
                <div className="text-xs text-[#507695]">일일 평균</div>
              </div>
              <div className="bg-[#f8fafb] p-3 rounded-xl text-center">
                <div className="text-xs text-[#507695] mb-1">평균 이동 거리</div>
                <div className="text-lg font-bold text-[#0e151b]">5.4 km</div>
                <div className="text-xs text-[#507695]">일일 평균</div>
              </div>
              <div className="bg-[#f8fafb] p-3 rounded-xl text-center">
                <div className="text-xs text-[#507695] mb-1">소모 칼로리</div>
                <div className="text-lg font-bold text-[#0e151b]">382</div>
                <div className="text-xs text-[#507695]">일일 평균</div>
              </div>
            </div>
            
            <div className="bg-[#f8fafb] p-4 rounded-xl mt-4">
              <h3 className="text-sm font-semibold mb-2">활동 분석</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span>일일 목표 달성률</span>
                    <span>78%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full">
                    <div className="h-full bg-primary rounded-full" style={{ width: '78%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span>활동적인 시간</span>
                    <span>32분/일</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: '53%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span>유산소 운동</span>
                    <span>22분/일</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: '37%' }}></div>
                  </div>
                </div>
              </div>
              <div className="text-xs text-[#507695] mt-3 space-y-2">
                <p>걸음 수가 <span className="text-[#0e151b] font-medium">7,842</span>로 WHO 권장 기준(10,000)에 약간 미치지 못하고 있습니다.</p>
                <p><span className="text-[#0e151b] font-medium">32분</span>의 일일 활동적인 시간을 기록하고 있으며, 심장 건강을 위해 최소 30분 이상의 중강도 운동을 권장합니다.</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          PDF 내보내기
        </Button>
        <Button variant="outline" className="flex-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
            <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
          </svg>
          사진 복사
        </Button>
      </div>
    </div>
  );
};

export default HealthRecord;
