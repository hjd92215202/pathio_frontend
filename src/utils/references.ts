import type { NoteResponse, Reference, ReferenceListResponse } from '../types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeReference(value: unknown, index: number): Reference | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = typeof value.title === 'string'
    ? value.title
    : typeof value.name === 'string'
      ? value.name
      : '';
  const url = typeof value.url === 'string'
    ? value.url
    : typeof value.href === 'string'
      ? value.href
      : typeof value.link === 'string'
        ? value.link
        : '';

  if (!title || !url) {
    return null;
  }

  const id = typeof value.id === 'string'
    ? value.id
    : typeof value.reference_id === 'string'
      ? value.reference_id
      : `shared-ref-${index}-${url}`;
  const nodeId = typeof value.node_id === 'string'
    ? value.node_id
    : typeof value.nodeId === 'string'
      ? value.nodeId
      : '';

  return {
    id,
    node_id: nodeId,
    title,
    url,
  };
}

function sanitizeReferences(value: unknown): Reference[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => normalizeReference(item, index))
    .filter((item): item is Reference => item !== null);
}

export function extractReferences(
  payload: Reference[] | ReferenceListResponse | NoteResponse | unknown
): Reference[] {
  if (Array.isArray(payload)) {
    return sanitizeReferences(payload);
  }

  if (!isRecord(payload)) {
    return [];
  }

  const directReferences = sanitizeReferences(payload.references);
  if (directReferences.length > 0) {
    return directReferences;
  }

  const directRefs = sanitizeReferences(payload.refs);
  if (directRefs.length > 0) {
    return directRefs;
  }

  if (Array.isArray(payload.data)) {
    return sanitizeReferences(payload.data);
  }

  if (isRecord(payload.data)) {
    const nestedReferences = sanitizeReferences(payload.data.references);
    if (nestedReferences.length > 0) {
      return nestedReferences;
    }

    return sanitizeReferences(payload.data.refs);
  }

  return [];
}

export function hasReferencePayload(
  payload: Reference[] | ReferenceListResponse | NoteResponse | unknown
): boolean {
  if (Array.isArray(payload)) {
    return true;
  }

  if (!isRecord(payload)) {
    return false;
  }

  if ('references' in payload || 'refs' in payload) {
    return true;
  }

  return isRecord(payload.data) && ('references' in payload.data || 'refs' in payload.data);
}
