const API_URL = 'https://api.example.com';

export const fetchData = async () => {
  const response = await fetch(`${API_URL}/data`);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
}; 