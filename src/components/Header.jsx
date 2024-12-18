import React from 'react';
import { NavBar, Space, Button } from 'antd-mobile';
import { SetOutline } from 'antd-mobile-icons';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.setItem('isAuthenticated', 'false');
    navigate('/googlelogin');
  };

  const right = (
    <div style={{ fontSize: 27 }}>
      <Space style={{ '--gap': '16px', marginTop: '15px' }}>
        <SetOutline />
      </Space>
    </div>
  );

  const left = (
    <Button 
      size='small'
      onClick={handleLogout}
      style={{ 
        fontSize: '14px',
        padding: '4px 8px',
      }}
    >
      로그아웃
    </Button>
  );

  return (
    <NavBar right={right} left={left} backIcon={false}></NavBar>
  );
};

export default Header; 