import React, { useState, useEffect } from "react";
import { Typography, Input, Row, Col, Select, Checkbox, Button } from 'antd';
import Fuse from "fuse.js";
import tempFoodData from "./temp_foods.json";
import { useParams, Link, useNavigate } from "react-router-dom";
import noImage from "../../assets/no-image.png";
import { CheckCircleTwoTone } from '@ant-design/icons';
const { Text } = Typography;
const { Search } = Input;


const Meal = () => {
  const { mealType } = useParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredFood, setFilteredFood] = useState(Object.values(tempFoodData.foods));
  const [selectedCountry, setSelectedCountry] = useState('default');
  const [selectedItems, setSelectedItems] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fuse = new Fuse(Object.values(tempFoodData.foods), {
      keys: ["name"],
      threshold: 0.3,
    });

    let result = searchTerm ? fuse.search(searchTerm).map(item => item.item) : Object.values(tempFoodData.foods);

    if (selectedCountry !== 'default') {
      result = result.filter(item => item.country === selectedCountry);
    }

    setFilteredFood(result);
  }, [searchTerm, selectedCountry]);

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

  return (
    <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Row justify="space-between" style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: '24px', fontWeight: '800', color: '#5FDD9D', letterSpacing: '1px', fontFamily: 'Pretendard-800'}}>
          {getMealTitle()} 식사목록
        </Text>
        <Button type="primary" onClick={handleNextClick} disabled={selectedItems.length === 0} style={{ fontFamily: 'Pretendard-700'}}>
          다음으로
        </Button>
      </Row>
      <Row gutter={[16, 24]} align="middle" style={{ marginBottom: 20 }}>
        <Col flex="auto">
          <Search
            placeholder="음식 검색"
            value={searchTerm}
            size="large"
            onChange={handleSearchChange}
            style={{ width: '100%'}}
          />
        </Col>
      </Row>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        <Row gutter={[16, 12]} style={{ marginRight: 0, marginLeft: 0 }}>
          {[...selectedItems, ...filteredFood.filter(item => !selectedItems.includes(item))].map((item, index) => (
            <Col span={12} key={index}>
              <div
                onClick={() => handleItemSelect(item)}
                className="bg-bg1 rounded-xl shadow-lg mt-5"
                style={{
                  width: '100%',
                  height: '48px',
                  border: '1px solid #d9d9d9',
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: selectedItems.includes(item) ? '#f0f0f0' : 'white',
                  position: 'relative',
                  cursor: 'pointer',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <img
                    alt={item.name}
                    src={item.image || noImage}
                    style={{
                      width: 48,
                      height: 48,
                      objectFit: 'cover',
                      marginRight: 16,
                    }}
                  />
                  <Text style={{ fontSize: '16px', fontWeight: '500', color: '#333', fontFamily: 'Pretendard-500'}}>{item.name}</Text>
                  {selectedItems.includes(item) && (
                    <CheckCircleTwoTone
                      style={{ position: 'absolute', right: 60, pointerEvents: 'none', fontSize: 30 }}
                    />
                  )}
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </div>
    </div>
  );
};

export default Meal;
