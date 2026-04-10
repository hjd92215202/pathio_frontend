import { Component, useCallback, useEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import type { Editor, JSONContent } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Typography from '@tiptap/extension-typography';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Markdown } from '@tiptap/markdown';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { common, createLowlight } from 'lowlight';
import { isAxiosError } from 'axios';
import { api } from '../api';
import type { CanonicalNoteContent, NoteDocJson, NoteResponse, PathioEdgeType, PathioNodeType, Reference, ReferenceListResponse } from '../types';
import { extractMarkdownContent, looksLikeMarkdownClipboardText, normalizeLineBreaks } from '../utils/noteContent';
import { extractReferences, hasReferencePayload } from '../utils/references';

const lowlight = createLowlight(common);
const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6';
const TOC_SCROLL_OFFSET = 24;
const ACTIVE_TOC_OFFSET = 96;
const MAX_PASTE_MARKDOWN_LENGTH = 200_000;

type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';
type TocItem = { id: string; text: string; level: number; top: number };
type ClipboardPayload = { plainText: string; htmlText: string };
type PersistPayload = { content: CanonicalNoteContent };

interface EditorErrorBoundaryProps {
  children: ReactNode;
}

interface EditorErrorBoundaryState {
  hasError: boolean;
}

class EditorErrorBoundary extends Component<EditorErrorBoundaryProps, EditorErrorBoundaryState> {
  constructor(props: EditorErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): EditorErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[NoteView] Editor subtree crashed.', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full rounded-2xl border border-rose-100 bg-rose-50 px-6 py-5 text-xs font-bold text-rose-500">
          编辑器渲染异常，请刷新后重试。
        </div>
      );
    }

    return this.props.children;
  }
}

interface NoteViewProps {
  nodeId: string;
  nodeTitle: string;
  onBack: () => void;
  readOnly?: boolean;
  shareToken?: string;
  nodes: PathioNodeType[];
  edges: PathioEdgeType[];
}

function getMarkdownContent(editor: Editor): string {
  return editor.getMarkdown();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNoteDocJson(value: unknown): value is NoteDocJson {
  return isRecord(value) && typeof value.type === 'string';
}

function extractDocJsonContent(content: NoteResponse['content']): JSONContent | null {
  if (!isRecord(content) || !('doc_json' in content)) {
    return null;
  }

  const docJson = content.doc_json;
  return isNoteDocJson(docJson) ? (docJson as JSONContent) : null;
}

function buildPlainTextParagraphs(text: string): JSONContent[] {
  const normalized = normalizeLineBreaks(text);

  if (!normalized) {
    return [];
  }

  return normalized.split('\n').map((line) => (
    line.length > 0
      ? { type: 'paragraph', content: [{ type: 'text', text: line }] }
      : { type: 'paragraph' }
  ));
}

function buildPlainTextDocument(text: string): JSONContent | '' {
  const paragraphs = buildPlainTextParagraphs(text);

  if (paragraphs.length === 0) {
    return '';
  }

  return {
    type: 'doc',
    content: paragraphs,
  };
}

function normalizeClipboardComparisonText(value: string): string {
  return normalizeLineBreaks(value)
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function notifyPasteFallback() {
  if (typeof window !== 'undefined') {
    window.alert('Markdown 解析失败，已自动降级为纯文本粘贴。');
  }
}

function shouldHandleMarkdownPaste(payload: ClipboardPayload): boolean {
  const normalizedPlainText = normalizeClipboardComparisonText(payload.plainText);

  if (!normalizedPlainText || !looksLikeMarkdownClipboardText(normalizedPlainText)) {
    return false;
  }

  return true;
}

function isSelectionInsideCode(editor: Editor): boolean {
  const { $from, $to } = editor.state.selection;

  return [$from, $to].some((position) => {
    if (position.marks().some((mark) => mark.type.name === 'code')) {
      return true;
    }

    for (let depth = position.depth; depth >= 0; depth -= 1) {
      if (position.node(depth).type.name === 'codeBlock') {
        return true;
      }
    }

    return false;
  });
}

function parseMarkdownContent(editor: Editor, markdown: string): JSONContent | null {
  if (!editor.markdown) {
    return null;
  }

  return editor.markdown.parse(normalizeLineBreaks(markdown));
}

function setEditorDocJsonContentSafely(editor: Editor, docJson: JSONContent): boolean {
  try {
    return editor.commands.setContent(docJson, { emitUpdate: false });
  } catch (error) {
    console.error('[NoteView] Failed to load doc_json payload safely. Falling back to markdown parser.', error);
    return false;
  }
}

function setEditorMarkdownContentSafely(editor: Editor, markdown: string, context: 'load' | 'reset'): boolean {
  try {
    const parsedContent = parseMarkdownContent(editor, markdown);

    if (!parsedContent) {
      return editor.commands.setContent('', { emitUpdate: false });
    }

    return editor.commands.setContent(parsedContent, { emitUpdate: false });
  } catch (error) {
    console.error(`[NoteView] Failed to ${context} markdown content safely. Falling back to plain text.`, error);
    return editor.commands.setContent(buildPlainTextDocument(markdown), { emitUpdate: false });
  }
}

function insertPlainTextContent(editor: Editor, text: string): boolean {
  const paragraphs = buildPlainTextParagraphs(text);

  if (paragraphs.length === 0) {
    return true;
  }

  return editor.commands.insertContent(paragraphs, { updateSelection: true });
}

function insertMarkdownContentSafely(editor: Editor, markdown: string): boolean {
  try {
    const parsedContent = parseMarkdownContent(editor, markdown);

    if (!parsedContent) {
      notifyPasteFallback();
      return insertPlainTextContent(editor, markdown);
    }

    return editor.commands.insertContent(parsedContent, { updateSelection: true });
  } catch (error) {
    console.error('[NoteView] Failed to paste markdown content safely. Falling back to plain text.', error);
    notifyPasteFallback();
    return insertPlainTextContent(editor, markdown);
  }
}

function buildPersistContent(editor: Editor): CanonicalNoteContent {
  let markdown = '';
  let docJson: JSONContent | null = null;

  try {
    docJson = editor.getJSON();
  } catch (error) {
    console.error('[NoteView] Failed to export editor doc_json payload.', error);
    docJson = null;
  }

  try {
    markdown = normalizeLineBreaks(getMarkdownContent(editor));
  } catch (error) {
    console.error('[NoteView] Failed to export canonical markdown payload.', error);
    markdown = '';
  }

  return { markdown, doc_json: docJson };
}

function resolveActiveTocId(items: TocItem[], scrollTop: number): string | null {
  if (items.length === 0) {
    return null;
  }

  const marker = scrollTop + ACTIVE_TOC_OFFSET;
  let activeId = items[0].id;

  for (const item of items) {
    if (item.top <= marker) {
      activeId = item.id;
      continue;
    }

    break;
  }

  return activeId;
}

const MarkdownPasteHandler = Extension.create({
  name: 'markdownPasteHandler',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('pathioMarkdownPasteHandler'),
        props: {
          handlePaste: (_view, event) => {
            if (!this.editor.isEditable || isSelectionInsideCode(this.editor)) {
              return false;
            }

            const payload: ClipboardPayload = {
              plainText: event.clipboardData?.getData('text/plain') ?? '',
              htmlText: event.clipboardData?.getData('text/html') ?? '',
            };

            if (!shouldHandleMarkdownPaste(payload)) {
              return false;
            }

            event.preventDefault();
            if (payload.plainText.length > MAX_PASTE_MARKDOWN_LENGTH) {
              notifyPasteFallback();
              return insertPlainTextContent(this.editor, payload.plainText);
            }
            return insertMarkdownContentSafely(this.editor, payload.plainText);
          },
        },
      }),
    ];
  },
});

const TIPTAP_EXTENSIONS = [
  StarterKit.configure({
    codeBlock: false,
    link: {
      autolink: true,
      HTMLAttributes: { class: 'text-pathio-500 underline' },
    },
  }),
  Markdown.configure({
    markedOptions: {
      gfm: true,
      breaks: false,
    },
  }),
  Typography,
  TaskList,
  TaskItem.configure({ nested: true }),
  CodeBlockLowlight.configure({ lowlight }),
  MarkdownPasteHandler,
  Placeholder.configure({
    placeholder: '输入内容，或使用 Markdown (如 # 标题, - 列表, [ ] 任务)...',
    emptyNodeClass: 'is-editor-empty',
  }),
];

async function fetchReferences(nodeId: string, readOnly: boolean, shareToken?: string): Promise<Reference[] | null> {
  const endpoint = readOnly && shareToken
    ? `/share/${shareToken}/notes/${nodeId}/references`
    : `/nodes/${nodeId}/references`;

  try {
    const response = await api.get<Reference[] | ReferenceListResponse>(endpoint);
    return extractReferences(response.data);
  } catch (error: unknown) {
    if (
      readOnly
      && shareToken
      && isAxiosError(error)
      && [404, 405, 501].includes(error.response?.status ?? 0)
    ) {
      return null;
    }

    throw error;
  }
}

export default function NoteView({
  nodeId,
  nodeTitle,
  onBack,
  readOnly = false,
  shareToken,
  nodes,
  edges,
}: NoteViewProps) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeTocId, setActiveTocId] = useState<string | null>(null);
  const [references, setReferences] = useState<Reference[]>([]);
  const [newRef, setNewRef] = useState({ title: '', url: '' });

  const isDirtyRef = useRef(false);
  const isLoadedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tocRefreshFrameRef = useRef<number | null>(null);
  const tocRef = useRef<TocItem[]>([]);
  const contentScrollRef = useRef<HTMLElement | null>(null);
  const contentBodyRef = useRef<HTMLDivElement | null>(null);

  const trace = useMemo(() => {
    const precursorIds = new Set(edges.filter((edge) => edge.target === nodeId).map((edge) => edge.source));
    const successorIds = new Set(edges.filter((edge) => edge.source === nodeId).map((edge) => edge.target));

    return {
      precursors: nodes.filter((node) => precursorIds.has(node.id)),
      successors: nodes.filter((node) => successorIds.has(node.id)),
    };
  }, [nodeId, nodes, edges]);

  const syncActiveToc = useCallback((items: TocItem[] = tocRef.current) => {
    const scrollContainer = contentScrollRef.current;

    if (!scrollContainer) {
      return;
    }

    setActiveTocId(resolveActiveTocId(items, scrollContainer.scrollTop));
  }, []);

  const refreshTOCFromDom = useCallback(() => {
    const scrollContainer = contentScrollRef.current;
    const contentBody = contentBodyRef.current;

    if (!scrollContainer || !contentBody) {
      tocRef.current = [];
      setToc([]);
      setActiveTocId(null);
      return;
    }

    const headingElements = Array.from(contentBody.querySelectorAll<HTMLElement>(HEADING_SELECTOR));

    if (headingElements.length === 0) {
      tocRef.current = [];
      setToc([]);
      setActiveTocId(null);
      return;
    }

    const containerTop = scrollContainer.getBoundingClientRect().top;
    const nextToc = headingElements.map((element, index) => {
      const id = `heading-${index}`;
      element.dataset.tocId = id;

      return {
        id,
        text: element.textContent?.trim() || '无标题',
        level: Number.parseInt(element.tagName.slice(1), 10) || 1,
        top: element.getBoundingClientRect().top - containerTop + scrollContainer.scrollTop,
      };
    });

    tocRef.current = nextToc;
    setToc(nextToc);
    syncActiveToc(nextToc);
  }, [syncActiveToc]);

  const scheduleTocRefresh = useCallback(() => {
    if (tocRefreshFrameRef.current !== null) {
      cancelAnimationFrame(tocRefreshFrameRef.current);
    }

    tocRefreshFrameRef.current = requestAnimationFrame(() => {
      tocRefreshFrameRef.current = null;
      refreshTOCFromDom();
    });
  }, [refreshTOCFromDom]);

  const handleTocClick = useCallback((tocId: string) => {
    const scrollContainer = contentScrollRef.current;
    const target = tocRef.current.find((item) => item.id === tocId);

    if (!scrollContainer || !target) {
      return;
    }

    scrollContainer.scrollTo({
      top: Math.max(target.top - TOC_SCROLL_OFFSET, 0),
      behavior: 'smooth',
    });
    setActiveTocId(tocId);
  }, []);

  const persistContent = useCallback(
    async (editorInstance: Editor) => {
      if (readOnly || !isDirtyRef.current) return;

      setSaveStatus('saving');
      try {
        const payload: PersistPayload = { content: buildPersistContent(editorInstance) };
        await api.put(`/nodes/${nodeId}/note`, payload);
        setSaveStatus('saved');
        setLastSavedAt(new Date());
        isDirtyRef.current = false;
      } catch (error: unknown) {
        if (!isAxiosError(error) || error.response?.status !== 402) {
          setSaveStatus('error');
        }
      }
    },
    [nodeId, readOnly]
  );

  const editor = useEditor(
    {
      extensions: TIPTAP_EXTENSIONS,
      content: '',
      contentType: 'markdown',
      editorProps: {
        attributes: {
          class: 'prose prose-slate max-w-none focus:outline-none min-h-[500px]',
          spellcheck: 'false',
        },
      },
      onUpdate: ({ editor: editorInstance }) => {
        if (!isLoadedRef.current) return;

        isDirtyRef.current = true;
        setSaveStatus('dirty');
        scheduleTocRefresh();

        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          try {
            persistContent(editorInstance);
          } catch (error) {
            console.error('[NoteView] Failed to persist updated editor content safely.', error);
            setSaveStatus('error');
          }
        }, 3000);
      },
    },
    [nodeId, persistContent, scheduleTocRefresh]
  );

  useEffect(() => {
    const scrollContainer = contentScrollRef.current;

    if (!scrollContainer) {
      return;
    }

    const handleScroll = () => {
      syncActiveToc();
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [syncActiveToc]);

  useEffect(() => {
    const scrollContainer = contentScrollRef.current;
    const contentBody = contentBodyRef.current;

    if (!scrollContainer || !contentBody || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => {
      scheduleTocRefresh();
    });

    observer.observe(scrollContainer);
    observer.observe(contentBody);

    return () => {
      observer.disconnect();
    };
  }, [scheduleTocRefresh]);

  useEffect(() => {
    if (!editor) return;

    isLoadedRef.current = false;
    isDirtyRef.current = false;
    editor.setEditable(!readOnly);

    const noteUrl = readOnly && shareToken ? `/share/${shareToken}/notes/${nodeId}` : `/nodes/${nodeId}/note`;
    let isCancelled = false;

    const loadNote = async () => {
      const noteResponse = await api.get<NoteResponse>(noteUrl);

      if (isCancelled) {
        return;
      }

      const noteContent = noteResponse.data.content;
      const markdownContent = extractMarkdownContent(noteContent);
      const docJsonContent = extractDocJsonContent(noteContent);
      const fallbackReferences = extractReferences(noteResponse.data);
      const hasEmbeddedReferences = hasReferencePayload(noteResponse.data);

      const loadedFromDocJson = docJsonContent
        ? setEditorDocJsonContentSafely(editor, docJsonContent)
        : false;

      if (!loadedFromDocJson) {
        setEditorMarkdownContentSafely(editor, markdownContent, 'load');
      }

      let nextReferences = fallbackReferences;

      if (!hasEmbeddedReferences) {
        try {
          const resolvedReferences = await fetchReferences(nodeId, readOnly, shareToken);

          if (resolvedReferences !== null) {
            nextReferences = resolvedReferences;
          }
        } catch (error) {
          console.warn('[NoteView] Failed to load references for note view.', error);
        }
      }

      if (isCancelled) {
        return;
      }

      setReferences(nextReferences);

      requestAnimationFrame(() => {
        if (isCancelled) {
          return;
        }

        scheduleTocRefresh();
        isLoadedRef.current = true;
        isDirtyRef.current = false;
        setSaveStatus('idle');
      });
    };

    loadNote().catch((error) => {
      if (isCancelled) {
        return;
      }

      console.error('[NoteView] Failed to load note content.', error);
      setEditorMarkdownContentSafely(editor, '', 'reset');
      setReferences([]);
      setSaveStatus('error');
      scheduleTocRefresh();
    });

    return () => {
      isCancelled = true;

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (tocRefreshFrameRef.current !== null) {
        cancelAnimationFrame(tocRefreshFrameRef.current);
        tocRefreshFrameRef.current = null;
      }
      if (isDirtyRef.current && !readOnly) {
        try {
          persistContent(editor);
        } catch (error) {
          console.error('[NoteView] Failed to flush unsaved editor content on cleanup.', error);
          setSaveStatus('error');
        }
      }
    };
  }, [nodeId, editor, readOnly, shareToken, persistContent, scheduleTocRefresh]);

  const handleAddRef = async () => {
    if (!newRef.title || !newRef.url || readOnly) return;
    const res = await api.post<Reference>(`/nodes/${nodeId}/references`, newRef);
    setReferences((prev) => [res.data, ...prev]);
    setNewRef({ title: '', url: '' });
  };

  const handleDeleteRef = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (readOnly || !confirm('确定要移除这个参考资料吗？')) return;

    try {
      await api.delete(`/references/${id}`);
      setReferences((prev) => prev.filter((ref) => ref.id !== id));
    } catch {
      alert('删除失败');
    }
  };

  const saveStatusText = useMemo(() => {
    if (readOnly) return '只读模式';

    switch (saveStatus) {
      case 'dirty':
        return '未同步';
      case 'saving':
        return '同步中...';
      case 'saved':
        return lastSavedAt ? `已同步 ${standardDateFormat(lastSavedAt)}` : '已同步';
      case 'error':
        return '同步异常';
      default:
        return '云端同步开启';
    }
  }, [readOnly, saveStatus, lastSavedAt]);

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden shadow-inner">
      <header className="flex-shrink-0 flex items-center justify-between px-8 py-5 border-b border-gray-50 bg-white/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-pathio-500 transition-all rounded-xl hover:bg-gray-50">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M10 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest leading-none mb-1 italic">Knowledge Trace</span>
            <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none">{nodeTitle}</h1>
          </div>
        </div>
        <div className={`px-4 py-1.5 rounded-full border transition-all duration-500 ${saveStatus === 'saving' ? 'bg-amber-50 border-amber-200 text-amber-600' : saveStatus === 'error' ? 'bg-rose-50 border-rose-200 text-rose-500' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider">{saveStatusText}</span>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden bg-white">
        <aside className="w-64 border-r border-slate-50 bg-slate-50/20 flex flex-col shrink-0 overflow-y-auto p-8">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Outline</h3>
          <nav className="space-y-4">
            {toc.map((item, i) => (
              <button
                key={`${item.id}-${i}`}
                type="button"
                onClick={() => handleTocClick(item.id)}
                className={`block w-full text-left text-xs transition-colors hover:text-pathio-500 ${
                  activeTocId === item.id
                    ? 'text-pathio-500'
                    : item.level === 1
                      ? 'font-bold text-slate-800'
                      : 'pl-4 text-slate-400'
                } ${item.level === 1 ? 'font-bold' : 'pl-4'}`}
              >
                {item.text}
              </button>
            ))}
          </nav>
        </aside>

        <section ref={contentScrollRef} className="flex-1 overflow-y-auto bg-white px-16 py-24 scroll-smooth custom-scrollbar">
          <div ref={contentBodyRef} className="max-w-3xl mx-auto min-h-screen">
            <EditorErrorBoundary>
              <EditorContent editor={editor} />
            </EditorErrorBoundary>
          </div>
        </section>

        <aside className="w-80 border-l border-slate-50 bg-white flex flex-col shrink-0 overflow-y-auto p-8">
          <div className="mb-10">
            <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-6">参考资料 / Refs</h3>
            {!readOnly && (
              <div className="mb-6 space-y-2">
                <input className="w-full text-xs p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-1 focus:ring-pathio-500" placeholder="资料标题" value={newRef.title} onChange={(e) => setNewRef({ ...newRef, title: e.target.value })} />
                <input className="w-full text-[10px] p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-1 focus:ring-pathio-500 font-mono" placeholder="https://..." value={newRef.url} onChange={(e) => setNewRef({ ...newRef, url: e.target.value })} />
                <button onClick={handleAddRef} className="w-full py-2.5 bg-gray-900 text-white text-[10px] font-black rounded-xl hover:bg-pathio-500 transition-all uppercase tracking-widest shadow-lg">Add Attachment</button>
              </div>
            )}
            <div className="space-y-3">
              {references.length === 0 && <p className="text-xs text-slate-300 italic px-1">暂无引用附件</p>}
              {references.map((ref) => (
                <div key={ref.id} className="group relative p-3 bg-white border border-slate-100 rounded-xl hover:border-pathio-200 transition-all">
                  <a href={ref.url} target="_blank" rel="noreferrer" className="block">
                    <p className="text-xs font-bold text-slate-800 mb-1 leading-snug truncate">{ref.title}</p>
                    <p className="text-[9px] text-slate-400 truncate font-mono">{ref.url}</p>
                  </a>
                  {!readOnly && (
                    <button onClick={(e) => handleDeleteRef(e, ref.id)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mb-10">
            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-6">前置知识 / Context</h3>
            <div className="space-y-2">
              {trace.precursors.length === 0 ? <p className="text-xs text-slate-300 italic px-1">探索的起点</p> : trace.precursors.map((node) => (
                <div key={node.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-600 shadow-sm transition-all hover:border-blue-200 cursor-default">← {node.data.label}</div>
              ))}
            </div>
          </div>
          <div className="mb-12">
            <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-6">后续探索 / Next</h3>
            <div className="space-y-2">
              {trace.successors.length === 0 ? <p className="text-xs text-slate-300 italic px-1">暂无后续</p> : trace.successors.map((node) => (
                <div key={node.id} className="p-3 rounded-xl bg-emerald-50/30 border border-emerald-100 text-xs font-bold text-emerald-700 shadow-sm transition-all hover:border-emerald-300 cursor-default">→ {node.data.label}</div>
              ))}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

function standardDateFormat(date: Date) {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
}
