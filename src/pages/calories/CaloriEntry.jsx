import React, { useState, useEffect } from "react";
import { Typography, Input, Button, Flex, List, Image, Row } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { useLocation } from 'react-router-dom';
import noImage from "../../assets/no-image.png";

const { Text } = Typography;

const CaloriEntry = () => {
  const [loading, setLoading] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [estimatedCalories, setEstimatedCalories] = useState("");
  const [calorieDifference, setCalorieDifference] = useState(null);
  const location = useLocation();
  const [selectedFoodNames, setSelectedFoodNames] = useState([]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const items = searchParams.get('items');
    if (items) {
      setSelectedFoodNames(items.split(','));
    }
  }, [location.search]);

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
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ marginTop: 20, marginBottom: 40 }}>
        <Text style={{ fontSize: '28px', color: '#5FDD9D', fontFamily: 'Pretendard-800', letterSpacing: '1.5px'}}>
          칼로리 편차 확인하기
        </Text>
      </div>
      <Row direction="column" justify='center' align='Row-start' style={{ marginBottom: 20, width: '100%', height: '150px'}}>
        <div
          style={{
            height: '40px',
            width: '70%',
            backgroundColor: '#5FDD9D',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: '16px', fontFamily: 'Pretendard-500'}}>
            선택한 음식 목록
          </Text>
        </div>
        <div style={{
            width: '70%',
            maxHeight: '120px',
            overflowY: 'auto',
            marginTop: '10px',
            padding: '5px',
            backgroundColor: '#f0f0f0',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        }}>
            <List
                dataSource={selectedFoodNames}
                renderItem={(item) => (
                    <List.Item style={{ display: 'flex', alignItems: 'center' }}>
                        <Image
                            width={20}
                            height={20}
                            style={{ marginRight: 8 }}
                            src={noImage}
                            preview={false}
                        />
                        <Text style={{ fontSize: '15px', fontFamily: 'Pretendard-600' }}>{item}</Text>
                    </List.Item>
                )}
            />
        </div>
      </Row>
      <div
        style={{
          height: '40px',
          width: '70%',
          backgroundColor: '#5FDD9D',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          marginTop: 20,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: '16px', fontFamily: 'Pretendard-500'}}>
          몇 칼로리를 섭취한 것 같나요?
        </Text>
      </div>
      <Input
        placeholder="예상한 칼로리를 입력해주세요"
        value={estimatedCalories}
        onChange={handleInputChange}
        disabled={showStats}
        style={{
          width: '70%',
          height: '40px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          marginTop: 15,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          paddingLeft: 35,
          paddingRight: 10, }}
      />
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
          <Text style={{ color: 'white', fontSize: '15px', fontFamily: 'Pretendard-500' }}>결과 확인하기</Text>
        </Button>
      ) : loading ? (
        <div style={{ marginTop: 40 }}>
          <LoadingOutlined style={{ fontSize: 48, color: '#5FDD9D' }} spin />
        </div>
      ) : null}
      {showStats && (
        <div
          style={{
            height: '120px',
            width: '65%',
            backgroundColor: '#f0f0f0',
            borderRadius: '14px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            marginTop: 70,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <Text style={{ fontSize: '16px', fontFamily: 'Pretendard-500' }}>칼로리 차이 계산결과는</Text>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Text style={{ fontSize: '45px', color: '#FF4D4F', fontFamily: 'Pretendard-800' }}>
              {calorieDifference} kcal<br/>
            </Text>
            <Text style={{ fontSize: '14px', color: '#888', fontFamily: 'Pretendard-400' }}>예측값 대비 실제값의 차이</Text>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaloriEntry;
