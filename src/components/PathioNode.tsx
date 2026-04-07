// frontend/src/components/PathioNode.tsx
import { Handle, Position } from 'reactflow';

// 这是一个自定义的画布节点组件
export default function PathioNode({ data }: { data: any }) {
  return (
    <div className="group relative px-5 py-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 min-w-[160px] cursor-pointer">
      {/* 顶部的连线锚点 (Target) */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 bg-pathio-500 border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity" 
      />
      
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Node
        </span>
        <span className="text-sm font-medium text-gray-800">
          {data.label}
        </span>
      </div>

      {/* 底部的连线锚点 (Source) */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 bg-pathio-500 border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity" 
      />
    </div>
  );
}