import React, { useState, useEffect, useRef, useCallback } from "react";
import { Typography, Input, Row, Col, Select, Button, Modal, Form } from 'antd';
import Fuse from "fuse.js";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircleTwoTone, PlusOutlined } from '@ant-design/icons';
import { realtimeDb } from '../../firebaseconfig';
import { ref, set, onValue } from "firebase/database";
import { useSelector, useDispatch } from 'react-redux';
import { setFoods } from '../../redux/actions/foodActions';
import { auth } from '../../firebaseconfig';
import { FixedSizeList } from 'react-window';
import { searchFoodNutrition as fetchFoodNutrition } from '../../api/api';

const { Text } = Typography;
const { Search } = Input;

// 관리자 접근 가능한 이메일 목록
const ADMIN_EMAILS = [
  'eodud653923@gmail.com',
  'youngwonhahn00@gmail.com',
  'juhyeok0123@gmail.com',
  'wn990123@gmail.com',
  'garcia29845@gmail.com',
  // 'yunj29845@gmail.com',
];

const Meal = () => {
  const { mealType } = useParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredFood, setFilteredFood] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('default');
  const [selectedItems, setSelectedItems] = useState([]);
  const navigate = useNavigate();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalPage, setModalPage] = useState(1);
  const [newFood, setNewFood] = useState({
    name: '',
    calories: null,
    nutrients: {
      carbs: null,
      protein: null,
      fat: null,
    },
    weight: '',
  });
  const [foodSearchResults, setFoodSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [noSearchResult, setNoSearchResult] = useState(false);
  const [selectedFoodInfo, setSelectedFoodInfo] = useState(null);
  const dispatch = useDispatch();
  const foods = useSelector((state) => state.food.foods);
  const listRef = useRef(null);
  const containerRef = useRef(null);
  const [listHeight, setListHeight] = useState(400);
  const [weightUnit, setWeightUnit] = useState('g');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const foodsRef = ref(realtimeDb, 'foods');
    const unsubscribe = onValue(foodsRef, (snapshot) => {
      const foodsData = snapshot.val();
      if (foodsData) {
        dispatch(setFoods(foodsData));
      }
    });

    // 관리자 권한 체크
    const checkAdminStatus = () => {
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.email) {
        setIsAdmin(ADMIN_EMAILS.includes(currentUser.email));
      } else {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
    const authUnsubscribe = auth.onAuthStateChanged(checkAdminStatus);

    return () => {
      unsubscribe();
      authUnsubscribe();
    };
  }, [dispatch]);

  useEffect(() => {
    if (foods) {
      const fuse = new Fuse(Object.values(foods), {
        keys: ["name"],
        threshold: 0.3,
      });

      // 검색어가 있을 때만 결과 표시
      let result = searchTerm 
        ? fuse.search(searchTerm).map(item => item.item) 
        : [];

      if (selectedCountry !== 'default' && searchTerm) {
        result = result.filter(item => item.country === selectedCountry);
      }

      // 검색어와 정확히 일치하는 항목을 찾아 맨 앞으로 정렬
      if (searchTerm) {
        result.sort((a, b) => {
          const aExactMatch = a.name.toLowerCase() === searchTerm.toLowerCase();
          const bExactMatch = b.name.toLowerCase() === searchTerm.toLowerCase();
          
          if (aExactMatch && !bExactMatch) return -1;
          if (!aExactMatch && bExactMatch) return 1;
          return 0;
        });
      }

      setFilteredFood(result);
    }
  }, [searchTerm, selectedCountry, foods]);

  const handleSearchChange = (e) =>
    setSearchTerm(e.target.value);

  const handleCountryChange = (value) =>
    setSelectedCountry(value);

  const handleItemSelect = (item) => {
    if (selectedItems.includes(item)) {
      setSelectedItems(selectedItems.filter(selectedItem => selectedItem !== item));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
    // 스크롤 위치를 유지하기 위해 추가
    if (listRef.current) {
      listRef.current.scrollToItem(filteredFood.indexOf(item));
    }
  };

  const handleNextClick = () => {
    const type = mealType === 'snack' ? 'snacks' : mealType;
    const selectedItemNames = selectedItems.map(item => item.name).join(',');
    navigate(`/calories/calorieEntry?items=${selectedItemNames}&type=${type}`);
  };

  const getMealTitle = () => {
    switch (mealType) {
      case "breakfast":
        return "아침";
      case "lunch":
        return "점심";
      case "dinner":
        return "저녁";
      case "snack":
        return "간식";
      default:
        return "식사";
    }
  };

  const handleAddFoodClick = () => {
    setIsModalVisible(true);
    setModalPage(1);
    setFoodSearchResults([]);
    setNoSearchResult(false);
    setSelectedFoodInfo(null);
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    setModalPage(1);
    setFoodSearchResults([]);
    setNoSearchResult(false);
    setSelectedFoodInfo(null);
    setNewFood({
      name: '',
      calories: null,
      nutrients: {
        carbs: null,
        protein: null,
        fat: null,
      },
      weight: '',
    });
  };

  const handleInputChange = (e, name) => {
    if (name === 'weight') {
      setNewFood({ ...newFood, weight: e.target.value });
    } else {
      setNewFood({ ...newFood, [name]: e.target ? e.target.value : e });
    }
  };

  const handleWeightUnitChange = (value) => {
    setWeightUnit(value);
  };

  const handleModalOk = async () => {
    try {
      const userEmail = auth.currentUser?.email || 'default';
      const sanitizedEmail = userEmail.replace(/[^a-zA-Z0-9]/g, '_');
      
      // 현재 시간을 yyyy-mm-dd-hh 형식으로 포맷팅
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hour = String(now.getHours()).padStart(2, '0');
      const timestamp = `${year}-${month}-${day}-${hour}`;
      
      // 음식이름_이메일_{작성시간} 형식으로 foodKey 생성
      const foodKey = `${newFood.name}_${sanitizedEmail}_${timestamp}`;
      
      const foodsRef = ref(realtimeDb, `foods/${foodKey}`);
      
      // weight가 올바른 형식인지 확인 (숫자 + 단위(g 또는 ml))
      const weightWithUnit = newFood.weight.endsWith(weightUnit) 
        ? newFood.weight 
        : `${newFood.weight}${weightUnit}`;
      
      // 서버로 전송할 때 영양소 정보 설정 (관리자가 아닌 경우 항상 null)
      const foodData = { 
        ...newFood, 
        weight: weightWithUnit,
        // 관리자가 아니거나 영양소 정보가 없는 경우 null로 설정
        calories: isAdmin && newFood.calories ? newFood.calories : null,
        nutrients: {
          carbs: isAdmin && newFood.nutrients.carbs ? newFood.nutrients.carbs : null,
          protein: isAdmin && newFood.nutrients.protein ? newFood.nutrients.protein : null,
          fat: isAdmin && newFood.nutrients.fat ? newFood.nutrients.fat : null,
        },
        createdAt: timestamp // 작성 시간 정보도 데이터에 추가
      };
      
      await set(foodsRef, foodData);
      
      // 새로 추가된 음식 객체 생성
      const newAddedFood = {
        ...foodData,
        id: foodKey,  // 필요한 경우 ID 추가
      };
      
      // 새로 추가된 음식을 선택된 항목에 추가
      setSelectedItems([...selectedItems, newAddedFood]);
      
      // 검색어 초기화하여 모든 음식이 표시되도록 함
      setSearchTerm('');
      
      // 새로 추가된 음식이 filteredFood에 즉시 반영되도록 함
      if (foods) {
        const updatedFoods = { ...foods, [foodKey]: newAddedFood };
        dispatch(setFoods(updatedFoods));
      }
      
      setIsModalVisible(false);
      setNewFood({
        name: '',
        calories: null,
        weight: '',
        nutrients: {
          carbs: null,
          protein: null,
          fat: null,
        },
      });
      
      // 모달이 닫힌 후 약간의 지연 시간을 두고 스크롤 위치 조정
      setTimeout(() => {
        if (listRef.current) {
          // 선택된 항목이 목록의 맨 위에 표시되므로 스크롤을 맨 위로 이동
          listRef.current.scrollToItem(0);
        }
      }, 100);
    } catch (error) {
      console.error('음식 추가 실패:', error);
      alert('음식 추가에 실패했습니다.');
    }
  };

  const isFormValid = () => {
    return (
      newFood.name !== '' &&
      newFood.weight !== null &&
      newFood.weight !== ''
    );
  };

  const RowRenderer = ({ index, style }) => {
    const items = [...selectedItems, ...filteredFood.filter(item => !selectedItems.includes(item))];
    const itemIndex1 = index * 2;
    const itemIndex2 = index * 2 + 1;
    const item1 = items[itemIndex1];
    const item2 = items[itemIndex2];

    return (
      <Row gutter={[8, 8]} style={style}>
        <Col span={12}>
          {item1 && (
            <div
              onClick={() => handleItemSelect(item1)}
              className="bg-bg1 rounded-xl shadow-lg"
              style={{
                width: '100%',
                height: '48px',
                border: '1px solid #d9d9d9',
                display: 'flex',
                alignItems: 'center',
                backgroundColor: selectedItems.includes(item1) ? '#f0fff7' : 'white',
                position: 'relative',
                cursor: 'pointer',
                overflow: 'hidden',
                borderRadius: '10px',
                boxShadow: selectedItems.includes(item1) ? '0 2px 6px rgba(95, 221, 157, 0.4)' : '0 1px 3px rgba(0,0,0,0.1)',
                borderColor: selectedItems.includes(item1) ? '#5FDD9D' : '#d9d9d9',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Text style={{ 
                  fontSize: '16px', 
                  fontWeight: selectedItems.includes(item1) ? '600' : '500', 
                  color: selectedItems.includes(item1) ? '#5FDD9D' : '#333', 
                  fontFamily: selectedItems.includes(item1) ? 'Pretendard-600' : 'Pretendard-500', 
                  textAlign: 'center', 
                  width: '100%'
                }}>
                  {item1.name}
                </Text>
                {selectedItems.includes(item1) && (
                  <CheckCircleTwoTone
                    twoToneColor="#5FDD9D"
                    style={{ position: 'absolute', right: 10, pointerEvents: 'none', fontSize: 20 }}
                  />
                )}
              </div>
            </div>
          )}
        </Col>
        <Col span={12}>
          {item2 && (
            <div
              onClick={() => handleItemSelect(item2)}
              className="bg-bg1 rounded-xl shadow-lg"
              style={{
                width: '100%',
                height: '48px',
                border: '1px solid #d9d9d9',
                display: 'flex',
                alignItems: 'center',
                backgroundColor: selectedItems.includes(item2) ? '#f0fff7' : 'white',
                position: 'relative',
                cursor: 'pointer',
                overflow: 'hidden',
                borderRadius: '10px',
                boxShadow: selectedItems.includes(item2) ? '0 2px 6px rgba(95, 221, 157, 0.4)' : '0 1px 3px rgba(0,0,0,0.1)',
                borderColor: selectedItems.includes(item2) ? '#5FDD9D' : '#d9d9d9',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', width: '100%', position: 'relative' }}>
                <Text style={{ 
                  fontSize: '16px', 
                  fontWeight: selectedItems.includes(item2) ? '600' : '500', 
                  color: selectedItems.includes(item2) ? '#5FDD9D' : '#333', 
                  fontFamily: selectedItems.includes(item2) ? 'Pretendard-600' : 'Pretendard-500', 
                  textAlign: 'center', 
                  width: '100%'
                }}>
                  {item2.name}
                </Text>
                {selectedItems.includes(item2) && (
                  <CheckCircleTwoTone
                    twoToneColor="#5FDD9D"
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 20 }}
                  />
                )}
              </div>
            </div>
          )}
        </Col>
      </Row>
    );
  };

  const handleResize = useCallback(() => {
    if (containerRef.current) {
      // 부모 컨테이너 높이에서 다른 요소들의 높이를 뺀 값으로 설정
      const parentHeight = document.documentElement.clientHeight;
      // 헤더(60px), 검색바 영역(~120px), 하단 네비게이션(60px), 여백 등을 고려한 값
      const nonListHeight = 250;
      const calculatedHeight = parentHeight - nonListHeight;
      
      // 최소 높이 설정 (너무 작아지지 않도록)
      const finalHeight = Math.max(calculatedHeight, 200);
      setListHeight(finalHeight);
    }
  }, []);

  useEffect(() => {
    handleResize();
    
    // 리사이즈 이벤트에 핸들러 추가
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  const searchFoodNutrition = async () => {
    if (!newFood.name.trim()) return;
    
    setIsSearching(true);
    setNoSearchResult(false);
    setFoodSearchResults([]);
    
    try {
      const result = await fetchFoodNutrition(newFood.name.trim());
      
      if (result && result.items && result.items.length > 0) {
        // API 응답 형식에 맞게 데이터 변환
        const formattedResults = result.items.map(item => ({
          name: item.name,
          brand: item.brand,
          unit: `${item.serving} (${item.weight})`,
          calories: parseFloat(item.calories),
          carbs: parseFloat(item.carbs),
          protein: parseFloat(item.protein),
          fat: parseFloat(item.fat)
        }));
        
        setFoodSearchResults(formattedResults);
      } else {
        setNoSearchResult(true);
      }
    } catch (error) {
      console.error('음식 검색 실패:', error);
      setNoSearchResult(true);
    } finally {
      setIsSearching(false);
    }
  };

  // 직접 추가하기 함수
  const handleManualAdd = () => {
    // 직접 입력 모드로 3단계로 이동
    setSelectedFoodInfo(null); // 선택된 음식 정보 초기화
    setNewFood({
      ...newFood,
      calories: null,
      nutrients: {
        carbs: null,
        protein: null,
        fat: null
      }
    });
    setModalPage(3);
  };

  const selectFoodInfo = (foodInfo) => {
    setSelectedFoodInfo(foodInfo);
    
    // 선택된 음식 정보로 newFood 업데이트
    setNewFood({
      ...newFood,
      name: foodInfo.name,
      calories: foodInfo.calories,
      nutrients: {
        carbs: foodInfo.carbs,
        protein: foodInfo.protein,
        fat: foodInfo.fat
      }
    });
    
    // unit 문자열에서 g 또는 ml 단위 추출 및 설정
    if (foodInfo.unit) {
      // 괄호 안의 값 추출 (예: "1인분 (300g)" -> "300g")
      const match = foodInfo.unit.match(/\(([^)]+)\)/);
      if (match && match[1]) {
        const weightStr = match[1];
        
        // g 또는 ml 단위 확인
        if (weightStr.includes('g')) {
          setWeightUnit('g');
          // 숫자만 추출하여 weight에 설정 (예: "300g" -> "300")
          const weightValue = weightStr.replace(/[^0-9.]/g, '');
          setNewFood(prev => ({
            ...prev,
            weight: weightValue
          }));
        } else if (weightStr.includes('ml')) {
          setWeightUnit('ml');
          // 숫자만 추출하여 weight에 설정 (예: "500ml" -> "500")
          const weightValue = weightStr.replace(/[^0-9.]/g, '');
          setNewFood(prev => ({
            ...prev,
            weight: weightValue
          }));
        }
      }
    }
  };

  return (
    <div style={{ padding: '20px', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 15 }}>
        <Text style={{ fontSize: '24px', fontWeight: '800', color: '#5FDD9D', letterSpacing: '1px', fontFamily: 'Pretendard-800'}}>
          {getMealTitle()} 식사목록
        </Text>
        
        <Button 
          type="primary" 
          onClick={handleNextClick} 
          disabled={selectedItems.length === 0} 
          style={{ 
            fontFamily: 'Pretendard-700', 
            height: '40px', 
            borderRadius: '8px',
            background: selectedItems.length > 0 ? '#5FDD9D' : undefined,
            boxShadow: selectedItems.length > 0 ? '0 2px 6px rgba(95, 221, 157, 0.4)' : undefined
          }}
        >
          {selectedItems.length > 0 ? `${selectedItems.length}개 선택 완료` : '음식을 선택해주세요'}
        </Button>
      </Row>
      <Row gutter={[16, 24]} align="middle" style={{ marginBottom: 5 }}>
        <Col span={24}>
          <Search
            placeholder="먹은 음식을 검색해보세요"
            value={searchTerm}
            size="large"
            onChange={handleSearchChange}
            style={{ 
              width: '100%', 
              height: '46px',
              borderRadius: '12px'
            }}
            prefix={<span style={{ marginRight: '8px', fontSize: '18px' }}>🔍</span>}
          />
        </Col>
      </Row>
      <Row justify="center">
        <Button 
          onClick={handleAddFoodClick} 
          icon={<PlusOutlined />} 
          style={{ 
            fontFamily: 'Pretendard-700',
            height: '35px',
            background: '#f0f0f0',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          찾는 음식이 없다면 직접 추가하기
        </Button>
      </Row>
      
      {searchTerm && filteredFood.length === 0 && (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '30px',
          marginTop: '10px',
          backgroundColor: '#f9f9f9',
          borderRadius: '12px',
          marginBottom: '10px'
        }}>
          <Text style={{ fontSize: '16px', color: '#666', fontFamily: 'Pretendard-500' }}>
            '{searchTerm}'에 대한 검색 결과가 없습니다
          </Text>
          <Button 
            onClick={handleAddFoodClick} 
            type="link" 
            style={{ fontFamily: 'Pretendard-700', color: '#5FDD9D', marginTop: '10px' }}
          >
            직접 추가하기
          </Button>
        </div>
      )}
      
      <div style={{ 
        flex: 1, 
        marginTop: 10, 
        overflowY: 'auto', 
        marginBottom: 10, 
        display: 'flex', 
        flexDirection: 'column',
        maxHeight: `${listHeight}px`
      }} ref={containerRef}>
        {(searchTerm && filteredFood.length > 0) || (!searchTerm && selectedItems.length > 0) ? (
          // 검색어가 있거나 선택된 항목이 있을 때 음식 목록 표시
          <>
            <Row style={{ marginBottom: '10px' }}>
              <Col span={24}>
                {searchTerm ? (
                  <Text style={{ color: '#666', fontFamily: 'Pretendard-500' }}>
                    검색 결과: {filteredFood.length}개
                  </Text>
                ) : (
                  <Text style={{ color: '#666', fontFamily: 'Pretendard-500' }}>
                    선택한 음식
                  </Text>
                )}
                {selectedItems.length > 0 && (
                  <Text style={{ marginLeft: '10px', color: '#5FDD9D', fontFamily: 'Pretendard-500' }}>
                    {selectedItems.length}개 선택됨
                  </Text>
                )}
              </Col>
            </Row>
            <FixedSizeList
              ref={listRef}
              height={listHeight}
              width="100%"
              itemSize={60}
              itemCount={Math.ceil((!searchTerm ? selectedItems : [...selectedItems, ...filteredFood.filter(item => !selectedItems.includes(item))]).length / 2)}
            >
              {({ index, style }) => {
                const items = !searchTerm 
                  ? selectedItems // 검색어가 없으면 선택된 항목만 표시
                  : [...selectedItems, ...filteredFood.filter(item => !selectedItems.includes(item))];
                const itemIndex1 = index * 2;
                const itemIndex2 = index * 2 + 1;
                const item1 = items[itemIndex1];
                const item2 = items[itemIndex2];

                return (
                  <Row gutter={[8, 8]} style={style}>
                    <Col span={12}>
                      {item1 && (
                        <div
                          onClick={() => handleItemSelect(item1)}
                          className="bg-bg1 rounded-xl shadow-lg"
                          style={{
                            width: '100%',
                            height: '48px',
                            border: '1px solid #d9d9d9',
                            display: 'flex',
                            alignItems: 'center',
                            backgroundColor: selectedItems.includes(item1) ? '#f0fff7' : 'white',
                            position: 'relative',
                            cursor: 'pointer',
                            overflow: 'hidden',
                            borderRadius: '10px',
                            boxShadow: selectedItems.includes(item1) ? '0 2px 6px rgba(95, 221, 157, 0.4)' : '0 1px 3px rgba(0,0,0,0.1)',
                            borderColor: selectedItems.includes(item1) ? '#5FDD9D' : '#d9d9d9',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                            <Text style={{ 
                              fontSize: '16px', 
                              fontWeight: selectedItems.includes(item1) ? '600' : '500', 
                              color: selectedItems.includes(item1) ? '#5FDD9D' : '#333', 
                              fontFamily: selectedItems.includes(item1) ? 'Pretendard-600' : 'Pretendard-500', 
                              textAlign: 'center', 
                              width: '100%'
                            }}>
                              {item1.name}
                            </Text>
                            {selectedItems.includes(item1) && (
                              <CheckCircleTwoTone
                                twoToneColor="#5FDD9D"
                                style={{ position: 'absolute', right: 10, pointerEvents: 'none', fontSize: 20 }}
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </Col>
                    <Col span={12}>
                      {item2 && (
                        <div
                          onClick={() => handleItemSelect(item2)}
                          className="bg-bg1 rounded-xl shadow-lg"
                          style={{
                            width: '100%',
                            height: '48px',
                            border: '1px solid #d9d9d9',
                            display: 'flex',
                            alignItems: 'center',
                            backgroundColor: selectedItems.includes(item2) ? '#f0fff7' : 'white',
                            position: 'relative',
                            cursor: 'pointer',
                            overflow: 'hidden',
                            borderRadius: '10px',
                            boxShadow: selectedItems.includes(item2) ? '0 2px 6px rgba(95, 221, 157, 0.4)' : '0 1px 3px rgba(0,0,0,0.1)',
                            borderColor: selectedItems.includes(item2) ? '#5FDD9D' : '#d9d9d9',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', width: '100%', position: 'relative' }}>
                            <Text style={{ 
                              fontSize: '16px', 
                              fontWeight: selectedItems.includes(item2) ? '600' : '500', 
                              color: selectedItems.includes(item2) ? '#5FDD9D' : '#333', 
                              fontFamily: selectedItems.includes(item2) ? 'Pretendard-600' : 'Pretendard-500', 
                              textAlign: 'center', 
                              width: '100%'
                            }}>
                              {item2.name}
                            </Text>
                            {selectedItems.includes(item2) && (
                              <CheckCircleTwoTone
                                twoToneColor="#5FDD9D"
                                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 20 }}
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </Col>
                  </Row>
                );
              }}
            </FixedSizeList>
          </>
        ) : !searchTerm ? (
          // 검색어가 없고 선택된 항목도 없을 때 안내 메시지 표시 (기존 UI 유지)
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center',
            alignItems: 'center', 
            flex: 1,
            textAlign: 'center',
            padding: '20px'
          }}>
            <div style={{ 
              marginBottom: '20px', 
              fontSize: '80px', 
              color: '#ccc'
            }}>
              🍽️
            </div>
            <Text style={{ 
              fontSize: '20px', 
              fontWeight: '700', 
              color: '#333', 
              marginBottom: '15px', 
              fontFamily: 'Pretendard-700'
            }}>
              오늘 어떤 음식을 드셨나요?
            </Text>
            <Text style={{ 
              fontSize: '16px', 
              color: '#666', 
              marginBottom: '20px', 
              fontFamily: 'Pretendard-500' 
            }}>
              위 검색창에 드신 음식을 검색해보세요
            </Text>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              backgroundColor: '#f5f5f5',
              padding: '15px',
              borderRadius: '10px',
              maxWidth: '300px'
            }}>
              <Text style={{ fontSize: '14px', color: '#888', fontFamily: 'Pretendard-500' }}>
                예시: 김치찌개, 제육볶음, 샐러드...
              </Text>
              <Text style={{ fontSize: '14px', color: '#888', marginTop: '5px', fontFamily: 'Pretendard-500' }}>
                원하는 음식이 없다면 '음식추가하기'를 눌러주세요
              </Text>
            </div>
          </div>
        ) : null}
      </div>
      
      <Modal
        visible={isModalVisible}
        onCancel={handleModalCancel}
        footer={null}
        style={{ 
          top: 0, 
          padding: 0,
          borderRadius: 8,
          height: '90vh', 
          overflow: 'hidden'
        }}
        width="100%"
        centered
        destroyOnClose
        className="fullscreen-modal"
      >
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          minHeight: '90vh', 
          background: 'white',
          position: 'relative'
        }}>
          {/* 헤더 */}
          <div style={{ 
            padding: '8px 20px 8px 4px', 
            borderBottom: '1px solid #f0f0f0',
            backgroundColor: 'white',
            position: 'sticky',
            top: 0,
            zIndex: 999,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Text style={{ 
              fontSize: '24px', 
              fontWeight: '800', 
              color: '#333', 
              fontFamily: 'Pretendard-800'
            }}>
              음식 추가하기
            </Text>
          </div>
          
          {/* 스텝 인디케이터 */}
          <div style={{ 
            display: 'flex',
            justifyContent: 'center',
            padding: '14px 0',
            backgroundColor: 'white'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: modalPage === 1 ? '#000' : '#f0f0f0',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                color: modalPage === 1 ? 'white' : '#999',
                fontFamily: 'Pretendard-600',
                fontSize: '16px'
              }}>
                1
              </div>
              <div style={{
                width: '40px',
                height: '2px',
                backgroundColor: modalPage >= 2 ? '#000' : '#f0f0f0'
              }}></div>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: modalPage === 2 ? '#000' : '#f0f0f0',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                color: modalPage === 2 ? 'white' : '#999',
                fontFamily: 'Pretendard-600',
                fontSize: '16px'
              }}>
                2
              </div>
              <div style={{
                width: '40px',
                height: '2px',
                backgroundColor: modalPage === 3 ? '#000' : '#f0f0f0'
              }}></div>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: modalPage === 3 ? '#000' : '#f0f0f0',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                color: modalPage === 3 ? 'white' : '#999',
                fontFamily: 'Pretendard-600',
                fontSize: '16px'
              }}>
                3
              </div>
            </div>
          </div>
          
          {/* 본문 */}
          <div style={{ 
            padding: '5px 2px',
            flex: 1
          }}>
            {modalPage === 1 && (
              <div>
                <Text style={{ 
                  fontSize: '24px', 
                  fontWeight: '700', 
                  color: '#333', 
                  fontFamily: 'Pretendard-700',
                  display: 'block',
                  marginBottom: '20px'
                }}>
                  음식의 이름을 알려주세요
                </Text>
                <Form layout="vertical">
                  <Form.Item 
                    label={
                      <Text style={{ 
                        fontSize: '16px', 
                        fontWeight: '600',
                        paddingLeft: '3px',
                        opacity: 0.8,
                        color: '#333', 
                        fontFamily: 'Pretendard-600',
                      }}>
                        음식 이름
                      </Text>
                    }
                    help={
                      <Text style={{ 
                        color: '#888', 
                        fontSize: '14px',
                        fontFamily: 'Pretendard-400'
                      }}>
                        음식 이름을 상세하게 입력해주세요 (예: 돼지고기 김치찌개, 맘스터치 싸이버거 등)
                      </Text>
                    }
                  >
                    <Input
                      name="name"
                      value={newFood.name}
                      placeholder="예) 김치찌개, 돼지고기 김치찌개"
                      onChange={(e) => handleInputChange(e, 'name')}
                      style={{ 
                        borderRadius: '12px', 
                        height: '50px',
                        fontSize: '16px',
                        padding: '8px 16px',
                        border: '2px solid #f0f0f0'
                      }}
                    />
                  </Form.Item>
                </Form>
              </div>
            )}

            {modalPage === 2 && (
              <div>
                <Text style={{ 
                  fontSize: '24px', 
                  fontWeight: '700', 
                  color: '#333', 
                  fontFamily: 'Pretendard-700',
                  display: 'block',
                  marginBottom: '20px'
                }}>
                  영양 정보 검색
                </Text>
                
                <div style={{marginBottom: '20px'}}>
                  <Text style={{ 
                    fontSize: '16px', 
                    color: '#666', 
                    fontFamily: 'Pretendard-400'
                  }}>
                    "{newFood.name}" 영양성분 정보
                  </Text>
                </div>
                
                {/* 검색 버튼 */}
                <Button 
                  onClick={searchFoodNutrition}
                  loading={isSearching}
                  style={{ 
                    width: '100%',
                    height: '40px',
                    borderRadius: '12px',
                    backgroundColor: '#5FDD9D',
                    borderColor: '#5FDD9D',
                    fontFamily: 'Pretendard-600',
                    fontSize: '16px',
                    color: 'white',
                    marginBottom: '20px'
                  }}
                >
                  영양성분 검색하기
                </Button>
                
                {/* 검색 결과 없음 */}
                {noSearchResult && (
                  <div style={{
                    padding: '20px',
                    backgroundColor: '#f9f9f9',
                    borderRadius: '12px',
                    textAlign: 'center',
                    marginBottom: '20px'
                  }}>
                    <Text style={{ 
                      fontSize: '16px', 
                      color: '#666', 
                      fontFamily: 'Pretendard-500' 
                    }}>
                      '{newFood.name}'에 대한 영양성분 정보를 찾을 수 없습니다.
                    </Text>
                    <Button 
                      onClick={handleManualAdd} 
                      type="primary"
                      style={{ 
                        marginTop: '16px',
                        borderRadius: '8px',
                        backgroundColor: '#5FDD9D',
                        borderColor: '#5FDD9D'
                      }}
                    >
                      직접 추가하기
                    </Button>
                  </div>
                )}
                
                {/* 검색 결과 목록 */}
                {foodSearchResults.length > 0 && (
                  <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    border: '1px solid #f0f0f0',
                    marginBottom: '20px',
                    overflow: 'auto',
                    maxHeight: '350px'
                  }}>
                    {foodSearchResults.map((item, index) => (
                      <div 
                        key={index}
                        onClick={() => selectFoodInfo(item)}
                        style={{
                          padding: '10px 10px',
                          borderBottom: index < foodSearchResults.length - 1 ? '1px solid #f0f0f0' : 'none',
                          cursor: 'pointer',
                          backgroundColor: selectedFoodInfo === item ? '#f0fff7' : 'white'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <Text style={{ 
                              fontSize: '16px', 
                              fontWeight: '600', 
                              color: selectedFoodInfo === item ? '#5FDD9D' : '#333', 
                              fontFamily: 'Pretendard-600'
                            }}>
                              {item.name}
                            </Text>
                            <Text style={{ 
                              fontSize: '11px', 
                              color: '#888', 
                              fontFamily: 'Pretendard-400',
                              marginLeft: '8px'
                            }}>
                              {item.brand ? `(${item.brand}) - ` : ''}{item.unit}
                            </Text>
                          </div>
                          {selectedFoodInfo === item && (
                            <CheckCircleTwoTone
                              twoToneColor="#5FDD9D"
                              style={{ fontSize: 20 }}
                            />
                          )}
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          marginTop: '8px',
                          backgroundColor: '#f8f8f8',
                          padding: '8px 10px',
                          borderRadius: '8px'
                        }}>
                          <Text style={{ 
                            fontSize: '12px', 
                            fontWeight: '600',
                            color: '#666', 
                            fontFamily: 'Pretendard-600',
                            marginRight: '5px'
                          }}>
                            제공량:
                          </Text>
                          <Text style={{ 
                            fontSize: '12px', 
                            color: '#333', 
                            fontFamily: 'Pretendard-500'
                          }}>
                            {item.unit}
                          </Text>
                        </div>
                        {isAdmin && (
                          <div style={{marginTop: '5px'}}>
                            <Text style={{ 
                              fontSize: '12px', 
                              color: '#666', 
                              fontFamily: 'Pretendard-400'
                            }}>
                              칼로리: {item.calories}kcal | 탄수화물: {item.carbs}g | 단백질: {item.protein}g | 지방: {item.fat}g
                            </Text>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* 직접 입력 안내 */}
                {!isSearching && foodSearchResults.length === 0 && !noSearchResult && (
                  <div style={{
                    padding: '20px',
                    backgroundColor: '#f9f9f9',
                    borderRadius: '12px',
                    textAlign: 'center'
                  }}>
                    <Text style={{ 
                      fontSize: '16px', 
                      color: '#666', 
                      fontFamily: 'Pretendard-500' 
                    }}>
                      상단의 '영양성분 검색하기' 버튼을 눌러 검색해주세요.
                    </Text>
                    <Text style={{ 
                      fontSize: '14px', 
                      color: '#999', 
                      fontFamily: 'Pretendard-400',
                      display: 'block',
                      marginTop: '10px'
                    }}>
                      검색해도 결과가 없거나 직접 입력하고 싶으시면 아래 버튼을 클릭하세요.
                    </Text>
                    <Button 
                      onClick={handleManualAdd} 
                      style={{ 
                        marginTop: '16px',
                        borderRadius: '8px',
                        borderColor: '#5FDD9D',
                        color: '#5FDD9D'
                      }}
                    >
                      직접 추가하기
                    </Button>
                  </div>
                )}
              </div>
            )}

            {modalPage === 3 && (
              <div>
                {/* 고정 영역 - 제목 */}
                <div>
                  <Text style={{ 
                    fontSize: '24px', 
                    fontWeight: '700', 
                    color: '#333', 
                    fontFamily: 'Pretendard-700',
                    display: 'block',
                    marginBottom: '5px'
                  }}>
                    음식 중량을 입력해 주세요
                  </Text>
                  {/* 추가된 음식 이름 표시 */}
                  <Text style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#5FDD9D',
                    fontFamily: 'Pretendard-700',
                    display: 'block',
                    textAlign: 'center',
                    marginBottom: '8px',
                    wordBreak: 'keep-all', // 단어 단위 줄바꿈
                  }}>
                    {newFood.name}
                  </Text>
                  <Text style={{ 
                    fontSize: '16px',
                    color: '#666', 
                    fontFamily: 'Pretendard-400',
                    display: 'block',
                    marginBottom: '20px',
                    textAlign: 'center' // 중앙 정렬 추가
                  }}>
                    입력한 중량이 1인분으로 설정됩니다
                  </Text>
                </div>
                
                {/* 스크롤 영역 - 폼 */}
                <div style={{
                  maxHeight: 'calc(90vh - 350px)', // 적절한 높이로 조정
                  overflowY: 'auto',
                  paddingRight: '5px' // 스크롤바 공간 확보
                }}>
                  <Form layout="vertical">
                    {/* 단위 선택 버튼 */}
                    <div style={{ 
                      display: 'flex', 
                      gap: '12px', 
                      marginBottom: '24px' 
                    }}>
                      <div 
                        onClick={() => handleWeightUnitChange('g')}
                        style={{
                          flex: 1,
                          height: '50px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: `2px solid ${weightUnit === 'g' ? '#5FDD9D' : '#f0f0f0'}`,
                          borderRadius: '12px',
                          backgroundColor: weightUnit === 'g' ? '#f0fff7' : 'white',
                          cursor: 'pointer',
                          fontFamily: 'Pretendard-600',
                          fontSize: '16px',
                          color: weightUnit === 'g' ? '#5FDD9D' : '#666'
                        }}
                      >
                        그램(g)
                      </div>
                      <div 
                        onClick={() => handleWeightUnitChange('ml')}
                        style={{
                          flex: 1,
                          height: '50px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: `2px solid ${weightUnit === 'ml' ? '#5FDD9D' : '#f0f0f0'}`,
                          borderRadius: '12px',
                          backgroundColor: weightUnit === 'ml' ? '#f0fff7' : 'white',
                          cursor: 'pointer',
                          fontFamily: 'Pretendard-600',
                          fontSize: '16px',
                          color: weightUnit === 'ml' ? '#5FDD9D' : '#666'
                        }}
                      >
                        밀리리터(ml)
                      </div>
                    </div>
                    
                    <Form.Item 
                      label={
                        <Text style={{ 
                          fontSize: '18px', 
                          fontWeight: '600', 
                          color: '#333', 
                          fontFamily: 'Pretendard-600'
                        }}>
                          총 중량
                        </Text>
                      }
                      help={
                        <Text style={{ 
                          color: '#888', 
                          fontSize: '12px',
                          fontFamily: 'Pretendard-400',
                          paddingLeft: '15px'
                        }}>
                          {weightUnit === 'g' 
                            ? '음식의 총 중량을 g 단위로 입력해주세요 (예: 100, 250)' 
                            : '음식의 총 용량을 ml 단위로 입력해주세요 (예: 200, 500)'}
                        </Text>
                      }
                    >
                      <div style={{ position: 'relative' }}>
                        <Input
                          name="weight"
                          value={newFood.weight}
                          placeholder={weightUnit === 'g' ? "예) 100, 250" : "예) 200, 500"}
                          onChange={(e) => handleInputChange(e, 'weight')}
                          style={{ 
                            borderRadius: '12px', 
                            height: '50px',
                            fontSize: '16px',
                            padding: '8px 16px',
                            border: '2px solid #f0f0f0',
                            paddingRight: '60px',
                          }}
                        />
                        <div style={{
                          position: 'absolute',
                          right: '16px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontFamily: 'Pretendard-600',
                          fontSize: '16px',
                          color: '#666'
                        }}>
                          {weightUnit}
                        </div>
                      </div>
                    </Form.Item>

                    {/* 직접 입력용 영양성분 필드 (선택된 음식 정보가 없을 때만 표시) */}
                    {/* {!selectedFoodInfo && (
                      <div style={{
                        marginTop: '20px',
                        backgroundColor: '#f9f9f9',
                        padding: '15px',
                        borderRadius: '12px'
                      }}>
                        <Text style={{ 
                          fontSize: '18px', 
                          fontWeight: '600', 
                          color: '#333', 
                          fontFamily: 'Pretendard-600',
                          display: 'block',
                          marginBottom: '15px'
                        }}>
                          영양성분 직접 입력 (선택사항)
                        </Text>
                        
                        <Form.Item 
                          label={
                            <Text style={{ 
                              fontSize: '16px', 
                              fontWeight: '500', 
                              color: '#333', 
                              fontFamily: 'Pretendard-500'
                            }}>
                              칼로리 (kcal)
                            </Text>
                          }
                        >
                          <Input
                            placeholder="예) 250"
                            value={newFood.calories}
                            onChange={(e) => setNewFood({
                              ...newFood,
                              calories: e.target.value ? Number(e.target.value) : null
                            })}
                            style={{ 
                              borderRadius: '8px', 
                              height: '40px',
                              border: '1px solid #f0f0f0'
                            }}
                            type="number"
                          />
                        </Form.Item>
                        
                        <Form.Item 
                          label={
                            <Text style={{ 
                              fontSize: '16px', 
                              fontWeight: '500', 
                              color: '#333', 
                              fontFamily: 'Pretendard-500'
                            }}>
                              탄수화물 (g)
                            </Text>
                          }
                        >
                          <Input
                            placeholder="예) 30"
                            value={newFood.nutrients.carbs}
                            onChange={(e) => setNewFood({
                              ...newFood,
                              nutrients: {
                                ...newFood.nutrients,
                                carbs: e.target.value ? Number(e.target.value) : null
                              }
                            })}
                            style={{ 
                              borderRadius: '8px', 
                              height: '40px',
                              border: '1px solid #f0f0f0'
                            }}
                            type="number"
                          />
                        </Form.Item>
                        
                        <Form.Item 
                          label={
                            <Text style={{ 
                              fontSize: '16px', 
                              fontWeight: '500', 
                              color: '#333', 
                              fontFamily: 'Pretendard-500'
                            }}>
                              단백질 (g)
                            </Text>
                          }
                        >
                          <Input
                            placeholder="예) 15"
                            value={newFood.nutrients.protein}
                            onChange={(e) => setNewFood({
                              ...newFood,
                              nutrients: {
                                ...newFood.nutrients,
                                protein: e.target.value ? Number(e.target.value) : null
                              }
                            })}
                            style={{ 
                              borderRadius: '8px', 
                              height: '40px',
                              border: '1px solid #f0f0f0'
                            }}
                            type="number"
                          />
                        </Form.Item>
                        
                        <Form.Item 
                          label={
                            <Text style={{ 
                              fontSize: '16px', 
                              fontWeight: '500', 
                              color: '#333', 
                              fontFamily: 'Pretendard-500'
                            }}>
                              지방 (g)
                            </Text>
                          }
                        >
                          <Input
                            placeholder="예) 10"
                            value={newFood.nutrients.fat}
                            onChange={(e) => setNewFood({
                              ...newFood,
                              nutrients: {
                                ...newFood.nutrients,
                                fat: e.target.value ? Number(e.target.value) : null
                              }
                            })}
                            style={{ 
                              borderRadius: '8px', 
                              height: '40px',
                              border: '1px solid #f0f0f0'
                            }}
                            type="number"
                          />
                        </Form.Item>
                      </div>
                    )} */}
                    
                    {/* 영양성분 정보 표시 (선택된 음식 정보가 있을 때만 표시) */}
                    {selectedFoodInfo && (
                      <div style={{
                        marginTop: '10px',
                        padding: '15px',
                        backgroundColor: '#f9f9f9',
                        borderRadius: '12px'
                      }}>
                        <Text style={{ 
                          fontSize: '16px', 
                          fontWeight: '600', 
                          color: '#333', 
                          fontFamily: 'Pretendard-600',
                          display: 'block',
                          marginBottom: '10px'
                        }}>
                          {isAdmin ? '영양성분 정보' : '제공량 정보'}
                        </Text>
                        
                        {/* 제공량 정보 (모든 사용자에게 표시) */}
                        <div style={{
                          backgroundColor: 'white',
                          padding: '12px',
                          borderRadius: '8px',
                          marginBottom: '10px',
                          border: '1px solid #eee'
                        }}>
                          <Text style={{ 
                            fontSize: '14px', 
                            color: '#666', 
                            fontFamily: 'Pretendard-500',
                            display: 'block',
                            marginBottom: '5px'
                          }}>
                            1인분 기준:
                          </Text>
                          <Text style={{ 
                            fontSize: '18px', 
                            fontWeight: '600', 
                            color: '#333', 
                            fontFamily: 'Pretendard-600'
                          }}>
                            {selectedFoodInfo.unit}
                          </Text>
                          {selectedFoodInfo.brand && (
                            <Text style={{ 
                              fontSize: '14px', 
                              color: '#888', 
                              fontFamily: 'Pretendard-400',
                              display: 'block',
                              marginTop: '5px'
                            }}>
                              브랜드: {selectedFoodInfo.brand}
                            </Text>
                          )}
                        </div>
                        
                        {/* 영양성분 정보 (관리자에게만 표시) */}
                        {isAdmin && (
                          <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '10px'
                          }}>
                            <div style={{
                              flex: '1 0 45%',
                              backgroundColor: 'white',
                              padding: '10px',
                              borderRadius: '8px',
                              textAlign: 'center'
                            }}>
                              <Text style={{ 
                                fontSize: '14px', 
                                color: '#666', 
                                fontFamily: 'Pretendard-400',
                                display: 'block'
                              }}>
                                칼로리
                              </Text>
                              <Text style={{ 
                                fontSize: '16px', 
                                fontWeight: '600', 
                                color: '#5FDD9D', 
                                fontFamily: 'Pretendard-600'
                              }}>
                                {selectedFoodInfo.calories}kcal
                              </Text>
                            </div>
                            <div style={{
                              flex: '1 0 45%',
                              backgroundColor: 'white',
                              padding: '10px',
                              borderRadius: '8px',
                              textAlign: 'center'
                            }}>
                              <Text style={{ 
                                fontSize: '14px', 
                                color: '#666', 
                                fontFamily: 'Pretendard-400',
                                display: 'block'
                              }}>
                                탄수화물
                              </Text>
                              <Text style={{ 
                                fontSize: '16px', 
                                fontWeight: '600', 
                                color: '#333', 
                                fontFamily: 'Pretendard-600'
                              }}>
                                {selectedFoodInfo.carbs}g
                              </Text>
                            </div>
                            <div style={{
                              flex: '1 0 45%',
                              backgroundColor: 'white',
                              padding: '10px',
                              borderRadius: '8px',
                              textAlign: 'center'
                            }}>
                              <Text style={{ 
                                fontSize: '14px', 
                                color: '#666', 
                                fontFamily: 'Pretendard-400',
                                display: 'block'
                              }}>
                                단백질
                              </Text>
                              <Text style={{ 
                                fontSize: '16px', 
                                fontWeight: '600', 
                                color: '#333', 
                                fontFamily: 'Pretendard-600'
                              }}>
                                {selectedFoodInfo.protein}g
                              </Text>
                            </div>
                            <div style={{
                              flex: '1 0 45%',
                              backgroundColor: 'white',
                              padding: '10px',
                              borderRadius: '8px',
                              textAlign: 'center'
                            }}>
                              <Text style={{ 
                                fontSize: '14px', 
                                color: '#666', 
                                fontFamily: 'Pretendard-400',
                                display: 'block'
                              }}>
                                지방
                              </Text>
                              <Text style={{ 
                                fontSize: '16px', 
                                fontWeight: '600', 
                                color: '#333', 
                                fontFamily: 'Pretendard-600'
                              }}>
                                {selectedFoodInfo.fat}g
                              </Text>
                            </div>
                          </div>
                        )}
                        
                        {/* 일반 사용자에게 표시될 메시지 */}
                        {!isAdmin && (
                          <div style={{
                            backgroundColor: '#f0f0f0',
                            padding: '10px',
                            borderRadius: '8px',
                            textAlign: 'center',
                            marginTop: '5px'
                          }}>
                            <Text style={{ 
                              fontSize: '13px', 
                              color: '#888', 
                              fontFamily: 'Pretendard-400'
                            }}>
                              영양성분 정보는 관리자 전용 기능입니다.
                            </Text>
                          </div>
                        )}
                      </div>
                    )}
                  </Form>
                </div>
              </div>
            )}
          </div>
          
          {/* 하단 버튼 */}
          <div style={{ 
            padding: '16px 20px', 
            borderTop: '1px solid #f0f0f0',
            backgroundColor: 'white',
            position: 'sticky',
            bottom: 0,
            width: '100%',
            display: 'flex',
            gap: '12px'
          }}>
            {modalPage === 1 ? (
              <>
                <Button 
                  onClick={handleModalCancel}
                  style={{ 
                    flex: 1,
                    height: '50px',
                    borderRadius: '12px',
                    border: '2px solid #f0f0f0',
                    fontFamily: 'Pretendard-600',
                    fontSize: '16px',
                    color: '#666'
                  }}
                >
                  취소
                </Button>
                <Button 
                  onClick={() => newFood.name.trim() ? setModalPage(2) : null}
                  disabled={!newFood.name.trim()}
                  style={{ 
                    flex: 1,
                    height: '50px',
                    borderRadius: '12px',
                    backgroundColor: newFood.name.trim() ? '#5FDD9D' : '#f5f5f5',
                    borderColor: newFood.name.trim() ? '#5FDD9D' : '#f5f5f5',
                    fontFamily: 'Pretendard-600',
                    fontSize: '16px',
                    color: newFood.name.trim() ? 'white' : '#999'
                  }}
                >
                  다음
                </Button>
              </>
            ) : modalPage === 2 ? (
              <>
                <Button 
                  onClick={() => setModalPage(1)}
                  style={{ 
                    flex: 1,
                    height: '50px',
                    borderRadius: '12px',
                    border: '2px solid #f0f0f0',
                    fontFamily: 'Pretendard-600',
                    fontSize: '16px',
                    color: '#666'
                  }}
                >
                  이전
                </Button>
                <Button 
                  onClick={() => setModalPage(3)}
                  style={{ 
                    flex: 1,
                    height: '50px',
                    borderRadius: '12px',
                    backgroundColor: '#5FDD9D',
                    borderColor: '#5FDD9D',
                    fontFamily: 'Pretendard-600',
                    fontSize: '16px',
                    color: 'white'
                  }}
                >
                  다음
                </Button>
              </>
            ) : (
              <>
                <Button 
                  onClick={() => setModalPage(2)}
                  style={{ 
                    flex: 1,
                    height: '50px',
                    borderRadius: '12px',
                    border: '2px solid #f0f0f0',
                    fontFamily: 'Pretendard-600',
                    fontSize: '16px',
                    color: '#666'
                  }}
                >
                  이전
                </Button>
                <Button 
                  onClick={handleModalOk}
                  disabled={!isFormValid()}
                  style={{ 
                    flex: 1,
                    height: '50px',
                    borderRadius: '12px',
                    backgroundColor: isFormValid() ? '#5FDD9D' : '#f5f5f5',
                    borderColor: isFormValid() ? '#5FDD9D' : '#f5f5f5',
                    fontFamily: 'Pretendard-600',
                    fontSize: '16px',
                    color: isFormValid() ? 'white' : '#999'
                  }}
                >
                  추가하기
                </Button>
              </>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Meal;

