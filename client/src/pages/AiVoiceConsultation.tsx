import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mic, MicOff, Send, Volume2, VolumeX } from 'lucide-react';

// 메시지 타입 정의
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const AiVoiceConsultation: React.FC = () => {
  // 메시지 상태 관리
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: '안녕하세요! 심장 건강에 관해 무엇이든 물어보세요.',
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  
  // 입력 텍스트 상태 관리
  const [inputText, setInputText] = useState('');
  
  // 녹음 상태 관리
  const [isRecording, setIsRecording] = useState(false);
  
  // 스피커 상태 관리
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  
  // API 사용 여부 상태 관리
  const [isApiEnabled, setIsApiEnabled] = useState(true);
  
  // 메시지 끝으로 자동 스크롤
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // 녹음 토글 함수
  const toggleRecording = () => {
    setIsRecording(!isRecording);
    
    if (!isRecording) {
      // 녹음 시작 로직
      setTimeout(() => {
        const demoVoiceText = '심장마비 증상은 어떤 것이 있나요?';
        setInputText(demoVoiceText);
      }, 2000);
    } else {
      // 녹음 중지 로직
      setInputText('');
    }
  };
  
  // 메시지 전송 함수
  const sendMessage = () => {
    if (!inputText.trim()) return;
    
    // 사용자 메시지 추가
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    
    // AI 응답 시뮬레이션
    setTimeout(() => {
      let aiResponse = '';
      
      if (isApiEnabled) {
        // 실제 API 사용 시 응답
        if (inputText.includes('심장마비') || inputText.includes('증상')) {
          aiResponse = '심장마비의 주요 증상으로는 가슴 통증 또는 압박감, 호흡 곤란, 식은땀, 현기증, 메스꺼움, 턱, 목, 또는 팔로 퍼지는 통증 등이 있습니다. 이러한 증상이 나타나면 즉시 응급 의료 서비스(119)에 연락하세요.';
        } else if (inputText.includes('예방')) {
          aiResponse = '심장 질환 예방을 위해서는 규칙적인 운동, 건강한 식단, 금연, 적정 체중 유지, 정기적인 건강 검진이 중요합니다. 또한 스트레스 관리와 충분한 수면도 심장 건강에 도움이 됩니다.';
        } else {
          aiResponse = '그에 대한 구체적인 정보가 필요합니다. 심장 건강과 관련된 더 자세한 질문을 해주시면 도움드리겠습니다.';
        }
      } else {
        // 모의 응답 (간단한 응답)
        aiResponse = '현재 모의 응답 모드입니다. 실제 의학 정보는 제공되지 않습니다. AI 헬퍼 모드를 활성화해주세요.';
      }
      
      const aiMessage: Message = {
        id: Date.now().toString(),
        text: aiResponse,
        sender: 'ai',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // 음성 합성 시뮬레이션 (실제로는 여기서 TTS API 호출)
      if (isSpeakerOn) {
        console.log('TTS 재생:', aiResponse);
      }
    }, 1000);
  };
  
  // 엔터키 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)]">
      <div className="flex items-center mb-4">
        <Link href="/">
          <button className="mr-3 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
            <ArrowLeft className="h-4 w-4" />
          </button>
        </Link>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden mb-4 border border-[#FF0000] rounded-2xl" 
        style={{ 
          boxShadow: '0 10px 20px -5px rgba(255, 0, 0, 0.1), 0 4px 10px -5px rgba(255, 0, 0, 0.06), inset 0 1px 0 0 rgba(255, 255, 255, 0.8)'
        }}>
        <CardHeader className="py-3 px-4 border-b border-[#FF0000]">
          <div className="flex items-center">
            <div className="flex items-center justify-center mr-2">
              <img src="/src/assets/ai-helper.png" alt="AI 헬퍼" className="h-8 w-8" />
            </div>
            <CardTitle className="text-base font-medium text-[#FF0000]">AI 헬퍼</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-4 space-y-4">
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-4 py-2 rounded-xl ${
                  message.sender === 'user'
                    ? 'bg-[#FF0000] text-white'
                    : 'bg-white border border-[#FF0000]'
                }`}
              >
                <p>{message.text}</p>
                <div
                  className={`text-xs mt-1 ${
                    message.sender === 'user' ? 'text-white/70' : 'text-gray-500'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </CardContent>
        
        <div className="border-t border-[#FF0000] p-3 bg-white">
          <div className="flex items-center">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full border-[#FF0000] bg-[#FF9999] text-white"
              onClick={toggleRecording}
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            
            <div className="flex-1 mx-2">
              <textarea
                className="w-full border border-[#FF0000] rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#FF0000] focus:ring-opacity-25 resize-none"
                placeholder="메시지를 입력하세요..."
                rows={1}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full border-[#FF0000] bg-[#FF9999] text-white"
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              >
                {isSpeakerOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              
              <Button 
                className="rounded-full bg-[#FF0000] hover:bg-[#CC0000]"
                disabled={!inputText.trim()}
                onClick={sendMessage}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {isRecording && (
            <div className="mt-2 text-center">
              <span className="text-sm text-[#FF0000]">음성 인식 중...</span>
              <div className="flex justify-center mt-1 space-x-1">
                <div className="w-1 h-3 bg-[#FF0000] rounded-full animate-pulse"></div>
                <div className="w-1 h-5 bg-[#FF0000] rounded-full animate-pulse delay-100"></div>
                <div className="w-1 h-3 bg-[#FF0000] rounded-full animate-pulse delay-200"></div>
                <div className="w-1 h-6 bg-[#FF0000] rounded-full animate-pulse"></div>
                <div className="w-1 h-4 bg-[#FF0000] rounded-full animate-pulse"></div>
              </div>
            </div>
          )}
        </div>
      </Card>
      
      <div className="flex items-center justify-between text-xs text-[#507695] px-2 pb-2">
        <p>AI 헬퍼는 의학적 조언을 대체할 수 없습니다. 긴급 상황에서는 의료 전문가와 상담하세요.</p>
        <div className="flex items-center">
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
  );
};

export default AiVoiceConsultation;