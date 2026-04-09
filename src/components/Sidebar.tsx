// frontend/src/components/Sidebar.tsx
import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';

interface SidebarProps {
  orgName: string;
  currentId: string | null;
  onSelect: (id: string) => void;
  isCollapsed: boolean;
  setDialog: (config: any) => void; 
}

export default function Sidebar({ 
  orgName,
  currentId, 
  onSelect,
  isCollapsed,
  setDialog
}: SidebarProps) {
  const [roadmaps, setRoadmaps] = useState<any[]>([]);

  const fetchRoadmaps = useCallback(() => {
    api.get('/roadmaps').then(res => {
      setRoadmaps(res.data);
      if (!currentId && res.data.length > 0) onSelect(res.data[0].id);
    });
  }, [currentId, onSelect]);

  useEffect(() => { fetchRoadmaps(); }, [fetchRoadmaps]);

  const handleAdd = () => {
    setDialog({
      isOpen: true, title: '开启新研究路径', type: 'input', placeholder: '路径名称...', defaultValue: '未命名研究路径',
      onConfirm: (title: string) => {
        if (title && title.trim()) {
          api.post('/roadmaps', { title }).then(() => { fetchRoadmaps(); setDialog({ isOpen: false }); })
             .catch(err => { if (err.response?.status === 402) return; });
        }
      }
    });
  };

  const handleRenameRoadmap = (e: React.MouseEvent, id: string, oldTitle: string) => {
    e.preventDefault();
    setDialog({
      isOpen: true, title: '重命名研究路径', type: 'input', defaultValue: oldTitle,
      onConfirm: (newTitle: string) => {
        if (newTitle && newTitle !== oldTitle) {
          api.put(`/roadmaps/${id}`, { title: newTitle }).then(() => { fetchRoadmaps(); setDialog({ isOpen: false }); });
        } else { setDialog({ isOpen: false }); }
      }
    });
  };

  return (
    <aside className={`h-screen bg-gray-900 flex flex-col transition-all duration-500 ease-in-out overflow-hidden z-50 shrink-0 ${isCollapsed ? 'w-0 p-0' : 'w-64 p-6'}`}>
      
      {/* 品牌标识区 */}
      <div className="flex flex-col mb-10 select-none">
        <div className="text-white font-black tracking-tighter text-2xl mb-1 italic uppercase whitespace-nowrap">Pathio</div>
        <div className="text-[10px] text-pathio-500 font-bold uppercase tracking-[0.2em] opacity-80 whitespace-nowrap overflow-hidden text-ellipsis">
          {orgName}
        </div>
      </div>
      
      {/* 路线图列表区 */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pr-1 space-y-2 custom-scrollbar min-w-[200px]">
        <div className="flex items-center justify-between text-gray-500 mb-4 px-2 whitespace-nowrap leading-none">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">My Roadmaps</span>
          <button onClick={handleAdd} className="hover:text-white text-xl font-light leading-none">+</button>
        </div>
        <nav className="space-y-1">
          {roadmaps.map(r => (
            <button key={r.id} onClick={() => onSelect(r.id)} onContextMenu={(e) => handleRenameRoadmap(e, r.id, r.title)} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 whitespace-nowrap flex items-center gap-3 ${currentId === r.id ? 'bg-pathio-500 text-white shadow-lg shadow-pathio-500/20 translate-x-1' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${currentId === r.id ? 'bg-white' : 'bg-gray-700'}`}></div>
              <span className="truncate">{r.title}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* 💡 修复：使用物理边框替代 div，颜色调至最低感官，彻底消除白条 */}
      <div className="mt-auto min-w-[200px] pt-4 border-t border-white/[0.03] flex flex-col gap-1">
        <button 
          onClick={() => onSelect('settings')} 
          className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-3 ${
            currentId === 'settings' ? 'bg-white/10 text-white shadow-md' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/40'
          }`}
        >
          <svg className="w-4 h-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeWidth="2" strokeLinecap="round" /><circle cx="12" cy="12" r="3" strokeWidth="2" /></svg>
          <span className="uppercase tracking-widest text-[10px]">空间管理</span>
        </button>
        <button 
          onClick={() => setDialog({ isOpen: true, title: '确定要退出吗？', type: 'confirm', isDanger: true, onConfirm: () => { localStorage.removeItem('token'); window.location.href = '/'; } })} 
          className="group w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-transparent text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] hover:text-red-500 hover:bg-red-500/5 transition-all duration-300"
        >
          <span>退出空间</span>
        </button>
      </div>
    </aside>
  );
}