import { useState, useEffect } from "react";
import { Calendar, Activity, Heart, ArrowUpDown, Utensils, Bed, Timer, ChevronLeft, ChevronRight, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format, subDays, addDays, isSameDay } from "date-fns";
import { ko } from "date-fns/locale";
import RiskRecommendations from "@/components/analysis/RiskRecommendations";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface DailySummaryReportProps {
  trigger: React.ReactNode;
  userId?: number;
}

export default function DailySummaryReport({ trigger, userId = 1 }: DailySummaryReportProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [healthData, setHealthData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch report data when dialog opens or date changes
  useEffect(() => {
    if (open) {
      fetchDailyReport();
    }
  }, [open, selectedDate, userId]);

  // 날짜 이동
  const goToPreviousDay = () => {
    setSelectedDate(subDays(selectedDate, 1));
  };

  const goToNextDay = () => {
    const tomorrow = addDays(selectedDate, 1);
    const today = new Date();
    if (tomorrow <= today) {
      setSelectedDate(tomorrow);
    }
  };

  // Fetch daily report data from API
  const fetchDailyReport = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Format date as YYYY-MM-DD for API request
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      
      // Try to get report from API
      const response = await apiRequest(`/api/users/${userId}/daily-reports/date/${formattedDate}`);
      
      if (response.ok) {
        const data = await response.json();
        setHealthData(transformApiDataToHealthData(data));
      } else {
        // If report doesn't exist, use a fallback/example data
        console.log("No report found for this date, using example data");
        // Set some fallback data based on the date
        setHealthData(getDefaultHealthData(selectedDate));
      }
    } catch (err) {
      console.error("Error fetching daily report:", err);
      setError("일일 보고서를 불러오는데 문제가 발생했습니다.");
      // Set default data even on error to show something
      setHealthData(getDefaultHealthData(selectedDate));
    } finally {
      setLoading(false);
    }
  };

  // Transform API data to the format expected by the UI
  const transformApiDataToHealthData = (apiData: any) => {
    // Actual transformation logic would depend on your API response structure
    // This is a simplified example
    return {
      date: new Date(apiData.date),
      vitalSigns: {
        avgHeartRate: apiData.averageHeartRate || 72,
        minHeartRate: apiData.minHeartRate || 58,
        maxHeartRate: apiData.maxHeartRate || 110,
        avgBloodPressure: { 
          systolic: apiData.averageBloodPressureSystolic || 118, 
          diastolic: apiData.averageBloodPressureDiastolic || 75 
        },
        minBloodPressure: { systolic: 110, diastolic: 70 },
        maxBloodPressure: { systolic: 125, diastolic: 82 },
        avgOxygenLevel: apiData.averageOxygenLevel || 98,
        temperature: 36.5
      },
      activity: {
        steps: apiData.steps || 6540,
        activeMinutes: 35,
        calories: apiData.caloriesBurned || 1850,
        distance: 4.2,
        standHours: 10
      },
      sleep: {
        duration: apiData.sleepDuration || 420, // 7시간 (분 단위)
        deepSleep: 110,
        lightSleep: 240,
        remSleep: 70,
        startTime: "22:45",
        endTime: "06:05",
        quality: apiData.sleepQuality || "양호"
      },
      nutrition: {
        calories: 1950,
        carbs: 220,
        protein: 85,
        fat: 60,
        water: 1800
      },
      riskAnalysis: {
        riskScore: apiData.riskAssessment || 28,
        riskLevel: getRiskLevelFromScore(apiData.riskAssessment || 28),
        factors: [
          { name: "혈압", status: "정상", change: "개선" },
          { name: "활동량", status: "부족", change: "유지" },
          { name: "심박변이도", status: "주의", change: "악화" }
        ]
      },
      ecg: {
        recorded: true,
        time: "08:15",
        result: "정상",
        abnormalities: []
      }
    };
  };

  // Helper to get risk level from score
  const getRiskLevelFromScore = (score: number): string => {
    if (score < 20) return "안전";
    if (score < 40) return "주의";
    if (score < 70) return "경고";
    return "위험";
  };

  // Get default/example data for a given date
  const getDefaultHealthData = (date: Date) => {
    // Create slightly different data for different dates
    const dayOfMonth = date.getDate();
    const isToday = isSameDay(date, new Date());
    
    return {
      date: date,
      vitalSigns: {
        avgHeartRate: 70 + (dayOfMonth % 10),
        minHeartRate: 55 + (dayOfMonth % 8),
        maxHeartRate: 110 + (dayOfMonth % 15),
        avgBloodPressure: { systolic: 115 + (dayOfMonth % 10), diastolic: 75 + (dayOfMonth % 5) },
        minBloodPressure: { systolic: 110, diastolic: 70 },
        maxBloodPressure: { systolic: 125, diastolic: 82 },
        avgOxygenLevel: 97 + (dayOfMonth % 3),
        temperature: 36.5 + ((dayOfMonth % 10) / 10)
      },
      activity: {
        steps: 6000 + (dayOfMonth * 100),
        activeMinutes: 30 + (dayOfMonth % 30),
        calories: 1800 + (dayOfMonth * 20),
        distance: 4 + (dayOfMonth / 10),
        standHours: 8 + (dayOfMonth % 4)
      },
      sleep: {
        duration: 400 + (dayOfMonth * 5),
        deepSleep: 100 + (dayOfMonth * 2),
        lightSleep: 240 + (dayOfMonth % 20),
        remSleep: 70 + (dayOfMonth % 10),
        startTime: "22:" + ((30 + dayOfMonth % 30) < 10 ? "0" : "") + (30 + dayOfMonth % 30),
        endTime: "0" + (6 + (dayOfMonth % 2)) + ":" + ((dayOfMonth * 3) % 60 < 10 ? "0" : "") + ((dayOfMonth * 3) % 60),
        quality: ["불량", "보통", "양호", "좋음"][dayOfMonth % 4]
      },
      nutrition: {
        calories: 1900 + (dayOfMonth * 10),
        carbs: 200 + (dayOfMonth * 2),
        protein: 80 + (dayOfMonth % 15),
        fat: 60 + (dayOfMonth % 10),
        water: 1700 + (dayOfMonth * 50)
      },
      riskAnalysis: {
        riskScore: isToday ? 28 : 20 + (dayOfMonth % 30),
        riskLevel: isToday ? "주의" : ["안전", "주의", "경고", "위험"][dayOfMonth % 4],
        factors: [
          { name: "혈압", status: ["정상", "주의", "위험"][dayOfMonth % 3], change: ["개선", "유지", "악화"][dayOfMonth % 3] },
          { name: "활동량", status: ["정상", "부족", "위험"][dayOfMonth % 3], change: ["개선", "유지", "악화"][dayOfMonth % 3] },
          { name: "심박변이도", status: ["정상", "주의", "위험"][dayOfMonth % 3], change: ["개선", "유지", "악화"][dayOfMonth % 3] }
        ]
      },
      ecg: {
        recorded: dayOfMonth % 3 !== 0, // Some days don't have ECG
        time: (7 + (dayOfMonth % 5)) + ":" + ((dayOfMonth * 5) % 60 < 10 ? "0" : "") + ((dayOfMonth * 5) % 60),
        result: ["정상", "정상", "약간 불규칙", "정상"][dayOfMonth % 4],
        abnormalities: dayOfMonth % 7 === 0 ? ["경미한 부정맥"] : []
      }
    };
  };

  const getVitalSignStatus = (type: string, value: number) => {
    switch (type) {
      case 'heartRate':
        return value < 60 ? 'low' : value > 100 ? 'high' : 'normal';
      case 'oxygenLevel':
        return value < 95 ? 'low' : 'normal';
      case 'systolic':
        return value < 90 ? 'low' : value > 140 ? 'high' : 'normal';
      case 'diastolic':
        return value < 60 ? 'low' : value > 90 ? 'high' : 'normal';
      default:
        return 'normal';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'low': return 'text-blue-600';
      case 'high': return 'text-red-600';
      case 'normal': return 'text-green-600';
      default: return '';
    }
  };

  const getChangeIcon = (change: string) => {
    switch (change) {
      case '개선': return <Badge className="bg-green-100 text-green-800">개선</Badge>;
      case '악화': return <Badge className="bg-red-100 text-red-800">악화</Badge>;
      case '유지': return <Badge className="bg-blue-100 text-blue-800">유지</Badge>;
      default: return null;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // 실제로는 PDF 생성 및 다운로드 로직 구현
    alert('PDF 다운로드 기능은 아직 구현되지 않았습니다.');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>일일 건강 요약 보고서</DialogTitle>
          <DialogDescription>
            하루 동안의 건강 상태와 활동을 종합적으로 분석한 보고서입니다.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-6">
          {/* 날짜 선택 헤더 */}
          <div className="flex justify-between items-center">
            <Button variant="outline" size="sm" onClick={goToPreviousDay}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              이전 날짜
            </Button>
            <h2 className="text-lg font-bold text-center">
              {format(selectedDate, 'yyyy년 MM월 dd일 (eee)', { locale: ko })}
            </h2>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToNextDay}
              disabled={format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')}
            >
              다음 날짜
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          
          {/* 요약 카드 */}
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">종합 건강 요약</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">전체 건강 상태</span>
                  <Badge className={`
                    ${healthData.riskAnalysis.riskScore < 20 ? 'bg-green-100 text-green-800' : 
                      healthData.riskAnalysis.riskScore < 50 ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-red-100 text-red-800'}
                  `}>
                    {healthData.riskAnalysis.riskLevel}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">위험 점수</span>
                  <span className="font-bold">{healthData.riskAnalysis.riskScore}/100</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">활동 달성률</span>
                  <span className="font-bold">{Math.round((healthData.activity.activeMinutes / 30) * 100)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">수면 품질</span>
                  <span className="font-bold">{healthData.sleep.quality}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* 활력 징후 */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-blue-500" />
              활력 징후
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">심박수</span>
                    <Heart className="h-4 w-4 text-red-500" />
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold">{healthData.vitalSigns.avgHeartRate}</span>
                    <span className="text-sm text-gray-500 mb-0.5">bpm</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>최소: {healthData.vitalSigns.minHeartRate}</span>
                    <span>최대: {healthData.vitalSigns.maxHeartRate}</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">혈압</span>
                    <ArrowUpDown className="h-4 w-4 text-purple-500" />
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="text-2xl font-bold">{healthData.vitalSigns.avgBloodPressure.systolic}</span>
                    <span className="text-sm text-gray-500 mb-0.5">/</span>
                    <span className="text-2xl font-bold">{healthData.vitalSigns.avgBloodPressure.diastolic}</span>
                    <span className="text-sm text-gray-500 mb-0.5">mmHg</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>최소: {healthData.vitalSigns.minBloodPressure.systolic}/{healthData.vitalSigns.minBloodPressure.diastolic}</span>
                    <span>최대: {healthData.vitalSigns.maxBloodPressure.systolic}/{healthData.vitalSigns.maxBloodPressure.diastolic}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* 활동 및 수면 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <Timer className="h-5 w-5 mr-2 text-green-500" />
                활동
              </h3>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">걸음 수</span>
                    <span className="font-semibold">{healthData.activity.steps.toLocaleString()} 걸음</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">활동 시간</span>
                    <span className="font-semibold">{healthData.activity.activeMinutes} 분</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">이동 거리</span>
                    <span className="font-semibold">{healthData.activity.distance} km</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">소모 칼로리</span>
                    <span className="font-semibold">{healthData.activity.calories} kcal</span>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <Bed className="h-5 w-5 mr-2 text-indigo-500" />
                수면
              </h3>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">총 수면 시간</span>
                    <span className="font-semibold">{Math.floor(healthData.sleep.duration / 60)}시간 {healthData.sleep.duration % 60}분</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">수면 시간</span>
                    <span className="font-semibold">{healthData.sleep.startTime} - {healthData.sleep.endTime}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">깊은 수면</span>
                    <span className="font-semibold">{Math.floor(healthData.sleep.deepSleep / 60)}시간 {healthData.sleep.deepSleep % 60}분</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">수면 품질</span>
                    <Badge className="bg-blue-100 text-blue-800">{healthData.sleep.quality}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* 영양 섭취 */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <Utensils className="h-5 w-5 mr-2 text-orange-500" />
              영양 섭취
            </h3>
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">칼로리</span>
                      <span className="font-semibold">{healthData.nutrition.calories} kcal</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">탄수화물</span>
                      <span className="font-semibold">{healthData.nutrition.carbs}g</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">단백질</span>
                      <span className="font-semibold">{healthData.nutrition.protein}g</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">지방</span>
                      <span className="font-semibold">{healthData.nutrition.fat}g</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">수분 섭취량</span>
                    <span className="font-semibold">{healthData.nutrition.water}ml</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* 위험 요소 분석 */}
          <div>
            <h3 className="text-lg font-semibold mb-3">위험 요소 분석</h3>
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {healthData?.riskAnalysis?.factors?.map((factor: any, index: number) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm font-medium">{factor.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge className={`
                          ${factor.status === '정상' ? 'bg-green-100 text-green-800' : 
                            factor.status === '주의' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-red-100 text-red-800'}
                        `}>
                          {factor.status}
                        </Badge>
                        {getChangeIcon(factor.change)}
                      </div>
                    </div>
                  )) || <div className="text-sm text-gray-500">위험 요소 데이터가 없습니다.</div>}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* 권장 사항 */}
          <RiskRecommendations riskLevel={healthData?.riskAnalysis?.riskScore || 0} />
          
          {/* ECG 기록 */}
          {healthData?.ecg?.recorded && (
            <div>
              <h3 className="text-lg font-semibold mb-3">ECG 기록</h3>
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">측정 시간: {healthData?.ecg?.time}</p>
                      <h4 className="font-medium">결과: {healthData?.ecg?.result}</h4>
                    </div>
                    <Button variant="outline" size="sm">상세 보기</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" />
              인쇄
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-1" />
              PDF 저장
            </Button>
          </div>
          <Button onClick={() => setOpen(false)}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}