import React, { useState, useEffect, useCallback } from "react";
import { Typography, Input, Row, Col, Button, Modal, Form, Table, InputNumber, message, Select, Card, Tabs, Tag, Space, Tooltip, Divider, Switch, ColorPicker, Transfer, Skeleton, Empty, DatePicker } from 'antd';
import { db } from '../../firebaseconfig';
import { collection, getDocs, doc, getDoc, updateDoc, setDoc, query, where, addDoc, deleteDoc, Timestamp, writeBatch } from 'firebase/firestore';
import { useSelector } from 'react-redux';
import { useNavigate } from "react-router-dom";
import { useMediaQuery } from 'react-responsive';
import { SyncOutlined, ExclamationCircleOutlined, UserOutlined, TeamOutlined, EditOutlined, SaveOutlined, UndoOutlined, PlusOutlined, DeleteOutlined, UserAddOutlined, CalendarOutlined, CoffeeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
dayjs.locale('ko');

const { Text, Title } = Typography;
const { Search } = Input;
const { Option } = Select;
const { TabPane } = Tabs;
const { confirm } = Modal;

// 관리자 접근 가능한 이메일 목록 (AdminPage.jsx와 동일)
const ADMIN_EMAILS = [
  'eodud653923@gmail.com',
  'youngwonhahn00@gmail.com',
  'juhyeok0123@gmail.com',
  'wn990123@gmail.com',
  'garcia29845@gmail.com',
  'yunj29845@gmail.com',
];

// 기본 그룹 (그룹 삭제 시 할당될 그룹)
const DEFAULT_GROUP_ID = 'default';
const DEFAULT_GROUP_VALUE = 0; // 사용자 문서의 'group' 필드에서 기본 그룹을 나타내는 값

// 식사 유형 한글 변환 맵 (컴포넌트 최상위 스코프)
const mealTypeKoreanMap = {
    breakfast: '아침',
    lunch: '점심',
    dinner: '저녁',
    snacks: '간식'
};

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

  // 날짜 및 식사 유형 상태 추가
  const [selectedDate, setSelectedDate] = useState(dayjs()); // 오늘 날짜로 초기화 (dayjs 객체)
  const [selectedMealType, setSelectedMealType] = useState('breakfast'); // 기본값: 아침

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
        key: doc.data().name || doc.id,
        ...doc.data()
      }));
      
      // 기본 그룹이 없는 경우 생성 또는 확인
      let defaultGroupExists = groupsData.some(g => g.id === DEFAULT_GROUP_ID);
      if (!defaultGroupExists) {
          const defaultGroupData = {
              name: '기본 그룹',
              color: '#8c8c8c',
              description: '그룹 미지정',
              isDefault: true
          };
          try {
              const defaultGroupRef = doc(db, 'calorieGroups', DEFAULT_GROUP_ID);
              await setDoc(defaultGroupRef, defaultGroupData, { merge: true });
              groupsData.push({ ...defaultGroupData, id: DEFAULT_GROUP_ID, key: '기본 그룹' });
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

  // 사용자 정보 가져오기 (선택된 날짜의 food 문서 로드)
  const fetchUsers = useCallback(async (loadedGroups, date) => {
    setLoadingUsers(true);
    try {
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      const dateString = date.format('YYYY-MM-DD'); // dayjs 객체를 문자열로 변환

      const usersDataPromises = usersSnapshot.docs.map(async (userDoc) => {
        const userData = userDoc.data();
        let userGroupValue = userData.group === undefined ? DEFAULT_GROUP_VALUE : userData.group;

        const isValidGroup = userGroupValue === DEFAULT_GROUP_VALUE || loadedGroups.some(g => g.name === userGroupValue && !g.isDefault);

        if (!isValidGroup) {
            userGroupValue = DEFAULT_GROUP_VALUE;
            try {
              await updateDoc(doc(db, 'users', userDoc.id), { group: DEFAULT_GROUP_VALUE });
            } catch (updateError) {
              console.error(`사용자 ${userDoc.id} 그룹 기본값 업데이트 실패:`, updateError);
            }
        }

        const calorieBias = userData.calorieBias !== undefined ? userData.calorieBias : 0;

        // 선택된 날짜의 food 문서 가져오기
        let foodDocForSelectedDate = null;
        try {
          const foodDocRef = doc(db, `users/${userDoc.id}/foods`, dateString);
          const foodDocSnap = await getDoc(foodDocRef);
          if (foodDocSnap.exists()) {
            foodDocForSelectedDate = foodDocSnap.data();
          }
        } catch (error) {
          console.error(`사용자 ${userDoc.id}의 ${dateString} 음식 문서 로딩 실패:`, error);
        }

        return {
          key: userDoc.id,
          email: userData.email || '-',
          name: userData.name || '-',
          age: userData.age || '-',
          gender: userData.gender || '-',
          height: userData.height || '-',
          weight: userData.weight || '-',
          goal: userData.goal || '-',
          group: userGroupValue,
          calorieBias: calorieBias,
          foodDocForSelectedDate: foodDocForSelectedDate,
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

  // 데이터 로딩 통합 (selectedDate 변경 시 사용자 데이터 다시 로드)
  const loadData = useCallback(async () => {
    setLoadingGroups(true);
    setLoadingUsers(true); // 사용자 로딩도 시작으로 표시
    const groupsPromise = fetchGroups();
    const loadedGroups = await groupsPromise;
    if (loadedGroups.length > 0) {
        await fetchUsers(loadedGroups, selectedDate); // selectedDate 전달
    }
    // fetchGroups, fetchUsers 내부에서 각 로딩 상태 false로 변경
  }, [fetchGroups, fetchUsers, selectedDate]); // selectedDate 의존성 추가

  // 최초 로드 및 selectedDate 변경 시 데이터 리로드
  useEffect(() => {
    loadData();
  }, [loadData]); // loadData 자체가 selectedDate에 의존하므로 loadData만 넣어도 됨

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
  const filterByGroup = (groupValue) => {
    setSelectedGroupKey(groupValue);
    if (groupValue === 'all') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => user.group === groupValue);
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
      if (group.isDefault || group.id === DEFAULT_GROUP_ID) {
          message.warn('기본 그룹은 삭제할 수 없습니다.');
          return;
      }

      confirm({
          title: `${group.name} 그룹 삭제`,
          icon: <ExclamationCircleOutlined />,
          content: `정말로 '${group.name}' 그룹을 삭제하시겠습니까? 소속된 사용자들은 '기본 그룹'으로 이동됩니다.`,
          okText: '삭제',
          okType: 'danger',
          cancelText: '취소',
          onOk: async () => {
              try {
                  setLoadingGroups(true);
                  const usersInGroupQuery = query(collection(db, 'users'), where('group', '==', group.name));
                  const usersSnapshot = await getDocs(usersInGroupQuery);

                  const batch = writeBatch(db);
                  usersSnapshot.forEach(userDoc => {
                      const userRef = doc(db, 'users', userDoc.id);
                      batch.update(userRef, { group: DEFAULT_GROUP_VALUE });
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
        group: values.group,
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
  const handleOpenGroupSettingsModal = (groupKeyOrId) => {
    const group = groups.find(g => g.id === groupKeyOrId || g.name === groupKeyOrId);
    if (!group) return;
    
    setSelectedGroupKey(group.name);
    
    const groupUser = users.find(u => u.group === group.name);
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
      
      message.success(`${groups.find(g => g.name === selectedGroupKey)?.name || selectedGroupKey} 그룹의 칼로리 편차가 업데이트되었습니다.`);
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
      .filter(user => {
           if (targetGroupForAddingUser.isDefault) {
               return user.group !== DEFAULT_GROUP_VALUE;
           } else {
               return user.group !== targetGroupForAddingUser.name;
           }
      })
      .map(user => {
          const currentGroupName = user.group === DEFAULT_GROUP_VALUE
              ? '기본 그룹'
              : (groups.find(g => g.name === user.group)?.name || user.group);
          return {
              key: user.key,
              title: `${user.name} (${user.email})`,
              description: `현재 그룹: ${currentGroupName}`
          };
      });
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
    const targetGroupValue = targetGroupForAddingUser.isDefault
        ? DEFAULT_GROUP_VALUE
        : targetGroupForAddingUser.name;

    try {
        setLoadingUsers(true);
        const batch = writeBatch(db);
        targetKeysForTransfer.forEach(userKey => {
            const userRef = doc(db, 'users', userKey);
            batch.update(userRef, { group: targetGroupValue });
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
        setLoadingUsers(false);
    }
  };

  // 그룹 정보를 표시하는 카드 컴포넌트
  const GroupCard = ({ group }) => {
    const groupUsers = users.filter(user => {
        if (group.isDefault) {
            return user.group === DEFAULT_GROUP_VALUE;
        } else {
            return user.group === group.name;
        }
    });
    
    // 선택된 날짜/식사 유형의 평균 편차 계산
    let totalSpecificDifference = 0;
    let countWithSpecificData = 0;
    groupUsers.forEach(user => {
        const foodData = user.foodDocForSelectedDate;
        const mealData = foodData ? foodData[selectedMealType] : null;
        if (mealData && mealData.actualCalories !== null && mealData.actualCalories !== undefined && mealData.estimatedCalories !== null && mealData.estimatedCalories !== undefined) {
            totalSpecificDifference += (mealData.actualCalories - mealData.estimatedCalories);
            countWithSpecificData++;
        }
    });
    const averageSpecificBias = countWithSpecificData > 0 ? Math.round(totalSpecificDifference / countWithSpecificData) : 0;

    // GroupCard 내부에서는 직접 맵 사용 또는 필요시 변수 선언
    const mealTypeKoreanLabel = mealTypeKoreanMap[selectedMealType] || selectedMealType;

    return (
      <Card
        title={
          <Space wrap>
            <Tag color={group.color || 'default'}>{group.name || '이름 없음'}</Tag>
            <Text style={{ fontSize: '14px' }}>{group.description || '설명 없음'}</Text>
            {group.isDefault && <Tag>기본</Tag>}
          </Space>
        }
        extra={
          <Space wrap size={isMobile ? 'small' : 'middle'}>
             {!group.isDefault && (
                 <>
                     <Button
                         icon={<EditOutlined />}
                         size="small"
                         onClick={() => handleOpenGroupEditModal(group)}
                     >
                         정보 수정
                     </Button>
                     <Button
                         danger
                         icon={<DeleteOutlined />}
                         size="small"
                         onClick={() => handleDeleteGroup(group)}
                     >
                         그룹 삭제
                     </Button>
                     <Button
                         icon={<UserAddOutlined />}
                         size="small"
                         onClick={() => handleOpenAddUserModal(group)}
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
              onClick={() => handleOpenGroupSettingsModal(group.name)}
            >
              편차 설정
            </Button>
            <Button
              type="default"
              icon={<SyncOutlined />}
              size="small"
              onClick={() => {
                confirm({
                  title: `${group.name} ${selectedDate.format('YYYY-MM-DD')} ${mealTypeKoreanLabel} 편차 적용`,
                  icon: <ExclamationCircleOutlined />,
                  content: `${groupUsers.length}명 사용자에게 offset 적용?`,
                  onOk() { applyGroupCalorieBias(group.name); }
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
          <Col xs={24}>
            <Text strong style={{ fontSize: '18px', display: 'block', marginBottom: '8px' }}>
              {group.name}
            </Text>
            <Text type="secondary" style={{ fontSize: '14px', display: 'block', marginBottom: '16px' }}>
              {group.description || '설명 없음'}
            </Text>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Statistic title="사용자 수" value={groupUsers.length} suffix="명" />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Statistic title={`평균 편차 (${selectedDate.format('MM/DD')} ${mealTypeKoreanLabel})`} value={averageSpecificBias} suffix={`kcal (${countWithSpecificData}명)`} />
          </Col>
          <Col xs={24} sm={24} md={8}>
            <Space wrap>
              {groupUsers.slice(0, isMobile ? 3 : 5).map(user => (
                <Tooltip key={user.key} title={`${user.name} (${user.email}) - 설정값: ${user.calorieBias > 0 ? '+' : ''}${user.calorieBias}kcal`}>
                  <Tag color={group.color || 'default'}>
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
      render: (groupValue) => {
        if (groupValue === DEFAULT_GROUP_VALUE) {
          const defaultGroup = groups.find(g => g.id === DEFAULT_GROUP_ID);
          return <Tag color={defaultGroup?.color || '#8c8c8c'}>{defaultGroup?.name || '기본 그룹'}</Tag>;
        } else {
          const group = groups.find(g => g.name === groupValue);
          return <Tag color={group?.color || 'default'}>{group?.name || groupValue}</Tag>;
        }
      },
      filters: [
          { text: '기본 그룹', value: DEFAULT_GROUP_VALUE },
          ...groups.filter(g => !g.isDefault).map(g => ({ text: g.name, value: g.name }))
      ],
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
      title: `${selectedDate.format('MM/DD')} ${mealTypeKoreanMap[selectedMealType] || selectedMealType} 정보`,
      key: 'selectedMeal',
      width: 180,
      render: (_, record) => {
        const foodData = record.foodDocForSelectedDate;
        const mealData = foodData ? foodData[selectedMealType] : null;
        if (!mealData || mealData.actualCalories === null || mealData.estimatedCalories === null) {
            return <Text type="secondary">기록 없음</Text>;
        }
        const originalDifference = mealData.actualCalories - mealData.estimatedCalories;
        const offset = mealData.offset;
        const finalDifference = originalDifference + (offset ?? 0);
        return (
             <Space direction="vertical" size={0}>
                <Text>예:{mealData.estimatedCalories} / 실:{mealData.actualCalories}</Text>
                <Space>
                   <Tooltip title={`원본차(${originalDifference})`}><Text style={{ color: originalDifference > 0 ? '#ff4d4f' : originalDifference < 0 ? '#1677ff' : 'inherit' }}>({originalDifference>0?'+':''}{originalDifference})</Text></Tooltip>
                   {offset !== null && offset !== 0 && (<Tooltip title={`편차(offset:${offset})`}><Text strong style={{ color: finalDifference > 0 ? '#ff4d4f' : finalDifference < 0 ? '#1677ff' : 'inherit' }}>→{finalDifference>0?'+':''}{finalDifference}</Text></Tooltip>)}
                </Space>
             </Space>
        );
      }
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
                title: '개별 편차 적용',
                icon: <ExclamationCircleOutlined />,
                content: `${record.name} (${selectedDate.format('YYYY-MM-DD')} ${mealTypeKoreanMap[selectedMealType] || selectedMealType}) offset(${record.calorieBias}) 적용?`,
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
      render: (_, r) => {
          let groupName = '정보 없음';
          let groupColor = 'default';
          if (r.group === DEFAULT_GROUP_VALUE) {
              const defaultGroup = groups.find(g => g.id === DEFAULT_GROUP_ID);
              groupName = defaultGroup?.name || '기본 그룹';
              groupColor = defaultGroup?.color || '#8c8c8c';
          } else {
              const group = groups.find(g => g.name === r.group);
              groupName = group?.name || r.group;
              groupColor = group?.color || 'default';
          }
          return (
             <div>
               <Space align="center">
                 <UserOutlined />
                 <Text strong>{r.name}</Text>
               </Space>
               <div style={{ marginTop: 4 }}>
                 <Text type="secondary" style={{ fontSize: '12px' }}>{r.email}</Text>
               </div>
               <div style={{ marginTop: 8 }}>
                 <Tag color={groupColor}>{groupName}</Tag>
                 <Tooltip title="칼로리 편차 설정값">
                   <Text style={{
                     color: r.calorieBias > 0 ? '#ff4d4f' : r.calorieBias < 0 ? '#1677ff' : 'inherit',
                     marginLeft: 8
                   }}>
                     ({r.calorieBias > 0 ? '+' : ''}{r.calorieBias} kcal)
                   </Text>
                 </Tooltip>
               </div>
               {r.foodDocForSelectedDate && (
                 <div style={{ marginTop: 8, fontSize: '12px', borderTop: '1px dashed #eee', paddingTop: 8 }}>
                     <Text type="secondary">최근 식사 ({selectedDate.format('MM/DD')} {mealTypeKoreanMap[selectedMealType]}): </Text>
                     {(() => {
                        const mealData = r.foodDocForSelectedDate[selectedMealType];
                        if (mealData && mealData.actualCalories !== null && mealData.estimatedCalories !== null) {
                            const originalDifference = mealData.actualCalories - mealData.estimatedCalories;
                            const offset = mealData.offset;
                            const finalDifference = originalDifference + (offset ?? 0);
                            return (
                                 <Tooltip title={`실제: ${mealData.actualCalories}, 예상: ${mealData.estimatedCalories}, 편차(offset): ${offset ?? 0}`}>
                                     <Text style={{ color: finalDifference > 0 ? '#ff4d4f' : finalDifference < 0 ? '#1677ff' : 'inherit' }}>
                                          {finalDifference > 0 ? '+' : ''}{finalDifference} kcal
                                     </Text>
                                 </Tooltip>
                            );
                        }
                        return <Text type="secondary">기록 없음</Text>;
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
                title: '개별 편차 적용',
                icon: <ExclamationCircleOutlined />,
                content: `${record.name} (${selectedDate.format('YYYY-MM-DD')} ${mealTypeKoreanMap[selectedMealType] || selectedMealType}) offset(${record.calorieBias}) 적용?`,
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

  // 칼로리 편차 적용 함수 (선택된 날짜/식사 유형 타겟)
  const applyCalorieBias = async (userId) => {
    if (!selectedDate || !selectedMealType) {
        message.error('편차를 적용할 날짜와 식사 유형을 선택하세요.');
        return;
    }
    try {
      setLoadingUsers(true); // 사용자 데이터 관련 로딩 표시
      const userInfo = users.find(u => u.key === userId);
      if (!userInfo) { message.error("사용자 없음"); return; }
      
      const userCalorieBias = userInfo.calorieBias;
      const dateString = selectedDate.format('YYYY-MM-DD');
      const foodDocRef = doc(db, `users/${userId}/foods`, dateString);

      // 문서 존재 여부 확인 후 업데이트
      const foodDocSnap = await getDoc(foodDocRef);
      if (foodDocSnap.exists()) {
          const updateData = { [`${selectedMealType}.offset`]: userCalorieBias };
          await updateDoc(foodDocRef, updateData);
          message.success(`${userInfo.name || userInfo.email}의 ${dateString} ${selectedMealType} 편차(offset: ${userCalorieBias}) 적용 완료`);
          // 중요: UI 즉시 반영 위해 로컬 상태 업데이트 또는 전체 데이터 리로드
          // 여기서는 간단하게 전체 리로드
          await loadData(); 
      } else {
          message.warn(`${userInfo.name || userInfo.email}님은 ${dateString} 날짜의 식사 기록이 없습니다.`);
      }

    } catch (error) {
      console.error('개별 편차(offset) 적용 실패:', error);
      message.error('개별 편차(offset) 적용에 실패했습니다.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const applyGroupCalorieBias = async (groupKeyOrId) => {
     if (!selectedDate || !selectedMealType) {
        message.error('편차를 적용할 날짜와 식사 유형을 선택하세요.');
        return;
    }
    try {
      setLoadingUsers(true);
      const groupUsers = users.filter(user => user.group === groupKeyOrId);
      if (groupUsers.length === 0) { message.info('그룹 사용자 없음'); setLoadingUsers(false); return; }
      
      const dateString = selectedDate.format('YYYY-MM-DD');
      let updatedUserCount = 0;
      const batch = writeBatch(db); // Batch 사용
      const promises = []; // 각 사용자 문서 존재 확인 Promise 배열

      for (const groupUser of groupUsers) {
          const userId = groupUser.key;
          const userCalorieBias = groupUser.calorieBias;
          const foodDocRef = doc(db, `users/${userId}/foods`, dateString);
          
          // 비동기로 각 사용자 문서 확인
          promises.push(
              getDoc(foodDocRef).then(foodDocSnap => {
                  if (foodDocSnap.exists()) {
                      // 문서가 존재하면 Batch에 업데이트 추가
                      batch.update(foodDocRef, { [`${selectedMealType}.offset`]: userCalorieBias });
                      return true; // 업데이트 대상임을 표시
                  }
                  return false; // 업데이트 대상 아님
              })
          );
      }

      // 모든 사용자 문서 확인 완료 기다림
      const updateResults = await Promise.all(promises);
      updatedUserCount = updateResults.filter(result => result === true).length;

      if (updatedUserCount > 0) {
          await batch.commit(); // Batch 실행
          const groupName = groups.find(g => g.name === groupKeyOrId)?.name || groupKeyOrId;
          message.success(`${groupName} 그룹 ${updatedUserCount}명 사용자의 ${dateString} ${selectedMealType} 편차(offset) 적용 완료`);
          await loadData(); // 데이터 리로드
      } else {
          message.info(`${groups.find(g => g.name === groupKeyOrId)?.name || groupKeyOrId} 그룹 사용자 중 ${dateString} 날짜의 식사 기록이 있는 사람이 없습니다.`);
      }

    } catch (error) {
      console.error('그룹 편차(offset) 적용 실패:', error);
      message.error('그룹 편차(offset) 적용에 실패했습니다.');
    } finally {
      setLoadingUsers(false);
    }
  };

  return (
    <div style={{ padding: isMobile ? '8px' : '20px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16, padding: isMobile ? '0 8px' : 0 }}>
        <Title level={isMobile ? 4 : 2} style={{ color: '#5FDD9D', margin: 0 }}>칼로리 편차 관리</Title>
        <Button onClick={loadData} icon={<SyncOutlined />} loading={loadingGroups || loadingUsers}>새로고침</Button>
      </Row>

      <Row gutter={[8, 16]} align="middle" style={{ marginBottom: 20, padding: isMobile ? '0 8px' : 0 }}>
        <Col xs={12} sm={8} md={6}>
           <DatePicker 
              value={selectedDate} 
              onChange={(date) => setSelectedDate(date || dayjs())} // null 처리
              allowClear={false} // 날짜 선택 필수
              style={{ width: '100%' }} 
              size={isMobile ? 'small' : 'middle'}
              placeholder="날짜 선택"
           />
        </Col>
        <Col xs={12} sm={8} md={6}>
            <Select 
              value={selectedMealType} 
              onChange={(value) => setSelectedMealType(value)} 
              style={{ width: '100%' }} 
              size={isMobile ? 'small' : 'middle'}
            >
              <Option value="breakfast"><CoffeeOutlined /> {mealTypeKoreanMap['breakfast']}</Option>
              <Option value="lunch"><UserOutlined /> {mealTypeKoreanMap['lunch']}</Option>
              <Option value="dinner"><TeamOutlined /> {mealTypeKoreanMap['dinner']}</Option>
              <Option value="snacks"><CalendarOutlined /> {mealTypeKoreanMap['snacks']}</Option>
            </Select>
        </Col>
        <Col xs={24} sm={8} md={12}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
                선택한 날짜와 식사 유형 기준으로 평균 편차 계산 및 offset 적용이 수행됩니다.
            </Text>
        </Col>
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
          ) : groups.length > 0 ? (
             groups.sort((a, b) => {
                 if (a.id === DEFAULT_GROUP_ID) return -1;
                 if (b.id === DEFAULT_GROUP_ID) return 1;
                 if (a.isDefault && !b.isDefault) return -1;
                 if (!a.isDefault && b.isDefault) return 1;
                 return (a.name || '').localeCompare(b.name || '');
             }).map(group => (<GroupCard key={group.id} group={group} />))
          ) : (
            <Empty description="생성된 사용자 그룹이 없습니다." style={{ marginTop: 32, marginBottom: 32 }} >
              <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenGroupEditModal()}>새 그룹 생성</Button>
            </Empty>
          )}
        </TabPane>

        <TabPane tab={<span><UserOutlined /> 개별 사용자</span>} key="users">
          <Row gutter={[8, 8]} style={{ marginBottom: 16, padding: isMobile ? '0 8px' : 0 }}>
            <Col xs={24} md={12}>
              <Search placeholder="이름 또는 이메일 검색" value={searchTerm} onChange={handleSearchChange} allowClear style={{ width: '100%' }} size={isMobile ? 'small' : 'middle'}/>
            </Col>
            <Col xs={24} md={12}>
              <Select style={{ width: '100%' }} placeholder="그룹 필터" onChange={filterByGroup} value={selectedGroupKey || 'all'} allowClear onClear={() => filterByGroup('all')} size={isMobile ? 'small' : 'middle'}>
                <Option value="all">모든 그룹</Option>
                <Option value={DEFAULT_GROUP_VALUE}>
                   <Tag color={groups.find(g => g.id === DEFAULT_GROUP_ID)?.color || '#8c8c8c'} style={{ marginRight: 3 }} /> 기본 그룹
                </Option>
                {groups.filter(g => !g.isDefault).sort((a, b) => a.name.localeCompare(b.name)).map(group => (
                    <Option key={group.id} value={group.name}>
                        <Tag color={group.color} style={{ marginRight: 3 }} /> {group.name}
                    </Option>
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
        {currentUser && ( <Form form={form} onFinish={handleSaveUserSettings} layout="vertical" initialValues={{ group: currentUser.group, calorieBias: currentUser.calorieBias }}>
          <Form.Item name="group" label="사용자 그룹" rules={[{ required: true, message: '그룹을 선택하세요.' }]}>
            <Select style={{ width: '100%' }}>
               <Option value={DEFAULT_GROUP_VALUE}>
                  <Tag color={groups.find(g => g.id === DEFAULT_GROUP_ID)?.color || '#8c8c8c'} style={{ marginRight: 5 }} /> 기본 그룹
               </Option>
               {groups.filter(g => !g.isDefault).sort((a,b)=>a.name.localeCompare(b.name)).map(group => (
                  <Option key={group.id} value={group.name}>
                      <Tag color={group.color} style={{ marginRight: 5 }} /> {group.name}
                  </Option>
                ))}
            </Select>
          </Form.Item>
          <Form.Item name="calorieBias" label="칼로리 편차" rules={[{ required: true, message: '칼로리 편차를 입력하세요.' }]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">저장</Button>
          </Form.Item>
        </Form> )}
      </Modal>

      <Modal title={<Text style={{ fontSize: '16px', fontWeight: '600' }}>그룹 편차 일괄 설정</Text>} open={isGroupSettingsModalVisible} onCancel={() => setIsGroupSettingsModalVisible(false)} footer={null} width={isMobile ? '90%' : 480} destroyOnClose>
         {selectedGroupKey && ( <Form form={groupSettingsForm} onFinish={handleSaveGroupSettings} layout="vertical">
          <Form.Item name="calorieBias" label="칼로리 편차" rules={[{ required: true, message: '칼로리 편차를 입력하세요.' }]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">저장</Button>
          </Form.Item>
        </Form> )}
      </Modal>
      
       <Modal title={<Text style={{ fontSize: '16px', fontWeight: '600' }}>{editingGroup ? '그룹 정보 수정' : '새 그룹 생성'}</Text>} open={isGroupEditModalVisible} onCancel={() => { setIsGroupEditModalVisible(false); setEditingGroup(null); }} footer={null} width={isMobile ? '90%' : 480} destroyOnClose>
           <Form form={groupEditForm} layout="vertical" onFinish={handleSaveGroup} initialValues={editingGroup ? { ...editingGroup, color: editingGroup.color || '#1677ff' } : { name: '', description: '', color: '#1677ff' }}>
               <Form.Item name="name" label="그룹 이름" rules={[{ required: true, message: '그룹 이름을 입력하세요.' }]}>
                   <Input />
               </Form.Item>
               <Form.Item name="description" label="그룹 설명">
                   <Input.TextArea />
               </Form.Item>
               <Form.Item name="color" label="그룹 색상" rules={[{ required: true, message: '그룹 색상을 선택하세요.' }]}>
                   <ColorPicker />
               </Form.Item>
               <Form.Item>
                   <Button type="primary" htmlType="submit">저장</Button>
               </Form.Item>
           </Form>
       </Modal>

       <Modal title={<Text style={{ fontSize: '16px', fontWeight: '600' }}>'{targetGroupForAddingUser?.name}' 그룹 사용자 추가</Text>} open={isAddUserModalVisible} onCancel={() => setIsAddUserModalVisible(false)} onOk={handleAddUsersToGroup} okText="추가" cancelText="취소" width={isMobile ? '95%' : 680} destroyOnClose bodyStyle={{ height: isMobile ? '50vh' : 350, overflowY: 'auto' }}>
            {targetGroupForAddingUser && ( <Transfer dataSource={getTransferDataSource()} showSearch filterOption={(i, o) => o.title.toLowerCase().includes(i.toLowerCase())} targetKeys={targetKeysForTransfer} onChange={handleTransferChange} render={item => item.title} listStyle={{ width: isMobile ? '45%' : 280, height: isMobile ? 280 : 300 }} titles={['전체', '추가']} locale={{ itemUnit: '명', itemsUnit: '명', searchPlaceholder: '검색' }}/> )}
        </Modal>

    </div>
  );
};

export default CalorieAdminPage; 