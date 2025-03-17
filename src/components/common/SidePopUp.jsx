import React, { useState, useEffect } from 'react';
import { Typography, Select, Divider } from 'antd';
import { Popup, Space, Button, Avatar, Form, Input, Radio, Toast } from 'antd-mobile';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseconfig';
import { useSelector } from 'react-redux';

const { Text } = Typography;

const SidePopUp = ({ visible, onClose, onLogout, userName, email }) => {
  const [userInfo, setUserInfo] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const uid = useSelector((state) => state.auth.user?.uid);
  const [form] = Form.useForm();

  // 사용자 정보 불러오기
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (uid) {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
          setUserInfo(userDoc.data());
          form.setFieldsValue(userDoc.data());
        }
      }
    };

    if (visible) {
      fetchUserInfo();
    }
  }, [uid, visible]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async (values) => {
    try {
      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, values);
      setUserInfo(values);
      setIsEditing(false);
    } catch (error) {
      console.error("정보 업데이트 실패:", error);
    }
  };

  const refreshApp = () => {
    Toast.show({
      content: '새로고침 중...',
      duration: 1000,
    });

    // 새로고침 후 /main으로 리다이렉트
    setTimeout(() => {
      window.location.href = 'https://calorie-sync.netlify.app';
    }, 500);
  };

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
          backgroundColor: 'rgba(95, 221, 157, 0.8)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
        <Space direction='vertical' style={{ '--gap': '3px' }}>
          <Avatar size={64} src='' style={{ marginTop: "8px" }} />
          <Text style={{ letterSpacing: '5px', fontSize: '25px', fontWeight: '800', color: 'black', marginBottom: '0px' }}>{userName}</Text>
          <Text style={{ letterSpacing: '1px', fontSize: '12px', fontWeight: '400', color: 'black' }}>{email}</Text>
        </Space>
      </div>

      {/* 사용자 정보 영역 */}
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
        {!isEditing ? (
          // 정보 표시 모드
          <div className="space-y-4" style={{padding: '4px', marginTop: '8px'}}>
            <div style={{fontFamily: 'Pretendard-800', letterSpacing: '1px', fontSize: '16px', marginBottom: '16px'}}>프로필 정보</div>
            <Divider />
            <div>
              <Text style={{ fontWeight: 'bold', fontFamily: 'Pretendard-500', letterSpacing: '1.5px', fontSize: '16px' }}>키:</Text>
              <Text> {userInfo?.height}cm</Text>
            </div>
            <div>
              <Text style={{ fontWeight: 'bold', fontFamily: 'Pretendard-500', letterSpacing: '1.5px', fontSize: '16px' }}>성별:</Text>
              <Text> {userInfo?.gender === 'male' ? '남성' : '여성'}</Text>
            </div>
            <div>
              <Text style={{ fontWeight: 'bold', fontFamily: 'Pretendard-500', letterSpacing: '1.5px', fontSize: '16px' }}>나이:</Text>
              <Text> {userInfo?.age}세</Text>
            </div>
            <div>
              <Text style={{ fontWeight: 'bold', fontFamily: 'Pretendard-500', letterSpacing: '1.5px', fontSize: '16px' }}>목표:</Text>
              <Text> {userInfo?.goal}</Text>
            </div>
            <Button color='primary' onClick={handleEdit} style={{ marginTop: '32px', width: '100%', height: '30px' }}>
              <div style={{fontFamily: 'Pretendard-500', letterSpacing: '1.5px', fontSize: '12px'}}>정보 수정</div>
            </Button>
            <Button color='default' onClick={refreshApp} style={{ marginTop: '8px', width: '100%', height: '30px' }}>
              <div style={{fontFamily: 'Pretendard-500', letterSpacing: '1.5px', fontSize: '12px'}}>새로고침</div>
            </Button>
          </div>
        ) : (
          // 정보 수정 모드
          <Form
            form={form}
            onFinish={handleSave}
            layout='vertical'
            initialValues={userInfo}
          >
            <Form.Item
              name="height"
              label="키 (cm)"
              rules={[{ required: true }]}
            >
              <Input type="number" />
            </Form.Item>

            <Form.Item
              name="gender"
              label="성별"
              rules={[{ required: true }]}
            >
              <Radio.Group style={{width: '100%'}}>
                <Radio value="male">남성</Radio>
                <Radio style={{marginLeft: '20%'}} value="female">여성</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              name="age"
              label="나이"
              rules={[{ required: true }]}
            >
              <Input type="number" />
            </Form.Item>

            <Form.Item
              name="goal"
              label="목표"
              rules={[{ required: true }]}
            >
              <Select style={{width: '100%'}}>
                <Select.Option value="diet">다이어트</Select.Option>
                <Select.Option value="bulk">벌크업</Select.Option>
                <Select.Option value="bodyprofile">바디프로필</Select.Option>
                <Select.Option value="diabetes">혈당관리</Select.Option>
                <Select.Option value="fitness">체력증진</Select.Option>
                <Select.Option value="customGoal">기타</Select.Option>
              </Select>
            </Form.Item>

            {form.getFieldValue('goal') === 'customGoal' && (
              <Form.Item
                name="customGoalText"
                label="목표 직접 입력"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            )}

            <Space>
              <Button color='primary' onClick={() => form.submit()}>
                저장
              </Button>
              <Button onClick={() => setIsEditing(false)}>
                취소
              </Button>
            </Space>
          </Form>
        )}
      </div>

      {/* 하단 영역 */}
      <div
        style={{
          width: '100%',
          padding: '16px',
          borderTop: '1px solid #eee',
        }}
      >
        <Button onClick={onLogout} style={{ width: '100%' }} color='danger'>
          로그아웃
        </Button>
      </div>
    </Popup>
  );
};

export default SidePopUp;
