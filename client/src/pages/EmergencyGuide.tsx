import React from 'react';
import { Link } from 'wouter';
import { 
  Heart, Brain, AlertCircle, Thermometer, 
  BadgeAlert, Skull, Flame, Droplets, Wind, Activity, 
  Bandage, Bone, Sparkles, Zap, Bug, Pill, Phone
} from 'lucide-react';

// 응급 처치 항목 타입 정의
interface EmergencyCareItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
}

// 응급 처치 항목 데이터
const emergencyItems: EmergencyCareItem[] = [
  {
    id: '1',
    title: '심정지',
    icon: <Heart className="h-9 w-9 md:h-10 md:w-10" strokeWidth={1.5} />,
    color: '#FF0000'
  },
  {
    id: '2',
    title: '뇌졸중',
    icon: <Brain className="h-9 w-9 md:h-10 md:w-10" strokeWidth={1.5} />,
    color: '#8800FF'
  },
  {
    id: '3',
    title: '심장마비',
    icon: <AlertCircle className="h-9 w-9 md:h-10 md:w-10" strokeWidth={1.5} />,
    color: '#FF0000'
  },
  {
    id: '4',
    title: '고열',
    icon: <Thermometer className="h-9 w-9 md:h-10 md:w-10" strokeWidth={1.5} />,
    color: '#FF8C00'
  },
  {
    id: '5',
    title: '심한 알레르기',
    icon: <BadgeAlert className="h-9 w-9 md:h-10 md:w-10" strokeWidth={1.5} />,
    color: '#FFD000'
  },
  {
    id: '6',
    title: '중독',
    icon: <Skull className="h-9 w-9 md:h-10 md:w-10" strokeWidth={1.5} />,
    color: '#808080'
  },
  {
    id: '7',
    title: '화상',
    icon: <Flame className="h-9 w-9 md:h-10 md:w-10" strokeWidth={1.5} />,
    color: '#FF0000'
  },
  {
    id: '8',
    title: '코피',
    icon: <Droplets className="h-9 w-9 md:h-10 md:w-10" strokeWidth={1.5} />,
    color: '#FF0000'
  },
  {
    id: '9',
    title: '기도 막힘',
    icon: <Wind className="h-9 w-9 md:h-10 md:w-10" strokeWidth={1.5} />,
    color: '#0080FF'
  },
  {
    id: '10',
    title: '심폐소생술',
    icon: <Activity className="h-9 w-9 md:h-10 md:w-10" strokeWidth={1.5} />,
    color: '#FF0000'
  },
  {
    id: '11',
    title: '출혈',
    icon: <Bandage className="h-9 w-9 md:h-10 md:w-10" strokeWidth={1.5} />,
    color: '#FF0000'
  },
  {
    id: '12',
    title: '골절',
    icon: <Bone className="h-9 w-9 md:h-10 md:w-10" strokeWidth={1.5} />,
    color: '#808080'
  },
  {
    id: '13',
    title: '기절',
    icon: <Sparkles className="h-9 w-9 md:h-10 md:w-10" strokeWidth={1.5} />,
    color: '#0080FF'
  },
  {
    id: '14',
    title: '경련',
    icon: <Zap className="h-9 w-9 md:h-10 md:w-10" strokeWidth={1.5} />,
    color: '#0080FF'
  },
  {
    id: '15',
    title: '벌레 쏘임',
    icon: <Bug className="h-9 w-9 md:h-10 md:w-10" strokeWidth={1.5} />,
    color: '#808080'
  },
  {
    id: '16',
    title: '약물 중독',
    icon: <Pill className="h-9 w-9 md:h-10 md:w-10" strokeWidth={1.5} />,
    color: '#8800FF'
  }
];

const EmergencyGuide: React.FC = () => {
  return (
    <div className="mb-20">
      <div className="px-4 py-3">
      </div>

      <div className="grid grid-cols-3 gap-3 p-2">
        {emergencyItems.map(item => (
          <Link key={item.id} href={`/emergency/${item.id}`}>
            <div 
              className="bg-white p-3 rounded-xl shadow-sm flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-all border border-[#FFD6D6] aspect-square"
              style={{ borderColor: item.color }}
            >
              <div 
                className="rounded-full w-16 h-16 md:w-20 md:h-20 flex items-center justify-center mb-2"
                style={{ 
                  backgroundColor: `${item.color}10`,
                  boxShadow: `0 0 0 1px ${item.color}30`
                }}
              >
                <div style={{ color: item.color }}>{item.icon}</div>
              </div>
              <h3 className="font-bold text-center text-sm md:text-base text-[#333333]">{item.title}</h3>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default EmergencyGuide;