import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { 
  Phone, 
  User, 
  Hospital, 
  MapPin, 
  Clock, 
  Plus, 
  Star, 
  Edit2, 
  Trash2,
  ChevronRight,
  PhoneCall,
  AlertCircle,
  Navigation,
  Target,
  Search,
  RefreshCw,
  X,
  Settings,
  BarChart2,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

// UI 컴포넌트 임포트
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import KakaoMap from '@/components/ui/KakaoMap';

// 전화 연결 함수
const callHospital = (phoneNumber: string) => {
  if (!phoneNumber) return;
  window.location.href = `tel:${phoneNumber.replace(/-/g, '')}`;
};

const callGuardian = (phoneNumber: string) => {
  if (!phoneNumber) return;
  window.location.href = `tel:${phoneNumber.replace(/-/g, '')}`;
};

// 인터페이스 정의
interface Guardian {
  id: number;
  name: string;
  relation: string;
  phone: string;
  priority?: number | undefined; // 1, 2, 3 등의 우선순위
  avatar?: string;
}

interface Hospital {
  id: number;
  name: string;
  distance: string; // 거리 (예: "1.2km")
  address: string;
  phone: string;
  isOpen24h: boolean;
  specialty?: string; // 심장 전문, 응급의료 등
  latitude?: number; // 위도
  longitude?: number; // 경도
}

const EmergencyContacts = () => {
  const [, navigate] = useLocation();
  const [filteredHospitals, setFilteredHospitals] = useState<Hospital[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  // 샘플 데이터 (useState로 변경)
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

  // 병원 데이터
  const hospitals: Hospital[] = [
    {
      id: 1,
      name: "서울대학교병원",
      distance: "1.2km",
      address: "서울특별시 종로구 대학로 101",
      phone: "02-2072-2114",
      isOpen24h: true,
      specialty: "종합병원, 응급의료센터",
      latitude: 37.579617,
      longitude: 126.998814
    },
    {
      id: 2,
      name: "서울아산병원",
      distance: "3.5km",
      address: "서울특별시 송파구 올림픽로 43길 88",
      phone: "1688-7575",
      isOpen24h: true,
      specialty: "종합병원, 심장센터, 응급의료센터",
      latitude: 37.527126,
      longitude: 127.108673
    },
    {
      id: 3,
      name: "삼성서울병원",
      distance: "5.8km",
      address: "서울특별시 강남구 일원로 81",
      phone: "02-3410-2114",
      isOpen24h: true,
      specialty: "종합병원, 심장혈관센터, 응급의료센터",
      latitude: 37.488389,
      longitude: 127.085739
    },
    {
      id: 4,
      name: "세브란스병원",
      distance: "4.2km",
      address: "서울특별시 서대문구 연세로 50-1",
      phone: "02-2228-0114",
      isOpen24h: true,
      specialty: "종합병원, 심장혈관센터, 응급의료센터",
      latitude: 37.562130,
      longitude: 126.939659
    },
    {
      id: 5,
      name: "강남세브란스병원",
      distance: "7.1km",
      address: "서울특별시 강남구 언주로 211",
      phone: "02-2019-3114",
      isOpen24h: true,
      specialty: "종합병원, 심장전문, 응급의료센터",
      latitude: 37.497153,
      longitude: 127.033510
    },
    {
      id: 6,
      name: "서울성모병원",
      distance: "6.9km",
      address: "서울특별시 서초구 반포대로 222",
      phone: "02-1588-1511",
      isOpen24h: true,
      specialty: "종합병원, 심장혈관센터",
      latitude: 37.499954,
      longitude: 127.007095
    },
    {
      id: 7,
      name: "고려대학교병원",
      distance: "8.3km",
      address: "서울특별시 성북구 고려대로 73",
      phone: "02-920-5114",
      isOpen24h: true,
      specialty: "종합병원, 응급의료센터",
      latitude: 37.587248,
      longitude: 127.025157
    },
    {
      id: 8,
      name: "이대목동병원",
      distance: "9.6km",
      address: "서울특별시 양천구 안양천로 1071",
      phone: "02-2650-5114",
      isOpen24h: true,
      specialty: "종합병원, 응급의료센터",
      latitude: 37.537334,
      longitude: 126.887136
    }
  ];

  // 보호자 우선순위 변경 함수
  const moveGuardianPriority = (id: number, direction: 'up' | 'down') => {
    setGuardians(prevGuardians => {
      // 현재 우선순위로 정렬된 보호자 리스트 복사
      const sortedGuardians = [...prevGuardians].sort((a, b) => (a.priority || 99) - (b.priority || 99));
      
      // 변경하려는 보호자의 인덱스 찾기
      const index = sortedGuardians.findIndex(g => g.id === id);
      if (index === -1) return prevGuardians;
      
      // 교환할 인덱스 계산 (위로 또는 아래로)
      let swapIndex;
      if (direction === 'up' && index > 0) {
        swapIndex = index - 1;
      } else if (direction === 'down' && index < sortedGuardians.length - 1) {
        swapIndex = index + 1;
      } else {
        return prevGuardians; // 이동할 수 없는 경우 (맨 위 또는 맨 아래)
      }
      
      // 우선순위 교환
      const currentPriority = sortedGuardians[index].priority || (index + 1);
      const swapPriority = sortedGuardians[swapIndex].priority || (swapIndex + 1);
      
      // 새 배열 생성하여 우선순위 업데이트
      return prevGuardians.map(g => {
        if (g.id === id) {
          return { ...g, priority: swapPriority };
        } else if (g.id === sortedGuardians[swapIndex].id) {
          return { ...g, priority: currentPriority };
        }
        return g;
      });
    });
  };

  // 주변 병원 데이터 초기화
  useEffect(() => {
    setFilteredHospitals(hospitals);
    
    // 서버에서 병원 데이터 가져오기
    const fetchHospitals = async () => {
      try {
        const response = await fetch('/api/hospitals');
        const data = await response.json();
        
        if (data && data.hospitals) {
          const apiHospitals: Hospital[] = data.hospitals.map((h: any) => ({
            id: h.id,
            name: h.name,
            distance: h.distance ? `${h.distance}km` : '거리 정보 없음',
            address: h.address || '',
            phone: h.tel || h.phone || '번호 없음',
            isOpen24h: h.isOpen24h || false,
            specialty: Array.isArray(h.specialty) ? h.specialty.join(', ') : h.specialty || '',
            latitude: h.lat,
            longitude: h.lng
          }));
          
          if (apiHospitals.length > 0) {
            setFilteredHospitals(apiHospitals);
          }
        }
      } catch (error) {
        console.error('병원 데이터 로딩 오류:', error);
      }
    };
    
    fetchHospitals();
  }, []);

  return (
    <div className="pb-20">
      {/* 병원 추천 섹션 표시 */}
      <div className="mb-4">
        {/* 심박감지알람 제목 제거 */}
        {/* 새로운 UI: 정사각형 상자 */}
        <div className="grid grid-cols-2 gap-4">
          {/* 보호자 등록 */}
          <button 
            className="bg-white rounded-md p-5 shadow-sm border border-[#FFCCD5] aspect-square flex flex-col items-center justify-center cursor-pointer w-full"
            onClick={() => setActiveTab("guardian-list")}
          >
            <div className="w-20 h-20 flex items-center justify-center bg-[#FFE2E9] rounded-md mb-3">
              <User className="h-10 w-10 text-[#FF0000]" />
            </div>
            <h3 className="font-bold text-lg text-center text-[#FF0000]">보호자 등록</h3>
            
            {/* 보호자 수 */}
            <div className="mt-2 text-sm text-gray-600">
              {guardians.length > 0 ? `${guardians.length}명 등록됨` : '등록된 보호자 없음'}
            </div>
          </button>
          
          {/* 테스트 */}
          <button 
            className="bg-white rounded-md p-5 shadow-sm border border-[#FFCCD5] aspect-square flex flex-col items-center justify-center cursor-pointer w-full"
            onClick={() => setActiveTab("test-functions")}
          >
            <div className="w-20 h-20 flex items-center justify-center bg-[#FFE2E9] rounded-md mb-3">
              <AlertCircle className="h-10 w-10 text-[#FF0000]" />
            </div>
            <h3 className="font-bold text-lg text-center text-[#FF0000]">테스트</h3>
            
            <div className="mt-2 text-sm text-gray-600 text-center">
              알람 및 호출 테스트
            </div>
          </button>
        </div>
        
        {/* 컨텐츠 표시 영역 - 클릭한 것에 따라 달라짐 */}
        <div className="mt-6">
          {/* 보호자 목록 영역 - activeTab이 guardian-list일 때만 표시 */}
          {activeTab === "guardian-list" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-lg">보호자 목록</h3>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-[#FF6D70] border-[#FF6D70]"
                  onClick={() => setActiveTab(null)}
                >
                  <X className="h-4 w-4 mr-1" />
                  닫기
                </Button>
              </div>
              
              {guardians.length > 0 ? (
                <div className="space-y-3">
                  {guardians
                    .sort((a, b) => (a.priority || 99) - (b.priority || 99))
                    .map((guardian, index) => (
                    <div key={guardian.id} className="bg-white rounded-3xl p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-12 h-12 rounded-full bg-[#FFE2E9] flex items-center justify-center mr-3">
                            <User className="h-6 w-6 text-[#FF6D70]" />
                          </div>
                          <div>
                            <div className="flex items-center">
                              <h3 className="font-bold text-lg">{guardian.name}</h3>
                              <Badge 
                                variant="outline" 
                                className="ml-2 text-xs border-gray-200"
                              >
                                {guardian.relation}
                              </Badge>
                              {index === 0 && (
                                <Badge className="ml-2 text-xs bg-[#FF6D70] text-white">
                                  1순위
                                </Badge>
                              )}
                              {index === 1 && (
                                <Badge className="ml-2 text-xs bg-[#FF9DAB] text-white">
                                  2순위
                                </Badge>
                              )}
                              {index === 2 && (
                                <Badge className="ml-2 text-xs bg-[#FFCAD4] text-white">
                                  3순위
                                </Badge>
                              )}
                            </div>
                            <p className="text-gray-500 text-sm">{guardian.phone}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="flex flex-col">
                            <button 
                              className="w-6 h-6 rounded-full bg-[#FFE2E9] flex items-center justify-center text-[#FF6D70] mb-1"
                              onClick={() => moveGuardianPriority(guardian.id, 'up')}
                              disabled={index === 0}
                              style={{ opacity: index === 0 ? 0.5 : 1 }}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                            <button 
                              className="w-6 h-6 rounded-full bg-[#FFE2E9] flex items-center justify-center text-[#FF6D70]"
                              onClick={() => moveGuardianPriority(guardian.id, 'down')}
                              disabled={index === guardians.length - 1}
                              style={{ opacity: index === guardians.length - 1 ? 0.5 : 1 }}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                          </div>
                          <button 
                            className="w-8 h-8 rounded-full bg-[#FFE2E9] flex items-center justify-center text-[#FF6D70]"
                            onClick={() => callGuardian(guardian.phone)}
                          >
                            <PhoneCall className="h-4 w-4" />
                          </button>
                          <button 
                            className="w-8 h-8 rounded-full bg-[#FFE2E9] flex items-center justify-center text-[#FF6D70]"
                            onClick={() => navigate(`/guardian-edit/${guardian.id}`)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* 자동 호출 설정 정보 */}
                  <div className="mt-3">
                    <div className="bg-[#FFE2E9] rounded-3xl p-4">
                      <h3 className="font-bold text-[#FF6D70] mb-2">자동 호출 설정</h3>
                      <p className="text-[#FF6D70]/80 text-sm mb-3">
                        응급 상황이 감지되면 아래 우선순위로 자동 연락합니다
                      </p>
                      <ol className="space-y-2 pl-5 list-decimal text-[#FF6D70]">
                        {guardians
                          .sort((a, b) => (a.priority || 99) - (b.priority || 99))
                          .map((guardian, index) => (
                            <li key={guardian.id} className="text-sm">
                              <span className="font-bold">{index + 1}순위:</span> {guardian.name} ({guardian.relation}) - {guardian.phone}
                            </li>
                          ))}
                      </ol>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-5 shadow-sm text-center">
                  <p className="text-gray-500">등록된 보호자가 없습니다.</p>
                  <Button 
                    className="mt-3 bg-[#FF6D70] hover:bg-[#e55a81] text-white"
                    onClick={() => navigate('/guardian-registration')}
                  >
                    보호자 등록하기
                  </Button>
                </div>
              )}
            </div>
          )}
          
          {/* 테스트 기능 영역 - activeTab이 test-functions일 때만 표시 */}
          {activeTab === "test-functions" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-lg">테스트 기능</h3>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-[#FF6D70] border-[#FF6D70]"
                  onClick={() => setActiveTab(null)}
                >
                  <X className="h-4 w-4 mr-1" />
                  닫기
                </Button>
              </div>
              
              <div className="bg-white rounded-3xl p-5 shadow-sm">
                <h3 className="font-semibold text-lg mb-3">보호자 호출 테스트</h3>
                <p className="text-gray-600 text-sm mb-4">
                  보호자 호출 테스트를 실행하면 등록된 보호자에게 테스트 메시지가 전송됩니다.
                  실제 상황이 아님을 먼저 안내한 후 테스트를 진행하세요.
                </p>
                <Button 
                  className="w-full bg-[#FF6D70] hover:bg-[#e55a81] text-white rounded-xl py-2.5 font-medium"
                  onClick={() => alert('테스트 메시지가 보호자에게 전송되었습니다.')}
                >
                  테스트 메시지 전송
                </Button>
              </div>
              
              <div className="bg-white rounded-3xl p-5 shadow-sm">
                <h3 className="font-semibold text-lg mb-3">응급 상황 시뮬레이션</h3>
                <p className="text-gray-600 text-sm mb-4">
                  실제 응급 상황이 발생했을 때의 앱 작동 방식을 시뮬레이션합니다.
                  이 테스트는 모든 보호자에게 알림을 보내지 않습니다.
                </p>
                <Button 
                  variant="outline"
                  className="w-full border-[#FF6D70] text-[#FF6D70] rounded-xl py-2.5 font-medium"
                  onClick={() => alert('응급 상황 시뮬레이션이 실행되었습니다. 알림 화면이 표시됩니다.')}
                >
                  시뮬레이션 시작
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>


    </div>
  );
};

export default EmergencyContacts;