// frontend/src/components/Sidebar.tsx
import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';

interface SidebarProps {
  currentId: string | null;
  onSelect: (id: string) => void;
  isCollapsed: boolean;
  setDialog: (config: any) => void; 
}

export default function Sidebar({ 
  currentId, 
  onSelect,
  isCollapsed,
  setDialog
}: SidebarProps) {
  const [roadmaps, setRoadmaps] = useState<any[]>([]);

  const fetchRoadmaps = useCallback(() => {
    api.get('/roadmaps').then(res => {
      setRoadmaps(res.data);
      if (!currentId && res.data.length > 0) {
        onSelect(res.data[0].id);
      }
    });
  }, [currentId, onSelect]);

  useEffect(() => {
    fetchRoadmaps();
  }, [fetchRoadmaps]);

  const handleAdd = () => {
    setDialog({
      isOpen: true,
      title: '开启新研究路径',
      type: 'input',
      placeholder: '请输入路线图名称...',
      defaultValue: '未命名研究路径',
      onConfirm: (title: string) => {
        if (title && title.trim()) {
          api.post('/roadmaps', { title }).then(() => {
            fetchRoadmaps();
            setDialog({ isOpen: false });
          }).catch(err => {
            if (err.response?.status === 402) return;
            console.error("创建失败", err);
          });
        }
      }
    });
  };

  const handleLogout = () => {
    setDialog({
      isOpen: true,
      title: '确定要退出空间吗？',
      type: 'confirm',
      isDanger: true,
      onConfirm: () => {
        localStorage.removeItem('token'); 
        window.location.href = '/'; 
      }
    });
  };

  return (
    <aside 
      className={`h-screen bg-gray-900 flex flex-col transition-all duration-500 ease-in-out overflow-hidden z-50 shrink-0 ${
        isCollapsed ? 'w-0 p-0' : 'w-64 p-6'
      }`}
    >
      {/* 品牌标识 */}
      <div className="text-white font-black tracking-tighter text-2xl mb-10 italic uppercase whitespace-nowrap leading-none">
        Pathio
      </div>
      
      {/* 路线图列表 - 自动填充空间 */}
      <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar min-w-[200px]">
        <div className="flex items-center justify-between text-gray-500 mb-4 px-2 whitespace-nowrap leading-none">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">My Roadmaps</span>
          <button 
            onClick={handleAdd} 
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-800 hover:text-white transition-colors text-xl font-light"
          >
            +
          </button>
        </div>
        
        <nav className="space-y-1">
          {roadmaps.map(r => (
            <button
              key={r.id}
              onClick={() => onSelect(r.id)}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 whitespace-nowrap flex items-center gap-3 ${
                currentId === r.id 
                  ? 'bg-pathio-500 text-white shadow-lg shadow-pathio-500/20 translate-x-1' 
                  : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${currentId === r.id ? 'bg-white' : 'bg-gray-700'}`}></div>
              <span className="truncate">{r.title}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* 💡 修复：底部功能区采用 border-t 替代 div，彻底消除白色横条 */}
      <div className="mt-auto pt-4 pb-2 border-t border-white/5 min-w-[200px] flex flex-col gap-1">
        
        {/* 空间管理 */}
        <button 
          onClick={() => onSelect('settings')}
          className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-3 ${
            currentId === 'settings' 
              ? 'bg-white/10 text-white shadow-md' 
              : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/40'
          }`}
        >
          <svg className="w-4 h-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="uppercase tracking-widest text-[10px]">空间管理</span>
        </button>

        {/* 退出空间 */}
        <button 
          onClick={handleLogout}
          className="group w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-transparent text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] hover:text-red-500 hover:bg-red-500/5 transition-all duration-300"
        >
          <svg className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>退出空间</span>
        </button>
      </div>
    </aside>
  );
}