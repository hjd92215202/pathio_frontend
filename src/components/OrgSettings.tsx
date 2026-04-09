import { useEffect, useState, useCallback } from 'react';
import { isAxiosError } from 'axios';
import { api } from '../api';
import type { OrgDetailsResponse, OrgInviteResponse, OrgMember } from '../types';

export default function OrgSettings({ setGlobalOrgName }: { setGlobalOrgName?: (name: string) => void }) {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [orgName, setOrgName] = useState('我的研究组织');
  const [plan, setPlan] = useState<'free' | 'team'>('free');
  const [inviteLink, setInviteLink] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingName, setIsSavingName] = useState(false);

  const fetchOrgDetails = useCallback(async () => {
    try {
      const res = await api.get<OrgDetailsResponse>('/org/details');
      setMembers(res.data.members || []);
      setOrgName(res.data.name);
      setPlan(res.data.plan_type === 'team' ? 'team' : 'free');
    } catch (error) {
      console.error('加载组织信息失败', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrgDetails();
  }, [fetchOrgDetails]);

  const handleUpdateOrgName = async () => {
    if (!orgName.trim()) return;

    setIsSavingName(true);
    try {
      await api.put('/org/details', { name: orgName });
      if (setGlobalOrgName) setGlobalOrgName(orgName);
      alert('空间名称已成功更新');
    } catch {
      alert('更新失败');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleGenerateInvite = async () => {
    try {
      const res = await api.post<OrgInviteResponse>('/org/invite');
      setInviteLink(`${window.location.origin}/register?invite=${res.data.code}`);
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.status === 402) return;
      alert('生成失败');
    }
  };

  if (isLoading) return <div className="h-full flex items-center justify-center font-black italic text-slate-200">LOADING...</div>;

  return (
    <div className="h-full bg-white overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto px-12 py-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <header className="mb-12">
          <div className="inline-block px-3 py-1 bg-pathio-50 text-pathio-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg mb-4 border border-pathio-100">WORKSPACE ADMIN</div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-2 uppercase italic leading-none">空间管理</h2>
        </header>

        <section className="bg-gray-900 rounded-[3rem] p-10 mb-12 relative overflow-hidden shadow-2xl">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-pathio-500 mb-2 block">Active Subscription</span>
              <h3 className="text-3xl font-black text-white italic uppercase mb-2 leading-none">{plan === 'free' ? 'Free 免费体验版' : 'Team 团队协作版'}</h3>
            </div>
            {plan === 'free' && <button onClick={() => api.post('/org/invite').catch(() => {})} className="bg-pathio-500 hover:bg-white hover:text-pathio-900 text-white px-8 py-4 rounded-2xl font-black transition-all shadow-xl active:scale-95 uppercase text-xs">升级方案 →</button>}
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-pathio-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          <div className="lg:col-span-3">
            <h4 className="text-lg font-black text-gray-800 mb-8 uppercase italic flex items-center gap-2 px-2">团队成员 <span className="text-sm font-medium text-slate-300 not-italic">/ {members.length}</span></h4>
            <div className="space-y-4">
              {members.map((member) => (
                <div key={member.id} className="group flex items-center justify-between p-5 bg-gray-50 hover:bg-white hover:shadow-xl transition-all rounded-[1.5rem] border border-transparent hover:border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center font-black text-gray-500 text-lg group-hover:bg-pathio-500 group-hover:text-white transition-all uppercase">{member.nickname[0]}</div>
                    <div>
                      <p className="font-bold text-gray-900">{member.nickname}</p>
                      <p className="text-xs text-gray-400 italic">{member.email}</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border ${member.role === 'admin' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-white text-gray-400 border-gray-100'}`}>{member.role}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-2 space-y-10">
            <div className="p-8 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm">
              <label className="text-[10px] font-black text-gray-300 uppercase block mb-3 ml-1">空间展示名称</label>
              <input type="text" value={orgName} onChange={(event) => setOrgName(event.target.value)} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-pathio-500 outline-none font-bold text-gray-700 mb-6 text-sm" />
              <button onClick={handleUpdateOrgName} disabled={isSavingName} className="w-full text-xs font-black text-pathio-500 hover:text-pathio-900 border border-pathio-100 hover:border-pathio-500 py-4 rounded-2xl transition-all uppercase tracking-widest active:scale-95">{isSavingName ? 'SAVING...' : '保存名称修改'}</button>
            </div>
            <div className="p-8 bg-pathio-50/50 border border-pathio-100 rounded-[2.5rem]">
              {!inviteLink ? (
                <button onClick={handleGenerateInvite} className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black hover:bg-pathio-500 transition-all shadow-xl active:scale-95 uppercase tracking-widest text-xs">生成邀请链接</button>
              ) : (
                <div className="space-y-4 animate-in fade-in zoom-in-95">
                  <code className="text-[11px] text-gray-400 break-all block font-mono bg-white p-4 rounded-xl border border-pathio-100">{inviteLink}</code>
                  <button onClick={() => { navigator.clipboard.writeText(inviteLink); alert('已复制'); }} className="w-full py-5 bg-pathio-500 text-white rounded-2xl font-black transition-all active:scale-95 uppercase tracking-widest text-xs">复制链接</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

