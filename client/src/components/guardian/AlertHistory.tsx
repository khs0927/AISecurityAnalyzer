import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';

type Alert = {
  id: number;
  userId: number;
  type: 'risk' | 'warning' | 'info';
  message: string;
  time: string;
};

const AlertHistory = () => {
  const { theme } = useApp();
  
  // 알림 목록을 위한 타입 정의
  interface SystemAlert {
    id: number;
    userId: number;
    alertType: 'risk' | 'warning' | 'info';
    message: string;
    createdAt: string;
  }
  
  const alerts: SystemAlert[] = [];
  
  // Fallback sample alerts if no alerts are loaded
  const [recentAlerts] = useState<Alert[]>([
    {
      id: 1,
      userId: 1,
      type: 'risk',
      message: 'ST 분절 상승 패턴 감지, 심박수 112 BPM',
      time: '14:05'
    },
    {
      id: 2,
      userId: 2,
      type: 'warning',
      message: '혈압 상승 155/95 mmHg',
      time: '12:22'
    },
    {
      id: 3,
      userId: 0,
      type: 'info',
      message: '3명의 대상자에 대한 오늘의 건강 요약',
      time: '08:00'
    }
  ]);

  // Use actual alerts if available, otherwise use fallback
  const displayAlerts = alerts.length > 0 
    ? alerts.map(alert => ({
        id: alert.id,
        userId: alert.userId,
        type: alert.alertType as 'risk' | 'warning' | 'info',
        message: alert.message,
        time: new Date(alert.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      }))
    : recentAlerts;

  const getAlertBackgroundClass = (type: string) => {
    switch (type) {
      case 'risk':
        return 'bg-red-50';
      case 'warning':
        return 'bg-yellow-50';
      case 'info':
        return 'bg-[#e8eef3]';
      default:
        return 'bg-[#f8fafb]';
    }
  };

  const getAlertIconClass = (type: string) => {
    return 'text-[#FF0000]';
  };

  const getAlertTitle = (type: string, userId: number) => {
    const userNames = ['모든 대상자', '이서연', '김민준', '박지현'];
    const name = userNames[userId] || '사용자';
    
    switch (type) {
      case 'risk':
        return `${name}님 위험 상황 감지`;
      case 'warning':
        return `${name}님 주의 상황`;
      case 'info':
        return '일일 요약 보고서';
      default:
        return '알림';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'risk':
      case 'warning':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${getAlertIconClass(type)} mt-0.5 mr-2`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
          </svg>
        );
      case 'info':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${getAlertIconClass(type)} mt-0.5 mr-2`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${getAlertIconClass(type)} mt-0.5 mr-2`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <div className="card-with-shadow p-5 mb-4 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-[#333333]">최근 알림</h2>
        <div className="h-7 w-7 rounded-sm flex items-center justify-center border border-[#FFD6D6]">
          <span className="text-xs font-bold text-[#FF0000]">{displayAlerts.length}</span>
        </div>
      </div>
      
      <div className="space-y-3">
        {displayAlerts.map((alert) => (
          <div key={alert.id} className={`p-4 rounded-xl border border-gray-200`}>
            <div className="flex justify-between items-start">
              <div className="flex items-start">
                {getAlertIcon(alert.type)}
                <div>
                  <div className="text-sm font-medium text-black">
                    {getAlertTitle(alert.type, alert.userId)}
                  </div>
                  <div className="text-sm font-medium text-black mt-1">{alert.message}</div>
                </div>
              </div>
              <span className="text-xs font-bold text-black px-2 py-1 rounded-sm border border-gray-200">{alert.time}</span>
            </div>
          </div>
        ))}

        {displayAlerts.length === 0 && (
          <div className="p-4 text-center text-[#507695] text-sm bg-gray-50 rounded-xl">
            알림이 없습니다
          </div>
        )}
      </div>

      {displayAlerts.length > 0 && (
        <button className="w-full mt-4 py-2 text-base font-bold text-black rounded-lg hover:bg-gray-100 transition-colors">
          모든 알림 보기
        </button>
      )}
    </div>
  );
};

export default AlertHistory;
