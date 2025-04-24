import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, AlertCircle, Loader2 } from 'lucide-react';

// 병원 인터페이스 정의
interface Hospital {
  id: number;
  name: string;
  distance: string;
  address: string;
  phone: string;
  isOpen24h: boolean;
  specialty?: string;
  latitude?: number;
  longitude?: number;
}

interface MapProps {
  hospitals?: Hospital[];
  onHospitalSelect?: (hospital: Hospital) => void;
  className?: string;
}

// 전역 변수 선언으로 TypeScript 오류 방지
declare global {
  interface Window {
    L: any;
  }
}

// OpenStreetMap 지도 컴포넌트 (실제 지도 표시)
const OpenStreetMap: React.FC<MapProps> = ({ 
  hospitals = [],
  onHospitalSelect,
  className = ""
}) => {
  // DOM 요소 참조 생성
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  
  // 상태 설정
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState({ lat: 37.5666, lng: 126.9779 }); // 기본값: 서울시청
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  
  // 사용자 위치 가져오기
  const getUserLocation = () => {
    if (navigator.geolocation) {
      setIsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log('사용자 위치 확인:', latitude, longitude);
          setUserLocation({ lat: latitude, lng: longitude });
          
          // 위치를 가져온 후 지도 업데이트
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([latitude, longitude], 15);
            updateUserMarker(latitude, longitude);
          }
          setIsLoading(false);
        },
        (error) => {
          console.error('위치 정보 가져오기 실패:', error);
          // 기본 위치 사용 (서울시청)
          setIsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }
  };
  
  // 사용자 마커 업데이트
  const updateUserMarker = (lat: number, lng: number) => {
    if (!mapInstanceRef.current) return;
    
    // 기존 사용자 마커 제거
    mapInstanceRef.current.eachLayer((layer: any) => {
      if (layer._leaflet_id && layer.options && layer.options.className === 'user-marker') {
        mapInstanceRef.current.removeLayer(layer);
      }
    });
    
    // 사용자 마커 추가
    const userIcon = window.L.divIcon({
      className: 'user-marker',
      html: '<div class="user-marker-icon"></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
    
    window.L.marker([lat, lng], { icon: userIcon })
      .addTo(mapInstanceRef.current)
      .bindPopup('현재 위치')
      .openPopup();
  };

  // 지도 초기화 함수
  const initializeMap = () => {
    if (!window.L) {
      console.error('Leaflet 라이브러리를 찾을 수 없습니다.');
      setMapError('지도 라이브러리 로드에 실패했습니다.');
      setIsLoading(false);
      return;
    }
    
    try {
      // 기존 지도 인스턴스가 있으면 제거
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      
      // 지도 요소가 없으면 종료
      if (!mapContainerRef.current) {
        console.error('지도 컨테이너 요소를 찾을 수 없습니다.');
        return;
      }
      
      console.log('지도 초기화 시작...');
      
      // 지도 생성
      const map = window.L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView(
        [userLocation.lat, userLocation.lng], 
        15
      );
      
      // 타일 레이어 추가 (OpenStreetMap)
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);
      
      // 줌 컨트롤러 추가 (오른쪽 아래)
      window.L.control.zoom({
        position: 'bottomright'
      }).addTo(map);
      
      // 사용자 위치 마커 추가
      updateUserMarker(userLocation.lat, userLocation.lng);
      
      // 병원 마커 추가
      hospitals.forEach(hospital => {
        if (hospital.latitude && hospital.longitude) {
          const hospitalIcon = window.L.divIcon({
            className: 'hospital-marker',
            html: '<div class="hospital-marker-icon"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
          
          window.L.marker([hospital.latitude, hospital.longitude], { icon: hospitalIcon })
            .addTo(map)
            .bindPopup(`
              <div style="min-width: 150px;">
                <b>${hospital.name}</b><br>
                거리: ${hospital.distance}<br>
                주소: ${hospital.address}<br>
                전화: ${hospital.phone}<br>
                ${hospital.isOpen24h ? '<span style="color: #10b981;">24시간 운영</span>' : ''}
              </div>
            `)
            .on('click', () => {
              setSelectedHospital(hospital);
              if (onHospitalSelect) {
                onHospitalSelect(hospital);
              }
            });
        }
      });
      
      // 지도 인스턴스 저장
      mapInstanceRef.current = map;
      
      // 지도 로드 후 크기 강제 업데이트 (모바일에서 발생하는 사이즈 이슈 해결)
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 500);
      
      setIsLoading(false);
      console.log('지도 초기화 완료!');
    } catch (error) {
      console.error('지도 초기화 에러:', error);
      setMapError('지도를 불러오는 중 오류가 발생했습니다.');
      setIsLoading(false);
    }
  };

  // 지도 초기화 (컴포넌트 마운트 시)
  useEffect(() => {
    // 로딩 상태 초기화
    setIsLoading(true);
    setMapError(null);
    
    // 사용자 위치 가져오기
    getUserLocation();
    
    // 지도 초기화 타이머 (라이브러리 로드 시간 확보)
    const initTimer = setTimeout(() => {
      // setTimeout으로 DOM이 렌더링될 시간을 주기
      if (mapContainerRef.current) {
        console.log('지도 컨테이너 요소 확인됨, 초기화 시작');
        initializeMap();
      } else {
        console.log('지도 컨테이너 요소를 찾을 수 없음, 다시 시도');
        // 한 번 더 시도
        const retryTimer = setTimeout(() => {
          if (mapContainerRef.current) {
            console.log('재시도: 지도 컨테이너 요소 확인됨');
            initializeMap();
          } else {
            console.error('재시도 후에도 지도 컨테이너를 찾을 수 없음');
            setMapError('지도를 로드할 수 없습니다. 페이지를 새로고침해 주세요.');
            setIsLoading(false);
          }
        }, 1000);
        
        return () => {
          clearTimeout(retryTimer);
        };
      }
    }, 500);
    
    // 컴포넌트 언마운트 시 클린업
    return () => {
      clearTimeout(initTimer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []); // 컴포넌트 마운트 시 한 번만 실행
  
  // 병원 목록이 업데이트되면 마커 재설정
  useEffect(() => {
    if (mapInstanceRef.current && !isLoading) {
      // 병원 마커 제거
      mapInstanceRef.current.eachLayer((layer: any) => {
        if (layer._leaflet_id && layer.options && layer.options.className === 'hospital-marker') {
          mapInstanceRef.current.removeLayer(layer);
        }
      });
      
      // 병원 마커 추가
      hospitals.forEach(hospital => {
        if (hospital.latitude && hospital.longitude) {
          const hospitalIcon = window.L.divIcon({
            className: 'hospital-marker',
            html: '<div class="hospital-marker-icon"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
          
          window.L.marker([hospital.latitude, hospital.longitude], { icon: hospitalIcon })
            .addTo(mapInstanceRef.current)
            .bindPopup(`
              <div style="min-width: 150px;">
                <b>${hospital.name}</b><br>
                거리: ${hospital.distance}<br>
                주소: ${hospital.address}<br>
                전화: ${hospital.phone}<br>
                ${hospital.isOpen24h ? '<span style="color: #10b981;">24시간 운영</span>' : ''}
              </div>
            `)
            .on('click', () => {
              setSelectedHospital(hospital);
              if (onHospitalSelect) {
                onHospitalSelect(hospital);
              }
            });
        }
      });
    }
  }, [hospitals, isLoading]);
  
  // 외부 지도 앱으로 열기 (전체 지도)
  const openInMapApp = () => {
    const mapUrl = `https://www.google.com/maps/search/병원/@${userLocation.lat},${userLocation.lng},14z`;
    window.open(mapUrl, '_blank');
  };
  
  // 특정 병원 외부 지도 앱으로 열기
  const openHospitalInMapApp = (hospital: Hospital) => {
    if (hospital.latitude && hospital.longitude) {
      const mapUrl = `https://www.google.com/maps/search/${encodeURIComponent(hospital.name)}/@${hospital.latitude},${hospital.longitude},17z`;
      window.open(mapUrl, '_blank');
    }
  };
  
  // 로딩 중 UI
  if (isLoading) {
    return (
      <div className={`rounded-3xl overflow-hidden relative bg-gray-50 ${className}`} style={{ minHeight: '300px' }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 text-[#FF6D70] animate-spin mb-3" />
          <p className="text-gray-500 text-sm">지도를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }
  
  // 에러 UI
  if (mapError) {
    return (
      <div className={`rounded-3xl overflow-hidden relative bg-gray-50 ${className}`} style={{ minHeight: '300px' }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          <AlertCircle className="h-10 w-10 text-[#FF6D70] mb-3" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">지도 로드 실패</h3>
          <p className="text-sm text-gray-500 mb-4">{mapError}</p>
          
          <button 
            className="bg-[#FF6D70] text-white px-5 py-3 rounded-xl font-medium flex items-center justify-center w-full max-w-xs"
            onClick={openInMapApp}
          >
            <Navigation className="h-5 w-5 mr-2" />
            외부 지도 앱에서 보기
          </button>
          
          <button 
            className="mt-3 text-[#FF6D70] underline text-sm"
            onClick={() => { setMapError(null); initializeMap(); }}
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }
  
  // 정상 지도 UI
  return (
    <div className={`rounded-3xl overflow-hidden relative ${className}`} style={{ minHeight: '350px' }}>
      {/* 지도 컨테이너 */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full" 
        style={{ minHeight: '350px', zIndex: 1 }}
      ></div>
      
      {/* 상단 컨트롤 */}
      <div className="absolute top-3 right-3 left-3 flex justify-between z-10">
        <button 
          className="bg-white rounded-xl p-2.5 shadow-md flex items-center text-xs"
          onClick={getUserLocation}
        >
          <MapPin className="h-4 w-4 text-[#FF6D70] mr-1.5" />
          <span>내 위치</span>
        </button>
        
        <button 
          className="bg-white rounded-xl p-2.5 shadow-md flex items-center text-xs"
          onClick={openInMapApp}
        >
          <Navigation className="h-4 w-4 text-[#FF6D70] mr-1.5" />
          <span>지도 앱</span>
        </button>
      </div>
      
      {/* 병원 목록 오버레이 */}
      {hospitals.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 bg-white bg-opacity-95 p-3 rounded-t-xl z-10 max-h-40 overflow-y-auto shadow-lg">
          <div className="mb-2 font-medium text-sm flex justify-between items-center">
            <div className="flex items-center">
              <MapPin className="h-4 w-4 text-[#FF6D70] mr-1" />
              <span>주변 병원 {hospitals.length}개</span>
            </div>
            {selectedHospital && (
              <button 
                className="text-xs text-gray-500 underline"
                onClick={() => setSelectedHospital(null)}
              >
                모두 보기
              </button>
            )}
          </div>
          
          <div className="space-y-1.5">
            {/* 선택된 병원이 있으면 해당 병원만 상세 표시 */}
            {selectedHospital ? (
              <div className="bg-white rounded-lg p-3 text-left border border-[#FF6D70]/20">
                <div className="flex justify-between items-start">
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-full bg-[#FFE2E9] flex items-center justify-center mr-2.5 mt-0.5 flex-shrink-0">
                      <MapPin className="h-4 w-4 text-[#FF6D70]" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">{selectedHospital.name}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">{selectedHospital.address}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        거리: {selectedHospital.distance} • 
                        {selectedHospital.isOpen24h ? 
                          <span className="text-green-600 font-medium"> 24시간 운영</span> : 
                          ' 운영시간 확인 필요'}
                      </p>
                      <div className="mt-2 flex space-x-2">
                        <button 
                          className="bg-[#FF6D70] text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                          onClick={() => {
                            if (selectedHospital.phone) {
                              window.location.href = `tel:${selectedHospital.phone.replace(/-/g, '')}`;
                            }
                          }}
                        >
                          전화하기
                        </button>
                        <button 
                          className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium"
                          onClick={() => openHospitalInMapApp(selectedHospital)}
                        >
                          길찾기
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // 선택된 병원이 없으면 목록 표시
              hospitals.slice(0, 3).map(hospital => (
                <div 
                  key={hospital.id}
                  className="bg-white rounded-lg p-2 text-left cursor-pointer hover:bg-gray-50 border border-gray-100"
                  onClick={() => {
                    setSelectedHospital(hospital);
                    // 지도 중심 이동
                    if (hospital.latitude && hospital.longitude && mapInstanceRef.current) {
                      mapInstanceRef.current.setView([hospital.latitude, hospital.longitude], 16);
                    }
                    if (onHospitalSelect) {
                      onHospitalSelect(hospital);
                    }
                  }}
                >
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mr-2 flex-shrink-0">
                      <MapPin className="h-3 w-3 text-green-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-xs text-gray-800 truncate">{hospital.name}</h4>
                      <p className="text-[10px] text-gray-500 truncate">{hospital.distance} • {hospital.isOpen24h ? '24시간' : '응급실'}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {!selectedHospital && hospitals.length > 3 && (
              <p className="text-[10px] text-center text-gray-500">
                외 {hospitals.length - 3}개 더 있습니다
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OpenStreetMap;