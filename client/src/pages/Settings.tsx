import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/contexts/AppContext';
import AlertDetailDialog from '@/components/alerts/AlertDetailDialog';
import DailySummaryReport from '@/components/reports/DailySummaryReport';
import { useForm } from 'react-hook-form';
import DeviceConnector from '@/components/smartwatch/DeviceConnector';
import SmartWatchScanner from '@/components/smartwatch/SmartWatchScanner';
import { Watch, Bluetooth, RefreshCw, Settings as SettingsIcon, AlertCircle } from 'lucide-react';
import { useLocation } from 'wouter';

const Settings = () => {
  const { toast } = useToast();
  const { theme, language, user: currentUser } = useApp();
  const [activeTab, setActiveTab] = useState("account");
  const [location] = useLocation();
  
  // URL 파라미터에서 tab 값을 확인하여 탭 자동 선택
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['account', 'smartwatch', 'notifications', 'guardians', 'medical', 'medication'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location]);

  // Account form
  const accountForm = useForm({
    defaultValues: {
      name: currentUser?.name || '',
      email: 'user@example.com',
      phone: '010-1234-5678'
    }
  });

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    riskAlert: true,
    dailySummary: true,
    activityReminder: false,
    medicationReminder: true,
    dataSync: true
  });

  // Guardian settings
  const [guardians, setGuardians] = useState([
    { id: 1, name: '김보호', relationship: '배우자', phone: '010-9876-5432', isPrimary: true }
  ]);
  const [newGuardian, setNewGuardian] = useState({ name: '', relationship: '', phone: '' });
  const [showGuardianForm, setShowGuardianForm] = useState(false);

  // Medical information
  const [medicalInfo, setMedicalInfo] = useState({
    conditions: currentUser?.medicalConditions || ['고혈압', '당뇨'],
    allergies: ['페니실린'],
    medications: ['아스피린 100mg (1일 1회)', '메트포르민 500mg (1일 2회)'],
    bloodType: 'A+',
    height: 172,
    weight: 68
  });
  const [newCondition, setNewCondition] = useState('');
  const [newMedication, setNewMedication] = useState('');
  const [newAllergy, setNewAllergy] = useState('');

  const handleNotificationChange = (key: keyof typeof notificationSettings) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleAddGuardian = () => {
    setShowGuardianForm(true);
  };
  
  const handleSaveGuardian = () => {
    if (newGuardian.name && newGuardian.relationship && newGuardian.phone) {
      const newId = guardians.length > 0 ? Math.max(...guardians.map(g => g.id)) + 1 : 1;
      setGuardians([...guardians, { 
        ...newGuardian, 
        id: newId,
        isPrimary: guardians.length === 0 // 첫 번째 추가된 보호자는 주 보호자
      }]);
      setNewGuardian({ name: '', relationship: '', phone: '' });
      setShowGuardianForm(false);
      
      toast({
        title: "보호자 추가 완료",
        description: "새로운 보호자가 추가되었습니다."
      });
    } else {
      toast({
        title: "정보 부족",
        description: "모든 필드를 입력해주세요.",
        variant: "destructive"
      });
    }
  };
  
  const handleCancelGuardian = () => {
    setNewGuardian({ name: '', relationship: '', phone: '' });
    setShowGuardianForm(false);
  };
  
  const handleRemoveGuardian = (id: number) => {
    setGuardians(guardians.filter(g => g.id !== id));
    toast({
      title: "보호자 삭제",
      description: "보호자가 삭제되었습니다."
    });
  };

  const handleAccountSubmit = (data: any) => {
    toast({
      title: "프로필 업데이트 완료",
      description: "개인정보가 성공적으로 업데이트되었습니다."
    });
  };

  const handleDeleteAccount = () => {
    toast({
      title: "계정 삭제 확인",
      description: "정말 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
      variant: "destructive"
    });
  };

  const handleLogout = () => {
    toast({
      title: "로그아웃",
      description: "로그아웃되었습니다."
    });
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="account" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="account">계정</TabsTrigger>
          <TabsTrigger value="smartwatch">워치연결</TabsTrigger>
          <TabsTrigger value="notifications">알림</TabsTrigger>
          <TabsTrigger value="guardians">보호자</TabsTrigger>
          <TabsTrigger value="medical">의료정보</TabsTrigger>
          <TabsTrigger value="medication">약물관리</TabsTrigger>
        </TabsList>

        {/* SmartWatch Tab */}
        <TabsContent value="smartwatch" className="space-y-4 py-4">
          <Card className="p-5">
            <h2 className="text-lg font-semibold mb-4">스마트워치 연결</h2>
            
            <div className="space-y-6">
              {/* 연결된 워치 상태 표시 */}
              <div className="bg-[#F3F8FF] rounded-xl p-4">
                <div className="flex items-center">
                  <div className="w-14 h-14 rounded-full bg-[#E0EAFF] flex items-center justify-center mr-4">
                    <Watch className="h-7 w-7 text-[#FF6D70]" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg">Apple Watch SE</h3>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <div className="flex items-center mr-3">
                        <div className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></div>
                        <span>연결됨</span>
                      </div>
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-[#FF6D70]" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                        </svg>
                        <span>배터리 78%</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <Button variant="outline" className="text-sm">
                    <RefreshCw className="h-4 w-4 mr-1.5" />
                    데이터 동기화
                  </Button>
                  <Button variant="outline" className="text-sm">
                    <SettingsIcon className="h-4 w-4 mr-1.5" />
                    워치 설정
                  </Button>
                </div>
              </div>
              
              {/* 워치 스캐너 컴포넌트 */}
              <div>
                <h3 className="text-sm font-medium mb-3">새 기기 연결</h3>
                <div className="bg-blue-50 rounded-md p-3 mb-4">
                  <h3 className="text-sm font-medium text-blue-800 mb-1">스마트워치 연결하기</h3>
                  <p className="text-xs text-blue-700 mb-2">
                    주변에 있는
                    <span className="font-medium"> 블루투스 장치를 스캔</span>하여 스마트워치를 앱과 연결하세요.
                    실제 장치가 탐지되면 연결하여 심박수 및 건강 데이터를 실시간으로 모니터링할 수 있습니다.
                  </p>
                  <p className="text-xs text-blue-700">
                    <AlertCircle className="inline-block h-3 w-3 mr-1" /> <span className="font-medium">주의:</span> Web Bluetooth API를 지원하는 브라우저에서만 실제 장치 연결이 가능합니다.
                  </p>
                </div>
                
                <SmartWatchScanner />
              </div>
              
              {/* 기기 연결 및 앱 연동 다이얼로그 */}
              <div>
                <h3 className="text-sm font-medium mb-3">고급 연동 설정</h3>
                <DeviceConnector
                  trigger={
                    <Button variant="outline" className="w-full">
                      <Bluetooth className="h-4 w-4 mr-1.5" />
                      고급 연결 설정 및 앱 연동
                    </Button>
                  }
                />
              </div>
            </div>
          </Card>
        </TabsContent>
        
        {/* Account Tab */}
        <TabsContent value="account" className="space-y-4 py-4">
          <Card className="p-5">
            <h2 className="text-lg font-semibold mb-4">개인 정보</h2>
            
            <Form {...accountForm}>
              <form onSubmit={accountForm.handleSubmit(handleAccountSubmit)} className="space-y-4">
                <FormField
                  control={accountForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>이름</FormLabel>
                      <FormControl>
                        <Input placeholder="이름을 입력하세요" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={accountForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>이메일</FormLabel>
                      <FormControl>
                        <Input placeholder="이메일을 입력하세요" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={accountForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>전화번호</FormLabel>
                      <FormControl>
                        <Input placeholder="전화번호를 입력하세요" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full">저장하기</Button>
              </form>
            </Form>
          </Card>
          
          <Card className="p-5">
            <h2 className="text-lg font-semibold mb-4">계정 관리</h2>
            
            <div className="space-y-4">
              <Button variant="outline" className="w-full" onClick={handleLogout}>
                로그아웃
              </Button>
              
              <Button variant="destructive" className="w-full" onClick={handleDeleteAccount}>
                계정 삭제
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4 py-4">
          <Card className="p-0 overflow-hidden border border-[#FFE8E8] shadow-md">
            {/* 상단 탭 메뉴 */}
            <div className="flex overflow-x-auto bg-[#f8f9fa] border-b border-[#FFE8E8]">
              <button className="px-5 py-3 text-sm font-medium text-[#333] border-b-2 border-[#FF6D70] bg-white">
                알림
              </button>
              <button className="px-5 py-3 text-sm font-medium text-[#666] hover:text-[#333]">
                위치연결
              </button>
              <button className="px-5 py-3 text-sm font-medium text-[#666] hover:text-[#333]">
                보호자
              </button>
              <button className="px-5 py-3 text-sm font-medium text-[#666] hover:text-[#333]">
                의료정보
              </button>
              <button className="px-5 py-3 text-sm font-medium text-[#666] hover:text-[#333]">
                약물관리
              </button>
            </div>
            
            <div className="p-5">
              <div className="rounded-xl border border-[#FFDDDD] bg-white p-4 shadow-sm mb-4">
                <h2 className="text-base font-bold text-[#333] mb-4">알림 설정</h2>
                
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium">위험 상황 알림</h3>
                      <p className="text-xs text-[#666]">심장 건강 관련 위험 상황 발생 시 알림</p>
                    </div>
                    <Switch 
                      checked={notificationSettings.riskAlert} 
                      onCheckedChange={() => handleNotificationChange('riskAlert')}
                      className="data-[state=checked]:bg-[#FF6D70]"
                    />
                  </div>
                  
                  <div className="h-[1px] bg-[#FFEEEE]"></div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium">일일 요약 보고서</h3>
                      <p className="text-xs text-[#666]">매일 건강 데이터 요약 보고서</p>
                    </div>
                    <Switch 
                      checked={notificationSettings.dailySummary} 
                      onCheckedChange={() => handleNotificationChange('dailySummary')}
                      className="data-[state=checked]:bg-[#FF6D70]"
                    />
                  </div>
                  
                  <div className="h-[1px] bg-[#FFEEEE]"></div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium">활동 알림</h3>
                      <p className="text-xs text-[#666]">운동 및 활동 관련 알림</p>
                    </div>
                    <Switch 
                      checked={notificationSettings.activityReminder} 
                      onCheckedChange={() => handleNotificationChange('activityReminder')}
                      className="data-[state=checked]:bg-[#FF6D70]"
                    />
                  </div>
                  
                  <div className="h-[1px] bg-[#FFEEEE]"></div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium">약물 복용 알림</h3>
                      <p className="text-xs text-[#666]">약물 복용 시간 알림</p>
                    </div>
                    <Switch 
                      checked={notificationSettings.medicationReminder} 
                      onCheckedChange={() => handleNotificationChange('medicationReminder')}
                      className="data-[state=checked]:bg-[#FF6D70]"
                    />
                  </div>
                  
                  <div className="h-[1px] bg-[#FFEEEE]"></div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium">데이터 동기화 알림</h3>
                      <p className="text-xs text-[#666]">연결된 기기와 데이터 동기화 상태 알림</p>
                    </div>
                    <Switch 
                      checked={notificationSettings.dataSync} 
                      onCheckedChange={() => handleNotificationChange('dataSync')}
                      className="data-[state=checked]:bg-[#FF6D70]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Guardians Tab */}
        <TabsContent value="guardians" className="space-y-4 py-4">
          <Card className="p-5">
            <h2 className="text-lg font-semibold mb-4">보호자 설정</h2>
            
            <div className="space-y-4">
              {guardians.map(guardian => (
                <div key={guardian.id} className="flex items-center p-3 bg-[#f8fafb] rounded-xl">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="text-sm font-medium">{guardian.name}</h3>
                      {guardian.isPrimary && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                          주 보호자
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#507695]">{guardian.relationship} · {guardian.phone}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveGuardian(guardian.id)}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </Button>
                </div>
              ))}
              
              {showGuardianForm ? (
                <div className="bg-[#f8fafb] rounded-xl p-4 space-y-3">
                  <h3 className="text-sm font-medium">새 보호자 추가</h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="guardianName">이름</Label>
                      <Input 
                        id="guardianName"
                        placeholder="보호자 이름"
                        value={newGuardian.name}
                        onChange={(e) => setNewGuardian({...newGuardian, name: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="guardianRelationship">관계</Label>
                      <Input 
                        id="guardianRelationship"
                        placeholder="관계 (예: 배우자, 자녀)"
                        value={newGuardian.relationship}
                        onChange={(e) => setNewGuardian({...newGuardian, relationship: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="guardianPhone">연락처</Label>
                      <Input 
                        id="guardianPhone"
                        placeholder="전화번호"
                        value={newGuardian.phone}
                        onChange={(e) => setNewGuardian({...newGuardian, phone: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" onClick={handleCancelGuardian} className="flex-1">취소</Button>
                      <Button onClick={handleSaveGuardian} className="flex-1">저장</Button>
                    </div>
                  </div>
                </div>
              ) : (
                <Button variant="outline" className="w-full" onClick={handleAddGuardian}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  보호자 추가
                </Button>
              )}
            </div>
          </Card>
          
          <Card className="p-5">
            <h2 className="text-lg font-semibold mb-4">응급 연락처</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-medium">119 자동 신고</h3>
                  <p className="text-xs text-[#507695]">심각한 위험 상황 발생 시 자동으로 119에 신고</p>
                </div>
                <Switch checked={true} />
              </div>
              
              <Separator />
              
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-medium">보호자 긴급 알림</h3>
                  <p className="text-xs text-[#507695]">응급 상황 발생 시 모든 보호자에게 알림</p>
                </div>
                <Switch checked={true} />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-semibold mb-4">최근 알림 및 긴급 대응</h2>
            
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden border">
                <div className="flex items-center bg-red-50 p-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                  <span className="text-sm font-medium flex-1">위험 상황 감지 (2024.04.06 08:32)</span>
                  <span className="text-xs text-gray-500">1시간 전</span>
                </div>
                <div className="p-3 bg-white">
                  <p className="text-xs text-[#507695] mb-2">비정상적인 심박수 및 혈압 변화가 감지되었습니다.</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                      </svg>
                      전화 연결
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-2 0a6 6 0 11-12 0 6 6 0 0112 0zm-1.464-4.95a.5.5 0 10-.707.707l1.414 1.414a.5.5 0 00.707 0l1.414-1.414a.5.5 0 00-.707-.707l-1.06 1.06-1.061-1.06zm2 9.9a.5.5 0 10-.707-.707l-1.414 1.414a.5.5 0 00.707 0l1.414-1.414a.5.5 0 00-.707 0l-1.06-1.06-1.061 1.06z" clipRule="evenodd" />
                      </svg>
                      119 연결
                    </Button>
                    <AlertDetailDialog 
                      trigger={
                        <Button variant="default" size="sm" className="h-8 gap-1 text-xs">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                          </svg>
                          상세 데이터
                        </Button>
                      }
                      title="위험 상황 상세 데이터"
                      description="비정상적인 심박수 및 혈압 변화에 대한 상세 분석 데이터입니다."
                    />
                  </div>
                </div>
              </div>
              
              <div className="rounded-xl overflow-hidden border">
                <div className="flex items-center bg-amber-50 p-3">
                  <div className="w-2 h-2 rounded-full bg-amber-500 mr-2"></div>
                  <span className="text-sm font-medium flex-1">주의 상황 감지 (2024.04.06 06:15)</span>
                  <span className="text-xs text-gray-500">3시간 전</span>
                </div>
                <div className="p-3 bg-white">
                  <p className="text-xs text-[#507695] mb-2">심박 변이도(HRV)가 정상 범위를 벗어났습니다.</p>
                  <AlertDetailDialog 
                    trigger={
                      <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                          <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                        </svg>
                        상세 데이터
                      </Button>
                    }
                    title="주의 상황 상세 데이터"
                    description="심박 변이도(HRV) 데이터 분석 결과입니다."
                  />
                </div>
              </div>
              
              <DailySummaryReport 
                trigger={
                  <Button variant="outline" className="w-full text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    일일 요약 보고서 보기
                  </Button>
                }
              />
            </div>
          </Card>
        </TabsContent>

        {/* Medication Tab */}
        <TabsContent value="medication" className="space-y-4 py-4">
          <Card className="p-5">
            <h2 className="text-lg font-semibold mb-4">약물 관리</h2>
            
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-blue-600">
                  약물 검색을 통해 복용중인 약물에 관한 정보를 확인하고 관리할 수 있습니다.
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">약물 복용 알림</h3>
                    <p className="text-xs text-[#507695]">복용 시간에 맞춰 복용해야 할 약물 알림을 받습니다.</p>
                  </div>
                  <Switch checked={true} />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">약물 부작용 모니터링</h3>
                    <p className="text-xs text-[#507695]">약물 복용 후 발생할 수 있는 부작용을 모니터링합니다.</p>
                  </div>
                  <Switch checked={true} />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">약물 상호작용 알림</h3>
                    <p className="text-xs text-[#507695]">함께 복용 시 위험할 수 있는 약물 조합을 알려줍니다.</p>
                  </div>
                  <Switch checked={true} />
                </div>
              </div>
              
              <Button 
                className="w-full"
                onClick={() => {
                  toast({
                    title: "약물 검색 페이지로 이동",
                    description: "약물 검색 페이지로 이동합니다."
                  });
                  window.location.href = '/medication-search';
                }}
              >
                약물 검색하기
              </Button>
            </div>
          </Card>
          
          <Card className="p-5">
            <h2 className="text-lg font-semibold mb-4">현재 복용 중인 약물</h2>
            
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden border">
                <div className="flex items-center bg-primary/5 p-3">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium">아스피린</h3>
                    <p className="text-xs text-[#507695]">100mg, 1일 1회 (아침)</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </Button>
                </div>
                <div className="p-3 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Badge className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-0">심장질환</Badge>
                      <Badge className="bg-amber-50 text-amber-600 hover:bg-amber-100 border-0">혈전예방</Badge>
                    </div>
                    <span className="text-xs text-gray-500">처방: 2024.03.15</span>
                  </div>
                </div>
              </div>
              
              <div className="rounded-xl overflow-hidden border">
                <div className="flex items-center bg-primary/5 p-3">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium">메트포르민</h3>
                    <p className="text-xs text-[#507695]">500mg, 1일 2회 (아침, 저녁)</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </Button>
                </div>
                <div className="p-3 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Badge className="bg-green-50 text-green-600 hover:bg-green-100 border-0">당뇨</Badge>
                    </div>
                    <span className="text-xs text-gray-500">처방: 2024.03.15</span>
                  </div>
                </div>
              </div>
              
              <Button variant="outline" className="w-full" onClick={() => {
                 // 올바른 방법으로 라우팅 처리
                 const baseUrl = window.location.origin;
                 window.location.href = `${baseUrl}/medication-search`;
               }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                약물 추가
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Medical Information Tab */}
        <TabsContent value="medical" className="space-y-4 py-4">
          <Card className="p-5">
            <h2 className="text-lg font-semibold mb-4">기본 정보</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-1">혈액형</h3>
                <p className="text-sm">{medicalInfo.bloodType}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-1">키</h3>
                <p className="text-sm">{medicalInfo.height} cm</p>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-1">몸무게</h3>
                <p className="text-sm">{medicalInfo.weight} kg</p>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-1">BMI</h3>
                <p className="text-sm">{(medicalInfo.weight / ((medicalInfo.height / 100) ** 2)).toFixed(1)}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-5">
            <h2 className="text-lg font-semibold mb-4">병력</h2>
            
            <div className="space-y-4">
              {/* 의료 상태 */}
              <div>
                <h3 className="text-sm font-medium mb-2">의료 상태</h3>
                <div className="flex flex-wrap gap-2 mb-2">
                  {medicalInfo.conditions.map((condition, index) => (
                    <div key={index} className="group px-2 py-1 bg-[#f8fafb] rounded-lg text-xs flex items-center hover:bg-red-50">
                      {condition}
                      <button 
                        onClick={() => {
                          setMedicalInfo({
                            ...medicalInfo,
                            conditions: medicalInfo.conditions.filter((_, i) => i !== index)
                          });
                          toast({
                            title: "병력 삭제됨",
                            description: `${condition} 정보가 삭제되었습니다.`
                          });
                        }}
                        className="ml-1 text-red-500 opacity-0 group-hover:opacity-100"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                
                <div className="flex mt-2">
                  <Input
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value)}
                    placeholder="새 병력 입력"
                    className="text-sm flex-1"
                  />
                  <Button 
                    size="sm" 
                    className="ml-2"
                    disabled={!newCondition.trim()}
                    onClick={() => {
                      if (newCondition.trim()) {
                        setMedicalInfo({
                          ...medicalInfo,
                          conditions: [...medicalInfo.conditions, newCondition.trim()]
                        });
                        setNewCondition('');
                        toast({
                          title: "병력 추가됨",
                          description: `${newCondition} 정보가 추가되었습니다.`
                        });
                      }
                    }}
                  >
                    추가
                  </Button>
                </div>
              </div>
              
              {/* 약물 알레르기 */}
              <div>
                <h3 className="text-sm font-medium mb-2">약물 알레르기</h3>
                <div className="flex flex-wrap gap-2 mb-2">
                  {medicalInfo.allergies.map((allergy, index) => (
                    <div key={index} className="group px-2 py-1 bg-[#f8fafb] rounded-lg text-xs flex items-center hover:bg-red-50">
                      {allergy}
                      <button 
                        onClick={() => {
                          setMedicalInfo({
                            ...medicalInfo,
                            allergies: medicalInfo.allergies.filter((_, i) => i !== index)
                          });
                          toast({
                            title: "알레르기 삭제됨",
                            description: `${allergy} 정보가 삭제되었습니다.`
                          });
                        }}
                        className="ml-1 text-red-500 opacity-0 group-hover:opacity-100"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                
                <div className="flex mt-2">
                  <Input
                    value={newAllergy}
                    onChange={(e) => setNewAllergy(e.target.value)}
                    placeholder="새 알레르기 입력"
                    className="text-sm flex-1"
                  />
                  <Button 
                    size="sm" 
                    className="ml-2"
                    disabled={!newAllergy.trim()}
                    onClick={() => {
                      if (newAllergy.trim()) {
                        setMedicalInfo({
                          ...medicalInfo,
                          allergies: [...medicalInfo.allergies, newAllergy.trim()]
                        });
                        setNewAllergy('');
                        toast({
                          title: "알레르기 추가됨",
                          description: `${newAllergy} 정보가 추가되었습니다.`
                        });
                      }
                    }}
                  >
                    추가
                  </Button>
                </div>
              </div>
              
              {/* 복용 중인 약물 */}
              <div>
                <h3 className="text-sm font-medium mb-2">복용 중인 약물</h3>
                <div className="space-y-2 mb-2">
                  {medicalInfo.medications.map((medication, index) => (
                    <div key={index} className="group p-2 bg-[#f8fafb] rounded-lg text-xs flex justify-between items-center hover:bg-red-50">
                      <span>{medication}</span>
                      <button 
                        onClick={() => {
                          setMedicalInfo({
                            ...medicalInfo,
                            medications: medicalInfo.medications.filter((_, i) => i !== index)
                          });
                          toast({
                            title: "약물 삭제됨",
                            description: `${medication} 정보가 삭제되었습니다.`
                          });
                        }}
                        className="text-red-500 opacity-0 group-hover:opacity-100"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-3 gap-2">
                    <Button variant="outline" className="text-xs h-auto py-2 flex flex-col items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                      처방전 촬영
                    </Button>
                    <Button variant="outline" className="text-xs h-auto py-2 flex flex-col items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                      약물 검색
                    </Button>
                    <Button variant="outline" className="text-xs h-auto py-2 flex flex-col items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      모양 검색
                    </Button>
                  </div>
                  
                  <div className="flex mt-2">
                    <Input
                      value={newMedication}
                      onChange={(e) => setNewMedication(e.target.value)}
                      placeholder="새 약물 정보 입력"
                      className="text-sm flex-1"
                    />
                    <Button 
                      size="sm" 
                      className="ml-2"
                      disabled={!newMedication.trim()}
                      onClick={() => {
                        if (newMedication.trim()) {
                          setMedicalInfo({
                            ...medicalInfo,
                            medications: [...medicalInfo.medications, newMedication.trim()]
                          });
                          setNewMedication('');
                          toast({
                            title: "약물 추가됨",
                            description: `${newMedication} 정보가 추가되었습니다.`
                          });
                        }
                      }}
                    >
                      추가
                    </Button>
                  </div>
                  
                  <div className="bg-[#f8fafb] rounded-lg p-3 text-xs">
                    <h4 className="font-medium mb-1">자주 처방되는 약물</h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {['아스피린 100mg', '메트포르민 500mg', '아토르바스타틴 20mg', '로사르탄 50mg', '암로디핀 5mg'].map((med) => (
                        <Badge 
                          key={med}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary/10"
                          onClick={() => {
                            if (!medicalInfo.medications.includes(med)) {
                              setMedicalInfo({
                                ...medicalInfo,
                                medications: [...medicalInfo.medications, med]
                              });
                              toast({
                                title: "약물 추가됨",
                                description: `${med} 정보가 추가되었습니다.`
                              });
                            }
                          }}
                        >
                          {med}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
          
          <Card className="p-5">
            <h2 className="text-lg font-semibold mb-4">의료 기록 공유</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-medium">주치의와 공유</h3>
                  <p className="text-xs text-[#507695]">김의사 (서울대학교병원)</p>
                </div>
                <Switch checked={true} />
              </div>
              
              <Separator />
              
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-medium">예약된 의료기관과 공유</h3>
                  <p className="text-xs text-[#507695]">진료 예약 시 자동으로 정보 제공</p>
                </div>
                <Switch checked={false} />
              </div>
              
              <Button variant="outline" className="w-full mt-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                의료진 추가
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
