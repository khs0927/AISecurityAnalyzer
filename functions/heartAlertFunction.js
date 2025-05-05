const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Firebase 관리자 초기화 (한 번만 실행)
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * 심박수 모니터링 및 알림 전송 함수
 * 사용자의 심박수 데이터가 Firestore에 새로 저장될 때마다 트리거됩니다.
 * 설정된 임계값을 초과하면 FCM 알림을 발송합니다.
 */
exports.heartRateAlert = functions.firestore
  .document('users/{userId}/vitals/{documentId}')
  .onCreate(async (snapshot, context) => {
    try {
      const { userId } = context.params;
      const data = snapshot.data();
      
      // 심박수 데이터인지 확인
      if (data.type !== 'heartRate') {
        console.log('심박수 데이터가 아님, 건너뜁니다');
        return null;
      }
      
      // 사용자의 알림 설정 가져오기
      const settingsDoc = await admin.firestore()
        .doc(`users/${userId}/settings/heartAlerts`)
        .get();
        
      // 설정이 없거나 알림이 비활성화된 경우 무시
      if (!settingsDoc.exists || !settingsDoc.data().enabled) {
        console.log('사용자 알림 설정이 없거나 비활성화됨');
        return null;
      }
      
      const settings = settingsDoc.data();
      const bpm = data.bpm;
      
      // 심박수가 임계값을 벗어났는지 확인
      const isTooHigh = settings.thresholdHigh && bpm > settings.thresholdHigh;
      const isTooLow = settings.thresholdLow && bpm < settings.thresholdLow;
      
      if (!isTooHigh && !isTooLow) {
        console.log(`심박수(${bpm})가 정상 범위 내에 있음. 알림 전송 건너뜀`);
        return null;
      }
      
      // 사용자 FCM 토큰 가져오기
      const tokenDoc = await admin.firestore()
        .doc(`users/${userId}/settings/notifications`)
        .get();
        
      if (!tokenDoc.exists || !tokenDoc.data().fcmToken) {
        console.log('사용자 FCM 토큰을 찾을 수 없음');
        return null;
      }
      
      const fcmToken = tokenDoc.data().fcmToken;
      
      // 알림 메시지 생성
      const notificationTitle = isTooHigh ? 
        '심박수 경고: 높음' : 
        '심박수 경고: 낮음';
        
      const notificationBody = isTooHigh ?
        `심박수가 ${bpm} BPM으로 설정된 상한(${settings.thresholdHigh} BPM)보다 높습니다. 안정을 취하세요.` :
        `심박수가 ${bpm} BPM으로 설정된 하한(${settings.thresholdLow} BPM)보다 낮습니다. 주의하세요.`;
        
      // FCM 알림 전송
      const message = {
        token: fcmToken,
        notification: {
          title: notificationTitle,
          body: notificationBody,
        },
        data: {
          type: 'heartRateAlert',
          bpm: String(bpm),
          timestamp: new Date().toISOString(),
          threshold: isTooHigh ? String(settings.thresholdHigh) : String(settings.thresholdLow),
          alertType: isTooHigh ? 'high' : 'low'
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'heart-alerts',
            color: '#FF6D94'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              category: 'heart_alert'
            }
          }
        }
      };
      
      // 알림 발송
      await admin.messaging().send(message);
      console.log(`FCM 알림 전송됨: 사용자 ${userId}, 심박수 ${bpm} BPM`);
      
      // 알림 로그 저장
      await admin.firestore()
        .collection(`users/${userId}/alerts`)
        .add({
          type: 'heartRate',
          bpm: bpm,
          threshold: isTooHigh ? settings.thresholdHigh : settings.thresholdLow,
          alertType: isTooHigh ? 'high' : 'low',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          message: notificationBody,
          notified: true
        });
      
      // 비상 연락처 알림 (설정된 경우)
      if (settings.notifyContacts) {
        try {
          const contactsDoc = await admin.firestore()
            .doc(`users/${userId}/settings/emergencyContacts`)
            .get();
            
          if (contactsDoc.exists && contactsDoc.data().contacts) {
            const contacts = contactsDoc.data().contacts;
            
            // 향후 비상 연락처 알림 로직 구현
            // 예: Twilio SMS, 카카오 알림톡 등 사용
            console.log(`비상 연락처 알림 필요: ${contacts.length}개 연락처`);
          }
        } catch (error) {
          console.error('비상 연락처 알림 중 오류:', error);
        }
      }
      
      return { success: true };
      
    } catch (error) {
      console.error('심박수 알림 처리 중 오류:', error);
      return { success: false, error: error.message };
    }
  });

/**
 * 매일 0시에 실행되는 정기 검사 함수
 * 사용자들의 건강 데이터를 분석하고 필요한 조치 권장
 */
exports.dailyHealthCheck = functions.pubsub
  .schedule('0 0 * * *') // 매일 자정
  .timeZone('Asia/Seoul')
  .onRun(async (context) => {
    try {
      // 모든 사용자 목록 가져오기
      const usersSnapshot = await admin.firestore()
        .collection('users')
        .get();
        
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        
        // 지난 24시간 동안의 심박수 데이터 가져오기
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        const vitalsSnapshot = await admin.firestore()
          .collection(`users/${userId}/vitals`)
          .where('type', '==', 'heartRate')
          .where('timestamp', '>=', yesterday)
          .get();
          
        // 데이터가 충분하지 않으면 건너뜀
        if (vitalsSnapshot.empty || vitalsSnapshot.docs.length < 5) {
          console.log(`사용자 ${userId}: 심박수 데이터가 충분하지 않음`);
          continue;
        }
        
        // 심박수 데이터 분석
        const heartRates = vitalsSnapshot.docs.map(doc => doc.data().bpm);
        const average = heartRates.reduce((sum, rate) => sum + rate, 0) / heartRates.length;
        const min = Math.min(...heartRates);
        const max = Math.max(...heartRates);
        const variance = heartRates.reduce((sum, rate) => sum + Math.pow(rate - average, 2), 0) / heartRates.length;
        
        // 사용자 알림 설정 확인
        const settingsDoc = await admin.firestore()
          .doc(`users/${userId}/settings/heartAlerts`)
          .get();
          
        if (!settingsDoc.exists || !settingsDoc.data().enabled) {
          continue;
        }
        
        // FCM 토큰 확인
        const tokenDoc = await admin.firestore()
          .doc(`users/${userId}/settings/notifications`)
          .get();
          
        if (!tokenDoc.exists || !tokenDoc.data().fcmToken) {
          continue;
        }
        
        // 심박 변이도가 높거나 평균 심박수가 이상한 경우 알림 전송
        if (variance > 100 || average > 90 || average < 50) {
          const message = {
            token: tokenDoc.data().fcmToken,
            notification: {
              title: '일일 건강 보고서',
              body: `지난 24시간 동안 심박수 변화가 컸습니다. 평균: ${Math.round(average)} BPM, 변이도: ${Math.round(variance)}`
            },
            data: {
              type: 'dailyReport',
              average: String(Math.round(average)),
              min: String(min),
              max: String(max),
              variance: String(Math.round(variance))
            }
          };
          
          await admin.messaging().send(message);
          console.log(`일일 보고서 알림 전송: 사용자 ${userId}`);
          
          // 일일 보고서 저장
          await admin.firestore()
            .collection(`users/${userId}/reports`)
            .add({
              type: 'daily',
              date: admin.firestore.FieldValue.serverTimestamp(),
              heartRate: {
                average: Math.round(average),
                min,
                max,
                variance: Math.round(variance),
                count: heartRates.length
              },
              notified: true
            });
        } else {
          // 정상 범위인 경우에도 보고서는 저장
          await admin.firestore()
            .collection(`users/${userId}/reports`)
            .add({
              type: 'daily',
              date: admin.firestore.FieldValue.serverTimestamp(),
              heartRate: {
                average: Math.round(average),
                min,
                max,
                variance: Math.round(variance),
                count: heartRates.length
              },
              notified: false
            });
        }
      }
      
      return null;
    } catch (error) {
      console.error('일일 건강 검사 중 오류:', error);
      return null;
    }
  }); 