// frontend/src/App.tsx
import { useCallback, useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ReactFlow, Background, Controls, useNodesState, useEdgesState, ReactFlowProvider, useReactFlow, addEdge, type Node, type Edge, type Connection } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { api } from './api';
import PathioNode from './components/PathioNode';
import NoteView from './components/NoteView'; 
import { Routes, Route, useLocation } from 'react-router-dom';
import ShareView from './components/ShareView';
import Home from './components/Home';
import AuthForm from './components/AuthForm';
import OrgSettings from './components/OrgSettings';
import Sidebar from './components/Sidebar';

// ==========================================
// 0. 全局常量与基础组件
// ==========================================
const NODE_TYPES = { pathio: PathioNode };
const CONTEXT_MENU_WIDTH = 160;
const CONTEXT_MENU_HEIGHT = 220;
const CONTEXT_MENU_GAP = 8;

type PathioNodeData = { label: string; status: string };
type PathioNodeType = Node<PathioNodeData, 'pathio'>;
type PathioEdgeType = Edge;

// 💡 营销组件：升舱弹窗
function UpgradeModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* 左侧：营销视觉 */}
          <div className="p-12 bg-gray-900 text-white flex flex-col justify-center relative overflow-hidden">
            <div className="relative z-10">
              <span className="text-pathio-500 font-black text-[10px] uppercase tracking-[0.4em] mb-4 block">Upgrade to Pro</span>
              <h2 className="text-4xl font-black italic mb-6 leading-tight uppercase">释放团队的<br/>无限创造力</h2>
              <div className="space-y-4 mb-8">
                {['无限路线图空间', '不限数量的协作席位', '高级分享权限', '专属技术支持'].map(f => (
                  <div key={f} className="flex items-center gap-3 text-xs font-bold opacity-90">
                    <div className="w-5 h-5 rounded-full bg-pathio-500/20 flex items-center justify-center text-pathio-500 font-black">✓</div>
                    {f}
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-pathio-500/10 rounded-full blur-3xl"></div>
          </div>
          {/* 右侧：价格对比 */}
          <div className="p-12 flex flex-col justify-center bg-gray-50 text-center">
             <div className="mb-10 text-center">
                <div className="flex justify-center items-baseline gap-1">
                   <span className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">RMB</span>
                   <span className="text-6xl font-black text-gray-900 tracking-tighter italic">30</span>
                   <span className="text-sm font-bold text-gray-400">/ 席位 / 月</span>
                </div>
             </div>
             <div className="p-6 bg-white border-2 border-pathio-500 rounded-3xl mb-10 shadow-sm">
                <p className="text-sm font-black text-gray-900 uppercase tracking-wider">团队标准版</p>
                <p className="text-[11px] text-gray-400 mt-2 font-medium">适合核心研究团队，沉淀组织数字资产</p>
             </div>
             <button className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black hover:bg-pathio-500 shadow-xl transition-all active:scale-95 mb-6 uppercase tracking-widest text-xs">立即升级方案</button>
             <button onClick={onClose} className="w-full text-xs font-bold text-gray-300 hover:text-gray-500 transition-colors uppercase tracking-[0.2em]">稍后再说</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 通用 Dialog
function Dialog({ isOpen, title, placeholder, defaultValue, type, onClose, onConfirm, isDanger }: any) {
  const [val, setVal] = useState(defaultValue || '');
  useEffect(() => { if (isOpen) setVal(defaultValue || ''); }, [isOpen, defaultValue]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}></div>
      <div className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95 duration-200">
        <h3 className="text-xl font-black text-gray-900 mb-6 text-center tracking-tight">{title}</h3>
        {type === 'input' && (
          <input autoFocus className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-pathio-500 outline-none mb-8 font-bold text-gray-700 transition-all" placeholder={placeholder} value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && onConfirm(val)} />
        )}
        {type === 'confirm' && <p className="text-gray-400 text-sm font-medium text-center mb-8 px-4 leading-relaxed">此操作不可逆，请确认是否继续执行？</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-4 rounded-2xl font-bold text-gray-400 hover:bg-gray-50 transition-colors uppercase text-xs tracking-widest">取消</button>
          <button onClick={() => onConfirm(type === 'input' ? val : undefined)} className={`flex-1 py-4 rounded-2xl font-bold text-white shadow-lg transition-all active:scale-95 uppercase text-xs tracking-widest ${isDanger ? 'bg-red-500 shadow-red-500/20 hover:bg-red-600' : 'bg-gray-900 shadow-gray-900/20 hover:bg-pathio-500'}`}>确定</button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. 画布内容容器 (核心逻辑重构)
// ==========================================
function CanvasViewport({ roadmapId, onToggleSidebar, isSidebarCollapsed, setDialog }: any) {
  const [nodes, setNodes, onNodesChange] = useNodesState<PathioNodeType>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<PathioEdgeType>([]);
  const { screenToFlowPosition } = useReactFlow();
  const [activeNode, setActiveNode] = useState<{ id: string, title: string } | null>(null);
  const [menu, setMenu] = useState<{ id: string, x: number, y: number } | null>(null);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copying'>('idle');

  // 💡 修复关键：当切换 roadmapId（包括进入 Settings）时，必须滑回顶部并清理菜单
  useEffect(() => {
    setActiveNode(null);
    setMenu(null);
  }, [roadmapId]);

  useEffect(() => {
    if (!roadmapId || roadmapId === 'settings') return;
    api.get(`/nodes?roadmap_id=${roadmapId}`).then(res => {
      setNodes(res.data.map((n: any): PathioNodeType => ({ id: n.id, type: 'pathio', position: { x: n.pos_x, y: n.pos_y }, data: { label: n.title, status: n.status } })));
    });
    api.get(`/edges?roadmap_id=${roadmapId}`).then(res => {
      setEdges(res.data.map((e: any): PathioEdgeType => ({ id: e.id, source: e.source_node_id, target: e.target_node_id })));
    });
  }, [roadmapId, setNodes, setEdges]);

  const onPaneClick = useCallback((e: React.MouseEvent) => {
    setMenu(null);
    if (e.detail !== 2 || !roadmapId || roadmapId === 'settings') return;
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setDialog({ isOpen: true, title: '新建研究节点', type: 'input', defaultValue: '新研究节点', onConfirm: (title: string) => { if (!title) return; api.post('/nodes', { title, pos_x: pos.x, pos_y: pos.y, roadmap_id: roadmapId }).then(res => { setNodes(nds => nds.concat({ id: res.data.id, type: 'pathio', position: { x: res.data.pos_x, y: res.data.pos_y }, data: { label: res.data.title, status: 'todo' } })); setDialog({ isOpen: false }); }).catch(err => { if (err.response?.status === 402) { setDialog({ isOpen: false }); return; } }); } });
  }, [screenToFlowPosition, setNodes, roadmapId, setDialog]);

  const handleNodeAction = async (action: any) => {
    if (!menu) return;
    const nodeId = menu.id; setMenu(null);
    if (action === 'delete') { setDialog({ isOpen: true, title: '确认删除节点', type: 'confirm', isDanger: true, onConfirm: async () => { try { await api.delete(`/nodes/${nodeId}`); setNodes(nds => nds.filter(n => n.id !== nodeId)); setDialog({ isOpen: false }); } catch (e) { alert("删除失败"); } } }); }
    else if (action === 'rename') { const cur = nodes.find(n => n.id === nodeId)?.data.label; setDialog({ isOpen: true, title: '重命名节点', type: 'input', defaultValue: cur, onConfirm: async (title: string) => { if (!title) return; try { await api.put(`/nodes/${nodeId}`, { title }); setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, label: title } } : n)); setDialog({ isOpen: false }); } catch (e) { alert("更新失败"); } } }); }
    else { try { await api.put(`/nodes/${nodeId}`, { status: action }); setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: action } } : n)); } catch (e) { alert("修改状态失败"); } }
  };

  const menuPosition = useMemo(() => menu ? {
    left: Math.max(CONTEXT_MENU_GAP, Math.min(menu.x + 5, window.innerWidth - CONTEXT_MENU_WIDTH - CONTEXT_MENU_GAP)),
    top: Math.max(CONTEXT_MENU_GAP, Math.min(menu.y + 5, window.innerHeight - CONTEXT_MENU_HEIGHT - CONTEXT_MENU_GAP)),
  } : null, [menu]);

  return (
    <div className={`flex-1 relative bg-white overflow-hidden transition-all duration-500 shadow-2xl ${isSidebarCollapsed ? 'rounded-none' : 'rounded-l-[2.5rem]'}`} style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden', outline: '1px solid transparent' }}>
      {menu && menuPosition && createPortal(
        <div className="fixed z-[999] bg-white/95 backdrop-blur-xl border border-gray-100 shadow-2xl rounded-2xl py-1.5 w-40 overflow-hidden animate-in fade-in zoom-in-95 duration-100" style={{ top: menuPosition.top, left: menuPosition.left }}>
          <button onClick={() => handleNodeAction('rename')} className="w-full text-left px-4 py-2 text-xs font-bold text-gray-600 hover:bg-pathio-50 transition-colors">重命名</button>
          <div className="h-px bg-gray-50 my-1 mx-2"></div>
          <button onClick={() => handleNodeAction('todo')} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-400 hover:bg-slate-50 uppercase tracking-tighter">待研究</button>
          <button onClick={() => handleNodeAction('doing')} className="w-full text-left px-4 py-2 text-xs font-bold text-blue-500 hover:bg-blue-50 uppercase tracking-tighter">探索中</button>
          <button onClick={() => handleNodeAction('done')} className="w-full text-left px-4 py-2 text-xs font-bold text-emerald-500 hover:bg-emerald-50 uppercase tracking-tighter">已沉淀</button>
          <div className="h-px bg-gray-50 my-1 mx-2"></div>
          <button onClick={() => handleNodeAction('delete')} className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 transition-colors">删除节点</button>
        </div>, document.body
      )}

      {/* 💡 核心滑动层：控制 Canvas 和 NoteView 的上下平滑滑动 */}
      <div className="w-full h-[200vh] transition-transform duration-700 cubic-bezier(0.65, 0, 0.35, 1)" style={{ transform: activeNode ? 'translateY(-50%) translateZ(0)' : 'translateY(0%) translateZ(0)', willChange: 'transform' }}>
        
        {/* 上半部分：主体视图 (Flow 或 Settings) */}
        <div className="w-full h-screen relative bg-white">
          <button onClick={onToggleSidebar} className="absolute top-6 left-6 z-10 p-2 bg-white/80 backdrop-blur-md border border-gray-100 rounded-xl shadow-sm hover:text-pathio-500 transition-all">{isSidebarCollapsed ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 5l7 7-7 7M5 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" /></svg> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 19l-7-7 7-7M19 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round" /></svg>}</button>

          {/* 💡 视图分流渲染 */}
          {roadmapId === 'settings' ? <OrgSettings /> : (
            <>
              <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={(p: Connection) => { if (roadmapId) { setEdges((eds) => addEdge(p, eds)); api.post('/edges', { ...p, roadmap_id: roadmapId }).catch(err => { if (err.response?.status === 402) return; }); } }} onNodeClick={(_e, node: any) => { setMenu(null); setActiveNode({ id: node.id, title: node.data.label }); }} onPaneClick={onPaneClick} onNodeContextMenu={(e, node: any) => { e.preventDefault(); setMenu({ id: node.id, x: e.clientX, y: e.clientY }); }} onNodeDragStop={(_e, node) => { api.put(`/nodes/${node.id}/position`, { pos_x: node.position.x, pos_y: node.position.y }); }} nodeTypes={NODE_TYPES} fitView>
                <Background color="#f1f5f9" gap={24} /><Controls />
              </ReactFlow>
              <div className="absolute top-6 right-6 z-10"><button onClick={async () => { if (!roadmapId) return; setShareStatus('copying'); const res = await api.get('/roadmaps'); const r = res.data.find((x: any) => x.id === roadmapId); if (r?.share_token) { await navigator.clipboard.writeText(`${window.location.origin}/share/${r.share_token}`); alert("链接已复制！"); } setShareStatus('idle'); }} className="px-5 py-2.5 bg-white/80 backdrop-blur-md border border-gray-100 rounded-2xl text-sm font-bold text-pathio-500 hover:bg-pathio-500 hover:text-white transition-all shadow-sm active:scale-95">{shareStatus === 'idle' ? '分享此路径' : '已复制！'}</button></div>
            </>
          )}
        </div>

        {/* 下半部分：笔记详情视图 */}
        <div className="w-full h-screen bg-white overflow-hidden">
          {activeNode && <NoteView nodeId={activeNode.id} nodeTitle={activeNode.title} onBack={() => setActiveNode(null)} nodes={nodes} edges={edges} />}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. 主程序入口
// ==========================================
export default function App() {
  const [authToken, setAuthToken] = useState(localStorage.getItem('token'));
  const [currentRoadmapId, setCurrentRoadmapId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const location = useLocation();
  const [dialog, setDialog] = useState<any>({ isOpen: false, title: '', type: 'input', onConfirm: () => { } });

  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 402) { setIsUpgradeModalOpen(true); }
        return Promise.reject(error);
      }
    );
    return () => api.interceptors.response.eject(interceptor);
  }, []);

  useEffect(() => { setAuthToken(localStorage.getItem('token')); }, [location]);

  return (
    <div className="w-screen h-screen selection:bg-pathio-100 selection:text-pathio-900 bg-gray-900">
      <Dialog {...dialog} onClose={() => setDialog({ ...dialog, isOpen: false })} />
      <UpgradeModal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} />
      
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