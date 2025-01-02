import React, { useState } from 'react';
import { Form, Input, Select, Button, Radio } from 'antd';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseconfig';
import { useSelector } from 'react-redux';

const { Option } = Select;

const Intro = () => {
  const navigate = useNavigate();
  const uid = useSelector((state) => state.auth.user?.uid);
  const [form] = Form.useForm();
  const [showCustomGoal, setShowCustomGoal] = useState(false);

  const onFinish = async (values) => {
    try {
      const userRef = doc(db, "users", uid);
      const finalGoal = values.goal === 'customGoal' ? values.customGoalText : values.goal;
      
      await updateDoc(userRef, {
        ...values,
        goal: finalGoal,
        setupCompleted: true
      });
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
    <div className="flex flex-col items-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white rounded-xl shadow-md p-8 w-full max-w-md mt-[25%]">
        <div className="font-bold text-center mb-6" style={{fontFamily: 'Pretendard-800', letterSpacing: '1px', fontSize: '28px'}}>프로필 설정</div>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
        >
          <Form.Item
            name="height"
            label="키 (cm)"
            rules={[{ required: true, message: '키를 입력해주세요' }]}
          >
            <Input placeholder="키를 입력해주세요" type="number" />
          </Form.Item>

          <Form.Item
            name="gender"
            label="성별"
            rules={[{ required: true, message: '성별을 선택해주세요' }]}
          >
            <Radio.Group>
              <Radio value="male">남성</Radio>
              <Radio value="female">여성</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="age"
            label="나이"
            rules={[{ required: true, message: '나이를 입력해주세요' }]}
          >
            <Input placeholder="나이를 입력해주세요" type="number" />
          </Form.Item>

          <Form.Item
            name="goal"
            label="목표"
            rules={[{ required: true, message: '목표를 선택해주세요' }]}
          >
            <Select onChange={handleGoalChange}>
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
              label="목표 직접 입력"
              rules={[{ required: true, message: '목표를 입력해주세요' }]}
            >
              <Input placeholder="목표를 입력해주세요" />
            </Form.Item>
          )}

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="w-full bg-green-500 hover:bg-green-600 h-[45px]"
            >
              <div className="text-white" style={{fontFamily: 'Pretendard-700', letterSpacing: '1.5px', fontSize: '16px'}}>설정 완료</div>
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default Intro; 