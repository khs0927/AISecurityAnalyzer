import { useEffect, useState } from 'react';
import * as HealthKit from 'expo-health';
import { Platform } from 'react-native';
import { firebase } from '../lib/firebase';

interface HeartRateData {
  value: number;
  timestamp: Date;
  source: string;
}

export const useHeartRate = (interval: number = 5) => {
  const [heartRate, setHeartRate] = useState<HeartRateData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let subscription: { remove: () => void } | null = null;
    let intervalId: NodeJS.Timeout | null = null;

    const setupHeartRateMonitoring = async () => {
      try {
        setIsLoading(true);
        
        if (Platform.OS === 'ios') {
          // iOS에서는 HealthKit 사용
          const hasPermission = await HealthKit.requestPermissionsAsync([
            HealthKit.Permission.HeartRate,
          ]);

          if (!hasPermission) {
            setError('심박수 데이터 접근 권한이 없습니다.');
            setIsLoading(false);
            return;
          }

          // 실시간 심박수 구독
          subscription = HealthKit.watchHeartRate(
            { interval }, // 초 단위
            (err, result) => {
              if (err) {
                setError(err.message);
                return;
              }
              
              if (result && result.value) {
                const newHeartRate: HeartRateData = {
                  value: Math.round(result.value),
                  timestamp: new Date(),
                  source: 'HealthKit'
                };
                
                setHeartRate(newHeartRate);
                
                // Firebase에 저장
                const uid = firebase.auth().currentUser?.uid;
                if (uid) {
                  firebase.firestore()
                    .collection(`users/${uid}/vitals`)
                    .add({
                      type: 'heartRate',
                      bpm: newHeartRate.value,
                      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                      source: newHeartRate.source
                    })
                    .catch(e => console.error('Firebase 저장 오류:', e));
                }
              }
              
              setIsLoading(false);
            }
          );
        } else if (Platform.OS === 'android') {
          // Android에서는 Health Connect 사용
          // Health Connect 권한 요청
          const hasPermission = await HealthKit.requestPermissionsAsync([
            HealthKit.Permission.HeartRate,
          ]);

          if (!hasPermission) {
            setError('심박수 데이터 접근 권한이 없습니다.');
            setIsLoading(false);
            return;
          }

          // Android에서는 주기적으로 최신 데이터 조회
          const fetchLatestHeartRate = async () => {
            try {
              const result = await HealthKit.getHeartRateAsync({
                startDate: new Date(Date.now() - 60 * 1000), // 1분 이내 데이터
                limit: 1,
              });

              if (result && result.length > 0) {
                const latestData = result[0];
                const newHeartRate: HeartRateData = {
                  value: Math.round(latestData.value),
                  timestamp: new Date(latestData.date),
                  source: 'Health Connect'
                };
                
                setHeartRate(newHeartRate);
                
                // Firebase에 저장
                const uid = firebase.auth().currentUser?.uid;
                if (uid) {
                  firebase.firestore()
                    .collection(`users/${uid}/vitals`)
                    .add({
                      type: 'heartRate',
                      bpm: newHeartRate.value,
                      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                      source: newHeartRate.source
                    })
                    .catch(e => console.error('Firebase 저장 오류:', e));
                }
              }
              
              setIsLoading(false);
            } catch (e) {
              console.error('심박수 데이터 조회 오류:', e);
              setError('심박수 데이터를 가져오는 중 오류가 발생했습니다.');
              setIsLoading(false);
            }
          };

          // 초기 데이터 로드
          fetchLatestHeartRate();
          
          // 주기적으로 데이터 업데이트
          intervalId = setInterval(fetchLatestHeartRate, interval * 1000);
        }
      } catch (e) {
        console.error('심박수 모니터링 설정 오류:', e);
        setError('심박수 모니터링을 설정하는 중 오류가 발생했습니다.');
        setIsLoading(false);
      }
    };

    setupHeartRateMonitoring();

    // 클린업 함수
    return () => {
      if (subscription) {
        subscription.remove();
      }
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [interval]);

  return { heartRate, error, isLoading };
};

export default useHeartRate; 