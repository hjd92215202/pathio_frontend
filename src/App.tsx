import { useCallback, useEffect, useState } from 'react';
import ReactFlow, { 
  Background, Controls, MiniMap, useNodesState, useEdgesState, ReactFlowProvider, useReactFlow, addEdge 
} from 'reactflow';
import type { Node, Edge as FlowEdge, Connection } from 'reactflow';
import 'reactflow/dist/style.css';
import { api } from './api';
import PathioNode from './components/PathioNode';
import NoteView from './components/NoteView'; 
import { Routes, Route, useLocation } from 'react-router-dom';
import ShareView from './components/ShareView';
import Home from './components/Home';
import AuthForm from './components/AuthForm';

const nodeTypes = { pathio: PathioNode };

function Canvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { screenToFlowPosition } = useReactFlow();
  const [activeNode, setActiveNode] = useState<{id: string, title: string} | null>(null);

  useEffect(() => {
    api.get('/nodes').then(res => {
      const formatted = res.data.map((n: any) => ({
        id: n.id, type: 'pathio',
        position: { x: n.pos_x, y: n.pos_y },
        data: { label: n.title },
      }));
      setNodes(formatted);
    });
    api.get('/edges').then(res => {
      const formattedEdges: FlowEdge[] = res.data.map((e: any) => ({
        id: e.id, source: e.source_node_id, target: e.target_node_id,
      }));
      setEdges(formattedEdges);
    });
  }, [setNodes, setEdges]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setActiveNode({ id: node.id, title: node.data.label });
  }, []);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge(params, eds));
    api.post('/edges', { source: params.source, target: params.target });
  }, [setEdges]);

  const onPaneClick = useCallback((event: React.MouseEvent) => {
    if (event.detail !== 2) return;
    const title = prompt('节点名称：', '新研究节点');
    if (!title || !title.trim()) return;
    const pos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    api.post('/nodes', { title, pos_x: pos.x, pos_y: pos.y }).then(res => {
      setNodes(nds => nds.concat({
        id: res.data.id, type: 'pathio',
        position: { x: res.data.pos_x, y: res.data.pos_y },
        data: { label: res.data.title },
      }));
    });
  }, [screenToFlowPosition, setNodes]);

  const onNodeDragStop = useCallback((_: any, node: Node) => {
    api.put(`/nodes/${node.id}/position`, { pos_x: node.position.x, pos_y: node.position.y });
  }, []);

  // 退出登录函数
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/'; // 强制刷新页面回到首页
  };

  return (
    <div className="relative w-screen h-[200vh] transition-transform duration-700 ease-in-out overflow-hidden"
         style={{ transform: activeNode ? 'translateY(-50%)' : 'translateY(0%)' }}>
      
      <div className="w-full h-screen relative">
        <ReactFlow
          nodes={nodes} edges={edges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onNodeDragStop={onNodeDragStop} onPaneClick={onPaneClick}
          onConnect={onConnect} onNodeClick={onNodeClick}
          nodeTypes={nodeTypes} fitView
        >
          <Background color="#aaa" gap={20} />
          <Controls />
          <MiniMap />
        </ReactFlow>
        <div className="absolute top-6 left-6 pointer-events-none flex flex-col gap-1">
          <h2 className="text-2xl font-black text-pathio-900 opacity-80 italic">PATHIO</h2>
        </div>
        {/* 退出按钮 */}
        <button 
          onClick={handleLogout}
          className="absolute top-6 right-6 px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-400 hover:text-red-500 shadow-sm transition-all"
        >
          退出空间
        </button>
      </div>

      <div className="w-full h-screen">
        {activeNode && (
          <NoteView nodeId={activeNode.id} nodeTitle={activeNode.title} onBack={() => setActiveNode(null)} />
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [authToken, setAuthToken] = useState(localStorage.getItem('token'));
  const location = useLocation();

  // 每当路由变化时（比如从 /login 跳转到 /），重新检查 Token
  useEffect(() => {
    setAuthToken(localStorage.getItem('token'));
  }, [location]);

  return (
    <Routes>
      <Route path="/" element={authToken ? <ReactFlowProvider><Canvas /></ReactFlowProvider> : <Home />} />
      <Route path="/login" element={<AuthForm mode="login" />} />
      <Route path="/register" element={<AuthForm mode="register" />} />
      <Route path="/share/:token" element={<ShareView />} />
    </Routes>
  );
}