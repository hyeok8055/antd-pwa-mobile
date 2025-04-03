importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// 서비스 워커 정보 로깅 (디버깅용)
console.log('[firebase-messaging-sw.js] 서비스 워커 시작', self);

// Firebase 초기화
firebase.initializeApp({
  apiKey: "AIzaSyBqu5TDSwaY_qvunrS8pJrWdpIlwJeOMrU",
  authDomain: "calori-sync-f0431.firebaseapp.com",
  projectId: "calori-sync-f0431",
  storageBucket: "calori-sync-f0431.firebasestorage.app",
  messagingSenderId: "830533101887",
  appId: "1:830533101887:web:5bd8aed35d49ea87758b8a",
  measurementId: "G-55K939QBD7"
});

// 메시징 초기화
const messaging = firebase.messaging();

// iOS 환경 감지 함수 (User-Agent를 사용할 수 없으므로 제한적 기능)
const detectIOSPlatform = () => {
  // 서비스 워커 환경에서는 User-Agent에 접근할 수 없으므로
  // 정확한 iOS 감지는 불가능합니다.
  // 대신 클라이언트에서 정보를 전달받도록 함수만 준비합니다.
  return false; // 기본값은 false
};

// 서비스 워커 컨트롤 확인
const checkServiceWorkerControl = () => {
  const clientCount = self.clients ? 1 : 0;
  console.log('[firebase-messaging-sw.js] 현재 컨트롤 중인 클라이언트 수:', clientCount);
  return clientCount > 0;
};

class CustomPushEvent extends Event {
  constructor(data) {
    super('push');

    Object.assign(this, data);
    this.custom = true;
  }
}

/*
 * Overrides push notification data, to avoid having 'notification' key and firebase blocking
 * the message handler from being called
 */
self.addEventListener('push', (e) => {
  // 이벤트 로깅
  console.log('[firebase-messaging-sw.js] Push 이벤트 수신:', e);
  
  // Skip if event is our own custom event
  if (e.custom) return;

  // Keep old event data to override
  const oldData = e.data;
  if (!oldData) {
    console.warn('[firebase-messaging-sw.js] Push 이벤트에 데이터가 없습니다.');
    return;
  }

  // Create a new event to dispatch, pull values from notification key and put it in data key,
  // and then remove notification key
  const newEvent = new CustomPushEvent({
    data: {
      json() {
        // Make sure oldData.json() is called only once
        try {
          const originalPayload = oldData.json();
          console.log('[firebase-messaging-sw.js] Original push event data:', originalPayload);

          const newData = { ...originalPayload }; // Create a mutable copy

          // iOS 백그라운드 메시지를 위한 특별 처리
          // iOS에서는 data 필드가 반드시 있어야 백그라운드에서 처리됨
          if (!newData.data) {
            newData.data = {};
          }

          if (newData.notification) {
            // Merge notification data into data, potentially overwriting existing keys if needed
            newData.data = {
              ...(newData.data || {}), // Preserve existing data fields
              ...newData.notification, // Merge notification fields
              // iOS에 필요한 추가 필드 (예: mutable-content, content-available)
              "content-available": "1",
              "mutable-content": "1",
              "priority": "high",
            };
            delete newData.notification; // Remove the original notification key
            console.log('[firebase-messaging-sw.js] Modified push event data (notification moved to data):', newData);
          } else {
            // notification 키가 없어도 iOS 필수 필드 추가
            newData.data = {
              ...newData.data,
              "content-available": "1",
              "mutable-content": "1",
              "priority": "high",
            };
            console.log('[firebase-messaging-sw.js] No notification key found in original data, added iOS required fields.');
          }
          return newData;
        } catch (error) {
          console.error('[firebase-messaging-sw.js] Push 이벤트 데이터 처리 중 오류:', error);
          return {};
        }
      },
      // Keep other potential methods if they exist, though json() is the primary one
      arrayBuffer: oldData.arrayBuffer && oldData.arrayBuffer.bind(oldData),
      blob: oldData.blob && oldData.blob.bind(oldData),
      text: oldData.text && oldData.text.bind(oldData),
    },
    waitUntil: e.waitUntil.bind(e),
  });

  // Stop event propagation for the original event
  e.stopImmediatePropagation();
  console.log('[firebase-messaging-sw.js] Dispatching modified push event.');
  // Dispatch the new wrapped event
  dispatchEvent(newEvent);
});

// 필수: 백그라운드 메시지 핸들러 (iOS 지원 개선)
messaging.onBackgroundMessage((payload) => {
  // 수신된 페이로드 로깅 (notification 포함 여부 확인용)
  console.log('[firebase-messaging-sw.js] 백그라운드 메시지 수신:', payload);

  // iOS 디바이스에서 백그라운드 메시지 처리 강화
  const isIOSPayload = payload.data && (payload.data['content-available'] === '1' || payload.data['mutable-content'] === '1');
  if (isIOSPayload) {
    console.log('[firebase-messaging-sw.js] iOS 백그라운드 메시지 감지됨');
  }

  // --- Start: payload.notification 확인 --- 
  if (payload.notification) {
    // payload.notification 객체가 존재하면 FCM SDK가 알림을 표시할 것으로 간주
    console.log('[firebase-messaging-sw.js] "notification" 페이로드 감지. SDK가 알림을 처리할 것으로 예상합니다. showNotification() 호출 안 함.');

    // notification 객체가 있더라도 data 페이로드에 다른 정보(예: 배지 카운트)가 있다면 처리
    if (payload.data && 'setAppBadge' in navigator) {
      const badgeCount = parseInt(payload.data.badgeCount, 10);
      if (!isNaN(badgeCount) && badgeCount > 0) {
        navigator.setAppBadge(badgeCount).catch((error) => {
          console.error('[firebase-messaging-sw.js] 앱 배지 설정 실패 (notification 있음): ', error);
        });
      } else {
        if ('clearAppBadge' in navigator) {
          navigator.clearAppBadge().catch((error) => {
            console.error('[firebase-messaging-sw.js] 앱 배지 제거 실패 (notification 있음): ', error);
          });
        }
      }
    } else if ('setAppBadge' in navigator) {
        // data는 없지만 notification은 있는 경우 -> 배지 제거 시도
        if ('clearAppBadge' in navigator) {
            navigator.clearAppBadge().catch((error) => {
                console.error('[firebase-messaging-sw.js] 앱 배지 제거 실패 (notification만 있음): ', error);
            });
        }
    }

    // iOS 디바이스를 위한 추가 처리
    if (isIOSPayload) {
      console.log('[firebase-messaging-sw.js] iOS 디바이스용 notification 처리. 추가 알림 생성은 건너뜁니다.');
    }

    // 여기서 showNotification을 호출하지 않고 핸들러 종료
    return; 
  }
  // --- End: payload.notification 확인 --- 

  // --- payload.notification이 없을 경우 (데이터 전용 메시지) 아래 로직 실행 ---
  console.log('[firebase-messaging-sw.js] 데이터 전용 메시지 수신. 커스텀 알림을 생성합니다.');

  // data 페이로드가 없으면 처리 중단 (데이터 전용 메시지라도 data는 있어야 함)
  if (!payload.data) {
    console.warn('[firebase-messaging-sw.js] 데이터 페이로드 없이 메시지 수신 (notification도 없음):', payload);
    return;
  }

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
    // iOS에 필수적인 필드 추가
    silent: payload.data.silent === 'true', // iOS에서 조용한 알림 지원
    renotify: payload.data.renotify === 'true', // 같은 태그여도 새 알림으로 간주
    // data 페이로드에서 추가 옵션 가져오기
    ...(payload.data.image && { image: payload.data.image }), // data.image 사용
    ...(payload.data.requireInteraction === 'true' && { requireInteraction: true }), // data.requireInteraction 사용

    // 중요: 클릭 시 필요한 데이터 (예: URL)를 data 객체 안에 포함시켜야 함
    // 모든 data 필드를 notification.data에 그대로 전달하여 notificationclick 이벤트에서 사용
    data: { 
      ...payload.data,
      // iOS 지원을 위한 추가 필드
      iOSSpecific: true,
      timestamp: Date.now()
    }
  };

  // 클릭 시 열릴 URL을 data 필드의 최상위로 설정 (notificationclick 이벤트 핸들러 호환성)
  notificationOptions.data.url = payload.data.url || '/'; // data.url 사용, 없으면 '/'

  try {
    // iOS에서 알림 표시가 잘 되도록 Promise 처리
    self.registration.showNotification(notificationTitle, notificationOptions)
      .then(() => {
        console.log('[firebase-messaging-sw.js] 알림이 성공적으로 표시되었습니다.');
      })
      .catch(error => {
        console.error('[firebase-messaging-sw.js] 알림 표시 중 오류 발생:', error);
      });
  } catch (error) {
    console.error('[firebase-messaging-sw.js] showNotification 호출 중 오류:', error);
  }

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

// 알림 클릭 이벤트 개선 (iOS 지원 추가)
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] 알림 클릭됨:', event);

  event.notification.close();

  // 앱 아이콘 배지 클리어
  if ('clearAppBadge' in navigator) {
    navigator.clearAppBadge().catch((error) => {
      console.error('[firebase-messaging-sw.js] 앱 배지 제거 실패:', error);
    });
  }

  // iOS 특정 데이터 확인
  const isIOSSpecific = event.notification.data?.iOSSpecific === true;
  if (isIOSSpecific) {
    console.log('[firebase-messaging-sw.js] iOS 특화 알림 클릭 처리');
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
          
          // iOS PWA에서는 navigate() 메서드도 확인
          const canNavigate = 'navigate' in windowClient;
          
          if (clientUrl.origin === targetUrl.origin) {
            if (clientUrl.pathname === targetUrl.pathname && 'focus' in windowClient) {
              // 같은 페이지면 포커스만
              windowClient.focus();
              return true;
            } else if (canNavigate) {
              // 다른 페이지면 해당 클라이언트 내에서 탐색
              windowClient.focus();
              windowClient.navigate(urlToOpen);
              return true;
            }
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

      // 열린 탭이 없으면 새 창 열기 (iOS PWA에서도 작동하도록 개선)
      if (!hadWindowToFocus && clients.openWindow) {
        console.log('[firebase-messaging-sw.js] 새 창 열기:', urlToOpen);
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// 서비스 워커 활성화 시 실행
self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] 서비스 워커 활성화됨');
  // 모든 클라이언트에 대한 제어권 즉시 획득
  event.waitUntil(clients.claim());
});

// 설치 이벤트
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] 서비스 워커 설치됨');
  // 즉시 활성화
  self.skipWaiting();
});