import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { Heart, Activity, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AlertDetailDialogProps {
  trigger: React.ReactNode;
  alertId?: number;
  healthDataId?: number;
  ecgRecordingId?: number;
  title?: string;
  description?: string;
}

export default function AlertDetailDialog({
  trigger,
  alertId,
  healthDataId,
  ecgRecordingId,
  title = "상세 건강 데이터",
  description = "관련된 건강 데이터를 자세히 확인할 수 있습니다."
}: AlertDetailDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>({
    healthData: null,
    ecgData: null,
    aiAnalysis: null
  });

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, alertId, healthDataId, ecgRecordingId]);

  const fetchData = async () => {
    setLoading(true);
    
    try {
      // 건강 데이터 가져오기
      if (healthDataId) {
        const healthDataRes = await apiRequest(`/api/health-data/${healthDataId}`);
        if (healthDataRes.ok) {
          const healthData = await healthDataRes.json();
          setData(prev => ({ ...prev, healthData }));
        }
      }
      
      // ECG 데이터 가져오기
      if (ecgRecordingId) {
        const ecgDataRes = await apiRequest(`/api/ecg-recordings/${ecgRecordingId}`);
        if (ecgDataRes.ok) {
          const ecgData = await ecgDataRes.json();
          setData(prev => ({ ...prev, ecgData }));
        }
      }
      
      // AI 분석 가져오기 (마지막 분석 데이터)
      if (alertId) {
        const alertRes = await apiRequest(`/api/alerts/${alertId}`);
        if (alertRes.ok) {
          const alert = await alertRes.json();
          
          if (alert.aiAnalysisId) {
            const aiAnalysisRes = await apiRequest(`/api/ai-analyses/${alert.aiAnalysisId}`);
            if (aiAnalysisRes.ok) {
              const aiAnalysis = await aiAnalysisRes.json();
              setData(prev => ({ ...prev, aiAnalysis }));
            }
          }
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      toast({
        variant: "destructive",
        title: "오류",
        description: "데이터를 불러오는 중 문제가 발생했습니다."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="vital" disabled={!data.healthData}>활력 징후</TabsTrigger>
            <TabsTrigger value="ecg" disabled={!data.ecgData}>ECG 데이터</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4 py-4">
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <>
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                        <div>
                          <h3 className="text-base font-semibold">알림 상세 정보</h3>
                          <p className="text-sm text-gray-500">{data.healthData?.recordedAt ? new Date(data.healthData.recordedAt).toLocaleString() : "날짜 정보 없음"}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">심박수</h4>
                          <p className="text-lg font-semibold">{data.healthData?.heartRate || "-"} <span className="text-xs text-gray-500">bpm</span></p>
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">혈압</h4>
                          <p className="text-lg font-semibold">
                            {data.healthData?.bloodPressureSystolic || "-"}/{data.healthData?.bloodPressureDiastolic || "-"} <span className="text-xs text-gray-500">mmHg</span>
                          </p>
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">산소 포화도</h4>
                          <p className="text-lg font-semibold">{data.healthData?.oxygenLevel || "-"} <span className="text-xs text-gray-500">%</span></p>
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">위험도</h4>
                          <p className="text-lg font-semibold">{data.healthData?.riskLevel || "-"} <span className="text-xs text-gray-500">%</span></p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {data.aiAnalysis && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <h3 className="text-base font-semibold">AI 분석 결과</h3>
                        <p className="text-sm text-gray-700">{data.aiAnalysis.result?.summary || "분석 결과 요약 없음"}</p>
                        
                        {data.aiAnalysis.result?.recommendations && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">권장 사항</h4>
                            <ul className="text-sm space-y-1">
                              {data.aiAnalysis.result.recommendations.map((rec: string, idx: number) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-primary">•</span>
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
          
          <TabsContent value="vital" className="space-y-4 py-4">
            {data.healthData ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <Activity className="h-5 w-5 text-blue-500" />
                      <div>
                        <h3 className="text-base font-semibold">활력 징후 데이터</h3>
                        <p className="text-sm text-gray-500">{data.healthData.recordedAt ? new Date(data.healthData.recordedAt).toLocaleString() : "날짜 정보 없음"}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <VitalDataItem 
                        title="심박수" 
                        value={data.healthData.heartRate} 
                        unit="bpm"
                        icon={<Heart className="h-5 w-5 text-red-500" />}
                        description="정상 범위: 60-100 bpm"
                        status={getVitalStatus("heartRate", data.healthData.heartRate)}
                      />
                      
                      <VitalDataItem 
                        title="혈압" 
                        value={`${data.healthData.bloodPressureSystolic}/${data.healthData.bloodPressureDiastolic}`} 
                        unit="mmHg"
                        description="정상 범위: 90-120/60-80 mmHg"
                        status={getVitalStatus("bloodPressure", {
                          systolic: data.healthData.bloodPressureSystolic,
                          diastolic: data.healthData.bloodPressureDiastolic
                        })}
                      />
                      
                      <VitalDataItem 
                        title="산소 포화도" 
                        value={data.healthData.oxygenLevel} 
                        unit="%"
                        description="정상 범위: 95-100%"
                        status={getVitalStatus("oxygenLevel", data.healthData.oxygenLevel)}
                      />
                      
                      <VitalDataItem 
                        title="체온" 
                        value={data.healthData.temperature} 
                        unit="°C"
                        description="정상 범위: 36.1-37.2°C"
                        status={getVitalStatus("temperature", data.healthData.temperature)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex items-center justify-center h-40">
                <p className="text-gray-500">활력 징후 데이터가 없습니다.</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="ecg" className="space-y-4 py-4">
            {data.ecgData ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <Heart className="h-5 w-5 text-red-500" />
                      <div>
                        <h3 className="text-base font-semibold">ECG 측정 데이터</h3>
                        <p className="text-sm text-gray-500">{data.ecgData.recordedAt ? new Date(data.ecgData.recordedAt).toLocaleString() : "날짜 정보 없음"}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">측정 시간</h4>
                        <p className="text-base">{Math.floor(data.ecgData.duration / 60)}분 {data.ecgData.duration % 60}초</p>
                      </div>
                      
                      {data.ecgData.abnormalities && data.ecgData.abnormalities.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">감지된 이상</h4>
                          <ul className="text-sm space-y-1">
                            {data.ecgData.abnormalities.map((abnormality: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-red-500">•</span>
                                <span>{abnormality}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {data.ecgData.analysis && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">분석 결과</h4>
                          <p className="text-sm">{data.ecgData.analysis.summary || "분석 결과 요약 없음"}</p>
                        </div>
                      )}
                      
                      <div className="pt-2">
                        <h4 className="text-sm font-medium mb-2">ECG 데이터 시각화</h4>
                        <div className="bg-slate-50 h-28 rounded-md border flex items-center justify-center">
                          <p className="text-sm text-gray-500">ECG 그래프 (미리보기 불가)</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">전체 ECG 데이터를 보시려면 "ECG 모니터링" 페이지를 이용하세요.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex items-center justify-center h-40">
                <p className="text-gray-500">ECG 데이터가 없습니다.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

interface VitalDataItemProps {
  title: string;
  value: number | string;
  unit: string;
  icon?: React.ReactNode;
  description?: string;
  status?: "normal" | "warning" | "critical" | "unknown";
}

function VitalDataItem({ title, value, unit, icon, description, status = "unknown" }: VitalDataItemProps) {
  const statusColors = {
    normal: "text-green-600",
    warning: "text-amber-600",
    critical: "text-red-600",
    unknown: "text-gray-600"
  };

  const bgColors = {
    normal: "bg-green-50",
    warning: "bg-amber-50",
    critical: "bg-red-50",
    unknown: "bg-gray-50"
  };
  
  return (
    <div className={`p-3 rounded-lg ${bgColors[status]} border`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="text-sm font-medium">{title}</h4>
        </div>
        <div className={`text-lg font-semibold ${statusColors[status]}`}>
          {value} <span className="text-xs font-normal">{unit}</span>
        </div>
      </div>
      {description && (
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      )}
    </div>
  );
}

function getVitalStatus(type: string, value: any): "normal" | "warning" | "critical" | "unknown" {
  if (value === null || value === undefined) return "unknown";
  
  switch (type) {
    case "heartRate":
      const hr = Number(value);
      if (hr < 40) return "critical";
      if (hr < 60 || hr > 100) return "warning";
      if (hr > 150) return "critical";
      return "normal";
      
    case "bloodPressure":
      if (!value.systolic || !value.diastolic) return "unknown";
      
      const sys = Number(value.systolic);
      const dia = Number(value.diastolic);
      
      if (sys > 180 || dia > 120) return "critical";
      if (sys > 140 || dia > 90 || sys < 90 || dia < 60) return "warning";
      return "normal";
      
    case "oxygenLevel":
      const oxy = Number(value);
      if (oxy < 90) return "critical";
      if (oxy < 95) return "warning";
      return "normal";
      
    case "temperature":
      const temp = Number(value);
      if (temp > 39 || temp < 35) return "critical";
      if (temp > 37.5 || temp < 36) return "warning";
      return "normal";
      
    default:
      return "unknown";
  }
}