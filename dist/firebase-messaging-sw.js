// Firebase 메시징 서비스 워커 기능 정의
// 이 파일은 Vite PWA 플러그인에 의해 생성된 sw.js에 의해 importScripts 됩니다.
// 실제 서비스 워커 등록은 Vite PWA 플러그인이 처리합니다.

// Firebase 메시징 변수를 전역으로 정의 (sw.js에서 접근 가능하도록)
self.firebaseMessaging = null;

// Firebase 앱과 메시징 초기화
function initializeFirebaseMessaging() {
  if (!self.firebase) {
    // Firebase 앱과 메시징 관련 스크립트 로드
    importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
    importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

    // Firebase 구성 값
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

    // Firebase Messaging 인스턴스 가져오기 및 전역 변수에 저장
    self.firebaseMessaging = firebase.messaging();
    
    console.log('[firebase-messaging-sw.js] Firebase 메시징 초기화 완료');
  }
  
  return self.firebaseMessaging;
}

// 모듈이 로드되면 Firebase 메시징 초기화
const messaging = initializeFirebaseMessaging();

// 백그라운드 메시지 수신 이벤트 핸들러
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] 백그라운드 메시지 수신:', payload);
  
  // 알림 설정 커스터마이징
  const notificationTitle = payload.notification?.title || '새 알림';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/icons/maskable_icon_x192.png', // public/icons 폴더 내 아이콘 경로
    data: payload.data, // 알림 클릭 시 사용할 데이터
    // 추가 옵션
    badge: '/icons/maskable_icon_x48.png',
    vibrate: [100, 50, 100], // 진동 패턴 (안드로이드)
    tag: 'notification', // 알림 그룹화 태그
    renotify: true // 동일 태그여도 새 알림 표시
  };

  // 시스템 알림 표시
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// 알림 클릭 이벤트 리스너 정의
self.addEventListener('notificationclick', event => {
  console.log('[firebase-messaging-sw.js] 알림 클릭됨:', event);
  event.notification.close();
  
  // 알림 클릭 시 앱 열기
  const urlToOpen = new URL('/', self.location.origin).href;
  
  event.waitUntil(
    clients.matchAll({type: 'window'}).then(windowClients => {
      // 이미 열린 앱 창이 있는지 확인
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // 열린 창이 없으면 새 창 열기
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// 메인 sw.js와 통신하기 위한 메시지 이벤트 리스너
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'FIREBASE_MESSAGING_TEST') {
    self.firebaseMessagingSupport.showTestNotification();
  }
}); 