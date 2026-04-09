import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ReactFlow, Background, Controls, useNodesState, useEdgesState } from '@xyflow/react';
import { api } from '../api';
import PathioNode from './PathioNode';
import NoteView from './NoteView';
import type { PathioEdgeType, PathioNodeType, ShareRoadmapResponse } from '../types';

const NODE_TYPES = { pathio: PathioNode };

export default function ShareView() {
  const { token } = useParams();
  const [nodes, setNodes] = useNodesState<PathioNodeType>([]);
  const [edges, setEdges] = useEdgesState<PathioEdgeType>([]);
  const [title, setTitle] = useState(token ? '正在加载知识图谱...' : '该分享链接已失效或不存在');
  const [activeNode, setActiveNode] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    if (!token) return;

    api
      .get<ShareRoadmapResponse>(`/share/${token}`)
      .then((res) => {
        setTitle(res.data.roadmap_title);
        setNodes(
          res.data.nodes.map((node): PathioNodeType => ({
            id: node.id,
            type: 'pathio',
            position: { x: node.pos_x, y: node.pos_y },
            data: { label: node.title, status: node.status },
          }))
        );
        setEdges(
          res.data.edges.map((edge): PathioEdgeType => ({
            id: edge.id,
            source: edge.source_node_id,
            target: edge.target_node_id,
          }))
        );
      })
      .catch(() => {
        setTitle('该分享链接已失效或不存在');
      });
  }, [token, setNodes, setEdges]);

  return (
    <div className="w-screen h-screen bg-[#F8FAFC] overflow-hidden">
      <div
        className="w-full h-[200vh] transition-transform duration-700 cubic-bezier(0.65, 0, 0.35, 1)"
        style={{
          transform: activeNode ? 'translateY(-50%) translateZ(0)' : 'translateY(0%) translateZ(0)',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          outline: '1px solid transparent',
        }}
      >
        <div className="w-full h-screen relative bg-[#F8FAFC]">
          <header className="absolute top-0 left-0 w-full bg-white/70 backdrop-blur-xl border-b border-gray-100 py-4 px-8 z-50 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-4">
              <div className="font-black tracking-tighter text-2xl text-pathio-900 italic uppercase leading-none">Pathio</div>
              <div className="h-4 w-px bg-gray-200"></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">正在查阅</span>
                <span className="text-sm font-bold text-gray-700 truncate max-w-[200px] leading-none">{title}</span>
              </div>
            </div>
            <a href="/" className="bg-pathio-500 text-white px-6 py-2.5 rounded-2xl text-xs font-black shadow-lg hover:scale-105 transition-all">
              我也要构建路线图 →
            </a>
          </header>

          <ReactFlow<PathioNodeType, PathioEdgeType>
            nodes={nodes}
            edges={edges}
            nodeTypes={NODE_TYPES}
            onNodeClick={(_event, node) => setActiveNode({ id: node.id, title: node.data.label })}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag={true}
            fitView
          >
            <Background color="#CBD5E1" gap={32} size={1} />
            <Controls showInteractive={false} position="bottom-right" className="!bg-white !border-none !shadow-xl !rounded-2xl overflow-hidden" />
          </ReactFlow>
        </div>

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
          <button onClick={() => setActiveNode(null)} className="absolute bottom-10 right-10 w-14 h-14 bg-gray-900 text-white shadow-2xl rounded-2xl flex flex-col items-center justify-center hover:bg-pathio-500 transition-all z-50 group">
            <svg className="w-6 h-6 group-hover:-translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
            <span className="text-[8px] font-black mt-1 tracking-tighter">BACK</span>
          </button>
        </div>
      </div>
    </div>
  );
}



