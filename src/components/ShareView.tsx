// frontend/src/components/ShareView.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ReactFlow, Background, Controls, useNodesState, useEdgesState, type Node, type Edge } from '@xyflow/react';
import { api } from '../api';
import PathioNode from './PathioNode';
import NoteView from './NoteView';

// 彻底消除 React Flow 重绘警告
const NODE_TYPES = { pathio: PathioNode };

type ShareNodeData = { label: string; status: string };
type ShareNodeType = Node<ShareNodeData, 'pathio'>;
type ShareEdgeType = Edge;

export default function ShareView() {
  const { token } = useParams();
  
  // 💡 修复：去掉了未使用的 onNodesChange 和 onEdgesChange
  const [nodes, setNodes] = useNodesState<ShareNodeType>([]);
  const [edges, setEdges] = useEdgesState<ShareEdgeType>([]);
  
  const [title, setTitle] = useState('正在加载知识图谱...');
  const [activeNode, setActiveNode] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    api
      .get(`/share/${token}`)
      .then((res) => {
        setTitle(res.data.roadmap_title);
        setNodes(
          res.data.nodes.map((n: any): ShareNodeType => ({
            id: n.id,
            type: 'pathio',
            position: { x: n.pos_x, y: n.pos_y },
            data: { label: n.title, status: n.status },
          }))
        );
        setEdges(
          res.data.edges.map((e: any): ShareEdgeType => ({
            id: e.id,
            source: e.source_node_id,
            target: e.target_node_id,
          }))
        );
      })
      .catch(() => {
        setTitle('该分享链接已失效或不存在');
      });
  }, [token, setNodes, setEdges]);

  return (
    <div className="w-screen h-screen bg-[#F8FAFC] overflow-hidden">
      {/* 核心滑动容器，应用抗锯齿组合拳 */}
      <div
        className="w-full h-[200vh] transition-transform duration-700 cubic-bezier(0.65, 0, 0.35, 1)"
        style={{ 
          transform: activeNode ? 'translateY(-50%) translateZ(0)' : 'translateY(0%) translateZ(0)',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          outline: '1px solid transparent'
        }}
      >
        {/* 视图 1：沉浸式只读画布 */}
        <div className="w-full h-screen relative bg-[#F8FAFC]">
          {/* 顶部引流 Banner */}
          <header className="absolute top-0 left-0 w-full bg-white/70 backdrop-blur-xl border-b border-gray-100 py-4 px-8 z-50 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-4">
              <div className="font-black tracking-tighter text-2xl text-pathio-900 italic uppercase leading-none">Pathio</div>
              <div className="h-4 w-px bg-gray-200"></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">正在查阅</span>
                <span className="text-sm font-bold text-gray-700 truncate max-w-[200px] leading-none">{title}</span>
              </div>
            </div>
            
            <a
              href="/"
              className="bg-pathio-500 text-white px-6 py-2.5 rounded-2xl text-xs font-black shadow-lg shadow-pathio-500/20 hover:scale-105 active:scale-95 transition-all"
            >
              我也要构建知识路径图 →
            </a>
          </header>

          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={NODE_TYPES}
            onNodeClick={(_e, node) => setActiveNode({ id: node.id, title: node.data.label })}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag={true}
            fitView
          >
            <Background color="#CBD5E1" gap={32} size={1} />
            <Controls showInteractive={false} position="bottom-right" className="!bg-white !border-none !shadow-xl !rounded-2xl overflow-hidden" />
          </ReactFlow>

          {/* 底部品牌水印 */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none text-[10px] text-gray-300 font-bold tracking-[0.4em] uppercase text-center">
            Powered by Pathio Engine
          </div>
        </div>

        {/* 视图 2：只读详情（NoteView） */}
        <div className="w-full h-screen relative bg-white">
          {activeNode && (
            <NoteView
              nodeId={activeNode.id}
              nodeTitle={activeNode.title}
              onBack={() => setActiveNode(null)}
              readOnly={true}
              shareToken={token}
              nodes={nodes}
              edges={edges}
            />
          )}
          
          <button
            onClick={() => setActiveNode(null)}
            className="absolute bottom-10 right-10 w-14 h-14 bg-gray-900 text-white shadow-2xl rounded-2xl flex flex-col items-center justify-center hover:bg-pathio-500 transition-all z-50 group active:scale-90"
          >
            <svg
              className="w-6 h-6 group-hover:-translate-y-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
            </svg>
            <span className="text-[8px] font-black mt-1 tracking-tighter">BACK</span>
          </button>
        </div>
      </div>
    </div>
  );
}