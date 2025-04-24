import { useLocation, Link } from 'wouter';
import { Heart, HelpCircle, Phone, BarChart, Activity, FileText, MessageSquare, MapPin } from 'lucide-react';
import React from 'react';

const BottomNavigation = () => {
  const [location] = useLocation();

  interface NavItem {
    path: string;
    icon: React.ComponentType<any>;
    label: string;
    className?: string;
    isMainTab?: boolean;
    subPaths?: string[];
    bgColor?: string;
  }
  
  // 메인 2개 탭 정의
  const mainNavItems: NavItem[] = [
    { 
      path: '/emergency-call', 
      icon: () => null, // 아이콘 없음
      label: '119', 
      isMainTab: true,
      className: 'text-white font-bold', // 흰색 글자
      bgColor: '#FF3A3A' // 빨간색 배경
    },
    { 
      path: '/nearby-hospitals', 
      icon: () => null, // 아이콘 없음
      label: '주변 병원 찾기', 
      isMainTab: true,
      className: 'text-white font-bold', // 흰색 글자
      bgColor: '#FF6D70' // 핑크색 배경
    }
  ];

  // 심장건강체크 탭의 서브 탭 정의 (심장건강체크 탭 내에서 사용)
  const heartDiagnosisSubNavs: NavItem[] = [
    { path: '/vital-signs', icon: Activity, label: '실시간 모니터링' },
    { path: '/risk-analysis', icon: BarChart, label: '위험도 분석' },
    { path: '/health-records', icon: FileText, label: '건강 기록' },
    { path: '/ai-consultation', icon: MessageSquare, label: 'AI 상담' }
  ];

  const getActiveStyles = (item: NavItem) => {
    const isEmergencyCall = item.path === '/emergency-call';
    
    if (isEmergencyCall) {
      return {
        icon: 'text-white',
        bg: 'bg-[#FF3A3A]',
        text: 'text-[#FF3A3A] font-bold',
        shadow: 'shadow-lg shadow-red-300/50'
      };
    } else {
      return {
        icon: 'text-[#FF6D70]',
        bg: 'bg-white',
        text: 'text-[#FF6D70] font-medium',
        shadow: 'shadow-md border border-[#FFD6D6]'
      };
    }
  };

  const isTabActive = (item: NavItem) => {
    if (location === item.path) return true;
    if (item.subPaths && item.subPaths.some(subPath => location === subPath)) return true;
    return false;
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-10 pb-safe">
      <div className="mx-auto px-0 py-2">
        {/* 테두리 없는 하단 내비게이션 바 */}
        <div className="flex items-center bg-transparent gap-2 px-2">
          {mainNavItems.map((item, index) => {
            const isEmergencyCall = item.path === '/emergency-call';
            const buttonStyle = {
              backgroundColor: '#FF0000',
              boxShadow: '0 4px 12px rgba(255, 0, 0, 0.25), 0 2px 4px rgba(255, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.3)',
              border: '1px solid rgba(255, 100, 100, 0.5)'
            };
            
            return (
              index === 0 ? (
                // 119 전화 버튼 - 동적 효과 추가
                <a 
                  href="tel:119" 
                  key={item.path} 
                  className="w-1/2"
                >
                  <div 
                    className="emergency-pulse-button flex items-center justify-center rounded-xl h-10 transition-all duration-300 relative overflow-hidden"
                    style={buttonStyle}
                  >
                    <span className="text-white text-base font-extrabold tracking-wider">119</span>
                    {/* 동적으로 움직이는 효과를 위한 가상 요소들 */}
                    <div className="absolute inset-0 emergency-pulse-effect"></div>
                  </div>
                </a>
              ) : (
                // 주변 병원 찾기 버튼 - 동일한 동적 효과 추가
                <Link 
                  href={item.path} 
                  key={item.path}
                  className="w-1/2"
                >
                  <div 
                    className="emergency-pulse-button flex items-center justify-center rounded-xl h-10 transition-all duration-300 relative overflow-hidden"
                    style={buttonStyle}
                  >
                    <span className="text-white text-base font-extrabold tracking-wider">{item.label}</span>
                    {/* 동적으로 움직이는 효과를 위한 가상 요소들 */}
                    <div className="absolute inset-0 emergency-pulse-effect"></div>
                  </div>
                </Link>
              )
            );
          })}
        </div>
      </div>
    </div>
  );
};

// 심장건강체크 서브탭 컴포넌트 - 심장건강체크 페이지에서만 사용
export const HeartDiagnosisSubNav = () => {
  const [location] = useLocation();
  
  const subNavItems = [
    { path: '/heart-diagnosis', icon: Heart, label: '심장건강' },
    { path: '/vital-signs', icon: Activity, label: '모니터링' },
    { path: '/risk-analysis', icon: BarChart, label: '위험도' },
    { path: '/health-records', icon: FileText, label: '건강기록' },
    { path: '/health-info', icon: FileText, label: '건강정보' }
  ];

  // 항목이 많아서 한 줄에 모두 표시할 수 없을 경우 두 줄로 나누어 표시
  const maxItemsPerRow = 3;
  const firstRowItems = subNavItems.slice(0, maxItemsPerRow);
  const secondRowItems = subNavItems.slice(maxItemsPerRow);

  return (
    <div className="mb-4 pt-2">
      <div className="flex justify-between items-center bg-white shadow-sm rounded-xl border border-[#FFD6D6] p-2">
        {subNavItems.map((item) => {
          const isActive = location === item.path;
          const IconComponent = item.icon;
          
          return (
            <Link href={item.path} key={item.path}>
              <div className={`flex items-center py-1.5 px-3 rounded-lg transition-all duration-300 ${
                isActive ? 'bg-[#FF0000] text-white' : 'text-black hover:bg-[#FFF5F5]'
              }`}>
                <IconComponent className={`h-4 w-4 mr-1.5 ${isActive ? 'text-white' : 'text-[#FF0000]'}`} />
                <span className="text-xs font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavigation;
