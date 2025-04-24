import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Camera, Search, Pill, FileText, Circle, Square, Triangle, Heart } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import SafeImage from "@/components/ui/SafeImage";

// 데이터베이스 연결 문제가 해결될 때까지 클라이언트 측에서 직접 약물 데이터를 사용
const mockMedicationData = [
  {
    id: 'k1',
    name: '아스피린프로텍트정100밀리그램',
    genericName: '아세틸살리실산',
    category: '진통제/해열제/항혈소판제',
    dosage: '100mg',
    form: '장용정제',
    shape: '원형',
    color: '흰색',
    manufacturer: '바이엘코리아',
    description: '혈소판 응집 억제제로, 심근경색 및 뇌졸중 등 혈전성 질환의 예방 및 치료에 사용됩니다.',
    sideEffects: ['위장 장애', '구역질', '출혈 위험 증가', '소화성 궤양'],
    interactions: ['와파린', '이부프로펜', '알코올', '메토트렉세이트'],
    prescriptionRequired: false,
    image: '/pill_images/aspirin.png'
  },
  {
    id: 'k2',
    name: '리피토정10밀리그램',
    genericName: '아토르바스타틴칼슘삼수화물',
    category: '고지혈증 치료제',
    dosage: '10mg',
    form: '필름코팅정',
    shape: '타원형',
    color: '흰색',
    manufacturer: '한국화이자제약',
    description: 'HMG-CoA 환원효소 저해제로, 고콜레스테롤혈증 및 관상동맥질환 위험 감소에 사용됩니다.',
    sideEffects: ['근육통', '간 효소 증가', '소화 불량', '두통', '관절통'],
    interactions: ['에리스로마이신', '자몽 주스', '사이클로스포린', '페노피브레이트'],
    prescriptionRequired: true,
    image: '/pill_images/lipitor.png'
  },
  {
    id: 'k3',
    name: '노바스크정5밀리그램',
    genericName: '암로디핀베실산염',
    category: '칼슘채널차단제',
    dosage: '5mg',
    form: '필름코팅정',
    shape: '팔각형',
    color: '연노란색',
    manufacturer: '한국화이자제약',
    description: '칼슘 채널 차단제로, 고혈압 및 협심증 치료에 사용됩니다.',
    sideEffects: ['안면홍조', '두통', '부종', '현기증', '피로'],
    interactions: ['심바스타틴', '자몽 주스', '다른 혈압 강하제'],
    prescriptionRequired: true,
    image: '/pill_images/norvasc.png'
  },
  {
    id: 'k4',
    name: '콘서타OROS서방정18밀리그램',
    genericName: '메틸페니데이트염산염',
    category: '중추신경 자극제',
    dosage: '18mg',
    form: 'OROS 서방정',
    shape: '원통형',
    color: '노란색',
    manufacturer: '한국얀센',
    description: '주의력결핍 과잉행동장애(ADHD) 치료에 사용됩니다.',
    sideEffects: ['식욕감소', '불면증', '두통', '구강건조', '복통'],
    interactions: ['MAO 억제제', '와파린', '항고혈압제'],
    prescriptionRequired: true,
    image: '/pill_images/concerta.png'
  },
  {
    id: 'k8',
    name: '타이레놀정500밀리그램',
    genericName: '아세트아미노펜',
    category: '해열진통제',
    dosage: '500mg',
    form: '정제',
    shape: '장방형',
    color: '흰색',
    manufacturer: '한국얀센',
    description: '해열 및 진통 작용이 있어 두통, 치통, 근육통, 생리통 등의 통증과 발열에 사용됩니다.',
    sideEffects: ['간 손상(과량 복용 시)', '알레르기 반응', '두드러기'],
    interactions: ['알코올', '와파린', '항경련제'],
    prescriptionRequired: false,
    image: '/pill_images/tylenol.png'
  }
];

interface Medication {
  id: string;
  name: string;
  genericName: string;
  category: string;
  dosage: string;
  form: string;
  shape: string;
  color: string;
  manufacturer: string;
  description: string;
  sideEffects: string[];
  interactions: string[];
  prescriptionRequired: boolean;
  image: string;
}

const pillShapes = [
  { id: 'round', name: '원형', icon: <Circle size={20} /> },
  { id: 'oval', name: '타원형', icon: <Pill size={20} /> },
  { id: 'rectangular', name: '직사각형', icon: <Square size={20} /> },
  { id: 'triangular', name: '삼각형', icon: <Triangle size={20} /> },
  { id: 'heart', name: '하트형', icon: <Heart size={20} /> },
  { id: 'diamond', name: '다이아몬드형', icon: <div className="rotate-45 bg-current w-4 h-4" /> },
];

const pillColors = [
  { id: 'white', name: '흰색', class: 'bg-white border border-gray-200' },
  { id: 'yellow', name: '노란색', class: 'bg-yellow-300' },
  { id: 'orange', name: '주황색', class: 'bg-orange-400' },
  { id: 'red', name: '빨간색', class: 'bg-red-500' },
  { id: 'pink', name: '분홍색', class: 'bg-pink-400' },
  { id: 'purple', name: '보라색', class: 'bg-purple-500' },
  { id: 'blue', name: '파란색', class: 'bg-blue-500' },
  { id: 'green', name: '초록색', class: 'bg-green-500' },
  { id: 'brown', name: '갈색', class: 'bg-amber-800' },
  { id: 'gray', name: '회색', class: 'bg-gray-400' },
  { id: 'black', name: '검은색', class: 'bg-gray-900' },
];

const MedicationSearch = () => {
  const { toast } = useToast();
  const [searchTab, setSearchTab] = useState('name');
  const [nameQuery, setNameQuery] = useState('');
  const [selectedShape, setSelectedShape] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<Medication[]>([]);

  // 클라이언트 측에서 검색 로직 구현 
  const [nameSearchLoading, setNameSearchLoading] = useState(false);
  const [nameSearchResults, setNameSearchResults] = useState<Medication[]>([]);
  const [shapeSearchLoading, setShapeSearchLoading] = useState(false);
  const [shapeSearchResults, setShapeSearchResults] = useState<Medication[]>([]);
  
  // 이름으로 검색 
  useEffect(() => {
    if (nameQuery.length < 2) {
      setNameSearchResults([]);
      return;
    }
    
    setNameSearchLoading(true);
    
    // 클라이언트 측에서 이름으로 검색 수행
    const searchByName = () => {
      const nameStr = nameQuery.toLowerCase();
      const simpleNameStr = nameStr.replace(/\d+밀리그램$|\d+mg$/i, "").trim();
      
      const results = mockMedicationData.filter(med => 
        med.name.toLowerCase().includes(nameStr) || 
        med.genericName.toLowerCase().includes(nameStr) ||
        med.name.toLowerCase().includes(simpleNameStr) ||
        med.genericName.toLowerCase().includes(simpleNameStr)
      );
      
      setNameSearchResults(results);
      setNameSearchLoading(false);
    };
    
    // API 호출 시뮬레이션 
    const timer = setTimeout(() => {
      searchByName();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [nameQuery]);
  
  // 모양 및 색상으로 검색
  useEffect(() => {
    if (!selectedShape && !selectedColor) {
      setShapeSearchResults([]);
      return;
    }
    
    setShapeSearchLoading(true);
    
    // 클라이언트 측에서 모양과 색상으로 검색 수행
    const searchByShapeAndColor = () => {
      let results = [...mockMedicationData];
      
      if (selectedShape) {
        const shapeStr = selectedShape.toLowerCase();
        // 모양 ID를 실제 한글 모양명으로 변환 (예: 'round' → '원형')
        const shapeNameMap: Record<string, string> = {
          'round': '원형',
          'oval': '타원형',
          'rectangular': '직사각형',
          'triangular': '삼각형',
          'heart': '하트형',
          'diamond': '다이아몬드형'
        };
        
        const shapeName = shapeNameMap[shapeStr] || shapeStr;
        results = results.filter(med => 
          med.shape.toLowerCase() === shapeName.toLowerCase()
        );
      }
      
      if (selectedColor) {
        const colorStr = selectedColor.toLowerCase();
        // 색상 ID를 실제 한글 색상명으로 변환 (예: 'white' → '흰색')
        const colorNameMap: Record<string, string> = {
          'white': '흰색',
          'yellow': '노란색',
          'orange': '주황색',
          'red': '빨간색',
          'pink': '분홍색',
          'purple': '보라색',
          'blue': '파란색',
          'green': '초록색',
          'brown': '갈색',
          'gray': '회색',
          'black': '검은색'
        };
        
        const colorName = colorNameMap[colorStr] || colorStr;
        results = results.filter(med => 
          med.color.toLowerCase() === colorName.toLowerCase()
        );
      }
      
      setShapeSearchResults(results);
      setShapeSearchLoading(false);
    };
    
    // API 호출 시뮬레이션 
    const timer = setTimeout(() => {
      searchByShapeAndColor();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [selectedShape, selectedColor]);

  // 이미지 핸들러 함수
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // 처방전 스캔 함수 (클라이언트 측 시뮬레이션)
  const handleScanPrescription = async () => {
    if (!selectedImage) {
      toast({
        title: "이미지 필요",
        description: "처방전 이미지를 먼저 업로드해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsScanning(true);
    setScanResults([]);

    try {
      // 처방전 인식 API 호출 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 지연으로 처리 시간 시뮬레이션
      
      // 가상의 처방전 인식 결과 (데모용 데이터)
      const mockPrescription = {
        hospitalName: "서울메디컬센터",
        doctorName: "김의사",
        patientName: "홍길동",
        patientID: "123456789",
        prescriptionDate: "2025-04-01",
        medications: [
          {
            id: 'k1',
            name: '아스피린프로텍트정100밀리그램',
            genericName: '아세틸살리실산',
            dosage: '100mg',
            instructions: '1일 1회 1정, 식후 30분',
            duration: '90일분'
          },
          {
            id: 'k3',
            name: '노바스크정5밀리그램',
            genericName: '암로디핀베실산염',
            dosage: '5mg',
            instructions: '1일 1회 1정, 아침 식전',
            duration: '30일분'
          }
        ]
      };
      
      // 약품 데이터 매칭 및 결과 생성
      const scanResultsData = mockPrescription.medications.map(med => {
        const matchedMed = mockMedicationData.find(m => m.id === med.id);
        if (!matchedMed) return null;
        
        return {
          ...matchedMed,
          instructions: med.instructions,
          duration: med.duration
        };
      }).filter(Boolean) as Medication[];
      
      setScanResults(scanResultsData);
      toast({
        title: "스캔 완료",
        description: `처방전이 성공적으로 스캔되었습니다. ${scanResultsData.length}개의 약품이 인식되었습니다.`,
      });
      
    } catch (error) {
      console.error('처방전 스캔 오류:', error);
      toast({
        title: "오류 발생",
        description: "처방전 스캔 중 문제가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  // 약 세부 정보 표시 컴포넌트
  const MedicationDetail = ({ medication }: { medication: Medication }) => (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{medication.name}</CardTitle>
            <p className="text-sm text-gray-500">{medication.genericName}</p>
          </div>
          <Badge variant={medication.prescriptionRequired ? "destructive" : "outline"}>
            {medication.prescriptionRequired ? '처방필요' : '일반의약품'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="bg-[#f8fafb] rounded-lg p-3 mb-3">
              <h3 className="text-sm font-medium mb-2">기본 정보</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-500">분류</div>
                <div>{medication.category}</div>
                <div className="text-gray-500">용량</div>
                <div>{medication.dosage}</div>
                <div className="text-gray-500">제형</div>
                <div>{medication.form}</div>
                <div className="text-gray-500">제조사</div>
                <div>{medication.manufacturer}</div>
                <div className="text-gray-500">모양</div>
                <div>{medication.shape}</div>
                <div className="text-gray-500">색상</div>
                <div>{medication.color}</div>
              </div>
            </div>
            
            <p className="text-sm mb-3">{medication.description}</p>
            
            <div>
              <h3 className="text-sm font-medium mb-1">부작용</h3>
              <div className="flex flex-wrap gap-1 mb-3">
                {medication.sideEffects.map((effect, idx) => (
                  <Badge key={idx} variant="secondary" className="bg-red-50 text-red-600 hover:bg-red-100">
                    {effect}
                  </Badge>
                ))}
              </div>
              
              <h3 className="text-sm font-medium mb-1">상호작용</h3>
              <div className="flex flex-wrap gap-1">
                {medication.interactions.map((interaction, idx) => (
                  <Badge key={idx} variant="secondary" className="bg-amber-50 text-amber-600 hover:bg-amber-100">
                    {interaction}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex justify-center">
            <div className="w-full max-w-[200px] aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
              {medication.image ? (
                <SafeImage 
                  src={medication.image}
                  alt={medication.name}
                  className="max-w-full max-h-full object-contain rounded-lg"
                  fallbackText="약품 이미지를 불러올 수 없습니다"
                  width="100%"
                  height="100%"
                />
              ) : (
                <div className="text-gray-400 text-center p-4">
                  <Pill size={64} className="mx-auto mb-2 opacity-25" />
                  <p className="text-sm">이미지 없음</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <Separator className="my-4" />
        
        <div className="flex justify-end">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              toast({
                title: "약품 추가됨",
                description: `${medication.name}이(가) 나의 약물 목록에 추가되었습니다.`,
              });
            }}
          >
            나의 약물에 추가
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">약물 검색</h1>
      
      <Tabs defaultValue={searchTab} className="mb-6" onValueChange={setSearchTab}>
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="name" className="flex items-center gap-2">
            <Search size={16} />
            <span>이름으로 검색</span>
          </TabsTrigger>
          <TabsTrigger value="shape" className="flex items-center gap-2">
            <Pill size={16} />
            <span>모양으로 검색</span>
          </TabsTrigger>
          <TabsTrigger value="prescription" className="flex items-center gap-2">
            <FileText size={16} />
            <span>처방전 스캔</span>
          </TabsTrigger>
        </TabsList>
        
        {/* 이름으로 검색 */}
        <TabsContent value="name">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">약물 이름으로 검색</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-6">
                <Input 
                  placeholder="약품명 또는 성분명을 입력하세요" 
                  value={nameQuery}
                  onChange={(e) => setNameQuery(e.target.value)}
                />
                <Button 
                  variant="default" 
                  className="shrink-0"
                  disabled={nameQuery.length < 2}
                >
                  <Search size={20} />
                </Button>
              </div>
              
              {nameSearchLoading && (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              )}
              
              {nameSearchResults && nameSearchResults.length > 0 ? (
                <div>
                  {nameSearchResults.map(med => (
                    <MedicationDetail key={med.id} medication={med} />
                  ))}
                </div>
              ) : nameQuery.length > 1 && !nameSearchLoading ? (
                <div className="text-center py-8 text-gray-500">
                  <p>검색 결과가 없습니다.</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 모양으로 검색 */}
        <TabsContent value="shape">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">약물 모양으로 검색</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-2">모양 선택</h3>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {pillShapes.map(shape => (
                    <Button
                      key={shape.id}
                      variant={selectedShape === shape.id ? "default" : "outline"}
                      className="flex flex-col items-center py-3 h-auto"
                      onClick={() => setSelectedShape(prev => prev === shape.id ? null : shape.id)}
                    >
                      {shape.icon}
                      <span className="mt-1 text-xs">{shape.name}</span>
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-2">색상 선택</h3>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {pillColors.map(color => (
                    <Button
                      key={color.id}
                      variant="outline"
                      className={`p-1 h-12 relative ${selectedColor === color.id ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                      onClick={() => setSelectedColor(prev => prev === color.id ? null : color.id)}
                    >
                      <div className={`w-full h-full rounded-sm ${color.class}`}></div>
                      <span className="absolute bottom-0 text-[10px] bg-white/80 w-full text-center rounded-b-sm">
                        {color.name}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
              
              {shapeSearchLoading && (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              )}
              
              {shapeSearchResults && shapeSearchResults.length > 0 ? (
                <div>
                  {shapeSearchResults.map(med => (
                    <MedicationDetail key={med.id} medication={med} />
                  ))}
                </div>
              ) : (selectedShape || selectedColor) && !shapeSearchLoading ? (
                <div className="text-center py-8 text-gray-500">
                  <p>검색 결과가 없습니다.</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 처방전 스캔 */}
        <TabsContent value="prescription">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">처방전 스캔</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    {imagePreview ? (
                      <div className="w-full h-full flex items-center justify-center p-2">
                        <img 
                          src={imagePreview} 
                          alt="처방전 미리보기" 
                          className="max-h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Camera size={48} className="text-gray-400 mb-2" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">처방전 이미지 업로드</span>
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG 또는 HEIF 파일</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                </div>
              </div>
              
              <Button 
                className="w-full mb-6" 
                disabled={!selectedImage || isScanning}
                onClick={handleScanPrescription}
              >
                {isScanning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    스캔 중...
                  </>
                ) : (
                  <>
                    <Camera size={18} className="mr-2" />
                    처방전 스캔하기
                  </>
                )}
              </Button>
              
              {scanResults.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-4">스캔 결과</h3>
                  {scanResults.map(med => (
                    <MedicationDetail key={med.id} medication={med} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MedicationSearch;