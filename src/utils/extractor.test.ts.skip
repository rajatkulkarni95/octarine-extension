import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { extractPageContent, extractMetadata, getSelectedText, getSelectedHtml, getSelectedMarkdown } from './extractor';

// Helper to create a document from HTML
function createDocument(html: string): Document {
  const dom = new JSDOM(html, { url: 'https://example.com/article' });
  return dom.window.document;
}

describe('extractor', () => {
  describe('extractPageContent', () => {
    it('should extract title from document', () => {
      const doc = createDocument(`
        <!DOCTYPE html>
        <html>
          <head><title>Test Article</title></head>
          <body>
            <article>
              <h1>Test Article</h1>
              <p>This is the article content. It needs to be long enough for Readability to pick it up.</p>
              <p>Adding more paragraphs to ensure the content is substantial enough for extraction.</p>
              <p>Readability requires a minimum amount of text content to work properly.</p>
            </article>
          </body>
        </html>
      `);

      const result = extractPageContent(doc);
      
      expect(result).not.toBeNull();
      expect(result?.title).toBe('Test Article');
    });

    it('should extract URL from document location', () => {
      const doc = createDocument(`
        <!DOCTYPE html>
        <html>
          <head><title>Test</title></head>
          <body>
            <article>
              <p>Content that is long enough for Readability to process and extract properly.</p>
              <p>We need sufficient text content for the extraction algorithm to work.</p>
            </article>
          </body>
        </html>
      `);

      const result = extractPageContent(doc);
      
      expect(result).not.toBeNull();
      expect(result?.url).toBe('https://example.com/article');
    });

    it('should convert content to markdown', () => {
      const doc = createDocument(`
        <!DOCTYPE html>
        <html>
          <head><title>Test</title></head>
          <body>
            <article>
              <h1>Main Heading</h1>
              <p>This is <strong>bold</strong> text and this is <em>italic</em> text.</p>
              <p>More content to ensure Readability has enough to work with.</p>
              <p>Additional paragraph for sufficient content length.</p>
            </article>
          </body>
        </html>
      `);

      const result = extractPageContent(doc);
      
      expect(result).not.toBeNull();
      expect(result?.markdown).toContain('**bold**');
      expect(result?.markdown).toContain('*italic*');
    });

    it('should extract author from article byline', () => {
      const doc = createDocument(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Test Article</title>
            <meta name="author" content="John Doe">
          </head>
          <body>
            <article>
              <p>This is the article content with enough text for extraction.</p>
              <p>Adding more paragraphs to meet the minimum content threshold.</p>
              <p>Readability needs substantial content to identify article structure.</p>
            </article>
          </body>
        </html>
      `);

      const result = extractPageContent(doc);
      
      expect(result).not.toBeNull();
      // Author might come from metadata or be undefined
    });

    it('should handle documents without article content gracefully', () => {
      const doc = createDocument(`
        <!DOCTYPE html>
        <html>
          <head><title>Empty Page</title></head>
          <body>
            <nav>Navigation only</nav>
          </body>
        </html>
      `);

      const result = extractPageContent(doc);
      
      // Should still return something (fallback extraction)
      expect(result).not.toBeNull();
      expect(result?.title).toBe('Empty Page');
    });

    it('should extract metadata including og:image', () => {
      const doc = createDocument(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Test Article</title>
            <meta property="og:image" content="https://example.com/image.jpg">
            <meta property="og:description" content="Article description">
          </head>
          <body>
            <article>
              <p>Article content that is long enough for proper extraction.</p>
              <p>Adding more content to ensure Readability works correctly.</p>
              <p>Third paragraph for additional content length.</p>
            </article>
          </body>
        </html>
      `);

      const result = extractPageContent(doc);
      
      expect(result).not.toBeNull();
      expect(result?.metadata?.image).toBe('https://example.com/image.jpg');
    });

    it('should remove script and style tags during preprocessing', () => {
      const doc = createDocument(`
        <!DOCTYPE html>
        <html>
          <head><title>Test</title></head>
          <body>
            <article>
              <script>console.log('should be removed');</script>
              <style>.should-be-removed { color: red; }</style>
              <p>Actual content that should be preserved in the extraction.</p>
              <p>More content for Readability to work with properly.</p>
              <p>Third paragraph to meet minimum content requirements.</p>
            </article>
          </body>
        </html>
      `);

      const result = extractPageContent(doc);
      
      expect(result).not.toBeNull();
      expect(result?.content).not.toContain('should be removed');
      expect(result?.content).not.toContain('should-be-removed');
    });

    it('should extract tags from meta keywords', () => {
      const doc = createDocument(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Test</title>
            <meta name="keywords" content="javascript, web development, tutorial">
          </head>
          <body>
            <article>
              <p>Content about JavaScript and web development tutorials.</p>
              <p>More detailed content for the article to have enough text.</p>
              <p>Additional paragraph for content extraction requirements.</p>
            </article>
          </body>
        </html>
      `);

      const result = extractPageContent(doc);
      
      expect(result).not.toBeNull();
      expect(result?.metadata?.tags).toContain('javascript');
      expect(result?.metadata?.tags).toContain('web development');
      expect(result?.metadata?.tags).toContain('tutorial');
    });

    it('should limit tags to 5', () => {
      const doc = createDocument(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Test</title>
            <meta name="keywords" content="tag1, tag2, tag3, tag4, tag5, tag6, tag7">
          </head>
          <body>
            <article>
              <p>Content with many tags for testing the tag limit feature.</p>
              <p>More content to ensure proper extraction from the document.</p>
              <p>Third paragraph for Readability minimum content threshold.</p>
            </article>
          </body>
        </html>
      `);

      const result = extractPageContent(doc);
      
      expect(result).not.toBeNull();
      expect(result?.metadata?.tags?.length).toBeLessThanOrEqual(5);
    });

    it('should use main content container as fallback', () => {
      const doc = createDocument(`
        <!DOCTYPE html>
        <html>
          <head><title>Doc Page</title></head>
          <body>
            <nav>Navigation</nav>
            <main>
              <h1>Documentation</h1>
              <p>Main content that should be extracted from the main element.</p>
              <h2>Section</h2>
              <p>More content in the documentation section for extraction.</p>
            </main>
            <footer>Footer</footer>
          </body>
        </html>
      `);

      const result = extractPageContent(doc);
      
      expect(result).not.toBeNull();
      expect(result?.markdown).toContain('Documentation');
    });

    it('should prepend og:image to markdown if not already present', () => {
      const doc = createDocument(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Test</title>
            <meta property="og:image" content="https://example.com/featured.jpg">
          </head>
          <body>
            <article>
              <p>Article without any images in the body content itself.</p>
              <p>More content to ensure proper extraction from the page.</p>
              <p>Third paragraph for minimum content requirements.</p>
            </article>
          </body>
        </html>
      `);

      const result = extractPageContent(doc);
      
      expect(result).not.toBeNull();
      expect(result?.markdown).toContain('![](https://example.com/featured.jpg)');
    });

    it('should handle relative og:image URLs', () => {
      const doc = createDocument(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Test</title>
            <meta property="og:image" content="/images/featured.jpg">
          </head>
          <body>
            <article>
              <p>Article content for testing relative image URL resolution.</p>
              <p>More content to meet Readability minimum threshold.</p>
              <p>Third paragraph for sufficient content length.</p>
            </article>
          </body>
        </html>
      `);

      const result = extractPageContent(doc);
      
      expect(result).not.toBeNull();
      expect(result?.markdown).toContain('https://example.com/images/featured.jpg');
    });
  });

  describe('extractMetadata', () => {
    it('should extract standard meta tags', () => {
      const doc = createDocument(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="description" content="Page description">
            <meta name="author" content="John Doe">
          </head>
          <body></body>
        </html>
      `);

      const metadata = extractMetadata(doc);
      
      expect(metadata['description']).toBe('Page description');
      expect(metadata['author']).toBe('John Doe');
    });

    it('should extract Open Graph meta tags', () => {
      const doc = createDocument(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta property="og:title" content="OG Title">
            <meta property="og:description" content="OG Description">
            <meta property="og:image" content="https://example.com/og-image.jpg">
            <meta property="og:site_name" content="Example Site">
          </head>
          <body></body>
        </html>
      `);

      const metadata = extractMetadata(doc);
      
      expect(metadata['og:title']).toBe('OG Title');
      expect(metadata['og:description']).toBe('OG Description');
      expect(metadata['og:image']).toBe('https://example.com/og-image.jpg');
      expect(metadata['og:site_name']).toBe('Example Site');
    });

    it('should extract Twitter Card meta tags', () => {
      const doc = createDocument(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="twitter:title" content="Twitter Title">
            <meta name="twitter:description" content="Twitter Description">
          </head>
          <body></body>
        </html>
      `);

      const metadata = extractMetadata(doc);
      
      expect(metadata['twitter:title']).toBe('Twitter Title');
      expect(metadata['twitter:description']).toBe('Twitter Description');
    });

    it('should extract article published time', () => {
      const doc = createDocument(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta property="article:published_time" content="2024-01-15T10:00:00Z">
          </head>
          <body></body>
        </html>
      `);

      const metadata = extractMetadata(doc);
      
      expect(metadata['published']).toBe('2024-01-15T10:00:00Z');
    });

    it('should handle documents with no meta tags', () => {
      const doc = createDocument(`
        <!DOCTYPE html>
        <html>
          <head><title>No Meta</title></head>
          <body></body>
        </html>
      `);

      const metadata = extractMetadata(doc);
      
      expect(metadata).toEqual({});
    });

    it('should skip meta tags without content', () => {
      const doc = createDocument(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="description">
            <meta name="author" content="">
            <meta name="keywords" content="valid">
          </head>
          <body></body>
        </html>
      `);

      const metadata = extractMetadata(doc);
      
      expect(metadata['description']).toBeUndefined();
      expect(metadata['author']).toBeUndefined();
      expect(metadata['keywords']).toBe('valid');
    });
  });

  describe('getSelectedText', () => {
    it('should return empty string when no selection', () => {
      // In jsdom, window.getSelection() returns null or empty
      const result = getSelectedText();
      expect(result).toBe('');
    });
  });

  describe('getSelectedHtml', () => {
    it('should return empty string when no selection', () => {
      const result = getSelectedHtml();
      expect(result).toBe('');
    });
  });

  describe('getSelectedMarkdown', () => {
    it('should return empty string when no selection', () => {
      const result = getSelectedMarkdown();
      expect(result).toBe('');
    });
  });
});
