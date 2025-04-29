import React from 'react';
import LinkItem from '../components/LinkItem'; // 재사용할 LinkItem 컴포넌트
import { FaHeartbeat, FaFirstAid, FaPhoneAlt, FaRobot } from 'react-icons/fa'; // 아이콘 임포트

// 임시 데이터 (실제로는 API 등에서 가져와야 함)
const features = [
  {
    icon: FaHeartbeat,
    title: '심장 진단',
    desc: 'ECG/PPG 데이터 분석과 건강 상태 모니터링',
    href: '/diagnosis'
  },
  {
    icon: FaFirstAid,
    title: '응급 처치',
    desc: '상황별 응급 처치 가이드 제공',
    href: '/emergency-guide'
  },
  {
    icon: FaPhoneAlt,
    title: '비상 연락',
    desc: '보호자 관리 및 긴급 연락 기능',
    href: '/emergency-contacts'
  },
  {
    icon: FaRobot,
    title: 'AI 상담',
    desc: '건강 관련 질문에 대한 AI 상담 서비스',
    href: '/ai-consultation'
  }
];

const HomePage = () => {
  return (
    <div>
      <p className="text-center mb-8 text-gray-600">심장 건강 모니터링 및 관리 앱</p>
      
      {/* 이전에 버튼 컨테이너 있던 자리 - 필요시 추가 */}
      {/* <div className="flex flex-col gap-2 mb-8"> */}
      {/*   <a href="#" className="bg-pink-500 text-white font-bold text-center p-4 rounded-lg shadow-md hover:translate-y-[-2px] transition-transform">웹 앱 바로 열기 (권장)</a> */}
      {/*   <a href="#" className="bg-white text-pink-500 border-2 border-pink-500 font-bold text-center p-3 rounded-lg hover:bg-pink-50 transition-colors">아이폰 접속 가이드 보기</a> */}
      {/* </div> */}

      <h2 className="font-bold mb-4 text-lg border-b pb-2 text-gray-800">개별 기능 바로가기</h2>
      <div className="flex flex-col gap-4">
        {features.map((feature, index) => (
          <LinkItem 
            key={index} 
            icon={feature.icon} 
            title={feature.title} 
            desc={feature.desc} 
            href={feature.href} 
          />
        ))}
      </div>
    </div>
  );
};

export default HomePage; 