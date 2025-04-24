import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AIModelCardProps {
  title: string;
  description: string;
  modelSize: string;
  accuracy: string;
  modality: string[];
  specialization: string[];
  icon: React.ReactNode;
}

const AIModelCard: React.FC<AIModelCardProps> = ({
  title,
  description,
  modelSize,
  accuracy,
  modality,
  specialization,
  icon
}) => {
  return (
    <Card className="bg-white border border-[#FFD6D6] overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start">
          <div className="mr-3 flex-shrink-0">
            <div className="w-12 h-12 bg-[#FFF5F5] rounded-lg flex items-center justify-center">
              {icon}
            </div>
          </div>
          <div>
            <h3 className="font-bold text-base mb-1">{title}</h3>
            <p className="text-sm text-gray-600 mb-3">{description}</p>
            
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-[#FFF5F5] px-2 py-1 rounded text-xs">
                <span className="font-semibold">모델 크기:</span> {modelSize}
              </div>
              <div className="bg-[#FFF5F5] px-2 py-1 rounded text-xs">
                <span className="font-semibold">정확도:</span> {accuracy}
              </div>
            </div>
            
            <div className="space-y-2">
              <div>
                <span className="text-xs font-semibold text-gray-700 block mb-1">처리 가능 데이터:</span>
                <div className="flex flex-wrap gap-1">
                  {modality.map((item, index) => (
                    <Badge key={`modal-${index}`} variant="outline" className="text-[0.65rem] bg-[#FFE2E9] text-[#FF6D70] border-none">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <span className="text-xs font-semibold text-gray-700 block mb-1">특화 분야:</span>
                <div className="flex flex-wrap gap-1">
                  {specialization.map((item, index) => (
                    <Badge key={`spec-${index}`} variant="outline" className="text-[0.65rem] bg-[#FFE2E9] text-[#FF6D70] border-none">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIModelCard;