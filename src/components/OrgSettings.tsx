// src/components/OrgSettings.tsx
import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';

interface Member {
  id: string;
  nickname: string;
  email: string;
  role: 'admin' | 'editor' | 'member';
  created_at: string;
}

export default function OrgSettings() {
  const [members, setMembers] = useState<Member[]>([]);
  const [orgName, setOrgName] = useState('我的研究组织');
  const [plan, setPlan] = useState<'free' | 'team'>('free');
  const [inviteLink, setInviteLink] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingName, setIsSavingName] = useState(false);

  // 1. 加载组织详情
  const fetchOrgDetails = useCallback(async () => {
    try {
      const res = await api.get('/org/details');
      setMembers(res.data.members || []);
      setOrgName(res.data.name);
      setPlan(res.data.plan_type);
    } catch (err) {
      console.error("加载组织信息失败", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrgDetails();
  }, [fetchOrgDetails]);

  // 2. 生成邀请链接 (捕获 402 用于营销弹窗)
  const handleGenerateInvite = async () => {
    try {
      const res = await api.post('/org/invite');
      const fullLink = `${window.location.origin}/register?invite=${res.data.code}`;
      setInviteLink(fullLink);
    } catch (err: any) {
      // 如果是 402 错误，静默退出，让 App.tsx 的拦截器弹出 UpgradeModal
      if (err.response?.status === 402) return;
      alert("生成邀请码失败，请确认您是否有管理员权限");
    }
  };

  // 3. 修改组织名称
  const handleUpdateOrgName = async () => {
    if (!orgName.trim()) return;
    setIsSavingName(true);
    try {
      await api.put('/org/details', { name: orgName });
      alert("组织名称已更新");
    } catch (err) {
      alert("更新失败");
    } finally {
      setIsSavingName(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink);
    alert("邀请链接已复制！");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-pathio-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto px-12 py-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* 头部标题 */}
        <header className="mb-12">
          <div className="inline-block px-3 py-1 bg-pathio-50 text-pathio-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg mb-4 border border-pathio-100">
            Workspace Admin
          </div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-2 uppercase italic leading-none">空间管理</h2>
          <p className="text-gray-400 font-medium mt-2">管理组织资产、成员席位与研究权限。</p>
        </header>

        {/* 营销展位：方案信息 */}
        <section className="bg-gray-900 rounded-[3rem] p-10 mb-12 relative overflow-hidden shadow-2xl shadow-gray-900/20">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-pathio-500 mb-2 block">Active Subscription</span>
              <h3 className="text-3xl font-black text-white italic uppercase mb-2 leading-none">
                {plan === 'free' ? 'Free 免费体验版' : 'Team 团队协作版'}
              </h3>
              <p className="text-gray-400 text-sm max-w-md leading-relaxed mt-4">
                {plan === 'free' 
                  ? '免费版限 1 个路线图空间及 1 个额外协作席位。升级团队版解锁无限可能。' 
                  : '您已开启团队版。每席位 30 RMB/月，享受无限空间与高级研究溯源。'}
              </p>
            </div>
            {plan === 'free' && (
              <button 
                onClick={() => api.post('/org/invite').catch(() => {})} 
                className="bg-pathio-500 hover:bg-white hover:text-pathio-900 text-white px-8 py-4 rounded-2xl font-black transition-all shadow-xl shadow-pathio-500/20 whitespace-nowrap active:scale-95 uppercase tracking-widest text-xs"
              >
                立即升级方案 →
              </button>
            )}
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-pathio-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          
          {/* 成员列表 */}
          <div className="lg:col-span-3">
            <h4 className="text-lg font-black text-gray-800 flex items-center gap-2 mb-8 px-2 uppercase tracking-tight">
              团队成员 <span className="text-sm font-medium text-gray-300 ml-1 italic">/ {members.length}</span>
            </h4>
            
            <div className="space-y-4">
              {members.length === 0 ? (
                <div className="p-16 border-2 border-dashed border-gray-100 rounded-[2.5rem] text-center italic text-gray-300 font-medium">
                  暂无其他成员，快去邀请吧
                </div>
              ) : members.map((m) => (
                <div key={m.id} className="group flex items-center justify-between p-5 bg-gray-50 hover:bg-white hover:shadow-xl hover:shadow-gray-100 transition-all rounded-[1.5rem] border border-transparent hover:border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center font-black text-gray-500 text-lg border-2 border-white shadow-sm group-hover:bg-pathio-500 group-hover:text-white transition-all duration-300 uppercase">
                      {m.nickname[0]}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{m.nickname}</p>
                      <p className="text-xs text-gray-400 font-medium tracking-tight italic">{m.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border ${
                      m.role === 'admin' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-white text-gray-400 border-gray-100'
                    }`}>
                      {m.role}
                    </span>
                    <span className="text-[9px] text-gray-300 font-bold uppercase tracking-tighter italic">Joined {new Date(m.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 右侧设置区 */}
          <div className="lg:col-span-2 space-y-10">
            
            {/* 空间信息 */}
            <section>
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4 ml-1">General Settings</h4>
              <div className="p-8 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm">
                <label className="text-[10px] font-black text-gray-300 uppercase block mb-3 ml-1">空间展示名称</label>
                <input 
                  type="text" 
                  value={orgName} 
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-pathio-500 outline-none font-bold text-gray-700 transition-all mb-6"
                />
                <button 
                  onClick={handleUpdateOrgName}
                  disabled={isSavingName}
                  className="w-full text-xs font-black text-pathio-500 hover:text-pathio-900 border border-pathio-100 hover:border-pathio-500 py-4 rounded-2xl transition-all active:scale-95 uppercase tracking-widest"
                >
                  {isSavingName ? '正在同步...' : '保存名称修改'}
                </button>
              </div>
            </section>

            {/* 邀请模块 */}
            <section>
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4 ml-1">Member Invitation</h4>
              <div className="p-8 bg-pathio-50/50 border border-pathio-100 rounded-[2.5rem]">
                {!inviteLink ? (
                  <div className="text-center px-4">
                    <p className="text-xs text-gray-400 font-medium leading-relaxed mb-8 italic">
                      生成一个专属链接，邀请伙伴共同建设该组织的知识路径库。
                    </p>
                    <button 
                      onClick={handleGenerateInvite}
                      className="w-full py-5 bg-gray-900 text-white rounded-2xl font-bold hover:bg-pathio-500 transition-all shadow-xl shadow-gray-900/10 active:scale-95 uppercase tracking-widest"
                    >
                      生成邀请链接
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                    <div className="p-5 bg-white border border-pathio-100 rounded-2xl overflow-hidden shadow-sm">
                      <p className="text-[10px] font-black text-pathio-600 uppercase mb-3 flex items-center gap-2 tracking-widest">
                         <div className="w-1.5 h-1.5 bg-pathio-500 rounded-full animate-pulse"></div> Link Ready
                      </p>
                      <code className="text-[11px] text-gray-400 break-all leading-tight block font-mono bg-gray-50 p-3 rounded-xl">
                        {inviteLink}
                      </code>
                    </div>
                    <button 
                      onClick={copyToClipboard}
                      className="w-full py-5 bg-pathio-500 text-white rounded-2xl font-black hover:shadow-2xl hover:shadow-pathio-500/30 transition-all active:scale-95 uppercase tracking-widest"
                    >
                      复制链接给伙伴
                    </button>
                    <button 
                      onClick={() => setInviteLink('')}
                      className="w-full text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] hover:text-gray-400 transition-colors pt-2"
                    >
                      销毁当前链接
                    </button>
                  </div>
                )}
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}