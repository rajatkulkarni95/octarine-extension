import { describe, it, expect, beforeEach } from 'vitest';
import { htmlToMarkdown, cleanMarkdown, setBaseUrl } from './markdown-converter';

describe('markdown-converter', () => {
  beforeEach(() => {
    // Reset base URL before each test
    setBaseUrl('https://example.com');
  });

  describe('htmlToMarkdown', () => {
    describe('basic elements', () => {
      it('should convert paragraphs', () => {
        const html = '<p>This is a paragraph.</p>';
        const result = htmlToMarkdown(html);
        expect(result.trim()).toBe('This is a paragraph.');
      });

      it('should convert headings', () => {
        const html = `
          <h1>Heading 1</h1>
          <h2>Heading 2</h2>
          <h3>Heading 3</h3>
        `;
        const result = htmlToMarkdown(html);
        expect(result).toContain('# Heading 1');
        expect(result).toContain('## Heading 2');
        expect(result).toContain('### Heading 3');
      });

      it('should convert bold text', () => {
        const html = '<p>This is <strong>bold</strong> text.</p>';
        const result = htmlToMarkdown(html);
        expect(result).toContain('**bold**');
      });

      it('should convert italic text', () => {
        const html = '<p>This is <em>italic</em> text.</p>';
        const result = htmlToMarkdown(html);
        expect(result).toContain('*italic*');
      });

      it('should convert links', () => {
        const html = '<a href="https://example.com">Link text</a>';
        const result = htmlToMarkdown(html);
        expect(result).toContain('[Link text](https://example.com)');
      });

      it('should convert unordered lists', () => {
        const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
        const result = htmlToMarkdown(html);
        // Turndown uses 3 spaces after the bullet marker
        expect(result).toContain('-   Item 1');
        expect(result).toContain('-   Item 2');
      });

      it('should convert ordered lists', () => {
        const html = '<ol><li>First</li><li>Second</li></ol>';
        const result = htmlToMarkdown(html);
        expect(result).toContain('1.  First');
        expect(result).toContain('2.  Second');
      });

      it('should convert blockquotes', () => {
        const html = '<blockquote>This is a quote.</blockquote>';
        const result = htmlToMarkdown(html);
        expect(result).toContain('> This is a quote.');
      });

      it('should convert horizontal rules', () => {
        const html = '<hr>';
        const result = htmlToMarkdown(html);
        expect(result).toContain('---');
      });
    });

    describe('images', () => {
      it('should convert basic images', () => {
        const html = '<img src="https://example.com/image.jpg" alt="Test image">';
        const result = htmlToMarkdown(html);
        expect(result).toContain('![Test image](https://example.com/image.jpg)');
      });

      it('should resolve relative image URLs', () => {
        setBaseUrl('https://example.com/article/');
        const html = '<img src="../images/photo.jpg" alt="Photo">';
        const result = htmlToMarkdown(html);
        expect(result).toContain('![Photo](https://example.com/images/photo.jpg)');
      });

      it('should handle protocol-relative URLs', () => {
        const html = '<img src="//cdn.example.com/image.jpg" alt="CDN image">';
        const result = htmlToMarkdown(html);
        expect(result).toContain('https://cdn.example.com/image.jpg');
      });

      it('should use title as fallback for alt text', () => {
        const html = '<img src="https://example.com/image.jpg" title="Image title">';
        const result = htmlToMarkdown(html);
        expect(result).toContain('![Image title]');
      });

      it('should handle images without alt text', () => {
        const html = '<img src="https://example.com/image.jpg">';
        const result = htmlToMarkdown(html);
        expect(result).toContain('![](https://example.com/image.jpg)');
      });

      it('should skip tracking pixels', () => {
        const html = '<img src="https://tracking.com/pixel.gif" width="1" height="1">';
        const result = htmlToMarkdown(html);
        expect(result.trim()).toBe('');
      });

      it('should skip tiny base64 placeholder images', () => {
        const html = '<img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7">';
        const result = htmlToMarkdown(html);
        expect(result.trim()).toBe('');
      });

      it('should preserve larger base64 images', () => {
        // Create a base64 string that's over 200 characters
        const largeBase64 = 'data:image/png;base64,' + 'A'.repeat(250);
        const html = `<img src="${largeBase64}" alt="Large image">`;
        const result = htmlToMarkdown(html);
        expect(result).toContain('![Large image]');
      });

      describe('lazy-loaded images', () => {
        it('should prefer data-src over src', () => {
          const html = '<img src="placeholder.gif" data-src="https://example.com/real-image.jpg" alt="Lazy">';
          const result = htmlToMarkdown(html);
          expect(result).toContain('https://example.com/real-image.jpg');
          expect(result).not.toContain('placeholder.gif');
        });

        it('should prefer data-lazy-src', () => {
          const html = '<img src="placeholder.gif" data-lazy-src="https://example.com/lazy.jpg" alt="Lazy">';
          const result = htmlToMarkdown(html);
          expect(result).toContain('https://example.com/lazy.jpg');
        });

        it('should prefer data-original', () => {
          const html = '<img src="thumb.jpg" data-original="https://example.com/full.jpg" alt="Full">';
          const result = htmlToMarkdown(html);
          expect(result).toContain('https://example.com/full.jpg');
        });

        it('should ignore gif/svg data-src placeholders', () => {
          const html = '<img data-src="data:image/gif;base64,xxx" src="https://example.com/real.jpg" alt="Image">';
          const result = htmlToMarkdown(html);
          expect(result).toContain('https://example.com/real.jpg');
        });

        it('should use srcset when available', () => {
          const html = '<img srcset="small.jpg 480w, medium.jpg 800w, large.jpg 1200w" alt="Responsive">';
          const result = htmlToMarkdown(html);
          // Should use the last (highest resolution) source
          expect(result).toContain('large.jpg');
        });
      });
    });

    describe('code blocks', () => {
      it('should convert inline code', () => {
        const html = '<p>Use <code>const</code> for constants.</p>';
        const result = htmlToMarkdown(html);
        expect(result).toContain('`const`');
      });

      it('should convert code blocks with language hint', () => {
        const html = '<pre><code class="language-javascript">const x = 1;</code></pre>';
        const result = htmlToMarkdown(html);
        expect(result).toContain('```javascript');
        expect(result).toContain('const x = 1;');
        expect(result).toContain('```');
      });

      it('should convert code blocks without language hint', () => {
        const html = '<pre><code>plain code</code></pre>';
        const result = htmlToMarkdown(html);
        expect(result).toContain('```');
        expect(result).toContain('plain code');
      });
    });

    describe('strikethrough and highlight', () => {
      it('should convert del tag', () => {
        const html = '<p><del>deleted text</del></p>';
        const result = htmlToMarkdown(html);
        expect(result).toContain('~~deleted text~~');
      });

      it('should convert s tag', () => {
        const html = '<p><s>strikethrough</s></p>';
        const result = htmlToMarkdown(html);
        expect(result).toContain('~~strikethrough~~');
      });

      it('should convert strike tag (legacy)', () => {
        const html = '<p><strike>old strikethrough</strike></p>';
        const result = htmlToMarkdown(html);
        expect(result).toContain('~~old strikethrough~~');
      });

      it('should convert mark tag to highlight', () => {
        const html = '<p><mark>highlighted text</mark></p>';
        const result = htmlToMarkdown(html);
        expect(result).toContain('==highlighted text==');
      });
    });

    describe('tables', () => {
      it('should convert simple tables', () => {
        const html = `
          <table>
            <tr><th>Header 1</th><th>Header 2</th></tr>
            <tr><td>Cell 1</td><td>Cell 2</td></tr>
          </table>
        `;
        const result = htmlToMarkdown(html);
        expect(result).toContain('| Header 1 | Header 2 |');
        expect(result).toContain('| --- | --- |');
        expect(result).toContain('| Cell 1 | Cell 2 |');
      });

      it('should escape pipe characters in cell content', () => {
        const html = `
          <table>
            <tr><th>Header</th></tr>
            <tr><td>Value | with pipe</td></tr>
          </table>
        `;
        const result = htmlToMarkdown(html);
        expect(result).toContain('Value \\| with pipe');
      });

      it('should handle tables without th elements', () => {
        const html = `
          <table>
            <tr><td>Cell 1</td><td>Cell 2</td></tr>
            <tr><td>Cell 3</td><td>Cell 4</td></tr>
          </table>
        `;
        const result = htmlToMarkdown(html);
        // Should still create header separator
        expect(result).toContain('| --- | --- |');
      });
    });

    describe('figures', () => {
      it('should convert figures with images', () => {
        const html = `
          <figure>
            <img src="https://example.com/image.jpg" alt="Image alt">
            <figcaption>Image caption</figcaption>
          </figure>
        `;
        const result = htmlToMarkdown(html);
        expect(result).toContain('![Image alt](https://example.com/image.jpg)');
        expect(result).toContain('*Image caption*');
      });

      it('should use figcaption as alt text fallback', () => {
        const html = `
          <figure>
            <img src="https://example.com/image.jpg">
            <figcaption>Caption text</figcaption>
          </figure>
        `;
        const result = htmlToMarkdown(html);
        expect(result).toContain('![Caption text]');
      });

      it('should skip figures without images', () => {
        const html = `
          <figure>
            <video src="video.mp4"></video>
            <figcaption>Video caption</figcaption>
          </figure>
        `;
        const result = htmlToMarkdown(html);
        expect(result.trim()).toBe('');
      });
    });

    describe('blockquotes with citations', () => {
      it('should convert blockquotes with cite attribute', () => {
        const html = '<blockquote cite="https://example.com/source">Quote text</blockquote>';
        const result = htmlToMarkdown(html);
        expect(result).toContain('> Quote text');
        expect(result).toContain('[Source](https://example.com/source)');
      });
    });
  });

  describe('cleanMarkdown', () => {
    it('should remove excessive newlines', () => {
      const markdown = 'Paragraph 1\n\n\n\n\nParagraph 2';
      const result = cleanMarkdown(markdown);
      expect(result).toBe('Paragraph 1\n\nParagraph 2');
    });

    it('should trim leading and trailing whitespace', () => {
      const markdown = '  \n\n  Content here  \n\n  ';
      const result = cleanMarkdown(markdown);
      expect(result).toBe('Content here');
    });

    it('should preserve valid double newlines', () => {
      const markdown = 'Paragraph 1\n\nParagraph 2\n\nParagraph 3';
      const result = cleanMarkdown(markdown);
      expect(result).toBe('Paragraph 1\n\nParagraph 2\n\nParagraph 3');
    });

    it('should handle empty strings', () => {
      const result = cleanMarkdown('');
      expect(result).toBe('');
    });

    it('should handle whitespace-only strings', () => {
      const result = cleanMarkdown('   \n\n\n   ');
      expect(result).toBe('');
    });
  });

  describe('setBaseUrl', () => {
    it('should affect relative URL resolution', () => {
      setBaseUrl('https://blog.example.com/posts/');
      const html = '<img src="../../images/photo.jpg" alt="Photo">';
      const result = htmlToMarkdown(html);
      expect(result).toContain('https://blog.example.com/images/photo.jpg');
    });
  });

  describe('complex documents', () => {
    it('should convert a complete article', () => {
      const html = `
        <article>
          <h1>Article Title</h1>
          <p>Introduction paragraph with <strong>bold</strong> and <em>italic</em> text.</p>
          
          <h2>Section 1</h2>
          <p>Some content with a <a href="https://example.com">link</a>.</p>
          <ul>
            <li>List item 1</li>
            <li>List item 2</li>
          </ul>
          
          <h2>Section 2</h2>
          <pre><code class="language-python">def hello():
    print("Hello")</code></pre>
          
          <blockquote>A famous quote.</blockquote>
          
          <figure>
            <img src="https://example.com/image.jpg" alt="Figure">
            <figcaption>Figure caption</figcaption>
          </figure>
        </article>
      `;
      
      const result = cleanMarkdown(htmlToMarkdown(html));
      
      expect(result).toContain('# Article Title');
      expect(result).toContain('**bold**');
      expect(result).toContain('*italic*');
      expect(result).toContain('## Section 1');
      expect(result).toContain('[link](https://example.com)');
      expect(result).toContain('-   List item 1'); // Turndown uses 3 spaces after bullet
      expect(result).toContain('```python');
      expect(result).toContain('> A famous quote.');
      expect(result).toContain('![Figure](https://example.com/image.jpg)');
    });

    it('should handle nested structures', () => {
      const html = `
        <blockquote>
          <p>Quote with <strong>bold</strong> text.</p>
          <ul>
            <li>Nested list item</li>
          </ul>
        </blockquote>
      `;
      
      const result = htmlToMarkdown(html);
      expect(result).toContain('>');
      expect(result).toContain('**bold**');
    });
  });
});
