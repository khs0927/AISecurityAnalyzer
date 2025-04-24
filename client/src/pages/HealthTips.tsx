import React, { useState } from 'react';
import { ArrowLeft, Heart, Activity, Droplet, AlertTriangle, Apple, Search, BookOpen, Pill, Coffee, Clock, Plus, Minus, ArrowRight, Wind } from 'lucide-react';
import { useLocation } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const HealthTips = () => {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("lifestyle");
  const [searchQuery, setSearchQuery] = useState("");

  // 심장 건강에 좋은 식품 목록
  const healthyFoods = [
    {
      category: "어패류",
      items: [
        { name: "연어", benefits: "오메가-3 지방산이 풍부하여 심장 건강에 도움을 줍니다." },
        { name: "고등어", benefits: "HDL(좋은 콜레스테롤)을 높이고 염증을 줄여줍니다." },
        { name: "참치", benefits: "단백질이 풍부하고 오메가-3가 함유되어 있습니다." }
      ]
    },
    {
      category: "견과류 및 씨앗",
      items: [
        { name: "호두", benefits: "알파-리놀렌산이 풍부하여 콜레스테롤 수치를 개선합니다." },
        { name: "아몬드", benefits: "불포화 지방, 식이 섬유, 비타민 E가 풍부합니다." },
        { name: "치아씨드", benefits: "오메가-3 지방산, 섬유질, 단백질이 풍부합니다." }
      ]
    },
    {
      category: "과일 및 채소",
      items: [
        { name: "블루베리", benefits: "항산화제가 풍부하여 혈관 건강에 도움을 줍니다." },
        { name: "아보카도", benefits: "건강한 단일불포화 지방과 칼륨이 풍부합니다." },
        { name: "시금치", benefits: "엽산, 마그네슘, 철분이 풍부합니다." },
        { name: "브로콜리", benefits: "항산화제와 섬유질이 풍부하여 콜레스테롤 관리에 좋습니다." }
      ]
    },
    {
      category: "곡물",
      items: [
        { name: "귀리", benefits: "베타-글루칸 섬유질이 콜레스테롤 감소에 도움을 줍니다." },
        { name: "퀴노아", benefits: "완전한 단백질을 함유한 통곡물입니다." },
        { name: "현미", benefits: "섬유질, 마그네슘, B 비타민이 풍부합니다." }
      ]
    }
  ];

  // 심장 건강 관련 운동 정보
  const exercises = [
    {
      type: "유산소 운동",
      activities: [
        {
          name: "걷기",
          benefits: "낮은 강도로 시작할 수 있는 안전한 운동으로 심장 건강을 증진시킵니다.",
          recommended: "매일 30분, 주 5일"
        },
        {
          name: "수영",
          benefits: "관절에 부담을 주지 않으면서 전신 운동 효과를 제공합니다.",
          recommended: "주 2-3회, 매회 30-45분"
        },
        {
          name: "자전거 타기",
          benefits: "하체 근력을 강화하고 심폐 기능을 향상시킵니다.",
          recommended: "주 3-4회, 매회 30-60분"
        },
        {
          name: "달리기",
          benefits: "심폐 지구력을 크게 향상시키지만 관절에 충격을 줄 수 있습니다.",
          recommended: "주 2-3회, 매회 20-30분"
        }
      ]
    },
    {
      type: "근력 운동",
      activities: [
        {
          name: "체중 운동",
          benefits: "특별한 장비 없이 할 수 있는 기본적인 근력 운동입니다.",
          recommended: "주 2-3회, 15-20회 반복"
        },
        {
          name: "덤벨 운동",
          benefits: "근육 강화와 골밀도 유지에 도움을 줍니다.",
          recommended: "주 2회, 8-12회 반복, 2-3세트"
        },
        {
          name: "저항 밴드",
          benefits: "저강도로 근육을 강화하고 관절에 부담이 적습니다.",
          recommended: "주 2-3회, 12-15회 반복"
        }
      ]
    },
    {
      type: "유연성 및 균형 운동",
      activities: [
        {
          name: "요가",
          benefits: "유연성 향상, 스트레스 감소, 심박수 안정화에 효과적입니다.",
          recommended: "주 2-3회, 매회 30-60분"
        },
        {
          name: "태극권",
          benefits: "낮은 강도의 유산소 운동이자 균형감각 향상에 도움을 줍니다.",
          recommended: "주 2-3회, 매회 30-60분"
        },
        {
          name: "필라테스",
          benefits: "코어 근육 강화와 자세 개선에 효과적입니다.",
          recommended: "주 2회, 매회 45-60분"
        }
      ]
    }
  ];

  // 스트레스 관리 방법
  const stressManagement = [
    {
      name: "명상",
      description: "하루 10-15분간 명상은 혈압과 심박수를 낮추고 스트레스 호르몬을 감소시킵니다.",
      steps: [
        "조용하고 편안한 공간을 찾으세요.",
        "편안한 자세로 앉거나 누우세요.",
        "호흡에 집중하며 들이마시고 내쉬는 것을 인식하세요.",
        "생각이 떠오르면 판단 없이 알아차리고 다시 호흡으로 돌아오세요.",
        "처음에는 5분부터 시작하여 점차 시간을 늘려가세요."
      ]
    },
    {
      name: "심호흡 기법",
      description: "깊은 복식호흡은 자율신경계를 안정시키고 심장 건강에 도움을 줍니다.",
      steps: [
        "코로 숫자 4를 세며 깊게 들이마시세요.",
        "숨을 2초간 참으세요.",
        "입으로 숫자 6을 세며 천천히 내쉬세요.",
        "이 과정을 5-10분간 반복하세요.",
        "일상 중 스트레스를 느낄 때마다 실행해 보세요."
      ]
    },
    {
      name: "점진적 근육 이완법",
      description: "신체 부위별로 긴장과 이완을 반복하여 신체적 스트레스를 줄입니다.",
      steps: [
        "발끝부터 시작하여 각 근육 그룹을 5초간 긴장시키세요.",
        "이후 30초간 완전히 이완시키세요.",
        "발, 다리, 복부, 가슴, 팔, 어깨, 목, 얼굴 순으로 진행하세요.",
        "긴장과 이완의 차이를 느끼며 신체 감각에 집중하세요.",
        "전체 과정은 15-20분 정도 소요됩니다."
      ]
    },
    {
      name: "자연 속 시간 보내기",
      description: "자연 환경에서 시간을 보내는 것은 스트레스 호르몬을 감소시키고 심박수를 안정화합니다.",
      steps: [
        "가까운 공원이나 자연 환경을 찾으세요.",
        "전자기기 없이 20-30분간 걷거나 앉아 있으세요.",
        "주변의 소리, 향기, 색상에 집중하세요.",
        "마음이 편안해지는 것을 느끼세요.",
        "가능하면 일주일에 2-3회 실천하세요."
      ]
    }
  ];

  // 심장 건강에 좋은 생활 습관
  const lifestyleHabits = [
    {
      title: "규칙적인 수면",
      description: "매일 7-8시간의 양질의 수면은 심장 건강에 필수적입니다. 불규칙한 수면은 혈압 상승, 염증 증가, 인슐린 저항성 등의 문제를 일으킬 수 있습니다.",
      tips: [
        "매일 같은 시간에 자고 일어나세요.",
        "취침 전 전자기기 사용을 피하세요.",
        "침실을 시원하고 어둡게 유지하세요.",
        "카페인과 알코올 섭취를 제한하세요."
      ]
    },
    {
      title: "금연",
      description: "흡연은 심혈관 질환의 주요 위험 요소입니다. 담배를 끊으면 심장 발작 위험이 1년 내에 50% 감소합니다.",
      tips: [
        "금연 날짜를 정하고 주변에 알리세요.",
        "의사와 상담하여 금연 보조제 사용을 고려하세요.",
        "금연 클리닉이나 지원 그룹에 참여하세요.",
        "흡연 욕구가 생길 때를 위한 대체 활동을 계획하세요."
      ]
    },
    {
      title: "알코올 제한",
      description: "과도한 알코올 섭취는 고혈압, 부정맥, 심장 근육 손상을 유발할 수 있습니다. 적정 음주량은 남성은 하루 2잔 이하, 여성은 1잔 이하입니다.",
      tips: [
        "알코올 섭취량을 기록하고 추적하세요.",
        "알코올 대신 물이나 무알코올 음료를 선택하세요.",
        "주류가 있는 사교 모임에서 미리 계획을 세우세요.",
        "알코올 섭취 이유를 인식하고 건강한 대처 방법을 찾으세요."
      ]
    },
    {
      title: "소금 섭취 제한",
      description: "과도한 나트륨 섭취는 혈압을 상승시키고 심장에 부담을 줍니다. 일일 소금 섭취량은 5g(1티스푼) 이하를 권장합니다.",
      tips: [
        "가공식품과 외식을 줄이세요.",
        "식품 라벨의 나트륨 함량을 확인하세요.",
        "조리 시 소금 대신 허브와 향신료를 사용하세요.",
        "신선한 재료로 요리하는 습관을 들이세요."
      ]
    },
    {
      title: "정기적인 건강 검진",
      description: "정기적인 건강 검진을 통해 혈압, 콜레스테롤, 혈당 수치 등을 모니터링하는 것이 중요합니다.",
      tips: [
        "나이, 가족력, 위험 요인에 따라 검진 주기를 조정하세요.",
        "혈압, 콜레스테롤, 혈당 수치를 정기적으로 확인하세요.",
        "의사와 함께 심장 건강 목표를 설정하세요.",
        "자가 모니터링 도구를 활용하여 건강 상태를 추적하세요."
      ]
    }
  ];

  // 검색 필터링 함수
  const filterContent = (content: any[], query: string, type: string) => {
    if (!query) return content;
    
    switch (type) {
      case 'food':
        return content.map(category => ({
          ...category,
          items: category.items.filter(item => 
            item.name.toLowerCase().includes(query.toLowerCase()) || 
            item.benefits.toLowerCase().includes(query.toLowerCase())
          )
        })).filter(category => category.items.length > 0);
      
      case 'exercise':
        return content.map(category => ({
          ...category,
          activities: category.activities.filter(activity => 
            activity.name.toLowerCase().includes(query.toLowerCase()) || 
            activity.benefits.toLowerCase().includes(query.toLowerCase())
          )
        })).filter(category => category.activities.length > 0);
      
      case 'stress':
        return content.filter(item => 
          item.name.toLowerCase().includes(query.toLowerCase()) || 
          item.description.toLowerCase().includes(query.toLowerCase()) ||
          item.steps.some(step => step.toLowerCase().includes(query.toLowerCase()))
        );
      
      case 'lifestyle':
        return content.filter(item => 
          item.title.toLowerCase().includes(query.toLowerCase()) || 
          item.description.toLowerCase().includes(query.toLowerCase()) ||
          item.tips.some(tip => tip.toLowerCase().includes(query.toLowerCase()))
        );
      
      default:
        return content;
    }
  };

  // 필터링된 데이터
  const filteredFoods = filterContent(healthyFoods, searchQuery, 'food');
  const filteredExercises = filterContent(exercises, searchQuery, 'exercise');
  const filteredStressManagement = filterContent(stressManagement, searchQuery, 'stress');
  const filteredLifestyleHabits = filterContent(lifestyleHabits, searchQuery, 'lifestyle');

  return (
    <div className="pb-16">
      {/* 헤더 */}
      <div className="flex items-center mb-6 mt-6">
        <button 
          onClick={() => setLocation('/')}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm mr-4"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">건강 정보</h1>
      </div>

      {/* 검색창 */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="건강 정보 검색..."
            className="pl-10 pr-4 py-2 rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <Tabs defaultValue="lifestyle" value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="lifestyle" className="text-xs sm:text-sm">
            <div className="flex flex-col items-center">
              <Heart className="h-4 w-4 mb-1" />
              <span>생활 습관</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="diet" className="text-xs sm:text-sm">
            <div className="flex flex-col items-center">
              <Apple className="h-4 w-4 mb-1" />
              <span>식이 요법</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="exercise" className="text-xs sm:text-sm">
            <div className="flex flex-col items-center">
              <Activity className="h-4 w-4 mb-1" />
              <span>운동</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="stress" className="text-xs sm:text-sm">
            <div className="flex flex-col items-center">
              <AlertTriangle className="h-4 w-4 mb-1" />
              <span>스트레스</span>
            </div>
          </TabsTrigger>
        </TabsList>
        
        {/* 생활 습관 탭 */}
        <TabsContent value="lifestyle" className="mt-4">
          <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
            <div className="flex items-center mb-3">
              <Heart className="w-5 h-5 mr-2 text-[#FF6D70]" />
              <h2 className="text-lg font-bold text-gray-800">심장 건강을 위한 생활 습관</h2>
            </div>
            <p className="text-gray-700 text-sm mb-3">
              일상 생활 습관은 심장 건강에 큰 영향을 미칩니다. 다음의 권장 습관을 실천하여 심장 질환 위험을 줄이고 건강한 심장을 유지하세요.
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            {filteredLifestyleHabits.map((habit, index) => (
              <AccordionItem 
                key={index} 
                value={`habit-${index}`}
                className="bg-white rounded-xl shadow-sm border-none"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center">
                    <div className="bg-[#FFE2E9] p-2 rounded-full mr-3">
                      {index === 0 ? <Clock className="w-4 h-4 text-[#FF6D70]" /> :
                       index === 1 ? <AlertTriangle className="w-4 h-4 text-[#FF6D70]" /> :
                       index === 2 ? <Coffee className="w-4 h-4 text-[#FF6D70]" /> :
                       index === 3 ? <Droplet className="w-4 h-4 text-[#FF6D70]" /> :
                       <Activity className="w-4 h-4 text-[#FF6D70]" />}
                    </div>
                    <span className="font-medium text-gray-800">{habit.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <p className="text-sm text-gray-700 mb-3">{habit.description}</p>
                  <h4 className="font-medium text-gray-800 mb-2">실천 방법:</h4>
                  <ul className="space-y-2">
                    {habit.tips.map((tip, tipIndex) => (
                      <li key={tipIndex} className="flex">
                        <span className="bg-[#FFE2E9] text-[#FF6D70] w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 flex-shrink-0 mt-0.5">
                          {tipIndex + 1}
                        </span>
                        <span className="text-sm text-gray-700">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>
        
        {/* 식이 요법 탭 */}
        <TabsContent value="diet" className="mt-4">
          <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
            <div className="flex items-center mb-3">
              <Apple className="w-5 h-5 mr-2 text-[#FF6D70]" />
              <h2 className="text-lg font-bold text-gray-800">심장 건강에 좋은 식품</h2>
            </div>
            <p className="text-gray-700 text-sm mb-3">
              균형 잡힌 식단은 심장 건강을 유지하는 핵심입니다. 다음 식품들을 일상 식단에 포함하여 심장 건강을 개선하세요.
            </p>
          </div>

          <div className="space-y-4">
            {filteredFoods.map((category, index) => (
              <div key={index} className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-3">{category.category}</h3>
                <div className="space-y-3">
                  {category.items.map((food, foodIndex) => (
                    <div key={foodIndex} className="flex">
                      <div className="bg-[#FFE2E9] p-2 rounded-full mr-3 h-fit">
                        <Apple className="w-4 h-4 text-[#FF6D70]" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-800">{food.name}</h4>
                        <p className="text-sm text-gray-600">{food.benefits}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm mt-4">
            <h3 className="font-bold text-gray-800 mb-3">식단 계획 요령</h3>
            <div className="space-y-3">
              <div className="flex">
                <span className="bg-[#FFE2E9] text-[#FF6D70] w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 flex-shrink-0 mt-0.5">
                  1
                </span>
                <span className="text-sm text-gray-700">
                  과일, 채소, 통곡물을 식사의 기본으로 삼으세요.
                </span>
              </div>
              <div className="flex">
                <span className="bg-[#FFE2E9] text-[#FF6D70] w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 flex-shrink-0 mt-0.5">
                  2
                </span>
                <span className="text-sm text-gray-700">
                  동물성 지방보다 식물성 기름(올리브유, 아보카도 오일)을 선택하세요.
                </span>
              </div>
              <div className="flex">
                <span className="bg-[#FFE2E9] text-[#FF6D70] w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 flex-shrink-0 mt-0.5">
                  3
                </span>
                <span className="text-sm text-gray-700">
                  붉은 육류 대신 생선, 가금류, 콩류를 단백질 공급원으로 섭취하세요.
                </span>
              </div>
              <div className="flex">
                <span className="bg-[#FFE2E9] text-[#FF6D70] w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 flex-shrink-0 mt-0.5">
                  4
                </span>
                <span className="text-sm text-gray-700">
                  당분과 정제된 탄수화물을 제한하세요.
                </span>
              </div>
              <div className="flex">
                <span className="bg-[#FFE2E9] text-[#FF6D70] w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 flex-shrink-0 mt-0.5">
                  5
                </span>
                <span className="text-sm text-gray-700">
                  물을 충분히 마시고 가공 음료는 줄이세요.
                </span>
              </div>
            </div>
            <div className="mt-4 bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-700 flex">
                <BookOpen className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" />
                지중해식 식단이나 DASH(고혈압 방지를 위한 식이 요법) 접근법은 심장 건강에 특히 좋은 것으로 입증되었습니다.
              </p>
            </div>
          </div>
        </TabsContent>
        
        {/* 운동 탭 */}
        <TabsContent value="exercise" className="mt-4">
          <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
            <div className="flex items-center mb-3">
              <Activity className="w-5 h-5 mr-2 text-[#FF6D70]" />
              <h2 className="text-lg font-bold text-gray-800">심장 건강을 위한 운동</h2>
            </div>
            <p className="text-gray-700 text-sm mb-3">
              규칙적인 운동은 심장 질환 위험을 줄이고 심장 기능을 향상시킵니다. 아래 운동들을 균형있게 실천하세요.
            </p>
          </div>

          <div className="space-y-4">
            {filteredExercises.map((category, index) => (
              <div key={index} className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-3">{category.type}</h3>
                <div className="space-y-4">
                  {category.activities.map((activity, activityIndex) => (
                    <div key={activityIndex}>
                      <div className="flex items-start mb-2">
                        <div className="bg-[#FFE2E9] p-2 rounded-full mr-3 mt-0.5">
                          <Activity className="w-4 h-4 text-[#FF6D70]" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-800">{activity.name}</h4>
                          <p className="text-sm text-gray-600">{activity.benefits}</p>
                        </div>
                      </div>
                      <div className="ml-11 mb-4">
                        <span className="bg-[#FFE2E9]/50 text-[#FF6D70] text-xs px-2 py-1 rounded-full">
                          권장: {activity.recommended}
                        </span>
                      </div>
                      {activityIndex < category.activities.length - 1 && (
                        <Separator className="my-2 ml-11" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm mt-4">
            <h3 className="font-bold text-gray-800 mb-3">운동 시작 가이드</h3>
            <div className="space-y-3">
              <div className="flex">
                <div className="bg-[#FFE2E9] p-2 rounded-full mr-3 h-fit">
                  <Plus className="w-4 h-4 text-[#FF6D70]" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">시작하기</h4>
                  <p className="text-sm text-gray-600">
                    낮은 강도의 활동부터 시작하여 점차 강도와 시간을 늘려가세요.
                  </p>
                </div>
              </div>
              <div className="flex">
                <div className="bg-[#FFE2E9] p-2 rounded-full mr-3 h-fit">
                  <Clock className="w-4 h-4 text-[#FF6D70]" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">목표 설정</h4>
                  <p className="text-sm text-gray-600">
                    주당 최소 150분의 중강도 운동 또는 75분의 고강도 운동을 목표로 하세요.
                  </p>
                </div>
              </div>
              <div className="flex">
                <div className="bg-[#FFE2E9] p-2 rounded-full mr-3 h-fit">
                  <AlertTriangle className="w-4 h-4 text-[#FF6D70]" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">주의사항</h4>
                  <p className="text-sm text-gray-600">
                    기존 심장 질환이 있는 경우, 운동 프로그램을 시작하기 전에 의사와 상담하세요.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
        
        {/* 스트레스 관리 탭 */}
        <TabsContent value="stress" className="mt-4">
          <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
            <div className="flex items-center mb-3">
              <AlertTriangle className="w-5 h-5 mr-2 text-[#FF6D70]" />
              <h2 className="text-lg font-bold text-gray-800">스트레스 관리 방법</h2>
            </div>
            <p className="text-gray-700 text-sm mb-3">
              만성적인 스트레스는 고혈압, 염증 증가 등 심장 건강에 부정적인 영향을 미칩니다. 다음 방법들로 스트레스를 효과적으로 관리하세요.
            </p>
          </div>

          <div className="space-y-4">
            {filteredStressManagement.map((method, index) => (
              <div key={index} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-start mb-3">
                  <div className="bg-[#FFE2E9] p-2 rounded-full mr-3 mt-0.5">
                    <AlertTriangle className="w-4 h-4 text-[#FF6D70]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{method.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{method.description}</p>
                  </div>
                </div>
                <div className="ml-11">
                  <h4 className="font-medium text-gray-800 mb-2">실행 방법:</h4>
                  <ol className="space-y-2">
                    {method.steps.map((step, stepIndex) => (
                      <li key={stepIndex} className="flex">
                        <span className="bg-[#FFE2E9] text-[#FF6D70] w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 flex-shrink-0 mt-0.5">
                          {stepIndex + 1}
                        </span>
                        <span className="text-sm text-gray-700">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800">스트레스 관리 앱 추천</h3>
              <Button variant="outline" size="sm" className="text-[#FF6D70]">
                더보기
              </Button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center">
                <div className="bg-[#FFE2E9] p-2 rounded-full mr-3">
                  <Activity className="w-4 h-4 text-[#FF6D70]" />
                </div>
                <div className="flex-grow">
                  <h4 className="font-medium text-gray-800">명상 앱</h4>
                  <p className="text-xs text-gray-500">guided meditation, mindfulness</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex items-center">
                <div className="bg-[#FFE2E9] p-2 rounded-full mr-3">
                  <Wind className="w-4 h-4 text-[#FF6D70]" />
                </div>
                <div className="flex-grow">
                  <h4 className="font-medium text-gray-800">호흡 훈련 앱</h4>
                  <p className="text-xs text-gray-500">breathing exercises, breath work</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex items-center">
                <div className="bg-[#FFE2E9] p-2 rounded-full mr-3">
                  <Clock className="w-4 h-4 text-[#FF6D70]" />
                </div>
                <div className="flex-grow">
                  <h4 className="font-medium text-gray-800">수면 개선 앱</h4>
                  <p className="text-xs text-gray-500">sleep tracking, white noise, sleep stories</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HealthTips;