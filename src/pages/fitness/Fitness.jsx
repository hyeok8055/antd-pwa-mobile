import { Calendar, Popup, SearchBar, CheckList } from 'antd-mobile';
import { InputNumber, Flex, Button } from 'antd';
import React, { useState, useEffect, useMemo } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { useFitness } from '@/hook/useFitness';
import BMICalculator from '@/components/common/BMICalculator';

// 모든 운동 종목 리스트
const sportsList = [
  "축구", "농구", "배구", "야구", "테니스", 
  "탁구", "수영", "달리기", "자전거", "요가", 
  "등산", "배드민턴", "볼링", "스쿼시", "걷기", 
  "조깅", "서핑", "홈트", "헬스", "골프", 
  "마라톤", "승마", "당구", "낚시", "복싱", 
  "태권도", "유도", "검도", "레슬링", "합기도", 
  "무에타이", "주짓수", "킥복싱", "롤러 스케이팅", 
  "스케이트보드", "필라테스", "웨이트 트레이닝", "클라이밍"
];

// 스타일 객체 추가
const popupStyles = {
  searchBarContainer: {
    padding: '12px',
    borderBottom: 'solid 1px var(--adm-color-border)'
  },
  checkListContainer: {
    height: '300px',
    overflowY: 'scroll'
  },
  checkList: {
    '--border-top': '0',
    '--border-bottom': '0'
  }
};

export default () => {
  const today = new Date();
  const [weight, setWeight] = useState(null);
  const [cards, setCards] = useState([]); // 동적으로 추가될 카드 상태
  const uid = useSelector((state) => state.auth.user?.uid);
  const { fitnessData, uploadData, deleteData, loading, error } = useFitness(uid);
  const [calendarData, setCalendarData] = useState({});
  const [forceUpdate, setForceUpdate] = useState(0);

  // 운동 종목 선택 관련 상태
  const [exercisePopupVisible, setExercisePopupVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [exerciseSearchText, setExerciseSearchText] = useState('');
  const filteredSportsList = useMemo(() => {
    if (exerciseSearchText) {
      return sportsList.filter(sport => sport.includes(exerciseSearchText));
    } else {
      return sportsList;
    }
  }, [sportsList, exerciseSearchText]);

  useEffect(() => {
    // 오늘 날짜에 해당하는 데이터가 있으면 기본값 설정
    const todayData = fitnessData.find(item => item.date === today.toISOString().split('T')[0]);
    if (todayData) {
      // 오늘 데이터가 있으면 그대로 사용
      setWeight(todayData.weight);
      setCards(todayData.exercises.map((exercise, index) => ({
        id: Date.now() + index,
        exercise: exercise.exercise,
        duration: exercise.duration,
        isNew: false,
        firebaseId: exercise.id
      })));
    } else {
      // 오늘 데이터가 없으면 몸무게만 최신 데이터에서 가져오기
      if (fitnessData.length > 0) {
        setWeight(fitnessData[0].weight);
      } else {
        setWeight(null);
      }
      // 운동 기록은 무조건 비움
      setCards([]);
    }

    // 달력 데이터 설정 (기존 데이터 유지)
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
    
    // 새로운 카드가 렌더링된 후 스크롤
    setTimeout(() => {
      const container = document.querySelector('.overflow-y-auto');
      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 100);
  };

  const deleteCard = async (id) => {
    const cardToDelete = cards.find(card => card.id === id);
    setCards(cards.filter((card) => card.id !== id));
    
    if (!cardToDelete.isNew) {
      const formattedDate = today.toISOString().split('T')[0];
      const updatedExercises = cards
        .filter((card) => card.id !== id)
        .map(card => ({
          exercise: card.exercise,
          duration: Number(card.duration)
        }));

      try {
        await uploadData(formattedDate, Number(weight), updatedExercises);
      } catch (error) {
        console.error("Failed to update data:", error);
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
    // 입력 검증
    if (!cardToSave.exercise || !cardToSave.duration) {
      alert('운동 종목과 운동 시간을 모두 입력해주세요.');
      return;
    }

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
            <Button color="primary" variant="outlined" size="large" style={{ fontFamily: 'Pretendard-600', fontSize: '15px', letterSpacing: '2px' }} onClick={handleSubmit}>
              기록
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
                <Button
                  onClick={() => {
                    setSelectedExercise(card.exercise);
                    setExercisePopupVisible(true);
                  }}
                  style={{ 
                    width: '30%',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  disabled={!card.isNew}
                >
                  {card.exercise || "운동 선택"}
                </Button>
                <Popup
                  visible={exercisePopupVisible}
                  onMaskClick={() => {
                    setExercisePopupVisible(false);
                  }}
                  destroyOnClose
                  bodyStyle={{ height: '40vh' }}
                >
                  <div style={popupStyles.searchBarContainer}>
                    <SearchBar
                      placeholder="운동 종목 검색"
                      value={exerciseSearchText}
                      onChange={(v) => {
                        setExerciseSearchText(v);
                      }}
                    />
                  </div>
                  <div style={popupStyles.checkListContainer}>
                    <CheckList
                      style={popupStyles.checkList}
                      value={selectedExercise ? [selectedExercise] : []}
                      onChange={(val) => {
                        if (val.length > 0) {
                          setSelectedExercise(val[0]);
                          handleExerciseChange(card.id, val[0]);
                        } else {
                          setSelectedExercise('');
                          handleExerciseChange(card.id, '');
                        }
                        setExercisePopupVisible(false);
                      }}
                    >
                      {filteredSportsList.map((sport) => (
                        <CheckList.Item key={sport} value={sport}>
                          {sport}
                        </CheckList.Item>
                      ))}
                    </CheckList>
                  </div>
                </Popup>
                <InputNumber
                  addonAfter="분"
                  type="number"
                  min={1}
                  max={500}
                  size="middle"
                  style={{ width: '30%' }}
                  value={card.duration}
                  onChange={(value) => handleDurationChange(card.id, value)}
                  status={card.isNew && !card.duration ? 'error' : ''}
                  disabled={!card.isNew} // 새로운 카드가 아닌 경우 입력 필드 비활성화
                />
                {card.isNew ? (
                  <Button 
                    color="primary" 
                    variant="filled" 
                    onClick={() => handleSaveCard(card.id)}
                  >
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
