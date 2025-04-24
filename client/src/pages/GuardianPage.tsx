import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useApp } from '@/contexts/AppContext';
import { Phone, Bell, AlertCircle, User, Activity } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';

type MonitoredPatient = {
  id: number;
  name: string;
  age: number;
  gender: 'male' | 'female';
  risk: number;
  medicalConditions: string[];
  latestData: {
    heartRate: number;
    oxygenLevel: number;
    bloodPressure: string;
    updatedAt: string;
  };
};

const GuardianPage = () => {
  const [, setLocation] = useLocation();
  const { user } = useApp();
  const [loading, setLoading] = useState(true);

  // 모니터링 중인 환자 목록 가져오기
  // API 호출 문제 해결을 위해 직접 상태 관리
  const [isLoading, setIsLoading] = useState(true);
  const [monitoredPatients, setMonitoredPatients] = useState<MonitoredPatient[]>([]);



  useEffect(() => {
    // 로딩 시뮬레이션 및 예시 데이터 설정
    const timer = setTimeout(() => {
      setLoading(false);
      setIsLoading(false);
      // 예시 데이터 설정
      setMonitoredPatients([
        {
          id: 1,
          name: '이서연',
          age: 48,
          gender: 'female',
          risk: 72,
          medicalConditions: ['심장질환', '고혈압'],
          latestData: {
            heartRate: 112,
            oxygenLevel: 94,
            bloodPressure: '145/95',
            updatedAt: '방금 전'
          }
        },
        {
          id: 2,
          name: '김민준',
          age: 65,
          gender: 'male',
          risk: 48,
          medicalConditions: ['고혈압'],
          latestData: {
            heartRate: 95,
            oxygenLevel: 96,
            bloodPressure: '155/95',
            updatedAt: '13분 전'
          }
        },
        {
          id: 3,
          name: '박지현',
          age: 42,
          gender: 'female',
          risk: 12,
          medicalConditions: ['당뇨'],
          latestData: {
            heartRate: 68,
            oxygenLevel: 98,
            bloodPressure: '125/75',
            updatedAt: '1시간 전'
          }
        }
      ]);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // 위험도에 따른 배경색 클래스 얻기
  const getRiskBgClass = (risk: number) => {
    if (risk < 25) return 'bg-green-50';
    if (risk < 50) return 'bg-yellow-50';
    if (risk < 75) return 'bg-orange-50';
    return 'bg-red-50';
  };

  // 위험도에 따른 텍스트 색상 클래스 얻기
  const getRiskTextClass = (risk: number) => {
    if (risk < 25) return 'text-green-600';
    if (risk < 50) return 'text-yellow-600';
    if (risk < 75) return 'text-orange-600';
    return 'text-red-600';
  };

  if (loading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">보호자 모드</h1>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">보호자 모드</h1>
      
      {/* 비상연락 모듈 */}
      <Card className="mb-6 bg-red-50 border-red-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-red-600">응급 상황 대응</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-3">
            <Button variant="destructive" className="flex-1 gap-2">
              <Phone size={18} />
              119 응급 전화
            </Button>
            <Button variant="outline" className="flex-1 gap-2 border-red-200 text-red-600 hover:bg-red-100">
              <Bell size={18} />
              병원 연락
            </Button>
          </div>
          
          <div className="text-xs text-red-600">
            <p className="mb-1">심근경색 의심 증상:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>가슴 통증이나 압박감</li>
              <li>어깨, 목, 턱으로 퍼지는 통증</li>
              <li>호흡 곤란 및 구역질</li>
              <li>식은땀 및 현기증</li>
            </ul>
          </div>
        </CardContent>
      </Card>
      
      {/* 모니터링 환자 목록 */}
      <h2 className="text-lg font-semibold mb-3">모니터링 중인 대상자</h2>
      <div className="space-y-4">
        {monitoredPatients.map(patient => (
          <Card 
            key={patient.id} 
            className={`${getRiskBgClass(patient.risk)} border-0 hover:shadow-md transition-shadow duration-200 cursor-pointer`}
            onClick={() => setLocation(`/patient/${patient.id}`)}
          >
            <CardContent className="p-4">
              <div className="flex items-start">
                <div className="mr-4">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={`https://randomuser.me/api/portraits/${patient.gender === 'female' ? 'women' : 'men'}/${patient.id}.jpg`} />
                    <AvatarFallback className="bg-primary/10">
                      <User size={24} />
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center">
                        <h3 className="font-bold text-lg">{patient.name}</h3>
                        {patient.risk > 70 && (
                          <AlertCircle size={16} className="ml-1 text-red-500" />
                        )}
                      </div>
                      <p className="text-gray-500 text-sm">{patient.age}세 · {patient.gender === 'male' ? '남성' : '여성'}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {patient.medicalConditions.map((condition, idx) => (
                          <Badge key={idx} variant="outline" className={`${getRiskTextClass(patient.risk)} bg-white/50`}>
                            {condition}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getRiskTextClass(patient.risk)}`}>
                        {patient.risk}%
                      </div>
                      <div className="text-xs text-gray-500">위험도</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center bg-white/50 rounded-lg p-2">
                    <div>
                      <div className="flex items-center justify-center gap-1">
                        <Activity size={14} className="text-red-500" />
                        <span className={`font-bold ${patient.latestData.heartRate > 100 ? 'text-red-500' : ''}`}>
                          {patient.latestData.heartRate}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">심박수</div>
                    </div>
                    <div>
                      <div className="font-bold">
                        {patient.latestData.oxygenLevel}%
                      </div>
                      <div className="text-xs text-gray-500">산소포화도</div>
                    </div>
                    <div>
                      <div className="font-bold">
                        {patient.latestData.bloodPressure}
                      </div>
                      <div className="text-xs text-gray-500">혈압</div>
                    </div>
                  </div>
                  
                  <div className="text-right mt-2 text-xs text-gray-500">
                    최종 업데이트: {patient.latestData.updatedAt}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Button variant="outline" className="w-full mt-4">
        보호 대상자 추가
      </Button>
    </div>
  );
};

export default GuardianPage;