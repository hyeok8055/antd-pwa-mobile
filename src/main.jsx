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

// FCM 푸시 알림 관련
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/firebase-messaging-sw.js')
    .then(registration => {
      console.log('서비스 워커 등록 성공:', registration.scope);
    })
    .catch(err => {
      console.error('서비스 워커 등록 실패:', err);
    });
}

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
