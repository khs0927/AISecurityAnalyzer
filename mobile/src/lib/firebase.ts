import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import 'firebase/messaging';

// Firebase 구성
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

// Firebase 초기화
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export { firebase };

// FCM 메시지 핸들러
export const setupFirebaseMessaging = async () => {
  if (firebase.messaging.isSupported()) {
    const messaging = firebase.messaging();
    
    // FCM 토큰 가져오기
    try {
      const token = await messaging.getToken();
      console.log('FCM Token:', token);
      
      // 토큰을 Firebase에 저장
      const uid = firebase.auth().currentUser?.uid;
      if (uid && token) {
        await firebase.firestore()
          .doc(`users/${uid}/settings/notifications`)
          .set({
            fcmToken: token,
            platform: 'mobile',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
      }
      
      return token;
    } catch (error) {
      console.error('FCM 토큰을 가져오는 중 오류 발생:', error);
      return null;
    }
  }
  
  return null;
};

// Firestore 컬렉션 유틸리티
export const firestoreCollections = {
  users: firebase.firestore().collection('users'),
  vitals: (uid: string) => firebase.firestore().collection(`users/${uid}/vitals`),
  settings: (uid: string) => firebase.firestore().collection(`users/${uid}/settings`),
  aiQuestions: (uid: string) => firebase.firestore().collection(`users/${uid}/aiQuestions`),
};

// 심박수 알림 설정을 가져오는 함수
export const getHeartRateAlertSettings = async (uid: string) => {
  try {
    const doc = await firebase.firestore()
      .doc(`users/${uid}/settings/heartAlerts`)
      .get();
      
    if (doc.exists) {
      return doc.data();
    }
    
    // 기본값 반환
    return {
      enabled: false,
      thresholdHigh: 120,
      thresholdLow: 50,
      notifyContacts: false
    };
  } catch (error) {
    console.error('심박수 알림 설정을 가져오는 중 오류 발생:', error);
    throw error;
  }
};

// 심박수 알림 설정을 저장하는 함수
export const saveHeartRateAlertSettings = async (
  uid: string, 
  settings: {
    enabled: boolean;
    thresholdHigh: number;
    thresholdLow: number;
    notifyContacts: boolean;
  }
) => {
  try {
    await firebase.firestore()
      .doc(`users/${uid}/settings/heartAlerts`)
      .set({
        ...settings,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    
    return true;
  } catch (error) {
    console.error('심박수 알림 설정을 저장하는 중 오류 발생:', error);
    throw error;
  }
};

export default firebase; 