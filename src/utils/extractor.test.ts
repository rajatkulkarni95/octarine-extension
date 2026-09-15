import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { extractMetadata, extractPageContent } from './extractor';
import { DEFAULT_SETTINGS } from '../types/settings';
import { loadSettings } from './settings';

const extractTemplateData = vi.hoisted(() => vi.fn());

vi.mock('./template-manager', () => ({
  getTemplateManager: () => ({ extractData: extractTemplateData }),
}));

vi.mock('./settings', () => ({
  loadSettings: vi.fn(),
}));

function createDocument(html: string, url = 'https://example.com/article'): Document {
  return new JSDOM(html, { url }).window.document;
}

describe('extractor', () => {
  beforeEach(() => {
    vi.mocked(loadSettings).mockResolvedValue(DEFAULT_SETTINGS);
    extractTemplateData.mockResolvedValue(null);
  });

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

  it('applies a matching custom template before built-in extraction', async () => {
    vi.mocked(loadSettings).mockResolvedValue({
      ...DEFAULT_SETTINGS,
      customTemplates: [{
        id: 'custom-recipes',
        name: 'Recipes',
        description: '',
        urlPattern: '*.example.com/*',
      }],
      templates: {
        ...DEFAULT_SETTINGS.templates,
        'custom-recipes': {
          propertiesEnabled: true,
          properties: [{ id: 'cuisine', name: 'cuisine', type: 'string', value: 'Italian' }],
          contentTemplate: '# {title}\n\n{content}\n\nFrom {url}',
          folder: 'Recipes',
        },
      },
    });

    const result = await extractPageContent(createDocument(`
      <!doctype html><html><head><title>Pasta</title></head><body>
      <article><h1>Pasta</h1><p>A long enough recipe description with ingredients and instructions for the parser to extract as useful article content.</p></article>
      </body></html>
    `, 'https://www.example.com/pasta'));

    expect(result?.metadata).toMatchObject({
      templateId: 'custom-recipes',
      folder: 'Recipes',
      cuisine: 'Italian',
    });
    expect(result?.markdown).toContain('# Pasta');
    expect(result?.markdown).toContain('From https://www.example.com/pasta');
  });

  it('keeps the source extractor when a custom template duplicates a built-in', async () => {
    vi.mocked(loadSettings).mockResolvedValue({
      ...DEFAULT_SETTINGS,
      customTemplates: [{
        id: 'custom-pr',
        name: 'Team PR',
        description: '',
        urlPattern: 'github.com/*/*/pull/*',
        baseTemplateId: 'github-pr',
      }],
      templates: {
        ...DEFAULT_SETTINGS.templates,
        'custom-pr': {
          propertiesEnabled: true,
          properties: [{ id: 'pr', name: 'pr', type: 'string', value: '{{prNumber}}' }],
          contentTemplate: 'PR {prNumber}',
          folder: 'Team/PRs',
        },
      },
    });
    extractTemplateData.mockResolvedValue({
      templateId: 'custom-pr',
      title: 'Improve parser',
      content: 'PR 42',
      properties: { prNumber: '42' },
      url: 'https://github.com/acme/app/pull/42',
      folder: 'Team/PRs',
      filename: 'app-pr-42',
    });
    const doc = createDocument('<html><body></body></html>', 'https://github.com/acme/app/pull/42');

    const result = await extractPageContent(doc);

    expect(extractTemplateData).toHaveBeenCalledWith(doc, 'github-pr', 'custom-pr');
    expect(result?.metadata).toMatchObject({ templateId: 'custom-pr', prNumber: '42', pr: '42' });
    expect(result?.markdown).toBe('PR 42');
  });
});
