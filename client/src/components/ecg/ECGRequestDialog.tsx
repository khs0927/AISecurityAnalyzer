import { useState } from "react";
import { Activity, Check, ChevronRight, Info, Loader2 } from "lucide-react";
import { generateECG, ECGPattern } from "@/lib/ecgSimulator";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import SpeechRecognition from "../speech/SpeechRecognition";

interface ECGRequestDialogProps {
  trigger: React.ReactNode;
  onComplete?: (data: any) => void;
}

const steps = [
  {
    id: "request",
    title: "ECG 측정 요청",
    description: "환자에게 ECG 측정을 요청합니다."
  },
  {
    id: "prepare",
    title: "측정 준비",
    description: "스마트워치나 측정 장비를 준비합니다."
  },
  {
    id: "measure",
    title: "ECG 측정 중",
    description: "손목에 착용한 상태에서 30초 동안 측정합니다."
  },
  {
    id: "analyze",
    title: "결과 분석",
    description: "측정된 ECG 데이터를 분석합니다."
  },
  {
    id: "complete",
    title: "측정 완료",
    description: "ECG 측정이 완료되었습니다."
  }
];

export default function ECGRequestDialog({ trigger, onComplete }: ECGRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [ecgData, setEcgData] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notes, setNotes] = useState("");

  const simulateECGMeasurement = () => {
    setIsProcessing(true);
    setProgress(0);
    
    // 진행 상태 시뮬레이션
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 2;
        
        if (newProgress >= 100) {
          clearInterval(interval);
          
          // ECG 측정 완료
          const ecgPattern = Math.random() > 0.8 ? ECGPattern.ST_ELEVATION : ECGPattern.NORMAL;
          const simulatedEcgData = generateECG({ pattern: ecgPattern });
          setEcgData(simulatedEcgData);
          
          // 측정 완료 후 분석 단계로 이동
          setTimeout(() => {
            setCurrentStep(3);
            
            // 분석 단계 시뮬레이션
            setTimeout(() => {
              setCurrentStep(4);
              setIsProcessing(false);
              
              if (onComplete) {
                onComplete({
                  data: simulatedEcgData,
                  timestamp: new Date(),
                  pattern: ecgPattern,
                  notes
                });
              }
            }, 2000);
          }, 1000);
          
          return 100;
        }
        
        return newProgress;
      });
    },
    300);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      
      // 측정 단계일 경우 ECG 측정 시뮬레이션 시작
      if (currentStep === 1) {
        simulateECGMeasurement();
      }
    } else {
      // 완료 단계에서는 다이얼로그 닫기
      setOpen(false);
      setCurrentStep(0);
      setProgress(0);
      setIsProcessing(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 0 && !isProcessing) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setCurrentStep(0);
    setProgress(0);
    setIsProcessing(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>ECG 측정 요청</DialogTitle>
          <DialogDescription>
            환자의 ECG를 측정하기 위한 단계별 진행 가이드입니다.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {/* 진행 단계 표시 */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">진행 단계</span>
              <span className="text-sm text-gray-500">{currentStep + 1}/{steps.length}</span>
            </div>
            <Progress value={(currentStep / (steps.length - 1)) * 100} className="h-2" />
          </div>
          
          {/* 현재 단계 내용 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">{steps[currentStep].title}</h3>
            <p className="text-gray-600">{steps[currentStep].description}</p>
            
            {currentStep === 0 && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-blue-700 mb-1">ECG 측정이란?</h4>
                    <p className="text-sm text-blue-700">
                      심전도(ECG)는 심장의 전기적 활동을 기록하는 검사입니다. 
                      스마트워치를 통해 간편하게 측정할 수 있으며, 심장 리듬 이상이나 
                      심근경색과 같은 문제를 조기에 발견하는 데 도움이 됩니다.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {currentStep === 1 && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <span>손목을 씻고 건조시키세요.</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <span>스마트워치를 손목에 단단히 착용하세요.</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <span>편안한 자세로 앉거나 누우세요.</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <span>측정 중에는 움직이지 마세요.</span>
                </div>
              </div>
            )}
            
            {currentStep === 2 && (
              <div className="mt-4">
                <div className="h-24 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                  {isProcessing ? (
                    <div className="text-center">
                      <Activity className="h-8 w-8 text-primary mx-auto animate-pulse mb-2" />
                      <div className="text-sm text-gray-500">ECG 측정 중... {progress}%</div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500">
                      <Activity className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                      <div>ECG 그래프가 여기에 표시됩니다</div>
                    </div>
                  )}
                </div>
                <Progress value={progress} className="h-2 mb-2" />
                <div className="text-center text-sm text-gray-500">
                  {isProcessing ? "측정 중입니다. 움직이지 마세요..." : "측정 준비 중입니다."}
                </div>
              </div>
            )}
            
            {currentStep === 3 && (
              <div className="mt-4 text-center">
                <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin mb-4" />
                <p>ECG 데이터를 분석 중입니다...</p>
              </div>
            )}
            
            {currentStep === 4 && (
              <div className="mt-4">
                <div className="p-4 bg-green-50 rounded-lg mb-4">
                  <div className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    <span className="font-medium text-green-800">측정이 완료되었습니다</span>
                  </div>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="notes" className="block text-sm font-medium mb-1">측정 메모 (선택사항)</label>
                  <div className="flex">
                    <textarea
                      id="notes"
                      rows={3}
                      placeholder="측정 시 특이사항이나 환자 상태에 대한 메모를 입력하세요."
                      className="w-full text-sm p-2 border rounded-md"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    ></textarea>
                    <SpeechRecognition 
                      onTranscript={(text) => setNotes(prev => prev + ' ' + text)}
                      className="ml-2 self-start"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter className="flex justify-between">
          {currentStep > 0 && currentStep < 4 && !isProcessing ? (
            <Button variant="outline" onClick={handleBack}>이전</Button>
          ) : (
            <div></div>
          )}
          
          {currentStep < 4 ? (
            <Button onClick={handleNext} disabled={isProcessing && currentStep < 3}>
              {isProcessing && currentStep === 2 ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  측정 중...
                </>
              ) : (
                <>
                  다음
                  <ChevronRight className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleClose}>
              완료
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}