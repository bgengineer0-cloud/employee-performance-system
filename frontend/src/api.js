import axios from 'axios';

// ── Change this URL to your Render backend URL ──
const BACKEND_URL = 'https://employee-performance-system-m0wz.onrender.com/api';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || BACKEND_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;