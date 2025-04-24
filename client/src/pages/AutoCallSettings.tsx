import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { 
  ArrowLeft, 
  Phone, 
  User, 
  AlertCircle, 
  ChevronUp, 
  ChevronDown,
  Clock,
  Heart,
  PhoneCall,
  Bell,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Card, 
  CardContent, 
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

// 인터페이스 정의
interface Guardian {
  id: number;
  name: string;
  relation: string;
  phone: string;
  priority?: number;
}

interface AutoCallSetting {
  enabled: boolean;
  heartRateThresholdHigh: number;
  heartRateThresholdLow: number;
  oxygenThreshold: number;
  delayBeforeCall: number; // 자동 통화 전 지연 시간 (초)
  autoCall119: boolean; // 119 자동 호출 여부
}

const AutoCallSettings = () => {
  const [, navigate] = useLocation();

  // 보호자 데이터
  const [guardians, setGuardians] = useState<Guardian[]>([
    {
      id: 1,
      name: '김보호',
      relation: '배우자',
      phone: '010-1234-5678',
      priority: 1
    },
    {
      id: 2,
      name: '이가디',
      relation: '자녀',
      phone: '010-9876-5432',
      priority: 2
    },
    {
      id: 3,
      name: '박케어',
      relation: '부모',
      phone: '010-2468-1357',
      priority: 3
    }
  ]);

  // 자동 호출 설정
  const [settings, setSettings] = useState<AutoCallSetting>({
    enabled: true,
    heartRateThresholdHigh: 120,
    heartRateThresholdLow: 50,
    oxygenThreshold: 90,
    delayBeforeCall: 30,
    autoCall119: true
  });

  // 자동 호출 설정 업데이트 함수
  const updateSettings = (key: keyof AutoCallSetting, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // 보호자 우선순위 변경 함수
  const changePriority = (guardianId: number, direction: 'up' | 'down') => {
    // 현재 보호자 목록 복사
    const updatedGuardians = [...guardians];
    
    // 선택된 보호자 인덱스 찾기
    const currentIndex = updatedGuardians.findIndex(g => g.id === guardianId);
    if (currentIndex === -1) return;

    const currentGuardian = updatedGuardians[currentIndex];
    
    if (direction === 'up' && currentIndex > 0) {
      // 우선순위를 올리려면 앞의 보호자와 우선순위 교환
      const prevGuardian = updatedGuardians[currentIndex - 1];
      currentGuardian.priority = prevGuardian.priority;
      prevGuardian.priority = currentGuardian.priority !== undefined ? currentGuardian.priority + 1 : undefined;
      
      // 목록에서 위치 바꾸기
      [updatedGuardians[currentIndex - 1], updatedGuardians[currentIndex]] = 
        [updatedGuardians[currentIndex], updatedGuardians[currentIndex - 1]];
    } else if (direction === 'down' && currentIndex < updatedGuardians.length - 1) {
      // 우선순위를 내리려면 뒤의 보호자와 우선순위 교환
      const nextGuardian = updatedGuardians[currentIndex + 1];
      const tempPriority = currentGuardian.priority;
      currentGuardian.priority = nextGuardian.priority;
      nextGuardian.priority = tempPriority;
      
      // 목록에서 위치 바꾸기
      [updatedGuardians[currentIndex], updatedGuardians[currentIndex + 1]] = 
        [updatedGuardians[currentIndex + 1], updatedGuardians[currentIndex]];
    }
    
    // 목록 업데이트
    setGuardians(updatedGuardians);
  };

  // 설정 저장 함수
  const saveSettings = () => {
    // 실제 구현에서는 API 호출로 저장
    alert('설정이 저장되었습니다.');
    navigate('/emergency-contacts');
  };

  return (
    <div className="pb-20">
      {/* 헤더 */}
      <div className="flex items-center mb-6">
        <button 
          onClick={() => navigate('/emergency-contacts')}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
        <h1 className="text-xl font-bold ml-2">자동 호출 설정</h1>
      </div>

      {/* 메인 설정 카드 */}
      <Card className="mb-6 rounded-3xl shadow-sm overflow-hidden">
        <CardHeader className="bg-[#FFE2E9]">
          <CardTitle className="text-[#FF6D70] flex items-center">
            <PhoneCall className="h-5 w-5 mr-2" />
            자동 호출 기능
          </CardTitle>
          <CardDescription className="text-[#FF6D70]/70">
            심박수나 산소포화도가 위험 수준일 때 보호자에게 자동으로 연락합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <span className="font-medium">자동 호출 활성화</span>
            </div>
            <Switch 
              checked={settings.enabled} 
              onCheckedChange={(checked) => updateSettings('enabled', checked)}
              className="data-[state=checked]:bg-[#FF6D70]"
            />
          </div>

          {settings.enabled && (
            <>
              <Separator className="mb-4" />
              
              {/* 위험 기준 설정 */}
              <div className="space-y-4 mb-6">
                <h3 className="font-semibold text-sm text-gray-500">위험 감지 기준</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-2xl">
                    <div className="flex items-center mb-2">
                      <Heart className="h-4 w-4 text-red-500 mr-1" />
                      <span className="text-sm font-medium">최대 심박수</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <input 
                        type="range" 
                        min="100" 
                        max="200" 
                        value={settings.heartRateThresholdHigh}
                        onChange={(e) => updateSettings('heartRateThresholdHigh', parseInt(e.target.value))}
                        className="w-2/3 accent-[#FF6D70]"
                      />
                      <span className="text-lg font-bold text-[#FF6D70]">{settings.heartRateThresholdHigh}<span className="text-sm font-normal">bpm</span></span>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-2xl">
                    <div className="flex items-center mb-2">
                      <Heart className="h-4 w-4 text-blue-500 mr-1" />
                      <span className="text-sm font-medium">최소 심박수</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <input 
                        type="range" 
                        min="30" 
                        max="60" 
                        value={settings.heartRateThresholdLow}
                        onChange={(e) => updateSettings('heartRateThresholdLow', parseInt(e.target.value))}
                        className="w-2/3 accent-[#FF6D70]"
                      />
                      <span className="text-lg font-bold text-[#FF6D70]">{settings.heartRateThresholdLow}<span className="text-sm font-normal">bpm</span></span>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-2xl">
                    <div className="flex items-center mb-2">
                      <AlertCircle className="h-4 w-4 text-orange-500 mr-1" />
                      <span className="text-sm font-medium">산소포화도</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <input 
                        type="range" 
                        min="70" 
                        max="95" 
                        value={settings.oxygenThreshold}
                        onChange={(e) => updateSettings('oxygenThreshold', parseInt(e.target.value))}
                        className="w-2/3 accent-[#FF6D70]"
                      />
                      <span className="text-lg font-bold text-[#FF6D70]">{settings.oxygenThreshold}<span className="text-sm font-normal">%</span></span>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-2xl">
                    <div className="flex items-center mb-2">
                      <Clock className="h-4 w-4 text-purple-500 mr-1" />
                      <span className="text-sm font-medium">호출 지연 시간</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <input 
                        type="range" 
                        min="0" 
                        max="60" 
                        step="5"
                        value={settings.delayBeforeCall}
                        onChange={(e) => updateSettings('delayBeforeCall', parseInt(e.target.value))}
                        className="w-2/3 accent-[#FF6D70]"
                      />
                      <span className="text-lg font-bold text-[#FF6D70]">{settings.delayBeforeCall}<span className="text-sm font-normal">초</span></span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="mb-4" />
              
              {/* 119 자동 호출 설정 */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <Phone className="h-4 w-4 text-red-500 mr-2" />
                  <span className="font-medium">응급 시 119 자동 호출</span>
                </div>
                <Switch 
                  checked={settings.autoCall119} 
                  onCheckedChange={(checked) => updateSettings('autoCall119', checked)}
                  className="data-[state=checked]:bg-red-500"
                />
              </div>
              
              {/* 보호자 자동 호출 우선순위 설정 */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-gray-500">보호자 자동 호출 순서</h3>
                <p className="text-xs text-gray-500 mb-3">
                  위에서부터 순서대로 연락을 시도합니다. 화살표를 눌러 순서를 변경하세요.
                </p>
                
                <div className="space-y-2">
                  {guardians
                    .sort((a, b) => (a.priority || 99) - (b.priority || 99))
                    .map((guardian, index) => (
                      <div key={guardian.id} className="bg-gray-50 p-3 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center">
                          <Badge variant="outline" className="mr-2 bg-[#FFE2E9] text-[#FF6D70] border-none">
                            {index + 1}순위
                          </Badge>
                          <span className="font-medium">{guardian.name}</span>
                          <span className="text-sm text-gray-500 ml-2">({guardian.relation})</span>
                        </div>
                        <div className="flex space-x-1">
                          <button 
                            onClick={() => changePriority(guardian.id, 'up')}
                            disabled={index === 0}
                            className={`w-6 h-6 flex items-center justify-center rounded-full ${
                              index === 0 ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => changePriority(guardian.id, 'down')}
                            disabled={index === guardians.length - 1}
                            className={`w-6 h-6 flex items-center justify-center rounded-full ${
                              index === guardians.length - 1 ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 설명 정보 */}
      <div className="bg-gray-50 rounded-3xl p-4 mb-6">
        <h3 className="font-bold text-gray-700 mb-2 flex items-center">
          <Bell className="h-4 w-4 mr-2 text-[#FF6D70]" />
          자동 호출 기능 안내
        </h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>심박수나 산소포화도가 설정값을 벗어나면 지정된 보호자에게 자동으로 연락합니다.</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>응급 상황이 감지되면 경고음과 함께 지연 시간 동안 알림을 표시하고, 취소하지 않으면 자동으로 전화를 겁니다.</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>119 자동 호출이 활성화된 경우, 보호자 연락 후에도 응급 상황이 지속되면 119로 자동 연결됩니다.</span>
          </li>
        </ul>
      </div>

      {/* 저장 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white p-4 border-t">
        <Button 
          onClick={saveSettings}
          className="w-full bg-[#FF6D70] hover:bg-[#FF6D70]/90 text-white rounded-xl py-6"
        >
          <Settings className="h-5 w-5 mr-2" />
          설정 저장하기
        </Button>
      </div>
    </div>
  );
};

export default AutoCallSettings;