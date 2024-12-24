import React, { useState, useEffect } from "react";
import { Progress, Input, Row, Col, Typography, Tooltip, Modal, Button } from "antd";
import { useSelector } from 'react-redux';
import { doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/firebaseconfig';
import { SettingOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const BMICalculator = ({ weight: parentWeight }) => {
  const [height, setHeight] = useState(undefined);
  const [weight, setWeight] = useState(parentWeight);
  const [bmi, setBMI] = useState(undefined);
	const uid = useSelector((state) => state.auth.user?.uid);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [inputHeight, setInputHeight] = useState(undefined);
  const [weightInputMode, setWeightInputMode] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!uid) return;
      setLoading(true);
      try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        let fetchedWeight = undefined;
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setHeight(userData.height);

          // fitness 데이터 있는지 확인
          const fitnessQuery = query(
            collection(db, 'users', uid, 'fitness'),
            orderBy('date', 'desc'),
            limit(1)
          );
          const fitnessSnapshot = await getDocs(fitnessQuery);
          if (!fitnessSnapshot.empty) {
            // fitness 데이터 있으면 가장 가까운 날짜 데이터 가져오기
            fetchedWeight = fitnessSnapshot.docs[0].data().weight;
          } else {
            setWeightInputMode(true);
          }
          if(parentWeight) {
            setWeight(parentWeight);
          } else {
            setWeight(fetchedWeight);
          }
          if (userData.height && (parentWeight || fetchedWeight)) {
            calculateBMI(userData.height, parentWeight || fetchedWeight);
          } else if (parentWeight || fetchedWeight) {
            calculateBMI(userData.height || 100, parentWeight || fetchedWeight);
          }
        } else {
            setHeight(100);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

		fetchUserData();
  }, [uid, parentWeight]);

  useEffect(() => {
    calculateBMI(height, weight);
  }, [height, weight]);

  const calculateBMI = (h, w) => {
    if (h && w) {
      const bmiValue = parseFloat((w / (h / 100) ** 2).toFixed(2));
      setBMI(bmiValue);
    }
  };

  const handleInputChange = async (value) => {
    if (!uid) return;
    setInputHeight(value);
  };

  const handleSaveHeight = async () => {
    if (!uid || !inputHeight) return;
    try {
      await setDoc(doc(db, 'users', uid), {
        height: inputHeight,
      }, { merge: true });
      setHeight(inputHeight);
      calculateBMI(inputHeight, weight);
      setIsModalVisible(false);
    } catch (error) {
      console.error("Error updating user data:", error);
    }
  };

  const getBMICategory = () => {
    if (bmi) {
      if (bmi < 18.5) return { category: "저체중", color: "#69c0ff" };
      if (bmi < 23) return { category: "정상", color: "#95de64" };
      if (bmi < 25) return { category: "과체중", color: "#ffd666" };
      if (bmi < 30) return { category: "비만", color: "#ffa39e" };
      return { category: "고도비만", color: "#ff4d4f" };
    }
    return { category: weightInputMode ? "체중을 입력하세요" : "키를 입력하세요", color: "#d9d9d9" };
  };

  const bmiCategory = getBMICategory();

    const showModal = () => {
        setIsModalVisible(true);
        setInputHeight(height);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
    };

  return (
    <div
      style={{
        padding: "10px",
        background: "#fff",
				width: "100%",
				height: "100%",
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
        <Title level={4} style={{ marginBottom: 0 }}>나의 BMI지수</Title>
        <Tooltip title="키 입력">
            <SettingOutlined onClick={showModal} style={{ fontSize: '20px', cursor: 'pointer' }} />
        </Tooltip>
      </div>
      <Text strong style={{ fontSize: "16px", color: bmiCategory.color, marginBottom: '5px' }}>
        {bmi
          ? `${bmi} (${bmiCategory.category})`
          : bmiCategory.category}
      </Text>
      <Modal
        title="키 입력"
        open={isModalVisible}
        onCancel={handleCancel}
        footer={[
          <Button key="cancel" onClick={handleCancel}>
            취소
          </Button>,
          <Button key="save" type="primary" onClick={handleSaveHeight}>
            저장
          </Button>,
        ]}
      >
        <Input
          placeholder="키(cm)"
          type="number"
          value={inputHeight}
          onChange={(e) => handleInputChange(Number(e.target.value))}
        />
      </Modal>
      <div style={{ marginTop: "15px", position: "relative" }}>
        <Progress
          percent={100}
          showInfo={false}
          strokeColor={{
            "0%": "#69c0ff",
            "20%": "#95de64",
            "50%": "#ffd666",
            "75%": "#ffa39e",
            "100%": "#ff4d4f",
          }}
          trailColor="#f0f0f0"
          style={{ height: "20px", borderRadius: "10px" }}
        />
        {bmi && (
          <div
            style={{
              position: "absolute",
              top: "-1px",
              left: bmi < 18.5 ? `${(bmi / 18.5) * 20}%` :
                    bmi < 23 ? `${20 + ((bmi - 18.5) / (23 - 18.5)) * 30}%` :
                    bmi < 25 ? `${50 + ((bmi - 23) / (25 - 23)) * 25}%` :
                    bmi < 30 ? `${75 + ((bmi - 25) / (30 - 25)) * 25}%` : '100%',
              transform: "translateX(-50%)",
            }}
          >
            <div
              style={{
                width: "6px",
                height: "15px",
                backgroundColor: "#000",
                borderRadius: "3px",
              }}
            ></div>
          </div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "5px",
        }}
      >
        <Text>저체중</Text>
        <Text>정상</Text>
        <Text>과체중</Text>
        <Text>비만</Text>
        <Text>고도비만</Text>
      </div>
    </div>
  );
};

export default BMICalculator; 