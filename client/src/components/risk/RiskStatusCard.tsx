import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, AlertCircle, Shield, CheckCircle, RefreshCw, Heart } from 'lucide-react';

interface RiskStatusCardProps {
  riskScore: number;
  riskStatus: 'normal' | 'warning' | 'critical';
  explanations: string[];
  recommendations: string[];
  onRefresh?: () => void;
}

const RiskStatusCard: React.FC<RiskStatusCardProps> = ({
  riskScore,
  riskStatus,
  explanations,
  recommendations,
  onRefresh
}) => {
  // 위험도에 따른 색상 설정
  const getStatusColor = () => {
    switch (riskStatus) {
      case 'critical':
        return 'bg-red-500';
      case 'warning':
        return 'bg-amber-500';
      case 'normal':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  // 위험도에 따른 아이콘 설정
  const getStatusIcon = () => {
    switch (riskStatus) {
      case 'critical':
        return <AlertCircle className="h-10 w-10 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-10 w-10 text-amber-500" />;
      case 'normal':
        return <CheckCircle className="h-10 w-10 text-green-500" />;
      default:
        return <Shield className="h-10 w-10 text-gray-500" />;
    }
  };

  // 위험도에 따른 메시지 설정
  const getStatusMessage = () => {
    switch (riskStatus) {
      case 'critical':
        return '즉각적인 조치가 필요합니다.';
      case 'warning':
        return '주의가 필요한 상태입니다.';
      case 'normal':
        return '정상 범위 내에 있습니다.';
      default:
        return '위험도를 분석 중입니다.';
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-semibold flex items-center">
              <Heart className="h-5 w-5 mr-2 text-red-500" />
              종합 위험도 분석
            </CardTitle>
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4 mr-1" />
                갱신
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
            <div className="flex flex-col items-center">
              {getStatusIcon()}
              <Badge 
                className="mt-2"
                variant={
                  riskStatus === 'critical' ? "destructive" : 
                  riskStatus === 'warning' ? "default" : "outline"
                }
              >
                {riskStatus === 'critical' ? '위험' : riskStatus === 'warning' ? '주의' : '정상'}
              </Badge>
            </div>
            
            <div className="flex-1">
              <div className="mb-2">
                <div className="flex justify-between text-sm mb-1">
                  <span>안전</span>
                  <span>주의</span>
                  <span>위험</span>
                </div>
                <Progress value={riskScore} className="h-2" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-3xl font-bold">{riskScore}</span>
                <span className="text-sm text-gray-500">/ 100</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{getStatusMessage()}</p>
            </div>
          </div>
          
          {explanations.length > 0 && (
            <div className="mb-4">
              <h3 className="text-md font-medium mb-2 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1 text-red-500" />
                위험 요소
              </h3>
              <ul className="list-disc list-inside text-sm space-y-1 pl-2">
                {explanations.map((explanation, index) => (
                  <li key={index} className="text-gray-700">{explanation}</li>
                ))}
              </ul>
            </div>
          )}
          
          {recommendations.length > 0 && (
            <div>
              <h3 className="text-md font-medium mb-2 flex items-center">
                <Shield className="h-4 w-4 mr-1 text-blue-500" />
                권장 사항
              </h3>
              <ul className="list-disc list-inside text-sm space-y-1 pl-2">
                {recommendations.map((recommendation, index) => (
                  <li key={index} className="text-gray-700">{recommendation}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-2 text-xs text-gray-500 border-t flex justify-between">
          <span>마지막 업데이트: {new Date().toLocaleString()}</span>
          {riskStatus === 'critical' && (
            <Badge variant="destructive" className="animate-pulse">긴급</Badge>
          )}
        </CardFooter>
      </Card>
      
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-md font-medium">위험도 범주별 상세 분석</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">심혈관</span>
                <span className="text-sm text-gray-500">{Math.round(riskScore * 0.7)}%</span>
              </div>
              <Progress value={riskScore * 0.7} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">호흡기</span>
                <span className="text-sm text-gray-500">{Math.round(riskScore * 0.5)}%</span>
              </div>
              <Progress value={riskScore * 0.5} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">신경계</span>
                <span className="text-sm text-gray-500">{Math.round(riskScore * 0.3)}%</span>
              </div>
              <Progress value={riskScore * 0.3} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RiskStatusCard;
