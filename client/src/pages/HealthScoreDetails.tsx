import React, { useState } from 'react';
import { ArrowLeft, Heart, Activity, Droplet, AlertTriangle, Info, Clock } from 'lucide-react';
import { useLocation } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

const HealthScoreDetails = () => {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");

  // 심장 건강 점수 데이터
  const healthScore = {
    total: 85,
    heartRate: 92,
    bloodPressure: 80,
    oxygenLevel: 97,
    sleepQuality: 75,
    activityLevel: 78,
    riskFactors: [
      { name: '심장 리듬', level: 'low', score: 90 },
      { name: '심장 변이율', level: 'medium', score: 75 },
      { name: '산소포화도', level: 'low', score: 95 },
      { name: '활동량', level: 'medium', score: 78 },
      { name: '스트레스', level: 'medium', score: 72 },
    ]
  };

  // 일일 변화 추이 데이터
  const dailyTrends = [
    { day: '월', score: 82 },
    { day: '화', score: 79 },
    { day: '수', score: 81 },
    { day: '목', score: 83 },
    { day: '금', score: 85 },
    { day: '토', score: 84 },
    { day: '일', score: 85 }
  ];

  // 심장 건강 점수 등급
  const getScoreLevel = (score: number) => {
    if (score >= 90) return { text: '최상', color: '#10B981' };
    if (score >= 80) return { text: '양호', color: '#3B82F6' };
    if (score >= 70) return { text: '보통', color: '#F59E0B' };
    if (score >= 60) return { text: '주의', color: '#F97316' };
    return { text: '위험', color: '#EF4444' };
  };

  const scoreLevel = getScoreLevel(healthScore.total);

  // 위험 요인 점수에 따른 색상
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return '#10B981';
      case 'medium': return '#F59E0B';
      case 'high': return '#EF4444';
      default: return '#3B82F6';
    }
  };

  // 주간 변화 그래프 렌더링
  const renderTrendGraph = () => {
    const max = Math.max(...dailyTrends.map(day => day.score));
    return (
      <div className="mt-4">
        <div className="flex justify-between items-end h-32">
          {dailyTrends.map((day, index) => (
            <div key={index} className="flex flex-col items-center w-1/7">
              <div 
                className="w-6 bg-[#FF6D70] rounded-t-sm transition-all"
                style={{ 
                  height: `${(day.score / 100) * 100}%`,
                  opacity: day.day === '금' ? 1 : 0.6
                }}
              ></div>
              <div className={`text-xs mt-1 ${day.day === '금' ? 'font-bold text-[#FF6D70]' : 'text-gray-500'}`}>
                {day.day}
              </div>
              <div className={`text-xs ${day.day === '금' ? 'font-bold text-[#FF6D70]' : 'text-gray-500'}`}>
                {day.score}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 개선 권장사항
  const recommendations = [
    {
      title: '규칙적인 운동',
      description: '일주일에 최소 150분의 중강도 유산소 운동을 하세요.',
      icon: <Activity className="w-4 h-4" />
    },
    {
      title: '심장 친화적 식단',
      description: '오메가-3 지방산, 항산화제가 풍부한 식품을 섭취하세요.',
      icon: <Heart className="w-4 h-4" />
    },
    {
      title: '충분한 수면',
      description: '매일 7-8시간의 양질의 수면을 취하세요.',
      icon: <Clock className="w-4 h-4" />
    },
    {
      title: '수분 섭취',
      description: '하루에 2리터 이상의 물을 마시세요.',
      icon: <Droplet className="w-4 h-4" />
    },
    {
      title: '스트레스 관리',
      description: '명상, 심호흡, 요가와 같은 스트레스 감소 활동을 실천하세요.',
      icon: <AlertTriangle className="w-4 h-4" />
    }
  ];

  // 세부 점수 항목 렌더링
  const renderScoreItem = (title: string, score: number, icon: React.ReactNode) => {
    const { color } = getScoreLevel(score);
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <div className="bg-[#FFE2E9] p-2 rounded-full mr-3">
              {icon}
            </div>
            <span className="font-medium text-gray-800">{title}</span>
          </div>
          <span className="text-lg font-bold" style={{ color }}>{score}</span>
        </div>
        <Progress value={score} className="h-2" 
          style={{ 
            "--progress-indicator-color": color 
          } as React.CSSProperties}
        />
      </div>
    );
  };

  return (
    <div className="pb-16">
      {/* 헤더 */}
      <div className="flex items-center mb-6 mt-6">
        <button 
          onClick={() => navigate('/')}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm mr-4"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">심장 건강 점수</h1>
      </div>

      {/* 메인 카드 */}
      <div className="bg-[#FF6D70] rounded-3xl p-5 mb-6">
        <div className="flex items-center mb-4">
          <Heart className="w-6 h-6 mr-2 text-white" fill="white" />
          <h2 className="text-xl font-bold text-white font-suite">심장 건강 점수</h2>
        </div>
        
        <div className="flex justify-center items-center mb-3">
          <div className="relative">
            <div className="text-7xl font-bold text-white font-suite">{healthScore.total}</div>
            <div className="text-base text-white/90 font-suite absolute right-0 bottom-2">/100</div>
          </div>
        </div>
        
        <div className="bg-white/20 rounded-full px-4 py-2 text-center mb-3">
          <span className="text-white font-medium">
            현재 상태: <span className="font-bold">{scoreLevel.text}</span>
          </span>
        </div>
        
        <p className="text-white/80 text-sm text-center">
          지난 주 대비 <span className="font-bold text-white">3%</span> 향상되었습니다.
        </p>
      </div>

      {/* 탭 네비게이션 */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="details">상세 분석</TabsTrigger>
          <TabsTrigger value="recommendations">개선 방안</TabsTrigger>
        </TabsList>
        
        {/* 개요 탭 */}
        <TabsContent value="overview" className="mt-4">
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-2">주간 추이</h3>
              {renderTrendGraph()}
            </div>
            
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-3">위험 요인 평가</h3>
              <div className="space-y-3">
                {healthScore.riskFactors.map((factor, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-gray-700">{factor.name}</span>
                    <div className="flex items-center">
                      <span 
                        className="mr-2 text-sm font-medium" 
                        style={{ color: getRiskColor(factor.level) }}
                      >
                        {factor.score}
                      </span>
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full">
                        <div 
                          className="h-full rounded-full" 
                          style={{ 
                            width: `${factor.score}%`, 
                            backgroundColor: getRiskColor(factor.level) 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 bg-blue-50 rounded-lg p-3">
                <div className="flex">
                  <Info className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">
                    심장 변이율과 스트레스 점수가 평균보다 낮습니다. 아래의 개선 방안 탭에서 관리 방법을 확인하세요.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
        
        {/* 상세 분석 탭 */}
        <TabsContent value="details" className="mt-4">
          <div className="space-y-3">
            {renderScoreItem("심박수", healthScore.heartRate, <Heart className="w-4 h-4 text-[#FF6D70]" />)}
            {renderScoreItem("혈압", healthScore.bloodPressure, <Activity className="w-4 h-4 text-[#FF6D70]" />)}
            {renderScoreItem("산소포화도", healthScore.oxygenLevel, <Droplet className="w-4 h-4 text-[#FF6D70]" />)}
            {renderScoreItem("수면 품질", healthScore.sleepQuality, <Clock className="w-4 h-4 text-[#FF6D70]" />)}
            {renderScoreItem("활동 수준", healthScore.activityLevel, <Activity className="w-4 h-4 text-[#FF6D70]" />)}
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm mt-4">
            <h3 className="font-bold text-gray-800 mb-3">심박수 변화</h3>
            <div className="flex justify-between">
              <div>
                <span className="text-sm text-gray-500">안정시</span>
                <div className="text-xl font-bold text-gray-800">68<span className="text-sm font-normal ml-1">bpm</span></div>
              </div>
              <div>
                <span className="text-sm text-gray-500">일일 평균</span>
                <div className="text-xl font-bold text-gray-800">72<span className="text-sm font-normal ml-1">bpm</span></div>
              </div>
              <div>
                <span className="text-sm text-gray-500">활동시 최대</span>
                <div className="text-xl font-bold text-gray-800">135<span className="text-sm font-normal ml-1">bpm</span></div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm mt-4">
            <h3 className="font-bold text-gray-800 mb-3">심장 리듬 분석</h3>
            <p className="text-gray-700 text-sm">
              지난 7일간 측정된 데이터를 기반으로 심장 리듬을 분석했습니다. 현재 심장 리듬은 정상 범위 내에 있으며, 부정맥 징후는 감지되지 않았습니다.
            </p>
            <div className="mt-3 bg-green-50 rounded-lg p-3">
              <div className="flex">
                <Info className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-green-700">
                  심장 리듬이 안정적입니다. 현재의 건강한 생활 습관을 유지하세요.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
        
        {/* 개선 방안 탭 */}
        <TabsContent value="recommendations" className="mt-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-3">개선 권장사항</h3>
            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <div key={index} className="flex">
                  <div className="bg-[#FFE2E9] p-2 rounded-full mr-3 h-fit">
                    <div className="text-[#FF6D70]">{rec.icon}</div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800">{rec.title}</h4>
                    <p className="text-sm text-gray-600">{rec.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm mt-4">
            <h3 className="font-bold text-gray-800 mb-3">목표 설정</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-700">일일 걸음 수</span>
                <span className="font-medium text-[#FF6D70]">10,000 걸음</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">주간 운동 시간</span>
                <span className="font-medium text-[#FF6D70]">150 분</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">하루 수면 시간</span>
                <span className="font-medium text-[#FF6D70]">7-8 시간</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">스트레스 관리 시간</span>
                <span className="font-medium text-[#FF6D70]">20 분/일</span>
              </div>
            </div>
          </div>
          
          <div className="bg-[#FF6D70] rounded-xl p-4 mt-4 shadow-sm">
            <div className="flex items-center mb-3">
              <Heart className="w-6 h-6 mr-2 text-white" fill="white" />
              <h3 className="font-bold text-white">목표 심장 건강 점수</h3>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <span className="text-white/80 text-sm">현재</span>
                <div className="text-3xl font-bold text-white">{healthScore.total}</div>
              </div>
              <div>
                <div className="w-12 h-0.5 bg-white/30"></div>
              </div>
              <div>
                <span className="text-white/80 text-sm">목표</span>
                <div className="text-3xl font-bold text-white">90+</div>
              </div>
            </div>
            <div className="mt-3 bg-white/20 rounded-lg p-3">
              <p className="text-white/90 text-sm">
                권장 사항을 꾸준히 실천하면 4주 내에 목표 점수에 도달할 수 있습니다.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HealthScoreDetails;