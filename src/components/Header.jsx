import React, { useState, useEffect } from 'react';
import { NavBar, Space, Button } from 'antd-mobile';
import { SetOutline } from 'antd-mobile-icons';
import { useNavigate } from 'react-router-dom';
import SidePopUp from './common/SidePopUp';
import { auth } from '../firebaseconfig';
import { useDispatch } from 'react-redux';
import { clearAuthStatus } from '../redux/actions/authActions';
import { signOut } from 'firebase/auth';

const Header = () => {
  const navigate = useNavigate();
  const [visiblePopup, setVisiblePopup] = useState(false);
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const dispatch = useDispatch();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        setUserName(user.displayName || '사용자');
        setEmail(user.email || '');
      } else {
        setUserName('');
        setEmail('');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      dispatch(clearAuthStatus());
      localStorage.setItem('isAuthenticated', 'false');
      navigate('/googlelogin');
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  const right = (
    <div style={{ fontSize: 27 }}>
      <Space style={{ '--gap': '16px', marginTop: '15px' }}>
        <SetOutline onClick={() => setVisiblePopup(true)} />
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
    <>
      <NavBar right={right} backIcon={false}></NavBar>
      <SidePopUp 
        visible={visiblePopup} 
        onClose={() => setVisiblePopup(false)} 
        onLogout={handleLogout}
        userName={userName}
        email={email}
      />
    </>
  );
};

export default Header; 