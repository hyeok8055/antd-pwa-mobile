// src/firebase-messaging-sw-logic.js

// Firebase App (the core Firebase SDK) is always required and must be listed first
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"); // 최신 버전 확인 및 적용 권장

// Add the Firebase products that you want to use
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js"); // 최신 버전 확인 및 적용 권장

// Initialize the Firebase app in the service worker by passing in the
// messagingSenderId.
// 중요: firebaseconfig.js 와 동일한 설정 값을 사용해야 합니다.
const firebaseConfig = {
  apiKey: "AIzaSyBqu5TDSwaY_qvunrS8pJrWdpIlwJeOMrU", // firebaseconfig.js 와 동일하게
  authDomain: "calori-sync-f0431.firebaseapp.com", // firebaseconfig.js 와 동일하게
  projectId: "calori-sync-f0431", // firebaseconfig.js 와 동일하게
  storageBucket: "calori-sync-f0431.firebasestorage.app", // firebaseconfig.js 와 동일하게
  messagingSenderId: "830533101887", // firebaseconfig.js 와 동일하게
  appId: "1:830533101887:web:5bd8aed35d49ea87758b8a", // firebaseconfig.js 와 동일하게
  measurementId: "G-55K939QBD7" // firebaseconfig.js 와 동일하게 (선택적)
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // Customize notification here
  const notificationTitle = payload.notification?.title || '새 알림'; // 제목 없으면 기본값
  const notificationOptions = {
    body: payload.notification?.body || '', // 내용 없으면 빈 문자열
    icon: '/icons/maskable_icon_x192.png' // public 폴더 기준 경로
    // badge, image, tag 등 추가 옵션 사용 가능: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
}); 