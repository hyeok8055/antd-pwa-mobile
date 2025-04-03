// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

// Firebase configuration
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

// VAPID 키 (Firebase 콘솔 > 프로젝트 설정 > 클라우드 메시징에서 확인)
const VAPID_KEY = 'BBOl7JOGCasgyKCZv1Atq_5MdnvWAWk_iWleIggXfXN3aMGJeuKdEHSTp4OGUfmVPNHwnf5eCLQyY80ITKzz7qk';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const realtimeDb = getDatabase(app);
let messaging = null;

// 디바이스 및 브라우저 체크 함수
const checkDeviceCompatibility = () => {
  // iOS 기기 체크
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  
  // iOS 버전 체크 (iOS 16.4+ 필요)
  let isCompatibleIOS = false;
  if (isIOS) {
    const match = navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
    if (match) {
      const version = [
        parseInt(match[1], 10),
        parseInt(match[2], 10),
        parseInt(match[3] || 0, 10)
      ];
      // iOS 16.4 이상
      isCompatibleIOS = version[0] >= 16 && version[1] >= 4;
    }
  }
  
  // Safari 브라우저 체크
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  return {
    isIOS,
    isCompatibleIOS,
    isSafari,
    isCompatible: !isIOS || isCompatibleIOS,
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  };
};

// 메시징 초기화 함수
const initMessaging = async () => {
  try {
    // 브라우저 지원 여부 확인
    const isMessagingSupported = await isSupported();
    
    if (!isMessagingSupported) {
      console.log('이 브라우저는 Firebase 메시징을 지원하지 않습니다.');
      return null;
    }
    
    // 메시징 초기화
    return getMessaging(app);
  } catch (error) {
    console.error('Firebase 메시징 초기화 오류:', error);
    return null;
  }
};

// 브라우저 환경에서만 메시징 초기화
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  // 비동기 초기화 - 그러나 export를 위해 당장은 null로 설정
  initMessaging().then(messagingInstance => {
    messaging = messagingInstance;
  });
}

// FCM 토큰 가져오기 함수 (개선)
const getFCMToken = async (vapidKey = VAPID_KEY) => {
  try {
    // 디바이스 호환성 확인
    const deviceInfo = checkDeviceCompatibility();
    console.log('디바이스 정보:', deviceInfo);
    
    // iOS 16.4 미만 기기에서는 알림을 지원하지 않음
    if (deviceInfo.isIOS && !deviceInfo.isCompatibleIOS) {
      console.log('iOS 16.4 이상 버전에서만 웹 푸시 알림을 지원합니다.');
      return null;
    }
    
    // 메시징이 아직 초기화되지 않았다면 초기화
    if (!messaging) {
      messaging = await initMessaging();
    }
    
    if (!messaging || !('serviceWorker' in navigator)) {
      console.log('서비스 워커 또는 Firebase 메시징을 지원하지 않는 브라우저입니다.');
      return null;
    }

    // 알림 권한 확인 및 요청
    let permission = Notification.permission;
    
    if (permission === 'default') {
      console.log('알림 권한 요청 중...');
      permission = await Notification.requestPermission();
      console.log('알림 권한 상태:', permission);
    }
    
    if (permission !== 'granted') {
      console.log('알림 권한이 거부되었습니다.');
      return null;
    }

    console.log('FCM 토큰 요청 중...');
    
    // FCM 토큰 요청 (serviceWorkerRegistration 옵션 제거)
    const currentToken = await getToken(messaging, {
      vapidKey: vapidKey,
      // serviceWorkerRegistration: swRegistration // SDK가 자동으로 처리하도록 제거
    });

    if (currentToken) {
      console.log('FCM 토큰 획득 성공');
      return currentToken;
    } else {
      console.log('FCM 토큰을 가져올 수 없습니다. 권한과 서비스 워커를 확인하세요.');
      return null;
    }
  } catch (error) {
    console.error('FCM 토큰 가져오기 오류:', error);
    return null;
  }
};

// 포그라운드 메시지 리스너 (개선)
const onMessageListener = () => {
  // 메시징 인스턴스가 없으면 즉시 null 반환
  if (!messaging) {
    console.warn('[firebaseconfig.js] 메시징 인스턴스가 초기화되지 않았습니다.');
    return Promise.resolve(null); 
  }
  
  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log('[firebaseconfig.js] 포그라운드 메시지 수신:', payload);
      resolve(payload); 
    });
  });
};

export { 
  app, 
  auth, 
  db, 
  realtimeDb, 
  messaging, 
  getFCMToken, 
  onMessageListener,
  VAPID_KEY,
  checkDeviceCompatibility
};
