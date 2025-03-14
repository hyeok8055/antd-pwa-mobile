import React, { useState, useEffect } from "react";
import { Typography, InputNumber, Button, List, Row } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFood } from "@/hook/useFood";
import { useSelector } from 'react-redux';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebaseconfig';
import { Result } from 'antd-mobile';

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const { Text } = Typography;

const CaloriEntry = () => {
  const [loading, setLoading] = useState(false);
  // const [showStats, setShowStats] = useState(false); // 주석 처리
  const [estimatedCalories, setEstimatedCalories] = useState("");
  const [calorieDifference, setCalorieDifference] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedFoodNames, setSelectedFoodNames] = useState([]);
  const uid = useSelector((state) => state.auth.user?.uid);
  const { saveFoodData, fetchFoodDetails } = useFood();
  const [foodDetails, setFoodDetails] = useState([]);
  const [mealType, setMealType] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [redirectTimer, setRedirectTimer] = useState(3);
  const [foodPortions, setFoodPortions] = useState({});

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const items = searchParams.get('items');
    const type = searchParams.get('type');
    if (items) {
      const foodNames = items.split(',');
      setSelectedFoodNames(foodNames);
      
      // 각 음식에 대해 기본 1인분으로 초기화
      const initialPortions = {};
      foodNames.forEach(name => {
        initialPortions[name] = 1;
      });
      setFoodPortions(initialPortions);
    }
    if (type) {
      setMealType(type);
    }
  }, [location.search]);

  useEffect(() => {
    const fetchDetails = async () => {
      if (selectedFoodNames.length > 0) {
        const details = await fetchFoodDetails(selectedFoodNames);
        setFoodDetails(details);
      }
    };
    fetchDetails();
  }, [selectedFoodNames, fetchFoodDetails]);

  // 문자열에서 숫자만 추출하는 헬퍼 함수
  const extractNumber = (str) => {
    if (!str) return 100; // 기본값 100
    const matches = str.match(/\d+/);
    return matches ? Number(matches[0]) : 100;
  };

  const calculateActualCalories = (foodDetails) => {
    return foodDetails.reduce((total, food) => {
      const weight = extractNumber(food.weight);
      const portion = foodPortions[food.name] || 1; // 인분 정보 사용
      
      // 칼로리 정보가 없거나 에러가 있는 경우 0으로 처리
      const calories = food && food.calories && !isNaN(Number(food.calories)) ? Number(food.calories) : 0;
      
      return total + (calories * (weight / 100) * portion);
    }, 0);
  };

  const handleClick = async () => {
    setLoading(true);
    // setShowStats(false); // 명시적으로 showStats를 false로 설정
    try {
      const actualCalories = calculateActualCalories(foodDetails);
      const difference = Math.abs(actualCalories - parseInt(estimatedCalories, 10) || 0);
      setCalorieDifference(difference);

      const mappedFoods = foodDetails.map(food => {
        const weight = extractNumber(food.weight);
        const portion = foodPortions[food.name] || 1; // 인분 정보 사용
        const ratio = (weight / 100) * portion;
        
        // 모든 영양소 정보가 없는 경우 0으로 처리
        const calories = food.calories && !isNaN(Number(food.calories)) ? Number(food.calories) : 0;
        const carbs = food.nutrients?.carbs && !isNaN(Number(food.nutrients.carbs)) ? Number(food.nutrients.carbs) : 0;
        const fat = food.nutrients?.fat && !isNaN(Number(food.nutrients.fat)) ? Number(food.nutrients.fat) : 0;
        const protein = food.nutrients?.protein && !isNaN(Number(food.nutrients.protein)) ? Number(food.nutrients.protein) : 0;
        
        // 실제 섭취한 영양성분 계산
        const actualCalories = calories * ratio;
        const actualCarbs = carbs * ratio;
        const actualFat = fat * ratio;
        const actualProtein = protein * ratio;
        
        return {
          name: food.name || '',
          calories: actualCalories,
          weight: weight,
          portion: portion,
          nutrients: {
            carbs: actualCarbs,
            fat: actualFat,
            protein: actualProtein
          }
        };
      });

      if (mealType === 'snacks') {
        const today = getTodayDate();
        const docRef = doc(db, 'users', uid, 'foods', today);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const currentData = docSnap.data();
          const currentSnacks = currentData.snacks || {
            foods: [],
            estimatedCalories: 0,
            actualCalories: 0,
            selectedFoods: []
          };

          await saveFoodData(
            'snacks',
            [...currentSnacks.foods, ...mappedFoods],
            Number(currentSnacks.estimatedCalories || 0) + Number(estimatedCalories),
            Number(currentSnacks.actualCalories || 0) + actualCalories,
            [...currentSnacks.selectedFoods, ...selectedFoodNames]
          );
        } else {
          await saveFoodData(
            'snacks',
            mappedFoods,
            Number(estimatedCalories),
            actualCalories,
            selectedFoodNames
          );
        }
      } else {
        await saveFoodData(
          mealType,
          mappedFoods,
          Number(estimatedCalories),
          actualCalories,
          selectedFoodNames,
          1
        );
      }
      setSaveSuccess(true);
      setLoading(false);
    } catch (error) {
      console.error('저장 실패:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (saveSuccess) {
      const timer = setInterval(() => {
        setRedirectTimer((prev) => prev - 1);
      }, 1000);

      const redirectTimeout = setTimeout(() => {
        navigate('/');
      }, 3000);

      return () => {
        clearInterval(timer);
        clearTimeout(redirectTimeout);
      };
    }
  }, [saveSuccess, navigate]);

  const handleInputChange = (value) => {
    setEstimatedCalories(value);
  };

  // 인분 변경 핸들러 추가
  const handlePortionChange = (foodName, value) => {
    setFoodPortions(prev => ({
      ...prev,
      [foodName]: value
    }));
  };

  return (
    <div style={{ minHeight: '100%', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'auto', paddingBottom: '20px' }}>
      {loading && !saveSuccess ? (
        <div style={{ marginTop: '60%' }}>
          <LoadingOutlined style={{ fontSize: 48, color: '#5FDD9D' }} spin />
        </div>
      ) : saveSuccess ? (
        <div style={{ width: '80%', maxWidth: '300px', marginTop: '50%' }}>
          <Result
            status='success'
            title='기록 완료'
            description='기록이 정상적으로 완료되었습니다.'
          />
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <Text style={{ fontSize: '14px', color: '#888', fontFamily: 'Pretendard-500' }}>
              {redirectTimer}초 뒤에 메인 페이지로 돌아갑니다.
            </Text>
          </div>
        </div>
      ) : (
        <div style={{ width: '100%', height: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: '30px' }}>
          <div style={{ marginTop: 30, marginBottom: 20 }}>
            <Text style={{ fontSize: '28px', color: '#5FDD9D', fontFamily: 'Pretendard-800', letterSpacing: '1.5px' }}>
              칼로리 편차 확인하기
            </Text>
          </div>
          <Row direction="column" justify='center' align='Row-start' style={{ marginBottom: 20, width: '100%', height: 'auto', minHeight: '120px' }}>
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
              <Text style={{ fontSize: '16px', fontFamily: 'Pretendard-500' }}>
                선택한 음식 목록
              </Text>
            </div>
            <div style={{
              width: '70%',
              maxHeight: '240px',
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
                  <List.Item style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: '15px', fontFamily: 'Pretendard-600' }}>
                      {item}
                    </Text>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <InputNumber
                        min={0.5}
                        step={0.5}
                        value={foodPortions[item] || 1}
                        onChange={(value) => handlePortionChange(item, value)}
                        style={{ width: '60px', marginLeft: '10px' }}
                      />
                      <Text style={{ marginLeft: '5px', fontSize: '14px' }}>인분</Text>
                    </div>
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
              marginTop: 80,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: '16px', fontFamily: 'Pretendard-700' }}>
              선택한 모든 음식의 총 예상 칼로리는?
            </Text>
          </div>
          <InputNumber
            placeholder="총 예상 칼로리 입력"
            suffix="Kcal"
            value={estimatedCalories}
            onChange={handleInputChange}
            disabled={loading}
            style={{
              width: '70%',
              height: '50px',
              fontSize: '16px',
              fontFamily: 'Pretendard-500',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              marginTop: 20,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              paddingLeft: 35,
              paddingRight: 10,
            }}
          />
          <Text style={{ 
            fontSize: '14px', 
            color: '#888', 
            fontFamily: 'Pretendard-400',
            marginTop: 8,
            width: '70%',
            textAlign: 'center'
          }}>
            위에 선택한 모든 음식을 합한<br /> 총 예상 칼로리를 입력해주세요
          </Text>
          <Button
            style={{
              height: '50px',
              width: '40%',
              backgroundColor: '#5FDD9D',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              marginTop: 20,
              marginBottom: 30,
            }}
            onClick={handleClick}
            disabled={loading}
          >
            <Text style={{ color: 'black', fontSize: '18px', fontFamily: 'Pretendard-700' }}>결과 기록하기</Text>
          </Button>
          {/* {showStats && ( // 주석 처리 */}
          {/*  <div */}
          {/*    style={{ */}
          {/*      height: '120px', */}
          {/*      width: '65%', */}
          {/*      backgroundColor: '#f0f0f0', */}
          {/*      borderRadius: '14px', */}
          {/*      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)', */}
          {/*      marginTop: 70, */}
          {/*      display: 'flex', */}
          {/*      flexDirection: 'column', */}
          {/*      alignItems: 'center', */}
          {/*      justifyContent: 'center', */}
          {/*    }} */}
          {/*  > */}
          {/*    <div style={{ textAlign: 'center' }}> */}
          {/*      <Text style={{ fontSize: '16px', fontFamily: 'Pretendard-500' }}>칼로리 차이 계산결과는</Text> */}
          {/*    </div> */}
          {/*    <div style={{ textAlign: 'center' }}> */}
          {/*      <Text style={{ fontSize: '45px', color: '#FF4D4F', fontFamily: 'Pretendard-800' }}> */}
          {/*        {calorieDifference} kcal<br /> */}
          {/*      </Text> */}
          {/*      <Text style={{ fontSize: '14px', color: '#888', fontFamily: 'Pretendard-400' }}>예측값 대비 실제값의 차이</Text> */}
          {/*    </div> */}
          {/*  </div> */}
          {/* )} */}
        </div>
      )}
    </div>
  );
};

export default CaloriEntry;
