import { describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { extractMetadata, extractPageContent } from './extractor';

vi.mock('./template-manager', () => ({
  getTemplateManager: () => ({ extractData: async () => null }),
}));

function createDocument(html: string, url = 'https://example.com/article'): Document {
  return new JSDOM(html, { url }).window.document;
}

describe('extractor', () => {
  it('extracts article content, metadata, tags, and resolved images', async () => {
    const doc = createDocument(`
      <!doctype html>
      <html>
        <head>
          <title>Independent Extraction Test</title>
          <meta name="author" content="Ada Lovelace">
          <meta name="keywords" content="research, browsers, markdown, fourth, fifth, ignored">
          <meta property="og:image" content="/cover.png">
          <meta property="og:description" content="A deliberately descriptive excerpt.">
        </head>
        <body>
          <article>
            <h1>Independent Extraction Test</h1>
            <p>This long article paragraph contains enough meaningful prose for the readability parser to identify it as the primary page content.</p>
            <p>It includes <strong>bold evidence</strong>, a <a href="/source">relative link</a>, and additional text that distinguishes extraction from a title-only fallback.</p>
          </article>
        </body>
      </html>
    `);

    const result = await extractPageContent(doc);

    expect(result).not.toBeNull();
    expect(result?.title).toContain('Independent Extraction Test');
    expect(result?.url).toBe('https://example.com/article');
    expect(result?.markdown).toContain('**bold evidence**');
    expect(result?.markdown).toContain('[relative link](/source)');
    expect(result?.markdown).toContain('https://example.com/cover.png');
    expect(result?.metadata?.author).toBe('Ada Lovelace');
    expect(result?.metadata?.tags).toEqual(['research', 'browsers', 'markdown', 'fourth', 'fifth']);
  });

  it('falls back safely for a page without an article', async () => {
    const result = await extractPageContent(createDocument(`
      <!doctype html><html><head><title>Utility Page</title></head>
      <body><nav>Navigation</nav><main><p>Short utility content.</p></main></body></html>
    `));

    expect(result).not.toBeNull();
    expect(result?.title).toBe('Utility Page');
    expect(result?.url).toBe('https://example.com/article');
  });

  it('extracts standard and Open Graph metadata', () => {
    const metadata = extractMetadata(createDocument(`
      <!doctype html><html><head>
        <meta name="description" content="Standard description">
        <meta property="og:site_name" content="Example Publishing">
        <meta property="article:published_time" content="2026-09-14T08:00:00Z">
      </head><body></body></html>
    `));

    expect(metadata).toMatchObject({
      description: 'Standard description',
      'og:site_name': 'Example Publishing',
      'article:published_time': '2026-09-14T08:00:00Z',
      published: '2026-09-14T08:00:00Z',
    });
  });
});
