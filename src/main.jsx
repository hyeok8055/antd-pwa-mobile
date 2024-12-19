import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import store from './redux/store';
import '@/styles/globals.css';
import App from './App.jsx';
import { ConfigProvider } from 'antd';
import { antdTheme } from '@/styles/antdTheme';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfigProvider theme={antdTheme}>
      <Provider store={store}>
        <App />
      </Provider>
    </ConfigProvider>
  </StrictMode>
);
