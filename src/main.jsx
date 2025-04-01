import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import '@/styles/globals.css';
import App from './App.jsx';
// import { ConfigProvider } from 'antd';
import { ConfigProvider } from 'antd-mobile';
import { antdTheme } from '@/styles/antdTheme';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './redux/store';
import ko_KR from 'antd-mobile/es/locales/ko-KR'

// Firebase 서비스 워커 등록
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' })
      .then((registration) => {
        console.log('Firebase 메시징 서비스 워커 등록 성공:', registration.scope);
      }).catch((error) => {
        console.error('Firebase 메시징 서비스 워커 등록 실패:', error);
      });
  });
} else {
  console.log('서비스 워커를 지원하지 않는 브라우저입니다.');
}

// PWA 등록 - Vite PWA 플러그인이 자동으로 처리하므로 별도 등록 코드 제거
// FCM 푸시 알림은 App.jsx에서 관리하므로 여기서 등록하지 않음

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfigProvider theme={{
        ...antdTheme,
        token: {
            ...antdTheme.token,
            fontFamily: "Pretendard Local",
        }
    }} locale={ko_KR}>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <App />
        </PersistGate>
      </Provider>
    </ConfigProvider>
  </StrictMode>
);
