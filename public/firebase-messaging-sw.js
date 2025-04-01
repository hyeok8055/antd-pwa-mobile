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

// 필수: 백그라운드 메시지 핸들러 (Stack Overflow 해결 방법 적용)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] 백그라운드 메시지 수신 (data 전용 처리):', payload);

  // data 페이로드가 없으면 처리 중단 (서버에서 data 필드를 보내야 함)
  if (!payload.data) {
    console.warn('[firebase-messaging-sw.js] 데이터 페이로드 없이 메시지 수신:', payload);
    return;
  }

  // --- payload.notification 객체 참조 제거 ---
  // 알림 필드가 있는 경우 (FCM 콘솔에서 보낸 경우) -> 이제 사용 안 함
  // if (payload.notification) { ... }

  // --- 오직 payload.data 객체만을 사용하여 알림 구성 ---
  const notificationTitle = payload.data.title || '알림'; // data.title 사용, 없으면 기본값
  const notificationOptions = {
    body: payload.data.body || '새로운 메시지가 있습니다', // data.body 사용, 없으면 기본값
    icon: payload.data.icon || '/icons/maskable_icon_x192.png', // data.icon 사용, 없으면 기본값
    badge: payload.data.badge || '/icons/favicon-96x96.png', // data.badge 사용, 없으면 기본값
    tag: payload.data.tag || 'notification-' + Date.now(), // data.tag 사용, 없으면 기본값
    vibrate: [200, 100, 200], // 진동은 유지
    actions: [ // 액션은 유지 (필요시 data에서 동적으로 구성 가능)
      {
        action: 'open',
        title: '열기'
      }
    ],
    // data 페이로드에서 추가 옵션 가져오기
    ...(payload.data.image && { image: payload.data.image }), // data.image 사용
    ...(payload.data.requireInteraction === 'true' && { requireInteraction: true }), // data.requireInteraction 사용

    // 중요: 클릭 시 필요한 데이터 (예: URL)를 data 객체 안에 포함시켜야 함
    // 모든 data 필드를 notification.data에 그대로 전달하여 notificationclick 이벤트에서 사용
    data: { ...payload.data }
  };

  // 클릭 시 열릴 URL을 data 필드의 최상위로 설정 (notificationclick 이벤트 핸들러 호환성)
  notificationOptions.data.url = payload.data.url || '/'; // data.url 사용, 없으면 '/'

  self.registration.showNotification(notificationTitle, notificationOptions);

  // 앱 아이콘 배지 업데이트 (카운트는 data 페이로드에서 받아오도록 권장)
  if ('setAppBadge' in navigator) {
    // 예시: 서버에서 payload.data.badgeCount 로 숫자 전달
    const badgeCount = parseInt(payload.data.badgeCount, 10);
    if (!isNaN(badgeCount) && badgeCount > 0) {
      navigator.setAppBadge(badgeCount).catch((error) => {
        console.error('[firebase-messaging-sw.js] 앱 배지 설정 실패:', error);
      });
    } else {
      // 카운트가 없거나 0이면 배지 제거
      if ('clearAppBadge' in navigator) {
        navigator.clearAppBadge().catch((error) => {
          console.error('[firebase-messaging-sw.js] 앱 배지 제거 실패:', error);
        });
      }
    }
  } else {
    console.log('[firebase-messaging-sw.js] 앱 배지 API가 지원되지 않습니다.');
  }
});

// 알림 클릭 이벤트 개선 (기존 코드 유지)
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] 알림 클릭됨:', event);

  event.notification.close();

  // 앱 아이콘 배지 클리어
  if ('clearAppBadge' in navigator) {
    navigator.clearAppBadge().catch((error) => {
      console.error('[firebase-messaging-sw.js] 앱 배지 제거 실패:', error);
    });
  }

  // 이동할 URL 결정 (notification.data.url 사용)
  const urlToOpen = event.notification.data?.url || '/';

  // 클라이언트 윈도우 처리
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientWindows) => {
      // 이미 열린 탭이 있는지 확인
      const hadWindowToFocus = clientWindows.some(windowClient => {
        // URL 비교 시 출처(origin)와 경로(pathname)만 비교하는 것이 더 안정적일 수 있음
        try {
          const clientUrl = new URL(windowClient.url);
          const targetUrl = new URL(urlToOpen, self.location.origin); // 상대 경로 처리
          if (clientUrl.origin === targetUrl.origin && clientUrl.pathname === targetUrl.pathname && 'focus' in windowClient) {
            windowClient.focus();
            return true;
          }
        } catch (e) {
          console.error("URL 비교 중 오류:", e);
          // URL 파싱 실패 시 단순 문자열 비교로 대체
          if (windowClient.url === urlToOpen && 'focus' in windowClient) {
             windowClient.focus();
             return true;
          }
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