import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useSmartWatch } from '@/contexts/SmartWatchContext';
import { startECGSimulation, ECGPattern } from '@/lib/ecgSimulator';
import { websocketClient } from '@/lib/websocket';

interface ECGMonitoringCardProps {
  onViewHistory?: () => void;
  children?: React.ReactNode;
}

const ECGMonitoringCard = ({ onViewHistory, children }: ECGMonitoringCardProps) => {
  const { healthData } = useApp();
  const { 
    isConnected,
    data,
    startECGReading,
    stopECGReading
  } = useSmartWatch();
  
  // 상태 변수
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [ecgStatus, setEcgStatus] = useState<'normal' | 'warning' | 'critical'>('normal');
  
  const svgRef = useRef<SVGSVGElement>(null);
  const [ecgLine, setEcgLine] = useState<number[]>([]);
  const maxDataPoints = 100;
  
  // ECG simulation
  useEffect(() => {
    if (isMonitoring) {
      let pattern = ECGPattern.NORMAL;
      
      if (ecgStatus === 'warning') {
        pattern = ECGPattern.TACHYCARDIA;
      } else if (ecgStatus === 'critical') {
        pattern = ECGPattern.ST_ELEVATION;
      }
      
      const stopSimulation = startECGSimulation(pattern, (dataPoint) => {
        // Update the ECG line
        setEcgLine(prevLine => {
          const newLine = [...prevLine, dataPoint];
          if (newLine.length > maxDataPoints) {
            return newLine.slice(newLine.length - maxDataPoints);
          }
          return newLine;
        });
        
        // Send data to server via WebSocket
        websocketClient.sendECGData(dataPoint);
      });
      
      return () => stopSimulation();
    } else {
      // Reset the line when not monitoring
      setEcgLine([]);
    }
  }, [isMonitoring, ecgStatus]);
  
  // Draw the ECG line
  useEffect(() => {
    if (!svgRef.current || ecgLine.length === 0) return;
    
    const svg = svgRef.current;
    const path = svg.querySelector('path');
    
    if (path) {
      // Generate path data
      let pathData = `M0,50`;
      
      ecgLine.forEach((point, index) => {
        // Scale point to fit SVG and invert (SVG y is top-down)
        const x = (index / ecgLine.length) * 400;
        const y = 50 - (point * 40); // Scale amplitude
        
        pathData += ` L${x},${y}`;
      });
      
      // Set the path data
      path.setAttribute('d', pathData);
    }
  }, [ecgLine]);
  
  const handleStartMonitoring = async () => {
    if (isConnected) {
      const success = await startECGReading();
      if (success) {
        setIsMonitoring(true);
      }
    } else {
      // 사용자에게 기기 연결 필요함을 알림
      alert("스마트워치를 먼저 연결해주세요.");
    }
  };
  
  const handleStopMonitoring = async () => {
    await stopECGReading();
    setIsMonitoring(false);
  };
  
  const handleViewHistory = () => {
    if (onViewHistory) onViewHistory();
  };
  
  const getStatusBadgeClass = () => {
    switch (ecgStatus) {
      case 'normal':
        return 'bg-[#FFE2E9] text-[#FF8FAB]';
      case 'warning':
        return 'bg-[#FFD0DE] text-[#FF8FAB]';
      case 'critical':
        return 'bg-[#FFC1D3] text-[#FF8FAB]';
      default:
        return 'bg-[#FFE2E9] text-[#FF8FAB]';
    }
  };
  
  const getStatusText = () => {
    switch (ecgStatus) {
      case 'normal':
        return '정상';
      case 'warning':
        return '주의';
      case 'critical':
        return '위험';
      default:
        return '정상';
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm p-5 mb-4">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          <h2 className="text-base font-bold text-gray-800 font-suite">실시간 모니터링</h2>
          {children}
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass()}`}>
          {getStatusText()}
        </span>
      </div>
      
      {/* Vital signs indicators */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="bg-white border border-gray-100 p-2 rounded-2xl text-center shadow-sm">
          <div className="text-base font-bold text-gray-800">{healthData?.heartRate || '- -'}</div>
          <div className="text-xs text-[#FF6D70]">심박수</div>
        </div>
        <div className="bg-white border border-gray-100 p-2 rounded-2xl text-center shadow-sm">
          <div className="text-base font-bold text-gray-800">{healthData?.oxygenLevel || '- -'}%</div>
          <div className="text-xs text-[#FF6D70]">산소포화도</div>
        </div>
        <div className="bg-white border border-gray-100 p-2 rounded-2xl text-center shadow-sm">
          <div className="text-base font-bold text-gray-800">{healthData?.temperature || '- -'}°</div>
          <div className="text-xs text-[#FF6D70]">체온</div>
        </div>
      </div>
      
      {/* ECG graph */}
      <div className="bg-white border border-gray-100 rounded-3xl p-3 mb-3 shadow-sm">
        <div className="h-20 w-full relative overflow-hidden">
          <svg ref={svgRef} width="100%" height="100%" viewBox="0 0 400 100" preserveAspectRatio="none">
            <path 
              d="M0,50 L0,50"
              fill="none" 
              stroke="#FF6D70" 
              strokeWidth="2"
              className={isMonitoring ? "ecg-line" : ""}
            />
          </svg>
          
          {!isMonitoring && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-gray-500 text-sm">모니터링을 시작하려면 실시간 감지 버튼을 누르세요</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="flex gap-3">
        <button 
          className={`flex-1 flex items-center justify-center py-3 rounded-full font-medium text-sm ${
            isMonitoring 
              ? 'bg-[#FF6D70] text-white' 
              : 'bg-[#FF6D70] text-white'
          }`}
          onClick={isMonitoring ? handleStopMonitoring : handleStartMonitoring}
        >
          {isMonitoring ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              중지
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              실시간 감지
            </>
          )}
        </button>
        <button 
          className="flex-1 border border-[#FF6D70] text-[#FF6D70] py-3 rounded-full font-medium text-sm"
          onClick={handleViewHistory}
        >
          기록
        </button>
      </div>
    </div>
  );
};

export default ECGMonitoringCard;
