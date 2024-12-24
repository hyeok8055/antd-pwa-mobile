import { Calendar } from 'antd-mobile';
import { Card, Typography, InputNumber, Divider, Flex, Button, AutoComplete } from 'antd';
import React, { useState, useEffect } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { useFitness } from '@/hook/useFitness';
import BMICalculator from '@/components/common/BMICalculator';
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
  const [weight, setWeight] = useState(null);
  const [cards, setCards] = useState([]); // 동적으로 추가될 카드 상태
  const uid = useSelector((state) => state.auth.user?.uid);
  const { fitnessData, uploadData, deleteData, loading, error } = useFitness(uid);
  const [calendarData, setCalendarData] = useState({});
  const [forceUpdate, setForceUpdate] = useState(0);

  useEffect(() => {
    console.log("fitnessData changed:", fitnessData);
    // 오늘 날짜에 해당하는 데이터가 있으면 기본값 설정
    const todayData = fitnessData.find(item => item.date === today.toISOString().split('T')[0]);
    if (todayData) {
      setWeight(todayData.weight);
      setCards(todayData.exercises.map((exercise, index) => ({
        id: Date.now() + index, // 고유한 ID 생성
        exercise: exercise.exercise,
        duration: exercise.duration,
        isNew: false,
        firebaseId: exercise.id
      })));
    } else {
        setWeight(null);
        setCards([]);
    }

    // 달력 데이터 설정
    const initialCalendarData = {};
    fitnessData.forEach(item => {
      initialCalendarData[item.date] = item.weight;
    });
    setCalendarData(initialCalendarData);
  }, [fitnessData]);

  const handleWeightChange = (value) => {
    setWeight(value);
  };

  const handleSubmit = async () => {
    if (!uid) {
      console.error("UID is not available.");
      return;
    }

    const formattedDate = today.toISOString().split('T')[0];
    const exercises = cards.map(card => ({
      exercise: card.exercise,
      duration: Number(card.duration)
    }));

    try {
      await uploadData(formattedDate, Number(weight), exercises);
      console.log("Data uploaded successfully!");
      // 달력 데이터 업데이트
      setCalendarData(prevCalendarData => ({
        ...prevCalendarData,
        [formattedDate]: Number(weight)
      }));
      setForceUpdate(prev => prev + 1);
    } catch (err) {
      console.error("Failed to upload data:", err);
    }
  };

  // 카드 추가 핸들러
  const handleAddCard = () => {
    setCards([...cards, { id: Date.now(), exercise: "", duration: "", isNew: true }]); // 새로운 카드 추가
  };

  const deleteCard = async (id) => {
    const cardToDelete = cards.find(card => card.id === id);
    if (cardToDelete.isNew) {
      setCards(cards.filter((card) => card.id !== id));
    } else {
      try {
        await deleteData(cardToDelete.firebaseId);
        setCards(cards.filter((card) => card.id !== id));
      } catch (error) {
        console.error("Failed to delete data:", error);
      }
    }
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

  const handleSaveCard = async (id) => {
    const cardToSave = cards.find(card => card.id === id);
    if (cardToSave) {
      const formattedDate = today.toISOString().split('T')[0];
      const exercises = cards.map(card => ({
        exercise: card.exercise,
        duration: Number(card.duration)
      }));
      try {
        await uploadData(formattedDate, Number(weight), exercises);
        setCards(prevCards =>
          prevCards.map(card =>
            card.id === id ? { ...card, isNew: false } : card
          )
        );
      } catch (error) {
        console.error("Failed to upload data:", error);
      }
    }
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
            const dateString = date.toISOString().split('T')[0];
            if (calendarData[dateString]) {
              return <div>{calendarData[dateString]}kg</div>;
            } else {
              return <div></div>;
            }
          }}
          key={forceUpdate}
        />
      </div>
      <div className="w-full flex flex-col items-center">
        <div
          className="bg-bg1 rounded-xl shadow-lg mt-5"
          style={{ width: '95%', height: '80px',  border: '1px solid #d9d9d9' }}
        >
          
          <Flex justify="center" align="center" gap="large" style={{ width: '100%', height: '100%' }}>
            <InputNumber
            addonBefore="몸무게"
            addonAfter="kg"
            type="number"
            size="large"
            min={20}
            max={400}
            style={{ width: '65%' }}
            value={weight}
            onChange={handleWeightChange}
            />
            <Button color="primary" variant="outlined" onClick={handleSubmit}>
              저장
            </Button>
          </Flex>
        </div>
        <div
          className="bg-bg1 rounded-xl shadow-lg mt-5 "
          style={{ width: '95%', height: '160px', border: '1px solid #d9d9d9', padding: '10px' }}
        >
          <BMICalculator weight={weight} />
        </div>
        {/* 추가 버튼 */}
        <div style={{ width: '95%', marginTop: '20px', border: '1px solid #d9d9d9', borderRadius: '10px', padding: '10px' }}>
          <Button
            type="dashed"
            size="large"
            onClick={handleAddCard}
            style={{ width: '100%', marginBottom: '10px' }}
          >
            <PlusOutlined /> 운동 기록 추가하기
          </Button>

          {/* 동적으로 추가되는 카드들 */}
          {cards.map((card) => (
            <div
              key={card.id}
              className="bg-bg1 rounded-xl shadow-lg mt-2"
              style={{ width: '100%', height: '60px', border: '1px solid #d9d9d9' }}
            >
              <Flex justify="center" align="center" gap="large" style={{ width: '95%', height: '100%' }}>
                <AutoComplete
                  style={{ width: '30%' }}
                  options={sportsList.map((sport) => ({
                    value: sport,
                  }))}
                  placeholder="운동 종목"
                  value={card.exercise}
                  onChange={(value) => handleExerciseChange(card.id, value)}
                  filterOption={(inputValue, option) =>
                    option.value.toLowerCase().includes(inputValue.toLowerCase())
                  } // 입력값과 유사한 옵션만 표시
                />
                <InputNumber
                  addonAfter="분"
                  type="number"
                  min={1}
                  max={500}
                  size="middle"
                  style={{ width: '30%' }}
                  value={card.duration}
                  onChange={(value) => handleDurationChange(card.id, value)}
                />
                {card.isNew ? (
                  <Button color="primary" variant="filled" onClick={() => handleSaveCard(card.id)}>
                    저장
                  </Button>
                ) : (
                  <Button color="danger" variant="filled" onClick={() => deleteCard(card.id)}>
                    삭제
                  </Button>
                )}
              </Flex>
            </div>
          ))}
        </div>
      </div>
      <div style={{ height: '70px' }}></div>
    </div>
  );
};
