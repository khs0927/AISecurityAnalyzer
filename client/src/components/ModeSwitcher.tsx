import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Bell } from 'lucide-react';

const ModeSwitcher = () => {
  const { theme, language } = useApp();
  const [alarmState, setAlarmState] = useState<boolean>(false);
  const [animate, setAnimate] = useState(false);

  // 알람 상태 변경 함수
  const toggleAlarm = () => {
    const newState = !alarmState;
    setAlarmState(newState);
    
    // ON 상태로 변경 시 애니메이션 효과 적용
    if (newState) {
      setAnimate(true);
      setTimeout(() => setAnimate(false), 1000);
    }
  };

  return (
    <div className="flex h-8 items-center justify-end">
      {/* 알람 ON/OFF 슬라이더 */}
      <div className="flex items-center">
        <span className="text-xs font-bold text-black mr-2 px-2 py-1 rounded border border-[#FFD6D6]">알람</span>
        
        {/* 슬라이더 스위치 컴포넌트 */}
        <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded cursor-pointer">
          <input 
            type="checkbox" 
            className="hidden"
            checked={alarmState}
            onChange={toggleAlarm}
          />
          <div 
            className={`absolute inset-0 transition-all duration-300 ease-in-out rounded
            ${alarmState ? 'bg-[#FF0000]' : 'bg-[#e8eef3]'}`}
            onClick={toggleAlarm}
          ></div>
          <div 
            className={`absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded shadow transform transition-transform duration-300 flex items-center justify-center
            ${alarmState ? 'translate-x-6' : ''} shadow-md`}
            onClick={toggleAlarm}
          >
            {alarmState && (
              <Bell className={`w-3 h-3 text-[#FF0000] ${animate ? 'animate-bell' : ''}`} />
            )}
          </div>
        </div>
        
        <span className={`ml-2 text-xs font-bold ${alarmState ? 'text-black' : 'text-[#666]'}`}>
          {alarmState ? 'ON' : 'OFF'}
        </span>
        
        {/* ON일 때 배경 파장 효과 */}
        {alarmState && animate && (
          <div className="absolute right-0 mt-0 mr-16 w-6 h-6 rounded bg-[#FF0000] opacity-0 animate-ping"></div>
        )}
      </div>
    </div>
  );
};

export default ModeSwitcher;
