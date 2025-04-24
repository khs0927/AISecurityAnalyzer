import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowUpRight, Activity, Heart, AlertCircle } from "lucide-react";

type RiskFactor = {
  factor: string;
  contribution: number;
  description: string;
};

type RiskAnalysisProps = {
  riskScore: number;
  riskFactors: RiskFactor[];
  suggestions: string[];
  healthData?: {
    heartRate?: number;
    oxygenLevel?: number;
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    temperature?: number;
  };
  trigger: React.ReactNode;
};

export default function RiskDetailsDialog({
  riskScore,
  riskFactors,
  suggestions,
  healthData,
  trigger
}: RiskAnalysisProps) {
  const getRiskColor = (score: number) => {
    if (score < 25) return "bg-green-500";
    if (score < 50) return "bg-yellow-500";
    if (score < 75) return "bg-orange-500";
    return "bg-red-500";
  };

  const getRiskTextColor = (score: number) => {
    if (score < 25) return "text-green-600";
    if (score < 50) return "text-yellow-600";
    if (score < 75) return "text-orange-600";
    return "text-red-600";
  };

  const getRiskBgColor = (score: number) => {
    if (score < 25) return "bg-green-50";
    if (score < 50) return "bg-yellow-50";
    if (score < 75) return "bg-orange-50";
    return "bg-red-50";
  };

  const getRiskStatus = (score: number) => {
    if (score < 25) return "낮음";
    if (score < 50) return "주의";
    if (score < 75) return "높음";
    return "위험";
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span>심근경색 위험 분석</span>
            <div className={`px-3 py-1 text-sm font-medium rounded-full ${getRiskBgColor(riskScore)} ${getRiskTextColor(riskScore)}`}>
              {getRiskStatus(riskScore)}
            </div>
          </DialogTitle>
          <DialogDescription>
            멀티모달 심근경색 위험 모델 (MCP) 분석 결과
          </DialogDescription>
        </DialogHeader>

        {/* 종합 위험도 */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium">종합 위험도</h3>
            <span className={`text-lg font-bold ${getRiskTextColor(riskScore)}`}>{riskScore}%</span>
          </div>
          <Progress 
            value={riskScore} 
            className={`h-3 ${getRiskColor(riskScore)}`}
          />
        </div>

        {/* 현재 바이탈 정보 */}
        {healthData && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-3">현재 바이탈 정보</h3>
            <div className="grid grid-cols-2 gap-3">
              {healthData.heartRate && (
                <div className="flex items-center bg-gray-50 p-2 rounded-lg">
                  <Heart className="h-4 w-4 text-red-500 mr-2" />
                  <div>
                    <div className="text-xs text-gray-500">심박수</div>
                    <div className="text-sm font-medium">{healthData.heartRate} bpm</div>
                  </div>
                </div>
              )}
              {healthData.bloodPressureSystolic && healthData.bloodPressureDiastolic && (
                <div className="flex items-center bg-gray-50 p-2 rounded-lg">
                  <Activity className="h-4 w-4 text-purple-500 mr-2" />
                  <div>
                    <div className="text-xs text-gray-500">혈압</div>
                    <div className="text-sm font-medium">{healthData.bloodPressureSystolic}/{healthData.bloodPressureDiastolic}</div>
                  </div>
                </div>
              )}
              {healthData.oxygenLevel && (
                <div className="flex items-center bg-gray-50 p-2 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <div className="text-xs text-gray-500">산소포화도</div>
                    <div className="text-sm font-medium">{healthData.oxygenLevel}%</div>
                  </div>
                </div>
              )}
              {healthData.temperature && (
                <div className="flex items-center bg-gray-50 p-2 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <div className="text-xs text-gray-500">체온</div>
                    <div className="text-sm font-medium">{healthData.temperature}°C</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 위험 요인 분석 */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-3">위험 요인 분석</h3>
          <div className="space-y-3">
            {riskFactors.map((factor, index) => (
              <div key={index} className="border border-gray-100 rounded-lg overflow-hidden">
                <div className="flex justify-between items-center p-3">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${getRiskBgColor(factor.contribution)}`}>
                      <span className={`text-xs font-bold ${getRiskTextColor(factor.contribution)}`}>
                        {Math.round(factor.contribution)}%
                      </span>
                    </div>
                    <span className="font-medium">{factor.factor}</span>
                  </div>
                </div>
                <div className="p-3 pt-0 text-sm text-gray-600">
                  {factor.description}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 권장 사항 */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-3">권장 사항</h3>
          <ul className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>

        {riskScore >= 50 && (
          <div className={`p-4 rounded-lg ${getRiskBgColor(riskScore)} mb-4`}>
            <div className="flex items-start">
              <AlertCircle className={`h-5 w-5 ${getRiskTextColor(riskScore)} mr-2 mt-0.5`} />
              <div>
                <h4 className={`font-medium ${getRiskTextColor(riskScore)}`}>주의 필요</h4>
                <p className="text-sm mt-1">
                  위험도가 높은 상태입니다. 의료 전문가와 상담하고 정기적인 검진을 받는 것이 좋습니다.
                </p>
              </div>
            </div>
          </div>
        )}

        <Button className="w-full">
          주치의와 결과 공유 <ArrowUpRight className="ml-2 h-4 w-4" />
        </Button>
      </DialogContent>
    </Dialog>
  );
}