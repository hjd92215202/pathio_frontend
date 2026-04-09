import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ReactFlow, Background, Controls, useNodesState, useEdgesState, ReactFlowProvider, useReactFlow, addEdge, type Connection } from '@xyflow/react';
import { isAxiosError } from 'axios';
import '@xyflow/react/dist/style.css';
import { api } from './api';
import PathioNode from './components/PathioNode';
import NoteView from './components/NoteView';
import { Routes, Route } from 'react-router-dom';
import ShareView from './components/ShareView';
import Home from './components/Home';
import AuthForm from './components/AuthForm';
import OrgSettings from './components/OrgSettings';
import Sidebar from './components/Sidebar';
import type { DialogConfig, DialogType, EdgeDto, NodeDto, PathioEdgeType, PathioNodeType, RoadmapSummary } from './types';

const NODE_TYPES = { pathio: PathioNode };
const CONTEXT_MENU_WIDTH = 160;
const CONTEXT_MENU_HEIGHT = 220;
const CONTEXT_MENU_GAP = 8;

type NodeAction = 'rename' | 'delete' | 'todo' | 'doing' | 'done';

interface AppDialogProps extends DialogConfig {
  onClose: () => void;
}

interface CanvasViewportProps {
  roadmapId: string | null;
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
  setDialog: React.Dispatch<React.SetStateAction<DialogConfig>>;
  setGlobalOrgName: (name: string) => void;
}

function UpgradeModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="p-12 bg-gray-900 text-white flex flex-col justify-center relative overflow-hidden">
            <div className="relative z-10">
              <span className="text-pathio-500 font-black text-[10px] uppercase tracking-[0.4em] mb-4 block">Upgrade to Pro</span>
              <h2 className="text-4xl font-black italic mb-6 leading-tight uppercase text-white">释放团队的<br/>无限创造力</h2>
              <div className="space-y-4 mb-8">
                {['无限路线图空间', '不限数量的协作席位', '高级分享权限', '专属技术支持'].map((feature) => (
                  <div key={feature} className="flex items-center gap-3 text-xs font-bold opacity-90 text-white">
                    <div className="w-5 h-5 rounded-full bg-pathio-500 flex items-center justify-center text-white font-black">✓</div>
                    {feature}
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-pathio-500/20 rounded-full blur-3xl"></div>
          </div>
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
            <button className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black hover:bg-pathio-500 shadow-xl active:scale-95 mb-6 uppercase tracking-widest text-xs transition-all">立即升级方案</button>
            <button onClick={onClose} className="w-full text-xs font-bold text-gray-300 hover:text-gray-500 transition-colors uppercase tracking-[0.2em]">稍后再说</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Dialog({ isOpen, title, placeholder, defaultValue, type, onClose, onConfirm, isDanger }: AppDialogProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const value = type === 'input' ? inputRef.current?.value ?? defaultValue ?? '' : undefined;
    onConfirm(value);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}></div>
      <div className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95 duration-200 text-slate-900">
        <h3 className="text-xl font-black mb-6 text-center tracking-tight">{title}</h3>
        {type === 'input' && (
          <input
            ref={inputRef}
            autoFocus
            className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-pathio-500 outline-none mb-8 font-bold transition-all text-slate-800"
            placeholder={placeholder}
            defaultValue={defaultValue || ''}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onConfirm(e.currentTarget.value);
              }
            }}
          />
        )}
        {type === 'confirm' && <p className="text-gray-400 text-sm font-medium text-center mb-8 px-4 leading-relaxed">此操作不可逆，请确认是否继续执行？</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-4 rounded-2xl font-bold text-gray-400 hover:bg-gray-50 transition-colors uppercase text-xs tracking-widest">取消</button>
          <button
            onClick={handleConfirm}
            className={`flex-1 py-4 rounded-2xl font-bold text-white shadow-lg transition-all active:scale-95 uppercase text-xs tracking-widest ${isDanger ? 'bg-red-500 shadow-red-500/20 hover:bg-red-600' : 'bg-gray-900 shadow-gray-900/20 hover:bg-pathio-500'}`}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}

function CanvasViewport({ roadmapId, onToggleSidebar, isSidebarCollapsed, setDialog, setGlobalOrgName }: CanvasViewportProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<PathioNodeType>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<PathioEdgeType>([]);
  const { screenToFlowPosition } = useReactFlow();
  const [activeNode, setActiveNode] = useState<{ id: string; title: string; roadmapId: string | null } | null>(null);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number; roadmapId: string | null } | null>(null);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copying'>('idle');

  const visibleActiveNode = useMemo(
    () => (activeNode && activeNode.roadmapId === roadmapId ? { id: activeNode.id, title: activeNode.title } : null),
    [activeNode, roadmapId]
  );

  const visibleMenu = useMemo(
    () => (menu && menu.roadmapId === roadmapId ? menu : null),
    [menu, roadmapId]
  );

  useEffect(() => {
    if (!roadmapId || roadmapId === 'settings') return;

    api.get<NodeDto[]>(`/nodes?roadmap_id=${roadmapId}`).then((res) => {
      setNodes(
        res.data.map((node): PathioNodeType => ({
          id: node.id,
          type: 'pathio',
          position: { x: node.pos_x, y: node.pos_y },
          data: { label: node.title, status: node.status },
        }))
      );
    });

    api.get<EdgeDto[]>(`/edges?roadmap_id=${roadmapId}`).then((res) => {
      setEdges(
        res.data.map((edge): PathioEdgeType => ({
          id: edge.id,
          source: edge.source_node_id,
          target: edge.target_node_id,
        }))
      );
    });
  }, [roadmapId, setNodes, setEdges]);

  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      setMenu(null);
      if (event.detail !== 2 || !roadmapId || roadmapId === 'settings') return;

      const pos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setDialog({
        isOpen: true,
        title: '新建研究节点',
        type: 'input',
        defaultValue: '新节点',
        onConfirm: (title?: string) => {
          const nodeTitle = title?.trim();
          if (!nodeTitle) return;

          api
            .post<NodeDto>('/nodes', {
              title: nodeTitle,
              pos_x: pos.x,
              pos_y: pos.y,
              roadmap_id: roadmapId,
            })
            .then((res) => {
              setNodes((prev) =>
                prev.concat({
                  id: res.data.id,
                  type: 'pathio',
                  position: { x: res.data.pos_x, y: res.data.pos_y },
                  data: { label: res.data.title, status: 'todo' },
                })
              );
              setDialog((prev) => ({ ...prev, isOpen: false }));
            })
            .catch((error: unknown) => {
              if (isAxiosError(error) && error.response?.status === 402) {
                setDialog((prev) => ({ ...prev, isOpen: false }));
              }
            });
        },
      });
    },
    [screenToFlowPosition, setNodes, roadmapId, setDialog]
  );

  const handleNodeAction = async (action: NodeAction) => {
    if (!visibleMenu) return;

    const nodeId = visibleMenu.id;
    setMenu(null);

    if (action === 'delete') {
      setDialog({
        isOpen: true,
        title: '确认删除节点',
        type: 'confirm',
        isDanger: true,
        onConfirm: async () => {
          try {
            await api.delete(`/nodes/${nodeId}`);
            setNodes((prev) => prev.filter((node) => node.id !== nodeId));
            setDialog((prev) => ({ ...prev, isOpen: false }));
          } catch {
            alert('删除失败');
          }
        },
      });
      return;
    }

    if (action === 'rename') {
      const currentTitle = nodes.find((node) => node.id === nodeId)?.data.label;
      setDialog({
        isOpen: true,
        title: '重命名节点',
        type: 'input',
        defaultValue: currentTitle,
        onConfirm: async (title?: string) => {
          const nextTitle = title?.trim();
          if (!nextTitle) return;

          try {
            await api.put(`/nodes/${nodeId}`, { title: nextTitle });
            setNodes((prev) => prev.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, label: nextTitle } } : node)));
            setDialog((prev) => ({ ...prev, isOpen: false }));
          } catch {
            alert('更新失败');
          }
        },
      });
      return;
    }

    try {
      await api.put(`/nodes/${nodeId}`, { status: action });
      setNodes((prev) => prev.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, status: action } } : node)));
    } catch {
      alert('修改状态失败');
    }
  };

  const menuPosition = useMemo(
    () =>
      visibleMenu
        ? {
            left: Math.max(CONTEXT_MENU_GAP, Math.min(visibleMenu.x + 5, window.innerWidth - CONTEXT_MENU_WIDTH - CONTEXT_MENU_GAP)),
            top: Math.max(CONTEXT_MENU_GAP, Math.min(visibleMenu.y + 5, window.innerHeight - CONTEXT_MENU_HEIGHT - CONTEXT_MENU_GAP)),
          }
        : null,
    [visibleMenu]
  );

  return (
    <div className={`flex-1 relative bg-white overflow-hidden transition-all duration-500 shadow-2xl ${isSidebarCollapsed ? 'rounded-none' : 'rounded-l-[2.5rem]'}`} style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden', outline: '1px solid transparent' }}>
      {visibleMenu && menuPosition && createPortal(
        <div className="fixed z-[999] bg-white/95 backdrop-blur-xl border border-gray-100 shadow-2xl rounded-2xl py-1.5 w-40 overflow-hidden animate-in fade-in zoom-in-95 duration-100" style={{ top: menuPosition.top, left: menuPosition.left }}>
          <button onClick={() => handleNodeAction('rename')} className="w-full text-left px-4 py-2 text-xs font-bold text-gray-600 hover:bg-pathio-50 transition-colors">重命名</button>
          <div className="h-px bg-gray-50 my-1 mx-2"></div>
          <button onClick={() => handleNodeAction('todo')} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-400 hover:bg-slate-50 uppercase tracking-tighter">待研究</button>
          <button onClick={() => handleNodeAction('doing')} className="w-full text-left px-4 py-2 text-xs font-bold text-blue-500 hover:bg-blue-50 uppercase tracking-tighter">探索中</button>
          <button onClick={() => handleNodeAction('done')} className="w-full text-left px-4 py-2 text-xs font-bold text-emerald-500 hover:bg-emerald-50 uppercase tracking-tighter">已沉淀</button>
          <div className="h-px bg-gray-50 my-1 mx-2"></div>
          <button onClick={() => handleNodeAction('delete')} className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-400 hover:bg-red-50 transition-colors">删除节点</button>
        </div>, document.body
      )}

      <div className="w-full h-[200vh] transition-transform duration-700 cubic-bezier(0.65, 0, 0.35, 1)" style={{ transform: visibleActiveNode ? 'translateY(-50%)' : 'translateY(0%)', willChange: 'transform' }}>
        <div className="w-full h-screen relative bg-white overflow-hidden">
          <button onClick={onToggleSidebar} className="absolute top-6 left-6 z-10 p-2 bg-white/80 backdrop-blur-md border border-gray-100 rounded-xl shadow-sm hover:text-pathio-500 transition-all">{isSidebarCollapsed ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 5l7 7-7 7M5 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" /></svg> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 19l-7-7 7-7M19 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round" /></svg>}</button>
          {roadmapId === 'settings' ? <OrgSettings setGlobalOrgName={setGlobalOrgName} /> : (
            <>
              <ReactFlow<PathioNodeType, PathioEdgeType>
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={(params: Connection) => {
                  if (!roadmapId) return;
                  setEdges((prev) => addEdge(params, prev));
                  api.post('/edges', { ...params, roadmap_id: roadmapId }).catch((error: unknown) => {
                    if (isAxiosError(error) && error.response?.status === 402) {
                      return;
                    }
                  });
                }}
                onNodeClick={(_event, node) => {
                  setMenu(null);
                  setActiveNode({ id: node.id, title: node.data.label, roadmapId });
                }}
                onPaneClick={onPaneClick}
                onNodeContextMenu={(event, node) => {
                  event.preventDefault();
                  setMenu({ id: node.id, x: event.clientX, y: event.clientY, roadmapId });
                }}
                onNodeDragStop={(_event, node) => {
                  api.put(`/nodes/${node.id}/position`, { pos_x: node.position.x, pos_y: node.position.y });
                }}
                nodeTypes={NODE_TYPES}
                fitView
              >
                <Background color="#f1f5f9" gap={24} />
                <Controls />
              </ReactFlow>
              <div className="absolute top-6 right-6 z-10">
                <button
                  onClick={async () => {
                    if (!roadmapId) return;

                    setShareStatus('copying');
                    try {
                      const res = await api.get<RoadmapSummary[]>('/roadmaps');
                      const roadmap = res.data.find((item) => item.id === roadmapId);
                      if (roadmap?.share_token) {
                        await navigator.clipboard.writeText(`${window.location.origin}/share/${roadmap.share_token}`);
                        alert('链接已复制！');
                      }
                    } finally {
                      setShareStatus('idle');
                    }
                  }}
                  className="px-5 py-2.5 bg-white/80 backdrop-blur-md border border-gray-100 rounded-2xl text-sm font-bold text-pathio-500 hover:bg-pathio-500 hover:text-white transition-all shadow-sm active:scale-95"
                >
                  {shareStatus === 'idle' ? '分享此路径' : '已复制！'}
                </button>
              </div>
            </>
          )}
        </div>
        <div className="w-full h-screen bg-white overflow-hidden">
          {visibleActiveNode && <NoteView nodeId={visibleActiveNode.id} nodeTitle={visibleActiveNode.title} onBack={() => setActiveNode(null)} nodes={nodes} edges={edges} />}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const authToken = localStorage.getItem('token');
  const [currentRoadmapId, setCurrentRoadmapId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [orgName, setOrgName] = useState('My Workspace');
  const [dialog, setDialog] = useState<DialogConfig>({ isOpen: false, title: '', type: 'input' as DialogType, onConfirm: () => {} });

  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 402) {
          setIsUpgradeModalOpen(true);
        }
        return Promise.reject(error);
      }
    );
    return () => api.interceptors.response.eject(interceptor);
  }, []);

  useEffect(() => {
    if (!authToken) return;

    api
      .get<{ name: string }>('/org/details')
      .then((res) => setOrgName(res.data.name))
      .catch(() => {});
  }, [authToken]);

  return (
    <div className="w-screen h-screen selection:bg-pathio-100 selection:text-pathio-900 bg-gray-900 overflow-hidden">
      <Dialog {...dialog} onClose={() => setDialog((prev) => ({ ...prev, isOpen: false }))} />
      <UpgradeModal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} />
      <Routes>
        <Route path="/" element={authToken ? (
          <div className="flex w-full h-full overflow-hidden bg-gray-900 transition-all duration-300">
            <Sidebar orgName={orgName} currentId={currentRoadmapId} onSelect={setCurrentRoadmapId} isCollapsed={isSidebarCollapsed} setDialog={setDialog} />
            <ReactFlowProvider>
              <CanvasViewport roadmapId={currentRoadmapId} onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} isSidebarCollapsed={isSidebarCollapsed} setDialog={setDialog} setGlobalOrgName={setOrgName} />
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



