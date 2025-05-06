const API_URL = 'https://api.example.com';

// 백엔드 API URL 설정 (실제 환경에 맞게 조정 필요)
const BACKEND_API_URL = 'https://wnln.mooo.com/api';

export const fetchData = async () => {
  const response = await fetch(`${API_URL}/data`);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
}; 

// 음식 영양정보 검색 API
export const searchFoodNutrition = async (keyword) => {
  try {
    const response = await fetch(`${BACKEND_API_URL}/food_info?keyword=${encodeURIComponent(keyword)}`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return await response.json();
  } catch (error) {
    console.error('음식 영양정보 검색 실패:', error);
    throw error;
  }
}; 