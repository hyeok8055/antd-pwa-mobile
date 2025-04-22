// Firebase 앱과 메시징 관련 스크립트 로드
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// Firebase 구성 값 (firebaseconfig.js와 동일한 값 사용)
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

// Firebase 초기화
firebase.initializeApp(firebaseConfig);

// Firebase Messaging 인스턴스 가져오기
const messaging = firebase.messaging();

// 백그라운드 메시지 수신 이벤트 핸들러
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // 알림 설정 커스터마이징
  const notificationTitle = payload.notification?.title || '새 알림';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/icons/maskable_icon_x192.png', // public/icons 폴더 내 아이콘 경로
  };

  // 시스템 알림 표시
  self.registration.showNotification(notificationTitle, notificationOptions);
}); 