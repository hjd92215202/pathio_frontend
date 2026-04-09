import type { Edge, Node } from '@xyflow/react';

export type NodeStatus = 'todo' | 'doing' | 'done';

export interface PathioNodeData extends Record<string, unknown> {
  label: string;
  status: NodeStatus | string;
}

export type PathioNodeType = Node<PathioNodeData, 'pathio'>;
export type PathioEdgeType = Edge;

export interface RoadmapSummary {
  id: string;
  title: string;
  share_token?: string | null;
}

export interface NodeDto {
  id: string;
  title: string;
  status: string;
  pos_x: number;
  pos_y: number;
}

export interface EdgeDto {
  id: string;
  source_node_id: string;
  target_node_id: string;
}

export interface ShareRoadmapResponse {
  roadmap_title: string;
  nodes: NodeDto[];
  edges: EdgeDto[];
}

export interface LegacyEditorJsNestedListItem {
  content?: string;
  checked?: boolean;
  items?: LegacyEditorJsNestedListItem[];
}

export interface LegacyEditorJsBlock {
  type?: string;
  data?: {
    text?: string;
    level?: number;
    code?: string;
    style?: 'ordered' | 'unordered' | 'checklist' | string;
    items?: Array<string | LegacyEditorJsNestedListItem>;
    caption?: string;
    title?: string;
    message?: string;
  };
}

export interface LegacyEditorJsDocument {
  blocks?: LegacyEditorJsBlock[];
}

export type NoteContent =
  | string
  | {
      markdown?: string;
      text?: string;
      blocks?: LegacyEditorJsBlock[];
    }
  | LegacyEditorJsDocument;

export interface NoteResponse {
  content: NoteContent;
  references?: Reference[];
  refs?: Reference[];
}

export interface ShareNoteResponse {
  content: NoteContent;
  references: Reference[];
}

export interface Reference {
  id: string;
  node_id: string;
  title: string;
  url: string;
}

export interface ReferenceListResponse {
  references?: Reference[];
  refs?: Reference[];
  data?: Reference[] | { references?: Reference[]; refs?: Reference[] };
}

export interface OrgMember {
  id: string;
  nickname: string;
  email: string;
  role: string;
}

export interface OrgDetailsResponse {
  name: string;
  plan_type: 'free' | 'team' | string;
  members: OrgMember[];
}

export interface OrgInviteResponse {
  code: string;
}

export type DialogType = 'input' | 'confirm';

export interface DialogConfig {
  isOpen: boolean;
  title: string;
  type: DialogType;
  onConfirm: (value?: string) => void;
  onClose?: () => void;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  isDanger?: boolean;
}

