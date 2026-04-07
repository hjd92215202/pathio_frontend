// frontend/src/components/NoteView.tsx
import { useEffect, useState } from 'react';
import { api } from '../api';

interface NoteViewProps {
  nodeId: string;
  nodeTitle: string;
  onBack: () => void;
}

export default function NoteView({ nodeId, nodeTitle, onBack }: NoteViewProps) {
  // 状态改为存储 text 字符串，但在发送时封装成对象
  const [text, setText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    api.get(`/nodes/${nodeId}/note`).then(res => {
      // 从 JSONB 对象中提取 text 字段
      setText(res.data.content?.text || '');
    });
  }, [nodeId]);

  const handleSave = () => {
    setIsSaving(true);
    // 将内容封装为 JSON 对象发送
    api.put(`/nodes/${nodeId}/note`, { 
      content: { text: text } 
    }).finally(() => {
      setTimeout(() => setIsSaving(false), 500);
    });
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* 顶部导航 */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-gray-50">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="group flex items-center gap-2 text-gray-400 hover:text-pathio-500 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7 7-7" /></svg>
            <span className="text-sm font-medium">返回画布</span>
          </button>
          <div className="h-4 w-px bg-gray-200"></div>
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">{nodeTitle}</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400">
            {isSaving ? '正在同步至云端...' : '所有更改已保存'}
          </span>
          <button 
            onClick={handleSave} 
            className="px-5 py-2 bg-gray-900 text-white text-sm font-bold rounded-full hover:bg-pathio-500 transition-all shadow-sm active:scale-95"
          >
            保存沉淀
          </button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* 左侧：目录 (类似 Notion 的 Sidebar) */}
        <aside className="w-64 border-r border-gray-50 p-8 hidden md:block bg-gray-50/30">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2 h-2 rounded-full bg-pathio-500"></div>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">目录导航</h3>
          </div>
          <nav className="space-y-4">
            <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse"></div>
            <div className="h-4 w-1/2 bg-gray-100 rounded animate-pulse"></div>
          </nav>
        </aside>

        {/* 中间：沉浸式编辑器 */}
        <section className="flex-1 overflow-y-auto bg-white px-4">
          <div className="max-w-3xl mx-auto py-16">
            <textarea
              className="w-full min-h-[70vh] resize-none border-none focus:ring-0 text-gray-700 leading-relaxed text-xl placeholder-gray-200 outline-none font-serif"
              placeholder="点击这里，开始深度研究与记录..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
        </section>

        {/* 右侧：参考连接 (Side Panel) */}
        <aside className="w-80 border-l border-gray-50 p-8 hidden lg:block bg-white">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6">相关资料</h3>
          <div className="p-4 rounded-xl border border-dashed border-gray-200 text-center">
            <p className="text-xs text-gray-400 italic">暂无引用内容，在编辑器中使用 @ 链接资源 (开发中)</p>
          </div>
        </aside>
      </main>
    </div>
  );
}