// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Firebase configuration using Vite's environment variables
const firebaseConfig = {
  apiKey: 'AIzaSyBqu5TDSwaY_qvunrS8pJrWdpIlwJeOMrU',
  authDomain: 'calori-sync-f0431.firebaseapp.com',
  projectId: 'calori-sync-f0431',
  storageBucket: 'calori-sync-f0431.firebasestorage.app',
  databaseURL: 'https://calori-sync-f0431-default-rtdb.asia-southeast1.firebasedatabase.app/',
  messagingSenderId: '830533101887',
  appId: '1:830533101887:web:5bd8aed35d49ea87758b8a',
  measurementId: 'G-55K939QBD7',  
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const realtimeDb = getDatabase(app);
let messaging = null;

// 브라우저 환경에서만 메시징 초기화
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  messaging = getMessaging(app);
}

// FCM 토큰 가져오기 함수
const getFCMToken = async (vapidKey) => {
  try {
    if (!messaging || !('serviceWorker' in navigator)) {
      console.log('서비스 워커를 지원하지 않는 브라우저입니다.');
      return null;
    }

    // 서비스 워커 등록 확인 (선택적)
    let swRegistration = null;
    
    try {
      // 이미 활성화된 서비스 워커가 있는지 확인
      swRegistration = await navigator.serviceWorker.ready;
      console.log('기존 서비스 워커 사용:', swRegistration);
    } catch (e) {
      console.log('활성화된 서비스 워커가 없습니다');
      
      // 서비스 워커 등록 상태 확인
      const registrations = await navigator.serviceWorker.getRegistrations();
      
      if (registrations.length === 0) {
        console.log('등록된 서비스 워커가 없어 새로 등록합니다.');
        // 서비스 워커 등록
        swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/'
        });
        console.log('Firebase 메시징 서비스 워커 등록:', swRegistration);
      } else {
        // 이미 등록된 서비스 워커 중에서 찾기
        for (const reg of registrations) {
          if (reg.active) {
            swRegistration = reg;
            console.log('기존 서비스 워커를 발견하여 사용합니다:', reg);
            break;
          }
        }
        
        // 모든 서비스 워커가 대기 중이라면 첫 번째 것 사용
        if (!swRegistration && registrations.length > 0) {
          swRegistration = registrations[0];
          console.log('대기 중인 서비스 워커를 사용합니다:', swRegistration);
        }
      }
    }
    
    if (!swRegistration) {
      console.error('유효한 서비스 워커를 찾을 수 없습니다.');
      return null;
    }
    
    // FCM 토큰 요청
    const currentToken = await getToken(messaging, {
      vapidKey: vapidKey,
      serviceWorkerRegistration: swRegistration
    });

    if (currentToken) {
      console.log('FCM 토큰 획득 성공');
      return currentToken;
    } else {
      console.log('FCM 토큰을 가져올 수 없습니다. 권한을 확인하세요.');
      return null;
    }
  } catch (error) {
    console.error('FCM 토큰 가져오기 오류:', error);
    return null;
  }
};

// 포그라운드 메시지 리스너
const onMessageListener = () => {
  if (!messaging) return Promise.resolve(null);
  
  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log('포그라운드 메시지 수신:', payload);
      resolve(payload);
    });
  });
};

export { app, auth, db, realtimeDb, messaging, getFCMToken, onMessageListener };
