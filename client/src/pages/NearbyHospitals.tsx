import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { 
  Phone, 
  Hospital, 
  MapPin, 
  Clock, 
  AlertCircle,
  Search,
  ChevronLeft,
  PhoneCall,
} from 'lucide-react';

// UI 컴포넌트 임포트
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import KakaoMap from '@/components/ui/KakaoMap';

// 전화 연결 함수
const callHospital = (phoneNumber: string) => {
  if (!phoneNumber) return;
  window.location.href = `tel:${phoneNumber.replace(/-/g, '')}`;
};

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

const NearbyHospitals = () => {
  const [, navigate] = useLocation();
  const [filteredHospitals, setFilteredHospitals] = useState<Hospital[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

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
    }
  ];

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
      {/* 헤더 */}
      <div className="flex items-center mb-4">
        <button 
          onClick={() => navigate('/')}
          className="p-2 mr-2"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-bold flex items-center">
          <Hospital className="mr-2 text-[#FF6D70]" /> 주변 병원 찾기
        </h1>
      </div>

      {/* 검색창 */}
      <div className="flex flex-col mb-4 gap-3">
        <div className="relative w-full">
          <Input
            type="text"
            placeholder="병원 이름이나 주소로 검색..."
            className="rounded-3xl pl-10 pr-4 py-2.5 w-full border-gray-200 shadow-sm text-xl"
            onChange={(e) => {
              const searchTerm = e.target.value.toLowerCase();
              
              // 검색어가 없으면 모든 병원 표시
              if (!searchTerm.trim()) {
                setFilteredHospitals(hospitals);
                return;
              }
              
              // 검색어가 한 글자 이상이면 점진적 필터링 시작
              const filtered = hospitals.filter(hospital => 
                hospital.name.toLowerCase().includes(searchTerm) || 
                hospital.address.toLowerCase().includes(searchTerm) ||
                (hospital.specialty && hospital.specialty.toLowerCase().includes(searchTerm))
              );
              
              // 필터링 결과 업데이트 (결과가 없어도 표시)
              setFilteredHospitals(filtered);
            }}
          />
          <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* 지도 영역 */}
      <div className="rounded-3xl overflow-hidden mb-4" style={{ height: '400px', width: '100%' }}>
        <KakaoMap 
          hospitals={filteredHospitals} 
          className="h-full w-full"
          onHospitalSelect={(hospital) => {
            console.log('병원 선택됨:', hospital.name);
          }}
        />
      </div>

      {/* 병원 필터 버튼 */}
      <div className="mb-4 space-y-2">
        {/* 첫 번째 줄: 모든병원, 심장전문, 응급센터 */}
        <div className="grid grid-cols-3 gap-1">
          <button 
            className={`rounded-full px-2 py-1.5 text-xs font-medium flex items-center justify-center ${!activeFilter ? 'bg-[#FF6D70] text-white' : 'bg-white text-gray-700 border border-gray-200'}`}
            onClick={() => {
              setActiveFilter(null);
              setFilteredHospitals(hospitals);
            }}
          >
            <Hospital className="h-3 w-3 mr-0.5" />
            <span>모든 병원</span>
          </button>
          <button 
            className={`rounded-full px-2 py-1.5 text-xs font-medium flex items-center justify-center ${activeFilter === 'heart' ? 'bg-[#FF6D70] text-white' : 'bg-white text-gray-700 border border-gray-200'}`}
            onClick={() => {
              setActiveFilter('heart');
              const filtered = hospitals.filter(hospital => 
                hospital.specialty && (
                  hospital.specialty.includes('심장') || 
                  hospital.specialty.includes('심혈관') ||
                  hospital.specialty.includes('심장센터') ||
                  hospital.specialty.includes('심장전문')
                )
              );
              setFilteredHospitals(filtered);
            }}
          >
            <span className="text-[12px] mr-0.5">♥</span>
            <span>심장 전문</span>
          </button>
          <button 
            className={`rounded-full px-2 py-1.5 text-xs font-medium flex items-center justify-center ${activeFilter === 'emergency' ? 'bg-[#FF6D70] text-white' : 'bg-white text-gray-700 border border-gray-200'}`}
            onClick={() => {
              setActiveFilter('emergency');
              const filtered = hospitals.filter(hospital => 
                hospital.specialty && hospital.specialty.includes('응급')
              );
              setFilteredHospitals(filtered);
            }}
          >
            <AlertCircle className="h-3 w-3 mr-0.5" />
            <span>응급센터</span>
          </button>
        </div>
        
        {/* 두 번째 줄: 24시간, 종합병원 */}
        <div className="grid grid-cols-2 gap-1">
          <button 
            className={`rounded-full px-2 py-1.5 text-xs font-medium flex items-center justify-center ${activeFilter === '24h' ? 'bg-[#FF6D70] text-white' : 'bg-white text-gray-700 border border-gray-200'}`}
            onClick={() => {
              setActiveFilter('24h');
              const filtered = hospitals.filter(hospital => 
                hospital.isOpen24h
              );
              setFilteredHospitals(filtered);
            }}
          >
            <Clock className="h-3 w-3 mr-0.5" />
            <span>24시간 운영</span>
          </button>
          <button 
            className={`rounded-full px-2 py-1.5 text-xs font-medium flex items-center justify-center ${activeFilter === 'general' ? 'bg-[#FF6D70] text-white' : 'bg-white text-gray-700 border border-gray-200'}`}
            onClick={() => {
              setActiveFilter('general');
              const filtered = hospitals.filter(hospital => 
                hospital.specialty && 
                (hospital.specialty.includes('종합병원') || hospital.name.includes('메리놀'))
              );
              setFilteredHospitals(filtered);
            }}
          >
            <span className="text-[12px] mr-0.5 font-bold">종</span>
            <span>종합병원</span>
          </button>
        </div>
      </div>

      {/* 병원 목록 */}
      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center">
          <MapPin className="h-4 w-4 text-[#FF6D70] mr-1" />
          주변 병원 {filteredHospitals.length}개
        </h3>
        <div className="space-y-3 mb-8">
          {filteredHospitals.map((hospital) => (
            <div 
              key={hospital.id} 
              className="bg-white rounded-3xl p-4 shadow-sm"
            >
              <div className="flex items-start">
                {hospital.specialty && hospital.specialty.includes('심장') ? (
                  <div className="w-10 h-10 rounded-full bg-[#FF6D70] flex items-center justify-center text-white mr-3 font-bold border-2 border-white shadow-md">
                    ♥
                  </div>
                ) : hospital.specialty && hospital.specialty.includes('응급') ? (
                  <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white mr-3 font-extrabold border-2 border-white shadow-md">
                    !
                  </div>
                ) : hospital.isOpen24h ? (
                  <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white mr-3 font-bold border-2 border-white shadow-md">
                    24
                  </div>
                ) : hospital.specialty && (hospital.specialty.includes('종합병원') || hospital.name.includes('메리놀')) ? (
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white mr-3 font-bold border-2 border-white shadow-md">
                    종
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#FF6D70] flex items-center justify-center text-white mr-3 border-2 border-white shadow-md">
                    <Hospital className="h-5 w-5" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center">
                    <h3 className="font-bold text-gray-800">{hospital.name}</h3>
                    {hospital.isOpen24h && (
                      <span className="ml-2 text-xs rounded-full bg-green-100 text-green-700 px-2 py-0.5 font-medium">
                        24시간
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs mt-1 whitespace-nowrap overflow-hidden text-ellipsis" style={{ maxWidth: '100%' }}>
                    {hospital.distance} • {hospital.address}
                  </p>
                  {hospital.specialty && (
                    <div className="mt-1.5">
                      {hospital.specialty.split(', ').map((spec, idx) => (
                        <span 
                          key={idx} 
                          className="inline-block mr-1 mb-0.5 text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="ml-2">
                  <button 
                    className="w-8 h-8 rounded-full bg-[#FFE2E9] flex items-center justify-center text-[#FF6D70]"
                    onClick={() => callHospital(hospital.phone)}
                  >
                    <PhoneCall className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NearbyHospitals;