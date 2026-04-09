import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { PathioNodeType } from '../types';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  todo: { label: '待研究', color: 'bg-slate-100 text-slate-500' },
  doing: { label: '探索中', color: 'bg-blue-100 text-blue-600' },
  done: { label: '已沉淀', color: 'bg-emerald-100 text-emerald-600' },
};

export default function PathioNode({ data, selected }: NodeProps<PathioNodeType>) {
  const currentStatus = data.status || 'todo';
  const statusStyle = STATUS_MAP[currentStatus] || STATUS_MAP.todo;

  return (
    <div
      className={`relative px-3 py-2 bg-white border rounded-xl transition-all duration-300 w-36 shadow-sm select-none ${
        selected ? 'border-pathio-500 shadow-md ring-1 ring-pathio-500/20' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${statusStyle.color}`}>
          {statusStyle.label}
        </div>
        {selected && <div className="w-1 h-1 rounded-full bg-pathio-500 animate-ping"></div>}
      </div>

      <div className="text-xs font-bold text-gray-800 leading-tight truncate">{data.label}</div>

      <Handle
        type="target"
        position={Position.Top}
        className="!w-1.5 !h-1.5 !bg-white !border !border-gray-300 !top-[-4px] hover:!border-pathio-500 transition-colors"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-1.5 !h-1.5 !bg-white !border !border-gray-300 !bottom-[-4px] hover:!border-pathio-500 transition-colors"
      />
    </div>
  );
}

