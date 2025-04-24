import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useApp } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, Heart, Activity, Thermometer, Droplet, AlertCircle, Phone, Info, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MedicalInfoTooltip from "@/components/medical/MedicalInfoTooltip";
import MedicalInfoEditDialog from "@/components/medical/MedicalInfoEditDialog";
import ECGRequestDialog from "@/components/ecg/ECGRequestDialog";
import AIChatDialog from "@/components/ai/AIChatDialog";

export default function PatientDetail() {
  const { patientId } = useParams<{ patientId: string }>();
  const [, navigate] = useLocation();
  const { guardianPatients } = useApp();
  const { toast } = useToast();
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = parseInt(patientId);
    
    // Find the patient in the guardianPatients array
    const foundPatient = guardianPatients.find(p => p.id === id);
    
    if (foundPatient) {
      setPatient(foundPatient);
    } else {
      // If patient is not found in the context, fetch from API
      const fetchPatient = async () => {
        try {
          const response = await fetch(`/api/users/${id}`);
          const userData = await response.json();
          
          // Also fetch the latest health data
          const healthResponse = await fetch(`/api/users/${id}/health-data/latest`);
          const healthData = await healthResponse.json();
          
          setPatient({
            ...userData,
            healthData
          });
        } catch (error) {
          console.error("Error fetching patient data:", error);
        } finally {
          setLoading(false);
        }
      };
      
      fetchPatient();
    }
  }, [patientId, guardianPatients]);

  if (loading && !patient) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">환자 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-4">
        <Button variant="ghost" onClick={() => navigate("/")}>
          <ChevronLeft className="mr-2 h-4 w-4" /> 돌아가기
        </Button>
        <Card className="mt-4">
          <CardContent className="pt-6 flex flex-col items-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">환자 정보를 찾을 수 없습니다</h2>
            <p className="text-gray-500 text-center mb-4">
              요청하신 환자 정보를 찾을 수 없습니다. ID를 확인해주세요.
            </p>
            <Button onClick={() => navigate("/")}>홈으로 돌아가기</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const riskLevel = patient.healthData?.riskLevel || 0;
  const getRiskClass = () => {
    if (riskLevel < 25) return "text-green-500";
    if (riskLevel < 50) return "text-yellow-500";
    if (riskLevel < 75) return "text-orange-500";
    return "text-red-500";
  };

  const getRiskBgClass = () => {
    if (riskLevel < 25) return "bg-green-100";
    if (riskLevel < 50) return "bg-yellow-100";
    if (riskLevel < 75) return "bg-orange-100";
    return "bg-red-100";
  };

  const getRiskStatus = () => {
    if (riskLevel < 25) return "정상";
    if (riskLevel < 50) return "주의";
    if (riskLevel < 75) return "위험";
    return "심각";
  };

  return (
    <div className="p-4">
      <Button variant="ghost" onClick={() => navigate("/")}>
        <ChevronLeft className="mr-2 h-4 w-4" /> 돌아가기
      </Button>

      <div className="flex items-center justify-between mt-4">
        <h1 className="text-2xl font-bold">{patient.name}</h1>
        <Badge className={getRiskBgClass() + " " + getRiskClass()}>
          {getRiskStatus()}
        </Badge>
      </div>
      
      <p className="text-sm text-gray-500 mb-4">
        {patient.age}세 {patient.gender === 'male' ? '남성' : '여성'} | 
        {patient.medicalConditions?.join(', ') || '기저질환 없음'}
      </p>

      {/* 위험도 게이지 */}
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold">심근경색 위험도</h3>
            <span className={`text-xl font-bold ${getRiskClass()}`}>{riskLevel}%</span>
          </div>
          <Progress 
            value={riskLevel} 
            className={`h-3 ${riskLevel < 25 ? 'bg-green-500' : riskLevel < 50 ? 'bg-yellow-500' : riskLevel < 75 ? 'bg-orange-500' : 'bg-red-500'}`}
          />
        </CardContent>
      </Card>

      {/* 실시간 바이탈 정보 */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">실시간 건강 지표</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <div className={`p-2 rounded-full ${getRiskBgClass()} mr-3`}>
                <Heart className={`h-5 w-5 ${getRiskClass()}`} />
              </div>
              <div>
                <div className="text-sm text-gray-500">심박수</div>
                <div className="font-bold">{patient.healthData?.heartRate || '--'} bpm</div>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-blue-100 mr-3">
                <Droplet className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="text-sm text-gray-500">산소포화도</div>
                <div className="font-bold">{patient.healthData?.oxygenLevel || '--'}%</div>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-purple-100 mr-3">
                <Activity className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <div className="text-sm text-gray-500">혈압</div>
                <div className="font-bold">
                  {patient.healthData?.bloodPressureSystolic || '--'}/{patient.healthData?.bloodPressureDiastolic || '--'} mmHg
                </div>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-orange-100 mr-3">
                <Thermometer className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <div className="text-sm text-gray-500">체온</div>
                <div className="font-bold">{patient.healthData?.temperature || '--'} °C</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 의료 정보 및 진료 내역 탭 */}
      <Tabs defaultValue="medical-info" className="mb-4">
        <TabsList className="w-full">
          <TabsTrigger value="medical-info" className="flex-1">의료 정보</TabsTrigger>
          <TabsTrigger value="ecg-history" className="flex-1">ECG 기록</TabsTrigger>
          <TabsTrigger value="consultations" className="flex-1">진료 내역</TabsTrigger>
        </TabsList>
        
        <TabsContent value="medical-info">
          <Card>
            <CardHeader className="pb-2 pt-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base">의료 정보</CardTitle>
                <MedicalInfoEditDialog
                  trigger={
                    <Button variant="outline" size="sm">
                      <Edit className="h-3.5 w-3.5 mr-1" />
                      수정
                    </Button>
                  }
                  patient={patient}
                  onSave={(updatedInfo) => {
                    // 업데이트된 환자 정보로 상태 업데이트
                    setPatient((prev: any) => ({
                      ...prev,
                      ...updatedInfo
                    }));
                    
                    // 토스트 알림 표시
                    toast({
                      title: "정보 업데이트 완료",
                      description: "환자의 의료 정보가 업데이트되었습니다.",
                    });
                  }}
                />
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">혈액형</span>
                  <span className="font-medium">{patient.bloodType || 'A+'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">알레르기</span>
                  <span className="font-medium">{patient.allergies || '페니실린, 조개류'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">복용 약물</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    <MedicalInfoTooltip type="medication" name="아스피린">
                      <span className="font-medium flex items-center">
                        아스피린
                        <Info className="h-3 w-3 ml-0.5 text-blue-500" />
                      </span>
                    </MedicalInfoTooltip>
                    <span>, </span>
                    <MedicalInfoTooltip type="medication" name="리피토">
                      <span className="font-medium flex items-center">
                        리피토
                        <Info className="h-3 w-3 ml-0.5 text-blue-500" />
                      </span>
                    </MedicalInfoTooltip>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">병력</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    <MedicalInfoTooltip type="condition" name="고혈압">
                      <span className="font-medium flex items-center">
                        고혈압
                        <AlertCircle className="h-3 w-3 ml-0.5 text-red-500" />
                      </span>
                    </MedicalInfoTooltip>
                    <span>, </span>
                    <MedicalInfoTooltip type="condition" name="당뇨">
                      <span className="font-medium flex items-center">
                        당뇨
                        <AlertCircle className="h-3 w-3 ml-0.5 text-red-500" />
                      </span>
                    </MedicalInfoTooltip>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">담당의</span>
                  <span className="font-medium">{patient.doctor || '김인술 교수 (강남세브란스)'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="ecg-history">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Activity className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold mb-2">ECG 기록</h3>
                <p className="text-sm text-gray-500 mb-4">
                  최근 ECG 기록이 없습니다.
                </p>
                <ECGRequestDialog 
                  trigger={<Button variant="outline" size="sm">ECG 측정 요청</Button>}
                  onComplete={(data) => {
                    toast({
                      title: "ECG 측정 완료",
                      description: "측정 결과가 저장되었습니다.",
                    });
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="consultations">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <h3 className="text-lg font-semibold mb-2">진료 내역</h3>
                <p className="text-sm text-gray-500 mb-4">
                  최근 진료 내역이 없습니다.
                </p>
                <AIChatDialog
                  title="AI 진단 분석"
                  description="환자의 건강 데이터를 바탕으로 AI가 분석합니다."
                  mode="diagnosis"
                  healthData={patient.healthData}
                  trigger={<Button variant="outline" size="sm">AI 진단 요청</Button>}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 응급 상황 버튼 */}
      {riskLevel >= 75 && (
        <Card className="mb-4 bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <h3 className="font-semibold text-red-600">응급 상황 감지됨</h3>
            </div>
            
            <p className="text-sm text-red-600 mb-4">
              환자의 상태가 위험 수준입니다. 즉시 조치가 필요합니다.
            </p>
            
            <div className="flex gap-2">
              <Button className="flex-1 bg-red-600 hover:bg-red-700">
                <Phone className="h-4 w-4 mr-2" /> 119 응급 전화
              </Button>
              <Button variant="outline" className="flex-1 text-red-600 border-red-300">
                환자에게 연락
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}