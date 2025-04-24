import React, { useState, useRef, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  Send, 
  Bot, 
  Loader2, 
  AlertCircle, 
  X, 
  FileText, 
  MessageSquare,
  Info,
  AlertTriangle,
  Mic,
  Heart,
  LucideProps,
  Activity,
  ArrowUpDown,
  ChevronLeft,
  BrainCircuit
} from "lucide-react";
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from '@/lib/utils';

// 오픈소스 AI 모델 에뮬레이션을 위한 함수들
// 실제 구현에서는 WASM이나 WebGPU 기반 LLM을 사용할 수 있음
const generateHealthDiagnosis = (query: string, healthData: any): string => {
  // 간단한 경우의 수 기반 응답 생성
  const lowHeartRate = healthData?.heartRate && healthData.heartRate < 60;
  const highHeartRate = healthData?.heartRate && healthData.heartRate > 100;
  const lowOxygen = healthData?.oxygenLevel && healthData.oxygenLevel < 95;
  const highBP = healthData?.bloodPressureSystolic && healthData.bloodPressureSystolic > 140;
  
  // 키워드 기반 응답
  if (query.includes('심박수') || query.includes('맥박')) {
    if (lowHeartRate) {
      return '심박수가 분당 60회 미만으로 서맥(Bradycardia) 증상이 나타납니다. 이는 휴식 상태에서 운동선수들에게 정상일 수 있지만, 현기증이나 피로감을 느낀다면 의사와 상담하는 것이 좋습니다. 갑상선 기능 저하, 전해질 불균형, 또는 특정 약물의 부작용일 수 있습니다.';
    } else if (highHeartRate) {
      return '심박수가 분당 100회 이상으로 빈맥(Tachycardia) 상태입니다. 운동, 스트레스, 불안, 카페인 섭취 등이 일시적인 원인일 수 있으나, 지속적인 빈맥은 갑상선 기능항진증, 빈혈, 감염, 심장 문제의 신호일 수 있습니다. 두근거림, 호흡곤란, 가슴 통증이 동반된다면 의사의 진찰을 받으세요.';
    } else {
      return '현재 심박수는 정상 범위(60-100 BPM) 내에 있습니다. 건강한 성인의 휴식 시 심박수는 보통 60-80 BPM 정도입니다. 규칙적인 운동을 하는 사람들은 더 낮은 심박수를 가질 수 있으며, 이는 심장 효율이 좋다는 신호입니다.';
    }
  } else if (query.includes('산소') || query.includes('산소포화도')) {
    if (lowOxygen) {
      return '산소포화도가 95% 미만으로 낮게 측정됩니다. 이는 저산소증(Hypoxemia)의 가능성을 나타냅니다. 호흡기 질환, 심장 문제, 고도가 높은 지역에 있는 경우 등이 원인일 수 있습니다. 호흡곤란, 기침, 혼란 등의 증상이 있다면 즉시 의료 도움을 구하세요.';
    } else {
      return '산소포화도는 95% 이상으로 정상 범위 내에 있습니다. 건강한 사람은 보통 95-100%의 산소포화도를 유지합니다. 이는 폐가 효율적으로 산소를 혈액으로 전달하고 있다는 의미입니다.';
    }
  } else if (query.includes('혈압') || query.includes('압')) {
    if (highBP) {
      return '수축기 혈압이 140mmHg 이상으로 고혈압(Hypertension) 상태가 의심됩니다. 고혈압은 초기에 증상이 없는 경우가 많아 "침묵의 살인자"라고도 불립니다. 지속적인 고혈압은 심장병, 뇌졸중, 신장 손상 등 심각한 건강 문제를 일으킬 수 있으므로 생활 습관 개선과 함께 의사의 지속적인 관리가 필요합니다.';
    } else {
      return '현재 혈압은 정상 범위 내에 있는 것으로 보입니다. 건강한 성인의 이상적인 혈압은 120/80mmHg 미만입니다. 규칙적인 운동, 건강한 식습관, 스트레스 관리, 금연 등으로 건강한 혈압을 유지하는 것이 중요합니다.';
    }
  } else if (query.includes('위험') || query.includes('종합')) {
    let risks = [];
    if (lowHeartRate) risks.push('서맥(낮은 심박수)');
    if (highHeartRate) risks.push('빈맥(높은 심박수)');
    if (lowOxygen) risks.push('저산소증');
    if (highBP) risks.push('고혈압');
    
    if (risks.length > 0) {
      return `현재 건강 데이터를 분석한 결과, 다음과 같은 위험 요소가 발견되었습니다: ${risks.join(', ')}. 이러한 상태가 지속되면 심혈관 질환의 위험이 증가할 수 있으므로 의사와 상담하여 적절한 관리 방법을 찾는 것이 좋습니다. 규칙적인 운동, 균형 잡힌 식단, 스트레스 관리가 도움이 될 수 있습니다.`;
    } else {
      return '현재 측정된 건강 지표들은 모두 정상 범위 내에 있습니다. 계속해서 건강한 생활 습관을 유지하고, 정기적인 건강 검진을 받는 것이 좋습니다. 심혈관 건강을 위해 규칙적인 운동, 건강한 식습관, 충분한 수면, 스트레스 관리가 중요합니다.';
    }
  } else {
    return `질문하신 내용에 대해 분석해보았습니다. 현재 심박수 ${healthData.heartRate || '--'}bpm, 산소포화도 ${healthData.oxygenLevel || '--'}%, 혈압 ${healthData.bloodPressureSystolic || '--'}/${healthData.bloodPressureDiastolic || '--'}mmHg 수치를 고려할 때, 전반적인 심장 건강은 양호한 편입니다. 더 구체적인 분석을 원하시면 특정 증상이나 우려사항에 대해 질문해주세요.`;
  }
};

const generateHealthConsultation = (query: string, context: string): string => {
  // 키워드 기반 상담 응답
  if (query.includes('심장병') || query.includes('심장 질환')) {
    return '심장 질환은 심장이나 혈관에 영향을 미치는 다양한 상태를 포함합니다. 고혈압, 관상동맥 질환, 심부전, 부정맥 등이 포함됩니다. 위험 요소로는 흡연, 비만, 당뇨병, 스트레스, 나이, 가족력 등이 있습니다. 예방을 위해서는 규칙적인 운동, 건강한 식단, 금연, 적정 체중 유지, 스트레스 관리, 정기적인 건강 검진이 중요합니다. 가슴 통증, 호흡 곤란, 불규칙한 심장 박동, 피로감 등의 증상이 있다면 즉시 의사의 진찰을 받아야 합니다.';
  } else if (query.includes('고혈압') || query.includes('혈압이 높')) {
    return '고혈압은 동맥의 혈압이 지속적으로 높은 상태를 말합니다. 일반적으로 수축기 혈압 140mmHg 이상, 이완기 혈압 90mmHg 이상일 때 고혈압으로 진단됩니다. 초기에는 증상이 없는 경우가 많아 "침묵의 살인자"라고도 불리며, 장기간 관리되지 않으면 심장병, 뇌졸중, 신장 질환 등 심각한 합병증을 일으킬 수 있습니다. 치료는 생활 습관 개선(저염식, 규칙적 운동, 금연, 절주, 스트레스 관리)과 필요시 약물 치료를 병행합니다. 꾸준한 혈압 측정과 의사의 정기적인 진료가 필요합니다.';
  } else if (query.includes('콜레스테롤') || query.includes('지질')) {
    return '콜레스테롤은 세포막 구성과 호르몬 생성에 필요한 지방 물질로, LDL(나쁜 콜레스테롤)과 HDL(좋은 콜레스테롤)이 있습니다. 높은 LDL 수치는 혈관 벽에 플라크를 형성해 심혈관 질환의 위험을 증가시킵니다. 반면, HDL은 LDL을 간으로 운반해 제거하는 역할을 합니다. 콜레스테롤 관리를 위해서는 포화지방과 트랜스지방이 적은 식단, 섬유질이 풍부한 음식 섭취, 규칙적인 운동, 금연, 적정 체중 유지가 중요합니다. 수치가 높다면 의사와 상담하여 약물 치료(스타틴 등)를 고려할 수 있습니다.';
  } else if (query.includes('부정맥') || query.includes('심장이 두근')) {
    return '부정맥은 심장의 전기적 활동에 문제가 생겨 발생하는 비정상적인 심장 박동을 말합니다. 느리거나(서맥), 빠르거나(빈맥), 불규칙한 심장 박동 형태로 나타날 수 있습니다. 일시적인 부정맥은 흔하고 무해할 수 있지만, 지속적인 부정맥은 심각한 심장 질환의 징후일 수 있습니다. 증상으로는 가슴 두근거림, 어지러움, 호흡 곤란, 가슴 통증, 실신 등이 있을 수 있습니다. 진단은 심전도(ECG), 홀터 모니터, 심장 초음파 등을 통해 이루어지며, 치료는 원인과 중증도에 따라 생활 습관 개선, 약물 치료, 시술(카테터 절제술), 심장 박동기 삽입 등이 있습니다.';
  } else if (query.includes('심장마비') || query.includes('심근경색')) {
    return '심근경색(심장마비)은 심장 근육에 혈액을 공급하는 관상동맥이 막혀 심장 조직이 손상되는 응급 상황입니다. 주요 증상은 가슴 중앙의 압박감, 쥐어짜는 듯한 통증이 팔, 턱, 등으로 퍼지는 것이며, 호흡 곤란, 식은땀, 메스꺼움, 어지러움이 동반될 수 있습니다. 여성, 노인, 당뇨병 환자는 비전형적인 증상을 보일 수 있어 주의가 필요합니다. 심근경색이 의심되면 즉시 119에 연락하고, 응급 처치로 아스피린을 복용하는 것이 권장됩니다. 치료는 혈전 용해제, 관상동맥 중재술(스텐트 삽입), 관상동맥 우회 수술 등이 있으며, 회복 후에는 생활 습관 개선과 약물 치료를 통한 재발 방지가 중요합니다.';
  } else if (query.includes('운동') || query.includes('활동')) {
    return '심장 건강을 위한 운동은 규칙적이고 적절한 강도로 하는 것이 중요합니다. 미국심장협회는 주 150분 이상의 중강도 유산소 운동 또는 주 75분 이상의 고강도 유산소 운동을 권장합니다. 걷기, 조깅, 수영, 자전거 타기, 댄스 등 다양한 유산소 운동이 심장 건강에 좋습니다. 시작 전 준비운동, 마무리 시 정리운동이 중요하며, 천천히 시작해 점진적으로 강도와 시간을 늘려가는 것이 좋습니다. 기존 심장 질환이 있다면 반드시 의사와 상담 후 적합한 운동 프로그램을 계획해야 합니다. 운동 중 가슴 통증, 심한 호흡 곤란, 어지러움 등이 발생하면 즉시 중단하고 의사의 진찰을 받아야 합니다.';
  } else if (query.includes('식이') || query.includes('음식') || query.includes('먹')) {
    return '심장 건강을 위한 식이요법으로는 지중해식 식단이나 DASH(Dietary Approaches to Stop Hypertension) 식단이 권장됩니다. 과일, 채소, 통곡물, 저지방 단백질(생선, 두부, 콩류), 건강한 지방(올리브유, 견과류)을 충분히 섭취하고, 가공식품, 포화지방, 트랜스지방, 나트륨, 첨가당의 섭취를 제한하는 것이 좋습니다. 음식은 소금 대신 허브와 향신료로 간을 하고, 튀기는 것보다 구우거나 찌는 조리법을 선택하세요. 주 2회 이상 지방이 풍부한 생선(연어, 고등어 등)을 섭취하고, 물을 충분히 마시며, 알코올은 제한적으로 섭취하는 것이 좋습니다.';
  } else if (query.includes('스트레스') || query.includes('불안')) {
    return '스트레스는 심혈관 건강에 직접적인 영향을 미칩니다. 지속적인 스트레스는 혈압 상승, 염증 증가, 혈전 형성 촉진, 부정맥 위험 증가 등 심장에 부담을 줍니다. 스트레스 관리 방법으로는 정기적인 운동, 명상이나 심호흡 등의 이완 기법, 충분한 수면, 사회적 관계 유지, 즐거운 취미 활동, 일·휴식의 균형 유지 등이 있습니다. 심각한 스트레스나 불안이 있다면 전문가의 도움을 구하는 것도 좋습니다. 마음챙김(mindfulness), 점진적 근육 이완법, 인지행동치료 등도 효과적인 스트레스 관리 방법입니다.';
  } else {
    // 일반적인 심장 건강 조언
    return '심장 건강을 유지하기 위한 핵심 요소는 규칙적인 운동, 균형 잡힌 식단, 금연, 적절한 체중 유지, 스트레스 관리, 충분한 수면, 정기적인 건강 검진입니다. 주 150분 이상의 중강도 유산소 운동, 지중해식 또는 DASH 식단 섭취, 혈압·콜레스테롤·혈당 수치 관리가 중요합니다. 가족력, 나이, 성별 등 변경할 수 없는 위험 요소가 있다면 더욱 적극적인 생활 습관 관리가 필요합니다. 가슴 통증, 호흡 곤란, 비정상적인 심장 박동, 극심한 피로감 등의 증상이 있다면 즉시 의사와 상담하세요. 더 구체적인 질문이 있으시면 말씀해주세요.';
  }
};

type Message = {
  sender: 'user' | 'ai';
  content: string;
  timestamp: string;
};

interface AIChatProps {
  title?: string;
  description?: string;
  trigger?: React.ReactNode;
  context?: string;
  userId?: number;
  onClose?: () => void;
  autoOpen?: boolean;
  initialMessage?: string;
  mode?: 'consult' | 'diagnosis';
  healthData?: any;
}

export default function AIChatDialog({
  title = "AI 건강 상담",
  description = "건강과 관련된 질문을 해보세요.",
  trigger,
  context = "",
  userId = 1,
  onClose,
  autoOpen = false,
  initialMessage,
  mode = 'consult',
  healthData
}: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(autoOpen);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && initialMessage && messages.length === 0) {
      if (mode === 'diagnosis' && healthData) {
        // 자동으로 진단 메시지 시작
        const initialSystemMessage: Message = {
          sender: 'ai',
          content: `환자의 건강 데이터를 분석했습니다. 심박수 ${healthData.heartRate || '정보 없음'}, 산소포화도 ${healthData.oxygenLevel || '정보 없음'}% 등의 데이터를 바탕으로 진단을 시작합니다. 궁금한 점이 있으시면 질문해주세요.`,
          timestamp: new Date().toISOString()
        };
        setMessages([initialSystemMessage]);
      } else {
        // 일반 상담 모드에서는 AI 시작 메시지 표시
        const welcomeMessage: Message = {
          sender: 'ai',
          content: '안녕하세요, 어떤 건강 관련 질문이 있으신가요? 심장 건강, 혈압, 수면 등에 관해 물어보실 수 있습니다.',
          timestamp: new Date().toISOString()
        };
        setMessages([welcomeMessage]);
      }
    }
  }, [open, initialMessage, mode, healthData]);

  useEffect(() => {
    // 스크롤을 항상 아래로 유지
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen && onClose) {
      onClose();
    }
  };

  const handleSendMessage = async () => {
    if (input.trim() === '') return;
    
    const userMessage: Message = {
      sender: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      let aiResponse = '';
      
      // HAIM 멀티모달 AI 모델 사용
      if (mode === 'diagnosis' && healthData) {
        try {
          // ECG, 심박수, 산소포화도 데이터 준비
          const ecgData = healthData.ecgData || [];
          const heartRates = healthData.heartRates || [healthData.heartRate || 72];
          const oxygenLevels = healthData.oxygenLevels || [healthData.oxygenLevel || 98];
          
          const haimQuery = input.toLowerCase();
          
          // 키워드에 따라 다른 AI 애널리틱스 API 호출
          if (haimQuery.includes('멀티모달') || 
              haimQuery.includes('haim') || 
              haimQuery.includes('심근경색') || 
              haimQuery.includes('위험도')) {
            // 심근경색 위험도 평가 API 호출
            const response = await apiRequest('/api/analysis/cardiac-risk', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                ecgData,
                heartRates,
                oxygenLevels
              }),
            });
            
            if (!response.ok) {
              throw new Error(`HAIM 위험도 평가 API 오류: ${response.status}`);
            }
            
            const riskData = await response.json();
            
            // 심근경색 위험 평가 결과 포맷팅
            aiResponse = `**AI 헬퍼 멀티모달 AI 분석 결과**\n\n`;
            aiResponse += `심근경색 위험도: ${riskData.riskScore}% (신뢰도: ${Math.round(riskData.confidence * 100)}%)\n\n`;
            
            if (riskData.factors && riskData.factors.length > 0) {
              aiResponse += `주요 위험 요인:\n`;
              riskData.factors.slice(0, 3).forEach((factor: any) => {
                aiResponse += `• ${factor.factor}: ${Math.round(factor.contribution)}% 기여 (${Math.round(factor.confidence * 100)}% 신뢰도)\n`;
                if (factor.description) {
                  aiResponse += `  ${factor.description}\n`;
                }
              });
              aiResponse += `\n`;
            }
            
            aiResponse += `${riskData.interpretation}`;
          } else {
            // 일반 AI 헬퍼 메시지 생성 API 호출
            const stDeviation = healthData.stDeviation || 0;
            const arrhythmia = healthData.arrhythmia || { detected: false, type: null };
            
            const response = await apiRequest('/api/analysis/helper-message', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                ecgData,
                heartRates,
                oxygenLevels,
                riskScore: healthData.riskLevel || 20,
                stDeviation,
                arrhythmia
              }),
            });
            
            if (!response.ok) {
              throw new Error(`HAIM 헬퍼 메시지 API 오류: ${response.status}`);
            }
            
            const helperData = await response.json();
            aiResponse = helperData.message;
          }
        } catch (haimError) {
          console.error('HAIM AI 분석 오류:', haimError);
          // HAIM API 오류 시 기본 응답으로 폴백
          aiResponse = generateHealthDiagnosis(input, healthData);
        }
      } else {
        // 간단한 딜레이 추가하여 모델 추론 과정 에뮬레이션
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // 컨텍스트 생성
        const context = messages.map(m => `${m.sender === 'user' ? '사용자' : 'AI'}: ${m.content}`).join('\n');
        
        // 일반 상담 모드
        aiResponse = generateHealthConsultation(input, context);
      }
      
      const aiMessage: Message = {
        sender: 'ai',
        content: aiResponse,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error('AI Chat Error:', err);
      setError('AI 응답 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
      
      // 에러 시에도 자동 응답 메시지 생성
      const errorMessage: Message = {
        sender: 'ai',
        content: '죄송합니다. 현재 AI 서비스 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        variant: "destructive",
        title: "AI 응답 오류",
        description: "서비스 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.",
      });
    } finally {
      setLoading(false);
      // 입력 필드에 포커스
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      
      <DialogContent className="sm:max-w-[500px] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'diagnosis' ? (
              <BrainCircuit className="h-5 w-5 text-red-500" />
            ) : (
              <Bot className="h-5 w-5 text-primary" />
            )}
            {title}
            <Badge className="ml-2" variant={mode === 'diagnosis' ? "destructive" : "outline"}>
              {mode === 'diagnosis' ? 'AI 헬퍼' : 'AI'}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {mode === 'diagnosis' 
              ? "멀티모달 AI 분석을 통한 심장 건강 진단을 제공합니다. '심근경색', '위험도', 'HAIM' 등의 키워드로 상세 분석을 요청하세요." 
              : description}
          </DialogDescription>
        </DialogHeader>

        {mode === 'diagnosis' && healthData && (
          <Card className="mb-4 bg-red-50 border-red-200">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <BrainCircuit className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-red-800">AI 헬퍼 멀티모달 데이터</h4>
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-red-700">심박수:</span>
                      <span className="text-xs font-medium">{healthData.heartRate || '--'} bpm</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-red-700">산소포화도:</span>
                      <span className="text-xs font-medium">{healthData.oxygenLevel || '--'}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-red-700">ECG 샘플:</span>
                      <span className="text-xs font-medium">{healthData.ecgData ? 
                        healthData.ecgData.length : 0} 개</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-red-700">ST 편향:</span>
                      <span className="text-xs font-medium">{
                        healthData.stDeviation ? 
                        healthData.stDeviation.toFixed(2) : '--'} mV</span>
                    </div>
                  </div>
                  <p className="text-xs text-red-700 mt-1">
                    멀티모달 AI가 ECG, 심박수, 산소포화도 데이터를 통합 분석합니다.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <ScrollArea className="flex-1 p-4 bg-gray-50 rounded-md">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex gap-3",
                  message.sender === 'user' ? "justify-end" : "justify-start"
                )}
              >
                {message.sender === 'ai' && (
                  <Avatar className={cn(
                    "h-8 w-8 flex items-center justify-center", 
                    mode === 'diagnosis' ? "bg-red-100" : "bg-primary/10"
                  )}>
                    {mode === 'diagnosis' ? (
                      <BrainCircuit className="h-4 w-4 text-red-500" />
                    ) : (
                      <Bot className="h-4 w-4 text-primary" />
                    )}
                  </Avatar>
                )}
                
                <div
                  className={cn(
                    "p-3 rounded-lg max-w-[70%]",
                    message.sender === 'user'
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <div
                    className={cn(
                      "text-xs mt-1",
                      message.sender === 'user'
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    )}
                  >
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                
                {message.sender === 'user' && (
                  <Avatar className="h-8 w-8 bg-primary flex items-center justify-center">
                    <span className="text-xs font-medium text-primary-foreground">나</span>
                  </Avatar>
                )}
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start gap-3">
                <Avatar className={cn(
                  "h-8 w-8 flex items-center justify-center", 
                  mode === 'diagnosis' ? "bg-red-100" : "bg-primary/10"
                )}>
                  {mode === 'diagnosis' ? (
                    <BrainCircuit className="h-4 w-4 text-red-500" />
                  ) : (
                    <Bot className="h-4 w-4 text-primary" />
                  )}
                </Avatar>
                <div className="bg-muted p-3 rounded-lg max-w-[70%] flex items-center gap-2">
                  <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                  <p className="text-sm text-muted-foreground">
                    {mode === 'diagnosis' ? 'AI 헬퍼 멀티모달 분석 중...' : '응답 생성 중...'}
                  </p>
                </div>
              </div>
            )}
            
            {error && (
              <div className="flex justify-center">
                <div className="bg-destructive/10 text-destructive text-sm p-2 rounded-md flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="pt-4">
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="메시지를 입력하세요..."
              disabled={loading}
              className="flex-1"
            />
            <Button 
              size="icon" 
              onClick={handleSendMessage} 
              disabled={loading || input.trim() === ''}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground justify-center">
            <AlertTriangle className="h-3 w-3" />
            <span>
              {mode === 'diagnosis' 
                ? 'AI 헬퍼 분석 결과는 의학적 진단을 대체하지 않습니다. 전문가와 상담하세요.' 
                : 'AI 응답은 의학적 조언을 대체하지 않습니다. 의료 전문가와 상담하세요.'}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}