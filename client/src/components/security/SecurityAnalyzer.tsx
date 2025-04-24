import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Loader2, ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';

/**
 * 보안 분석 결과 인터페이스
 */
interface SecurityAnalysisResult {
  timestamp: string;
  sourceLanguage: string;
  analysisResults: string;
  vulnerabilities: Vulnerability[];
  overallScore: number;
  recommendations: string[];
}

/**
 * 취약점 인터페이스
 */
interface Vulnerability {
  category: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  score: number;
}

/**
 * 보안 분석기 컴포넌트
 */
export default function SecurityAnalyzer() {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SecurityAnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState('code');

  /**
   * 코드 분석 요청 핸들러
   */
  const handleAnalyzeCode = async () => {
    if (!code.trim()) {
      setError('분석할 코드를 입력해주세요.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/security/analyze/code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sourceCode: code, language }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '분석 중 오류가 발생했습니다.');
      }

      setResult(data.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * 위험도에 따른 배지 색상 반환
   */
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'warning';
      case 'low':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  /**
   * 위험도에 따른 아이콘 반환
   */
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <ShieldAlert className="h-4 w-4 mr-1" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4 mr-1" />;
      case 'low':
        return <ShieldCheck className="h-4 w-4 mr-1" />;
      default:
        return <ShieldCheck className="h-4 w-4 mr-1" />;
    }
  };

  /**
   * 종합 점수에 따른 색상 반환
   */
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-red-500';
    if (score >= 4) return 'text-amber-500';
    return 'text-green-500';
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>AI 보안 취약점 분석</CardTitle>
          <CardDescription>
            소스 코드를 분석하여 보안 취약점을 찾고 개선 방안을 제시합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="code">코드 분석</TabsTrigger>
              <TabsTrigger value="network">네트워크 분석</TabsTrigger>
              <TabsTrigger value="behavior">행동 분석</TabsTrigger>
            </TabsList>

            <TabsContent value="code">
              <div className="space-y-4">
                <div className="flex gap-4 items-center">
                  <div className="w-full">
                    <Textarea
                      placeholder="분석할 코드를 입력하세요..."
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="min-h-[200px] font-mono"
                    />
                  </div>
                  <div className="w-[200px] flex flex-col gap-4">
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger>
                        <SelectValue placeholder="언어 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="javascript">JavaScript</SelectItem>
                        <SelectItem value="typescript">TypeScript</SelectItem>
                        <SelectItem value="python">Python</SelectItem>
                        <SelectItem value="java">Java</SelectItem>
                        <SelectItem value="csharp">C#</SelectItem>
                        <SelectItem value="php">PHP</SelectItem>
                        <SelectItem value="go">Go</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={handleAnalyzeCode} disabled={isAnalyzing || !code.trim()}>
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          분석 중...
                        </>
                      ) : (
                        '코드 분석'
                      )}
                    </Button>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertTitle>오류 발생</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {result && (
                  <div className="mt-6 space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xl font-semibold">분석 결과</h3>
                      <Badge className={getScoreColor(result.overallScore)}>
                        종합 점수: {result.overallScore}/10
                      </Badge>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold">발견된 취약점</h4>
                      {result.vulnerabilities.length > 0 ? (
                        <div className="space-y-3">
                          {result.vulnerabilities.map((vuln, index) => (
                            <div key={index} className="border rounded-lg p-4">
                              <div className="flex justify-between items-center mb-2">
                                <h5 className="font-medium">{vuln.category}</h5>
                                <Badge variant={getSeverityColor(vuln.severity) as any}>
                                  {getSeverityIcon(vuln.severity)}
                                  {vuln.severity} ({vuln.score}/10)
                                </Badge>
                              </div>
                              <p className="text-sm">{vuln.description}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>취약점이 발견되지 않았습니다.</p>
                      )}
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold">개선 권장사항</h4>
                      {result.recommendations.length > 0 ? (
                        <ul className="list-disc pl-5 space-y-2">
                          {result.recommendations.map((rec, index) => (
                            <li key={index}>{rec}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>개선 권장사항이 없습니다.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="network">
              <div className="p-4 border border-dashed rounded-lg flex items-center justify-center h-[200px]">
                <p className="text-muted-foreground">네트워크 분석 기능은 준비 중입니다...</p>
              </div>
            </TabsContent>

            <TabsContent value="behavior">
              <div className="p-4 border border-dashed rounded-lg flex items-center justify-center h-[200px]">
                <p className="text-muted-foreground">행동 분석 기능은 준비 중입니다...</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          <p className="text-sm text-muted-foreground">
            최종 업데이트: {result ? new Date(result.timestamp).toLocaleString() : '분석 전'}
          </p>
        </CardFooter>
      </Card>
    </div>
  );
} 