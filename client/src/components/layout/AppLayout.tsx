import { ReactNode } from 'react';
import { useLocation, Link } from 'wouter';
import { useApp } from '@/contexts/AppContext';
import BottomNavigation, { HeartDiagnosisSubNav } from './BottomNavigation';
import SmartWatchStatus from '../smartwatch/SmartWatchStatus';
import { User, Settings, ChevronLeft, Heart, MessageSquare, Watch, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const [location] = useLocation();
  const { theme, language } = useApp();

  const getPageTitle = () => {
    switch (location) {
      case '/heart-diagnosis':
        return '바이오 모니터링';
      case '/vital-signs':
        return '모니터링';
      case '/risk-analysis':
        return '위험도 분석';
      case '/health-records':
        return '기록';
      case '/health-info':
        return '건강정보';
      case '/ai-consultation':
      case '/ai-voice-consultation': 
        return 'AI 헬퍼';
      case '/emergency-guide':
        return '응급처치';
      case '/emergency-contacts':
        return '심박감지알람';
      case '/settings':
        return '설정';
      case '/guardian':
        return '보호자 모드';
      case '/nearby-hospitals':
        return '주변 병원';
      default:
        return '응급처치';
    }
  };

  const isHome = location === '/';
  
  // 심장진단 관련 페이지 여부 확인
  const isHeartDiagnosisRelated = [
    '/heart-diagnosis', '/vital-signs', '/risk-analysis', 
    '/health-records', '/ai-voice-consultation', '/ai-consultation'
  ].includes(location);

  return (
    <div className="min-h-screen bg-[#f5f7fa] pb-20">
      <div className="container mx-auto px-4 pt-5 pb-4 max-w-lg">
        {/* 헤더 */}
        {!isHome && (
          <header className="flex justify-between items-center mb-5">
            <div className="flex items-center">
              <Link href="/">
                <button className="w-9 h-9 rounded-full bg-white flex items-center justify-center mr-3 shadow-md">
                  <ChevronLeft className="h-5 w-5 text-gray-700" />
                </button>
              </Link>
              <h1 className="text-xl font-bold font-suite flex items-center">
                <Bot className="h-5 w-5 mr-2 text-black" />
                AI 헬퍼
              </h1>
            </div>
            
            <div className="flex items-center gap-2">
              <SmartWatchStatus />
              
              <Link href="/settings">
                <button className="w-9 h-9 rounded border border-[#FFD6D6] flex items-center justify-center">
                  <Settings className="h-4 w-4 text-[#FF0000]" />
                </button>
              </Link>
            </div>
          </header>
        )}

        {/* 심장진단 관련 페이지일 경우 상단 서브 내비게이션 표시 */}
        {isHeartDiagnosisRelated && <HeartDiagnosisSubNav />}
        
        {/* 메인 콘텐츠 */}
        <div className={isHome ? "" : "rounded-3xl overflow-hidden"}>
          {children}
        </div>
      </div>

      {/* 하단 내비게이션 */}
      <BottomNavigation />

      {/* 플로팅 버튼 삭제됨 */}
    </div>
  );
};

export default AppLayout;
