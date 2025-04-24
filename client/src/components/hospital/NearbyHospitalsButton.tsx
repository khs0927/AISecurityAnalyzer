import React from 'react';
import { Hospital } from 'lucide-react';
import { useLocation } from 'wouter';

/**
 * 주변 병원 검색을 위한 동적 버튼 컴포넌트
 */
const NearbyHospitalsButton = () => {
  const [, navigate] = useLocation();

  return (
    <div 
      className="fixed bottom-24 left-4 z-10 flex flex-col items-center"
      onClick={() => navigate('/nearby-hospitals')}
    >
      <div className="bg-gradient-to-r from-[#FF4D84] to-[#FF6D70] w-16 h-16 rounded-full shadow-lg 
        flex items-center justify-center text-white border-2 border-white hover:shadow-xl transition-all
        animate-pulse cursor-pointer mb-1">
        <Hospital className="h-7 w-7" />
      </div>
      <span className="text-xs font-medium bg-white px-2 py-1 rounded-full shadow-sm">주변병원</span>
    </div>
  );
};

export default NearbyHospitalsButton;