import { useToast } from '@/hooks/use-toast';

const EmergencyCard = () => {
  const { toast } = useToast();

  const handleEmergencyCall = () => {
    // In a real app, this would trigger an actual emergency call
    window.location.href = 'tel:119';
    toast({
      title: "응급 전화",
      description: "119 응급 전화로 연결합니다.",
      variant: "destructive",
    });
  };

  const handleGuardianContact = () => {
    // In a real app, this would notify registered guardians
    toast({
      title: "보호자 연락",
      description: "등록된 보호자에게 알림이 전송되었습니다.",
      variant: "destructive",
    });
  };

  return (
    <div className="bg-red-50 rounded-xl shadow-sm p-5 mb-4">
      <h2 className="text-base font-bold text-red-600 mb-3">응급 상황</h2>
      
      <div className="flex gap-3 mb-3">
        <button 
          className="flex-1 bg-red-600 text-white py-3 rounded-xl font-medium text-sm flex items-center justify-center"
          onClick={handleEmergencyCall}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
          119 응급 전화
        </button>
        <button 
          className="flex-1 bg-white text-red-600 border border-red-600 py-3 rounded-xl font-medium text-sm"
          onClick={handleGuardianContact}
        >
          보호자 연락
        </button>
      </div>
      
      <div className="text-xs text-red-600">
        <p className="mb-1">심근경색 의심 증상:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>가슴 통증이나 압박감</li>
          <li>어깨, 목, 턱으로 퍼지는 통증</li>
          <li>호흡 곤란 및 구역질</li>
          <li>식은땀 및 현기증</li>
        </ul>
      </div>
    </div>
  );
};

export default EmergencyCard;
