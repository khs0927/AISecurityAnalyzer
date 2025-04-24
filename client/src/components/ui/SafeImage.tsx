import React, { useState } from 'react';
import { Pill } from 'lucide-react';

interface SafeImageProps {
  src: string;
  alt: string;
  fallbackText?: string;
  className?: string;
  width?: string | number;
  height?: string | number;
}

/**
 * 이미지 로딩 오류 처리를 위한 안전한 이미지 컴포넌트
 * 외부 이미지 로드 실패 시 대체 UI를 표시합니다.
 */
const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  fallbackText,
  className = '',
  width,
  height
}) => {
  const [imageError, setImageError] = useState(false);

  // 이미지 로딩 오류 처리
  const handleImageError = () => {
    console.log(`이미지 로딩 실패: ${src}`);
    setImageError(true);
  };

  // 이미지 로딩 성공 시 재시도 가능하도록 설정
  const handleImageLoad = () => {
    if (imageError) setImageError(false);
  };

  // 이미지 로드 실패 시 대체 UI
  if (imageError) {
    return (
      <div 
        className={`flex flex-col items-center justify-center bg-gray-100 rounded-xl ${className}`}
        style={{ width: width || '100%', height: height || '180px' }}
      >
        <Pill className="w-10 h-10 text-[#FF6D70] mb-2" />
        <span className="text-gray-500 text-sm text-center px-4">
          {fallbackText || '이미지를 불러올 수 없습니다'}
        </span>
      </div>
    );
  }

  // 정상적인 이미지 표시
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={{ width: width || '100%', height: height || 'auto' }}
      onError={handleImageError}
      onLoad={handleImageLoad}
    />
  );
};

export default SafeImage;