import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Heart, ActivitySquare, Utensils, Cigarette, Clock, 
  Zap, Salad, Timer, Dumbbell, Waves, HeartPulse 
} from "lucide-react";

interface RecommendationItem {
  icon: React.ReactNode;
  title: string;
  description: string;
  iconDescription?: string;
  frequency?: string;
  duration?: string;
  method?: string;
}

interface RiskRecommendationsProps {
  riskLevel: number;
}

export default function RiskRecommendations({ riskLevel }: RiskRecommendationsProps) {
  const getRecommendations = (): RecommendationItem[] => {
    if (riskLevel < 25) {
      return [
        {
          icon: <ActivitySquare className="h-5 w-5 text-green-500" />,
          title: "현재 건강 상태 유지",
          description: "주 3회 이상 운동을 통해 현재의 건강 상태를 유지하세요.",
          frequency: "주 3회",
          duration: "30분 이상",
          method: "유산소 운동"
        },
        {
          icon: <Heart className="h-5 w-5 text-green-500" />,
          title: "정기 검진",
          description: "연 1회 정기적인 건강 검진을 통해 건강 상태를 확인하세요.",
          frequency: "연 1회",
          method: "종합 검진"
        },
        {
          icon: <Utensils className="h-5 w-5 text-green-500" />,
          title: "균형 잡힌 식단",
          description: "다양한 영양소를 섭취할 수 있는 균형 잡힌 식단을 유지하세요.",
          method: "골고루 섭취"
        }
      ];
    } else if (riskLevel < 50) {
      return [
        {
          icon: <ActivitySquare className="h-5 w-5 text-blue-500" />,
          title: "규칙적인 운동",
          description: "심박수를 높이는 유산소 운동을 주 3~4회, 회당 30분 이상 실시하세요.",
          frequency: "주 3-4회",
          duration: "30분 이상",
          method: "유산소 운동"
        },
        {
          icon: <Utensils className="h-5 w-5 text-blue-500" />,
          title: "식이 조절",
          description: "염분과 트랜스지방 섭취를 줄이고, 과일과 채소 섭취를 늘리세요.",
          method: "저염식"
        },
        {
          icon: <Clock className="h-5 w-5 text-blue-500" />,
          title: "수면 관리",
          description: "매일 7~8시간의 규칙적인 수면을 유지하세요.",
          duration: "7-8시간",
          frequency: "매일"
        },
        {
          icon: <Cigarette className="h-5 w-5 text-blue-500" />,
          title: "금연 권장",
          description: "흡연은 심혈관 질환 위험을 크게 증가시킵니다. 금연을 고려하세요.",
          method: "완전 금연"
        }
      ];
    } else if (riskLevel < 75) {
      return [
        {
          icon: <ActivitySquare className="h-5 w-5 text-orange-500" />,
          title: "맞춤형 운동 프로그램",
          description: "의사와 상담하여 맞춤형 운동 프로그램을 시작하세요. 주 4~5회, 회당 30분 이상 실시하는 것이 좋습니다.",
          frequency: "주 4-5회",
          duration: "30분 이상",
          method: "유산소 운동"
        },
        {
          icon: <Utensils className="h-5 w-5 text-orange-500" />,
          title: "DASH 식단 고려",
          description: "고혈압 예방을 위한 DASH 식단을 고려하세요. 저염, 저지방, 고식이섬유 식단이 심혈관 건강에 도움이 됩니다.",
          method: "DASH 식단"
        },
        {
          icon: <Zap className="h-5 w-5 text-orange-500" />,
          title: "스트레스 관리",
          description: "규칙적인 명상, 요가, 또는 가벼운 활동으로 스트레스를 관리하세요.",
          frequency: "매일",
          duration: "15분 이상",
          method: "명상/요가"
        },
        {
          icon: <Heart className="h-5 w-5 text-orange-500" />,
          title: "정기적 모니터링",
          description: "혈압과 콜레스테롤 수치를 정기적으로 확인하고, 6개월마다 의사를 방문하세요.",
          frequency: "6개월마다",
          method: "건강 검진"
        }
      ];
    } else {
      return [
        {
          icon: <Heart className="h-5 w-5 text-red-500" />,
          title: "의료 전문가와 상담",
          description: "즉시 의료 전문가와 상담하고 개인화된 치료 계획을 수립하세요.",
          frequency: "즉시",
          method: "의사 상담"
        },
        {
          icon: <ActivitySquare className="h-5 w-5 text-red-500" />,
          title: "감독 하에 운동",
          description: "의료 전문가의 감독 하에 심장에 부담이 적은 가벼운 운동을 시작하세요.",
          frequency: "의사 지시에 따라",
          duration: "짧게 시작",
          method: "가벼운 운동"
        },
        {
          icon: <Utensils className="h-5 w-5 text-red-500" />,
          title: "엄격한 식이 조절",
          description: "염분, 포화지방, 콜레스테롤 섭취를 크게 제한하고, 혈당 조절을 위해 정제된 탄수화물 섭취를 줄이세요.",
          method: "저염/저지방"
        },
        {
          icon: <Zap className="h-5 w-5 text-red-500" />,
          title: "약물 치료 준수",
          description: "처방된 약물을 의사의 지시대로 정확히 복용하세요.",
          frequency: "매일",
          method: "처방대로 복용"
        },
        {
          icon: <Clock className="h-5 w-5 text-red-500" />,
          title: "생활 습관 개선",
          description: "알코올 섭취 제한, 금연, 규칙적인 수면으로 생활 습관을 개선하세요.",
          method: "종합 개선"
        }
      ];
    }
  };

  const recommendations = getRecommendations();

  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="text-lg font-semibold mb-4">위험도 감소를 위한 권장사항</h3>
        
        <div className="space-y-4">
          {recommendations.map((recommendation, index) => (
            <div key={index} className="flex items-start">
              <div className="mr-3 mt-0.5">{recommendation.icon}</div>
              <div className="flex-1">
                <h4 className="font-medium text-base">{recommendation.title}</h4>
                <p className="text-sm text-gray-600 mb-2">{recommendation.description}</p>
                
                {/* 아이콘 기반 권장사항 시각화 */}
                {(recommendation.frequency || recommendation.duration || recommendation.method) && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {recommendation.frequency && (
                      <div className="flex items-center bg-primary/10 px-2 py-1 rounded-md text-xs">
                        <Timer className="h-3.5 w-3.5 mr-1 text-primary" />
                        <span>{recommendation.frequency}</span>
                      </div>
                    )}
                    
                    {recommendation.duration && (
                      <div className="flex items-center bg-primary/10 px-2 py-1 rounded-md text-xs">
                        <Clock className="h-3.5 w-3.5 mr-1 text-primary" />
                        <span>{recommendation.duration}</span>
                      </div>
                    )}
                    
                    {recommendation.method && (
                      <div className="flex items-center bg-primary/10 px-2 py-1 rounded-md text-xs">
                        {recommendation.method.includes("유산소") ? (
                          <Waves className="h-3.5 w-3.5 mr-1 text-primary" />
                        ) : recommendation.method.includes("식단") || recommendation.method.includes("저염") ? (
                          <Salad className="h-3.5 w-3.5 mr-1 text-primary" />
                        ) : recommendation.method.includes("검진") ? (
                          <HeartPulse className="h-3.5 w-3.5 mr-1 text-primary" />
                        ) : recommendation.method.includes("운동") ? (
                          <Dumbbell className="h-3.5 w-3.5 mr-1 text-primary" />
                        ) : (
                          <Zap className="h-3.5 w-3.5 mr-1 text-primary" />
                        )}
                        <span>{recommendation.method}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}