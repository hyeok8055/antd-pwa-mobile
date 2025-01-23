import React, { useState, useEffect, useRef, useCallback } from "react";
import { Typography, Input, Row, Col, Select, Checkbox, Button, Modal, Form, InputNumber } from 'antd';
import Fuse from "fuse.js";
import { useParams, Link, useNavigate } from "react-router-dom";
import noImage from "../../assets/no-image.png";
import { CheckCircleTwoTone, PlusOutlined } from '@ant-design/icons';
import { realtimeDb } from '../../firebaseconfig';
import { ref, push, set, onValue } from "firebase/database";
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
  });
  const dispatch = useDispatch();
  const foods = useSelector((state) => state.food.foods);
  const listRef = useRef(null);
  const containerRef = useRef(null);
  const [listHeight, setListHeight] = useState(400);
  const [weightUnit, setWeightUnit] = useState('g');

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

      let result = searchTerm ? fuse.search(searchTerm).map(item => item.item) : Object.values(foods);

      if (selectedCountry !== 'default') {
        result = result.filter(item => item.country === selectedCountry);
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
    });
  };

  const handleInputChange = (e, name) => {

    if (name === 'weight') {
      setNewFood({ ...newFood, weight: e.target.value });
    } else if (name.startsWith('nutrients.')) {
      const nutrientKey = name.split('.')[1];
      setNewFood({
        ...newFood,
        nutrients: { ...newFood.nutrients, [nutrientKey]: e },
      });
    } else if (name === 'calories') {
      setNewFood({ ...newFood, [name]: e });
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
      const foodKey = `${newFood.name}_${sanitizedEmail}`;
      const foodsRef = ref(realtimeDb, `foods/${foodKey}`);
      const weightWithUnit = `${newFood.weight}${weightUnit}`;
      await set(foodsRef, { ...newFood, weight: weightWithUnit });
      setIsModalVisible(false);
      setNewFood({
        name: '',
        calories: null,
        weight: null,
        nutrients: {
          carbs: null,
          protein: null,
          fat: null,
        },
      });
    } catch (error) {
      console.error('음식 추가 실패:', error);
      alert('음식 추가에 실패했습니다.');
    }
  };

  const isFormValid = () => {
    return (
      newFood.name !== '' &&
      newFood.weight !== null &&
      newFood.weight !== '' &&
      newFood.calories !== null &&
      newFood.nutrients &&
      newFood.nutrients.carbs !== null &&
      newFood.nutrients.protein !== null &&
      newFood.nutrients.fat !== null
    );
  };

  const RowRenderer = ({ index, style }) => {
    const items = [...selectedItems, ...filteredFood.filter(item => !selectedItems.includes(item))];
    const itemIndex1 = index * 2;
    const itemIndex2 = index * 2 + 1;
    const item1 = items[itemIndex1];
    const item2 = items[itemIndex2];

    return (
      <Row gutter={[4, 4]} style={style}>
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
                backgroundColor: selectedItems.includes(item1) ? '#f0f0f0' : 'white',
                position: 'relative',
                cursor: 'pointer',
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Text style={{ fontSize: '16px', fontWeight: '500', color: '#333', fontFamily: 'Pretendard-500', textAlign: 'center', width: '100%' }}>{item1.name}</Text>
                {selectedItems.includes(item1) && (
                  <CheckCircleTwoTone
                    style={{ position: 'absolute', right: 60, pointerEvents: 'none', fontSize: 30 }}
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
                backgroundColor: selectedItems.includes(item2) ? '#f0f0f0' : 'white',
                position: 'relative',
                cursor: 'pointer',
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', width: '100%', position: 'relative' }}>
                <Text style={{ fontSize: '16px', fontWeight: '500', color: '#333', fontFamily: 'Pretendard-500', textAlign: 'center', width: '100%' }}>{item2.name}</Text>
                {selectedItems.includes(item2) && (
                  <CheckCircleTwoTone
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      pointerEvents: 'none',
                      fontSize: 30,
                    }}
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
      setListHeight(containerRef.current.clientHeight);
    }
  }, []);

  useEffect(() => {
    handleResize();
    let resizeObserver = null;
    if (containerRef.current) {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(containerRef.current);
    }
    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [handleResize]);

  return (
    <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Row justify="space-between" style={{ marginBottom: 15 }}>
        <Text style={{ fontSize: '24px', fontWeight: '800', color: '#5FDD9D', letterSpacing: '1px', fontFamily: 'Pretendard-800'}}>
          {getMealTitle()} 식사목록
        </Text>
        
        <Button type="primary" onClick={handleNextClick} disabled={selectedItems.length === 0} style={{ fontFamily: 'Pretendard-700', marginTop: 5}}>
          다음으로
        </Button>
      </Row>
      <Row gutter={[16, 24]} align="middle" style={{}}>
        <Col flex="auto">
          <Search
            placeholder="음식 검색"
            value={searchTerm}
            size="large"
            onChange={handleSearchChange}
            style={{ width: '100%'}}
          />
          <Row justify="end" style={{ marginTop: 10 }}>
            <Button onClick={handleAddFoodClick} icon={<PlusOutlined />} style={{ fontFamily: 'Pretendard-700'}}>
              음식추가하기
            </Button>
          </Row>
        </Col>
      </Row>
      <div style={{ flex: 1, marginTop: 10, overflowY: 'auto', marginBottom: '5vh' }} ref={containerRef}>
        <FixedSizeList
          ref={listRef}
          height={listHeight}
          width="100%"
          itemSize={60}
          itemCount={Math.ceil([...selectedItems, ...filteredFood.filter(item => !selectedItems.includes(item))].length / 2)}
        >
          {RowRenderer}
        </FixedSizeList>
      </div>
      <Modal
        title={<Text style={{ fontSize: '20px', fontWeight: '800', color: 'black', letterSpacing: '1px', fontFamily: 'Pretendard-900'}}>
          음식 추가 : 100g/ml 기준
        </Text>}
        visible={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        okText="추가"
        cancelText="취소"
        okButtonProps={{ disabled: !isFormValid() }}
      >
        <Form layout="vertical">
          <Form.Item label={<Text style={{ fontSize: '16px', fontWeight: '500', color: '#333', fontFamily: 'Pretendard-500'}}>음식 이름</Text>}>
            <Input
              name="name"
              value={newFood.name}
              placeholder="예) 카레라이스"
              onChange={(e) => handleInputChange(e, 'name')}
            />
          </Form.Item>
          <Form.Item label={<Text style={{ fontSize: '16px', fontWeight: '500', color: '#333', fontFamily: 'Pretendard-500'}}>총 중량 (식품 전체 중량)</Text>}>
            <Input
              name="weight"
              value={newFood.weight}
              placeholder="예) 300g 혹은 600ml"
              onChange={(e) => handleInputChange(e, 'weight')}
              style={{ width: '100%' }}
              addonAfter={
                <Select defaultValue="g" onChange={handleWeightUnitChange}>
                  <Option value="g">g</Option>
                  <Option value="ml">ml</Option>
                </Select>
              }
            />
          </Form.Item>
          <Form.Item label={<Text style={{ fontSize: '16px', fontWeight: '500', color: '#333', fontFamily: 'Pretendard-500'}}>칼로리 (Kcal)</Text>}>
            <InputNumber
              name="calories"
              value={newFood.calories}
              placeholder="예) 300"
              onChange={(e) => handleInputChange(e, 'calories')}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label={<Text style={{ fontSize: '16px', fontWeight: '500', color: '#333', fontFamily: 'Pretendard-500'}}>탄수화물 (g)</Text>}>
            <InputNumber
              name="nutrients.carbs"
              value={newFood.nutrients.carbs}
              placeholder="예) 30"
              onChange={(e) => handleInputChange(e, 'nutrients.carbs')}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label={<Text style={{ fontSize: '16px', fontWeight: '500', color: '#333', fontFamily: 'Pretendard-500'}}>단백질 (g)</Text>}>
            <InputNumber
              name="nutrients.protein"
              value={newFood.nutrients.protein}
              placeholder="예) 10"
              onChange={(e) => handleInputChange(e, 'nutrients.protein')}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label={<Text style={{ fontSize: '16px', fontWeight: '500', color: '#333', fontFamily: 'Pretendard-500'}}>지방 (g)</Text>}>
            <InputNumber
              name="nutrients.fat"
              value={newFood.nutrients.fat}
              placeholder="예) 10"
              onChange={(e) => handleInputChange(e, 'nutrients.fat')}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Meal;
