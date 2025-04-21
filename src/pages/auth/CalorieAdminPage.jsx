import React, { useState, useEffect, useCallback } from "react";
import { Typography, Input, Row, Col, Button, Modal, Form, Table, InputNumber, message, Select, Card, Tabs, Tag, Space, Tooltip, Divider, Switch, ColorPicker } from 'antd';
import { db } from '../../firebaseconfig';
import { collection, getDocs, doc, getDoc, updateDoc, setDoc, query, where, addDoc, deleteDoc } from 'firebase/firestore';
import { useSelector } from 'react-redux';
import { useNavigate } from "react-router-dom";
import { useMediaQuery } from 'react-responsive';
import { SyncOutlined, ExclamationCircleOutlined, UserOutlined, UsergroupAddOutlined, EditOutlined, SaveOutlined, UndoOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;
const { Search } = Input;
const { Option } = Select;
const { TabPane } = Tabs;
const { confirm } = Modal;

// 관리자 접근 가능한 이메일 목록 (AdminPage.jsx와 동일)
const ADMIN_EMAILS = [
  'eodud653923@gmail.com',
  'youngwonhahn00@gmail.com',
  'juhyeok0123@gmail.com'
];

// 기본 그룹 (그룹 삭제 시 할당될 그룹)
const DEFAULT_GROUP_KEY = 'default';

const CalorieAdminPage = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('groups');
  const [selectedGroupKey, setSelectedGroupKey] = useState(null);
  const [isGroupSettingsModalVisible, setIsGroupSettingsModalVisible] = useState(false);
  const [isGroupEditModalVisible, setIsGroupEditModalVisible] = useState(false);
  const [isUserModalVisible, setIsUserModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  const [form] = Form.useForm();
  const [groupSettingsForm] = Form.useForm();
  const [groupEditForm] = Form.useForm();
  const user = useSelector((state) => state.auth.user);
  const navigate = useNavigate();
  
  // 미디어 쿼리로 모바일 환경 감지
  const isMobile = useMediaQuery({ maxWidth: 767 });

  // 권한 체크
  useEffect(() => {
    if (!user || !ADMIN_EMAILS.includes(user.email)) {
      message.error('이 페이지에 접근할 권한이 없습니다.');
      navigate('/main');
    }
  }, [user, navigate]);

  // 그룹 데이터 로드 함수
  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const groupsCollection = collection(db, 'calorieGroups');
      const groupsSnapshot = await getDocs(groupsCollection);
      const groupsData = groupsSnapshot.docs.map(doc => ({
        id: doc.id,
        key: doc.data().key || doc.id,
        ...doc.data()
      }));
      
      // 기본 그룹이 없는 경우 생성 또는 확인
      let defaultGroupExists = groupsData.some(g => g.key === DEFAULT_GROUP_KEY);
      if (!defaultGroupExists) {
          const defaultGroupData = {
              key: DEFAULT_GROUP_KEY,
              name: '기본 그룹',
              color: '#8c8c8c',
              description: '그룹이 지정되지 않은 사용자 또는 삭제된 그룹의 사용자',
              isDefault: true
          };
          try {
              const defaultGroupRef = doc(db, 'calorieGroups', DEFAULT_GROUP_KEY);
              await setDoc(defaultGroupRef, defaultGroupData, { merge: true });
              groupsData.push({ ...defaultGroupData, id: DEFAULT_GROUP_KEY });
              message.info('기본 그룹이 생성되었습니다.');
          } catch(error) {
              console.error("기본 그룹 확인/생성 실패:", error);
          }
      }

      setGroups(groupsData);
      return groupsData;
    } catch (error) {
      console.error('그룹 정보 가져오기 실패:', error);
      message.error('그룹 정보를 불러오는데 실패했습니다.');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // 사용자 정보 가져오기 (그룹 정보 로딩 후 실행되도록 수정)
  const fetchUsers = useCallback(async (loadedGroups) => {
    setLoading(true);
    try {
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      const usersData = [];

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        // 그룹 키 확인 및 기본값 설정
        let userGroupKey = userData.experimentGroup || DEFAULT_GROUP_KEY;
        
        // 로드된 그룹 목록에 해당 그룹 키가 존재하는지 확인
        const groupExists = loadedGroups.some(g => g.key === userGroupKey);
        if (!groupExists) {
            userGroupKey = DEFAULT_GROUP_KEY; // 존재하지 않으면 기본 그룹으로 설정
            // 필요하다면 사용자 문서의 experimentGroup 필드 업데이트
            try {
              await updateDoc(doc(db, 'users', userDoc.id), { experimentGroup: DEFAULT_GROUP_KEY });
            } catch (updateError) {
              console.error(`사용자 ${userDoc.id}의 그룹 업데이트 실패:`, updateError);
            }
        }

        const calorieBias = userData.calorieBias !== undefined ? userData.calorieBias : 0;

        // 사용자의 최근 식사 기록 가져오기 - foodsSnapshot 정의를 사용 전에 위치
        const foodsCollection = collection(db, `users/${userDoc.id}/foods`);
        const q = query(foodsCollection); // 필요시 order By 등으로 정렬 추가 가능
        const foodsSnapshot = await getDocs(q); // Firestore에서 데이터 가져오기
        
        let lastMealData = null;
        let totalMeals = 0;
        
        // foodsSnapshot 정의 후 사용
        if (!foodsSnapshot.empty) {
          totalMeals = foodsSnapshot.size;
          
          // 최근 식사 기록 찾기 (날짜 비교 로직 개선)
          let lastMealDoc = null;
          let lastMealDate = null; // Date 객체 또는 null로 관리

          for (const foodDoc of foodsSnapshot.docs) {
            const foodData = foodDoc.data();
            // Firestore Timestamp를 JavaScript Date 객체로 변환 (존재 여부 및 유효성 체크)
            const foodDate = foodData.date?.toDate ? foodData.date.toDate() : null;

            if (foodDate instanceof Date) { // 유효한 Date 객체일 경우에만 비교
                const lastMealDateObj = lastMealDate instanceof Date ? lastMealDate : null;

                if (!lastMealDateObj || foodDate > lastMealDateObj) {
                    lastMealDate = foodDate; // Date 객체로 저장
                    lastMealDoc = foodDoc;
                }
            } else {
                 // 날짜 데이터가 없거나 유효하지 않은 경우 로그 (필요 시)
                 // console.warn(`사용자 ${userDoc.id}의 식사 기록(${foodDoc.id})에 유효한 날짜 없음`);
            }
          }
          
          if (lastMealDoc) {
            const mealData = lastMealDoc.data();
            
            // 아침, 점심, 저녁 중 기록된 식사 찾기
            const mealTypes = ['breakfast', 'lunch', 'dinner'];
            let lastRecordedMeal = null;

            // 날짜 표시 형식 변경 (Timestamp -> 로컬 날짜 문자열)
            const mealDateString = lastMealDate ? lastMealDate.toLocaleDateString() : (mealData.date?.toDate ? mealData.date.toDate().toLocaleDateString() : '날짜 없음');

            for (const mealType of mealTypes) {
              if (mealData[mealType] && mealData[mealType].estimatedCalories !== null && mealData[mealType].actualCalories !== null) {
                lastRecordedMeal = {
                  type: mealType,
                  date: mealDateString, // 변환된 날짜 문자열 사용
                  estimated: mealData[mealType].estimatedCalories,
                  actual: mealData[mealType].actualCalories,
                  difference: mealData[mealType].actualCalories - mealData[mealType].estimatedCalories,
                  adjusted: mealData[mealType].adjustedDifference, // 조정된 차이값 (있으면)
                  foods: mealData[mealType].foods || []
                };
                 // 한 문서에서 가장 최근 식사 타입 하나만 찾으면 중단 (가정에 따라 로직 변경 가능)
                break; 
              }
            }
            
            if (lastRecordedMeal) {
              lastMealData = lastRecordedMeal;
            }
          }
        }

        usersData.push({
          key: userDoc.id, // Firestore 문서 ID를 key로 사용
          email: userData.email || '이메일 없음',
          name: userData.name || '이름 없음',
          age: userData.age || '-',
          gender: userData.gender === 'male' ? '남성' : userData.gender === 'female' ? '여성' : '정보 없음',
          height: userData.height || '-',
          weight: userData.weight || '-',
          goal: userData.goal || '-',
          group: userGroupKey, // 그룹 키 저장
          calorieBias: calorieBias,
          lastMeal: lastMealData, // 계산된 최근 식사 정보
          totalMeals: totalMeals // 총 식사 기록 수
        });
      }

      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (error) {
      console.error('사용자 정보 가져오기 실패:', error); // 에러 로깅
      message.error('사용자 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []); // 의존성 배열 비움, fetchGroups가 반환한 값을 사용

  // 데이터 로딩 통합
  const loadData = useCallback(async () => {
    setLoading(true);
    const loadedGroups = await fetchGroups();
    if (loadedGroups.length > 0) {
        await fetchUsers(loadedGroups);
    } else {
        message.error("그룹 정보를 불러올 수 없어 사용자 정보를 로드하지 못했습니다.");
        setLoading(false);
    }
  }, [fetchGroups, fetchUsers]);

  // 최초 데이터 로드
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 검색어에 따른 필터링
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // 그룹별 필터링
  const filterByGroup = (groupKey) => {
    setSelectedGroupKey(groupKey);
    if (groupKey === 'all') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => user.group === groupKey);
      setFilteredUsers(filtered);
    }
  };

  // 그룹 생성/수정 모달 열기
  const handleOpenGroupEditModal = (group = null) => {
      setEditingGroup(group);
      groupEditForm.setFieldsValue(
          group ? { ...group, color: group.color || '#1677ff' } : { name: '', description: '', color: '#1677ff' }
      );
      setIsGroupEditModalVisible(true);
  };

  // 그룹 생성/수정 처리
  const handleSaveGroup = async (values) => {
      const groupData = {
          name: values.name,
          description: values.description,
          color: typeof values.color === 'object' ? values.color.toHexString() : values.color,
      };

      try {
          setLoading(true);
          if (editingGroup) {
              if (editingGroup.isDefault) {
                   message.warn('기본 그룹은 수정할 수 없습니다.');
                   return;
              }
              const groupRef = doc(db, 'calorieGroups', editingGroup.id);
              await updateDoc(groupRef, groupData);
              message.success('그룹 정보가 수정되었습니다.');
          } else {
              const docRef = await addDoc(collection(db, 'calorieGroups'), {
                  ...groupData,
                  key: `group_${Date.now()}`
              });
              message.success('새 그룹이 생성되었습니다.');
          }
          setIsGroupEditModalVisible(false);
          setEditingGroup(null);
          await fetchGroups();
      } catch (error) {
          console.error('그룹 저장 실패:', error);
          message.error('그룹 저장에 실패했습니다.');
      } finally {
          setLoading(false);
      }
  };

  // 그룹 삭제 처리
  const handleDeleteGroup = (group) => {
      if (group.isDefault || group.key === DEFAULT_GROUP_KEY) {
          message.warn('기본 그룹은 삭제할 수 없습니다.');
          return;
      }

      confirm({
          title: `${group.name} 그룹 삭제`,
          icon: <ExclamationCircleOutlined />,
          content: `정말로 '${group.name}' 그룹을 삭제하시겠습니까? 이 그룹에 속한 사용자들은 '${groups.find(g => g.key === DEFAULT_GROUP_KEY)?.name || '기본'}' 그룹으로 이동됩니다.`,
          okText: '삭제',
          okType: 'danger',
          cancelText: '취소',
          onOk: async () => {
              try {
                  setLoading(true);
                  const usersInGroupQuery = query(collection(db, 'users'), where('experimentGroup', '==', group.key));
                  const usersSnapshot = await getDocs(usersInGroupQuery);

                  const batch = [];
                  usersSnapshot.forEach(userDoc => {
                      const userRef = doc(db, 'users', userDoc.id);
                      batch.push(updateDoc(userRef, { experimentGroup: DEFAULT_GROUP_KEY }));
                  });
                  await Promise.all(batch);

                  const groupRef = doc(db, 'calorieGroups', group.id);
                  await deleteDoc(groupRef);

                  message.success(`'${group.name}' 그룹이 삭제되었습니다.`);
                  await loadData();
              } catch (error) {
                  console.error('그룹 삭제 실패:', error);
                  message.error('그룹 삭제에 실패했습니다.');
              } finally {
                  setLoading(false);
              }
          },
      });
  };

  // 사용자 편집 모달
  const handleEditUser = (user) => {
    setCurrentUser(user);
    form.setFieldsValue({
      group: user.group,
      calorieBias: user.calorieBias
    });
    setIsUserModalVisible(true);
  };

  // 사용자 설정 저장
  const handleSaveUserSettings = async (values) => {
    if (!currentUser) return;
    try {
      const userRef = doc(db, 'users', currentUser.key);
      await updateDoc(userRef, {
        experimentGroup: values.group,
        calorieBias: values.calorieBias
      });

      message.success('사용자 설정이 업데이트되었습니다.');
      setIsUserModalVisible(false);
      await loadData();

    } catch (error) {
      console.error('사용자 설정 업데이트 실패:', error);
      message.error('사용자 설정 업데이트에 실패했습니다.');
    }
  };

  // 그룹 설정 모달
  const handleOpenGroupSettingsModal = (groupKey) => {
    const group = groups.find(g => g.key === groupKey);
    if (!group) return;
    
    setSelectedGroupKey(groupKey);
    
    const groupUser = users.find(u => u.group === groupKey);
    const defaultCalorieBias = groupUser ? groupUser.calorieBias : 0;
    
    groupSettingsForm.setFieldsValue({
      calorieBias: defaultCalorieBias
    });
    
    setIsGroupSettingsModalVisible(true);
  };

  // 그룹 설정 저장
  const handleSaveGroupSettings = async (values) => {
    if (!selectedGroupKey) return;
    try {
      setLoading(true);
      const groupUsers = users.filter(user => user.group === selectedGroupKey);
      const batch = [];
      
      for (const groupUser of groupUsers) {
        const userRef = doc(db, 'users', groupUser.key);
        batch.push(updateDoc(userRef, { calorieBias: values.calorieBias }));
      }
      await Promise.all(batch);
      
      message.success(`${groups.find(g => g.key === selectedGroupKey)?.name || selectedGroupKey} 그룹의 칼로리 편차가 업데이트되었습니다.`);
      setIsGroupSettingsModalVisible(false);
      await loadData();
      
    } catch (error) {
      console.error('그룹 칼로리 편차 설정 업데이트 실패:', error);
      message.error('그룹 칼로리 편차 설정 업데이트에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 개별 식사 캘로리 편차 업데이트 - 지정된 값으로 조정
  const applyCalorieBias = async (userId) => {
    try {
      setLoading(true);
      const userInfo = users.find(u => u.key === userId);
      if (!userInfo) {
        message.error("사용자 정보를 찾을 수 없습니다.");
        return;
      }
      
      const calorieBias = userInfo.calorieBias;
      const foodsCollection = collection(db, `users/${userId}/foods`);
      const foodsSnapshot = await getDocs(foodsCollection);
      let updatedCount = 0;
      const batch = [];

      for (const foodDoc of foodsSnapshot.docs) {
        const foodData = { ...foodDoc.data() };
        let updated = false;
        const mealTypes = ['breakfast', 'lunch', 'dinner'];

        for (const mealType of mealTypes) {
          if (foodData[mealType] && foodData[mealType].estimatedCalories !== null && foodData[mealType].actualCalories !== null) {
            const originalDifference = foodData[mealType].actualCalories - foodData[mealType].estimatedCalories;
            const newAdjustedDifference = originalDifference + calorieBias;
            if (foodData[mealType].adjustedDifference !== newAdjustedDifference) {
                 foodData[mealType].adjustedDifference = newAdjustedDifference;
                 updated = true;
            }
          }
        }
        
        if (updated) {
          updatedCount++;
          batch.push(updateDoc(doc(db, `users/${userId}/foods`, foodDoc.id), foodData));
        }
      }

      if (batch.length > 0) {
          await Promise.all(batch);
          message.success(`${userInfo.name || userInfo.email}님의 ${updatedCount}개 식사 기록에 칼로리 편차가 적용/업데이트되었습니다.`);
          await loadData();
      } else {
          message.info('업데이트할 식사 기록이 없습니다.');
      }
      
    } catch (error) {
      console.error('개별 칼로리 편차 적용 실패:', error);
      message.error('개별 칼로리 편차 적용에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 그룹 전체 칼로리 편차 업데이트
  const applyGroupCalorieBias = async (groupKey) => {
    try {
      setLoading(true);
      const groupUsers = users.filter(user => user.group === groupKey);
      if (groupUsers.length === 0) {
        message.info('해당 그룹에 사용자가 없습니다.');
        setLoading(false);
        return;
      }
      
      let totalUpdatedMeals = 0;
      let updatedUserCount = 0;
      const groupApplyPromises = [];

      for (const groupUser of groupUsers) {
          const userId = groupUser.key;
          const calorieBias = groupUser.calorieBias;
          
          const applyUserBias = async () => {
              const foodsCollection = collection(db, `users/${userId}/foods`);
              const foodsSnapshot = await getDocs(foodsCollection);
              let userUpdatedCount = 0;
              const batch = [];

              for (const foodDoc of foodsSnapshot.docs) {
                  const foodData = { ...foodDoc.data() };
                  let updated = false;
                  const mealTypes = ['breakfast', 'lunch', 'dinner'];

                  for (const mealType of mealTypes) {
                      if (foodData[mealType] && foodData[mealType].estimatedCalories !== null && foodData[mealType].actualCalories !== null) {
                          const originalDifference = foodData[mealType].actualCalories - foodData[mealType].estimatedCalories;
                          const newAdjustedDifference = originalDifference + calorieBias;
                          if (foodData[mealType].adjustedDifference !== newAdjustedDifference) {
                              foodData[mealType].adjustedDifference = newAdjustedDifference;
                              updated = true;
                          }
                      }
                  }
                  if (updated) {
                      userUpdatedCount++;
                      batch.push(updateDoc(doc(db, `users/${userId}/foods`, foodDoc.id), foodData));
                  }
              }
              if (batch.length > 0) {
                  await Promise.all(batch);
                  return userUpdatedCount;
              }
              return 0;
          };
          groupApplyPromises.push(applyUserBias());
      }

      const results = await Promise.all(groupApplyPromises);
      totalUpdatedMeals = results.reduce((sum, count) => sum + count, 0);
      updatedUserCount = results.filter(count => count > 0).length;

      const groupName = groups.find(g => g.key === groupKey)?.name || groupKey;
      if (totalUpdatedMeals > 0) {
          message.success(`${groupName} 내 ${updatedUserCount}명 사용자의 총 ${totalUpdatedMeals}개 식사 기록에 칼로리 편차가 적용/업데이트되었습니다.`);
          await loadData();
      } else {
          message.info(`${groupName} 그룹 내 업데이트할 식사 기록이 없습니다.`);
      }

    } catch (error) {
      console.error('그룹 칼로리 편차 적용 실패:', error);
      message.error('그룹 칼로리 편차 적용에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 그룹 정보를 표시하는 카드 컴포넌트
  const GroupCard = ({ group }) => {
    const groupUsers = users.filter(user => user.group === group.key);
    const averageBias = groupUsers.length > 0
      ? Math.round(groupUsers.reduce((sum, user) => sum + user.calorieBias, 0) / groupUsers.length)
      : 0;
    
    const currentGroup = groups.find(g => g.key === group.key);

    return (
      <Card
        title={
          <Space>
            <Tag color={currentGroup?.color || 'default'}>{currentGroup?.name || '이름 없음'}</Tag>
            <Text style={{ fontSize: '14px' }}>{currentGroup?.description || '설명 없음'}</Text>
            {currentGroup?.isDefault && <Tag>기본</Tag>}
          </Space>
        }
        extra={
          <Space>
             {!currentGroup?.isDefault && (
                 <>
                     <Button
                         icon={<EditOutlined />}
                         size="small"
                         onClick={() => handleOpenGroupEditModal(currentGroup)}
                     >
                         정보 수정
                     </Button>
                     <Button
                         danger
                         icon={<DeleteOutlined />}
                         size="small"
                         onClick={() => handleDeleteGroup(currentGroup)}
                     >
                         그룹 삭제
                     </Button>
                     <Divider type="vertical" />
                 </>
             )}
            <Button
              type="primary"
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleOpenGroupSettingsModal(group.key)}
            >
              편차 설정
            </Button>
            <Button
              type="default"
              icon={<SyncOutlined />}
              size="small"
              onClick={() => {
                confirm({
                  title: `${currentGroup?.name} 칼로리 편차 적용`,
                  icon: <ExclamationCircleOutlined />,
                  content: `${currentGroup?.name}의 모든 사용자(${groupUsers.length}명)에게 현재 설정된 개별 칼로리 편차를 적용하시겠습니까?`,
                  onOk() {
                    applyGroupCalorieBias(group.key);
                  }
                });
              }}
            >
              편차 적용
            </Button>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Row gutter={[16, 16]}>
          <Col span={isMobile ? 24 : 8}>
            <Statistic title="사용자 수" value={groupUsers.length} suffix="명" />
          </Col>
          <Col span={isMobile ? 24 : 8}>
            <Statistic title="평균 칼로리 편차" value={averageBias} suffix="kcal" />
          </Col>
          <Col span={isMobile ? 24 : 8}>
            <Space wrap>
              {groupUsers.slice(0, 5).map(user => (
                <Tooltip key={user.key} title={`${user.name} (${user.email})`}>
                  <Tag color={currentGroup?.color || 'default'}>
                    {user.name || user.email.split('@')[0]} ({user.calorieBias > 0 ? '+' : ''}{user.calorieBias})
                  </Tag>
                 </Tooltip>
              ))}
              {groupUsers.length > 5 && <Tag>+{groupUsers.length - 5}명...</Tag>}
            </Space>
          </Col>
        </Row>
      </Card>
    );
  };

  // 통계 컴포넌트
  const Statistic = ({ title, value, suffix = '', prefix = '' }) => (
    <div>
      <Text type="secondary" style={{ fontSize: '14px' }}>{title}</Text>
      <div style={{ marginTop: 4 }}>
        <Text strong style={{ fontSize: '24px' }}>
          {prefix}{value}{suffix}
        </Text>
      </div>
    </div>
  );

  // 데스크톱용 사용자 테이블 컬럼
  const desktopUserColumns = [
    {
      title: '이름',
      dataIndex: 'name',
      key: 'name',
      width: 120,
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.email}</Text>
        </div>
      ),
    },
    {
      title: '정보',
      key: 'info',
      width: 150,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>{record.gender} / {record.age}세</Text>
          <Text>키: {record.height}cm / 몸무게: {record.weight}kg</Text>
          <Text>목표: {record.goal}</Text>
        </Space>
      ),
    },
    {
      title: '그룹',
      dataIndex: 'group',
      key: 'group',
      width: 120,
      render: (groupKey) => {
        const group = groups.find(g => g.key === groupKey);
        return (
          <Tag color={group?.color || 'default'}>
            {group?.name || groupKey}
          </Tag>
        );
      },
      filters: groups.map(g => ({ text: g.name, value: g.key })),
      onFilter: (value, record) => record.group === value,
    },
    {
      title: '칼로리 편차 조정값',
      dataIndex: 'calorieBias',
      key: 'calorieBias',
      width: 150,
      render: (value) => (
        <Text style={{ color: value > 0 ? '#ff4d4f' : value < 0 ? '#1677ff' : 'inherit' }}>
          {value > 0 ? '+' : ''}{value} kcal
        </Text>
      ),
      sorter: (a, b) => a.calorieBias - b.calorieBias,
    },
    {
      title: '최근 식사 기록',
      key: 'lastMeal',
      width: 200,
      render: (_, record) => {
        if (!record.lastMeal) return <Text type="secondary">기록 없음</Text>;
        
        const mealType = record.lastMeal.type === 'breakfast' ? '아침' : 
                         record.lastMeal.type === 'lunch' ? '점심' : '저녁';
        const difference = record.lastMeal.difference;
        const adjusted = record.lastMeal.adjusted;
        
        return (
          <Space direction="vertical" size={0}>
            <Text>{record.lastMeal.date} {mealType}</Text>
            <Text>
              예상: {record.lastMeal.estimated}kcal / 
              실제: {record.lastMeal.actual}kcal
            </Text>
            <Space>
              <Tooltip title="실제 - 예상">
                  <Text style={{ 
                    color: difference > 0 ? '#ff4d4f' : difference < 0 ? '#1677ff' : 'inherit'
                  }}>
                    ({difference > 0 ? '+' : ''}{difference}kcal)
                  </Text>
              </Tooltip>
              {adjusted !== undefined && (
                <Tooltip title="조정된 편차 적용 후 차이">
                  <Text style={{ 
                    color: adjusted > 0 ? '#ff4d4f' : adjusted < 0 ? '#1677ff' : 'inherit',
                    fontWeight: 'bold'
                  }}>
                    → {adjusted > 0 ? '+' : ''}{adjusted}kcal
                  </Text>
                 </Tooltip>
              )}
            </Space>
          </Space>
        );
      },
    },
    {
      title: '작업',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button type="primary" size="small" onClick={() => handleEditUser(record)}>
            설정
          </Button>
          <Button
            size="small"
            icon={<SyncOutlined />}
            onClick={() => {
              confirm({
                title: '개별 칼로리 편차 적용',
                icon: <ExclamationCircleOutlined />,
                content: `${record.name || record.email}님의 모든 식사 기록에 현재 설정된 칼로리 편차 (${record.calorieBias > 0 ? '+' : ''}${record.calorieBias}kcal)를 적용하시겠습니까?`,
                onOk() {
                  applyCalorieBias(record.key);
                }
              });
            }}
          >
            적용
          </Button>
        </Space>
      ),
    },
  ];

  // 모바일용 사용자 테이블 컬럼
  const mobileUserColumns = [
    {
      title: '사용자',
      key: 'user',
      render: (_, record) => {
        const group = groups.find(g => g.key === record.group);
        return (
            <div>
              <Space align="center">
                <UserOutlined />
                <Text strong>{record.name}</Text>
              </Space>
              <div style={{ marginTop: 4 }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>{record.email}</Text>
              </div>
              <div style={{ marginTop: 8 }}>
                <Tag color={group?.color || 'default'}>
                  {group?.name || record.group}
                </Tag>
                <Tooltip title="칼로리 편차 조정값">
                  <Text style={{
                    color: record.calorieBias > 0 ? '#ff4d4f' : record.calorieBias < 0 ? '#1677ff' : 'inherit',
                    marginLeft: 8
                  }}>
                    ({record.calorieBias > 0 ? '+' : ''}{record.calorieBias} kcal)
                  </Text>
                 </Tooltip>
              </div>
            </div>
        );
      },
    },
    {
      title: '작업',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button type="primary" size="small" block onClick={() => handleEditUser(record)}>
            설정
          </Button>
          <Button
            size="small"
            block
            icon={<SyncOutlined />}
            onClick={() => {
              confirm({
                title: '개별 칼로리 편차 적용',
                icon: <ExclamationCircleOutlined />,
                content: `${record.name || record.email}님의 모든 식사 기록에 칼로리 편차를 적용하시겠습니까?`,
                onOk() {
                  applyCalorieBias(record.key);
                }
              });
            }}
          >
            적용
          </Button>
        </Space>
      ),
    }
  ];

  return (
    <div style={{ padding: isMobile ? '10px' : '20px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Title level={isMobile ? 3 : 2} style={{ color: '#5FDD9D' }}>
          칼로리 편차 관리자 페이지
        </Title>
        <Button onClick={loadData} icon={<SyncOutlined />} loading={loading}>
          새로고침
        </Button>
      </Row>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane
          tab={<span><UsergroupAddOutlined />사용자 그룹 관리</span>}
          key="groups"
        >
          <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: '16px' }}>
              사용자 그룹을 관리하고 그룹별 칼로리 편차를 설정/적용합니다.
            </Text>
            <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => handleOpenGroupEditModal()}
            >
                새 그룹 생성
            </Button>
          </Row>

          {loading && <p>그룹 정보 로딩 중...</p>}
          {!loading && groups.length > 0 ? groups
             .sort((a, b) => a.isDefault ? -1 : b.isDefault ? 1 : a.name.localeCompare(b.name))
             .map(group => (
                 <GroupCard key={group.key} group={group} />
          )) : !loading && <p>생성된 그룹이 없습니다.</p>}
        </TabPane>

        <TabPane
          tab={<span><UserOutlined />개별 사용자 관리</span>}
          key="users"
        >
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col span={isMobile ? 24 : 12}>
              <Search
                placeholder="이메일 또는 이름으로 검색"
                value={searchTerm}
                onChange={handleSearchChange}
                allowClear
                style={{ width: '100%' }}
              />
            </Col>
            <Col span={isMobile ? 24 : 12}>
              <Select
                style={{ width: '100%' }}
                placeholder="그룹으로 필터링"
                onChange={filterByGroup}
                value={selectedGroupKey || 'all'}
                allowClear
                onClear={() => filterByGroup('all')}
              >
                <Option value="all">모든 그룹</Option>
                {groups
                    .sort((a, b) => a.isDefault ? -1 : b.isDefault ? 1 : a.name.localeCompare(b.name))
                    .map(group => (
                        <Option key={group.key} value={group.key}>
                           <Tag color={group.color} style={{ marginRight: 5 }} /> {group.name}
                        </Option>
                 ))}
              </Select>
            </Col>
          </Row>

          <Table
            columns={isMobile ? mobileUserColumns : desktopUserColumns}
            dataSource={filteredUsers}
            rowKey="key"
            loading={loading}
            scroll={{ x: isMobile ? '100%' : 1200 }}
            pagination={{ pageSize: isMobile ? 10 : 15, showSizeChanger: true }}
            size={isMobile ? "small" : "middle"}
            bordered
          />
        </TabPane>
      </Tabs>

      {/* 사용자 설정 모달 */}
      <Modal
        title={<Text style={{ fontSize: '18px', fontWeight: '600' }}>사용자 설정</Text>}
        visible={isUserModalVisible}
        onCancel={() => setIsUserModalVisible(false)}
        footer={null}
        width={isMobile ? '95%' : 520}
        destroyOnClose
      >
        {currentUser && (
          <Form
            form={form}
            onFinish={handleSaveUserSettings}
            layout="vertical"
            initialValues={{ group: currentUser.group, calorieBias: currentUser.calorieBias }}
          >
            <div style={{ marginBottom: 16 }}>
              <Text strong>{currentUser.name}</Text>
              <br />
              <Text type="secondary">{currentUser.email}</Text>
            </div>

            <Form.Item
              name="group"
              label="사용자 그룹"
              rules={[{ required: true, message: '그룹을 선택하세요.' }]}
            >
              <Select style={{ width: '100%' }}>
                {groups
                    .sort((a, b) => a.isDefault ? -1 : b.isDefault ? 1 : a.name.localeCompare(b.name))
                    .map(group => (
                       <Option key={group.key} value={group.key}>
                           <Tag color={group.color} style={{ marginRight: 5 }} />
                           {group.name} {group.isDefault ? '(기본)' : ''}
                       </Option>
                 ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="calorieBias"
              label={
                <span>
                  칼로리 편차 조정값 (kcal)
                  <Tooltip title="사용자에게 개별적으로 적용될 칼로리 편차 값입니다. 그룹 설정과 별개로 적용됩니다.">
                    <ExclamationCircleOutlined style={{ marginLeft: 8 }} />
                  </Tooltip>
                </span>
              }
              rules={[{ required: true, message: '칼로리 편차 조정값을 입력하세요.' }]}
            >
              <InputNumber min={-1000} max={1000} style={{ width: '100%' }} />
            </Form.Item>

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={() => setIsUserModalVisible(false)} style={{ marginRight: 8 }}>
                취소
              </Button>
              <Button type="primary" htmlType="submit">
                저장
              </Button>
            </div>
          </Form>
        )}
      </Modal>

      {/* 그룹 칼로리 편차 설정 모달 */}
       <Modal
           title={<Text style={{ fontSize: '18px', fontWeight: '600' }}>그룹 칼로리 편차 일괄 설정</Text>}
           visible={isGroupSettingsModalVisible}
           onCancel={() => setIsGroupSettingsModalVisible(false)}
           footer={null}
           width={isMobile ? '95%' : 520}
           destroyOnClose
       >
           {selectedGroupKey && (
               <Form
                   form={groupSettingsForm}
                   onFinish={handleSaveGroupSettings}
                   layout="vertical"
               >
                   <div style={{ marginBottom: 16 }}>
                        {(() => {
                            const group = groups.find(g => g.key === selectedGroupKey);
                            return group ? (
                                <>
                                    <Tag color={group.color || 'default'}>
                                        {group.name || selectedGroupKey}
                                    </Tag>
                                    <Text style={{ marginLeft: 8 }}>
                                        {group.description || ''}
                                    </Text>
                                </>
                            ) : <Text>그룹 정보를 불러오는 중...</Text>;
                        })()}
                   </div>
                   <p>
                       <Text type="secondary">
                           이 설정은 현재 '{groups.find(g => g.key === selectedGroupKey)?.name || selectedGroupKey}' 그룹에 속한 모든 사용자(<Text strong>{users.filter(u => u.group === selectedGroupKey).length}명</Text>)의 '칼로리 편차 조정값'을 일괄적으로 변경합니다.
                       </Text>
                   </p>

                   <Form.Item
                       name="calorieBias"
                       label={
                           <span>
                               일괄 적용할 칼로리 편차 조정값 (kcal)
                               <Tooltip title="그룹 내 모든 사용자에게 동일하게 적용될 편차 값입니다. 개별 사용자 설정이 이 값으로 덮어쓰여집니다.">
                                   <ExclamationCircleOutlined style={{ marginLeft: 8 }} />
                               </Tooltip>
                           </span>
                       }
                       rules={[{ required: true, message: '칼로리 편차 조정값을 입력하세요.' }]}
                   >
                       <InputNumber min={-1000} max={1000} style={{ width: '100%' }} />
                   </Form.Item>

                   <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                       <Button onClick={() => setIsGroupSettingsModalVisible(false)} style={{ marginRight: 8 }}>
                           취소
                       </Button>
                       <Button type="primary" htmlType="submit">
                           일괄 저장
                       </Button>
                   </div>
               </Form>
           )}
       </Modal>

       {/* 그룹 정보 생성/수정 모달 */}
        <Modal
            title={
                <Text style={{ fontSize: '18px', fontWeight: '600' }}>
                    {editingGroup ? '그룹 정보 수정' : '새 그룹 생성'}
                </Text>
            }
            visible={isGroupEditModalVisible}
            onCancel={() => {
                setIsGroupEditModalVisible(false);
                setEditingGroup(null);
            }}
            footer={null}
            width={isMobile ? '95%' : 520}
            destroyOnClose
        >
            <Form
                form={groupEditForm}
                layout="vertical"
                onFinish={handleSaveGroup}
                initialValues={editingGroup ? { ...editingGroup, color: editingGroup.color || '#1677ff' } : { name: '', description: '', color: '#1677ff' }}
            >
                <Form.Item
                    name="name"
                    label="그룹 이름"
                    rules={[{ required: true, message: '그룹 이름을 입력하세요.' }]}
                >
                    <Input placeholder="예: 그룹 A, 실험군 1" disabled={editingGroup?.isDefault}/>
                </Form.Item>
                <Form.Item
                    name="description"
                    label="그룹 설명"
                    rules={[{ required: true, message: '그룹 설명을 입력하세요.' }]}
                >
                    <Input.TextArea placeholder="예: 기준 -300kcal 편차 적용" disabled={editingGroup?.isDefault}/>
                </Form.Item>
                <Form.Item
                    name="color"
                    label="그룹 색상"
                    rules={[{ required: true, message: '그룹 색상을 선택하세요.' }]}
                >
                    <ColorPicker showText disabled={editingGroup?.isDefault}/>
                </Form.Item>

                {editingGroup?.isDefault && <p><Text type="warning">기본 그룹의 정보는 수정할 수 없습니다.</Text></p>}

                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button onClick={() => { setIsGroupEditModalVisible(false); setEditingGroup(null); }} style={{ marginRight: 8 }}>
                        취소
                    </Button>
                    <Button type="primary" htmlType="submit" disabled={editingGroup?.isDefault}>
                        {editingGroup ? '수정 완료' : '생성 완료'}
                    </Button>
                </div>
            </Form>
        </Modal>

    </div>
  );
};

export default CalorieAdminPage; 