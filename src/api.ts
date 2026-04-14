import axios from 'axios';
import type { CreateCheckoutSessionReq, CreateCheckoutSessionResp } from './types';

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

const ALLOWED_EVENTS = new Set([
  'roadmap_created',
  'node_cap_hit',
  'upgrade_modal_opened',
  'checkout_started',
  'checkout_succeeded',
  'invite_sent',
  'shared_link_copied',
]);

export function trackEvent(name: string, properties?: Record<string, unknown>) {
  if (!ALLOWED_EVENTS.has(name)) return;
  void api.post('/events', { name, properties }).catch(() => {});
}

export async function createCheckoutSession(payload: CreateCheckoutSessionReq) {
  const res = await api.post<CreateCheckoutSessionResp>('/billing/checkout-session', payload);
  return res.data;
}
