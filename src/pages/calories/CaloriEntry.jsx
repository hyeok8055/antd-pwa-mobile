import React, { useState, useEffect } from "react";
import { Typography, Input, Button, Space, Progress, Row, Col } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

const { Text } = Typography;

const CaloriEntry = () => {
  const [loading, setLoading] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [estimatedCalories, setEstimatedCalories] = useState("");
  const [calorieDifference, setCalorieDifference] = useState(null);

  const handleClick = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setShowStats(true);
      // 실제 칼로리 값은 임의로 설정
      const actualCalories = 1500;
      const difference = Math.abs(actualCalories - parseInt(estimatedCalories, 10));
      setCalorieDifference(difference);
    }, 3000);
  };

  const handleInputChange = (e) => {
    setEstimatedCalories(e.target.value);
  };

  return (
    <div style={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ marginTop: 40, marginBottom: 40 }}>
        <Text style={{ fontSize: '33px', fontWeight: '800', color: '#5FDD9D', letterSpacing: '1px' }}>
          칼로리 편차 확인하기
        </Text>
      </div>
      <div
        style={{
          height: '40px',
          width: '70%',
          backgroundColor: '#5FDD9D',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          marginTop: 30,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: '16px', fontWeight: '500' }}>
          몇 칼로리를 섭취한 것 같나요?
        </Text>
      </div>
      <div
        style={{
          height: '40px',
          width: '70%',
          backgroundColor: '#f0f0f0',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          marginTop: 4,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          paddingLeft: 10,
          paddingRight: 10,
        }}
      >
        <Input
          placeholder="예상한 칼로리를 입력해주세요"
          value={estimatedCalories}
          onChange={handleInputChange}
          style={{ width: '100%' }}
        />
      </div>
      {!loading && !showStats ? (
        <Button
          style={{
            height: '40px',
            width: '30%',
            backgroundColor: '#FF4D4F',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            marginTop: 40,
          }}
          onClick={handleClick}
        >
          <Text style={{ color: 'white' }}>결과 확인하기</Text>
        </Button>
      ) : loading ? (
        <div style={{ marginTop: 40 }}>
          <LoadingOutlined style={{ fontSize: 48, color: '#5FDD9D' }} spin />
        </div>
      ) : null}
      {showStats && (
        <div
          style={{
            height: '110px',
            width: '55%',
            backgroundColor: '#f0f0f0',
            borderRadius: '14px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            marginTop: 40,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <Text style={{ fontSize: '16px', fontWeight: '500' }}>칼로리 차이 계산결과는</Text>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Text style={{ fontSize: '45px', fontWeight: '900', color: '#FF4D4F' }}>
              {calorieDifference} kcal
            </Text>
            <Text style={{ fontSize: '14px', color: '#888' }}>예측값 대비 실제값의 차이</Text>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaloriEntry;
