import React, { useState, useEffect } from "react";
import { Typography, Input, Row, Col, Button, Modal, Form, Table, InputNumber, message, Checkbox, Space, Select, Tooltip } from 'antd';
import { realtimeDb, db } from '../../firebaseconfig';
import { ref, get, update } from "firebase/database";
import { collection, getDocs, doc, getDoc, updateDoc, query, where } from 'firebase/firestore';
import { useSelector } from 'react-redux';
import { useNavigate } from "react-router-dom";
import { useMediaQuery } from 'react-responsive';
import { SyncOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;
const { Search } = Input;
const { Option } = Select;
const { confirm } = Modal;

// 관리자 접근 가능한 이메일 목록
const ADMIN_EMAILS = [
  'eodud653923@gmail.com',
  'youngwonhahn00@gmail.com',
  'juhyeok0123@gmail.com',
  'wn990123@gmail.com',
  'garcia29845@gmail.com',
  'yunj29845@gmail.com',
];

const AdminPage = () => {
  const [userFoods, setUserFoods] = useState([]);
  const [filteredFoods, setFilteredFoods] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentFood, setCurrentFood] = useState(null);
  const [form] = Form.useForm();
  const user = useSelector((state) => state.auth.user);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [weightUnit, setWeightUnit] = useState('인분');
  const [syncLoading, setSyncLoading] = useState(false);
  
  // 미디어 쿼리로 모바일 환경 감지
  const isMobile = useMediaQuery({ maxWidth: 767 });

  // 권한 체크
  useEffect(() => {
    if (!user || !ADMIN_EMAILS.includes(user.email)) {
      message.error('이 페이지에 접근할 권한이 없습니다.');
      navigate('/main');
    }
  }, [user, navigate]);

  // 영양성분이 모두 작성된 음식인지 확인하는 함수
  const isCompleteFood = (food) => {
    return food.calories !== null && 
           food.nutrients?.carbs !== null && 
           food.nutrients?.protein !== null && 
           food.nutrients?.fat !== null;
  };

  // 사용자가 추가한 음식 데이터만 가져오기
  useEffect(() => {
    const fetchUserFoods = async () => {
      setLoading(true);
      try {
        const foodsRef = ref(realtimeDb, 'foods');
        const snapshot = await get(foodsRef);
        
        if (snapshot.exists()) {
          const foodsData = snapshot.val();
          // 사용자가 추가한 음식만 필터링 (키에 언더스코어가 있는 데이터)
          const userAddedFoods = Object.entries(foodsData)
            .filter(([key]) => key.includes('_'))
            .map(([key, value]) => ({
              key,
              ...value,
              calories: value.calories || null,
              nutrients: {
                carbs: value.nutrients?.carbs || null,
                protein: value.nutrients?.protein || null,
                fat: value.nutrients?.fat || null,
              }
            }));
          
          setUserFoods(userAddedFoods);
          applyFilters(userAddedFoods, searchTerm, showCompleted);
        }
      } catch (error) {
        console.error('음식 데이터 가져오기 실패:', error);
        message.error('음식 데이터를 불러오는데 실패했습니다.');
      }
      setLoading(false);
    };

    fetchUserFoods();
  }, []);

  // 필터 적용 함수 - 검색어와 완성된 음식 표시 여부에 따라 필터링
  const applyFilters = (foods, search, showComplete) => {
    let filtered = [...foods];
    
    // 검색어 필터링
    if (search.trim() !== '') {
      filtered = filtered.filter(food => 
        food.name.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // 완성된 음식 표시 여부에 따른 필터링
    if (!showComplete) {
      filtered = filtered.filter(food => !isCompleteFood(food));
    }
    
    setFilteredFoods(filtered);
  };

  // 검색어에 따른 필터링
  useEffect(() => {
    applyFilters(userFoods, searchTerm, showCompleted);
  }, [searchTerm, showCompleted, userFoods]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleShowCompletedChange = (e) => {
    setShowCompleted(e.target.checked);
  };

  const handleEdit = (food) => {
    setCurrentFood(food);
    
    // 중량 값과 단위 분리
    let weightValue = '';
    let weightUnitValue = '인분';
    
    if (food.weight) {
      // 숫자 부분과 단위 부분 분리
      const match = food.weight.match(/^([\d.]+)(.*)$/);
      if (match) {
        weightValue = match[1];
        weightUnitValue = match[2] || '인분';
      }
    }
    
    setWeightUnit(weightUnitValue);
    
    form.setFieldsValue({
      calories: food.calories || null,
      carbs: food.nutrients?.carbs || null,
      protein: food.nutrients?.protein || null,
      fat: food.nutrients?.fat || null,
      weight: weightValue,
    });
    
    setIsModalVisible(true);
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    setCurrentFood(null);
    form.resetFields();
  };

  const handleSave = async (values) => {
    try {
      const foodRef = ref(realtimeDb, `foods/${currentFood.key}`);
      
      // 중량에 단위 추가
      const formattedWeight = `${values.weight}${weightUnit}`;
      
      await update(foodRef, {
        calories: Number(values.calories) || null,
        nutrients: {
          carbs: Number(values.carbs) || null,
          protein: Number(values.protein) || null,
          fat: Number(values.fat) || null,
        },
        weight: formattedWeight
      });

      // 상태 업데이트
      const updatedFood = {
        ...currentFood,
        calories: Number(values.calories) || null,
        nutrients: {
          carbs: Number(values.carbs) || null,
          protein: Number(values.protein) || null,
          fat: Number(values.fat) || null,
        },
        weight: formattedWeight
      };
      
      const updatedFoods = userFoods.map(food => 
        food.key === currentFood.key ? updatedFood : food
      );
      
      setUserFoods(updatedFoods);
      applyFilters(updatedFoods, searchTerm, showCompleted);

      message.success('음식 정보가 업데이트되었습니다.');
      setIsModalVisible(false);
      setCurrentFood(null);
      form.resetFields();
    } catch (error) {
      console.error('음식 정보 업데이트 실패:', error);
      message.error('음식 정보 업데이트에 실패했습니다.');
    }
  };

  const handleWeightUnitChange = (value) => {
    setWeightUnit(value);
  };

  // 사용자 식사 기록에서 영양성분 정보 동기화
  const syncNutritionData = async (foodName, nutritionData) => {
    try {
      if (!isCompleteFood(nutritionData)) {
        message.error('영양성분 정보가 완전하지 않습니다. 먼저 영양성분을 입력해주세요.');
        return false;
      }

      // 모든 사용자 문서 가져오기
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      
      let totalUpdates = 0;
      let totalRecords = 0;

      // 각 사용자 문서 반복
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const foodsCollection = collection(db, `users/${userId}/foods`);
        const foodsSnapshot = await getDocs(foodsCollection);
        
        // 각 날짜별 식사 기록 문서 반복
        for (const foodDoc of foodsSnapshot.docs) {
          const foodData = foodDoc.data();
          let updated = false;
          
          // 식사 유형 반복 (breakfast, lunch, dinner, snacks)
          const mealTypes = ['breakfast', 'lunch', 'dinner', 'snacks'];
          for (const mealType of mealTypes) {
            if (foodData[mealType] && foodData[mealType].foods && Array.isArray(foodData[mealType].foods)) {
              totalRecords += foodData[mealType].foods.length;
              
              // 각 식사의 foods 배열 업데이트
              const updatedFoods = foodData[mealType].foods.map(food => {
                // 음식 이름이 일치하는 경우 업데이트
                if (food.name === foodName) {
                  totalUpdates++;
                  updated = true;
                  
                  // portion과 weight 값을 유지하면서 영양성분 정보 업데이트
                  const portion = food.portion || 1;
                  const weight = food.weight || 100;
                  
                  // 영양성분 정보 비율 계산
                  return {
                    ...food,
                    calories: nutritionData.calories * portion,
                    nutrients: {
                      carbs: nutritionData.nutrients.carbs * portion,
                      protein: nutritionData.nutrients.protein * portion,
                      fat: nutritionData.nutrients.fat * portion,
                    }
                  };
                }
                return food;
              });
              
              // 배열 업데이트
              foodData[mealType].foods = updatedFoods;
              
              // 실제 칼로리 합계 업데이트
              const actualCalories = updatedFoods.reduce((sum, food) => sum + (food.calories || 0), 0);
              foodData[mealType].actualCalories = actualCalories;
            }
          }
          
          // 문서가 업데이트 되었으면 저장
          if (updated) {
            await updateDoc(doc(db, `users/${userId}/foods`, foodDoc.id), foodData);
          }
        }
      }
      
      message.success(`총 ${totalRecords}개 중 ${totalUpdates}개의 식사 기록이 업데이트되었습니다.`);
      return true;
    } catch (error) {
      console.error('식사 기록 업데이트 실패:', error);
      message.error('식사 기록 업데이트에 실패했습니다.');
      return false;
    }
  };

  // 현재 편집 중인 음식의 모든 유저 데이터 동기화
  const handleSyncUserData = async () => {
    if (!currentFood) {
      message.error('먼저 음식을 선택해주세요.');
      return;
    }
    
    // 확인 모달 표시
    confirm({
      title: '모든 사용자 데이터 동기화',
      icon: <ExclamationCircleOutlined />,
      content: '이 작업은 모든 사용자의 식사 기록에서 이 음식의 영양정보를 업데이트합니다. 진행하시겠습니까?',
      okText: '예, 진행합니다',
      cancelText: '취소',
      onOk: async () => {
        setSyncLoading(true);
        try {
          const success = await syncNutritionData(currentFood.name, {
            calories: Number(form.getFieldValue('calories')) || 0,
            nutrients: {
              carbs: Number(form.getFieldValue('carbs')) || 0,
              protein: Number(form.getFieldValue('protein')) || 0,
              fat: Number(form.getFieldValue('fat')) || 0,
            }
          });
          
          if (success) {
            message.success('모든 사용자의 식사 기록이 업데이트되었습니다.');
          }
        } catch (error) {
          console.error('동기화 실패:', error);
          message.error('동기화에 실패했습니다.');
        } finally {
          setSyncLoading(false);
        }
      }
    });
  };

  // PC 환경용 테이블 컬럼 설정
  const desktopColumns = [
    {
      title: '음식 이름',
      dataIndex: 'name',
      key: 'name',
      width: 120,
      render: (text) => (
        <div style={{ 
          wordBreak: 'break-word', 
          whiteSpace: 'pre-line', 
          lineHeight: '1.2em',
          fontSize: '13px'
        }}>
          {text}
        </div>
      ),
    },
    {
      title: '단위/중량',
      dataIndex: 'weight',
      key: 'weight',
      width: 80,
    },
    {
      title: '칼로리',
      dataIndex: 'calories',
      key: 'calories',
      width: 70,
      render: (text) => text || '-',
    },
    {
      title: '탄수화물',
      dataIndex: ['nutrients', 'carbs'],
      key: 'carbs',
      width: 70,
      render: (text) => text || '-',
    },
    {
      title: '단백질',
      dataIndex: ['nutrients', 'protein'],
      key: 'protein',
      width: 70,
      render: (text) => text || '-',
    },
    {
      title: '지방',
      dataIndex: ['nutrients', 'fat'],
      key: 'fat',
      width: 70,
      render: (text) => text || '-',
    },
    {
      title: '작업',
      key: 'action',
      width: 70,
      render: (_, record) => (
        <Button type="primary" size="small" onClick={() => handleEdit(record)}>
          편집
        </Button>
      ),
    },
  ];

  // 모바일 환경용 테이블 컬럼 설정 - 간소화
  const mobileColumns = [
    {
      title: '음식',
      dataIndex: 'name',
      key: 'name',
      width: '30%',
      render: (text, record) => (
        <div>
          <div style={{ 
            fontWeight: 'bold', 
            wordBreak: 'break-word', 
            whiteSpace: 'pre-line',
            lineHeight: '1.2em',
            fontSize: '13px'
          }}>
            {text}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.weight}
          </div>
        </div>
      ),
    },
    {
      title: '영양성분',
      key: 'nutrients',
      width: '35%',
      render: (_, record) => (
        <div style={{ fontSize: '12px' }}>
          <div>칼로리: {record.calories || '-'}</div>
          <div>탄수: {record.nutrients?.carbs || '-'}</div>
          <div>단백: {record.nutrients?.protein || '-'}</div>
          <div>지방: {record.nutrients?.fat || '-'}</div>
        </div>
      ),
    },
    {
      title: '편집',
      key: 'action',
      width: '15%',
      render: (_, record) => (
        <Button type="primary" size="small" onClick={() => handleEdit(record)}>
          편집
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: isMobile ? '10px' : '20px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Title level={isMobile ? 3 : 2} style={{ color: '#5FDD9D' }}>
          음식 데이터 관리자 페이지
        </Title>
      </Row>
      
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col span={isMobile ? 24 : 16}>
          <Search
            placeholder="음식 이름으로 검색"
            value={searchTerm}
            onChange={handleSearchChange}
            enterButton
            style={{ width: '100%' }}
          />
        </Col>
        <Col span={isMobile ? 24 : 8}>
          <Checkbox 
            checked={showCompleted} 
            onChange={handleShowCompletedChange}
            style={{ marginLeft: isMobile ? 0 : 10 }}
          >
            영양성분 작성 완료된 음식 보기
          </Checkbox>
        </Col>
      </Row>
      
      <div style={{ marginBottom: 10, fontSize: '14px', color: '#888' }}>
        {!showCompleted ? 
          '현재 영양성분이 미완성된 음식만 표시하고 있습니다.' : 
          '모든 음식을 표시하고 있습니다.'}
      </div>
      
      <Table 
        columns={isMobile ? mobileColumns : desktopColumns} 
        dataSource={filteredFoods}
        rowKey="key"
        loading={loading}
        scroll={{ x: '100%' }}
        pagination={{ pageSize: isMobile ? 8 : 15 }}
        size="small"
        bordered
        style={{ fontSize: '14px' }}
      />
      
      <Modal
        title="음식 영양정보 편집"
        visible={isModalVisible}
        onCancel={handleModalCancel}
        footer={null}
        width={isMobile ? '95%' : 520}
      >
        <Form
          form={form}
          onFinish={handleSave}
          layout="vertical"
        >
          <Text style={{ display: 'block', marginBottom: 16 }}>
            음식명: {currentFood?.name}
          </Text>
          
          <Form.Item
            name="weight"
            label="중량/수량"
            rules={[{ required: true, message: '중량을 입력하세요.' }]}
          >
            <Input 
              addonAfter={
                <Select 
                  value={weightUnit} 
                  onChange={handleWeightUnitChange}
                  style={{ width: 70 }}
                >
                  <Option value="인분">인분</Option>
                  <Option value="g">g</Option>
                  <Option value="ml">ml</Option>
                  <Option value="개">개</Option>
                </Select>
              }
              style={{ width: '100%' }}
            />
          </Form.Item>
          
          <Form.Item
            name="calories"
            label="칼로리 (kcal)"
            rules={[{ type: 'number', message: '유효한 숫자를 입력하세요.' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item
            name="carbs"
            label="탄수화물 (g)"
            rules={[{ type: 'number', message: '유효한 숫자를 입력하세요.' }]}
          >
            <InputNumber min={0} step={0.1} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item
            name="protein"
            label="단백질 (g)"
            rules={[{ type: 'number', message: '유효한 숫자를 입력하세요.' }]}
          >
            <InputNumber min={0} step={0.1} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item
            name="fat"
            label="지방 (g)"
            rules={[{ type: 'number', message: '유효한 숫자를 입력하세요.' }]}
          >
            <InputNumber min={0} step={0.1} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          
          <Row justify="space-between">
            <Tooltip title="모든 사용자의 식사 기록에서 이 음식의 영양성분 정보를 업데이트합니다">
              <Button 
                type="default" 
                icon={<SyncOutlined spin={syncLoading} />} 
                onClick={handleSyncUserData}
                loading={syncLoading}
              >
                사용자 데이터 동기화
              </Button>
            </Tooltip>
          
            <Space>
              <Button onClick={handleModalCancel}>
                취소
              </Button>
              <Button type="primary" htmlType="submit">
                저장
              </Button>
            </Space>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminPage; 