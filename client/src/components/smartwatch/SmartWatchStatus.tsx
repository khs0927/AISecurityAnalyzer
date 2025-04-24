import React from 'react';
import { Link } from 'wouter';
import { useSmartWatch } from '@/contexts/SmartWatchContext';
import { Watch, Battery } from 'lucide-react';

// 스마트워치 상태 표시 컴포넌트
const SmartWatchStatus = () => {
  const { isConnected, deviceInfo, data } = useSmartWatch();
  
  if (!isConnected) {
    return (
      <Link href="/settings?tab=smartwatch">
        <div className="flex items-center mr-1 border border-[#FFD6D6] px-3 py-1.5 rounded cursor-pointer">
          <Watch className="h-4 w-4 text-gray-400 mr-1.5" />
          <span className="text-xs font-medium text-gray-500">연결 안됨</span>
        </div>
      </Link>
    );
  }
  
  // 배터리 레벨에 따른 색상
  const getBatteryColor = () => {
    if (!data.batteryLevel) return 'text-gray-400';
    if (data.batteryLevel < 20) return 'text-red-500';
    if (data.batteryLevel < 50) return 'text-amber-500';
    return 'text-[#FF0000]';
  };
  
  return (
    <Link href="/settings?tab=smartwatch">
      <div className="flex items-center mr-1 border border-[#FFD6D6] px-3 py-1.5 rounded cursor-pointer">
        <Watch className="h-4 w-4 text-[#FF0000] mr-1.5" />
        <span className="text-xs font-medium text-black">
          {data.batteryLevel ? (
            <span className="flex items-center">
              <Battery className={`h-3 w-3 mr-0.5 ${getBatteryColor()}`} />
              <span>{data.batteryLevel}%</span>
            </span>
          ) : '연결됨'}
        </span>
      </div>
    </Link>
  );
};

export default SmartWatchStatus;