import { useState } from 'react';
import { isAxiosError } from 'axios';
import { api } from '../api';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';

export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get('invite');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (mode === 'register') {
        await api.post('/auth/register', {
          username,
          email,
          password,
          invite_code: inviteCode,
        });
        alert('账号注册成功，请先登录。');
        navigate('/login');
      } else {
        const res = await api.post<{ token: string }>('/auth/login', { username, password });
        localStorage.setItem('token', res.data.token);
        navigate('/');
      }
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        const message = typeof error.response?.data === 'string' ? error.response.data : '操作失败，请检查网络或信息是否正确';
        alert(message);
        return;
      }

      alert('操作失败，请检查网络或信息是否正确');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-xl p-10 border border-gray-100">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-black tracking-tighter text-pathio-900 mb-2 italic uppercase">Pathio</h1>
          <h2 className="text-xl font-bold text-gray-800">
            {mode === 'login' ? '欢迎回来' : '开启你的探索之旅'}
          </h2>

          {mode === 'register' && inviteCode && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-pathio-50 text-pathio-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-pathio-100 animate-pulse">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pathio-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-pathio-500"></span>
              </span>
              正在受邀加入组织
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">
              用户名
            </label>
            <input
              type="text"
              placeholder="输入您的唯一称呼"
              required
              className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-pathio-500 outline-none transition-all font-bold text-gray-700"
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          {mode === 'register' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">
                电子邮箱
              </label>
              <input
                type="email"
                placeholder="email@example.com"
                required
                className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-pathio-500 outline-none transition-all font-bold text-gray-700"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">
              访问密码
            </label>
            <input
              type="password"
              placeholder="????????"
              required
              className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-pathio-500 outline-none transition-all font-bold text-gray-700"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button className="w-full py-5 bg-gray-900 text-white font-black rounded-2xl hover:bg-pathio-500 transition-all shadow-lg shadow-gray-900/10 active:scale-[0.98] mt-4 uppercase tracking-widest">
            {mode === 'login' ? '进入空间' : '立即加入'}
          </button>
        </form>

        <div className="mt-10 text-center border-t border-gray-50 pt-8">
          <Link
            to={mode === 'login' ? '/register' : '/login'}
            className="text-xs font-bold text-pathio-500 hover:text-pathio-900 transition-colors uppercase tracking-widest"
          >
            {mode === 'login' ? '还没有账号？点此注册' : '已有账号？点此登录'}
          </Link>
        </div>
      </div>
    </div>
  );
}

