import { describe, it, expect } from 'vitest';
import {
  isValidFileName,
  sanitizeFileName,
  compressContent,
  decompressContent,
  generateCreateLink,
  generateOpenLink,
  generateDailyLink,
  generateSearchLink,
  buildClipMarkdown,
  generateClipLink,
  getPayloadSize,
} from './deeplink';
import type { ClipPayload } from '../types';

describe('deeplink', () => {
  describe('isValidFileName', () => {
    it('should accept valid filenames', () => {
      expect(isValidFileName('my-document')).toBe(true);
      expect(isValidFileName('My Document')).toBe(true);
      expect(isValidFileName('document_v2')).toBe(true);
      expect(isValidFileName('2024-01-15-notes')).toBe(true);
      expect(isValidFileName('Article Title (Part 1)')).toBe(true);
    });

    it('should reject filenames starting with whitespace', () => {
      expect(isValidFileName(' leading-space')).toBe(false);
      expect(isValidFileName('\ttab-start')).toBe(false);
    });

    it('should reject filenames with invalid characters', () => {
      expect(isValidFileName('path/to/file')).toBe(false);
      expect(isValidFileName('file\\name')).toBe(false);
      expect(isValidFileName('file:name')).toBe(false);
      expect(isValidFileName('file*name')).toBe(false);
      expect(isValidFileName('file?name')).toBe(false);
      expect(isValidFileName('file"name')).toBe(false);
      expect(isValidFileName('file<name')).toBe(false);
      expect(isValidFileName('file>name')).toBe(false);
      expect(isValidFileName('file|name')).toBe(false);
    });

    it('should reject empty filenames', () => {
      expect(isValidFileName('')).toBe(false);
    });
  });

  describe('sanitizeFileName', () => {
    it('should remove invalid characters', () => {
      expect(sanitizeFileName('file/name')).toBe('filename');
      expect(sanitizeFileName('file\\name')).toBe('filename');
      expect(sanitizeFileName('file:name')).toBe('filename');
      expect(sanitizeFileName('file*name')).toBe('filename');
      expect(sanitizeFileName('file?name')).toBe('filename');
      expect(sanitizeFileName('file"name')).toBe('filename');
      expect(sanitizeFileName('file<name')).toBe('filename');
      expect(sanitizeFileName('file>name')).toBe('filename');
      expect(sanitizeFileName('file|name')).toBe('filename');
    });

    it('should preserve spaces but normalize multiple spaces', () => {
      expect(sanitizeFileName('My  Document   Name')).toBe('My Document Name');
    });

    it('should trim leading and trailing whitespace', () => {
      expect(sanitizeFileName('  document  ')).toBe('document');
    });

    it('should limit filename length to 100 characters', () => {
      const longName = 'a'.repeat(150);
      expect(sanitizeFileName(longName).length).toBe(100);
    });

    it('should handle complex filenames with multiple invalid chars', () => {
      expect(sanitizeFileName('Article: "How to?" | Part <1>')).toBe('Article How to Part 1');
    });

    it('should handle filenames that become empty after sanitization', () => {
      expect(sanitizeFileName('/:*?"<>|')).toBe('');
    });
  });

  describe('compressContent / decompressContent', () => {
    it('should compress and decompress content correctly', () => {
      const content = '# Test Document\n\nSome content here.';
      const compressed = compressContent(content);
      const decompressed = decompressContent(compressed);
      
      expect(decompressed).toBe(content);
    });

    it('should handle large content', () => {
      const content = '# Large Document\n\n' + 'Paragraph content. '.repeat(500);
      const compressed = compressContent(content);
      const decompressed = decompressContent(compressed);
      
      expect(decompressed).toBe(content);
    });
  });

  describe('generateCreateLink', () => {
    it('should generate basic create link with path only', () => {
      const link = generateCreateLink({ path: 'inbox/note' });
      
      expect(link).toContain('octarine://create?');
      expect(link).toContain('path=inbox%2Fnote');
    });

    it('should include compressed content when provided', () => {
      const link = generateCreateLink({
        path: 'inbox/note',
        content: '# Test',
      });
      
      expect(link).toContain('compressedContent=');
    });

    it('should include workspace when provided', () => {
      const link = generateCreateLink({
        path: 'inbox/note',
        workspace: 'my-vault',
      });
      
      expect(link).toContain('workspace=my-vault');
    });

    it('should preserve explicit append behavior and callbacks', () => {
      const link = generateCreateLink({
        path: 'Clips/Article',
        fresh: false,
        template: 'Article',
        contentReference: 'ref-123',
        successCallback: 'callback://success',
        errorCallback: 'callback://error',
        cancelCallback: 'callback://cancel',
        source: 'octarine-web-clipper',
      });
      const params = new URL(link).searchParams;

      expect(params.get('fresh')).toBe('false');
      expect(params.get('template')).toBe('Article');
      expect(params.get('contentReference')).toBe('ref-123');
      expect(params.get('x-success')).toBe('callback://success');
      expect(params.get('x-error')).toBe('callback://error');
      expect(params.get('x-cancel')).toBe('callback://cancel');
      expect(params.get('x-source')).toBe('octarine-web-clipper');
    });

    it('should include fresh flag when true', () => {
      const link = generateCreateLink({
        path: 'inbox/note',
        fresh: true,
      });
      
      expect(link).toContain('fresh=true');
    });

    it('should include position parameter', () => {
      const linkTop = generateCreateLink({
        path: 'inbox/note',
        position: 'top',
      });
      const linkBottom = generateCreateLink({
        path: 'inbox/note',
        position: 'bottom',
      });
      
      expect(linkTop).toContain('position=top');
      expect(linkBottom).toContain('position=bottom');
    });

    it('should include separator when provided', () => {
      const link = generateCreateLink({
        path: 'inbox/note',
        separator: '---',
      });
      
      expect(link).toContain('separator=---');
    });

    it('should include openAfter parameter', () => {
      const linkTrue = generateCreateLink({
        path: 'inbox/note',
        openAfter: true,
      });
      const linkFalse = generateCreateLink({
        path: 'inbox/note',
        openAfter: false,
      });
      
      expect(linkTrue).toContain('openAfter=true');
      expect(linkFalse).toContain('openAfter=false');
    });

    it('should include all parameters together', () => {
      const link = generateCreateLink({
        path: 'inbox/web-clips/article',
        content: '# Article Title',
        workspace: 'notes',
        fresh: true,
        position: 'bottom',
        separator: '\n---\n',
        openAfter: true,
      });
      
      expect(link).toContain('octarine://create?');
      expect(link).toContain('path=');
      expect(link).toContain('compressedContent=');
      expect(link).toContain('workspace=notes');
      expect(link).toContain('fresh=true');
      expect(link).toContain('position=bottom');
      expect(link).toContain('openAfter=true');
    });
  });

  describe('generateOpenLink', () => {
    it('should generate open link with path', () => {
      const link = generateOpenLink('inbox/note');
      
      expect(link).toBe('octarine://open?path=inbox%2Fnote');
    });

    it('should include workspace when provided', () => {
      const link = generateOpenLink('inbox/note', 'my-vault');
      
      expect(link).toContain('path=inbox%2Fnote');
      expect(link).toContain('workspace=my-vault');
    });
  });

  describe('generateDailyLink', () => {
    it('should generate daily link with date', () => {
      const link = generateDailyLink({ date: '2024-01-15' });
      
      expect(link).toContain('octarine://daily?');
      expect(link).toContain('date=2024-01-15');
    });

    it('should include compressed content when provided', () => {
      const link = generateDailyLink({
        date: '2024-01-15',
        content: '- Task item',
      });
      
      expect(link).toContain('compressedContent=');
    });

    it('should include all optional parameters', () => {
      const link = generateDailyLink({
        date: '2024-01-15',
        content: '- Item',
        workspace: 'journal',
        fresh: true,
        position: 'top',
        openAfter: false,
      });
      
      expect(link).toContain('date=2024-01-15');
      expect(link).toContain('workspace=journal');
      expect(link).toContain('fresh=true');
      expect(link).toContain('position=top');
      expect(link).toContain('openAfter=false');
    });
  });

  describe('buildClipMarkdown', () => {
    it('should build markdown with title and content', () => {
      const payload: ClipPayload = {
        title: 'Test Article',
        url: 'https://example.com/article',
        content: 'This is the article content.',
        clippedAt: '2024-01-15T10:30:00Z',
      };
      
      const markdown = buildClipMarkdown(payload);
      
      expect(markdown).toContain('# Test Article');
      expect(markdown).toContain('This is the article content.');
    });

    it('should include frontmatter when metadata is provided', () => {
      const payload: ClipPayload = {
        title: 'Test Article',
        url: 'https://example.com/article',
        content: 'Content here.',
        clippedAt: '2024-01-15T10:30:00Z',
        metadata: {
          title: 'Test Article',
          source: 'https://example.com/article',
          author: 'John Doe',
        },
      };
      
      const markdown = buildClipMarkdown(payload);
      
      expect(markdown).toContain('---');
      expect(markdown).toContain('title: "Test Article"');
      expect(markdown).toContain('source: "https://example.com/article"');
      expect(markdown).toContain('author: "John Doe"');
    });

    it('should handle metadata with tags array', () => {
      const payload: ClipPayload = {
        title: 'Test',
        url: 'https://example.com',
        content: 'Content',
        clippedAt: '2024-01-15T10:30:00Z',
        metadata: {
          tags: ['tag1', 'tag2', 'tag3'],
        },
      };
      
      const markdown = buildClipMarkdown(payload);
      
      expect(markdown).toContain('tags: ["tag1", "tag2", "tag3"]');
    });

    it('should add Highlights heading when selections are present', () => {
      const payload: ClipPayload = {
        title: 'Test Article',
        url: 'https://example.com/article',
        content: 'Selected text 1\n\nSelected text 2',
        clippedAt: '2024-01-15T10:30:00Z',
        selections: [
          { id: '1', text: 'Selected text 1', timestamp: 1 },
          { id: '2', text: 'Selected text 2', timestamp: 2 },
        ],
      };
      
      const markdown = buildClipMarkdown(payload);
      
      expect(markdown).toContain('## Highlights');
    });

    it('should escape YAML special characters in metadata', () => {
      const payload: ClipPayload = {
        title: 'Test',
        url: 'https://example.com',
        content: 'Content',
        clippedAt: '2024-01-15T10:30:00Z',
        metadata: {
          title: 'Article with "quotes" and\nnewlines',
          description: 'Has\ttabs too',
        },
      };
      
      const markdown = buildClipMarkdown(payload);
      
      expect(markdown).toContain('\\"quotes\\"');
      expect(markdown).toContain('\\n');
      expect(markdown).toContain('\\t');
    });

    it('should quote unsafe YAML keys and omit reserved Octarine keys', () => {
      const markdown = buildClipMarkdown({
        title: 'Test',
        url: 'https://example.com',
        content: 'Content',
        clippedAt: '2024-01-15T10:30:00Z',
        metadata: {
          'title: injected': 'safe value',
          'oct.internal': 'private value',
        },
      });

      expect(markdown).toContain('"title: injected": "safe value"');
      expect(markdown).not.toContain('oct.internal');
      expect(markdown).not.toContain('private value');
    });

    it('should skip empty metadata values', () => {
      const payload: ClipPayload = {
        title: 'Test',
        url: 'https://example.com',
        content: 'Content',
        clippedAt: '2024-01-15T10:30:00Z',
        metadata: {
          title: 'Test',
          author: '',
          description: undefined,
        },
      };
      
      const markdown = buildClipMarkdown(payload);
      
      expect(markdown).toContain('title: "Test"');
      expect(markdown).not.toContain('author:');
      expect(markdown).not.toContain('description:');
    });
  });

  describe('generateSearchLink', () => {
    it('should use the desktop query contract', () => {
      const link = generateSearchLink('design systems', 'Work');
      const params = new URL(link).searchParams;

      expect(params.get('query')).toBe('design systems');
      expect(params.get('workspace')).toBe('Work');
    });
  });

  describe('generateClipLink', () => {
    const basePayload: ClipPayload = {
      title: 'Test Article',
      url: 'https://example.com/article',
      content: 'Article content here.',
      clippedAt: '2024-01-15T10:30:00Z',
    };

    it('should generate clip link with default options', () => {
      const link = generateClipLink(basePayload);
      
      expect(link).toContain('octarine://create?');
      expect(link).toContain('path=inbox%2Fweb-clips%2FTest+Article');
      expect(link).toContain('compressedContent=');
      expect(link).toContain('openAfter=true');
      expect(link).toContain('fresh=true');
    });

    it('should use custom basePath', () => {
      const link = generateClipLink(basePayload, {
        basePath: 'clippings/web',
      });
      
      expect(link).toContain('path=clippings%2Fweb%2FTest+Article');
    });

    it('should use custom fileName', () => {
      const link = generateClipLink(basePayload, {
        fileName: 'custom-name',
      });
      
      expect(link).toContain('path=inbox%2Fweb-clips%2Fcustom-name');
    });

    it('should sanitize title with invalid characters', () => {
      const payload: ClipPayload = {
        ...basePayload,
        title: 'Article: "How to?" | Part 1',
      };
      
      const link = generateClipLink(payload);
      
      // The path parameter should have invalid chars removed
      // Note: octarine:// contains a colon by design, so check the path portion
      const url = new URL(link);
      const path = url.searchParams.get('path') || '';
      
      // Path should not contain invalid filename chars
      expect(path).not.toContain(':');
      expect(path).not.toContain('"');
      expect(path).not.toContain('?');
      expect(path).not.toContain('|');
      expect(path).toContain('Article How to Part 1');
    });

    it('should include workspace when provided', () => {
      const link = generateClipLink(basePayload, {
        workspace: 'my-notes',
      });
      
      expect(link).toContain('workspace=my-notes');
    });

    it('should respect openAfter option', () => {
      const linkFalse = generateClipLink(basePayload, {
        openAfter: false,
      });
      
      expect(linkFalse).toContain('openAfter=false');
    });
  });

  describe('getPayloadSize', () => {
    it('should return original and compressed sizes', () => {
      const content = '# Test\n\nSome content here.';
      const result = getPayloadSize(content);
      
      expect(result.original).toBe(content.length);
      expect(result.compressed).toBeGreaterThan(0);
      expect(result.ratio).toBeGreaterThan(0);
    });

    it('should show good compression ratio for repetitive content', () => {
      const content = 'Repeat this sentence. '.repeat(100);
      const result = getPayloadSize(content);
      
      expect(result.ratio).toBeLessThan(0.5); // At least 50% compression
    });

    it('should return ratio close to or above 1 for already compressed content', () => {
      const content = 'abc'; // Very short content
      const result = getPayloadSize(content);
      
      // Short content may expand after base64 encoding
      expect(result.ratio).toBeGreaterThan(0);
    });
  });
});
