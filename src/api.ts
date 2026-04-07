import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://127.0.0.1:3000/api',
  timeout: 5000,
});

// 添加请求拦截器
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    // 在每个请求的 Header 中注入 JWT Token
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});