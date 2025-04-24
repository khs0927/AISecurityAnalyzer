import { useState } from "react";
import { X, Plus, Camera, Mic, Search, X as Close } from "lucide-react";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface MedicalInfoEditDialogProps {
  trigger: React.ReactNode;
  patient: any;
  onSave?: (updatedInfo: any) => void;
}

export default function MedicalInfoEditDialog({ 
  trigger, 
  patient,
  onSave 
}: MedicalInfoEditDialogProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("conditions");
  const [medications, setMedications] = useState<string[]>(
    patient?.medications?.split(", ") || []
  );
  const [conditions, setConditions] = useState<string[]>(
    patient?.medicalConditions || []
  );
  const [newMedication, setNewMedication] = useState("");
  const [newCondition, setNewCondition] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speechInput, setSpeechInput] = useState("");

  const handleAddMedication = () => {
    if (newMedication.trim()) {
      setMedications([...medications, newMedication.trim()]);
      setNewMedication("");
    }
  };
  
  const handleRemoveMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleAddCondition = () => {
    if (newCondition.trim()) {
      setConditions([...conditions, newCondition.trim()]);
      setNewCondition("");
    }
  };

  const handleRemoveCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const startSpeechRecognition = (target: 'medication' | 'condition') => {
    setIsListening(true);
    
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      // @ts-ignore
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = 'ko-KR';
      recognition.continuous = false;
      recognition.interimResults = false;
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (target === 'medication') {
          setNewMedication(transcript);
        } else {
          setNewCondition(transcript);
        }
        setSpeechInput(transcript);
        setIsListening(false);
      };
      
      recognition.onerror = () => {
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

  const handleOpenPrescriptionScanner = () => {
    toast({
      title: "처방전 스캔",
      description: "처방전 스캔 기능이 시작됩니다. 카메라를 허용해주세요.",
    });
    // 실제 구현 시에는 카메라 접근 및 OpenCV 처리 로직 추가
  };

  const handleSave = () => {
    const updatedInfo = {
      ...patient,
      medications: medications.join(", "),
      medicalConditions: conditions
    };
    
    if (onSave) {
      onSave(updatedInfo);
    }
    
    toast({
      title: "저장 완료",
      description: "의료 정보가 업데이트되었습니다.",
    });
    
    setOpen(false);
  };

  const openPillShapeSearch = () => {
    // 약 모양 검색 사이트를 팝업으로 열기
    window.open('https://www.health.kr/searchIdentity/search.asp', '약 모양으로 검색', 'width=400,height=600');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl">의료 정보 수정</DialogTitle>
          <DialogDescription>
            환자의 의료 정보를 수정하고 저장하세요. 필요한 정보를 입력하거나 선택할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="conditions" className="text-base">병력</TabsTrigger>
            <TabsTrigger value="medications" className="text-base">복용 약물</TabsTrigger>
          </TabsList>
          
          <TabsContent value="conditions" className="pt-4">
            <ScrollArea className="h-[280px] pr-4">
              <div className="space-y-2">
                <Label htmlFor="conditions" className="text-base font-medium">현재 병력</Label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {conditions.length === 0 ? (
                    <p className="text-sm text-gray-500">등록된 병력이 없습니다.</p>
                  ) : (
                    conditions.map((condition, index) => (
                      <Badge 
                        key={index} 
                        variant="outline"
                        className="group text-base py-1 pl-3 pr-2 hover:bg-red-50 transition-colors duration-200"
                      >
                        {condition}
                        <button 
                          onClick={() => handleRemoveCondition(index)}
                          className="ml-1 p-0.5 rounded-full opacity-0 group-hover:opacity-100 group-hover:text-red-500 transition-opacity duration-200"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </Badge>
                    ))
                  )}
                </div>
                
                <Label htmlFor="newCondition" className="text-base font-medium">병력 추가</Label>
                <div className="flex items-center mt-1">
                  <Input
                    id="newCondition"
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value)}
                    placeholder="새로운 병력을 입력하세요"
                    className="flex-1 text-base"
                  />
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => startSpeechRecognition('condition')}
                    disabled={isListening}
                    className="ml-2"
                  >
                    <Mic className={`h-5 w-5 ${isListening ? 'text-primary animate-pulse' : ''}`} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleAddCondition}
                    disabled={!newCondition.trim()}
                    className="ml-2"
                  >
                    <Plus className="h-5 w-5" />
                    추가
                  </Button>
                </div>
                
                <div className="mt-6">
                  <h3 className="text-base font-medium mb-2">자주 사용되는 병력</h3>
                  <div className="flex flex-wrap gap-2">
                    {['고혈압', '당뇨', '고지혈증', '심방세동', '심부전', '관상동맥질환', '뇌졸중'].map((cond) => (
                      <Badge 
                        key={cond}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary/10"
                        onClick={() => {
                          if (!conditions.includes(cond)) {
                            setConditions([...conditions, cond]);
                          }
                        }}
                      >
                        {cond}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="medications" className="pt-4">
            <ScrollArea className="h-[280px] pr-4">
              <div className="space-y-2">
                <Label htmlFor="medications" className="text-base font-medium">현재 복용 약물</Label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {medications.length === 0 ? (
                    <p className="text-sm text-gray-500">등록된 약물이 없습니다.</p>
                  ) : (
                    medications.map((medication, index) => (
                      <Badge 
                        key={index} 
                        variant="outline"
                        className="group text-base py-1 pl-3 pr-2 hover:bg-red-50 transition-colors duration-200"
                      >
                        {medication}
                        <button 
                          onClick={() => handleRemoveMedication(index)}
                          className="ml-1 p-0.5 rounded-full opacity-0 group-hover:opacity-100 group-hover:text-red-500 transition-opacity duration-200"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </Badge>
                    ))
                  )}
                </div>
                
                <Label htmlFor="newMedication" className="text-base font-medium">약물 추가</Label>
                <div className="flex items-center mt-1">
                  <Input
                    id="newMedication"
                    value={newMedication}
                    onChange={(e) => setNewMedication(e.target.value)}
                    placeholder="새로운 약물을 입력하세요"
                    className="flex-1 text-base"
                  />
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => startSpeechRecognition('medication')}
                    disabled={isListening}
                    className="ml-2"
                  >
                    <Mic className={`h-5 w-5 ${isListening ? 'text-primary animate-pulse' : ''}`} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleAddMedication}
                    disabled={!newMedication.trim()}
                    className="ml-2"
                  >
                    <Plus className="h-5 w-5" />
                    추가
                  </Button>
                </div>
                
                <div className="mt-6 space-y-4">
                  <div>
                    <h3 className="text-base font-medium mb-2">약물 추가 방법</h3>
                    <div className="grid grid-cols-3 gap-2">
                      <Button 
                        variant="outline" 
                        onClick={handleOpenPrescriptionScanner}
                        className="flex flex-col h-auto py-3"
                      >
                        <Camera className="h-8 w-8 mb-1" />
                        <span className="text-xs">처방전 스캔</span>
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={openPillShapeSearch}
                        className="flex flex-col h-auto py-3"
                      >
                        <Search className="h-8 w-8 mb-1" />
                        <span className="text-xs">모양으로 검색</span>
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => { /* 직접 입력 기능은 이미 위에 있음 */ }}
                        className="flex flex-col h-auto py-3"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-1">
                          <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
                          <path d="M9 22v-4h6v4" />
                          <circle cx="10" cy="7" r="1" />
                          <circle cx="14" cy="7" r="1" />
                          <path d="M7.5 15a6.5 6.5 0 0 0 9 0" />
                        </svg>
                        <span className="text-xs">직접 입력</span>
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-base font-medium mb-2">자주 사용되는 약물</h3>
                    <div className="flex flex-wrap gap-2">
                      {['아스피린', '리피토', '아토반', '메트포민', '암로디핀', '울트라셋'].map((med) => (
                        <Badge 
                          key={med}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary/10"
                          onClick={() => {
                            if (!medications.includes(med)) {
                              setMedications([...medications, med]);
                            }
                          }}
                        >
                          {med}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
          <Button onClick={handleSave}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}