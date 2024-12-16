import React from 'react';
import Footer from './Footer';

const Layout = ({ children }) => {
  return (
    <div className="h-screen overflow-auto">
      {children}
      <Footer />
    </div>
  );
};

export default Layout; 