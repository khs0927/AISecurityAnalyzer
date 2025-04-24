import React from 'react';
import { Heart, Activity } from 'lucide-react';
import BioMonitoringComponent from '@/components/monitoring/BioMonitoring';

const BioMonitoring: React.FC = () => {
  return (
    <div className="container mx-auto py-4">
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center text-[#FF6D70]">
          <Heart className="h-6 w-6 mr-2" />
          바이오 모니터링
        </h1>
        <p className="text-gray-600 mt-1">
          스마트워치 데이터 기반 실시간 건강 모니터링 및 위험도 분석
        </p>
      </div>
      
      <div className="flex items-center bg-[#FFF5F5] p-3 rounded-md mb-6">
        <Activity className="h-5 w-5 text-[#FF6D70] mr-2 flex-shrink-0" />
        <p className="text-sm text-gray-700">
          <strong>연결된 기기:</strong> Apple Watch Series 7 (펌웨어: 8.5.1, 배터리: 78%)
          - 심전도, 심박수, 산소포화도 데이터를 실시간으로 수집 중입니다.
        </p>
      </div>
      
      <BioMonitoringComponent />
    </div>
  );
};

export default BioMonitoring;