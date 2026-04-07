import { useState } from 'react';
import { api } from '../api';
import { useNavigate, Link } from 'react-router-dom';

export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === 'register') {
        await api.post('/auth/register', { username, email, password });
        alert('注册成功！');
        navigate('/login');
      } else {
        const res = await api.post('/auth/login', { username, password });
        localStorage.setItem('token', res.data.token);
        navigate('/');
      }
    } catch (err: any) {
      alert(err.response?.data || '操作失败');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-xl p-10 border border-gray-100">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-black tracking-tighter text-pathio-900 mb-2">PATHIO</h1>
          <h2 className="text-xl font-bold text-gray-800">{mode === 'login' ? '欢迎回来' : '开启你的探索之旅'}</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">用户名</label>
            <input 
              type="text" placeholder="输入用户名" required
              className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-pathio-500 outline-none transition-all"
              onChange={e => setUsername(e.target.value)}
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">电子邮箱</label>
              <input 
                type="email" placeholder="email@example.com" required
                className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-pathio-500 outline-none transition-all"
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">访问密码</label>
            <input 
              type="password" placeholder="••••••••" required
              className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-pathio-500 outline-none transition-all"
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button className="w-full py-5 bg-gray-900 text-white font-bold rounded-2xl hover:bg-pathio-500 transition-all shadow-lg active:scale-[0.98] mt-4">
            {mode === 'login' ? '登 录' : '立 即 注 册'}
          </button>
        </form>

        <div className="mt-10 text-center">
          <Link to={mode === 'login' ? '/register' : '/login'} className="text-sm font-bold text-pathio-500 hover:text-pathio-900 transition-colors">
            {mode === 'login' ? '还没有账号？点此注册' : '已有账号？点此登录'}
          </Link>
        </div>
      </div>
    </div>
  );
}