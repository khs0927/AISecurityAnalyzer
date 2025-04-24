import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  User, 
  Bot, 
  Mic, 
  StopCircle, 
  Volume2, 
  Loader2,
  Activity,
  Brain,
  Heart,
  AlertCircle,
  CheckCircle2,
  RotateCw
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

// 메시지 타입 정의
interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  isProcessing?: boolean;
  healthData?: {
    heartRate?: number;
    oxygenLevel?: number;
    ecgData?: number[];
  };
  analysisId?: string;  // 정밀 분석 ID
  detailedAnalysisAvailable?: boolean;  // 정밀 분석 가능 여부
  hasDetailedResponse?: boolean;  // 정밀 분석 결과 포함 여부
  detailedContent?: string;  // 정밀 분석 결과 내용
  showDetailedContent?: boolean;  // 정밀 분석 결과 표시 여부
}

// 정밀 분석 상태 타입
interface AnalysisStatus {
  analysisId: string;
  status: 'in_progress' | 'completed' | 'error';
  responseType?: string;
  completedAt?: string;
  analysisTime?: number;
  message?: string;
}

// 정밀 분석 결과 타입
interface DetailedAnalysis {
  analysisId: string;
  aiResponse: string;
  pubmedReferences?: any[];
  responseType: string;
  completedAt: string;
  analysisTime: number;
  status: string;
}

const AIHealthChat: React.FC = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: '안녕하세요! 저는 QWEN2.5-MMed-Llama3 융합 AI입니다. 모든 의학 분야에 관련된 질문이나 증상에 대해 물어보세요. 심장, 소화기, 호흡기, 근골격계, 신경계 등 다양한 건강 주제에 대한 정보를 제공해 드릴 수 있습니다.',
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pendingAnalyses, setPendingAnalyses] = useState<Map<string, NodeJS.Timeout>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  
  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 사용자 질문 제출 처리
  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    
    // 고유 ID 생성
    const messageId = Date.now().toString();
    
    // 사용자 메시지 추가
    const userMessage: Message = {
      id: messageId,
      content: inputText,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    
    // AI 응답 처리 시작
    setIsResponding(true);
    
    // AI 프로세싱 표시 메시지 추가
    const processingMessage: Message = {
      id: `processing-${messageId}`,
      content: '',
      sender: 'ai',
      timestamp: new Date(),
      isProcessing: true
    };
    
    setMessages(prev => [...prev, processingMessage]);
    
    try {
      // 신체 데이터 생성 (실제 앱에서는 웨어러블 기기나 DB에서 가져와야 함)
      const healthData = {
        heartRate: Math.floor(Math.random() * 20) + 70, // 70-90 범위
        oxygenLevel: Math.floor(Math.random() * 5) + 95, // 95-99 범위
        ecgData: Array.from({ length: 40 }, () => Math.sin(Math.random() * Math.PI * 2) * 0.5 + Math.random() * 0.2)
      };
      
      // 이전 대화 기록 수집 (최대 10개)
      const recentMessages = messages
        .slice(-10)
        .map(msg => ({
          sender: msg.sender,
          content: msg.content
        }));
      
      // AI API 호출 (서버 측 API 사용)
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 1, // 현재 로그인된 사용자 ID (실제 구현에서는 상태에서 가져와야 함)
          message: inputText,
          context: JSON.stringify(recentMessages),
          category: "general", // 모든 의학 분야 질문 처리를 위해 general 카테고리로 설정
          healthData: healthData
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API 응답 오류: ${response.status}`);
      }
      
      const data = await response.json();
      
      // 모델 응답 생성
      let aiResponse: Message;
      
      // 건강 관련 키워드 체크 (대폭 확장)
      const isHealthRelated = 
        // 심혈관 관련
        inputText.toLowerCase().includes('심장') || 
        inputText.toLowerCase().includes('가슴') || 
        inputText.toLowerCase().includes('혈압') ||
        inputText.toLowerCase().includes('맥박') ||
        inputText.toLowerCase().includes('심박') ||
        // 호흡기 관련
        inputText.toLowerCase().includes('호흡') ||
        inputText.toLowerCase().includes('산소') ||
        inputText.toLowerCase().includes('폐') ||
        inputText.toLowerCase().includes('기침') ||
        inputText.toLowerCase().includes('천식') ||
        // 소화기 관련
        inputText.toLowerCase().includes('소화') ||
        inputText.toLowerCase().includes('위장') ||
        inputText.toLowerCase().includes('배가') ||
        inputText.toLowerCase().includes('구토') ||
        inputText.toLowerCase().includes('설사') ||
        inputText.toLowerCase().includes('변비') ||
        // 신경계 관련 
        inputText.toLowerCase().includes('두통') ||
        inputText.toLowerCase().includes('어지러') ||
        inputText.toLowerCase().includes('어지럼') ||
        inputText.toLowerCase().includes('현기증') ||
        inputText.toLowerCase().includes('발작') ||
        inputText.toLowerCase().includes('간질') ||
        // 근골격계 관련
        inputText.toLowerCase().includes('관절') ||
        inputText.toLowerCase().includes('근육') ||
        inputText.toLowerCase().includes('허리') ||
        inputText.toLowerCase().includes('척추') ||
        inputText.toLowerCase().includes('골절') ||
        // 피부 관련
        inputText.toLowerCase().includes('피부') ||
        inputText.toLowerCase().includes('발진') ||
        inputText.toLowerCase().includes('가려움') ||
        inputText.toLowerCase().includes('두드러기') ||
        // 일반적인 건강 용어
        inputText.toLowerCase().includes('통증') ||
        inputText.toLowerCase().includes('건강') ||
        inputText.toLowerCase().includes('질환') ||
        inputText.toLowerCase().includes('증상') ||
        inputText.toLowerCase().includes('질병') ||
        inputText.toLowerCase().includes('진단') ||
        inputText.toLowerCase().includes('치료') ||
        inputText.toLowerCase().includes('병원') ||
        inputText.toLowerCase().includes('의사') ||
        inputText.toLowerCase().includes('약');
      
      // 정밀 분석이 진행 중인지 확인 (analysisInProgress 필드 확인)
      const hasDetailedAnalysis = data.analysisInProgress === true && data.analysisId;
      
      if (isHealthRelated) {
        // 건강 데이터 포함 응답
        aiResponse = {
          id: `ai-${messageId}`,
          content: data.aiResponse || data.response || "죄송합니다. 지금은 이 질문에 답하기 어렵습니다.",
          sender: 'ai',
          timestamp: new Date(),
          healthData: healthData,
          analysisId: data.analysisId,
          detailedAnalysisAvailable: hasDetailedAnalysis
        };
        
        // 정밀 분석 ID가 있으면 폴링 시작
        if (hasDetailedAnalysis && data.analysisId) {
          startAnalysisPolling(data.analysisId, messageId);
          
          // 사용자에게 알림
          toast({
            title: "정밀 분석 진행 중",
            description: "더 자세한 분석을 위해 Qwen2.5 모델로 정밀 분석을 진행 중입니다. 분석이 완료되면 알려드리겠습니다.",
            duration: 5000,
          });
        }
      } else {
        // 일반 응답
        aiResponse = {
          id: `ai-${messageId}`,
          content: data.aiResponse || data.response || "죄송합니다. 지금은 이 질문에 답하기 어렵습니다.",
          sender: 'ai',
          timestamp: new Date()
        };
      }
      
      // 프로세싱 메시지를 실제 응답으로 교체
      setMessages(prev => prev.map(msg => 
        msg.id === `processing-${messageId}` ? aiResponse : msg
      ));
    } catch (error) {
      console.error('AI 응답 생성 오류:', error);
      
      // 오류 메시지로 교체
      setMessages(prev => prev.map(msg => 
        msg.id === `processing-${messageId}` ? {
          id: `ai-${messageId}`,
          content: '죄송합니다. 응답을 생성하는 중에 오류가 발생했습니다. 다시 시도해 주세요.',
          sender: 'ai',
          timestamp: new Date()
        } : msg
      ));
    } finally {
      setIsResponding(false);
    }
  };

  // 키보드 Enter 이벤트 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 음성 녹음 토글
  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // 실제 구현에서는 음성 녹음 API 호출
  };

  // AI 응답 음성 재생 토글
  const togglePlayAudio = (content: string) => {
    setIsPlaying(!isPlaying);
    // 실제 구현에서는 TTS API 호출
    if (!isPlaying) {
      // 음성 재생 시작
      console.log('재생 시작', content);
    } else {
      // 음성 재생 중지
      console.log('재생 중지');
    }
  };
  
  // TTS (음성합성) 함수 (추후 실제 TTS API 구현 예정)
  const synthesizeSpeech = (text: string) => {
    console.log('음성합성 요청:', text);
    // 실제 구현에서는 OpenAI 또는 네이버 클로바 TTS API 등 사용
  };
  
  // 정밀 분석 결과 폴링 함수
  const startAnalysisPolling = (analysisId: string, originalMessageId: string) => {
    console.log(`정밀 분석 폴링 시작: ${analysisId}`);
    
    // 이전 타이머 있으면 제거
    if (pendingAnalyses.has(analysisId)) {
      clearTimeout(pendingAnalyses.get(analysisId)!);
    }
    
    // 폴링 함수
    const pollAnalysis = async () => {
      try {
        // 분석 상태 확인
        const statusResponse = await fetch(`/api/ai/analysis-status/${analysisId}`);
        const statusData: AnalysisStatus = await statusResponse.json();
        
        if (statusData.status === 'completed') {
          // 분석 완료, 결과 조회
          const detailsResponse = await fetch(`/api/ai/detailed-analysis/${analysisId}`);
          
          if (detailsResponse.ok) {
            const detailedData: DetailedAnalysis = await detailsResponse.json();
            
            // 메시지 업데이트
            setMessages(prev => prev.map(msg => {
              if (msg.id === `ai-${originalMessageId}`) {
                return {
                  ...msg,
                  hasDetailedResponse: true,
                  detailedContent: detailedData.aiResponse
                };
              }
              return msg;
            }));
            
            // 사용자에게 알림
            toast({
              title: "정밀 분석 완료",
              description: `Qwen2.5 정밀 분석이 완료되었습니다. 소요 시간: ${detailedData.analysisTime.toFixed(1)}초`,
              variant: "default",
            });
            
            // 타이머 제거
            setPendingAnalyses(prev => {
              const newMap = new Map(prev);
              newMap.delete(analysisId);
              return newMap;
            });
          } else {
            throw new Error("정밀 분석 결과를 가져오는 중 오류 발생");
          }
        } else if (statusData.status === 'error') {
          // 분석 오류
          toast({
            title: "정밀 분석 실패",
            description: "죄송합니다. 정밀 분석 중 오류가 발생했습니다.",
            variant: "destructive",
          });
          
          // 타이머 제거
          setPendingAnalyses(prev => {
            const newMap = new Map(prev);
            newMap.delete(analysisId);
            return newMap;
          });
        } else {
          // 진행 중, 계속 폴링
          const timeoutId = setTimeout(pollAnalysis, 3000); // 3초마다 폴링
          
          // 타이머 저장
          setPendingAnalyses(prev => {
            const newMap = new Map(prev);
            newMap.set(analysisId, timeoutId);
            return newMap;
          });
        }
      } catch (error) {
        console.error("정밀 분석 폴링 오류:", error);
        
        // 타이머 제거
        setPendingAnalyses(prev => {
          const newMap = new Map(prev);
          newMap.delete(analysisId);
          return newMap;
        });
      }
    };
    
    // 최초 폴링 시작 (10초 후)
    const initialTimeoutId = setTimeout(pollAnalysis, 10000);
    
    // 타이머 저장
    setPendingAnalyses(prev => {
      const newMap = new Map(prev);
      newMap.set(analysisId, initialTimeoutId);
      return newMap;
    });
  };
  
  // 정밀 분석 결과 표시 토글
  const toggleDetailedResponse = (messageId: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        return {
          ...msg,
          showDetailedContent: !msg.showDetailedContent
        };
      }
      return msg;
    }));
  };

  return (
    <div className="flex flex-col h-full">
      {/* 채팅 메시지 영역 */}
      <div 
        ref={messageListRef}
        className="flex-1 overflow-y-auto px-2 py-4 space-y-4"
        style={{ maxHeight: 'calc(100vh - 180px)' }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex max-w-[80%] ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* 아바타 */}
              <Avatar className={`h-8 w-8 ${message.sender === 'user' ? 'ml-2' : 'mr-2'}`}>
                {message.sender === 'user' ? (
                  <User className="h-5 w-5 text-[#FF6D70]" />
                ) : (
                  <Bot className="h-5 w-5 text-[#FF6D70]" />
                )}
              </Avatar>
              
              {/* 메시지 내용 */}
              <div>
                <Card className={`p-3 shadow-sm ${
                  message.sender === 'user' 
                    ? 'bg-[#FF6D70] text-white rounded-bl-2xl rounded-tl-2xl rounded-tr-lg' 
                    : 'bg-white border border-[#FFD6D6] rounded-br-2xl rounded-tr-2xl rounded-tl-lg'
                }`}>
                  {message.isProcessing ? (
                    <div className="flex items-center justify-center p-2">
                      <Loader2 className="h-5 w-5 animate-spin text-[#FF6D70]" />
                      <span className="ml-2 text-[#FF6D70]">생각 중...</span>
                    </div>
                  ) : (
                    <div>
                      <p className={`text-sm ${message.sender === 'user' ? 'text-white' : 'text-gray-800'}`}>
                        {message.content}
                      </p>
                      
                      {/* 건강 데이터 표시 (AI만 표시) */}
                      {message.sender === 'ai' && message.healthData && (
                        <div className="mt-3 pt-3 border-t border-[#FFD6D6]">
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <div className="flex items-center">
                              <Heart className="h-4 w-4 mr-1 text-[#FF6D70]" />
                              <span className="text-xs text-gray-700">
                                심박수: <strong>{message.healthData.heartRate} bpm</strong>
                              </span>
                            </div>
                            <div className="flex items-center">
                              <Activity className="h-4 w-4 mr-1 text-[#FF6D70]" />
                              <span className="text-xs text-gray-700">
                                산소포화도: <strong>{message.healthData.oxygenLevel}%</strong>
                              </span>
                            </div>
                          </div>
                          
                          {/* ECG 그래프 */}
                          {message.healthData.ecgData && (
                            <div className="mt-2 pt-2 border-t border-[#FFD6D6]">
                              <div className="flex items-center mb-1">
                                <Activity className="h-4 w-4 mr-1 text-[#FF6D70]" />
                                <span className="text-xs font-medium text-gray-700">ECG 데이터</span>
                              </div>
                              <div className="bg-[#FFF5F5] p-1 rounded-md h-16 w-full relative">
                                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                                  <path
                                    d={`M 0,50 ${message.healthData.ecgData.map((value, index) => {
                                      const x = (index / (message.healthData!.ecgData!.length - 1)) * 100;
                                      const y = 50 - value * 40;
                                      return `L ${x},${y}`;
                                    }).join(' ')}`}
                                    fill="none"
                                    stroke="#FF0000"
                                    strokeWidth="1.5"
                                  />
                                </svg>
                              </div>
                              <div className="flex justify-end mt-1">
                                <Badge className="text-[0.6rem] bg-[#FFE2E9] text-[#FF6D70] font-normal">
                                  실시간 데이터
                                </Badge>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* 정밀 분석 결과 표시 (AI만, 분석 결과 있을 때) */}
                      {message.sender === 'ai' && message.hasDetailedResponse && (
                        <div className="mt-3 pt-3 border-t border-[#FFD6D6]">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <Brain className="h-4 w-4 mr-1 text-[#FF6D70]" />
                              <span className="text-xs font-medium text-gray-700">Qwen2.5 정밀 분석</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs text-[#FF6D70] hover:bg-[#FFF5F5]"
                              onClick={() => toggleDetailedResponse(message.id)}
                            >
                              {message.showDetailedContent ? "간략히 보기" : "자세히 보기"}
                            </Button>
                          </div>
                          
                          {message.showDetailedContent && (
                            <div className="bg-[#FFF5F5] p-3 rounded-md mb-2">
                              <p className="text-sm text-gray-800">{message.detailedContent}</p>
                            </div>
                          )}
                          
                          <Badge className="bg-[#FFE2E9] text-[#FF6D70] font-normal hover:bg-[#FFD6D6]">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            정밀 분석 완료
                          </Badge>
                        </div>
                      )}
                      
                      {/* 정밀 분석 진행 중 표시 (AI만, 정밀 분석 가능할 때) */}
                      {message.sender === 'ai' && message.detailedAnalysisAvailable && !message.hasDetailedResponse && (
                        <div className="mt-3 pt-3 border-t border-[#FFD6D6]">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <Brain className="h-4 w-4 mr-1 text-[#FF6D70]" />
                              <span className="text-xs font-medium text-gray-700">Qwen2.5 정밀 분석</span>
                            </div>
                            <div className="flex items-center">
                              <RotateCw className="h-3 w-3 mr-1 animate-spin text-[#FF6D70]" />
                              <span className="text-xs text-gray-500">진행 중...</span>
                            </div>
                          </div>
                          
                          <Alert className="bg-[#FFF5F5] border-[#FFD6D6] py-2 mb-2">
                            <AlertCircle className="h-4 w-4 text-[#FF6D70]" />
                            <AlertTitle className="text-xs font-medium text-gray-800">정밀 분석 진행 중</AlertTitle>
                            <AlertDescription className="text-xs text-gray-600">
                              Qwen2.5 모델을 사용한 정밀 분석을 진행 중입니다. 분석이 완료되면 알림을 드립니다.
                            </AlertDescription>
                          </Alert>
                          
                          <Badge className="bg-[#FFE2E9] text-[#FF6D70] font-normal hover:bg-[#FFD6D6]">
                            <RotateCw className="h-3 w-3 mr-1 animate-spin" />
                            분석 진행 중
                          </Badge>
                        </div>
                      )}
                      
                      {/* TTS 버튼 (AI 메시지만) */}
                      {message.sender === 'ai' && (
                        <button
                          className="mt-2 flex items-center text-xs text-[#FF6D70]"
                          onClick={() => togglePlayAudio(message.content)}
                        >
                          {isPlaying ? (
                            <>
                              <StopCircle className="h-3 w-3 mr-1" />
                              <span>음성 중지</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="h-3 w-3 mr-1" />
                              <span>음성으로 듣기</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </Card>
                
                {/* 타임스탬프 */}
                <p className={`text-xs text-gray-500 mt-1 ${message.sender === 'user' ? 'text-right' : 'text-left'}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* 입력 영역 */}
      <div className="border-t border-[#FFD6D6] bg-white p-3">
        <div className="flex items-center">
          <Button
            variant="outline"
            size="icon"
            className={`mr-2 ${isRecording ? 'bg-red-100 text-red-600' : 'bg-[#FFF5F5] text-[#FF6D70]'}`}
            onClick={toggleRecording}
          >
            {isRecording ? <StopCircle className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요..."
            className="flex-1 resize-none border-[#FFD6D6] focus-visible:ring-[#FF6D70] max-h-[120px]"
            maxLength={500}
            rows={1}
          />
          
          <Button
            variant="outline"
            size="icon"
            className="ml-2 bg-[#FF6D70] text-white hover:bg-[#e55a6d] hover:text-white"
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isResponding}
          >
            {isResponding ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
        
        {/* 메시지 길이 카운터 */}
        <div className="flex justify-end mt-1">
          <span className="text-xs text-gray-500">{inputText.length}/500</span>
        </div>
      </div>
    </div>
  );
};

export default AIHealthChat;