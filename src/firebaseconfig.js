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

    // 서비스 워커 등록 확인
    let swRegistration = null;
    
    try {
      // 이미 활성화된 서비스 워커 확인
      swRegistration = await navigator.serviceWorker.ready;
      console.log('활성화된 서비스 워커 발견:', swRegistration.scope);
    } catch (e) {
      console.log('활성화된 서비스 워커가 없습니다. 서비스 워커 등록을 확인합니다.');
      
      // 등록된 서비스 워커 확인
      const registrations = await navigator.serviceWorker.getRegistrations();
      
      if (registrations.length === 0) {
        console.log('등록된 서비스 워커가 없어 새로 등록합니다.');
        try {
          // Firebase 메시징 서비스 워커 등록
          swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/'
          });
          console.log('Firebase 메시징 서비스 워커 등록 성공:', swRegistration.scope);
          
          // 서비스 워커가 활성화될 때까지 기다림
          if (swRegistration.installing || swRegistration.waiting) {
            console.log('서비스 워커 활성화 대기 중...');
            await new Promise((resolve) => {
              const worker = swRegistration.installing || swRegistration.waiting;
              worker.addEventListener('statechange', (e) => {
                if (e.target.state === 'activated') {
                  console.log('서비스 워커가 활성화되었습니다.');
                  resolve();
                }
              });
            });
          }
        } catch (err) {
          console.error('서비스 워커 등록 실패:', err);
          return null;
        }
      } else {
        // 이미 등록된 서비스 워커 중 활성화된 것 찾기
        for (const reg of registrations) {
          console.log('등록된 서비스 워커:', reg.scope, 'state:', reg.active ? 'active' : (reg.installing ? 'installing' : 'waiting'));
          if (reg.active) {
            swRegistration = reg;
            console.log('활성화된 서비스 워커를 사용합니다:', reg.scope);
            break;
          }
        }
        
        // 활성화된 서비스 워커가 없으면 첫 번째 등록된 서비스 워커 사용
        if (!swRegistration && registrations.length > 0) {
          swRegistration = registrations[0];
          console.log('활성화 중인 서비스 워커를 사용합니다:', swRegistration.scope);
          
          // 서비스 워커가 활성화될 때까지 기다림
          if (swRegistration.installing || swRegistration.waiting) {
            console.log('서비스 워커 활성화 대기 중...');
            await new Promise((resolve) => {
              const worker = swRegistration.installing || swRegistration.waiting;
              worker.addEventListener('statechange', (e) => {
                if (e.target.state === 'activated') {
                  console.log('서비스 워커가 활성화되었습니다.');
                  resolve();
                }
              });
            });
          }
        }
      }
    }
    
    if (!swRegistration) {
      console.error('유효한 서비스 워커를 찾을 수 없습니다.');
      return null;
    }
    
    console.log('FCM 토큰 요청 중...');
    
    // FCM 토큰 요청
    const currentToken = await getToken(messaging, {
      vapidKey: vapidKey,
      serviceWorkerRegistration: swRegistration
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
  if (!messaging) return Promise.resolve(null);
  
  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log('포그라운드 메시지 수신:', payload);
      
      // 브라우저 알림 직접 표시 (iOS Safari와의 호환성을 위해)
      if (Notification.permission === 'granted') {
        let title = payload.notification?.title || '알림';
        let options = {
          body: payload.notification?.body || '새로운 메시지가 있습니다',
          icon: '/icons/maskable_icon_x192.png',
          badge: '/icons/favicon-96x96.png',
          tag: 'notification-' + Date.now(),
          data: payload.data || {},
          vibrate: [200, 100, 200]
        };
        
        try {
          // 알림 표시
          navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(title, options);
          }).catch(err => {
            // 서비스 워커를 통한 알림 실패 시 브라우저 API 직접 사용
            new Notification(title, options);
          });
        } catch (error) {
          console.error('알림 표시 중 오류:', error);
        }
      }
      
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
