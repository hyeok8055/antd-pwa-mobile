// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// 푸시 알림
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
console.log('firebase app initialized:',app);

const messaging = getMessaging(app);
console.log('firebase messaging initialized:',messaging);

export const auth = getAuth(app);
export const db = getFirestore(app);

// FCM 토큰 가져오기
export const requestForToken = async () => {
  try{
    const currentToken = await getToken(messaging, {
      vapidKey: 'DeG9KAoDBVnpcDi1fF10m29qrVW-X7aUcfhlWIR-zFw'
    });
    if (currentToken) {
      console.log('FCM 토큰 가져오기 성공');

      console.log('FCM 토큰 값: ', currentToken);

      // 백엔드로 토큰 전송할 일이 있따면 여기에 추가
      return currentToken;
    } else {
      console.log('토큰을 가져올 수 없습니다');
    }
  } catch (error) {
    console.log('토큰 발급 중 에러 발생', error);
  }
}

// 포어그라운드 메시지 수신 리스너
export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log('메시지 수신:', payload);
      resolve(payload);
    });
  });

// const analytics = getAnalytics(app);
