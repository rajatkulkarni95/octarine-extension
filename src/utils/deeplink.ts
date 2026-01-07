import LZString from 'lz-string';
import type { ClipPayload, PageMetadata } from '../types';

/**
 * Check if a filename contains invalid characters
 */
export function isValidFileName(fileName: string): boolean {
  const regex = /^[^/\\:*?"<>|\s][^/\\:*?"<>|]*$/;
  return regex.test(fileName);
}

/**
 * Sanitize a filename by removing invalid characters
 * Invalid chars: / \ : * ? " < > |
 * Preserves spaces and casing
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[/\\:*?"<>|]/g, '')  // Remove invalid chars only
    .replace(/\s+/g, ' ')          // Normalize multiple spaces to single space
    .trim()                        // Remove leading/trailing whitespace
    .slice(0, 100);                // Limit length
}

/**
 * Compress content using LZ-String base64 (as per Octarine docs)
 */
export function compressContent(content: string): string {
  return LZString.compressToBase64(content);
}

/**
 * Decompress LZ-String base64 content
 */
export function decompressContent(compressed: string): string | null {
  return LZString.decompressFromBase64(compressed);
}

export interface CreateNoteOptions {
  path: string;
  content?: string;
  workspace?: string;
  fresh?: boolean;
  position?: 'top' | 'bottom';
  separator?: string;
  openAfter?: boolean;
}

/**
 * Generate an Octarine deeplink for creating/updating a note
 * Uses the `create` action with compressedContent for large payloads
 */
export function generateCreateLink(options: CreateNoteOptions): string {
  const { path, content, workspace, fresh, position, separator, openAfter } = options;
  
  const params = new URLSearchParams();
  params.set('path', path);
  
  if (content) {
    // Use compressed content for safety with large payloads
    const compressed = compressContent(content);
    params.set('compressedContent', compressed);
  }
  
  if (workspace) params.set('workspace', workspace);
  if (fresh) params.set('fresh', 'true');
  if (position) params.set('position', position);
  if (separator) params.set('separator', separator);
  if (openAfter !== undefined) params.set('openAfter', String(openAfter));
  
  return `octarine://create?${params.toString()}`;
}

/**
 * Generate an Octarine deeplink for opening an existing note
 */
export function generateOpenLink(path: string, workspace?: string): string {
  const params = new URLSearchParams();
  params.set('path', path);
  if (workspace) params.set('workspace', workspace);
  
  return `octarine://open?${params.toString()}`;
}

/**
 * Generate an Octarine deeplink for daily/weekly notes
 */
export function generateDailyLink(options: {
  date: string;
  content?: string;
  workspace?: string;
  fresh?: boolean;
  position?: 'top' | 'bottom';
  openAfter?: boolean;
}): string {
  const { date, content, workspace, fresh, position, openAfter } = options;
  
  const params = new URLSearchParams();
  params.set('date', date);
  
  if (content) {
    const compressed = compressContent(content);
    params.set('compressedContent', compressed);
  }
  
  if (workspace) params.set('workspace', workspace);
  if (fresh) params.set('fresh', 'true');
  if (position) params.set('position', position);
  if (openAfter !== undefined) params.set('openAfter', String(openAfter));
  
  return `octarine://daily?${params.toString()}`;
}

/**
 * Escape a string for YAML double-quoted values
 */
function escapeYamlString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * Build YAML frontmatter from metadata
 * Supports both legacy PageMetadata and dynamic Record<string, string | string[]>
 * Preserves insertion order of properties
 */
function buildFrontmatter(metadata: PageMetadata | Record<string, string | string[] | undefined>): string {
  const lines: string[] = ['---'];
  
  // Iterate over entries to preserve order
  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined || value === null || value === '') continue;
    
    if (Array.isArray(value)) {
      // Handle array values (like tags)
      if (value.length > 0) {
        lines.push(`${key}: [${value.map(v => `"${escapeYamlString(v)}"`).join(', ')}]`);
      }
    } else {
      // Handle string values
      lines.push(`${key}: "${escapeYamlString(value)}"`);
    }
  }
  
  lines.push('---');
  return lines.join('\n');
}

/**
 * Build markdown content from clip payload
 */
export function buildClipMarkdown(payload: ClipPayload): string {
  const lines: string[] = [];
  
  // Add frontmatter if metadata exists
  if (payload.metadata) {
    lines.push(buildFrontmatter(payload.metadata));
    lines.push('');
  }
  
  // Title as heading
  lines.push(`# ${payload.title}`);
  lines.push('');
  
  // Content
  if (payload.selections && payload.selections.length > 0) {
    // Multiple selections - use the edited content from preview
    lines.push('## Highlights');
    lines.push('');
    lines.push(payload.content);
  } else {
    // Full page content
    lines.push(payload.content);
  }
  
  return lines.join('\n');
}

/**
 * Generate the full Octarine deeplink from a clip payload
 */
export function generateClipLink(
  payload: ClipPayload,
  options: {
    basePath?: string;
    workspace?: string;
    openAfter?: boolean;
    fileName?: string;
    fresh?: boolean;
  } = {}
): string {
  const { basePath = 'inbox/web-clips', workspace, openAfter = true, fileName, fresh = true } = options;
  
  // Use provided fileName or sanitize the title
  const sanitizedFileName = fileName 
    ? sanitizeFileName(fileName)
    : sanitizeFileName(payload.title);
  
  const path = `${basePath}/${sanitizedFileName}`;
  const content = buildClipMarkdown(payload);
  
  return generateCreateLink({
    path,
    content,
    workspace,
    openAfter,
    fresh,
  });
}

/**
 * Calculate the size of the payload
 */
export function getPayloadSize(content: string): {
  original: number;
  compressed: number;
  ratio: number;
} {
  const compressed = compressContent(content);
  
  return {
    original: content.length,
    compressed: compressed.length,
    ratio: compressed.length / content.length,
  };
}

/**
 * Open the deeplink
 */
export function openDeeplink(url: string): void {
  window.location.href = url;
}
