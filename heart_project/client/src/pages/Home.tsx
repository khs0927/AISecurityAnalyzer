import { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import ModeSwitcher from '@/components/ModeSwitcher';
import RiskStatusCard from '@/components/risk/RiskStatusCard';
import ECGMonitoringCard from '@/components/ecg/ECGMonitoringCard';
import MultimodalAnalysisCard from '@/components/analysis/MultimodalAnalysisCard';
import EmergencyCard from '@/components/emergency/EmergencyCard';
import GuardianPatientList from '@/components/guardian/GuardianPatientList';
import AlertSettings from '@/components/guardian/AlertSettings';
import AlertHistory from '@/components/guardian/AlertHistory';
import { Link, useLocation } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowRight, Activity, Heart, Brain, User, Phone, UserRound, 
  Settings, FileText, Info, Apple, Watch, HelpCircle, MessageSquare,
  Stethoscope, Podcast, BarChart, Hospital, MapPin
} from 'lucide-react';

// 이미지 가져오기
import heartIcon from '../assets/heart-monitor.png';
import emergencyKitIcon from '../assets/first-aid.png';
import emergencyBellIcon from '../assets/emergency-bell.png';
import aiHelperIcon from '../assets/ai-helper.png';

const Home = () => {
  const { currentMode, setCurrentMode } = useAppContext();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [, navigate] = useLocation();

  // 메인 탭 링크 정의 - 이미지 색상의 배경 적용
  const mainTabs = [
    { 
      id: "heart-diagnosis", 
      label: "바이오 모니터링", 
      path: "/heart-diagnosis", 
      iconType: "heart", 
      iconColor: "#FF0000",
      gradientFrom: "#FFFFFF",
      gradientTo: "#FFFFFF",
      imageUrl: heartIcon
    },
    { 
      id: "emergency-guide", 
      label: "응급처치", 
      path: "/emergency-guide", 
      iconType: "plus", 
      iconColor: "#FF0000",
      gradientFrom: "#FFFFFF",
      gradientTo: "#FFFFFF",
      imageUrl: emergencyKitIcon
    },
    { 
      id: "emergency-contacts", 
      label: "심박감지알람", 
      path: "/emergency-contacts", 
      iconType: "phone", 
      iconColor: "#FF0000",
      gradientFrom: "#FFFFFF",
      gradientTo: "#FFFFFF",
      imageUrl: emergencyBellIcon
    },
    { 
      id: "ai-consultation", 
      label: "AI헬퍼", 
      path: "/ai-voice-consultation", 
      iconType: "message", 
      iconColor: "#FF0000",
      gradientFrom: "#FFFFFF",
      gradientTo: "#FFFFFF",
      imageUrl: aiHelperIcon
    }
  ];
  
  // 아이콘 렌더링 함수
  const renderTabIcon = (iconType: string, color: string) => {
    // 모든 아이콘에 공통으로 사용할 그라데이션과 필터 정의
    const commonDefs = (id: string) => (
      <>
        <linearGradient id={`${id}Gradient`} x1="10%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%" stopColor="#FF8A8C" />
          <stop offset="40%" stopColor="#FF6D70" />
          <stop offset="100%" stopColor="#d93538" />
        </linearGradient>
        <filter id={`${id}Shadow`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="8" stdDeviation="5" floodColor="#00000055" />
        </filter>
        <filter id={`${id}InnerShadow`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
          <feOffset dy="2" dx="2" />
          <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowDiff" />
          <feFlood floodColor="#00000033" result="shadowColor" />
          <feComposite in="shadowColor" in2="shadowDiff" operator="in" result="shadow" />
          <feComposite in="SourceGraphic" in2="shadow" operator="over" />
        </filter>
      </>
    );

    if (iconType === 'heart') {
      return (
        <svg width="80" height="80" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {commonDefs('heart')}
          </defs>
          {/* 메인 하트 */}
          <path d="M100 190C100 190 180 140 180 80C180 50 160 20 120 20C100 20 100 40 100 40C100 40 100 20 80 20C40 20 20 50 20 80C20 140 100 190 100 190Z" 
            fill="url(#heartGradient)" filter="url(#heartShadow)" />
          
          {/* 메인 하트 테두리 강조 */}
          <path d="M100 190C100 190 180 140 180 80C180 50 160 20 120 20C100 20 100 40 100 40C100 40 100 20 80 20C40 20 20 50 20 80C20 140 100 190 100 190Z" 
            stroke="#ffffff33" strokeWidth="4" fill="none" filter="url(#heartInnerShadow)" />
          
          {/* 하이라이트 효과 */}
          <path d="M60 50C65 40 80 30 100 40C120 30 135 40 140 50C150 70 130 100 100 135C70 100 50 70 60 50Z" 
            fill="#ffffff33" />
          
          {/* 광택 효과 */}
          <ellipse cx="65" cy="60" rx="25" ry="15" fill="#ffffff55" />
        </svg>
      );
    } else if (iconType === 'plus') {
      return (
        <svg width="80" height="80" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {commonDefs('plus')}
          </defs>
          {/* 메인 원형 */}
          <circle cx="100" cy="100" r="80" fill="url(#plusGradient)" filter="url(#plusShadow)" />
          
          {/* 십자가 형태 */}
          <rect x="55" y="85" width="90" height="30" rx="15" ry="15" fill="#ffffff" />
          <rect x="85" y="55" width="30" height="90" rx="15" ry="15" fill="#ffffff" />
          
          {/* 상단 하이라이트 */}
          <ellipse cx="70" cy="70" rx="35" ry="20" fill="#ffffff33" />
          
          {/* 테두리 강조 */}
          <circle cx="100" cy="100" r="80" stroke="#ffffff33" strokeWidth="2" fill="none" />
        </svg>
      );
    } else if (iconType === 'phone') {
      return (
        <svg width="80" height="80" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {commonDefs('phone')}
          </defs>
          {/* 메인 원형 */}
          <circle cx="100" cy="100" r="80" fill="url(#phoneGradient)" filter="url(#phoneShadow)" />
          
          {/* 전화기 형태 */}
          <path d="M140 140C140 140 130 150 100 120C70 90 60 80 60 80C60 80 50 70 60 60C70 50 80 60 80 60C80 60 90 70 100 80C100 80 90 60 70 60C50 60 40 80 50 100C60 120 80 140 100 160C120 180 140 150 140 150C140 150 150 140 140 130C130 120 120 130 120 130C120 130 110 120 100 110C100 110 120 100 130 110C140 120 140 140 140 140Z"
            fill="#ffffff" />
          
          {/* 상단 하이라이트 */}
          <ellipse cx="70" cy="70" rx="35" ry="20" fill="#ffffff33" />
          
          {/* 테두리 강조 */}
          <circle cx="100" cy="100" r="80" stroke="#ffffff33" strokeWidth="2" fill="none" />
        </svg>
      );
    } else if (iconType === 'message') {
      return (
        <svg width="80" height="80" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {commonDefs('message')}
          </defs>
          {/* 메인 원형 */}
          <circle cx="100" cy="100" r="80" fill="url(#messageGradient)" filter="url(#messageShadow)" />
          
          {/* 메시지 버블 형태 */}
          <path d="M60 70C60 60 70 50 80 50H140C150 50 160 60 160 70V120C160 130 150 140 140 140H110L90 160C85 165 75 160 75 154V140H80C70 140 60 130 60 120V70Z"
            fill="#ffffff" filter="url(#messageInnerShadow)" />
          
          {/* 상단 하이라이트 */}
          <ellipse cx="70" cy="70" rx="35" ry="20" fill="#ffffff33" />
          
          {/* 테두리 강조 */}
          <circle cx="100" cy="100" r="80" stroke="#ffffff33" strokeWidth="2" fill="none" />
        </svg>
      );
    }
    return null;
  };

  return (
    <div className="pb-20">
      {/* 주변병원 및 AI 상담 버튼은 AppLayout으로 이동 */}
      
      {/* 상단 헤더 섹션 */}
      <div className="mb-6 flex justify-between items-center">
        <div className="mt-7">
          <h1 className="font-bold mb-1">
            <span className="text-[#D00000] text-4xl font-extrabold font-suite block mb-1"><span className="mr-1">낫</span>투데이</span>
            <span className="text-black text-sm font-suite tracking-wider block">ONE MORE LIFE</span>
          </h1>
        </div>
        <div className="flex flex-col space-y-2">
          <div className="flex justify-end items-center mb-1">
            <div className="flex items-center gap-2">
              <div 
                className="flex items-center border border-[#FFD6D6] rounded py-1 px-2 text-xs cursor-pointer"
                onClick={() => navigate('/settings?tab=smartwatch')}
              >
                <Watch className="w-3 h-3 mr-1 text-[#FF0000]" />
                <span className="font-bold text-black">워치 연결됨</span>
                <span className="mx-1 text-[#FFD6D6]">|</span>
                <span className="font-bold text-black">78%</span>
              </div>
              <div 
                className="rounded flex items-center justify-center border border-[#FFD6D6] cursor-pointer p-1.5"
                onClick={() => navigate('/settings')}
              >
                <Settings className="w-3 h-3 text-[#FF0000]" />
              </div>
            </div>
          </div>
          <ModeSwitcher />
        </div>
      </div>

      {/* 새로운 네비게이션 - 2x2 그리드 정사각형 */}
      <div className="mb-6">
        <div className="grid grid-cols-2 gap-4">
          {mainTabs.map((tab) => (
            <div 
              key={tab.id}
              className="flex flex-col items-center justify-center bg-white rounded-2xl shadow-lg py-8 px-4 cursor-pointer hover:shadow-xl transition-all aspect-square relative overflow-hidden border border-[#FFD6D6]"
              style={{ 
                boxShadow: '0 10px 20px -5px rgba(255, 0, 0, 0.1), 0 4px 10px -5px rgba(255, 0, 0, 0.06), inset 0 1px 0 0 rgba(255, 255, 255, 0.8)'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-3px)"}
              onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
              onClick={() => navigate(tab.path)}
            >
              <div className="h-32 flex items-center justify-center relative">
                {/* 붉은 효과 제거 */}
                <div className="relative" style={{ 
                  transform: 'translateY(-2px)'
                }}>
                  {tab.imageUrl ? (
                    <img 
                      src={tab.imageUrl} 
                      alt={tab.label} 
                      className={`object-contain ${tab.id === "emergency-guide" ? "w-[4.5rem] h-[4.5rem]" : "w-16 h-16"}`}
                    />
                  ) : (
                    renderTabIcon(tab.iconType, tab.iconColor)
                  )}
                </div>
              </div>
              <div className="h-8 flex items-center justify-center">
                <span className="text-lg font-bold text-[#333333] z-10">{tab.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 기본 콘텐츠 표시 */}
      <div className="space-y-3">
        {/* 알림 내역 */}
        <AlertHistory />
        
        {/* 기타 콘텐츠는 필요에 따라 추가 */}
      </div>
    </div>
  );
};

export default Home;
