import { useCallback, useEffect, useState } from 'react';
import ReactFlow, { 
  Background, Controls, MiniMap, useNodesState, useEdgesState, ReactFlowProvider, useReactFlow, addEdge 
} from 'reactflow';
import type { Node, Edge as FlowEdge, Connection } from 'reactflow';
import 'reactflow/dist/style.css';
import { api } from './api';
import PathioNode from './components/PathioNode';
import NoteView from './components/NoteView'; // 引入新组件

const nodeTypes = { pathio: PathioNode };

function Canvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { screenToFlowPosition } = useReactFlow();

  // 控制视图状态
  const [activeNode, setActiveNode] = useState<{id: string, title: string} | null>(null);

  // 初始化加载数据
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

  // 处理节点点击：进入沉淀模式
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

  return (
    <div className="relative w-screen h-[200vh] transition-transform duration-700 ease-in-out overflow-hidden"
         style={{ transform: activeNode ? 'translateY(-50%)' : 'translateY(0%)' }}>
      
      {/* 视图1：画布 */}
      <div className="w-full h-screen relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={onNodeDragStop}
          onPaneClick={onPaneClick}
          onConnect={onConnect}
          onNodeClick={onNodeClick} // 注册节点点击事件
          nodeTypes={nodeTypes}
          fitView
        >
          <Background color="#aaa" gap={20} />
          <Controls />
          <MiniMap />
        </ReactFlow>
        {/* 顶部简单的装饰性标题 */}
        <div className="absolute top-6 left-6 pointer-events-none">
          <h2 className="text-2xl font-bold text-gray-800 opacity-50">知径 Pathio</h2>
        </div>
      </div>

      {/* 视图2：沉淀模式 */}
      <div className="w-full h-screen">
        {activeNode && (
          <NoteView 
            nodeId={activeNode.id} 
            nodeTitle={activeNode.title} 
            onBack={() => setActiveNode(null)} 
          />
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <Canvas />
    </ReactFlowProvider>
  );
}