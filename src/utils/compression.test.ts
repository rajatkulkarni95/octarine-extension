import { describe, it, expect } from 'vitest';
import {
  compressToBase64,
  decompressFromBase64,
  compressToEncodedURI,
  decompressFromEncodedURI,
  compressToStorage,
  decompressFromStorage,
} from './compression';

describe('compression', () => {
  describe('Base64 compression', () => {
    it('should compress and decompress simple strings', () => {
      const original = 'Hello, World!';
      const compressed = compressToBase64(original);
      const decompressed = decompressFromBase64(compressed);
      
      expect(decompressed).toBe(original);
    });

    it('should compress and decompress long content', () => {
      const original = 'Lorem ipsum '.repeat(1000);
      const compressed = compressToBase64(original);
      const decompressed = decompressFromBase64(compressed);
      
      expect(decompressed).toBe(original);
      // Compression should be effective on repetitive content
      expect(compressed.length).toBeLessThan(original.length);
    });

    it('should handle unicode characters', () => {
      const original = 'Hello, \u4e16\u754c! Emoji: \ud83d\ude80\ud83c\udf1f';
      const compressed = compressToBase64(original);
      const decompressed = decompressFromBase64(compressed);
      
      expect(decompressed).toBe(original);
    });

    it('should handle empty strings', () => {
      const compressed = compressToBase64('');
      const decompressed = decompressFromBase64(compressed);
      
      expect(decompressed).toBe('');
    });

    it('should handle markdown content with code blocks', () => {
      const markdown = `# Title

\`\`\`javascript
function test() {
  return "hello";
}
\`\`\`

Some **bold** and *italic* text.
`;
      const compressed = compressToBase64(markdown);
      const decompressed = decompressFromBase64(compressed);
      
      expect(decompressed).toBe(markdown);
    });

    it('should handle invalid compressed data without throwing', () => {
      // LZ-String may return garbage for invalid input rather than null
      // The important thing is it doesn't throw
      expect(() => decompressFromBase64('not-valid-lz-string')).not.toThrow();
    });
  });

  describe('URI-safe compression', () => {
    it('should compress and decompress simple strings', () => {
      const original = 'Hello, World!';
      const compressed = compressToEncodedURI(original);
      const decompressed = decompressFromEncodedURI(compressed);
      
      expect(decompressed).toBe(original);
    });

    it('should produce URL-safe output', () => {
      const original = 'Test string with special chars: /\\?&=';
      const compressed = compressToEncodedURI(original);
      
      // Should not contain characters that need URL encoding
      expect(compressed).not.toContain('+');
      expect(compressed).not.toContain('/');
      expect(compressed).not.toContain('=');
    });

    it('should handle content with newlines and tabs', () => {
      const original = 'Line 1\nLine 2\n\tIndented';
      const compressed = compressToEncodedURI(original);
      const decompressed = decompressFromEncodedURI(compressed);
      
      expect(decompressed).toBe(original);
    });
  });

  describe('Storage compression (UTF-16)', () => {
    it('should compress and decompress simple strings', () => {
      const original = 'Hello, World!';
      const compressed = compressToStorage(original);
      const decompressed = decompressFromStorage(compressed);
      
      expect(decompressed).toBe(original);
    });

    it('should handle complex markdown documents', () => {
      const original = `---
title: "Test Document"
author: "John Doe"
---

# Heading 1

## Heading 2

- List item 1
- List item 2
  - Nested item

| Col 1 | Col 2 |
|-------|-------|
| A     | B     |
`;
      const compressed = compressToStorage(original);
      const decompressed = decompressFromStorage(compressed);
      
      expect(decompressed).toBe(original);
    });
  });

  describe('compression efficiency', () => {
    it('should achieve significant compression on repetitive content', () => {
      const original = 'The quick brown fox '.repeat(100);
      const compressed = compressToBase64(original);
      
      const ratio = compressed.length / original.length;
      expect(ratio).toBeLessThan(0.2); // Expect at least 80% compression
    });

    it('should handle random content (less compressible)', () => {
      // Random-looking content is harder to compress
      const original = 'a1b2c3d4e5f6g7h8i9j0'.repeat(10);
      const compressed = compressToBase64(original);
      const decompressed = decompressFromBase64(compressed);
      
      // Should still roundtrip correctly even if not well compressed
      expect(decompressed).toBe(original);
    });
  });
});
