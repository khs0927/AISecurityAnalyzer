import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

declare global {
  interface Window {
    kakao: any;
  }
}

// 병원 인터페이스 정의
interface Hospital {
  id: number | string;
  name: string;
  distance: string | number;
  address: string;
  phone?: string;
  tel?: string; // API 응답 호환성
  isOpen24h?: boolean;
  isEmergency?: boolean;
  isHeartCenter?: boolean;
  specialty?: string | string[];
  latitude?: number;
  longitude?: number;
  lat?: number; // API 응답 호환성
  lng?: number; // API 응답 호환성
}

interface MapProps {
  hospitals?: Hospital[];
  onHospitalSelect?: (hospital: Hospital) => void;
  className?: string;
}

// 카카오맵 스크립트 동적 로드 함수
const loadKakaoMapScript = (apiKey: string) => {
  return new Promise<void>((resolve, reject) => {
    if (window.kakao && window.kakao.maps) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=services,clusterer,drawing&autoload=false`;
    script.async = true;
    script.onload = () => {
      window.kakao.maps.load(() => {
        resolve();
      });
    };
    script.onerror = (e) => {
      reject(e);
    };

    document.head.appendChild(script);
  });
};

// 카카오맵 지도 컴포넌트
const KakaoMap: React.FC<MapProps> = ({ 
  hospitals: propHospitals = [],
  onHospitalSelect,
  className = ""
}) => {
  // DOM 요소 참조 생성
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  
  // 상태 설정
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [kakaoMapApiKey, setKakaoMapApiKey] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState({ lat: 37.5666, lng: 126.9779 }); // 기본값: 서울시청
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [filteredHospitals, setFilteredHospitals] = useState<Hospital[]>([]);
  const [mapMessage, setMapMessage] = useState<string>('');
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  
  // API 키 가져오기
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const response = await fetch('/api/config/kakao-map-key');
        const data = await response.json();
        
        if (data && data.apiKey) {
          setKakaoMapApiKey(data.apiKey);
          
          // API 키를 가져온 후 스크립트 로드
          await loadKakaoMapScript(data.apiKey);
          setIsScriptLoaded(true);
        } else {
          setMapError('API 키를 가져올 수 없습니다.');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('API 키 가져오기 오류:', error);
        setMapError('API 키를 가져오는 중 오류가 발생했습니다.');
        setIsLoading(false);
      }
    };
    
    fetchApiKey();
  }, []);
  
  // 사용자 위치 가져오기
  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
        },
        (error) => {
          console.error('위치 정보 가져오기 실패:', error);
          // 위치 정보를 가져오지 못해도 기본 위치로 지도 초기화
        }
      );
    }
  };
  
  // 사용자 위치 마커 업데이트
  const updateUserMarker = (lat: number, lng: number, mapToUse?: any) => {
    const map = mapToUse || mapInstanceRef.current;
    
    if (!map) {
      console.warn('지도가 초기화되지 않았습니다.');
      return;
    }
    
    // 기존 사용자 마커 제거
    if (map.userMarker) {
      map.userMarker.setMap(null);
    }
    
    // 사용자 위치 마커 생성
    const userMarkerHtml = `
      <div class="user-marker">
        <div class="user-marker-inner"></div>
      </div>
    `;
    
    const userMarker = new window.kakao.maps.CustomOverlay({
      position: new window.kakao.maps.LatLng(lat, lng),
      content: userMarkerHtml,
      map: map,
      zIndex: 1
    });
    
    // 마커 저장
    map.userMarker = userMarker;
  };
  
  // 지도 초기화 함수
  const initializeMap = () => {
    try {
      if (!mapContainerRef.current) {
        console.error('지도 컨테이너를 찾을 수 없습니다.');
        setMapError('지도를 불러올 수 없습니다.');
        setIsLoading(false);
        return;
      }
      
      // 카카오맵 API가 로드되었는지 확인
      if (!window.kakao || !window.kakao.maps) {
        console.error('카카오맵 API를 찾을 수 없습니다.');
        setMapError('카카오맵 API를 불러오는데 실패했습니다.');
        setIsLoading(false);
        return;
      }
      
      console.log('카카오맵 초기화 시작...');
      
      // 지도 생성
      const options = {
        center: new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng),
        level: 3
      };
      
      const map = new window.kakao.maps.Map(mapContainerRef.current, options);
      
      // 지도 컨트롤 추가
      const zoomControl = new window.kakao.maps.ZoomControl();
      map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);
      
      // 사용자 위치 마커 추가
      updateUserMarker(userLocation.lat, userLocation.lng, map);
      
      // 병원 마커를 저장할 배열 초기화
      map.hospitalMarkers = [];
      
      // 지도 인스턴스 저장
      mapInstanceRef.current = map;
      
      setIsLoading(false);
      console.log('카카오맵 초기화 완료!');
    } catch (error) {
      console.error('지도 초기화 에러:', error);
      setMapError('지도를 불러오는 중 오류가 발생했습니다.');
      setIsLoading(false);
    }
  };
  
  // 병원 마커 추가 (지도에 병원 위치 표시)
  const addHospitalMarkers = (hospitalList?: Hospital[]) => {
    if (!mapInstanceRef.current || !Array.isArray(hospitalList || hospitals)) {
      console.warn('지도 또는 병원 데이터가 없습니다');
      return;
    }
    
    const map = mapInstanceRef.current;
    const hospitalsToUse = hospitalList || hospitals;
    
    // 기존 마커 제거 (지도가 초기화될 때마다)
    if (!map.hospitalMarkers) {
      map.hospitalMarkers = [];
    } else {
      map.hospitalMarkers.forEach((marker: any) => {
        marker.setMap(null);
      });
      map.hospitalMarkers = [];
    }
    
    // 인포윈도우도 닫기
    if (map.openedInfoWindow) {
      map.openedInfoWindow.setMap(null);
      map.openedInfoWindow = null;
    }
    
    // 병원 마커 추가
    console.log(`${hospitalsToUse.length}개 병원 마커 추가 중...`);
    
    // 마커 이미지 경로 (다양한 병원 유형별 아이콘)
    const hospitalMarkerPath = '/icons/hospital.svg';
    const heartMarkerPath = '/icons/heart-center.svg';
    const emergencyMarkerPath = '/icons/emergency.svg';
    const generalMarkerPath = '/icons/general-hospital.svg';
    
    hospitalsToUse.forEach(hospital => {
      // 병원 좌표
      const lat = hospital.latitude || hospital.lat || 0;
      const lng = hospital.longitude || hospital.lng || 0;
      
      if (lat && lng) {
        const position = new window.kakao.maps.LatLng(lat, lng);
        
        // 마커 유형 결정
        // 우선순위: 심장전문 > 응급의료센터 > 24시간 > 종합병원
        const isHeartCenter = hospital.isHeartCenter || (hospital.specialty && (typeof hospital.specialty === 'string' ? hospital.specialty.includes('심장') : Array.isArray(hospital.specialty) && hospital.specialty.some(s => s.includes('심장'))));
        const isEmergency = hospital.isEmergency || (hospital.specialty && (typeof hospital.specialty === 'string' ? hospital.specialty.includes('응급') : Array.isArray(hospital.specialty) && hospital.specialty.some(s => s.includes('응급'))));
        const isHospital24h = hospital.isOpen24h || (hospital.specialty && (typeof hospital.specialty === 'string' ? hospital.specialty.includes('24시간') : Array.isArray(hospital.specialty) && hospital.specialty.some(s => s.includes('24시간'))));
        const isGeneralHospital = hospital.name.includes('메리놀') || hospital.name.includes('종합') || (hospital.specialty && (typeof hospital.specialty === 'string' ? hospital.specialty.includes('종합') : Array.isArray(hospital.specialty) && hospital.specialty.some(s => s.includes('종합'))));
        
        let markerClass = 'hospital-marker';
        let markerContent = 'H';
        
        // 우선순위: 심장 전문 > 응급의료센터 > 24시간 병원 > 종합병원
        if (isHeartCenter) {
          markerClass = 'heart-marker'; // 심장전문 - 심장 모양 아이콘
          markerContent = '♥';
        } else if (isEmergency) {
          markerClass = 'emergency-marker'; // 응급의료센터 - 붉은 배경에 느낌표
          markerContent = '!'; // 요청대로 응급센터는 느낌표로 변경
        } else if (isHospital24h) {
          markerClass = 'emergency-marker-24h'; // 24시간 - 녹색 배경에 24 표시
          markerContent = '24';
        } else if (isGeneralHospital) {
          markerClass = 'general-hospital-marker'; // 종합병원 - 파란 배경에 "종" 표시
          markerContent = '종'; // 메리놀병원 등은 "종" 아이콘 표시
        }
        
        const hospitalMarkerHtml = `
          <div class="${markerClass}">
            ${markerContent}
          </div>
        `;
        
        // 커스텀 오버레이로 마커 추가
        const hospitalMarker = new window.kakao.maps.CustomOverlay({
          position: position,
          content: hospitalMarkerHtml,
          map: map,
          yAnchor: 0.5,
          zIndex: 2
        });
        
        // 병원 정보창 HTML
        const phoneNumber = hospital.phone || hospital.tel || '';
        const hospitalInfo24h = hospital.isOpen24h || (hospital.isEmergency && hospital.specialty && (typeof hospital.specialty === 'string' ? hospital.specialty.includes('24시간') : Array.isArray(hospital.specialty) && hospital.specialty.some(s => s.includes('24시간'))));
        const specialtyText = Array.isArray(hospital.specialty) ? hospital.specialty.join(', ') : hospital.specialty || '';
        
        const infoContentHtml = `
          <div class="hospital-info-window" style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); width: 280px; max-width: 90vw; font-family: 'Pretendard', sans-serif; position: relative;">
            <h4 style="margin-top: 0; margin-bottom: 10px; font-size: 16px; font-weight: 700; color: #333;">${hospital.name}</h4>
            <div style="position: absolute; top: 5px; right: 5px; width: 20px; height: 20px; background: #f5f5f5; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;" onclick="this.parentNode.style.display='none'">×</div>
            <p style="margin: 5px 0; font-size: 13px; color: #666;">거리: ${typeof hospital.distance === 'number' ? hospital.distance + 'km' : hospital.distance}</p>
            <p style="margin: 5px 0; font-size: 13px; color: #666;">주소: ${hospital.address}</p>
            <p style="margin: 5px 0; font-size: 13px; color: #666;">전화: ${phoneNumber}</p>
            ${hospitalInfo24h ? '<p style="margin: 5px 0; color: #10b981; font-weight: bold; font-size: 13px;">24시간 운영</p>' : ''}
            ${specialtyText ? `<p style="margin: 5px 0; font-size: 13px; color: #666;">진료과목: ${specialtyText}</p>` : ''}
            <div style="margin-top: 12px; display: flex; gap: 8px;">
              <a href="tel:${phoneNumber.replace(/-/g, '')}" style="background: #FF6D70; color: white; padding: 8px 12px; border-radius: 8px; font-size: 13px; text-decoration: none; flex: 1; text-align: center; font-weight: 500;">전화하기</a>
              <a href="https://map.kakao.com/link/to/${encodeURIComponent(hospital.name)},${lat},${lng}" target="_blank" style="background: #f5f5f5; color: #333; padding: 8px 12px; border-radius: 8px; font-size: 13px; text-decoration: none; flex: 1; text-align: center; font-weight: 500;">길찾기</a>
            </div>
          </div>
        `;
        
        // 인포윈도우 생성
        const infoWindow = new window.kakao.maps.CustomOverlay({
          position: position,
          content: infoContentHtml,
          xAnchor: 0.5,
          yAnchor: 1.5,
          zIndex: 3
        });
        
        // 마커 클릭 이벤트 (DOM 요소에 직접 이벤트 추가)
        const markerElement = hospitalMarker.getContent();
        if (markerElement && typeof markerElement !== 'string') {
          markerElement.addEventListener('click', function() {
            // 모든 인포윈도우 닫기
            if (map.openedInfoWindow) {
              map.openedInfoWindow.setMap(null);
            }
            
            // 현재 인포윈도우 열기
            infoWindow.setMap(map);
            map.openedInfoWindow = infoWindow;
            
            // 선택된 병원 상태 업데이트
            setSelectedHospital(hospital);
            
            // 콜백 호출
            if (onHospitalSelect) {
              onHospitalSelect(hospital);
            }
          });
        }
        
        // 마커 저장 (커스텀 오버레이만 저장, 중복 추가 방지)
        map.hospitalMarkers.push(hospitalMarker);
      }
    });
  };
  
  // 지도 초기화 (카카오맵 스크립트 로드 후)
  useEffect(() => {
    if (isScriptLoaded && window.kakao && window.kakao.maps) {
      // 로딩 상태 초기화
      setIsLoading(true);
      setMapError(null);
      
      // 사용자 위치 가져오기
      getUserLocation();
      
      // 지도 초기화 타이머 (DOM 렌더링 시간 확보)
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
          // 카카오맵은 특별한 제거 과정이 필요 없음
          mapInstanceRef.current = null;
        }
      };
    }
  }, [isScriptLoaded]);
  
  // 주변 병원 정보 가져오기
  const fetchNearbyHospitals = async (lat: number, lng: number) => {
    try {
      console.log('주변 병원 정보 요청:', lat, lng);
      const response = await fetch(`/api/hospitals/nearby?lat=${lat}&lng=${lng}`);
      const data = await response.json();
      
      console.log('주변 병원 정보 응답:', data);
      
      if (data && data.hospitals && Array.isArray(data.hospitals) && data.hospitals.length > 0) {
        // API 응답에서 받은 병원 데이터 처리
        const processedHospitals: Hospital[] = data.hospitals.map((h: any) => ({
          id: h.id || Math.floor(Math.random() * 10000),
          name: h.name || "이름 없음",
          distance: h.distance ? `${h.distance}km` : "거리 정보 없음",
          address: h.address || "",
          phone: h.tel || h.phone || "번호 정보 없음",
          isOpen24h: h.isOpen24h || h.isEmergency || false,
          isEmergency: h.isEmergency || false,
          isHeartCenter: h.isHeartCenter || false,
          specialty: h.specialty || (h.isEmergency ? '응급의료센터' : ''),
          latitude: h.lat || h.latitude || 0,
          longitude: h.lng || h.longitude || 0
        }));
        
        // 병원 정렬 (우선순위: 심장 전문 > 응급의료센터 > 24시간 > 종합병원)
        const sortedHospitals = processedHospitals.sort((a, b) => {
          // 심장 전문 병원 최우선
          const aHeart = a.isHeartCenter || (a.specialty && (typeof a.specialty === 'string' ? a.specialty.includes('심장') : Array.isArray(a.specialty) && a.specialty.some(s => s.includes('심장')))) ? 1 : 0;
          const bHeart = b.isHeartCenter || (b.specialty && (typeof b.specialty === 'string' ? b.specialty.includes('심장') : Array.isArray(b.specialty) && b.specialty.some(s => s.includes('심장')))) ? 1 : 0;
          if (aHeart !== bHeart) return bHeart - aHeart;
          
          // 응급의료센터 두번째 우선
          const aEmergency = a.isEmergency || (a.specialty && (typeof a.specialty === 'string' ? a.specialty.includes('응급') : Array.isArray(a.specialty) && a.specialty.some(s => s.includes('응급')))) ? 1 : 0;
          const bEmergency = b.isEmergency || (b.specialty && (typeof b.specialty === 'string' ? b.specialty.includes('응급') : Array.isArray(b.specialty) && b.specialty.some(s => s.includes('응급')))) ? 1 : 0;
          if (aEmergency !== bEmergency) return bEmergency - aEmergency;
          
          // 24시간 병원 세번째 우선
          if (a.isOpen24h !== b.isOpen24h) return a.isOpen24h ? -1 : 1;
          
          // 종합병원 네번째 우선
          const aGeneral = a.specialty && (typeof a.specialty === 'string' ? a.specialty.includes('종합') : Array.isArray(a.specialty) && a.specialty.some(s => s.includes('종합'))) ? 1 : 0;
          const bGeneral = b.specialty && (typeof b.specialty === 'string' ? b.specialty.includes('종합') : Array.isArray(b.specialty) && b.specialty.some(s => s.includes('종합'))) ? 1 : 0;
          if (aGeneral !== bGeneral) return bGeneral - aGeneral;
          
          // 마지막으로 거리 기준 정렬
          const distA = typeof a.distance === 'string' ? parseFloat(a.distance.replace('km', '')) : Number(a.distance);
          const distB = typeof b.distance === 'string' ? parseFloat(b.distance.replace('km', '')) : Number(b.distance);
          return distA - distB;
        });
        
        setHospitals(sortedHospitals);
        setFilteredHospitals(sortedHospitals);
      } else {
        console.warn('병원 정보가 없거나 형식이 잘못되었습니다');
      }
    } catch (error) {
      console.error('병원 정보 가져오기 오류:', error);
    }
  };
  
  // 위치가 변경되면 주변 병원 정보 업데이트
  useEffect(() => {
    if (!isLoading && userLocation.lat && userLocation.lng) {
      fetchNearbyHospitals(userLocation.lat, userLocation.lng);
    }
  }, [userLocation, isLoading]);
  
  // 병원 목록이 업데이트되면 마커 재설정
  useEffect(() => {
    if (isScriptLoaded && mapInstanceRef.current && !isLoading && hospitals.length > 0) {
      addHospitalMarkers(hospitals);
    }
  }, [hospitals, isLoading, isScriptLoaded]);

  // 외부에서 전달받은 병원 목록이 변경되면 내부 상태 업데이트
  useEffect(() => {
    if (propHospitals && propHospitals.length > 0) {
      console.log('외부에서 전달된 병원 데이터 업데이트:', propHospitals.length, '개');
      setHospitals(propHospitals);
      setFilteredHospitals(propHospitals);
      
      // 지도가 이미 초기화되었다면 마커 추가
      if (isScriptLoaded && mapInstanceRef.current && !isLoading) {
        addHospitalMarkers(propHospitals);
      }
    }
  }, [propHospitals, isScriptLoaded, isLoading]);
  
  // 외부 지도 앱으로 열기 (전체 지도)
  const openInMapApp = () => {
    const mapUrl = `https://map.kakao.com/link/map/현재위치,${userLocation.lat},${userLocation.lng}`;
    window.open(mapUrl, '_blank');
  };
  
  // 특정 병원 외부 지도 앱으로 열기 (길찾기 기능)
  const openHospitalInMapApp = (hospital: Hospital) => {
    const lat = hospital.latitude || hospital.lat || 0;
    const lng = hospital.longitude || hospital.lng || 0;
    
    if (lat && lng) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const mapUrl = `https://map.kakao.com/link/to/${encodeURIComponent(hospital.name)},${lat},${lng}/from/현재위치,${latitude},${longitude}`;
            window.open(mapUrl, '_blank');
          },
          () => {
            // 위치를 가져올 수 없는 경우 일반 지도 링크로 대체
            const mapUrl = `https://map.kakao.com/link/map/${encodeURIComponent(hospital.name)},${lat},${lng}`;
            window.open(mapUrl, '_blank');
          }
        );
      } else {
        // 위치 서비스를 지원하지 않는 경우
        const mapUrl = `https://map.kakao.com/link/map/${encodeURIComponent(hospital.name)},${lat},${lng}`;
        window.open(mapUrl, '_blank');
      }
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
            onClick={() => { 
              setMapError(null); 
              if (isScriptLoaded) {
                initializeMap();
              }
            }}
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }
  
  // 현재 지도 영역에서 검색
  const searchInCurrentMapView = () => {
    if (mapInstanceRef.current) {
      const map = mapInstanceRef.current;
      const bounds = map.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      
      console.log('현재 지도 영역에서 검색:', sw.getLat(), sw.getLng(), ne.getLat(), ne.getLng());
      
      // 새로 추가한 API 호출
      setMapMessage('현재 지도에서 병원 검색 중...');
      fetch(`/api/hospitals/map-area?swLat=${sw.getLat()}&swLng=${sw.getLng()}&neLat=${ne.getLat()}&neLng=${ne.getLng()}`)
        .then(res => res.json())
        .then(data => {
          if (data.hospitals && Array.isArray(data.hospitals)) {
            // 데이터 형식 변환 (필요시)
            const processedHospitals = data.hospitals.map((h: any) => ({
              id: h.id,
              name: h.name,
              address: h.address || '',
              phone: h.tel || '',
              specialty: Array.isArray(h.specialty) ? h.specialty.join(', ') : h.specialty || '',
              distance: h.distance || 0,
              isOpen24h: h.isOpen24h || false,
              isEmergency: h.isEmergency || false,
              isHeartCenter: h.isHeartCenter || false,
              latitude: h.lat || 0,
              longitude: h.lng || 0
            }));
            
            console.log(`지도 영역 내 ${processedHospitals.length}개 병원 찾음`);
            
            // 전역 병원 목록 및 필터링된 목록 업데이트
            if (processedHospitals.length > 0) {
              setHospitals(processedHospitals);
              setFilteredHospitals(processedHospitals);
              
              // 기존 마커 모두 제거
              if (mapInstanceRef.current.hospitalMarkers) {
                mapInstanceRef.current.hospitalMarkers.forEach((marker: any) => {
                  marker.setMap(null);
                });
                mapInstanceRef.current.hospitalMarkers = [];
              }
              
              // 새 마커 추가
              addHospitalMarkers(processedHospitals);
              
              // 결과 메시지 표시
              setMapMessage(`현재 지도에서 병원 ${processedHospitals.length}개를 찾았습니다`);
              setTimeout(() => setMapMessage(''), 3000);
            } else {
              setMapMessage('현재 지도 영역에 병원이 없습니다');
              setTimeout(() => setMapMessage(''), 3000);
            }
          } else {
            console.error('API 응답 형식 오류:', data);
            setMapMessage('병원 정보를 불러올 수 없습니다');
            setTimeout(() => setMapMessage(''), 3000);
          }
        })
        .catch(error => {
          console.error('지도 영역 내 병원 검색 API 오류:', error);
          setMapMessage('병원 정보를 불러오는 중 오류가 발생했습니다');
          setTimeout(() => setMapMessage(''), 3000);
          
          // API 호출 실패 시 클라이언트 측 필터링으로 대체
          if (hospitals && hospitals.length > 0) {
            // 현재 지도 영역 내에 있는 병원만 필터링
            const visibleHospitals = hospitals.filter(hospital => {
              const lat = hospital.latitude || hospital.lat || 0;
              const lng = hospital.longitude || hospital.lng || 0;
              
              // 병원이 현재 지도 영역 내에 있는지 확인
              return lat >= sw.getLat() && lat <= ne.getLat() &&
                     lng >= sw.getLng() && lng <= ne.getLng();
            });
            
            // 화면에 표시되는 병원 목록 업데이트
            setFilteredHospitals(visibleHospitals);
            
            // 필터링된 병원만 마커로 표시
            addHospitalMarkers(visibleHospitals);
          }
        });
    }
  };
  
  // 정상 지도 UI
  return (
    <div className={`rounded-3xl overflow-hidden relative ${className}`} style={{ minHeight: '450px', aspectRatio: '1/1', width: '100%' }}>
      {/* 지도 컨테이너 */}
      <div 
        ref={mapContainerRef} 
        className="map-container" 
        style={{ minHeight: '450px', width: '100%', height: '100%', zIndex: 1 }}
      ></div>
      
      {/* 상태 메시지 표시 */}
      {mapMessage && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/90 text-[#FF6D70] font-medium px-4 py-2 rounded-xl shadow-md z-10">
          {mapMessage}
        </div>
      )}
      
      {/* 지도 제어 버튼 */}
      <div className="absolute bottom-4 right-4 flex flex-col space-y-3 z-10">
        {/* 내 위치 버튼 */}
        <button 
          className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center text-[#FF6D70] hover:bg-gray-50"
          onClick={() => {
            setIsLoading(true);
            setMapMessage('내 위치 검색 중...');
            
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  const newLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                  };
                  
                  // 사용자 위치 업데이트
                  setUserLocation(newLocation);
                  
                  // 지도 센터 이동
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.setCenter(
                      new window.kakao.maps.LatLng(newLocation.lat, newLocation.lng)
                    );
                    
                    // 사용자 마커 업데이트
                    updateUserMarker(newLocation.lat, newLocation.lng);
                    
                    // 주변 병원 정보 다시 가져오기
                    fetchNearbyHospitals(newLocation.lat, newLocation.lng);
                  }
                  
                  setIsLoading(false);
                  setMapMessage('내 위치를 찾았습니다');
                  setTimeout(() => setMapMessage(''), 3000);
                },
                (error) => {
                  console.error('위치 정보 가져오기 실패:', error);
                  setIsLoading(false);
                  setMapMessage('위치 정보를 가져올 수 없습니다');
                  setTimeout(() => setMapMessage(''), 3000);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
              );
            } else {
              setIsLoading(false);
              setMapMessage('위치 정보를 지원하지 않는 브라우저입니다');
              setTimeout(() => setMapMessage(''), 3000);
            }
          }}
        >
          <Navigation className="h-5 w-5" />
        </button>
        
        {/* 현재 지도 영역 검색 버튼 */}
        <button 
          className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center text-[#FF6D70] hover:bg-gray-50"
          onClick={searchInCurrentMapView}
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default KakaoMap;