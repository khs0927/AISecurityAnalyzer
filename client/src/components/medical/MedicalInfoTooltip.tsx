import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, AlertTriangle, Pill, ChevronDown, ChevronUp } from "lucide-react";

interface MedicalInfoTooltipProps {
  children: React.ReactNode;
  type: "medication" | "condition";
  name: string;
}

// 약물 정보 데이터베이스 (실제로는 API로 가져올 수 있을 것)
const medicationInfo: Record<string, {
  purpose: string;
  heartRiskLevel: number;
  adverseEffects: string[];
  interactions: string[];
  dosage: string;
}> = {
  "아스피린": {
    purpose: "혈전 방지 및 심근경색 예방",
    heartRiskLevel: -3, // 음수는 위험 감소
    adverseEffects: ["위장 장애", "출혈 위험 증가"],
    interactions: ["항응고제", "이부프로펜"],
    dosage: "100mg 1일 1회",
  },
  "리피토": {
    purpose: "콜레스테롤 수치 감소 (스타틴계)",
    heartRiskLevel: -4,
    adverseEffects: ["근육통", "간 효소 수치 상승"],
    interactions: ["자몽 주스", "사이클로스포린"],
    dosage: "20mg 취침 전",
  },
  "메트포민": {
    purpose: "혈당 조절 (당뇨)",
    heartRiskLevel: -2, 
    adverseEffects: ["설사", "복통", "메스꺼움"],
    interactions: ["알코올", "요오드화 조영제"],
    dosage: "500mg 1일 2회",
  },
  "암로디핀": {
    purpose: "혈압 감소 (칼슘 채널 차단제)",
    heartRiskLevel: -3,
    adverseEffects: ["두통", "부종", "홍조"],
    interactions: ["자몽 주스", "심바스타틴"],
    dosage: "5mg 1일 1회",
  },
  "울트라셋": {
    purpose: "통증 완화 (진통제)",
    heartRiskLevel: 0,
    adverseEffects: ["현기증", "졸음", "구토"],
    interactions: ["알코올", "항우울제"],
    dosage: "통증 시 1정",
  },
};

// 질환 정보 데이터베이스
const conditionInfo: Record<string, {
  description: string;
  heartRiskLevel: number;
  symptoms: string[];
  relatedConditions: string[];
  management: string[];
}> = {
  "고혈압": {
    description: "동맥 내 혈압이 지속적으로 높은 상태",
    heartRiskLevel: 4, // 양수는 위험 증가
    symptoms: ["두통", "현기증", "코피"],
    relatedConditions: ["심근경색", "심부전", "뇌졸중"],
    management: ["저염식", "규칙적 운동", "금연"],
  },
  "당뇨": {
    description: "혈액 내 포도당 수치가 높은 대사 질환",
    heartRiskLevel: 3,
    symptoms: ["갈증 증가", "빈뇨", "피로감"],
    relatedConditions: ["심혈관 질환", "신경 손상", "신장 질환"],
    management: ["혈당 모니터링", "탄수화물 제한", "운동"],
  },
  "고지혈증": {
    description: "혈액 내 지질(콜레스테롤, 중성지방) 수치가 높은 상태",
    heartRiskLevel: 3,
    symptoms: ["대부분 증상 없음", "황색종(피부 지방 침착)"],
    relatedConditions: ["관상동맥질환", "죽상동맥경화증"],
    management: ["지방 섭취 제한", "체중 관리", "규칙적 운동"],
  },
  "심방세동": {
    description: "불규칙한 심방 수축으로 인한 불규칙한 심장 박동",
    heartRiskLevel: 5,
    symptoms: ["심계항진", "호흡곤란", "피로감", "현기증"],
    relatedConditions: ["뇌졸중", "심부전"],
    management: ["항응고제", "심박수 조절", "생활습관 개선"],
  },
};

const MedicalInfoTooltip: React.FC<MedicalInfoTooltipProps> = ({ children, type, name }) => {
  const info = type === "medication" ? medicationInfo[name] : conditionInfo[name];
  
  if (!info) {
    return <>{children}</>;
  }
  
  const heartRiskLevel = info.heartRiskLevel;
  const isRiskReducing = heartRiskLevel < 0;
  
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent className="w-80 p-0 shadow-lg" side="top">
          <Card className="border-0 shadow-none">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg">{name}</h3>
                  <Badge 
                    className={`${isRiskReducing ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                  >
                    {isRiskReducing ? (
                      <div className="flex items-center">
                        <Heart className="h-3 w-3 mr-1" />
                        <span>심근경색 위험 감소</span>
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        <span>심근경색 위험 증가</span>
                        <ChevronUp className="h-3 w-3 ml-1" />
                      </div>
                    )}
                  </Badge>
                </div>
                
                {type === "medication" && (
                  <>
                    <div>
                      <h4 className="font-medium text-sm text-gray-500">용도</h4>
                      <p className="text-sm">{(info as typeof medicationInfo["아스피린"]).purpose}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-gray-500">부작용</h4>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(info as typeof medicationInfo["아스피린"]).adverseEffects.map((effect, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">{effect}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-gray-500">상호작용 주의</h4>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(info as typeof medicationInfo["아스피린"]).interactions.map((item, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs bg-yellow-50">{item}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-gray-500">일반 용량</h4>
                      <p className="text-sm">{(info as typeof medicationInfo["아스피린"]).dosage}</p>
                    </div>
                  </>
                )}
                
                {type === "condition" && (
                  <>
                    <div>
                      <h4 className="font-medium text-sm text-gray-500">설명</h4>
                      <p className="text-sm">{(info as typeof conditionInfo["고혈압"]).description}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-gray-500">증상</h4>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(info as typeof conditionInfo["고혈압"]).symptoms.map((symptom, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">{symptom}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-gray-500">연관 질환</h4>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(info as typeof conditionInfo["고혈압"]).relatedConditions.map((condition, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs bg-red-50">{condition}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-gray-500">관리 방법</h4>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(info as typeof conditionInfo["고혈압"]).management.map((item, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs bg-blue-50">{item}</Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default MedicalInfoTooltip;