import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, BarChart, Heart, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MultimodalAnalysisCardProps {
  ecgData: number[];
  heartRates: number[];
  oxygenLevels: number[];
  lastUpdated: Date | null;
  riskScore: number;
  stDeviation: number;
  arrhythmia: {
    detected: boolean;
    type: string | null;
  };
}

const MultimodalAnalysisCard: React.FC<MultimodalAnalysisCardProps> = ({
  ecgData,
  heartRates,
  oxygenLevels,
  lastUpdated,
  riskScore,
  stDeviation,
  arrhythmia
}) => {
  const { toast } = useToast();
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysisComplete, setAnalysisComplete] = useState<boolean>(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  // ECG 데이터 유효성 확인
  const hasValidData = ecgData.length > 0 && heartRates.length > 0;

  // 위험도 색상 결정
  const getRiskColor = (score: number) => {
    if (score < 20) return 'bg-green-500';
    if (score < 50) return 'bg-yellow-500';
    if (score < 75) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // 위험도 레이블 결정
  const getRiskLabel = (score: number) => {
    if (score < 20) return '정상';
    if (score < 50) return '주의';
    if (score < 75) return '경고';
    return '위험';
  };

  // AI 분석 수행
  const performAIAnalysis = async () => {
    if (!hasValidData) {
      toast({
        title: "데이터 부족",
        description: "분석을 위한 충분한 데이터가 없습니다. 더 많은 데이터를 수집하세요.",
        variant: "destructive"
      });
      return;
    }

    setAnalyzing(true);
    
    try {
      // 실제로는 AI 서비스 API를 호출하여 분석 결과를 가져옴
      // 여기서는 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 2500));

      // 분석 결과 예시
      let insight = "심전도와 심박수 패턴 분석 결과, ";
      
      if (arrhythmia.detected) {
        insight += `${arrhythmia.type}이(가) 감지되었습니다. `;
      } else {
        insight += "심장 리듬은 정상적입니다. ";
      }

      if (stDeviation > 0.1) {
        insight += "ST 세그먼트 편향이 관찰되어 심장 근육의 산소 공급 상태를 추적 관찰할 필요가 있습니다. ";
      }

      const avgHeartRate = heartRates.reduce((a, b) => a + b, 0) / heartRates.length;
      const avgOxygenLevel = oxygenLevels.reduce((a, b) => a + b, 0) / oxygenLevels.length;

      insight += `평균 심박수는 ${Math.round(avgHeartRate)}bpm, 평균 산소포화도는 ${Math.round(avgOxygenLevel)}%입니다. `;
      
      if (riskScore > 50) {
        insight += "현재 종합 위험도가 높습니다. 충분한 휴식을 취하고 필요시 의료 전문가와 상담하세요.";
      } else {
        insight += "종합적으로 활력징후는 양호한 상태입니다.";
      }

      setAiInsight(insight);
      setAnalysisComplete(true);

      toast({
        title: "AI 분석 완료",
        description: "심전도 및 산소포화도 분석이 완료되었습니다.",
      });
    } catch (error) {
      console.error("AI 분석 중 오류 발생:", error);
      toast({
        title: "분석 실패",
        description: "AI 분석 중 문제가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Card className="border border-[#FFD6D6] rounded-2xl shadow-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-[#FFF5F5] to-white pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium flex items-center">
            <Activity className="w-5 h-5 mr-2 text-[#FF0000]" />
            멀티모달 AI 모니터링
          </CardTitle>
          {lastUpdated && (
            <Badge variant="outline" className="text-xs font-normal">
              {`${Math.floor((Date.now() - lastUpdated.getTime()) / 1000)}초 전 갱신`}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4 pb-2">
        {!hasValidData ? (
          <div className="text-center py-6">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-500">
              분석을 위한 충분한 데이터가 없습니다. <br />
              스마트워치를 연결하고 더 많은 데이터를 수집하세요.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <div className="text-sm font-medium">심장 위험도 지수</div>
                  <div className="text-sm font-medium">{riskScore}%</div>
                </div>
                <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`absolute top-0 left-0 h-full ${getRiskColor(riskScore)}`} 
                    style={{ width: `${riskScore}%` }}
                  ></div>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-500">정상</span>
                  <Badge 
                    className={`${getRiskColor(riskScore)} text-white px-2 py-0 h-5`}
                  >
                    {getRiskLabel(riskScore)}
                  </Badge>
                  <span className="text-xs text-gray-500">위험</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex items-center space-x-2 mb-1">
                    <Heart className="w-4 h-4 text-[#FF0000]" />
                    <span className="text-sm font-medium">심장 리듬</span>
                  </div>
                  <div className="flex items-center">
                    <Badge 
                      className={arrhythmia.detected ? 'bg-orange-500' : 'bg-green-500'} 
                    >
                      {arrhythmia.detected ? '이상 감지' : '정상'}
                    </Badge>
                    {arrhythmia.detected && (
                      <span className="text-xs ml-2 text-gray-600">
                        {arrhythmia.type}
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex items-center space-x-2 mb-1">
                    <BarChart className="w-4 h-4 text-[#FF0000]" />
                    <span className="text-sm font-medium">ST 편향</span>
                  </div>
                  <div className="flex items-center">
                    <Badge 
                      className={stDeviation > 0.1 ? 'bg-yellow-500' : 'bg-green-500'} 
                    >
                      {stDeviation > 0.1 ? '편향 있음' : '정상'}
                    </Badge>
                    <span className="text-xs ml-2 text-gray-600">
                      {stDeviation.toFixed(2)} mV
                    </span>
                  </div>
                </div>
              </div>

              {analysisComplete && aiInsight && (
                <div className="bg-[#FFF5F5] p-3 rounded-md">
                  <div className="text-sm font-medium mb-1">AI 분석 결과</div>
                  <p className="text-sm text-gray-600">{aiInsight}</p>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="pt-0 pb-4">
        <Button 
          onClick={performAIAnalysis} 
          disabled={!hasValidData || analyzing}
          className="w-full bg-[#FF0000] hover:bg-[#CC0000] text-white"
        >
          {analyzing ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              분석 중...
            </>
          ) : (
            '멀티모달 AI 분석 시작'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MultimodalAnalysisCard;