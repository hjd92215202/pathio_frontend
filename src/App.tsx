import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import ReactFlow, { Background, Controls, useNodesState, useEdgesState, ReactFlowProvider, useReactFlow, addEdge } from 'reactflow';
import 'reactflow/dist/style.css';
import { api } from './api';
import PathioNode from './components/PathioNode';
import NoteView from './components/NoteView'; 
import { Routes, Route, useLocation } from 'react-router-dom';
import ShareView from './components/ShareView';
import Home from './components/Home';
import AuthForm from './components/AuthForm';

// ==========================================
// 0. 全局常量与基础组件
// ==========================================
const NODE_TYPES = { pathio: PathioNode };
const EDGE_TYPES = {};
const CONTEXT_MENU_WIDTH = 160;
const CONTEXT_MENU_HEIGHT = 220;
const CONTEXT_MENU_GAP = 8;

// 自定义高质感弹窗
function Dialog({ 
  isOpen, title, placeholder, defaultValue, type, onClose, onConfirm, isDanger 
}: { 
  isOpen: boolean, title: string, placeholder?: string, defaultValue?: string, 
  type: 'input' | 'confirm', onClose: () => void, onConfirm: (val?: string) => void, isDanger?: boolean 
}) {
  const [val, setVal] = useState(defaultValue || '');
  useEffect(() => { if (isOpen) setVal(defaultValue || ''); }, [isOpen, defaultValue]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}></div>
      <div className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95 duration-200">
        <h3 className="text-xl font-black text-gray-900 mb-6 text-center">{title}</h3>
        {type === 'input' && (
          <input 
            autoFocus className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-pathio-500 outline-none mb-8 font-bold text-gray-700 transition-all"
            placeholder={placeholder} value={val} onChange={e => setVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onConfirm(val)}
          />
        )}
        {type === 'confirm' && <p className="text-gray-400 text-sm font-medium text-center mb-8 px-4 leading-relaxed">此操作不可逆，请确认是否继续执行？</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-4 rounded-2xl font-bold text-gray-400 hover:bg-gray-50 transition-colors">取消</button>
          <button 
            onClick={() => onConfirm(type === 'input' ? val : undefined)}
            className={`flex-1 py-4 rounded-2xl font-bold text-white shadow-lg transition-all active:scale-95 ${isDanger ? 'bg-red-500 shadow-red-500/20 hover:bg-red-600' : 'bg-gray-900 shadow-gray-900/20 hover:bg-pathio-500'}`}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 1. 侧边栏组件
// ==========================================
function Sidebar({ currentId, onSelect, isCollapsed, setDialog }: any) {
  const [roadmaps, setRoadmaps] = useState<any[]>([]);
  const fetchRoadmaps = useCallback(() => {
    api.get('/roadmaps').then(res => {
      setRoadmaps(res.data);
      if (!currentId && res.data.length > 0) onSelect(res.data[0].id);
    });
  }, [currentId, onSelect]);

  useEffect(() => { fetchRoadmaps(); }, [fetchRoadmaps]);

  const handleCreate = () => {
    setDialog({
      isOpen: true, title: '新建路线图', type: 'input', placeholder: '路径名称...',
      onConfirm: (title: string) => {
        if (title) api.post('/roadmaps', { title }).then(() => { fetchRoadmaps(); setDialog({ isOpen: false }); });
      }
    });
  };

  return (
    <aside className={`h-screen bg-gray-900 flex flex-col transition-all duration-500 ease-in-out overflow-hidden shrink-0 ${isCollapsed ? 'w-0 p-0' : 'w-64 p-6'}`}>
      <div className="text-white font-black tracking-tighter text-2xl mb-10 italic uppercase">Pathio</div>
      <div className="flex-1 overflow-y-auto space-y-2 min-w-[200px]">
        <div className="flex items-center justify-between text-gray-500 mb-4 px-2 whitespace-nowrap">
          <span className="text-xs font-bold uppercase tracking-widest opacity-40">我的路线图</span>
          <button onClick={handleCreate} className="hover:text-white text-xl font-light">+</button>
        </div>
        {roadmaps.map((r: any) => (
          <button key={r.id} onClick={() => onSelect(r.id)} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${currentId === r.id ? 'bg-pathio-500 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}>
            {r.title}
          </button>
        ))}
      </div>
      <div className="mt-auto pt-6 border-t border-gray-800 min-w-[200px]">
        <button onClick={() => setDialog({
          isOpen: true, title: '退出登录', type: 'confirm', isDanger: true,
          onConfirm: () => { localStorage.removeItem('token'); window.location.href = '/'; }
        })} className="w-full py-3 rounded-xl border border-gray-800 text-gray-500 text-xs font-bold hover:bg-red-500/10 hover:text-red-500 transition-all uppercase">退出空间</button>
      </div>
    </aside>
  );
}

// ==========================================
// 2. 画布内容容器
// ==========================================
function CanvasViewport({ roadmapId, onToggleSidebar, isSidebarCollapsed, setDialog }: any) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { screenToFlowPosition } = useReactFlow();
  const [activeNode, setActiveNode] = useState<{id: string, title: string} | null>(null);
  const [menu, setMenu] = useState<{ id: string, x: number, y: number } | null>(null);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copying'>('idle');

  useEffect(() => {
    if (!roadmapId) return;
    api.get(`/nodes?roadmap_id=${roadmapId}`).then(res => {
      setNodes(res.data.map((n: any) => ({
        id: n.id, type: 'pathio', position: { x: n.pos_x, y: n.pos_y },
        data: { label: n.title, status: n.status },
      })));
    });
    api.get(`/edges?roadmap_id=${roadmapId}`).then(res => {
      setEdges(res.data.map((e: any) => ({ id: e.id, source: e.source_node_id, target: e.target_node_id })));
    });
  }, [roadmapId, setNodes, setEdges]);

  useEffect(() => {
    if (!menu) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menu]);

  // 双击创建
  const onPaneClick = useCallback((e: React.MouseEvent) => {
    setMenu(null);
    if (e.detail !== 2 || !roadmapId) return;
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setDialog({
      isOpen: true, title: '新建研究节点', type: 'input', defaultValue: '新节点',
      onConfirm: (title: string) => {
        if (!title) return;
        api.post('/nodes', { title, pos_x: pos.x, pos_y: pos.y, roadmap_id: roadmapId }).then(res => {
          setNodes(nds => nds.concat({ id: res.data.id, type: 'pathio', position: { x: res.data.pos_x, y: res.data.pos_y }, data: { label: res.data.title, status: 'todo' } }));
          setDialog({ isOpen: false });
        });
      }
    });
  }, [screenToFlowPosition, setNodes, roadmapId, setDialog]);

  const handleNodeAction = async (action: any) => {
    if (!menu) return;
    const nodeId = menu.id; setMenu(null);
    if (action === 'delete') {
      setDialog({
        isOpen: true, title: '确认删除节点', type: 'confirm', isDanger: true,
        onConfirm: async () => {
          await api.delete(`/nodes/${nodeId}`);
          setNodes(nds => nds.filter(n => n.id !== nodeId));
          setDialog({ isOpen: false });
        }
      });
    } else if (action === 'rename') {
      const cur = nodes.find(n => n.id === nodeId)?.data.label;
      setDialog({
        isOpen: true, title: '重命名节点', type: 'input', defaultValue: cur,
        onConfirm: async (title: string) => {
          if (!title) return;
          await api.put(`/nodes/${nodeId}`, { title });
          setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, label: title } } : n));
          setDialog({ isOpen: false });
        }
      });
    } else {
      await api.put(`/nodes/${nodeId}`, { status: action });
      setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: action } } : n));
    }
  };

  const menuPosition = menu ? {
    left: Math.max(
      CONTEXT_MENU_GAP,
      Math.min(menu.x + 5, window.innerWidth - CONTEXT_MENU_WIDTH - CONTEXT_MENU_GAP)
    ),
    top: Math.max(
      CONTEXT_MENU_GAP,
      Math.min(menu.y + 5, window.innerHeight - CONTEXT_MENU_HEIGHT - CONTEXT_MENU_GAP)
    ),
  } : null;

  return (
    <div className={`flex-1 relative bg-white overflow-hidden transition-all duration-500 shadow-2xl ${isSidebarCollapsed ? 'rounded-none' : 'rounded-l-[2.5rem]'}`}>
      
      {/* 修正后的右键菜单：在滑动容器外，确保坐标精准 */}
      {menu && menuPosition && createPortal(
        <div className="fixed z-[999] bg-white/95 backdrop-blur-xl border border-gray-100 shadow-2xl rounded-2xl py-1.5 w-40 overflow-hidden animate-in fade-in zoom-in-95 duration-100" style={{ top: menuPosition.top, left: menuPosition.left }}>
          <button onClick={() => handleNodeAction('rename')} className="w-full text-left px-4 py-2 text-xs font-bold text-gray-600 hover:bg-pathio-50 transition-colors">重命名</button>
          <div className="h-px bg-gray-50 my-1 mx-2"></div>
          <button onClick={() => handleNodeAction('todo')} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-400 hover:bg-slate-50">待研究</button>
          <button onClick={() => handleNodeAction('doing')} className="w-full text-left px-4 py-2 text-xs font-bold text-blue-500 hover:bg-blue-50">探索中</button>
          <button onClick={() => handleNodeAction('done')} className="w-full text-left px-4 py-2 text-xs font-bold text-emerald-500 hover:bg-emerald-50">已沉淀</button>
          <div className="h-px bg-gray-50 my-1 mx-2"></div>
          <button onClick={() => handleNodeAction('delete')} className="w-full text-left px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-50 transition-colors">删除节点</button>
        </div>,
        document.body
      )}

      <div className="w-full h-[200vh] transition-transform duration-700 cubic-bezier(0.65, 0, 0.35, 1)" style={{ transform: activeNode ? 'translateY(-50%)' : 'translateY(0%)', willChange: 'transform' }}>
        <div className="w-full h-screen relative bg-white">
          <button onClick={onToggleSidebar} className="absolute top-6 left-6 z-10 p-2 bg-white/80 backdrop-blur-md border border-gray-100 rounded-xl shadow-sm hover:text-pathio-500 transition-all">
            {isSidebarCollapsed ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 5l7 7-7 7M5 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" /></svg> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 19l-7-7 7-7M19 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round" /></svg>}
          </button>
          <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={(p) => { if (roadmapId) { setEdges(eds => addEdge(p, eds)); api.post('/edges', { ...p, roadmap_id: roadmapId }); } }} onNodeClick={(_e, node) => { setMenu(null); setActiveNode({ id: node.id, title: node.data.label }); }} onPaneClick={onPaneClick} onNodeContextMenu={(e, node) => { e.preventDefault(); setMenu({ id: node.id, x: e.clientX, y: e.clientY }); }} onNodeDragStop={(_, node) => { api.put(`/nodes/${node.id}/position`, { pos_x: node.position.x, pos_y: node.position.y }); }} nodeTypes={NODE_TYPES} edgeTypes={EDGE_TYPES} fitView>
            <Background color="#f1f5f9" gap={24} />
            <Controls />
          </ReactFlow>
          <div className="absolute top-6 right-6 z-10">
            <button onClick={async () => {
              if (!roadmapId) return;
              setShareStatus('copying');
              const res = await api.get('/roadmaps');
              const r = res.data.find((x: any) => x.id === roadmapId);
              if (r?.share_token) { await navigator.clipboard.writeText(`${window.location.origin}/share/${r.share_token}`); alert("链接已复制！"); }
              setShareStatus('idle');
            }} className="px-5 py-2.5 bg-white/80 backdrop-blur-md border border-gray-100 rounded-2xl text-sm font-bold text-pathio-500 hover:bg-pathio-500 hover:text-white transition-all shadow-sm">{shareStatus === 'idle' ? '分享此路径' : '已复制！'}</button>
          </div>
        </div>
        <div className="w-full h-screen bg-white overflow-hidden">
          {activeNode && <NoteView nodeId={activeNode.id} nodeTitle={activeNode.title} onBack={() => setActiveNode(null)} nodes={nodes} edges={edges} />}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. 主路由分发 (整合 Dialog 状态)
// ==========================================
export default function App() {
  const [authToken, setAuthToken] = useState(localStorage.getItem('token'));
  const [currentRoadmapId, setCurrentRoadmapId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();

  // 全局弹窗状态
  const [dialog, setDialog] = useState<any>({ isOpen: false, title: '', type: 'input', onConfirm: () => {} });

  useEffect(() => { setAuthToken(localStorage.getItem('token')); }, [location]);

  return (
    <div className="w-screen h-screen">
      <Dialog 
        {...dialog} 
        onClose={() => setDialog({ ...dialog, isOpen: false })} 
      />
      
      <Routes>
        <Route path="/" element={authToken ? (
          <div className="flex w-full h-full overflow-hidden bg-gray-900 transition-all duration-300">
            <Sidebar currentId={currentRoadmapId} onSelect={setCurrentRoadmapId} isCollapsed={isSidebarCollapsed} setDialog={setDialog} />
            <ReactFlowProvider>
              <CanvasViewport roadmapId={currentRoadmapId} onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} isSidebarCollapsed={isSidebarCollapsed} setDialog={setDialog} />
            </ReactFlowProvider>
          </div>
        ) : <Home />} />
        <Route path="/login" element={<AuthForm mode="login" />} />
        <Route path="/register" element={<AuthForm mode="register" />} />
        <Route path="/share/:token" element={<ShareView />} />
      </Routes>
    </div>
  );
}
