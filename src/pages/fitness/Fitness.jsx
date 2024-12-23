import { Calendar } from 'antd-mobile';
import { Card, Typography, InputNumber, Space, Flex, Button, AutoComplete } from 'antd';
import React, { useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';

const { Text } = Typography;

// 모든 운동 종목 리스트
const sportsList = [
  "축구", "농구", "배구", "야구", "테니스", "배드민턴", "탁구", "수영", "달리기", "사이클링",
  "체조", "스키", "스노우보드", "골프", "복싱", "유도", "태권도", "레슬링", "양궁",
  "펜싱", "핸드볼", "마라톤", "역도", "씨름", "스피드 스케이팅", "피겨 스케이팅", 
  "쇼트트랙", "아이스하키", "검도", "다이빙", "조정", "싱크로나이즈드 스위밍", "보트경기"
];

export default () => {
  const today = new Date();
  const [height, setHeight] = useState(null);
  const [weight, setWeight] = useState(null);
  const [cards, setCards] = useState([]); // 동적으로 추가될 카드 상태

  const handleHeightChange = (value) => {
    setHeight(value);
  };

  const handleWeightChange = (value) => {
    setWeight(value);
  };

  const handleSubmit = () => {
    console.log(height, weight);
  };

  // 카드 추가 핸들러
  const handleAddCard = () => {
    setCards([...cards, { id: cards.length + 1, exercise: "", duration: "" }]); // 새로운 카드 추가
  };

  const deleteCard = (id) => {
    setCards(cards.filter((card) => card.id !== id));
  };

  // 운동 종목 변경 핸들러
  const handleExerciseChange = (id, value) => {
    setCards((prevCards) =>
      prevCards.map((card) =>
        card.id === id ? { ...card, exercise: value } : card
      )
    );
  };

  // 운동 시간 변경 핸들러
  const handleDurationChange = (id, value) => {
    setCards((prevCards) =>
      prevCards.map((card) =>
        card.id === id ? { ...card, duration: value } : card
      )
    );
  };

  return (
    <div className="flex flex-col w-full items-center overflow-y-auto">
      <div className="w-[100%] bg-bg1 rounded-md shadow-lg overflow-y-hidden flex flex-col">
        <Calendar
          selectionMode="single"
          onChange={(val) => {
            console.log(val);
          }}
          defaultValue={today}
          nextYearButton={false}
          prevYearButton={false}
          renderLabel={(date) => {
            if (date.toDateString() === today.toDateString()) {
              return <div>{weight}kg</div>;
            } else {
              return <div></div>;
            }
          }}
        />
      </div>
      <div className="w-full flex flex-col items-center">
        <Card
          className="bg-bg1 rounded-xl shadow-lg mt-5"
          style={{ width: '95%', height: '120px' }}
        >
          <Space
            direction="vertical"
            size="middle"
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
            }}
          >
            <Text style={{ fontSize: '15px', fontWeight: 'bold' }}>
              오늘의 건강상태 기록하기
            </Text>
            <Flex gap="middle">
              <InputNumber
                placeholder="키"
                type="number"
                size="large"
                min={50}
                max={250}
                style={{ width: '35%' }}
                value={height}
                onChange={handleHeightChange}
              />
              <InputNumber
                placeholder="몸무게"
                type="number"
                size="large"
                min={20}
                max={400}
                style={{ width: '35%' }}
                value={weight}
                onChange={handleWeightChange}
              />
              <Button type="primary" size="large" onClick={handleSubmit}>
                입력
              </Button>
            </Flex>
          </Space>
        </Card>

        {/* 추가 버튼 */}
        <Button
          type="dashed"
          size="large"
          onClick={handleAddCard}
          style={{ width: '95%', margin: '20px 0 10px 0' }}
        >
          <PlusOutlined /> 운동 기록 추가하기
        </Button>

        {/* 동적으로 추가되는 카드들 */}
        {cards.map((card) => (
          <Card
            key={card.id}
            className="bg-bg1 rounded-xl shadow-lg mt-5"
            style={{ width: '95%', height: '120px' }}
          >
            <Space
            direction="vertical"
            size="middle"
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
            }}
            >
              <Text style={{ fontSize: '12px', fontWeight: 'bold' }}>
                운동{ card.id }
              </Text>
              <Flex gap="middle">
                <AutoComplete
                  style={{ width: '40%' }}
                  options={sportsList.map((sport) => ({
                    value: sport,
                  }))}
                  placeholder="운동 종목을 선택하세요"
                  value={card.exercise}
                  onChange={(value) => handleExerciseChange(card.id, value)}
                  filterOption={(inputValue, option) =>
                    option.value.toLowerCase().includes(inputValue.toLowerCase())
                  } // 입력값과 유사한 옵션만 표시
                />
                <InputNumber
                  placeholder="운동 시간 (분)"
                  type="number"
                  min={1}
                  max={500}
                  style={{ width: '40%' }}
                  value={card.duration}
                  onChange={(value) => handleDurationChange(card.id, value)}
                />
                <Button color="danger" variant="filled" onClick={() => deleteCard(card.id)}>
                  삭제
                </Button>
              </Flex>
            </Space>
          </Card>
        ))}
      </div>
      <div style={{ height: '70px' }}></div>
    </div>
  );
};
