import type { LegacyEditorJsBlock, LegacyEditorJsNestedListItem, NoteContent } from '../types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function normalizeLineBreaks(value: string): string {
  return value.replace(/\r\n?/g, '\n');
}

function decodeHtmlEntities(value: string): string {
  if (typeof document === 'undefined') {
    return value;
  }

  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
}

function decodeLegacyInlineMarkup(value: string): string {
  const withMarkdownTags = value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<(strong|b)>(.*?)<\/\1>/gi, '**$2**')
    .replace(/<(em|i)>(.*?)<\/\1>/gi, '*$2*')
    .replace(/<code>(.*?)<\/code>/gi, '`$1`')
    .replace(/<a[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<\/?(mark|u|span)[^>]*>/gi, '');

  return decodeHtmlEntities(withMarkdownTags.replace(/<[^>]+>/g, ''));
}

function toText(value: unknown): string {
  return typeof value === 'string' ? decodeLegacyInlineMarkup(value).trim() : '';
}

function renderListItems(
  items: Array<string | LegacyEditorJsNestedListItem>,
  style: string,
  depth = 0
): string {
  return items
    .map((item, index) => {
      const indent = '  '.repeat(depth);
      const isNestedItem = isRecord(item);
      const content = toText(isNestedItem ? item.content : item);

      if (!content && !(isNestedItem && Array.isArray(item.items))) {
        return '';
      }

      const marker =
        style === 'ordered'
          ? `${index + 1}. `
          : style === 'checklist'
            ? `- [${isNestedItem && item.checked ? 'x' : ' '}] `
            : '- ';

      const nested = isNestedItem && Array.isArray(item.items)
        ? renderListItems(item.items, style, depth + 1)
        : '';

      return [content ? `${indent}${marker}${content}` : '', nested]
        .filter(Boolean)
        .join('\n');
    })
    .filter(Boolean)
    .join('\n');
}

function renderLegacyBlock(block: LegacyEditorJsBlock): string {
  const type = block.type ?? '';
  const data = block.data ?? {};

  switch (type) {
    case 'header': {
      const text = toText(data.text);
      if (!text) return '';
      const level = typeof data.level === 'number' ? Math.min(Math.max(data.level, 1), 6) : 1;
      return `${'#'.repeat(level)} ${text}`;
    }
    case 'paragraph': {
      return toText(data.text);
    }
    case 'code': {
      const code = typeof data.code === 'string' ? normalizeLineBreaks(data.code).trimEnd() : '';
      return code ? `\`\`\`\n${code}\n\`\`\`` : '';
    }
    case 'list': {
      return Array.isArray(data.items) ? renderListItems(data.items, data.style ?? 'unordered') : '';
    }
    case 'checklist': {
      return Array.isArray(data.items) ? renderListItems(data.items, 'checklist') : '';
    }
    case 'quote': {
      const quote = toText(data.text);
      const caption = toText(data.caption);
      if (!quote) return '';
      return [quote, caption]
        .filter(Boolean)
        .map((line) => `> ${line}`)
        .join('\n');
    }
    case 'delimiter': {
      return '---';
    }
    case 'warning': {
      const title = toText(data.title);
      const message = toText(data.message);
      return [title ? `> **${title}**` : '', message ? `> ${message}` : ''].filter(Boolean).join('\n');
    }
    default: {
      return toText(data.text);
    }
  }
}

function convertLegacyBlocksToMarkdown(blocks: LegacyEditorJsBlock[]): string {
  return blocks
    .map((block) => renderLegacyBlock(block))
    .filter(Boolean)
    .join('\n\n')
    .trim();
}

export function extractMarkdownContent(content: NoteContent): string {
  if (typeof content === 'string') {
    return normalizeLineBreaks(content);
  }

  if (!isRecord(content)) {
    console.warn('[NoteView] Unsupported note content received, fallback to empty string.');
    return '';
  }

  if (typeof content.markdown === 'string') {
    const normalizedMarkdown = normalizeLineBreaks(content.markdown);
    if (normalizedMarkdown.trim().length > 0) {
      return normalizedMarkdown;
    }
  }

  if (typeof content.text === 'string') {
    const normalizedText = normalizeLineBreaks(content.text);
    if (normalizedText.trim().length > 0) {
      return normalizedText;
    }
  }

  if (Array.isArray(content.blocks)) {
    return convertLegacyBlocksToMarkdown(content.blocks);
  }

  console.warn('[NoteView] Non-markdown note content received, fallback to empty string.', content);
  return '';
}

export function looksLikeMarkdownClipboardText(text: string): boolean {
  const normalized = normalizeLineBreaks(text).trim();

  if (!normalized) {
    return false;
  }

  const patterns = [
    /^\s{0,3}#{1,6}\s+\S/m,
    /^(?:\s*[-*+]\s+\S.*\n){1,}\s*[-*+]\s+\S/m,
    /^\s*\d+\.\s+\S/m,
    /^\s*[-*+]\s+\[[ xX]\]\s+\S/m,
    /^\s*>\s+\S/m,
    /(?:^|\n)\s*```[\s\S]*?(?:\n```|```$)/m,
    /(?:^|\n)\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*(?:\n|$)/,
    /(?:^|\n)\|.+\|\s*(?:\n\|[-:| ]+\|)?/m,
  ];

  return patterns.some((pattern) => pattern.test(normalized));
}
