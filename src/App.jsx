import React, { useState, useEffect } from 'react';
import { MemoryRouter as Router, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import AppRoutes from './routes';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const storedAuth = localStorage.getItem('isAuthenticated');
    return storedAuth === 'true';
  });

  useEffect(() => {
    localStorage.setItem('isAuthenticated', isAuthenticated);
  }, [isAuthenticated]);

  return (
    <Router initialEntries={['/main']}>
      <ConditionalHeaderFooter isAuthenticated={isAuthenticated} />
    </Router>
  );
};

const ConditionalHeaderFooter = ({ isAuthenticated }) => {
  const location = useLocation();

  // Header와 Footer를 숨길 라우트 목록
  const hiddenRoutes = ['/googlelogin'];

  // 현재 라우트가 hiddenRoutes에 포함되어 있는지 확인
  const shouldHideHeaderFooter = hiddenRoutes.includes(location.pathname);

  return (
    <div className="app h-screen overflow-y-auto overflow-x-hidden flex flex-col">
      {!shouldHideHeaderFooter && (
        <div className="h-[7%]">
          <Header />
        </div>
      )}
      <div className="flex-1 h-[86%] border-b border-gray-200">
        <AppRoutes isAuthenticated={isAuthenticated} />
      </div>
      {!shouldHideHeaderFooter && (
        <div className="fixed bottom-0 left-0 right-0 h-[7%] bg-white shadow-md flex items-center border-t border-gray-300">
          <Footer />
        </div>
      )}
    </div>
  )
}

export default App;
