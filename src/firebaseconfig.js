// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBqu5TDSwaY_qvunrS8pJrWdpIlwJeOMrU",
  authDomain: "calori-sync-f0431.firebaseapp.com",
  databaseURL: "https://calori-sync-f0431-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "calori-sync-f0431",
  storageBucket: "calori-sync-f0431.firebasestorage.app",
  messagingSenderId: "830533101887",
  appId: "1:830533101887:web:5bd8aed35d49ea87758b8a",
  measurementId: "G-55K939QBD7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const realtimeDb = getDatabase(app);
const messaging = getMessaging(app);

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

export { 
  app, 
  auth, 
  db, 
  realtimeDb, 
  checkDeviceCompatibility,
  messaging,
  getToken,
  onMessage
};
