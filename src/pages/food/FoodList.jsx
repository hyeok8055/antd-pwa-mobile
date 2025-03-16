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

const { Text } = Typography;
const { Search } = Input;

const Meal = () => {
  const { mealType } = useParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredFood, setFilteredFood] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('default');
  const [selectedItems, setSelectedItems] = useState([]);
  const navigate = useNavigate();
  const [isModalVisible, setIsModalVisible] = useState(false);
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
  const dispatch = useDispatch();
  const foods = useSelector((state) => state.food.foods);
  const listRef = useRef(null);
  const containerRef = useRef(null);
  const [listHeight, setListHeight] = useState(400);
  const [weightUnit, setWeightUnit] = useState('인분');

  useEffect(() => {
    const foodsRef = ref(realtimeDb, 'foods');
    const unsubscribe = onValue(foodsRef, (snapshot) => {
      const foodsData = snapshot.val();
      if (foodsData) {
        dispatch(setFoods(foodsData));
      }
    });

    return () => unsubscribe();
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
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
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
      const weightWithUnit = `${newFood.weight}${weightUnit}`;
      
      // 서버로 전송할 때 영양소 정보를 null로 설정
      const foodData = { 
        ...newFood, 
        weight: weightWithUnit,
        calories: null,
        nutrients: {
          carbs: null,
          protein: null,
          fat: null,
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
        title={<Text style={{ fontSize: '20px', fontWeight: '800', color: '#5FDD9D', letterSpacing: '1px', fontFamily: 'Pretendard-900'}}>
          음식 추가하기
        </Text>}
        visible={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        okText="추가하기"
        cancelText="취소"
        okButtonProps={{ 
          disabled: !isFormValid(),
          style: isFormValid() ? { backgroundColor: '#5FDD9D', borderColor: '#5FDD9D' } : undefined
        }}
        style={{ borderRadius: '12px' }}
      >
        <Form layout="vertical">
          <Form.Item 
            label={<Text style={{ fontSize: '16px', fontWeight: '600', color: '#333', fontFamily: 'Pretendard-600'}}>음식 이름</Text>}
            help={<Text style={{ color: '#888' }}>음식 이름을 상세하게 입력해주세요 (예: 돼지고기 김치찌개, 홍길동 부대찌개 라면 등)</Text>}
          >
            <Input
              name="name"
              value={newFood.name}
              placeholder="예) 김치찌개, 돼지고기 김치찌개"
              onChange={(e) => handleInputChange(e, 'name')}
              style={{ borderRadius: '8px', height: '40px' }}
            />
          </Form.Item>
          <Form.Item 
            label={<Text style={{ fontSize: '16px', fontWeight: '600', color: '#333', fontFamily: 'Pretendard-600'}}>총 중량</Text>}
            help={<Text style={{ color: '#888' }}>기본 단위는 '인분'입니다. 그램 단위로 입력하시려면 단위를 변경해주세요.</Text>}
          >
            <Input
              name="weight"
              value={newFood.weight}
              placeholder="예) 1, 2, 0.5"
              onChange={(e) => handleInputChange(e, 'weight')}
              style={{ width: '100%', borderRadius: '8px', height: '40px' }}
              addonAfter={
                <Select 
                  defaultValue="인분" 
                  value={weightUnit} 
                  onChange={handleWeightUnitChange}
                  style={{ borderTopRightRadius: '8px', borderBottomRightRadius: '8px' }}
                >
                  <Select.Option value="인분">인분</Select.Option>
                  <Select.Option value="g">g</Select.Option>
                </Select>
              }
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Meal;
