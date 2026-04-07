// frontend/src/api.ts
import axios from 'axios';

// 创建一个 axios 实例，指向我们刚刚启动的 Rust 后端
export const api = axios.create({
  baseURL: 'http://127.0.0.1:3000/api',
  timeout: 5000,
});