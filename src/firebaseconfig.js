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
// console.log('firebase app initialized:',app);

// 푸시 알림을 위한 messaging 초기화 및 서비스 워커 등록
let messaging = null;
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  // 서비스 워커 등록 - 여기서는 한 번만 등록되도록 수정
  navigator.serviceWorker.register('/firebase-messaging-sw.js')
    .then((registration) => {
      // console.log로 꼭 한 번만 실행되는지 확인
      console.log('Service Worker registered with scope:', registration.scope);
      messaging = getMessaging(app);
    })
    .catch((err) => {
      console.error('Service Worker registration failed:', err);
    });
} else {
  console.log('이 브라우저는 서비스 워커를 지원하지 않거나 브라우저 환경이 아닙니다.');
}

console.log('firebase messaging initialized:',messaging);

const auth = getAuth(app);
const db = getFirestore(app);
const realtimeDb = getDatabase(app);

// 토큰 가져오기 함수
export const getFCMToken = async (vapidKey) => {
  if (!messaging) return null;
  try {
    const token = await getToken(messaging, { vapidKey });
    return token;
  } catch (error) {
    console.error('FCM 토큰 가져오기 실패:', error);
    return null;
  }
};

// 포어그라운드 메시지 수신 리스너 - 호출 시 한 번만 리스너 등록되도록 수정
let messageListener = null;
export const onMessageListener = () => {
  if (messageListener) return messageListener; // 이미 리스너가 있으면 기존 것 반환
  
  messageListener = new Promise((resolve) => {
    if (!messaging) return;
    onMessage(messaging, (payload) => {
      console.log('새 메시지 수신:', payload);
      resolve(payload);
    });
  });
  
  return messageListener;
};

// const analytics = getAnalytics(app);

export { app, auth, db, realtimeDb, messaging };
