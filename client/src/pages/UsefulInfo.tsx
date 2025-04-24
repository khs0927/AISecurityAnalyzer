import React, { useState } from 'react';
import { ArrowLeft, Heart, Activity, Search, Info, BookOpen, Hospital, Pill, MapPin, User, AlertTriangle, ArrowRight, Clock, Phone } from 'lucide-react';
import { useLocation } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const UsefulInfo = () => {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("cardiology");
  const [searchQuery, setSearchQuery] = useState("");

  // 심장 질환 정보
  const heartDiseases = [
    {
      name: "고혈압",
      description: "혈관 내 압력이 지속적으로 높은 상태. 심장 발작, 뇌졸중, 신장 손상의 주요 위험 요소.",
      symptoms: ["대부분 증상이 없음 (무증상)", "심한 경우: 두통, 어지러움, 흉통, 호흡 곤란"],
      prevention: ["저염식 식단", "규칙적인 운동", "건강한 체중 유지", "금연", "알코올 제한", "스트레스 관리"]
    },
    {
      name: "관상동맥 질환",
      description: "심장에 혈액을 공급하는 혈관이 좁아지거나 막히는 질환. 심장 발작의 주요 원인.",
      symptoms: ["흉통(협심증)", "호흡 곤란", "심장 발작 시: 강한 가슴 압박감, 어깨/팔로 방사되는 통증"],
      prevention: ["콜레스테롤 수치 관리", "혈압 조절", "건강한 식단", "규칙적인 운동", "금연"]
    },
    {
      name: "심방세동",
      description: "불규칙한 심장 박동 패턴. 뇌졸중 위험을 5배 증가시킴.",
      symptoms: ["불규칙한 심장 박동", "심장 두근거림", "피로", "어지러움", "가슴 통증"],
      prevention: ["혈압 조절", "과도한 알코올 섭취 피하기", "카페인 제한", "적절한 갑상선 기능 유지"]
    },
    {
      name: "심부전",
      description: "심장이, 신체가 필요로 하는 만큼 혈액을 효과적으로 펌프질하지 못하는 상태.",
      symptoms: ["호흡 곤란 (특히 누워있을 때)", "피로와 약함", "다리, 발목, 복부 부종", "빠른 심장 박동"],
      prevention: ["기저 질환 관리 (고혈압, 당뇨병)", "건강한 식단", "규칙적인 운동", "금연", "알코올 제한"]
    },
    {
      name: "판막 질환",
      description: "심장 판막이 제대로 기능하지 않는 상태. 혈액 흐름에 문제를 일으킴.",
      symptoms: ["호흡 곤란", "피로", "비정상적인 심장 소리(심잡음)", "가슴 통증", "다리 부종"],
      prevention: ["구강 건강 유지 (감염성 판막염 예방)", "혈압 관리", "정기적인 심장 검진"]
    }
  ];

  // 심장 질환 응급 상황 대처법
  const emergencyResponses = [
    {
      condition: "심장 발작",
      symptoms: ["가슴 통증 또는 압박감", "팔, 목, 턱, 등으로 퍼지는 통증", "호흡 곤란", "식은땀", "메스꺼움"],
      actions: [
        "즉시 119에 전화하세요.",
        "환자를 편안한 자세로 눕히고 옷을 느슨하게 합니다.",
        "아스피린이 있다면 씹어서 복용하도록 합니다(알레르기가 없는 경우).",
        "심장 압박이 필요한 경우 CPR을 실시합니다.",
        "AED(자동제세동기)가 있다면 사용합니다."
      ]
    },
    {
      condition: "뇌졸중",
      symptoms: ["얼굴 한쪽이 처짐", "한쪽 팔의 약화", "말하기 어려움", "갑작스러운 어지러움", "심한 두통"],
      actions: [
        "즉시 119에 전화하세요. 증상 발생 시간을 기록하세요.",
        "환자를 눕히고 머리를 약간 올려줍니다.",
        "의식이 있으면 안심시키고, 물이나 음식을 주지 마세요.",
        "구토하면 옆으로 눕혀 기도가 막히지 않게 합니다.",
        "의식이 없고 호흡이 없으면 CPR을 시작합니다."
      ]
    },
    {
      condition: "심정지",
      symptoms: ["갑작스러운 의식 소실", "반응 없음", "호흡 없음 또는 비정상적 호흡(헐떡임)", "맥박 없음"],
      actions: [
        "즉시 119에 전화하고 AED를 요청하세요.",
        "즉시 심폐소생술(CPR)을 시작하세요.",
        "가슴 중앙을 강하고 빠르게 압박합니다(분당 100-120회).",
        "AED가 도착하면 지시에 따라 사용합니다.",
        "전문 응급 구조대가 도착할 때까지 계속합니다."
      ]
    },
    {
      condition: "심부전 악화",
      symptoms: ["갑작스러운 심한 호흡 곤란", "핑크빛 거품이 있는 기침", "빠른 심장 박동", "극심한 피로", "의식 혼미"],
      actions: [
        "즉시 119에 전화하세요.",
        "환자를 편안한 자세로 앉히고 옷을 느슨하게 합니다.",
        "산소 공급이 가능하면 제공합니다.",
        "평소 복용 중인 약물 정보를 응급 의료진에게 알려줍니다.",
        "호흡이 멈추면 CPR을 시작합니다."
      ]
    },
    {
      condition: "실신",
      symptoms: ["갑자기 쓰러짐", "짧은 의식 소실", "창백함", "약한 맥박", "회복 후 혼란"],
      actions: [
        "환자를 평평한 곳에 눕히고 다리를 높이 들어올립니다.",
        "옷을 느슨하게 하고 기도가 막히지 않도록 합니다.",
        "의식이 돌아오면 천천히 일어나도록 돕습니다.",
        "반복되거나 심장 질환자의 실신은 119에 신고합니다.",
        "의식이 돌아오지 않으면 CPR을 시작합니다."
      ]
    }
  ];

  // 자주 묻는 질문
  const faqs = [
    {
      question: "심장 질환의 주요 위험 요소는 무엇인가요?",
      answer: "심장 질환의 주요 위험 요소는 고혈압, 높은 콜레스테롤, 당뇨병, 흡연, 비만, 신체 활동 부족, 과도한 알코올 섭취, 스트레스, 나이(남성 45세 이상, 여성 55세 이상), 가족력 등이 있습니다. 이러한 위험 요소 중 많은 부분은 생활 습관 개선을 통해 조절할 수 있습니다."
    },
    {
      question: "심장 건강을 위한 이상적인 혈압과 콜레스테롤 수치는 얼마인가요?",
      answer: "이상적인 혈압은 120/80 mmHg 미만입니다. 총 콜레스테롤은 200 mg/dL 미만, LDL(나쁜 콜레스테롤)은 100 mg/dL 미만, HDL(좋은 콜레스테롤)은 60 mg/dL 이상, 중성지방은 150 mg/dL 미만이 권장됩니다. 개인의 건강 상태에 따라 목표 수치가 다를 수 있으므로 의사와 상담하는 것이 중요합니다."
    },
    {
      question: "심장 질환 예방을 위한 최적의 운동 방법은 무엇인가요?",
      answer: "심장 건강을 위해서는 주당 최소 150분의 중강도 유산소 운동(빠른 걷기, 수영, 자전거 타기 등) 또는 75분의 고강도 운동을 권장합니다. 여기에 주 2회 이상의 근력 운동을 추가하는 것이 좋습니다. 운동 시간을 나누어 하루 30분씩 5일 동안 하는 것도 효과적입니다. 운동 시작 전 의사와 상담하고, 점진적으로 강도를 높여가는 것이 안전합니다."
    },
    {
      question: "심장 친화적인 식단은 어떻게 구성해야 하나요?",
      answer: "심장 친화적인 식단은 과일, 채소, 통곡물, 저지방 단백질(생선, 가금류, 콩류), 건강한 지방(올리브 오일, 견과류) 위주로 구성됩니다. 소금, 포화지방, 트랜스지방, 첨가당은 제한해야 합니다. 지중해식 식단이나 DASH(Dietary Approaches to Stop Hypertension) 식단이 심장 건강에 좋은 것으로 입증되었습니다."
    },
    {
      question: "심장 발작과 심정지의 차이점은 무엇인가요?",
      answer: "심장 발작(심근경색)은 심장 근육으로 가는 혈액 공급이 막혀 심장 조직이 손상되는 상태입니다. 환자는 대개 의식이 있고 통증을 느낍니다. 반면 심정지는 심장이 갑자기 펌프 작용을 멈추는 것으로, 환자는 의식을 잃고 반응이 없으며 맥박과 호흡이 없습니다. 심장 발작이 심정지로 이어질 수 있지만, 모든 심장 발작이, 심정지를 유발하진 않습니다."
    },
    {
      question: "가슴 통증이 있을 때 언제 병원에 가야 하나요?",
      answer: "가슴 통증이 심하거나 압박감이 있고, 팔, 턱, 목으로 퍼지거나, 호흡 곤란, 식은땀, 메스꺼움과 함께 나타나면 즉시 119에 전화하세요. 특히 통증이 20분 이상 지속되거나, 안정 시에도 계속되거나, 기존 심장 질환이 있는 경우라면 더욱 응급 상황일 수 있습니다. 언제 병원에 갈지 확신이 없다면 항상 안전하게 의료 도움을 구하는 것이 좋습니다."
    }
  ];

  // 병원 정보
  const hospitals = [
    {
      name: "서울대학교병원 심장뇌혈관병원",
      address: "서울 종로구 대학로 101",
      specialties: ["관상동맥질환", "심부전", "부정맥", "판막질환"],
      contact: "02-1111-2222",
      distance: "2.3km"
    },
    {
      name: "삼성서울병원 심장혈관센터",
      address: "서울 강남구 일원로 81",
      specialties: ["관상동맥중재시술", "부정맥", "선천성심장병", "대동맥질환"],
      contact: "02-3333-4444",
      distance: "5.1km"
    },
    {
      name: "세브란스병원 심장혈관병원",
      address: "서울 서대문구 연세로 50-1",
      specialties: ["협심증", "심장판막질환", "심부전", "고혈압"],
      contact: "02-5555-6666",
      distance: "3.7km"
    },
    {
      name: "아산병원 심장병원",
      address: "서울 송파구 올림픽로 43길 88",
      specialties: ["관상동맥질환", "부정맥", "심장이식", "로봇심장수술"],
      contact: "02-7777-8888",
      distance: "6.2km"
    }
  ];

  // 의사 정보
  const doctors = [
    {
      name: "김영수 교수",
      hospital: "서울대학교병원 심장뇌혈관병원",
      specialties: ["관상동맥중재시술", "고혈압", "고지혈증"],
      experience: "경력 25년",
      availability: "월, 수, 금 오전"
    },
    {
      name: "박민지 교수",
      hospital: "삼성서울병원 심장혈관센터",
      specialties: ["부정맥", "심방세동", "심장전기생리검사"],
      experience: "경력 20년",
      availability: "화, 목 종일"
    },
    {
      name: "이정훈 교수",
      hospital: "세브란스병원 심장혈관병원",
      specialties: ["심부전", "판막질환", "심장이식"],
      experience: "경력 18년",
      availability: "월, 화, 목 오후"
    },
    {
      name: "최수진 교수",
      hospital: "아산병원 심장병원",
      specialties: ["선천성심장병", "성인심장병", "심장초음파"],
      experience: "경력 22년",
      availability: "수, 금 종일"
    }
  ];

  // 검색 필터링 함수
  const filterContent = (content: any[], query: string, type: string) => {
    if (!query) return content;
    
    switch (type) {
      case 'disease':
        return content.filter(disease => 
          disease.name.toLowerCase().includes(query.toLowerCase()) || 
          disease.description.toLowerCase().includes(query.toLowerCase()) ||
          disease.symptoms.some((s: string) => s.toLowerCase().includes(query.toLowerCase())) ||
          disease.prevention.some((p: string) => p.toLowerCase().includes(query.toLowerCase()))
        );
      
      case 'emergency':
        return content.filter(emergency => 
          emergency.condition.toLowerCase().includes(query.toLowerCase()) || 
          emergency.symptoms.some((s: string) => s.toLowerCase().includes(query.toLowerCase())) ||
          emergency.actions.some((a: string) => a.toLowerCase().includes(query.toLowerCase()))
        );
      
      case 'faq':
        return content.filter(faq => 
          faq.question.toLowerCase().includes(query.toLowerCase()) || 
          faq.answer.toLowerCase().includes(query.toLowerCase())
        );
      
      case 'hospital':
        return content.filter(hospital => 
          hospital.name.toLowerCase().includes(query.toLowerCase()) || 
          hospital.address.toLowerCase().includes(query.toLowerCase()) ||
          hospital.specialties.some((s: string) => s.toLowerCase().includes(query.toLowerCase()))
        );
      
      case 'doctor':
        return content.filter(doctor => 
          doctor.name.toLowerCase().includes(query.toLowerCase()) || 
          doctor.hospital.toLowerCase().includes(query.toLowerCase()) ||
          doctor.specialties.some((s: string) => s.toLowerCase().includes(query.toLowerCase()))
        );
      
      default:
        return content;
    }
  };

  // 필터링된 데이터
  const filteredDiseases = filterContent(heartDiseases, searchQuery, 'disease');
  const filteredEmergencies = filterContent(emergencyResponses, searchQuery, 'emergency');
  const filteredFaqs = filterContent(faqs, searchQuery, 'faq');
  const filteredHospitals = filterContent(hospitals, searchQuery, 'hospital');
  const filteredDoctors = filterContent(doctors, searchQuery, 'doctor');

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
        <h1 className="text-2xl font-bold text-gray-800">유용한 정보</h1>
      </div>

      {/* 검색창 */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="심장 건강 정보 검색..."
            className="pl-10 pr-4 py-2 rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <Tabs defaultValue="cardiology" value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="w-full grid grid-cols-5">
          <TabsTrigger value="cardiology" className="text-xs">심장질환</TabsTrigger>
          <TabsTrigger value="emergency" className="text-xs">응급대응</TabsTrigger>
          <TabsTrigger value="faq" className="text-xs">FAQ</TabsTrigger>
          <TabsTrigger value="hospitals" className="text-xs">병원정보</TabsTrigger>
          <TabsTrigger value="doctors" className="text-xs">의사정보</TabsTrigger>
        </TabsList>
        
        {/* 심장 질환 정보 탭 */}
        <TabsContent value="cardiology" className="mt-4">
          <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
            <div className="flex items-center mb-3">
              <Heart className="w-5 h-5 mr-2 text-[#FF6D70]" />
              <h2 className="text-lg font-bold text-gray-800">주요 심장 질환 정보</h2>
            </div>
            <p className="text-gray-700 text-sm mb-3">
              심장 질환에 대한 이해는 예방과 치료의 첫 단계입니다. 아래 정보를 통해 주요 심장 질환의 증상과 예방법을 알아보세요.
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            {filteredDiseases.map((disease, index) => (
              <AccordionItem 
                key={index} 
                value={`disease-${index}`}
                className="bg-white rounded-xl shadow-sm border-none"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center">
                    <div className="bg-[#FFE2E9] p-2 rounded-full mr-3">
                      <Heart className="w-4 h-4 text-[#FF6D70]" />
                    </div>
                    <span className="font-medium text-gray-800">{disease.name}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <p className="text-sm text-gray-700 mb-3">{disease.description}</p>
                  
                  <h4 className="font-medium text-gray-800 mb-2">주요 증상:</h4>
                  <ul className="mb-3">
                    {disease.symptoms.map((symptom, symptomIndex) => (
                      <li key={symptomIndex} className="flex items-start mb-1">
                        <span className="bg-[#FFE2E9] text-[#FF6D70] min-w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 flex-shrink-0 mt-0.5">
                          •
                        </span>
                        <span className="text-sm text-gray-700">{symptom}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <h4 className="font-medium text-gray-800 mb-2">예방법:</h4>
                  <ul>
                    {disease.prevention.map((prevention, preventionIndex) => (
                      <li key={preventionIndex} className="flex items-start mb-1">
                        <span className="bg-[#FFE2E9] text-[#FF6D70] min-w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 flex-shrink-0 mt-0.5">
                          •
                        </span>
                        <span className="text-sm text-gray-700">{prevention}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="bg-[#FF6D70] rounded-xl p-4 shadow-sm mt-4 text-white">
            <div className="flex items-start mb-3">
              <Info className="w-5 h-5 mr-2 mt-0.5 text-white" />
              <div>
                <h3 className="font-bold">알아두세요</h3>
                <p className="text-sm text-white/90 mt-1">
                  이 정보는 의학적 조언을 대체하지 않습니다. 증상이 있거나 우려되는 점이 있다면 항상 의료 전문가와 상담하세요.
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full bg-white/20 text-white border-white/30 hover:bg-white/30 hover:text-white"
              onClick={() => setLocation('/ai-voice-consultation')}
            >
              AI 상담사에게 더 물어보기
            </Button>
          </div>
        </TabsContent>
        
        {/* 응급 대응 정보 탭 */}
        <TabsContent value="emergency" className="mt-4">
          <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
            <div className="flex items-center mb-3">
              <AlertTriangle className="w-5 h-5 mr-2 text-[#FF6D70]" />
              <h2 className="text-lg font-bold text-gray-800">심장 관련 응급 상황 대처법</h2>
            </div>
            <p className="text-gray-700 text-sm mb-3">
              심장 관련 응급 상황에서는 신속한 대처가 생명을 구할 수 있습니다. 주요 응급 상황별 증상과 대처법을 알아두세요.
            </p>
          </div>

          <div className="space-y-4">
            {filteredEmergencies.map((emergency, index) => (
              <div key={index} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-start mb-3">
                  <div className={`p-2 rounded-full mr-3 mt-0.5 ${index === 0 || index === 2 ? 'bg-red-100' : 'bg-[#FFE2E9]'}`}>
                    <AlertTriangle className={`w-4 h-4 ${index === 0 || index === 2 ? 'text-red-500' : 'text-[#FF6D70]'}`} />
                  </div>
                  <div>
                    <h3 className={`font-bold ${index === 0 || index === 2 ? 'text-red-500' : 'text-gray-800'}`}>
                      {emergency.condition}
                    </h3>
                  </div>
                </div>

                <div className="ml-11">
                  <h4 className="font-medium text-gray-800 mb-2">증상:</h4>
                  <ul className="mb-3">
                    {emergency.symptoms.map((symptom, symptomIndex) => (
                      <li key={symptomIndex} className="flex items-start mb-1">
                        <span className="bg-[#FFE2E9] text-[#FF6D70] min-w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 flex-shrink-0 mt-0.5">
                          •
                        </span>
                        <span className="text-sm text-gray-700">{symptom}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <h4 className="font-medium text-gray-800 mb-2">대처 방법:</h4>
                  <ol className="space-y-2">
                    {emergency.actions.map((action, actionIndex) => (
                      <li key={actionIndex} className="flex">
                        <span className="bg-[#FFE2E9] text-[#FF6D70] w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 flex-shrink-0 mt-0.5">
                          {actionIndex + 1}
                        </span>
                        <span className="text-sm text-gray-700">{action}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl p-4 shadow-sm mt-4 bg-gradient-to-r from-[#FF6D70] to-[#FF9EB6]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <Phone className="w-5 h-5 mr-2 text-white" />
                <h3 className="font-bold text-white">응급 연락처</h3>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-white/20 text-white border-white/30 hover:bg-white/30 hover:text-white"
              >
                저장하기
              </Button>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-white/20 rounded-lg p-3">
                <div className="flex items-center">
                  <div className="bg-white w-8 h-8 rounded-full flex items-center justify-center mr-3">
                    <Phone className="w-4 h-4 text-[#FF6D70]" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">응급 의료 서비스</p>
                    <p className="text-white/80 text-xs">119</p>
                  </div>
                </div>
                <button className="bg-white/30 rounded-full w-8 h-8 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-white" />
                </button>
              </div>
              <div className="flex items-center justify-between bg-white/20 rounded-lg p-3">
                <div className="flex items-center">
                  <div className="bg-white w-8 h-8 rounded-full flex items-center justify-center mr-3">
                    <Hospital className="w-4 h-4 text-[#FF6D70]" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">가까운 병원</p>
                    <p className="text-white/80 text-xs">서울대학교병원 응급실</p>
                  </div>
                </div>
                <button className="bg-white/30 rounded-full w-8 h-8 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-white" />
                </button>
              </div>
              <div className="flex items-center justify-between bg-white/20 rounded-lg p-3">
                <div className="flex items-center">
                  <div className="bg-white w-8 h-8 rounded-full flex items-center justify-center mr-3">
                    <User className="w-4 h-4 text-[#FF6D70]" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">주치의</p>
                    <p className="text-white/80 text-xs">김영수 교수</p>
                  </div>
                </div>
                <button className="bg-white/30 rounded-full w-8 h-8 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </div>
        </TabsContent>
        
        {/* 자주 묻는 질문 탭 */}
        <TabsContent value="faq" className="mt-4">
          <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
            <div className="flex items-center mb-3">
              <Info className="w-5 h-5 mr-2 text-[#FF6D70]" />
              <h2 className="text-lg font-bold text-gray-800">자주 묻는 질문</h2>
            </div>
            <p className="text-gray-700 text-sm mb-3">
              심장 건강에 관한 일반적인 질문들과 전문가의 답변을 확인하세요.
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            {filteredFaqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`faq-${index}`}
                className="bg-white rounded-xl shadow-sm border-none"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center">
                    <div className="bg-[#FFE2E9] p-2 rounded-full mr-3">
                      <Info className="w-4 h-4 text-[#FF6D70]" />
                    </div>
                    <span className="font-medium text-gray-800 text-left">{faq.question}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <p className="text-sm text-gray-700">{faq.answer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="bg-white rounded-xl p-4 shadow-sm mt-4">
            <div className="flex items-center mb-3">
              <BookOpen className="w-5 h-5 mr-2 text-[#FF6D70]" />
              <h2 className="text-lg font-bold text-gray-800">추천 건강 정보 자료</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center">
                <div className="bg-[#FFE2E9] p-2 rounded-full mr-3">
                  <BookOpen className="w-4 h-4 text-[#FF6D70]" />
                </div>
                <div className="flex-grow">
                  <h4 className="font-medium text-gray-800">대한심장학회</h4>
                  <p className="text-xs text-gray-500">심장 질환에 관한 신뢰할 수 있는 정보</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex items-center">
                <div className="bg-[#FFE2E9] p-2 rounded-full mr-3">
                  <BookOpen className="w-4 h-4 text-[#FF6D70]" />
                </div>
                <div className="flex-grow">
                  <h4 className="font-medium text-gray-800">미국심장협회(AHA)</h4>
                  <p className="text-xs text-gray-500">최신 심장 건강 연구 및 가이드라인</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex items-center">
                <div className="bg-[#FFE2E9] p-2 rounded-full mr-3">
                  <BookOpen className="w-4 h-4 text-[#FF6D70]" />
                </div>
                <div className="flex-grow">
                  <h4 className="font-medium text-gray-800">식품의약품안전처</h4>
                  <p className="text-xs text-gray-500">심장 건강 관련 약물 정보</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>
        </TabsContent>
        
        {/* 병원 정보 탭 */}
        <TabsContent value="hospitals" className="mt-4">
          <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
            <div className="flex items-center mb-3">
              <Hospital className="w-5 h-5 mr-2 text-[#FF6D70]" />
              <h2 className="text-lg font-bold text-gray-800">가까운 심장 전문 병원</h2>
            </div>
            <p className="text-gray-700 text-sm mb-3">
              현재 위치 기준으로 가까운 심장 전문 병원 정보입니다. 전문 분야와 연락처를 확인하세요.
            </p>
          </div>

          <div className="space-y-4">
            {filteredHospitals.map((hospital, index) => (
              <Card key={index} className="rounded-xl shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{hospital.name}</CardTitle>
                      <CardDescription className="flex items-center mt-1">
                        <MapPin className="w-3 h-3 mr-1" />
                        {hospital.address}
                      </CardDescription>
                    </div>
                    <div className="bg-[#FFE2E9] text-[#FF6D70] text-xs px-2 py-1 rounded-full flex items-center">
                      <MapPin className="w-3 h-3 mr-1" />
                      {hospital.distance}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-2">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">전문 분야:</h4>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {hospital.specialties.map((specialty, specialtyIndex) => (
                      <span key={specialtyIndex} className="bg-gray-100 text-gray-700 rounded-full px-2 py-0.5 text-xs">
                        {specialty}
                      </span>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between pt-0">
                  <div className="text-sm text-gray-500">
                    <Phone className="w-3 h-3 inline mr-1" />
                    {hospital.contact}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="text-xs h-8">
                      예약하기
                    </Button>
                    <Button size="sm" className="text-xs h-8 bg-[#FF6D70] hover:bg-[#FF6D70]/90">
                      길찾기
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800">지도에서 보기</h3>
              <Button variant="outline" size="sm" className="text-[#FF6D70]">
                전체보기
              </Button>
            </div>
            <div className="rounded-lg bg-gray-200 w-full h-40 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-gray-400 mr-2" />
              <span className="text-gray-500">지도를 불러오는 중...</span>
            </div>
          </div>
        </TabsContent>
        
        {/* 의사 정보 탭 */}
        <TabsContent value="doctors" className="mt-4">
          <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
            <div className="flex items-center mb-3">
              <User className="w-5 h-5 mr-2 text-[#FF6D70]" />
              <h2 className="text-lg font-bold text-gray-800">심장 전문의 정보</h2>
            </div>
            <p className="text-gray-700 text-sm mb-3">
              각 분야별 심장 전문의 정보입니다. 전문 분야와 진료 가능 시간을 확인하세요.
            </p>
          </div>

          <div className="space-y-4">
            {filteredDoctors.map((doctor, index) => (
              <Card key={index} className="rounded-xl shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <div className="bg-[#FFE2E9] p-3 rounded-full">
                      <User className="w-5 h-5 text-[#FF6D70]" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{doctor.name}</CardTitle>
                      <CardDescription>{doctor.hospital}</CardDescription>
                      <div className="text-xs text-gray-500 mt-1">{doctor.experience}</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-2">
                  <h4 className="text-sm font-medium text-gray-700 mt-2 mb-1">전문 분야:</h4>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {doctor.specialties.map((specialty, specialtyIndex) => (
                      <span key={specialtyIndex} className="bg-gray-100 text-gray-700 rounded-full px-2 py-0.5 text-xs">
                        {specialty}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center mt-2">
                    <Clock className="w-3 h-3 text-gray-500 mr-1" />
                    <span className="text-xs text-gray-500">진료 시간: {doctor.availability}</span>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end pt-0">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="text-xs h-8">
                      정보 더보기
                    </Button>
                    <Button size="sm" className="text-xs h-8 bg-[#FF6D70] hover:bg-[#FF6D70]/90">
                      예약하기
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm mt-4">
            <div className="flex items-center mb-3">
              <Info className="w-5 h-5 mr-2 text-[#FF6D70]" />
              <h3 className="font-bold text-gray-800">진료 예약 안내</h3>
            </div>
            <p className="text-sm text-gray-700 mb-3">
              심장 전문의 진료는 사전 예약을 권장합니다. 응급 상황이 아닌 경우, 아래 방법으로 예약하실 수 있습니다.
            </p>
            <div className="space-y-2">
              <div className="flex">
                <div className="bg-[#FFE2E9] text-[#FF6D70] w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 flex-shrink-0 mt-0.5">
                  1
                </div>
                <span className="text-sm text-gray-700">
                  앱 내에서 '예약하기' 버튼을 통해 예약
                </span>
              </div>
              <div className="flex">
                <div className="bg-[#FFE2E9] text-[#FF6D70] w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 flex-shrink-0 mt-0.5">
                  2
                </div>
                <span className="text-sm text-gray-700">
                  각 병원 홈페이지를 통한 온라인 예약
                </span>
              </div>
              <div className="flex">
                <div className="bg-[#FFE2E9] text-[#FF6D70] w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 flex-shrink-0 mt-0.5">
                  3
                </div>
                <span className="text-sm text-gray-700">
                  병원 예약 전화 (병원별 연락처 확인)
                </span>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UsefulInfo;