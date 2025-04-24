import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import AIChatDialog from '@/components/ai/AIChatDialog';
import { useApp } from '@/contexts/AppContext';
import { Bot, ArrowRight, ChevronLeft, Play, Info, Activity, AlertTriangle, AlertCircle, Pill, Heart, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Link } from 'wouter';

// Web Speech API 타입 정의
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    SpeechSynthesisUtterance: typeof SpeechSynthesisUtterance;
  }
}

type Message = {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: Date;
};

type ConsultationCategory = 'symptoms' | 'riskFactors' | 'lifestyle' | 'medications' | 'emergency' | 'general';

const AIConsultation = () => {
  const { toast } = useToast();
  const { currentUser } = useApp();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      content: '안녕하세요! 저는 AI 헬퍼입니다. 심장 건강에 관한 질문이 있으시면 언제든지 물어보세요. 어떤 도움이 필요하신가요?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ConsultationCategory | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isApiEnabled, setIsApiEnabled] = useState(true); // Toggle between mock and real API
  const [isListening, setIsListening] = useState(false); // 음성 인식 활성화 여부
  const [isSpeaking, setIsSpeaking] = useState(false); // 음성 합성 활성화 여부
  const [voiceEnabled, setVoiceEnabled] = useState(true); // 음성 응답 활성화 여부
  const recognitionRef = useRef<any>(null); // SpeechRecognition 참조

  // Categories for AI consultation
  const categories = [
    { id: 'symptoms', label: '증상 확인', icon: 'heartbeat' },
    { id: 'riskFactors', label: '위험 요소', icon: 'exclamation-triangle' },
    { id: 'lifestyle', label: '생활 습관', icon: 'apple-alt' },
    { id: 'medications', label: '약물 정보', icon: 'pills' },
    { id: 'emergency', label: '응급 상황', icon: 'ambulance' },
    { id: 'general', label: '일반 상담', icon: 'comments' }
  ];

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Web Speech API 초기화 및 정리
  useEffect(() => {
    // 브라우저에서 Web Speech API 지원 확인
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('브라우저가 Web Speech API를 지원하지 않습니다');
      return;
    }
    
    // SpeechRecognition 객체 설정
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'ko-KR';
    
    // 음성 인식 결과 처리
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputValue(transcript);
      // 음성 인식 결과를 즉시 전송
      setTimeout(() => {
        setIsListening(false);
        if (transcript.trim()) {
          handleSend();
        }
      }, 500);
    };
    
    // 음성 인식 종료 처리
    recognition.onend = () => {
      setIsListening(false);
    };
    
    // 음성 인식 오류 처리
    recognition.onerror = (event: any) => {
      console.error('음성 인식 오류:', event.error);
      setIsListening(false);
      toast({
        title: "음성 인식 오류",
        description: "음성을 인식하는 데 문제가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive"
      });
    };
    
    recognitionRef.current = recognition;
    
    // 컴포넌트 언마운트시 정리
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);
  
  // AI 응답에 대한 음성 합성 처리
  useEffect(() => {
    // 최근 메시지가 AI의 메시지이고 음성이 활성화된 경우에만 실행
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.sender === 'ai' && voiceEnabled && !isTyping) {
      speakText(lastMessage.content);
    }
  }, [messages, voiceEnabled, isTyping]);
  
  // 텍스트를 음성으로 변환하는 함수
  const speakText = (text: string) => {
    // 브라우저에서 Web Speech API 지원 확인
    if (!('speechSynthesis' in window)) {
      console.warn('브라우저가 음성 합성을 지원하지 않습니다');
      return;
    }
    
    // 이미 말하고 있는 경우 멈춤
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    // 음성 선택 (한국어 여성 음성 선호)
    const voices = window.speechSynthesis.getVoices();
    const koreanVoice = voices.find(voice => 
      voice.lang.includes('ko') && voice.name.includes('Female')
    );
    
    if (koreanVoice) {
      utterance.voice = koreanVoice;
    }
    
    // 음성 합성 시작/종료 처리
    utterance.onstart = () => {
      setIsSpeaking(true);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    
    utterance.onerror = (event: any) => {
      console.error('음성 합성 오류:', event.error);
      setIsSpeaking(false);
    };
    
    window.speechSynthesis.speak(utterance);
  };
  
  // 음성 인식 시작/종료 토글
  const toggleSpeechRecognition = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
        } catch (error) {
          console.error('음성 인식 시작 오류:', error);
          toast({
            title: "음성 인식 오류",
            description: "음성 인식을 시작하는 데 문제가 발생했습니다. 다시 시도해주세요.",
            variant: "destructive"
          });
        }
      }
    }
  };
  
  // 음성 합성 활성화/비활성화 토글
  const toggleVoice = () => {
    // 음성 합성 중인 경우 중지
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    setVoiceEnabled(!voiceEnabled);
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    if (!currentUser?.id) {
      toast({
        title: "오류",
        description: "사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.",
        variant: "destructive"
      });
      return;
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      content: inputValue,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      if (isApiEnabled) {
        // Get context from previous messages (last 5 or fewer)
        const contextMessages = messages.slice(-5);
        const context = contextMessages.map(msg => 
          `${msg.sender === 'user' ? '사용자' : 'AI'}: ${msg.content}`
        ).join('\n');
        
        // 실제 AI 헬퍼 AI 모델 API 호출
        const response = await fetch('/api/analysis/consultation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            message: inputValue,
            context,
            category: selectedCategory || 'general'
          })
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          content: data.aiResponse,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, aiMessage]);
      } else {
        // 모의응답 사용 모드일 때
        setTimeout(() => {
          const aiResponse = generateAIResponse(inputValue, selectedCategory);
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            sender: 'ai',
            content: aiResponse,
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, aiMessage]);
        }, 1000);
      }
    } catch (error) {
      console.error("AI chat error:", error);
      toast({
        title: "AI 헬퍼 오류",
        description: "AI 모델 응답을 생성하는 데 문제가 발생했습니다.",
        variant: "destructive"
      });
      
      // Add error message as AI response
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        content: "죄송합니다, AI 헬퍼 기능에 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCategorySelect = (category: ConsultationCategory) => {
    setSelectedCategory(category);
    
    // Add a message about the selected category
    const categoryMessages: Record<ConsultationCategory, string> = {
      symptoms: '심장 관련 증상에 대해 상담을 도와드리겠습니다. 어떤 증상이 있으신가요?',
      riskFactors: '심장 질환의 위험 요소에 대해 알아보겠습니다. 고혈압, 당뇨, 콜레스테롤 수치 등에 대해 궁금하신 점이 있으신가요?',
      lifestyle: '생활 습관은 심장 건강에 큰 영향을 미칩니다. 식이요법, 운동, 수면 등에 대해 어떤 점이 궁금하신가요?',
      medications: '심장 관련 약물에 대해 상담해 드리겠습니다. 어떤 약물에 대해 알고 싶으신가요?',
      emergency: '심장 관련 응급 상황에 대한 정보입니다. 증상이 심각하다면 즉시 119에 연락하는 것이 중요합니다.',
      general: '심장 건강에 관한 일반적인 상담을 진행하겠습니다. 어떤 주제에 관심이 있으신가요?'
    };
    
    const aiMessage: Message = {
      id: Date.now().toString(),
      sender: 'ai',
      content: categoryMessages[category],
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, aiMessage]);
  };

  // Function to generate AI responses (simplified for demo)
  const generateAIResponse = (userMessage: string, category: ConsultationCategory | null): string => {
    const userMessageLower = userMessage.toLowerCase();
    
    // Chest pain related questions
    if (userMessageLower.includes('가슴') && (userMessageLower.includes('통증') || userMessageLower.includes('아파'))) {
      return '가슴 통증은 여러 원인에 의해 발생할 수 있습니다. 심장 문제와 관련된 가슴 통증은 일반적으로 압박감, 쥐어짜는 듯한 느낌, 무거운 느낌으로 표현되며 왼쪽 팔, 목, 턱으로 퍼질 수 있습니다. 통증이 30분 이상 지속되거나 휴식 시에도 완화되지 않는다면 즉시 119에 연락하셔야 합니다. 현재 통증이 심각하거나 호흡 곤란, 식은땀, 구역질 등의 증상이 동반된다면 응급 처치가 필요할 수 있습니다.';
    }
    
    // Heartbeat/palpitation related questions
    if (userMessageLower.includes('심장') && (userMessageLower.includes('두근') || userMessageLower.includes('빠르게'))) {
      return '심장이 두근거리는 증상(심계항진)은 흔한 증상입니다. 일시적인 심계항진은 스트레스, 카페인, 알코올, 니코틴, 불안 등으로 인해 발생할 수 있습니다. 그러나 자주 발생하거나 갑자기 시작되고 멈추는 심계항진, 어지러움이나 실신을 동반하는 경우에는 의사의 진찰이 필요합니다. 기록된 데이터에 따르면 귀하의 평균 심박수는 정상 범위 내에 있습니다. 특별한 증상이 없다면 규칙적인 운동, 충분한 수면, 카페인 섭취 제한 등의 생활 습관 개선을 권장합니다.';
    }
    
    // Diet related questions
    if (userMessageLower.includes('식이') || userMessageLower.includes('음식') || userMessageLower.includes('식단')) {
      return '심장 건강을 위한 식단은 지중해식 식단이 좋은 예입니다. 과일, 채소, 통곡물, 콩류, 견과류, 올리브 오일, 생선을 충분히 섭취하고 붉은 고기와 가공식품의 섭취를 제한하세요. 특히 나트륨(소금) 섭취를 줄이는 것이 혈압 관리에 중요합니다. DASH 식이요법(Dietary Approaches to Stop Hypertension)도 심장 건강에 좋은 식단으로, 포화지방과 콜레스테롤 섭취를 줄이고 칼륨, 마그네슘, 칼슘이 풍부한 식품을 강조합니다.';
    }
    
    // Exercise related questions
    if (userMessageLower.includes('운동') || userMessageLower.includes('활동')) {
      return '규칙적인 유산소 운동은 심장 건강에 매우 중요합니다. 미국심장협회에서는 성인의 경우 주당 최소 150분의 중강도 유산소 운동 또는 75분의 고강도 운동을 권장합니다. 걷기, 자전거 타기, 수영 등이 좋은 유산소 운동입니다. 운동을 시작하기 전에 5-10분의 준비운동과 마무리에 5-10분의 정리운동을 포함하세요. 기존 심장 질환이 있거나 만성 질환이 있는 경우, 운동 프로그램을 시작하기 전에 의사와 상담하는 것이 중요합니다.';
    }
    
    // Default response based on category
    if (category === 'symptoms') {
      return '심장 관련 증상은 매우 다양하게 나타날 수 있습니다. 가슴 통증, 호흡 곤란, 심장 두근거림, 어지러움, 피로감 등이 일반적인 증상입니다. 하지만 이러한 증상들은 다른 질환에서도 나타날 수 있으므로 정확한 진단을 위해서는 의사의 진찰이 필요합니다. 현재 어떤 특정 증상이 염려되시나요?';
    } else if (category === 'riskFactors') {
      return '심장 질환의 주요 위험 요소로는 고혈압, 당뇨병, 높은 콜레스테롤, 흡연, 비만, 신체활동 부족, 건강하지 않은 식습관, 과도한 스트레스 등이 있습니다. 가족력도 중요한 위험 요소입니다. 이러한 위험 요소가 많을수록 심장 질환의 위험이 높아집니다. 귀하의 건강 데이터를 분석한 결과, 현재 위험도는 낮은 수준으로 평가됩니다.';
    } else if (category === 'lifestyle') {
      return '심장 건강을 위한 생활 습관으로는 균형 잡힌 식단, 규칙적인 운동, 금연, 적절한 체중 유지, 스트레스 관리, 충분한 수면 등이 있습니다. 알코올은 적정량(남성의 경우 하루 2잔 이하, 여성의 경우 하루 1잔 이하)을 초과하지 않는 것이 좋습니다. 귀하의 생활 습관 중 개선하고 싶은 특정 영역이 있으신가요?';
    } else if (category === 'medications') {
      return '심장 질환 치료 및 예방에 사용되는 주요 약물로는 항고혈압제, 항응고제(혈액 희석제), 항혈소판제, 콜레스테롤 저하제(스타틴), 베타 차단제, ACE 억제제 등이 있습니다. 각 약물은 특정 목적과 부작용이 있으므로 의사의 처방에 따라 복용하는 것이 중요합니다. 약물에 관한 더 구체적인 질문이 있으시면 말씀해주세요.';
    } else if (category === 'emergency') {
      return '심장 관련 응급 상황의 주요 징후로는 30분 이상 지속되는 가슴 통증 또는 압박감, 팔, 턱, 목으로 퍼지는 통증, 호흡 곤란, 실신, 심한 어지러움, 극심한 불안감, 심한 식은땀 등이 있습니다. 이러한 징후가 나타나면 즉시 119에 전화하세요. 응급 상황에서는 신속한 대응이 생명을 구할 수 있습니다.';
    }
    
    // Completely generic response
    return '귀하의 질문에 대한 답변을 드리겠습니다. 심장 건강은 다양한 요소에 의해 영향을 받습니다. 규칙적인 운동, 건강한 식단, 스트레스 관리, 충분한 수면은 심장 건강을 유지하는 핵심 요소입니다. 귀하의 현재 기록된 건강 데이터에 따르면 심장 관련 지표는 정상 범위 내에 있습니다. 더 구체적인 정보가 필요하시면 추가 질문해주세요.';
  };

  return (
    <div className="space-y-4">
      {/* 페이지 헤더 - 뒤로가기 화살표 하나만 표시 */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" asChild className="mr-2">
            <Link to="/">
              <ChevronLeft className="w-6 h-6 text-[#111]" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold font-suite text-[#111]">AI 헬퍼</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className="bg-white text-[#FF0000] px-3 py-1 rounded-full border border-[#FFD6D6]">
            <img src="/src/assets/smartwatch-icon.png" alt="워치" className="w-4 h-4 mr-1.5" />
            85%
          </Badge>
          <Button variant="ghost" size="icon" className="text-[#FF0000]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="#FF0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.258 9.77251 19.9887C9.5799 19.7194 9.31074 19.5143 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.742 9.96512 4.0113 9.77251C4.28059 9.5799 4.48572 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15Z" stroke="#FF0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Button>
        </div>
      </div>
      
      <Card className="border border-[#FF0000] rounded-[30px] shadow-sm flex flex-col flex-grow overflow-hidden">
        <CardHeader className="pb-2 border-b border-[#FF0000]">
          <CardTitle className="text-lg font-medium flex items-center text-[#FF0000]">
            <div className="w-8 h-8 rounded-full bg-[#FFF5F5] flex items-center justify-center mr-2">
              <img src="/src/assets/ai-helper.png" alt="AI 헬퍼" className="w-6 h-6" />
            </div>
            AI 헬퍼
          </CardTitle>
        </CardHeader>
        <div className="flex-grow overflow-hidden">
          <ScrollArea className="h-[calc(100vh-350px)] p-4">
            <div className="space-y-4">
              {!selectedCategory && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      className="flex flex-col items-center p-4 bg-white border border-[#FF8FAB] shadow-sm rounded-[20px] hover:bg-[#FFF5F5] transition-colors"
                      onClick={() => handleCategorySelect(category.id as ConsultationCategory)}
                    >
                      <div className="w-10 h-10 rounded-full bg-[#FFF5F5] flex items-center justify-center mb-2">
                        {category.id === 'symptoms' && <Activity className="h-5 w-5 text-[#FF0000]" />}
                        {category.id === 'riskFactors' && <AlertTriangle className="h-5 w-5 text-[#FF0000]" />}
                        {category.id === 'lifestyle' && <Heart className="h-5 w-5 text-[#FF0000]" />}
                        {category.id === 'medications' && <Pill className="h-5 w-5 text-[#FF0000]" />}
                        {category.id === 'emergency' && <AlertCircle className="h-5 w-5 text-[#FF0000]" />}
                        {category.id === 'general' && <img src="/src/assets/ai-helper.png" alt="AI 헬퍼" className="h-5 w-5" />}
                      </div>
                      <span className="text-sm font-medium text-[#FF0000]">{category.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {messages.map((message) => (
                <div 
                  key={message.id}
                  className={`flex items-start ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.sender === 'ai' && (
                    <Avatar className="h-8 w-8 mr-2 bg-[#FFF5F5] flex items-center justify-center">
                      <img src="/src/assets/ai-helper.png" alt="AI 헬퍼" className="h-5 w-5" />
                    </Avatar>
                  )}
                  
                  <div className={`p-3 rounded-[18px] max-w-[75%] ${
                    message.sender === 'user' 
                      ? 'bg-[#FF0000] text-white' 
                      : 'bg-white border border-[#FF0000]'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <div className={`text-xs mt-1 ${
                      message.sender === 'user'
                        ? 'text-white/70'
                        : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  
                  {message.sender === 'user' && (
                    <Avatar className="h-8 w-8 ml-2 bg-[#FF0000] flex items-center justify-center">
                      <span className="text-xs font-medium text-white">나</span>
                    </Avatar>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex items-start">
                  <Avatar className="h-8 w-8 mr-2 bg-[#FFF5F5] flex items-center justify-center">
                    <img src="/src/assets/ai-helper.png" alt="AI 헬퍼" className="h-5 w-5" />
                  </Avatar>
                  <div className="flex space-x-1 p-3 bg-white border border-[#FF0000] rounded-[18px]">
                    <div className="w-2 h-2 bg-[#FF0000] rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-2 h-2 bg-[#FF0000] rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    <div className="w-2 h-2 bg-[#FF0000] rounded-full animate-bounce [animation-delay:0.6s]"></div>
                  </div>
                </div>
              )}
              {isListening && (
                <div className="flex items-start justify-end w-full">
                  <div className="flex items-center justify-center mr-2 p-3 bg-[#FFF5F5] border border-[#FF8FAB] rounded-[18px] max-w-[75%]">
                    <div className="flex flex-col items-center space-y-1">
                      <div className="flex space-x-1">
                        <div className="w-1 h-3 bg-[#FF8FAB] rounded-full animate-pulse"></div>
                        <div className="w-1 h-5 bg-[#FF0000] rounded-full animate-pulse"></div>
                        <div className="w-1 h-3 bg-[#FF8FAB] rounded-full animate-pulse"></div>
                        <div className="w-1 h-6 bg-[#FF0000] rounded-full animate-pulse"></div>
                        <div className="w-1 h-4 bg-[#FF8FAB] rounded-full animate-pulse"></div>
                      </div>
                      <span className="text-xs text-[#FF0000] font-medium">음성 인식 중...</span>
                    </div>
                  </div>
                  <Avatar className="h-8 w-8 bg-[#FF0000] flex items-center justify-center">
                    <span className="text-xs font-medium text-white">나</span>
                  </Avatar>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>
        </div>
        <div className="p-4 border-t border-[#FF8FAB]">
          <div className="flex space-x-2">
            <Textarea
              placeholder="메시지를 입력하세요..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="resize-none border-[#FF8FAB] rounded-[25px] focus-visible:ring-[#FF0000] focus-visible:ring-opacity-25"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <div className="flex gap-2">
              <Button 
                size="icon" 
                variant="outline" 
                type="button" 
                className={`rounded-full border-[#FF8FAB] ${isListening ? 'bg-[#FFF5F5] text-[#FF0000]' : 'hover:bg-[#FFF5F5] hover:text-[#FF0000]'}`}
                onClick={toggleSpeechRecognition}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Button 
                size="icon" 
                variant="outline" 
                type="button"
                className={`rounded-full border-[#FF8FAB] ${isSpeaking ? 'bg-[#FFF5F5] text-[#FF0000]' : 'hover:bg-[#FFF5F5] hover:text-[#FF0000]'}`}
                onClick={toggleVoice}
              >
                {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              <Button size="icon" onClick={handleSend} className="bg-[#FF0000] hover:bg-[#CC0000] rounded-full">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-[#507695]">
              AI 헬퍼는 의학적 조언을 대체할 수 없습니다. 긴급 상황에서는 의료 전문가와 상담하세요.
            </p>
            <div className="flex items-center text-xs text-[#507695]">
              <span className={isApiEnabled ? "text-[#FF0000]" : "text-gray-400"}>AI 헬퍼</span>
              <div 
                className="mx-2 relative inline-flex h-4 w-8 items-center rounded-full bg-gray-200 cursor-pointer"
                onClick={() => setIsApiEnabled(!isApiEnabled)}
              >
                <span className={`absolute h-3 w-3 rounded-full transition ${isApiEnabled ? 'bg-[#FF0000] translate-x-4' : 'bg-gray-400 translate-x-1'}`} />
              </div>
              <span className={!isApiEnabled ? "text-[#FF0000]" : "text-gray-400"}>모의응답</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AIConsultation;
