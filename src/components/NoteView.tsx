// frontend/src/components/NoteView.tsx
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { api } from '../api';

interface Reference {
  id: string;
  node_id: string;
  title: string;
  url: string;
}

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

const TIPTAP_EXTENSIONS = [
  StarterKit,
  Underline,
  Placeholder.configure({
    placeholder: '在此记录你的研究成果...',
    emptyNodeClass: 'is-editor-empty',
  }),
];

export default function NoteView({ 
  nodeId, nodeTitle, onBack, readOnly = false, shareToken 
}: NoteViewProps) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [toc, setToc] = useState<{ text: string; level: number; pos: number }[]>([]);
  const [references, setReferences] = useState<Reference[]>([]);
  const [newRef, setNewRef] = useState({ title: '', url: '' });
  
  const [isLeftOpen, setIsLeftOpen] = useState(true);
  const [isRightOpen, setIsRightOpen] = useState(true);

  const isDirtyRef = useRef(false);
  const isLoadedRef = useRef(false); 
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tocTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. 刷新大纲
  const refreshTOC = useCallback((editorInstance: any) => {
    if (!editorInstance) return;
    const json = editorInstance.getJSON();
    const headings: any[] = [];
    json.content?.forEach((node: any, index: number) => {
      if (node.type === 'heading') {
        headings.push({
          text: node.content?.[0]?.text || '无标题',
          level: node.attrs?.level || 1,
          pos: index
        });
      }
    });
    setToc(headings);
  }, []);

  // 2. 核心持久化函数
  const persistContent = useCallback(async (content: any) => {
    if (readOnly || !isDirtyRef.current || !isLoadedRef.current) return;
    setSaveStatus('saving');
    try {
      await api.put(`/nodes/${nodeId}/note`, { content });
      setSaveStatus('saved');
      setLastSavedAt(new Date());
      isDirtyRef.current = false;
    } catch (e: any) {
      if (e.response?.status === 402) return;
      setSaveStatus('error');
    }
  }, [nodeId, readOnly]);

  // 3. 初始化编辑器
  const editor = useEditor({
    extensions: TIPTAP_EXTENSIONS,
    content: '',
    onUpdate: ({ editor }) => {
      if (!isLoadedRef.current) return;
      isDirtyRef.current = true;
      setSaveStatus('dirty');
      
      if (tocTimerRef.current) clearTimeout(tocTimerRef.current);
      tocTimerRef.current = setTimeout(() => refreshTOC(editor), 500);

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => persistContent(editor.getJSON()), 3000);
    },
  }, [nodeId, persistContent, refreshTOC]);

  // 4. 数据加载与清理
  useEffect(() => {
    if (!editor) return;
    isLoadedRef.current = false;
    setSaveStatus('idle');
    editor.setEditable(!readOnly);

    const noteUrl = readOnly && shareToken ? `/share/${shareToken}/notes/${nodeId}` : `/nodes/${nodeId}/note`;
    
    api.get(noteUrl).then(res => {
      let content = res.data.content;
      if (content?.blocks) {
        content = content.blocks.map((b: any) => `<p>${b.data?.text || ''}</p>`).join('');
      }
      editor.commands.setContent(content || '<p></p>');
      
      requestAnimationFrame(() => {
        refreshTOC(editor);
        isLoadedRef.current = true;
        isDirtyRef.current = false;
      });
    });

    api.get(`/nodes/${nodeId}/references`).then(res => setReferences(res.data || []));

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (tocTimerRef.current) clearTimeout(tocTimerRef.current);
      if (isDirtyRef.current && !readOnly && isLoadedRef.current) {
        api.put(`/nodes/${nodeId}/note`, { content: editor.getJSON() });
      }
    };
  }, [nodeId, editor, readOnly, shareToken, refreshTOC]);

  // 5. 局部滚动跳转
  const scrollToHeading = (index: number) => {
    if (!scrollContainerRef.current) return;
    const prose = scrollContainerRef.current.querySelector('.ProseMirror');
    const targetElement = prose?.children[index] as HTMLElement;
    if (targetElement) {
      const topOffset = targetElement.offsetTop - 40; 
      scrollContainerRef.current.scrollTo({ top: topOffset, behavior: 'smooth' });
    }
  };

  // 6. 引用管理
  const handleAddRef = async () => {
    if (!newRef.title || !newRef.url || readOnly) return;
    const res = await api.post(`/nodes/${nodeId}/references`, newRef);
    setReferences(prev => [res.data, ...prev]);
    setNewRef({ title: '', url: '' });
  };

  const handleDeleteRef = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (readOnly || !confirm("确定要移除这个参考资料吗？")) return;
    try {
      await api.delete(`/references/${id}`);
      setReferences(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      alert("删除失败");
    }
  };

  // 7. 💡 状态显示 (已修正调用 StandardDateFormat)
  const saveStatusText = useMemo(() => {
    if (readOnly) return '只读模式';
    switch (saveStatus) {
      case 'dirty': return '未保存...';
      case 'saving': return '正在同步...';
      case 'saved': return lastSavedAt ? `已保存于 ${StandardDateFormat(lastSavedAt)}` : '已同步';
      default: return '自动同步开启';
    }
  }, [readOnly, saveStatus, lastSavedAt]);

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      <header className="flex-shrink-0 flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-white z-20">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:text-pathio-500 transition-all rounded-xl hover:bg-slate-50 active:scale-90">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M10 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 italic">Knowledge Point</span>
            <h1 className="text-2xl font-black text-black tracking-tight leading-none">{nodeTitle}</h1>
          </div>
        </div>
        <div className="px-4 py-1.5 rounded-full bg-slate-50 border border-slate-200">
          <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">{saveStatusText}</span>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden bg-white">
        <aside className={`transition-all duration-500 border-r border-slate-100 bg-slate-50/30 flex flex-col shrink-0 ${isLeftOpen ? 'w-72' : 'w-14'}`}>
          <div className="p-4 flex items-center justify-between">
            {isLeftOpen && <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-2">目录大纲</span>}
            <button onClick={() => setIsLeftOpen(!isLeftOpen)} className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-xl text-slate-500 shadow-sm border border-slate-100">{isLeftOpen ? '«' : '»'}</button>
          </div>
          {isLeftOpen && (
            <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
              {toc.length === 0 ? <p className="text-[11px] text-slate-400 italic px-2">尚未编写标题...</p> : toc.map((item, i) => (
                <button key={i} onClick={() => scrollToHeading(item.pos)} className={`block w-full text-left py-2 px-3 rounded-xl transition-all hover:bg-white hover:text-pathio-500 ${item.level === 1 ? 'font-bold text-slate-900 text-sm' : 'pl-8 text-slate-500 text-xs font-medium'}`}>{item.text}</button>
              ))}
            </nav>
          )}
        </aside>

        <section ref={scrollContainerRef} className="flex-1 overflow-y-auto bg-white px-12 py-24 scroll-smooth custom-scrollbar relative">
          <div className="max-w-3xl mx-auto min-h-screen">
            <EditorContent editor={editor} className="outline-none text-slate-900" />
          </div>
        </section>

        <aside className={`transition-all duration-500 border-l border-slate-100 bg-white flex flex-col shrink-0 ${isRightOpen ? 'w-80' : 'w-14'}`}>
          <div className="p-4 flex items-center justify-between">
            <button onClick={() => setIsRightOpen(!isRightOpen)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-50 rounded-xl text-slate-400 shadow-sm border border-slate-100">{isRightOpen ? '»' : '«'}</button>
            {isRightOpen && <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest mr-2">Research Refs</span>}
          </div>
          {isRightOpen && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {!readOnly && (
                <div className="p-5 bg-slate-50 rounded-3xl space-y-3 shadow-inner border border-slate-100">
                  <input className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-pathio-500 text-slate-900 font-bold" placeholder="资料标题" value={newRef.title} onChange={e => setNewRef({...newRef, title: e.target.value})} />
                  <input className="w-full text-[10px] p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-pathio-500 text-slate-500 font-mono" placeholder="https://..." value={newRef.url} onChange={e => setNewRef({...newRef, url: e.target.value})} />
                  <button onClick={handleAddRef} className="w-full py-3 bg-black text-white text-[10px] font-black rounded-xl hover:bg-pathio-500 transition-all uppercase tracking-widest active:scale-95 shadow-lg">Add Ref</button>
                </div>
              )}
              <div className="space-y-4">
                {references.map(ref => (
                  <div key={ref.id} className="group relative p-4 bg-white border border-slate-200 rounded-2xl hover:border-pathio-300 hover:shadow-xl transition-all">
                    <a href={ref.url} target="_blank" rel="noreferrer" className="block pr-4">
                      <p className="text-xs font-bold text-slate-900 mb-1 leading-snug line-clamp-2">{ref.title}</p>
                      <p className="text-[9px] text-slate-500 truncate font-mono uppercase tracking-tighter">{ref.url}</p>
                    </a>
                    {!readOnly && (
                      <button onClick={(e) => handleDeleteRef(e, ref.id)} className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center bg-white border border-slate-100 rounded-full text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shadow-sm">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" /></svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

// 💡 确保此函数被 saveStatusText 正确调用
function StandardDateFormat(date: Date) {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
}