import React from 'react';

import { Typography } from 'antd';
import { Popup, Space, Button, Avatar } from 'antd-mobile';

const { Text } = Typography;

const SidePopUp = ({ visible, onClose, onLogout, userName, email }) => {
  return (
    <Popup
      visible={visible}
      onMaskClick={onClose}
      position='right'
      bodyStyle={{ width: '60vw', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      {/* 상단 영역 */}
      <div
        style={{
          width: '100%',
          height: '16vh',
          backgroundColor: 'rgba(95, 221, 157, 0.8)', // 배경색 추가 및 투명도 설정
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
        }}>
        <Space direction='vertical' style={{ '--gap': '3px' }}>
          <Avatar size={64} src='' style={{ marginTop : "8px" }} />
          <Text style={{ letterSpacing: '5px', fontSize: '25px', fontWeight: '800', color: 'black', marginBottom: '0px' }}>{userName}</Text>
          <Text style={{ letterSpacing: '1px', fontSize: '12px', fontWeight: '400', color: 'black' }}>{email}</Text>
        </Space>
      </div>

      {/* 하단 영역 */}
      <div
        style={{
          width: '100%',
          flex: 1, // 남은 공간 채우기
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end', // 하단 정렬
          padding: '16px',
        }}
      >
        <Button onClick={onLogout} style={{ width: '100%' }} color='primary'>
          로그아웃
        </Button>
      </div>
    </Popup>
  );
};

export default SidePopUp;
