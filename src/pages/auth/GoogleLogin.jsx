import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Typography, Row, Col, Spin, Divider } from 'antd';
import { GoogleOutlined } from '@ant-design/icons';
import { auth, db } from "../../firebaseconfig";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useDispatch } from 'react-redux';
import { setAuthStatus } from '../../redux/actions/authActions';
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";

const GoogleLogin = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // 필요한 정보만 추출
      const serializedUser = {
        uid: user.uid,
        displayName: user.displayName || "익명 사용자",
        email: user.email || "이메일 없음",
        photoURL: user.photoURL || null, // 프로필 사진 URL
      };

      // Firestore에 사용자 정보 저장 또는 업데이트
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      
      const userData = {
          name: serializedUser.displayName,
          email: serializedUser.email,
          photoURL: serializedUser.photoURL,
          lastLoginAt: serverTimestamp(),
      };

      if (!userDoc.exists()) {
        userData.createdAt = serverTimestamp();
        userData.setupCompleted = false; // 새로운 사용자 표시
      }

      await setDoc(userRef, userData, { merge: true });

      // Redux에 인증 상태 저장
      dispatch(setAuthStatus(serializedUser));

      // 새 사용자면 인트로 페이지로, 기존 사용자면 메인 페이지로
      if (!userDoc.exists()) {
        navigate('/intro');
      } else {
        navigate('/main');
      }
    } catch (err) {
      console.error("Google 로그인 오류:", err);
      // 사용자에게 오류 메시지 표시 (예: antd Message 컴포넌트 사용)
    } finally {
      setLoading(false);
    }
  };


  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh', 
      backgroundColor: '#f0f2f5' 
    }}>
      <Card 
        style={{ 
          maxWidth: '400px', 
          width: '100%', 
          borderRadius: '12px', 
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
          padding: '20px'
        }}
      >
        <Row justify="center" style={{ marginBottom: '20px' }}>
          <Col>
             {/* 간단한 로고나 아이콘 추가 가능 */}
             <Typography.Title 
                level={1} 
                style={{ 
                  fontFamily: 'Pretendard-800', 
                  color: '#333', 
                  letterSpacing: '1px',
                  marginBottom: '10px'
                }}
              >
                로그인
              </Typography.Title>
          </Col>
        </Row>
        
        <Typography.Paragraph 
          style={{ 
            textAlign: 'center', 
            color: '#666', 
            marginBottom: '30px',
            fontFamily: 'Pretendard-500', 
            fontSize: '16px'
          }}
        >
          SNS 계정으로 간편하게 시작해보세요.
        </Typography.Paragraph>

        <Button
          type="primary"
          icon={<GoogleOutlined />}
          onClick={handleGoogleLogin}
          loading={loading}
          block
          style={{
            height: '50px',
            borderRadius: '8px',
            backgroundColor: 'white',
            borderColor: '#d9d9d9',
            color: '#555',
            fontSize: '16px',
            fontFamily: 'Pretendard-600', 
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}
        >
          {loading ? '로그인 중...' : 'Google 계정으로 로그인'}
        </Button>
        
      </Card>
      {loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <Spin size="large" />
        </div>
      )}
    </div>
  );
};

export default GoogleLogin;
