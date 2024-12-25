import React, { useEffect, useState } from 'react';
import { Typography, Row, Col, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { useSelector } from 'react-redux';
import { useFood } from '@/hook/useFood';
import { CheckCircleTwoTone } from '@ant-design/icons';

const { Text } = Typography;

const Main = () => {
  const today = dayjs();
  const uid = useSelector((state) => state.auth.user?.uid);
  const { foodData, loading, error } = useFood(uid);
  const [mealFlags, setMealFlags] = useState({
    breakfast: false,
    lunch: false,
    dinner: false,
    snack: false,
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (foodData) {
      setMealFlags({
        breakfast: foodData.breakfast?.flag === 1,
        lunch: foodData.lunch?.flag === 1,
        dinner: foodData.dinner?.flag === 1,
        snack: foodData.snacks?.foods?.length > 0,
      });
    }
  }, [foodData]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  const handleMealClick = (mealType) => {
    navigate(`/meals/${mealType}`);
  };

  return (
    <div className="h-[100%] bg-bg1 p-4 rounded-md shadow-md">
      <Row justify="center" style={{ marginBottom: 20 }}>
        <Text style={{ color: "#5FDD9D", letterSpacing: '1px', fontSize: '28px', fontWeight: '800', fontFamily: 'Pretendard-800'}}>
          일일 칼로리 기록
        </Text>
      </Row>

      <Row justify="center" style={{ margin: '8px 0 8px 0' }}>
        <Text style={{ letterSpacing: '0.5px', fontSize: '24px', fontWeight: '700', fontFamily: 'Pretendard-700'}}>
        {new Date()
          .toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })
          .replace(/\.$/, "")}
        </Text>
      </Row>
      <Row justify="center" style={{ marginBottom: '40px' }}>
        <Text style={{ letterSpacing: '0.5px', fontSize: '18px', fontWeight: '500', fontFamily: 'Pretendard-500'}}>
        {new Date().toLocaleDateString("ko-KR", { weekday: "long" })}
        </Text>
      </Row>

      <Row gutter={[16, 24]} justify="center">
        <Col span={20}>
          <Button
            onClick={() => handleMealClick('breakfast')}
            disabled={mealFlags.breakfast}
            className={`w-full bg-bg1 rounded-xl shadow-md p-0 relative ${mealFlags.breakfast ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ height: '60px', textAlign: 'left', fontFamily: 'Pretendard-700' }}
          >
            아침식사 기록하기
            {mealFlags.breakfast && (
              <CheckCircleTwoTone
                style={{ position: 'absolute', right: 130, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 36 }}
              />
            )}
          </Button>
        </Col>
        <Col span={20}>
          <Button
            onClick={() => handleMealClick('lunch')}
            disabled={mealFlags.lunch}
            className={`w-full bg-bg1 rounded-xl shadow-md p-0 relative ${mealFlags.lunch ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ height: '60px', textAlign: 'left', fontFamily: 'Pretendard-700' }}
          >
            점심식사 기록하기
            {mealFlags.lunch && (
              <CheckCircleTwoTone
                style={{ position: 'absolute', right: 130, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 36 }}
              />
            )}
          </Button>
        </Col>
        <Col span={20}>
          <Button
            onClick={() => handleMealClick('dinner')}
            disabled={mealFlags.dinner}
            className={`w-full bg-bg1 rounded-xl shadow-md p-0 relative ${mealFlags.dinner ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ height: '60px', textAlign: 'left', fontFamily: 'Pretendard-700' }}
          >
            저녁식사 기록하기
            {mealFlags.dinner && (
              <CheckCircleTwoTone
                style={{ position: 'absolute', right: 130, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 36 }}
              />
            )}
          </Button>
        </Col>
        <Col span={20}>
          <Button
            onClick={() => handleMealClick('snack')}
            disabled={mealFlags.snack}
            className={`w-full bg-bg1 rounded-xl shadow-md p-0 relative ${mealFlags.snack ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ height: '60px', textAlign: 'left', fontFamily: 'Pretendard-700' }}
          >
            간식 기록하기
            {mealFlags.snack && (
              <CheckCircleTwoTone
                style={{ position: 'absolute', right: 130, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 36 }}
              />
            )}
          </Button>
        </Col>
      </Row>
    </div>
  );
};

export default Main; 