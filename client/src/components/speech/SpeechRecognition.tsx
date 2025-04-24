import React, { useState } from 'react';
import { Mic } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface SpeechRecognitionProps {
  onTranscript: (text: string) => void;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "ghost";
  className?: string;
}

const SpeechRecognition: React.FC<SpeechRecognitionProps> = ({ 
  onTranscript, 
  size = "icon", 
  variant = "ghost",
  className = ""
}) => {
  const [isListening, setIsListening] = useState(false);
  const { toast } = useToast();

  const startListening = () => {
    setIsListening(true);
    
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      // @ts-ignore - TypeScript doesn't have types for the Web Speech API
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = 'ko-KR';
      recognition.continuous = false;
      recognition.interimResults = false;
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onTranscript(transcript);
        setIsListening(false);
        
        toast({
          title: "음성 인식 완료",
          description: transcript,
        });
      };
      
      recognition.onerror = (event: any) => {
        toast({
          title: "음성 인식 오류",
          description: "음성을 인식하지 못했습니다. 다시 시도해주세요.",
          variant: "destructive",
        });
        setIsListening(false);
      };
      
      recognition.start();
    } else {
      toast({
        title: "지원되지 않는 기능",
        description: "이 브라우저는 음성 인식을 지원하지 않습니다.",
        variant: "destructive",
      });
      setIsListening(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={startListening}
      disabled={isListening}
      className={`${className} ${isListening ? 'animate-pulse' : ''}`}
      type="button"
      aria-label="음성 인식 시작"
    >
      <Mic className={`h-4 w-4 ${isListening ? 'text-primary' : ''}`} />
    </Button>
  );
};

export default SpeechRecognition;