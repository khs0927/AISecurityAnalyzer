import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { 
  calculateRiskScore, 
  getRiskLevel, 
  getRiskStatusDescription, 
  getRiskRecommendation,
  RiskFactor
} from '@/lib/riskCalculator';
import { useApp } from '@/contexts/AppContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Watch, RefreshCw } from 'lucide-react';
import ConnectionStatusIndicator from '@/components/smartwatch/ConnectionStatusIndicator';
import MultimodalAnalysisCard from '@/components/analysis/MultimodalAnalysisCard';

const RiskAnalysis = () => {
  const { healthData, simulateRiskLevel } = useApp();
  const [activeTab, setActiveTab] = useState("risk-calculator");
  const { toast } = useToast();

  // Smartwatch connection state
  const [watches, setWatches] = useState<any[]>([]);
  const [watchConnected, setWatchConnected] = useState(false);
  const [syncingData, setSyncingData] = useState(false);

  // Risk factors selection state
  const [selectedFactors, setSelectedFactors] = useState<RiskFactor[]>([]);
  const [age, setAge] = useState(40);
  const [heartRate, setHeartRate] = useState(72);
  const [systolic, setSystolic] = useState(120);
  const [diastolic, setDiastolic] = useState(80);
  const [oxygenSaturation, setOxygenSaturation] = useState(98);
  
  // Health assessment state
  const [assessmentAnswers, setAssessmentAnswers] = useState({
    exercise: 0,
    diet: 0,
    smoking: 0,
    alcohol: 0,
    sleep: 0,
    stress: 0,
    history: 0,
    medication: 0,
    symptoms: 0,
    checkups: 0
  });
  
  // 멀티모달 분석 상태
  const [ecgData, setEcgData] = useState<number[]>([]);
  const [heartRateData, setHeartRateData] = useState<number[]>([]);
  const [oxygenLevelData, setOxygenLevelData] = useState<number[]>([]);
  const [stDeviation, setStDeviation] = useState(0);
  const [arrhythmia, setArrhythmia] = useState<{ detected: boolean, type: string | null }>({ detected: false, type: null });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const riskFactors = [
    { id: RiskFactor.SMOKING, label: '흡연' },
    { id: RiskFactor.DIABETES, label: '당뇨' },
    { id: RiskFactor.HYPERTENSION, label: '고혈압' },
    { id: RiskFactor.HIGH_CHOLESTEROL, label: '고지혈증' },
    { id: RiskFactor.FAMILY_HISTORY, label: '심장질환 가족력' },
    { id: RiskFactor.PREVIOUS_CARDIAC_EVENT, label: '과거 심장 질환' },
    { id: RiskFactor.OBESITY, label: '비만' },
    { id: RiskFactor.SEDENTARY_LIFESTYLE, label: '운동 부족' },
    { id: RiskFactor.STRESS, label: '고스트레스' },
    { id: RiskFactor.SLEEP_DISORDER, label: '수면 장애' }
  ];

  // Calculate risk score based on selected factors
  const calculateMyRisk = () => {
    const riskInput = {
      age,
      riskFactors: selectedFactors,
      heartRate,
      bloodPressureSystolic: systolic,
      bloodPressureDiastolic: diastolic,
      oxygenSaturation
    };
    
    const riskScore = calculateRiskScore(riskInput);
    simulateRiskLevel(riskScore);
  };

  const handleFactorToggle = (factorId: RiskFactor) => {
    setSelectedFactors(prevFactors => {
      if (prevFactors.includes(factorId)) {
        return prevFactors.filter(id => id !== factorId);
      } else {
        return [...prevFactors, factorId];
      }
    });
  };

  const handleAssessmentChange = (key: keyof typeof assessmentAnswers, value: number) => {
    setAssessmentAnswers(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getAssessmentScore = () => {
    // Calculate average score from all assessment answers (0-5 scale)
    const sum = Object.values(assessmentAnswers).reduce((a, b) => a + b, 0);
    const average = sum / Object.keys(assessmentAnswers).length;
    
    // Convert to 0-100 scale
    return Math.round(average * 20);
  };

  const resetCalculator = () => {
    setSelectedFactors([]);
    setAge(40);
    setHeartRate(72);
    setSystolic(120);
    setDiastolic(80);
    setOxygenSaturation(98);
  };
  
  // Fetch smartwatch connections
  useEffect(() => {
    fetchSmartWatches();
    // Polling interval for watch status updates
    const interval = setInterval(fetchSmartWatches, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch smartwatch data from API
  const fetchSmartWatches = async () => {
    try {
      const userId = 1; // In a real implementation, use the actual user ID
      const response = await apiRequest(`/api/users/${userId}/smartwatch-connections`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        setWatches(data);
        // Set connected status based on at least one watch being connected
        const isAnyWatchConnected = data.some((watch: any) => watch.connected);
        setWatchConnected(isAnyWatchConnected);
        
        // If any watch is connected, we can sync vital data
        if (isAnyWatchConnected) {
          syncVitalSignsFromWatch();
        }
      }
    } catch (error) {
      console.error('Failed to fetch smartwatch connections:', error);
    }
  };

  // Sync vital signs data from connected watch
  const syncVitalSignsFromWatch = async () => {
    // In a real application, this would fetch actual data from the watch
    try {
      setSyncingData(true);
      
      // 실제 구현에서는 사용자 ID 가져오기
      const userId = 1; // Use actual user ID in real implementation
      
      // 최신 스마트워치 데이터를 가져오기 위한 API 호출
      try {
        const response = await apiRequest(`/api/users/${userId}/health-data/latest`);
        if (!response.ok) {
          throw new Error(`API 응답 오류: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data) {
          // Update the UI with the latest values from the smartwatch
          setHeartRate(data.heartRate || heartRate);
          setSystolic(data.bloodPressureSystolic || systolic);
          setDiastolic(data.bloodPressureDiastolic || diastolic);
          setOxygenSaturation(data.oxygenLevel || oxygenSaturation);
          
          // 멀티모달 분석을 위한 데이터 준비
          generateMultimodalData();
          
          // 성공 메시지 표시
          toast({
            title: "데이터 동기화 완료",
            description: "스마트워치에서 최신 생체 지표 데이터를 가져왔습니다.",
            duration: 3000,
          });
          
          // 위험도 계산 (새 데이터로 다시 분석)
          calculateMyRisk();
        } else {
          throw new Error("스마트워치 데이터가 없습니다");
        }
      } catch (apiError) {
        console.error('API 호출 실패:', apiError);
        
        // 오류 메시지에 더 구체적인 정보 추가
        toast({
          title: "데이터 동기화 실패",
          description: "스마트워치에서 데이터를 가져오는 데 실패했습니다. 기기가 올바르게 연결되어 있는지 확인하세요.",
          duration: 5000,
          variant: "destructive"
        });
        
        // 임시 데이터로 UI 업데이트 (실제 구현에서는 제거)
        const mockData = generateMockHealthData();
        setHeartRate(mockData.heartRate);
        setSystolic(mockData.bloodPressureSystolic);
        setDiastolic(mockData.bloodPressureDiastolic);
        setOxygenSaturation(mockData.oxygenLevel);
      }
    } catch (error) {
      console.error('전체 동기화 프로세스 실패:', error);
      toast({
        title: "동기화 오류",
        description: "스마트워치 동기화 중 알 수 없는 오류가 발생했습니다. 나중에 다시 시도해주세요.",
        duration: 3000,
        variant: "destructive"
      });
    } finally {
      setSyncingData(false);
    }
  };
  
  // 멀티모달 분석을 위한 데이터 생성
  const generateMultimodalData = () => {
    // ECG 데이터 시뮬레이션 (실제로는 스마트워치/기기에서 수집)
    const simulatedEcgData = Array(250).fill(0).map((_, i) => {
      // 기본 사인 파형
      const baseline = Math.sin(i / 10) * 0.5;
      // QRS 복합체 시뮬레이션
      const qrs = i % 25 === 0 ? 1.5 : 0;
      // 약간의 노이즈 추가
      const noise = (Math.random() - 0.5) * 0.1;
      return baseline + qrs + noise;
    });
    
    // 심박수 데이터 시뮬레이션
    const hrSamples = 10;
    const hrBaseline = heartRate;
    const simulatedHeartRates = Array(hrSamples).fill(0).map(() => 
      hrBaseline + (Math.random() - 0.5) * 10
    );
    
    // 산소포화도 데이터 시뮬레이션
    const spo2Samples = 10;
    const spo2Baseline = oxygenSaturation;
    const simulatedSpo2 = Array(spo2Samples).fill(0).map(() => 
      Math.min(100, Math.max(90, spo2Baseline + (Math.random() - 0.5) * 2))
    );
    
    // ST 세그먼트 편향 (20% 확률로 약간의 편향 추가)
    const stDeviationValue = Math.random() < 0.2 ? 0.15 + Math.random() * 0.1 : 0.05 + Math.random() * 0.04;
    
    // 부정맥 시뮬레이션 (15% 확률로 부정맥 감지)
    const hasArrhythmia = Math.random() < 0.15;
    const arrhythmiaTypes = ['심방세동', '심실기외수축', '동성서맥', '동성빈맥'];
    const detectedArrhythmia = {
      detected: hasArrhythmia,
      type: hasArrhythmia ? arrhythmiaTypes[Math.floor(Math.random() * arrhythmiaTypes.length)] : null
    };
    
    // 상태 업데이트
    setEcgData(simulatedEcgData);
    setHeartRateData(simulatedHeartRates);
    setOxygenLevelData(simulatedSpo2);
    setStDeviation(stDeviationValue);
    setArrhythmia(detectedArrhythmia);
    setLastUpdated(new Date());
  };
  
  // HAIM AI 분석 수행
  const performHaimAnalysis = async () => {
    if (ecgData.length === 0 || heartRateData.length === 0 || oxygenLevelData.length === 0) {
      generateMultimodalData(); // 데이터가 없는 경우 생성
      toast({
        title: "데이터 준비",
        description: "멀티모달 분석을 위한 데이터가 준비되었습니다.",
        duration: 2000,
      });
      return;
    }
    
    try {
      // AI 헬퍼 모델 분석 API 호출
      const response = await apiRequest('/api/analysis/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ecgData,
          heartRates: heartRateData,
          oxygenLevels: oxygenLevelData,
          stDeviation,
          arrhythmia
        }),
      });
      
      if (!response.ok) {
        throw new Error(`AI 분석 응답 오류: ${response.status}`);
      }
      
      const analysisResult = await response.json();
      
      // 분석 결과 처리
      console.log('HAIM 분석 결과:', analysisResult);
      
      // 위험도 업데이트
      simulateRiskLevel(analysisResult.riskScore);
      
      toast({
        title: "AI 분석 완료",
        description: "심근경색 위험도 분석이 성공적으로 완료되었습니다.",
        duration: 3000,
      });
    } catch (error) {
      console.error('AI 헬퍼 분석 오류:', error);
      toast({
        title: "AI 분석 실패",
        description: "심근경색 위험도 분석 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };
  
  // 임시 건강 데이터 생성 (실제 구현에서는 제거)
  const generateMockHealthData = () => {
    return {
      heartRate: Math.floor(Math.random() * (110 - 65) + 65),
      bloodPressureSystolic: Math.floor(Math.random() * (160 - 110) + 110),
      bloodPressureDiastolic: Math.floor(Math.random() * (100 - 70) + 70),
      oxygenLevel: Math.floor(Math.random() * (100 - 94) + 94),
    };
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          심장마비 위험도 분석
          <span className="ml-2 px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
            AI 기반 분석
          </span>
        </h2>

        <div className="bg-[#f8fafb] p-4 rounded-xl mb-4">
          <div className="text-center mb-3">
            <div className="text-sm text-[#507695] mb-1">현재 위험도</div>
            <div className="inline-flex items-center">
              <span className="text-3xl font-bold">
                {healthData?.riskLevel || 20}%
              </span>
              <span className={`ml-2 px-2 py-1 text-sm font-medium rounded-lg ${
                (healthData?.riskLevel || 20) < 25 ? 'bg-green-100 text-green-800' :
                (healthData?.riskLevel || 20) < 50 ? 'bg-yellow-100 text-yellow-800' :
                (healthData?.riskLevel || 20) < 75 ? 'bg-orange-100 text-orange-800' :
                'bg-red-100 text-red-800'
              }`}>
                {getRiskStatusDescription(healthData?.riskLevel || 20)}
              </span>
            </div>
          </div>
          
          <Progress 
            value={healthData?.riskLevel || 20} 
            className={`h-3 mb-1 ${
              (healthData?.riskLevel || 20) < 25 ? '[&>div]:bg-green-500' :
              (healthData?.riskLevel || 20) < 50 ? '[&>div]:bg-yellow-500' :
              (healthData?.riskLevel || 20) < 75 ? '[&>div]:bg-orange-500' :
              '[&>div]:bg-red-500'
            }`}
          />
          
          <div className="flex justify-between text-xs text-[#507695]">
            <span>낮음</span>
            <span>중간</span>
            <span>높음</span>
            <span>심각</span>
          </div>
        </div>

        <Tabs defaultValue="risk-calculator" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="risk-calculator">위험도 계산기</TabsTrigger>
            <TabsTrigger value="health-assessment">건강 자가진단</TabsTrigger>
            <TabsTrigger value="multimodal-analysis">AI 위험도</TabsTrigger>
          </TabsList>

          {/* Risk Calculator Tab */}
          <TabsContent value="risk-calculator" className="py-4 space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">연령 설정</h3>
              <div className="flex items-center gap-4">
                <Slider
                  defaultValue={[40]}
                  max={100}
                  min={20}
                  step={1}
                  value={[age]}
                  onValueChange={(val) => setAge(val[0])}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-12 text-right">{age}세</span>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">위험 요소 선택</h3>
              <div className="grid grid-cols-2 gap-2">
                {riskFactors.map((factor) => (
                  <div key={factor.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={factor.id} 
                      checked={selectedFactors.includes(factor.id)} 
                      onCheckedChange={() => handleFactorToggle(factor.id)}
                    />
                    <Label htmlFor={factor.id} className="cursor-pointer text-sm">{factor.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">생체 지표 설정</h3>
                <div className="flex items-center gap-2">
                  <ConnectionStatusIndicator 
                    connected={watchConnected}
                    type="websocket"
                    size="sm"
                    showText={false}
                  />
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="h-7 px-2 text-xs flex items-center gap-1"
                    onClick={syncVitalSignsFromWatch}
                    disabled={!watchConnected || syncingData}
                  >
                    <RefreshCw className={`h-3 w-3 ${syncingData ? 'animate-spin' : ''}`} />
                    {syncingData ? '동기화 중...' : '스마트워치에서 동기화'}
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center">
                    <label className="text-sm text-[#507695]">심박수 (BPM)</label>
                    <span className="text-sm font-medium">{heartRate} BPM</span>
                  </div>
                  <Slider
                    defaultValue={[72]}
                    max={180}
                    min={40}
                    step={1}
                    value={[heartRate]}
                    onValueChange={(val) => setHeartRate(val[0])}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center">
                    <label className="text-sm text-[#507695]">수축기 혈압 (mmHg)</label>
                    <span className="text-sm font-medium">{systolic} mmHg</span>
                  </div>
                  <Slider
                    defaultValue={[120]}
                    max={220}
                    min={70}
                    step={1}
                    value={[systolic]}
                    onValueChange={(val) => setSystolic(val[0])}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center">
                    <label className="text-sm text-[#507695]">이완기 혈압 (mmHg)</label>
                    <span className="text-sm font-medium">{diastolic} mmHg</span>
                  </div>
                  <Slider
                    defaultValue={[80]}
                    max={140}
                    min={40}
                    step={1}
                    value={[diastolic]}
                    onValueChange={(val) => setDiastolic(val[0])}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center">
                    <label className="text-sm text-[#507695]">산소포화도 (%)</label>
                    <span className="text-sm font-medium">{oxygenSaturation}%</span>
                  </div>
                  <Slider
                    defaultValue={[98]}
                    max={100}
                    min={80}
                    step={1}
                    value={[oxygenSaturation]}
                    onValueChange={(val) => setOxygenSaturation(val[0])}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={calculateMyRisk} className="flex-1">
                위험도 계산하기
              </Button>
              <Button variant="outline" onClick={resetCalculator} className="flex-1">
                초기화
              </Button>
            </div>
          </TabsContent>

          {/* Health Assessment Tab */}
          <TabsContent value="health-assessment" className="py-4 space-y-4">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium">규칙적인 운동 여부</h3>
                  <span className="text-sm">{assessmentAnswers.exercise}/5</span>
                </div>
                <Slider
                  defaultValue={[0]}
                  max={5}
                  min={0}
                  step={1}
                  value={[assessmentAnswers.exercise]}
                  onValueChange={(val) => handleAssessmentChange('exercise', val[0])}
                />
                <div className="flex justify-between text-xs text-[#507695] mt-1">
                  <span>전혀 안함</span>
                  <span>매우 활발함</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium">건강한 식습관 유지</h3>
                  <span className="text-sm">{assessmentAnswers.diet}/5</span>
                </div>
                <Slider
                  defaultValue={[0]}
                  max={5}
                  min={0}
                  step={1}
                  value={[assessmentAnswers.diet]}
                  onValueChange={(val) => handleAssessmentChange('diet', val[0])}
                />
                <div className="flex justify-between text-xs text-[#507695] mt-1">
                  <span>매우 불량</span>
                  <span>매우 양호</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium">흡연 정도</h3>
                  <span className="text-sm">{assessmentAnswers.smoking}/5</span>
                </div>
                <Slider
                  defaultValue={[0]}
                  max={5}
                  min={0}
                  step={1}
                  value={[assessmentAnswers.smoking]}
                  onValueChange={(val) => handleAssessmentChange('smoking', val[0])}
                />
                <div className="flex justify-between text-xs text-[#507695] mt-1">
                  <span>매일 흡연</span>
                  <span>비흡연</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium">음주 정도</h3>
                  <span className="text-sm">{assessmentAnswers.alcohol}/5</span>
                </div>
                <Slider
                  defaultValue={[0]}
                  max={5}
                  min={0}
                  step={1}
                  value={[assessmentAnswers.alcohol]}
                  onValueChange={(val) => handleAssessmentChange('alcohol', val[0])}
                />
                <div className="flex justify-between text-xs text-[#507695] mt-1">
                  <span>과도한 음주</span>
                  <span>전혀 안함</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium">스트레스 관리</h3>
                  <span className="text-sm">{assessmentAnswers.stress}/5</span>
                </div>
                <Slider
                  defaultValue={[0]}
                  max={5}
                  min={0}
                  step={1}
                  value={[assessmentAnswers.stress]}
                  onValueChange={(val) => handleAssessmentChange('stress', val[0])}
                />
                <div className="flex justify-between text-xs text-[#507695] mt-1">
                  <span>매우 스트레스 많음</span>
                  <span>관리 잘함</span>
                </div>
              </div>

              <div className="bg-[#f8fafb] p-4 rounded-xl">
                <div className="text-center mb-3">
                  <div className="text-sm text-[#507695] mb-1">자가진단 결과</div>
                  <div className="inline-flex items-center">
                    <span className="text-3xl font-bold">
                      {getAssessmentScore()}점
                    </span>
                    <span className={`ml-2 px-2 py-1 text-sm font-medium rounded-lg ${
                      getAssessmentScore() > 80 ? 'bg-green-100 text-green-800' :
                      getAssessmentScore() > 60 ? 'bg-[#e8eef3] text-[#2c90e2]' :
                      getAssessmentScore() > 40 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {getAssessmentScore() > 80 ? '매우 좋음' :
                       getAssessmentScore() > 60 ? '양호' :
                       getAssessmentScore() > 40 ? '개선 필요' :
                       '위험'}
                    </span>
                  </div>
                </div>
                
                <Progress 
                  value={getAssessmentScore()} 
                  className={`h-3 mb-1 ${
                    getAssessmentScore() > 80 ? '[&>div]:bg-green-500' :
                    getAssessmentScore() > 60 ? '[&>div]:bg-primary' :
                    getAssessmentScore() > 40 ? '[&>div]:bg-yellow-500' :
                    '[&>div]:bg-red-500'
                  }`}
                />
              </div>

              <Button onClick={() => simulateRiskLevel(100 - getAssessmentScore())} className="w-full">
                결과 반영하기
              </Button>
            </div>
          </TabsContent>
          
          {/* Multimodal AI Analysis Tab */}
          <TabsContent value="multimodal-analysis" className="py-4 space-y-4">
            <div className="flex flex-col space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold">멀티모달 HAIM 분석</h3>
                <div className="flex items-center gap-2">
                  <ConnectionStatusIndicator 
                    connected={watchConnected}
                    type="websocket"
                    size="sm"
                    showText={false}
                  />
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="h-7 px-2 text-xs flex items-center gap-1"
                    onClick={syncVitalSignsFromWatch}
                    disabled={!watchConnected || syncingData}
                  >
                    <RefreshCw className={`h-3 w-3 ${syncingData ? 'animate-spin' : ''}`} />
                    {syncingData ? '동기화 중...' : '데이터 새로고침'}
                  </Button>
                </div>
              </div>
              
              <div className="border border-[#FFD6D6] bg-white shadow-sm rounded-2xl p-4">
                <div className="text-sm font-medium mb-2">AI 헬퍼 모델</div>
                <p className="text-xs text-gray-600 mb-3">
                  ECG, 심박수, 산소포화도 데이터를 멀티모달 분석하여 심근경색 위험도를 평가합니다.
                  이 모델은 Medical Information Mart for Intensive Care (MIMIC) 데이터셋을 기반으로 훈련되었습니다.
                </p>
                
                <div className="grid grid-cols-2 gap-3 mt-2 mb-3">
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="text-xs text-gray-500 mb-1">심박수 샘플 수</div>
                    <div className="text-sm font-medium">{heartRateData.length || 0}개</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="text-xs text-gray-500 mb-1">ECG 데이터 길이</div>
                    <div className="text-sm font-medium">{ecgData.length || 0}개</div>
                  </div>
                </div>
                
                <Button 
                  onClick={performHaimAnalysis} 
                  className="w-full bg-[#FF0000] hover:bg-[#CC0000] text-white"
                  disabled={analyzing}
                >
                  {analyzing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      AI 분석 중...
                    </>
                  ) : 'AI 헬퍼 심장 위험도 분석 실행'}
                </Button>
              </div>
              
              <MultimodalAnalysisCard
                ecgData={ecgData}
                heartRates={heartRateData}
                oxygenLevels={oxygenLevelData}
                lastUpdated={lastUpdated}
                riskScore={healthData?.riskLevel || 20}
                stDeviation={stDeviation}
                arrhythmia={arrhythmia}
              />
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      <Card className="p-5">
        <h2 className="text-lg font-semibold mb-4">위험도 감소를 위한 권장사항</h2>
        
        <div className="space-y-3">
          <div className="flex items-start">
            <div className="w-8 h-8 rounded-full bg-[#e8eef3] flex items-center justify-center mr-2 mt-1 flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-[#0e151b]">규칙적인 운동</h3>
              <p className="text-xs text-[#507695]">주 5회, 30분 이상의 유산소 운동을 통해 심장 건강을 향상시킬 수 있습니다. 걷기, 수영, 자전거 타기 등의 활동이 효과적입니다.</p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="w-8 h-8 rounded-full bg-[#e8eef3] flex items-center justify-center mr-2 mt-1 flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-[#0e151b]">건강한 식단</h3>
              <p className="text-xs text-[#507695]">신선한 과일, 채소, 통곡물, 저지방 단백질을 많이 섭취하고, 소금, 포화지방, 트랜스지방, 가공식품의 섭취를 줄이세요.</p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="w-8 h-8 rounded-full bg-[#e8eef3] flex items-center justify-center mr-2 mt-1 flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7 2a1 1 0 00-.707 1.707L7 4.414v3.758a1 1 0 01-.293.707l-4 4C.817 14.769 2.156 18 4.828 18h10.343c2.673 0 4.012-3.231 2.122-5.121l-4-4A1 1 0 0113 8.172V4.414l.707-.707A1 1 0 0013 2H7zm2 6.172V4h2v4.172a3 3 0 00.879 2.12l1.027 1.028a4 4 0 00-2.171.102l-.47.156a4 4 0 01-2.53 0l-.563-.187a1.993 1.993 0 00-.114-.035l1.063-1.063A3 3 0 009 8.172z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-[#0e151b]">금연</h3>
              <p className="text-xs text-[#507695]">흡연은 심장 질환 위험을 크게 높입니다. 금연은 즉시 심장 건강에 긍정적인 영향을 줍니다.</p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="w-8 h-8 rounded-full bg-[#e8eef3] flex items-center justify-center mr-2 mt-1 flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-[#0e151b]">혈압 및 콜레스테롤 관리</h3>
              <p className="text-xs text-[#507695]">정기적인 검진을 통해 혈압과 콜레스테롤 수치를 확인하고, 필요한 경우 약물 치료를 포함한 의사의 지시에 따르세요.</p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="w-8 h-8 rounded-full bg-[#e8eef3] flex items-center justify-center mr-2 mt-1 flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-[#0e151b]">스트레스 관리</h3>
              <p className="text-xs text-[#507695]">명상, 요가, 취미 활동 등을 통해 스트레스를 줄이고 정신 건강을 개선하세요.</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default RiskAnalysis;
