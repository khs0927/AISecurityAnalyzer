import { useState } from 'react';
import { Switch } from '@/components/ui/switch';

const AlertSettings = () => {
  const [alertSettings, setAlertSettings] = useState({
    highRisk: true,
    moderateRisk: true,
    dailyReport: true
  });

  const handleAlertChange = (setting: keyof typeof alertSettings) => {
    setAlertSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  return (
    <div className="card-with-shadow p-5 mb-4 bg-white rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-lg font-bold text-[#333333] mb-4">알림 설정</h2>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-xl bg-red-50 border border-red-100">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mr-3 border border-red-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#FF6D70]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <div className="text-base font-bold text-[#FF6D70]">위험 상황 알림</div>
              <div className="text-sm text-gray-600">50% 이상의 위험도 발생 시</div>
            </div>
          </div>
          <Switch 
            checked={alertSettings.highRisk}
            onCheckedChange={() => handleAlertChange('highRisk')}
            className="data-[state=checked]:bg-[#FF6D70]"
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-yellow-50 border border-yellow-100">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mr-3 border border-yellow-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <div className="text-base font-bold text-yellow-600">주의 상황 알림</div>
              <div className="text-sm text-gray-600">30% 이상의 위험도 발생 시</div>
            </div>
          </div>
          <Switch 
            checked={alertSettings.moderateRisk}
            onCheckedChange={() => handleAlertChange('moderateRisk')}
            className="data-[state=checked]:bg-[#FF6D70]"
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-100">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mr-3 border border-blue-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <div className="text-base font-bold text-blue-600">일일 요약 보고서</div>
              <div className="text-sm text-gray-600">매일 오후 8시에 수신</div>
            </div>
          </div>
          <Switch 
            checked={alertSettings.dailyReport}
            onCheckedChange={() => handleAlertChange('dailyReport')}
            className="data-[state=checked]:bg-[#FF6D70]"
          />
        </div>
      </div>
    </div>
  );
};

export default AlertSettings;
