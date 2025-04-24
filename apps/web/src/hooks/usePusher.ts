import { useState, useEffect, useRef } from 'react';
import Pusher, { Channel } from 'pusher-js';

// 환경 변수
const PUSHER_KEY = import.meta.env.VITE_PUSHER_KEY || 'YOUR_PUSHER_KEY';
const PUSHER_CLUSTER = import.meta.env.VITE_PUSHER_CLUSTER || 'ap3';

interface PusherOptions {
  userId: string;
  events: {
    [key: string]: (data: any) => void;
  };
}

/**
 * Pusher 클라이언트를 사용하기 위한 훅
 * 
 * @param options 푸셔 옵션 (사용자 ID 및 이벤트 핸들러)
 * @returns 채널 객체 및 연결 상태
 */
export const usePusher = ({ userId, events }: PusherOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<Channel | null>(null);

  useEffect(() => {
    if (!userId) return;

    // 푸셔 인스턴스 생성
    const pusherInstance = new Pusher(PUSHER_KEY, {
      cluster: PUSHER_CLUSTER,
      forceTLS: true,
    });

    // 연결 이벤트 처리
    pusherInstance.connection.bind('connected', () => {
      setIsConnected(true);
      console.log('Pusher connected');
    });

    pusherInstance.connection.bind('disconnected', () => {
      setIsConnected(false);
      console.log('Pusher disconnected');
    });

    // 사용자별 채널 구독
    const channelName = `user-${userId}`;
    const channel = pusherInstance.subscribe(channelName);

    // 이벤트 바인딩
    if (events) {
      Object.entries(events).forEach(([eventName, handler]) => {
        channel.bind(eventName, handler);
      });
    }

    // 참조 저장
    pusherRef.current = pusherInstance;
    channelRef.current = channel;

    // 정리 함수
    return () => {
      // 이벤트 언바인딩
      if (events && channelRef.current) {
        Object.keys(events).forEach(eventName => {
          channelRef.current?.unbind(eventName);
        });
      }

      // 채널 구독 해제 및 연결 해제
      if (pusherRef.current) {
        pusherRef.current.unsubscribe(channelName);
        pusherRef.current.disconnect();
      }
    };
  }, [userId]);

  return {
    channel: channelRef.current,
    isConnected
  };
};

export default usePusher; 