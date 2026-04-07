// frontend/src/components/NoteView.tsx
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { api } from '../api';

interface NoteViewProps {
  nodeId: string;
  nodeTitle: string;
  onBack: () => void;
  readOnly?: boolean;
  shareToken?: string;
  nodes: any[];
  edges: any[];
}

type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

// 💡 优化 1: 将扩展定义移出组件外部 (Static Definition)
// 这样可以确保扩展对象在 React 生命周期内只有一个引用，彻底消除 Duplicate 警告
const TIPTAP_EXTENSIONS = [
  StarterKit,
  Placeholder.configure({
    placeholder: '输入内容，或使用 "/" 唤出工具栏...',
    emptyNodeClass: 'is-editor-empty',
  }),
];

export default function NoteView({ 
  nodeId, nodeTitle, onBack, readOnly = false, shareToken, nodes, edges 
}: NoteViewProps) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [toc, setToc] = useState<{ text: string; level: number; id: string }[]>([]);
  const isDirtyRef = useRef(false);

  // 溯源逻辑 (Memoized)
  const trace = useMemo(() => {
    const precursors = edges.filter(e => e.target === nodeId).map(e => nodes.find(n => n.id === e.source)).filter(Boolean);
    const successors = edges.filter(e => e.source === nodeId).map(e => nodes.find(n => n.id === e.target)).filter(Boolean);
    return { precursors, successors };
  }, [nodeId, nodes, edges]);

  // 核心保存函数
  const persistContent = useCallback(async (content: any) => {
    if (readOnly || !isDirtyRef.current) return;
    setSaveStatus('saving');
    try {
      await api.put(`/nodes/${nodeId}/note`, { content });
      setSaveStatus('saved');
      setLastSavedAt(new Date());
      isDirtyRef.current = false;
    } catch (e) {
      setSaveStatus('error');
    }
  }, [nodeId, readOnly]);

  // 💡 优化 2: useEditor 此时不再依赖 readOnly
  const editor = useEditor({
    extensions: TIPTAP_EXTENSIONS,
    content: '',
    onUpdate: ({ editor }) => {
      isDirtyRef.current = true;
      setSaveStatus('dirty');
      
      // 生成大纲
      const headings: any[] = [];
      editor.getJSON().content?.forEach((node: any) => {
        if (node.type === 'heading') {
          headings.push({
            text: node.content?.[0]?.text || '无标题',
            level: node.attrs?.level || 1,
            id: Math.random().toString(36).substr(2, 9)
          });
        }
      });
      setToc(headings);
    },
  }, []); // 💡 空依赖，保证编辑器实例只创建一次

  // 💡 优化 3: 动态同步只读状态与数据加载
  useEffect(() => {
    if (!editor) return;

    // 动态设置编辑状态，而不是销毁重建
    editor.setEditable(!readOnly);

    const url = readOnly && shareToken ? `/share/${shareToken}/notes/${nodeId}` : `/nodes/${nodeId}/note`;
    
    let isCancelled = false;
    api.get(url).then(res => {
      if (isCancelled) return;
      let content = res.data.content;
      
      // 兼容旧 Editor.js 数据
      if (content?.blocks) {
        content = content.blocks.map((b: any) => `<p>${b.data?.text || ''}</p>`).join('');
      }
      
      editor.commands.setContent(content || '<p></p>');
      setSaveStatus('idle');
      isDirtyRef.current = false;
    });

    const interval = setInterval(() => {
      if (isDirtyRef.current && !readOnly) {
        persistContent(editor.getJSON());
      }
    }, 4000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [nodeId, editor, readOnly, shareToken, persistContent]);

  // 状态文本
  const saveStatusText = useMemo(() => {
    if (readOnly) return '只读模式';
    switch (saveStatus) {
      case 'dirty': return '未保存...';
      case 'saving': return '同步中...';
      case 'saved': return lastSavedAt ? `已保存 ${lastSavedAt.toLocaleTimeString()}` : '已保存';
      case 'error': return '同步失败';
      default: return '自动同步已开启';
    }
  }, [readOnly, saveStatus, lastSavedAt]);

  return (
    <div className="flex flex-col h-screen bg-white shadow-inner">
      <header className="flex items-center justify-between px-8 py-5 border-b border-gray-50 bg-white/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-pathio-500 transition-all rounded-full hover:bg-gray-50">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest leading-none mb-1">正在查阅节点</span>
            <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none">{nodeTitle}</h1>
          </div>
        </div>
        <div className="px-4 py-1.5 rounded-full bg-gray-50 border border-gray-100">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{saveStatusText}</span>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* 左翼：大纲 */}
        <aside className="w-64 border-r border-gray-50 p-8 hidden md:block overflow-y-auto bg-gray-50/10">
          <div className="flex items-center gap-2 mb-8 opacity-40">
             <div className="w-1 h-3 bg-pathio-500 rounded-full"></div>
             <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">内容大纲</h3>
          </div>
          <nav className="space-y-4">
            {toc.length === 0 ? <p className="text-[11px] text-gray-300 italic">尚未编写标题...</p> : toc.map((item) => (
              <div key={item.id} className={`text-sm transition-colors ${item.level === 1 ? 'font-bold text-gray-700' : 'pl-4 text-gray-400 text-xs'}`}>{item.text}</div>
            ))}
          </nav>
        </aside>

        {/* 主体：Tiptap 编辑器 */}
        <section className="flex-1 overflow-y-auto bg-white px-4 scroll-smooth">
          <div className="max-w-3xl mx-auto py-20 min-h-screen">
            <EditorContent editor={editor} className="outline-none" />
          </div>
        </section>

        {/* 右翼：溯源 */}
        <aside className="w-80 border-l border-gray-50 p-8 hidden lg:block overflow-y-auto">
          <div className="mb-12">
            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
               <div className="w-1 h-3 bg-blue-500 rounded-full"></div> 前置知识
            </h3>
            <div className="space-y-3">
              {trace.precursors.length === 0 ? <p className="text-xs text-gray-300 italic">探索的起点</p> : trace.precursors.map((n: any) => (
                <div key={n.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-600 shadow-sm transition-all hover:border-blue-200">← {n.data.label}</div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
               <div className="w-1 h-3 bg-emerald-500 rounded-full"></div> 后续探索
            </h3>
            <div className="space-y-3">
              {trace.successors.length === 0 ? <p className="text-xs text-gray-300 italic">尚未延伸</p> : trace.successors.map((n: any) => (
                <div key={n.id} className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 text-xs font-bold text-emerald-700 shadow-sm transition-all hover:border-emerald-300">→ {n.data.label}</div>
              ))}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
