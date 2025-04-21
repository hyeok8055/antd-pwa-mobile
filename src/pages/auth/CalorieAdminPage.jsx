import React, { useState, useEffect, useCallback } from "react";
import { Typography, Input, Row, Col, Button, Modal, Form, Table, InputNumber, message, Select, Card, Tabs, Tag, Space, Tooltip, Divider, Switch, ColorPicker, Transfer, Skeleton, Empty } from 'antd';
import { db } from '../../firebaseconfig';
import { collection, getDocs, doc, getDoc, updateDoc, setDoc, query, where, addDoc, deleteDoc, Timestamp, writeBatch } from 'firebase/firestore';
import { useSelector } from 'react-redux';
import { useNavigate } from "react-router-dom";
import { useMediaQuery } from 'react-responsive';
import { SyncOutlined, ExclamationCircleOutlined, UserOutlined, TeamOutlined, EditOutlined, SaveOutlined, UndoOutlined, PlusOutlined, DeleteOutlined, UserAddOutlined } from '@ant-design/icons';

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
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [activeTab, setActiveTab] = useState('groups');
  const [selectedGroupKey, setSelectedGroupKey] = useState(null);
  const [isGroupSettingsModalVisible, setIsGroupSettingsModalVisible] = useState(false);
  const [isGroupEditModalVisible, setIsGroupEditModalVisible] = useState(false);
  const [isUserModalVisible, setIsUserModalVisible] = useState(false);
  const [isAddUserModalVisible, setIsAddUserModalVisible] = useState(false);
  const [targetGroupForAddingUser, setTargetGroupForAddingUser] = useState(null);
  const [targetKeysForTransfer, setTargetKeysForTransfer] = useState([]);
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
    setLoadingGroups(true);
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
              // message.info('기본 그룹이 생성되었습니다.'); // 초기 로딩 시 불필요 메시지 제거
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
      setLoadingGroups(false);
    }
  }, []);

  // 사용자 정보 가져오기 (그룹 정보 로딩 후 실행되도록 수정)
  const fetchUsers = useCallback(async (loadedGroups) => {
    setLoadingUsers(true);
    try {
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      const usersDataPromises = usersSnapshot.docs.map(async (userDoc) => {
        const userData = userDoc.data();
        let userGroupKey = userData.experimentGroup || DEFAULT_GROUP_KEY;
        const groupExists = loadedGroups.some(g => g.key === userGroupKey);
        if (!groupExists) {
            userGroupKey = DEFAULT_GROUP_KEY;
            try {
              await updateDoc(doc(db, 'users', userDoc.id), { experimentGroup: DEFAULT_GROUP_KEY });
            } catch (updateError) {
              console.error(`사용자 ${userDoc.id}의 그룹 업데이트 실패:`, updateError);
            }
        }
        const calorieBias = userData.calorieBias !== undefined ? userData.calorieBias : 0;

        // --- 최근 2일 식사 데이터 및 편차 계산 --- 
        let lastMealData = null;
        let totalMeals = 0;
        let totalDifferenceSum = 0; // 편차 합계
        let mealCount = 0; // 편차 계산에 사용된 식사 수

        // 날짜 필터링: 오늘 날짜 기준 2일 전 자정
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        twoDaysAgo.setHours(0, 0, 0, 0); // 2일 전 00:00:00
        const twoDaysAgoTimestamp = Timestamp.fromDate(twoDaysAgo); // Firestore Timestamp로 변환

        const foodsCollection = collection(db, `users/${userDoc.id}/foods`);
        // date 필드가 Timestamp 타입이고, twoDaysAgoTimestamp 이후인 문서만 조회
        const q = query(foodsCollection, where("date", ">=", twoDaysAgoTimestamp));
        const foodsSnapshot = await getDocs(q);

        if (!foodsSnapshot.empty) {
          totalMeals = foodsSnapshot.size; // 최근 2일간의 식사 기록 수
          let lastMealDate = null; 

          for (const foodDoc of foodsSnapshot.docs) {
            const foodData = foodDoc.data();
            const foodDate = foodData.date?.toDate ? foodData.date.toDate() : null;
            const mealTypes = ['breakfast', 'lunch', 'dinner', 'snacks']; // 간식(snacks)도 포함 고려

            for (const mealType of mealTypes) {
                 if (foodData[mealType] && 
                     foodData[mealType].actualCalories !== null && foodData[mealType].actualCalories !== undefined &&
                     foodData[mealType].estimatedCalories !== null && foodData[mealType].estimatedCalories !== undefined) 
                 { 
                    const difference = foodData[mealType].actualCalories - foodData[mealType].estimatedCalories;
                    totalDifferenceSum += difference;
                    mealCount++;

                    // 마지막 식사 데이터 업데이트 로직 (기존과 유사하게 유지)
                    if (foodDate instanceof Date) { 
                        const currentLastMealDate = lastMealDate instanceof Date ? lastMealDate : null;
                        if (!currentLastMealDate || foodDate >= currentLastMealDate) { // 같은 날짜면 업데이트 되도록 >= 사용
                            lastMealDate = foodDate;
                            // 마지막 식사 정보 업데이트 (날짜, 타입, 칼로리 등)
                             lastMealData = {
                                type: mealType,
                                date: foodDate.toLocaleDateString(),
                                estimated: foodData[mealType].estimatedCalories,
                                actual: foodData[mealType].actualCalories,
                                // 원본 차이와 offset 값을 같이 저장 (표시용)
                                originalDifference: difference, 
                                offset: (typeof foodData[mealType].offset === 'number') ? foodData[mealType].offset : null,
                                foods: foodData[mealType].foods || []
                            };
                        }
                    }
                 }
            }
          }
        }
        // --- 계산 종료 ---

        return {
          key: userDoc.id,
          email: userData.email || '이메일 없음',
          name: userData.name || '이름 없음',
          age: userData.age || '-',
          gender: userData.gender === 'male' ? '남성' : userData.gender === 'female' ? '여성' : '정보 없음',
          height: userData.height || '-',
          weight: userData.weight || '-',
          goal: userData.goal || '-',
          group: userGroupKey,
          calorieBias: calorieBias, // 이건 사용자 설정값
          lastMeal: lastMealData,   // 최근 식사 정보 (최근 2일 기준)
          totalMeals: totalMeals,   // 최근 2일 식사 기록 수
          // 그룹 평균 편차 계산용 데이터
          totalDifferenceSum: totalDifferenceSum, 
          mealCount: mealCount,
        };
      });

      const usersData = await Promise.all(usersDataPromises);
      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (error) {
      console.error('사용자 정보 가져오기 실패:', error);
      message.error('사용자 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // 데이터 로딩 통합
  const loadData = useCallback(async () => {
    const groupsPromise = fetchGroups();
    const loadedGroups = await groupsPromise;
    if (loadedGroups.length > 0) {
        await fetchUsers(loadedGroups);
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
          setLoadingGroups(true);
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
      } finally { setLoadingGroups(false); }
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
                  setLoadingGroups(true);
                  const usersInGroupQuery = query(collection(db, 'users'), where('experimentGroup', '==', group.key));
                  const usersSnapshot = await getDocs(usersInGroupQuery);

                  const batch = writeBatch(db);
                  usersSnapshot.forEach(userDoc => {
                      const userRef = doc(db, 'users', userDoc.id);
                      batch.update(userRef, { experimentGroup: DEFAULT_GROUP_KEY });
                  });
                  await batch.commit();

                  const groupRef = doc(db, 'calorieGroups', group.id);
                  await deleteDoc(groupRef);
                  message.success(`'${group.name}' 그룹이 삭제되었습니다.`);
                  await loadData();
              } catch (error) {
                  console.error('그룹 삭제 실패:', error);
                  message.error('그룹 삭제에 실패했습니다.');
              } finally { setLoadingGroups(false); }
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
      setLoadingGroups(true);
      const groupUsers = users.filter(user => user.group === selectedGroupKey);
      const batch = writeBatch(db);
      for (const groupUser of groupUsers) {
        const userRef = doc(db, 'users', groupUser.key);
        batch.update(userRef, { calorieBias: values.calorieBias });
      }
      await batch.commit();
      
      message.success(`${groups.find(g => g.key === selectedGroupKey)?.name || selectedGroupKey} 그룹의 칼로리 편차가 업데이트되었습니다.`);
      setIsGroupSettingsModalVisible(false);
      await loadData();
    } catch (error) {
      console.error('그룹 칼로리 편차 설정 업데이트 실패:', error);
      message.error('그룹 칼로리 편차 설정 업데이트에 실패했습니다.');
    } finally { setLoadingGroups(false); }
  };

  // 사용자 추가 모달
  const handleOpenAddUserModal = (group) => {
    setTargetGroupForAddingUser(group);
    setTargetKeysForTransfer([]);
    setIsAddUserModalVisible(true);
  };

  // Transfer 데이터 소스 준비 (모든 사용자 중 현재 그룹 제외)
  const getTransferDataSource = () => {
    if (!targetGroupForAddingUser) return [];
    return users
      .filter(user => user.group !== targetGroupForAddingUser.key)
      .map(user => ({
        key: user.key, 
        title: `${user.name} (${user.email})`, 
        description: `현재 그룹: ${groups.find(g => g.key === user.group)?.name || user.group}`
      }));
  };

  // Transfer 선택 변경 핸들러
  const handleTransferChange = (nextTargetKeys) => {
    setTargetKeysForTransfer(nextTargetKeys);
  };

  // 사용자를 그룹에 추가하는 로직
  const handleAddUsersToGroup = async () => {
    if (!targetGroupForAddingUser || targetKeysForTransfer.length === 0) {
        message.warning('추가할 사용자를 선택하세요.');
        return;
    }
    try {
        setLoadingGroups(true);
        const batch = writeBatch(db);
        targetKeysForTransfer.forEach(userKey => {
            const userRef = doc(db, 'users', userKey);
            batch.update(userRef, { experimentGroup: targetGroupForAddingUser.key });
        });
        await batch.commit();
        message.success(`${targetKeysForTransfer.length}명의 사용자가 '${targetGroupForAddingUser.name}' 그룹에 추가되었습니다.`);
        setIsAddUserModalVisible(false);
        setTargetGroupForAddingUser(null);
        await loadData();
    } catch (error) {
        console.error('그룹에 사용자 추가 실패:', error);
        message.error('그룹에 사용자를 추가하는 중 오류가 발생했습니다.');
    } finally {
        setLoadingGroups(false);
    }
  };

  // 그룹 정보를 표시하는 카드 컴포넌트
  const GroupCard = ({ group }) => {
    const groupUsers = users.filter(user => user.group === group.key);
    
    // 그룹 평균 칼로리 편차 계산 (실제 기록 기반)
    const totalDifferenceSum = groupUsers.reduce((sum, user) => sum + (user.totalDifferenceSum || 0), 0);
    const totalMealCount = groupUsers.reduce((sum, user) => sum + (user.mealCount || 0), 0);
    const averageBias = totalMealCount > 0 ? Math.round(totalDifferenceSum / totalMealCount) : 0;

    const currentGroup = groups.find(g => g.key === group.key);

    return (
      <Card
        title={
          <Space wrap>
            <Tag color={currentGroup?.color || 'default'}>{currentGroup?.name || '이름 없음'}</Tag>
            <Text style={{ fontSize: '14px' }}>{currentGroup?.description || '설명 없음'}</Text>
            {currentGroup?.isDefault && <Tag>기본</Tag>}
          </Space>
        }
        extra={
          <Space wrap size={isMobile ? 'small' : 'middle'}>
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
                     <Button
                         icon={<UserAddOutlined />}
                         size="small"
                         onClick={() => handleOpenAddUserModal(currentGroup)}
                     >
                         사용자 추가
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
                  content: `${currentGroup?.name}의 모든 사용자(${groupUsers.length}명)에게 각자 설정된 칼로리 편차(offset)를 모든 식사 기록에 적용/업데이트하시겠습니까?`,
                  onOk() { applyGroupCalorieBias(group.key); }
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
          <Col xs={24} sm={12} md={8}>
            <Statistic title="사용자 수" value={groupUsers.length} suffix="명" />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Statistic title="평균 칼로리 편차 (실제 기록 기준)" value={averageBias} suffix="kcal" />
          </Col>
          <Col xs={24} sm={24} md={8}>
            <Space wrap>
              {groupUsers.slice(0, isMobile ? 3 : 5).map(user => (
                <Tooltip key={user.key} title={`${user.name} (${user.email}) - 설정값: ${user.calorieBias > 0 ? '+' : ''}${user.calorieBias}kcal`}>
                  <Tag color={currentGroup?.color || 'default'}>
                    {user.name || user.email.split('@')[0]} ({user.calorieBias > 0 ? '+' : ''}{user.calorieBias})
                  </Tag>
                 </Tooltip>
              ))}
              {groupUsers.length > (isMobile ? 3 : 5) && <Tag>+{groupUsers.length - (isMobile ? 3 : 5)}명...</Tag>}
            </Space>
          </Col>
        </Row>
      </Card>
    );
  };

  // 통계 컴포넌트
  const Statistic = ({ title, value, suffix = '', prefix = '' }) => (
    <div style={{ marginBottom: isMobile ? 8 : 0 }}>
      <Text type="secondary" style={{ fontSize: '13px', display:'block' }}>{title}</Text>
      <Text strong style={{ fontSize: '22px', lineHeight: '1.2' }}>{prefix}{value}{suffix}</Text>
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
      title: '칼로리 편차 설정값',
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
      title: '최근 식사 기록 (최근 2일)',
      key: 'lastMeal',
      width: 200,
      render: (_, record) => {
        if (!record.lastMeal) return <Text type="secondary">기록 없음</Text>;
        
        const mealType = record.lastMeal.type === 'breakfast' ? '아침' : 
                         record.lastMeal.type === 'lunch' ? '점심' : 
                         record.lastMeal.type === 'dinner' ? '저녁' : '간식';
        const originalDifference = record.lastMeal.originalDifference;
        const offset = record.lastMeal.offset;
        const finalDifference = originalDifference + (offset ?? 0);
        
        return (
          <Space direction="vertical" size={0}>
            <Text>{record.lastMeal.date} {mealType}</Text>
            <Text>예상: {record.lastMeal.estimated} / 실제: {record.lastMeal.actual}</Text>
            <Space>
              <Tooltip title={`원본 차이 (실제 - 예상): ${originalDifference > 0 ? '+' : ''}${originalDifference}kcal`}>
                  <Text style={{ color: originalDifference > 0 ? '#ff4d4f' : originalDifference < 0 ? '#1677ff' : 'inherit' }}>
                    ({originalDifference > 0 ? '+' : ''}{originalDifference}kcal)
                  </Text>
              </Tooltip>
              {offset !== null && offset !== 0 && (
                <Tooltip title={`적용된 편차(offset): ${offset > 0 ? '+' : ''}${offset}kcal`}>
                  <Text strong style={{ color: finalDifference > 0 ? '#ff4d4f' : finalDifference < 0 ? '#1677ff' : 'inherit' }}>
                    → {finalDifference > 0 ? '+' : ''}{finalDifference}kcal
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
          <Button type="primary" size="small" onClick={() => handleEditUser(record)}>설정</Button>
          <Button
            size="small"
            icon={<SyncOutlined />}
            onClick={() => {
              confirm({
                title: '개별 칼로리 편차(offset) 적용',
                icon: <ExclamationCircleOutlined />,
                content: `${record.name || record.email}님의 모든 식사 기록에 현재 설정된 칼로리 편차 (${record.calorieBias > 0 ? '+' : ''}${record.calorieBias}kcal)를 offset값으로 적용하시겠습니까?`,
                onOk() { applyCalorieBias(record.key); }
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
                <Tooltip title="칼로리 편차 설정값">
                  <Text style={{
                    color: record.calorieBias > 0 ? '#ff4d4f' : record.calorieBias < 0 ? '#1677ff' : 'inherit',
                    marginLeft: 8
                  }}>
                    ({record.calorieBias > 0 ? '+' : ''}{record.calorieBias} kcal)
                  </Text>
                 </Tooltip>
              </div>
              {record.lastMeal && (
                <div style={{ marginTop: 8, fontSize: '12px', borderTop: '1px dashed #eee', paddingTop: 8 }}>
                    <Text type="secondary">최근 식사 ({record.lastMeal.date}): </Text>
                    {(() => {
                       const originalDifference = record.lastMeal.originalDifference;
                       const offset = record.lastMeal.offset;
                       const finalDifference = originalDifference + (offset ?? 0);
                       return (
                            <Tooltip title={`실제: ${record.lastMeal.actual}, 예상: ${record.lastMeal.estimated}, 편차(offset): ${offset ?? 0}`}>
                                <Text style={{ color: finalDifference > 0 ? '#ff4d4f' : finalDifference < 0 ? '#1677ff' : 'inherit' }}>
                                     {finalDifference > 0 ? '+' : ''}{finalDifference} kcal
                                </Text>
                            </Tooltip>
                       );
                    })()}
                </div>
              )}
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
          <Button type="primary" size="small" block onClick={() => handleEditUser(record)}>설정</Button>
          <Button
            size="small"
            block
            icon={<SyncOutlined />}
            onClick={() => {
              confirm({
                title: '개별 칼로리 편차(offset) 적용',
                icon: <ExclamationCircleOutlined />,
                content: `${record.name || record.email}님의 모든 식사 기록에 칼로리 편차(offset)를 적용하시겠습니까?`,
                onOk() { applyCalorieBias(record.key); }
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
    <div style={{ padding: isMobile ? '8px' : '20px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16, padding: isMobile ? '0 8px' : 0 }}>
        <Title level={isMobile ? 4 : 2} style={{ color: '#5FDD9D', margin: 0 }}>칼로리 편차 관리</Title>
        <Button onClick={loadData} icon={<SyncOutlined />} loading={loadingGroups || loadingUsers}>새로고침</Button>
      </Row>

      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab} 
        tabBarStyle={{ marginBottom: 16, ...(isMobile && { overflowX: 'auto', whiteSpace: 'nowrap' }) }}
      >
        <TabPane tab={<span><TeamOutlined /> 그룹 관리</span>} key="groups">
          <Row justify="space-between" align="middle" style={{ marginBottom: 16, padding: isMobile ? '0 8px' : 0 }}>
            <Text style={{ fontSize: isMobile ? '14px' : '16px' }}>그룹별 설정 및 편차 관리</Text>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenGroupEditModal()} size={isMobile ? 'small' : 'middle'}>새 그룹</Button>
          </Row>
          {loadingGroups ? (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Skeleton active paragraph={{ rows: 2 }} />
              <Skeleton active paragraph={{ rows: 2 }} />
            </Space>
          ) : groups.length > 1 ? (
             groups.filter(g => !g.isDefault).sort((a, b) => a.name.localeCompare(b.name)).map(group => (<GroupCard key={group.key} group={group} />))
          ) : (
            <Empty description="생성된 사용자 그룹이 없습니다." style={{ marginTop: 32, marginBottom: 32 }} >
              <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenGroupEditModal()}>새 그룹 생성</Button>
            </Empty>
          )}
          {!loadingGroups && groups.find(g => g.isDefault) && <GroupCard key={DEFAULT_GROUP_KEY} group={groups.find(g => g.isDefault)} />}
        </TabPane>

        <TabPane tab={<span><UserOutlined /> 개별 사용자</span>} key="users">
          <Row gutter={[8, 8]} style={{ marginBottom: 16, padding: isMobile ? '0 8px' : 0 }}>
            <Col xs={24} md={12}>
              <Search placeholder="이름 또는 이메일 검색" value={searchTerm} onChange={handleSearchChange} allowClear style={{ width: '100%' }} size={isMobile ? 'small' : 'middle'}/>
            </Col>
            <Col xs={24} md={12}>
              <Select style={{ width: '100%' }} placeholder="그룹 필터" onChange={filterByGroup} value={selectedGroupKey || 'all'} allowClear onClear={() => filterByGroup('all')} size={isMobile ? 'small' : 'middle'}>
                <Option value="all">모든 그룹</Option>
                {groups.sort((a, b) => a.isDefault ? -1 : b.isDefault ? 1 : a.name.localeCompare(b.name)).map(group => (
                    <Option key={group.key} value={group.key}><Tag color={group.color} style={{ marginRight: 3 }} /> {group.name}</Option>
                 ))}
              </Select>
            </Col>
          </Row>
          <Table 
            columns={isMobile ? mobileUserColumns : desktopUserColumns} 
            dataSource={filteredUsers} 
            rowKey="key" 
            loading={loadingUsers ? { indicator: <Skeleton active paragraph={{ rows: 5 }} /> } : false}
            scroll={{ x: isMobile ? '100%' : 1000 }}
            pagination={{ pageSize: isMobile ? 8 : 10, showSizeChanger: false, size: 'small' }}
            size={isMobile ? "small" : "middle"}
            locale={{ emptyText: <Empty description="표시할 사용자가 없습니다." /> }}
          />
        </TabPane>
      </Tabs>

      <Modal title={<Text style={{ fontSize: '16px', fontWeight: '600' }}>사용자 설정</Text>} open={isUserModalVisible} onCancel={() => setIsUserModalVisible(false)} footer={null} width={isMobile ? '90%' : 480} destroyOnClose>
        {currentUser && ( <Form form={form} onFinish={handleSaveUserSettings} layout="vertical" initialValues={{ group: currentUser.group, calorieBias: currentUser.calorieBias }}> ... (내용 유지) ... </Form> )}
      </Modal>

      <Modal title={<Text style={{ fontSize: '16px', fontWeight: '600' }}>그룹 편차 일괄 설정</Text>} open={isGroupSettingsModalVisible} onCancel={() => setIsGroupSettingsModalVisible(false)} footer={null} width={isMobile ? '90%' : 480} destroyOnClose>
         {selectedGroupKey && ( <Form form={groupSettingsForm} onFinish={handleSaveGroupSettings} layout="vertical"> ... (내용 유지) ... </Form> )}
      </Modal>
      
       <Modal title={<Text style={{ fontSize: '16px', fontWeight: '600' }}>{editingGroup ? '그룹 정보 수정' : '새 그룹 생성'}</Text>} open={isGroupEditModalVisible} onCancel={() => { setIsGroupEditModalVisible(false); setEditingGroup(null); }} footer={null} width={isMobile ? '90%' : 480} destroyOnClose>
           <Form form={groupEditForm} layout="vertical" onFinish={handleSaveGroup} initialValues={editingGroup ? { ...editingGroup, color: editingGroup.color || '#1677ff' } : { name: '', description: '', color: '#1677ff' }}> ... (내용 유지) ... </Form>
       </Modal>

       <Modal title={<Text style={{ fontSize: '16px', fontWeight: '600' }}>'{targetGroupForAddingUser?.name}' 그룹 사용자 추가</Text>} open={isAddUserModalVisible} onCancel={() => setIsAddUserModalVisible(false)} onOk={handleAddUsersToGroup} okText="추가" cancelText="취소" width={isMobile ? '95%' : 680} destroyOnClose bodyStyle={{ height: isMobile ? '50vh' : 350, overflowY: 'auto' }}>
            {targetGroupForAddingUser && ( <Transfer dataSource={getTransferDataSource()} showSearch filterOption={(i, o) => o.title.toLowerCase().includes(i.toLowerCase())} targetKeys={targetKeysForTransfer} onChange={handleTransferChange} render={item => item.title} listStyle={{ width: isMobile ? '45%' : 280, height: isMobile ? 280 : 300 }} titles={['전체', '추가']} locale={{ itemUnit: '명', itemsUnit: '명', searchPlaceholder: '검색' }}/> )}
        </Modal>

    </div>
  );
};

export default CalorieAdminPage; 