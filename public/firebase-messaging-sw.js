importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBqu5TDSwaY_qvunrS8pJrWdpIlwJeOMrU",
  authDomain: "calori-sync-f0431.firebaseapp.com",
  projectId: "calori-sync-f0431",
  storageBucket: "calori-sync-f0431.firebasestorage.app",
  messagingSenderId: "830533101887",
  appId: "1:830533101887:web:5bd8aed35d49ea87758b8a",
  measurementId: "G-55K939QBD7"
});

const messaging = firebase.messaging();

self.addEventListener('install', (event) => {
  console.log('서비스 워커가 설치됨');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('서비스 워커가 활성화됨');
  event.waitUntil(clients.claim());
});

// 백그라운드 메시지 처리 개선
messaging.onBackgroundMessage((payload) => {
  console.log('백그라운드 메시지 수신:', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/path/to/icon.png', // 앱 아이콘 경로로 수정
    badge: '/path/to/badge.png', // 알림 뱃지 아이콘
    data: payload.data, // 추가 데이터 전달
    tag: 'notification-tag', // 알림 그룹화
    vibrate: [200, 100, 200] // 진동 패턴
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 알림 클릭 이벤트 처리 개선
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((windowClients) => {
      // 이미 열린 창이 있다면 포커스
      for (let client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // 열린 창이 없다면 새 창 열기
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
}); 