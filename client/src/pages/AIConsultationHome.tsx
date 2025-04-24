import React from 'react';
import AIHealthChat from '@/components/ai/AIHealthChat';
import { useLocation } from 'wouter';
import { Bot } from 'lucide-react';

const AIConsultationHome: React.FC = () => {
  const [, navigate] = useLocation();
  
  return (
    <div className="pb-20">
      {/* 상단 헤더 섹션 */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center text-[#FF0000]">
            <Bot className="h-6 w-6 mr-2 text-[#FF0000]" />
            AI 헬퍼
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            의료 AI 기술로 당신의 건강을 분석합니다
          </p>
        </div>
      </div>
      
      {/* AI 헬퍼 메인 챗 영역 */}
      <div className="bg-white rounded-lg shadow-lg border border-[#FFD6D6] overflow-hidden" style={{ height: 'calc(100vh - 180px)' }}>
        <AIHealthChat />
      </div>
    </div>
  );
};

export default AIConsultationHome;