import React, { useEffect, useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Bluetooth, BluetoothOff, WifiOff, Wifi, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { websocketClient } from '@/lib/websocket';

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

interface ConnectionStatusIndicatorProps {
  connected: boolean;
  type?: 'wifi' | 'bluetooth' | 'websocket';
  badgeOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  status?: ConnectionStatus;
  errorMessage?: string;
}

export default function ConnectionStatusIndicator({
  connected,
  type = 'bluetooth',
  badgeOnly = false,
  size = 'md',
  showText = true,
  className = "",
  status: externalStatus,
  errorMessage,
}: ConnectionStatusIndicatorProps) {
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [status, setStatus] = useState<ConnectionStatus>(externalStatus || (connected ? 'connected' : 'disconnected'));

  // 웹소켓 상태 확인 (웹소켓 타입인 경우)
  useEffect(() => {
    if (type === 'websocket') {
      // 웹소켓 연결 확인 방법 구현
      const checkWebSocketStatus = () => {
        if (websocketClient && 'socket' in websocketClient) {
          const socketState = (websocketClient as any).socket?.readyState;
          
          if (socketState === WebSocket.OPEN) {
            setWsConnected(true);
            setStatus('connected');
          } else if (socketState === WebSocket.CONNECTING) {
            setWsConnected(false);
            setStatus('connecting');
          } else {
            setWsConnected(false);
            setStatus('disconnected');
          }
        }
      };
      
      // 초기 확인
      checkWebSocketStatus();
      
      // 3초마다 상태 업데이트
      const interval = setInterval(checkWebSocketStatus, 3000);
      
      return () => {
        clearInterval(interval);
      };
    } else {
      // 웹소켓이 아닌 경우 전달받은 상태 사용
      setStatus(externalStatus || (connected ? 'connected' : 'disconnected'));
    }
  }, [connected, externalStatus, type]);
  
  const iconSize = {
    sm: 14,
    md: 16,
    lg: 18,
  }[size] || 16;
  
  const getConnectionColor = () => {
    switch (status) {
      case 'connected': return 'blue';
      case 'connecting': return 'yellow';
      case 'disconnected': return 'red';
      case 'error': return 'red';
      default: return 'gray';
    }
  };
  
  const color = getConnectionColor();
  
  const badgeClassName = `
    text-xs whitespace-nowrap font-medium px-3 py-1 rounded-full
    ${color === 'blue' 
      ? "bg-gradient-to-r from-blue-50 to-blue-100 text-blue-600" 
      : color === 'yellow' 
      ? "bg-gradient-to-r from-amber-50 to-amber-100 text-amber-600" 
      : color === 'red' 
      ? "bg-gradient-to-r from-red-50 to-red-100 text-red-500"
      : "bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600"}
    ${className}
  `;
  
  const getStatusText = () => {
    switch (status) {
      case 'connected': return '연결됨';
      case 'connecting': return '연결 중...';
      case 'disconnected': return '연결 끊김';
      case 'error': return '연결 오류';
      default: return '알 수 없음';
    }
  };
  
  const labelText = getStatusText();
  
  const getIcon = () => {
    if (type === 'bluetooth') {
      return status === 'connected' ? 
        <Bluetooth size={iconSize} className="text-blue-500" /> :
        <BluetoothOff size={iconSize} className={color === 'yellow' ? "text-amber-500" : "text-red-500"} />;
    } else if (type === 'wifi') {
      return status === 'connected' ? 
        <Wifi size={iconSize} className="text-blue-500" /> :
        <WifiOff size={iconSize} className={color === 'yellow' ? "text-amber-500" : "text-red-500"} />;
    } else if (type === 'websocket') {
      // 웹소켓 전용 아이콘 (기본적으로 Wifi 아이콘 사용)
      return status === 'connected' ? 
        <Wifi size={iconSize} className="text-blue-500" /> :
        status === 'connecting' ? 
          <Wifi size={iconSize} className="text-amber-500 animate-pulse" /> :
          status === 'error' ? 
            <AlertCircle size={iconSize} className="text-red-500" /> :
            <WifiOff size={iconSize} className="text-red-500" />;
    }
    
    return null;
  };

  const contentWithTooltip = (content: React.ReactNode) => {
    if (errorMessage && status === 'error') {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {content}
            </TooltipTrigger>
            <TooltipContent>
              <p>{errorMessage}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    return content;
  };

  // Badge 전용 표시
  if (badgeOnly) {
    return contentWithTooltip(
      <Badge className={badgeClassName}>
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${
            color === 'blue' ? "bg-blue-500" : 
            color === 'yellow' ? "bg-amber-500" : 
            "bg-red-500"
          } ${status === 'connected' ? 'animate-pulse' : ''}`}></div>
          {showText && labelText}
        </div>
      </Badge>
    );
  }
  
  // 아이콘 + 텍스트 (새 디자인 스타일)
  return contentWithTooltip(
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${
        color === 'blue' ? "bg-blue-500" : 
        color === 'yellow' ? "bg-amber-500" : 
        "bg-red-500"
      } ${status === 'connected' ? 'animate-pulse' : ''}`}></div>
      {showText && (
        <span className={`text-xs font-medium whitespace-nowrap ${
          color === 'blue' ? "text-blue-600" : 
          color === 'yellow' ? "text-amber-600" : 
          color === 'red' ? "text-red-500" : 
          "text-gray-600"
        }`}>
          {labelText}
        </span>
      )}
    </div>
  );
}