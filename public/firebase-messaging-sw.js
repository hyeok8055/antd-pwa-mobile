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

// 필수: 백그라운드 메시지 핸들러
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] 백그라운드 메시지 수신:', payload);
  
  // 데이터 메시지와 알림 메시지 모두 처리 (FCM 콘솔 및 HTTP v1 API 지원)
  let notificationTitle = '알림';
  let notificationOptions = {
    body: '새로운 알림이 있습니다',
    icon: '/icons/maskable_icon_x192.png',
    badge: '/icons/favicon-96x96.png',
    tag: 'notification-' + Date.now(),
    data: { url: '/' },
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'open',
        title: '열기'
      }
    ]
  };

  // 알림 필드가 있는 경우 (FCM 콘솔에서 보낸 경우)
  if (payload.notification) {
    notificationTitle = payload.notification.title || notificationTitle;
    notificationOptions.body = payload.notification.body || notificationOptions.body;
    if (payload.notification.image) {
      notificationOptions.image = payload.notification.image;
    }
  }

  // 데이터 필드가 있는 경우 (REST API에서 보낸 경우)
  if (payload.data) {
    if (payload.data.title) {
      notificationTitle = payload.data.title;
    }
    if (payload.data.body) {
      notificationOptions.body = payload.data.body;
    }
    if (payload.data.image) {
      notificationOptions.image = payload.data.image;
    }
    if (payload.data.url) {
      notificationOptions.data = { url: payload.data.url };
    }
    if (payload.data.requireInteraction === 'true') {
      notificationOptions.requireInteraction = true;
    }
    // 추가 데이터 필드 처리
    notificationOptions.data = { ...notificationOptions.data, ...payload.data };
  }

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 알림 클릭 이벤트 개선
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] 알림 클릭됨:', event);
  
  event.notification.close();
  
  // 이동할 URL 결정
  const urlToOpen = event.notification.data?.url || 
                     event.action === 'open' ? event.notification.data?.url : '/' || 
                     '/';
  
  // 클라이언트 윈도우 처리
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientWindows) => {
      // 이미 열린 탭이 있는지 확인
      const hadWindowToFocus = clientWindows.some(windowClient => {
        if (windowClient.url === urlToOpen && 'focus' in windowClient) {
          windowClient.focus();
          return true;
        }
        return false;
      });

      // 열린 탭이 없으면 새 창 열기
      if (!hadWindowToFocus && clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// 푸시 이벤트 처리
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] 푸시 이벤트 수신:', event);
  
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[firebase-messaging-sw.js] 푸시 페이로드:', payload);
      
      // 알림 데이터 구성
      let notificationTitle = payload.notification?.title || '알림';
      let notificationOptions = {
        body: payload.notification?.body || '새로운 메시지가 있습니다',
        icon: '/icons/maskable_icon_x192.png',
        badge: '/icons/favicon-96x96.png',
        tag: 'push-notification-' + Date.now(),
        data: payload.data || {},
        vibrate: [200, 100, 200]
      };
      
      event.waitUntil(
        self.registration.showNotification(notificationTitle, notificationOptions)
      );
    } catch (e) {
      console.error('[firebase-messaging-sw.js] 푸시 이벤트 처리 중 오류:', e);
    }
  }
}); 