import React from 'react';

import {
  Route,
  Routes,
  MemoryRouter as Router,
} from 'react-router-dom';

import Header from './components/Header';
import Footer from './components/Footer';
import Main from './pages/Main';
import Fitness from './pages/Fitness';
import Weekly from './pages/Weekly';

    
const App = () => {
  return (
    <Router initialEntries={['/main']}>
      <div className="app h-screen overflow-y-auto overflow-x-hidden flex flex-col">
        {/* 상단바 */}
        <div className="h-[7%]">
          <Header />
        </div>
        {/* 중앙 랜더링 영역 */}
        <div className="flex-1 h-[86%] border-b border-gray-200">
          <Routes>
            <Route exact path='/main' element={<Main />} />
            <Route exact path='/fitness' element={<Fitness />} />
            <Route exact path='/weekly' element={<Weekly />} />
          </Routes>
        </div>
        {/* 하단바 */}
        <div className="fixed bottom-0 left-0 right-0 h-[7%] bg-white shadow-md flex items-center border-t border-gray-300">
          <Footer />
        </div>
      </div>
    </Router>
  );
};

export default App;
