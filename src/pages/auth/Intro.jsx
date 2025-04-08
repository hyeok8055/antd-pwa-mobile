import React, { useState } from 'react';
import { Form, Input, Select, Button, Radio, Card, Typography, Row, Col } from 'antd';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseconfig';
import { useSelector, useDispatch } from 'react-redux';
import { setAuthStatus } from '../../redux/actions/authActions';

const { Option } = Select;

const Intro = () => {
  const navigate = useNavigate();
  const uid = useSelector((state) => state.auth.user?.uid);
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [showCustomGoal, setShowCustomGoal] = useState(false);

  const onFinish = async (values) => {
    try {
      const userRef = doc(db, "users", uid);
      
      // 최종 목표값 설정
      const finalGoal = values.goal === 'customGoal' ? values.customGoalText : values.goal;
      
      // Firestore에 저장할 데이터
      const userData = {
        ...values,
        goal: finalGoal,
        setupCompleted: true
      };

      // Firestore 업데이트
      await updateDoc(userRef, userData);

      // Redux 상태 업데이트
      dispatch(setAuthStatus({
        ...userData,
        uid,
        setupCompleted: true
      }));

      // 모든 처리가 완료된 후 메인 페이지로 이동
      navigate('/main');
    } catch (error) {
      console.error("사용자 정보 업데이트 실패:", error);
    }
  };

  const handleGoalChange = (value) => {
    setShowCustomGoal(value === 'customGoal');
    if (value !== 'customGoal') {
      form.setFieldValue('customGoalText', undefined);
    }
  };

  return (
    <div style={{ padding: '20px', minHeight: '100vh', backgroundColor: '#f0f2f5', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Card 
        style={{ 
          maxWidth: '450px', 
          width: '100%', 
          borderRadius: '12px', 
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
        }}
      >
        <Typography.Title 
          level={2} 
          style={{ 
            textAlign: 'center', 
            marginBottom: '30px', 
            fontFamily: 'Pretendard-800', 
            color: '#333',
            letterSpacing: '1px' 
          }}
        >
          프로필 설정
        </Typography.Title>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          size="large" // 폼 요소 크기 조정
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="height"
                label={<span style={{ fontFamily: 'Pretendard-600' }}>키 (cm)</span>}
                rules={[{ required: true, message: '키를 입력해주세요' }]}
              >
                <Input placeholder="예) 175" type="number" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="age"
                label={<span style={{ fontFamily: 'Pretendard-600' }}>나이</span>}
                rules={[{ required: true, message: '나이를 입력해주세요' }]}
              >
                <Input placeholder="예) 25" type="number" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="gender"
            label={<span style={{ fontFamily: 'Pretendard-600' }}>성별</span>}
            rules={[{ required: true, message: '성별을 선택해주세요' }]}
          >
            <Radio.Group style={{ width: '100%' }}>
              <Radio.Button value="male" style={{ width: '50%', textAlign: 'center', borderRadius: '8px 0 0 8px' }}>남성</Radio.Button>
              <Radio.Button value="female" style={{ width: '50%', textAlign: 'center', borderRadius: '0 8px 8px 0' }}>여성</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="goal"
            label={<span style={{ fontFamily: 'Pretendard-600' }}>목표</span>}
            rules={[{ required: true, message: '목표를 선택해주세요' }]}
          >
            <Select onChange={handleGoalChange} placeholder="목표를 선택해주세요" style={{ borderRadius: '8px' }}>
              <Option value="diet">다이어트</Option>
              <Option value="bulk">벌크업</Option>
              <Option value="bodyprofile">바디프로필</Option>
              <Option value="diabetes">혈당관리</Option>
              <Option value="fitness">체력증진</Option>
              <Option value="customGoal">기타</Option>
            </Select>
          </Form.Item>

          {showCustomGoal && (
            <Form.Item
              name="customGoalText"
              label={<span style={{ fontFamily: 'Pretendard-600' }}>목표 직접 입력</span>}
              rules={[{ required: true, message: '목표를 입력해주세요' }]}
            >
              <Input placeholder="목표를 입력해주세요" style={{ borderRadius: '8px' }} />
            </Form.Item>
          )}

          <Form.Item style={{ marginTop: '30px' }}>
            <Button
              type="primary"
              htmlType="submit"
              block // 버튼 너비를 100%로 설정
              style={{ 
                height: '50px', 
                borderRadius: '8px', 
                backgroundColor: '#5FDD9D', // FoodList의 메인 컬러 사용
                borderColor: '#5FDD9D',
                boxShadow: '0 2px 6px rgba(95, 221, 157, 0.4)'
              }}
            >
              <span style={{ fontFamily: 'Pretendard-700', fontSize: '16px', letterSpacing: '1px' }}>
                설정 완료
              </span>
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Intro; 