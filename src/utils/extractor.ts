import { Readability } from '@mozilla/readability';
import { htmlToMarkdown, cleanMarkdown, setBaseUrl } from './markdown-converter';
import type { PageData, PageMetadata } from '../types';
import { getTemplateManager } from './template-manager';
import type { ExtractedData } from '../types/template';
import { loadSettings } from './settings';
import { findMatchingCustomTemplate } from './custom-templates';
import { renderTemplate } from './template-renderer';
import { propertiesToMetadata, resolveProperties } from './properties';

/**
 * Pre-process the document to clean up elements that confuse Readability.
 * This helps preserve headings and other structural elements.
 */
function preprocessDocument(doc: Document): void {
  // Remove SVGs inside headings - these confuse Readability's scoring
  const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach((heading) => {
    // Remove SVGs inside headings (often used for anchor link icons)
    const svgs = heading.querySelectorAll('svg');
    svgs.forEach((svg) => svg.remove());
    
    // Simplify anchor links inside headings - preserve the text
    const anchors = heading.querySelectorAll('a');
    anchors.forEach((anchor) => {
      // If anchor only contains whitespace or icons, remove it
      const textContent = anchor.textContent?.trim() || '';
      if (!textContent || textContent === '#') {
        anchor.remove();
      }
    });
  });
  
  // Remove hidden elements that might interfere
  const hiddenElements = doc.querySelectorAll('[aria-hidden="true"], .sr-only, .visually-hidden');
  hiddenElements.forEach((el) => el.remove());
  
  // Remove script and style tags
  const scriptsAndStyles = doc.querySelectorAll('script, style, noscript');
  scriptsAndStyles.forEach((el) => el.remove());
}

/**
 * Check if the extracted content has meaningful structure (headings, lists).
 * Returns true if content appears to be properly structured.
 */
function hasStructuredContent(html: string): boolean {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  
  const hasHeadings = parsed.querySelectorAll('h1, h2, h3, h4, h5, h6').length > 0;
  const hasLists = parsed.querySelectorAll('ul, ol').length > 0;
  
  return hasHeadings || hasLists;
}

/**
 * Find the main content container for fallback extraction.
 * Looks for common content container patterns.
 */
function findMainContent(doc: Document): Element | null {
  // Common selectors for main content areas (in priority order)
  const selectors = [
    'main',
    '[role="main"]',
    'article',
    '.article',
    '.content',
    '.post-content',
    '.entry-content',
    '.page-content',
    '.markdown-body',
    '.prose',
    '#content',
    '#main-content',
    '.main-content',
    // Documentation site patterns
    '.docs-content',
    '.documentation',
    '[class*="DocContent"]',
    '[class*="doc-content"]',
    '[class*="article"]',
  ];
  
  for (const selector of selectors) {
    const element = doc.querySelector(selector);
    if (element && element.textContent && element.textContent.trim().length > 100) {
      return element;
    }
  }
  
  return null;
}

/**
 * Convert template ExtractedData to PageData format
 */
function convertExtractedDataToPageData(data: ExtractedData): PageData {
  return {
    title: data.title,
    url: data.url,
    content: data.content,
    markdown: data.content,
    // Template properties become metadata
    metadata: {
      ...data.properties,
      folder: data.folder,
      filename: data.filename,
      templateId: data.templateId, // Include template ID so popup knows which template was used
    },
  };
}

export async function extractPageContent(
  doc: Document,
  templateId?: string,
): Promise<PageData | null> {
  const settings = await loadSettings();
  const customTemplate = templateId
    ? settings.customTemplates.find((template) => template.id === templateId)
    : findMatchingCustomTemplate(settings.customTemplates, doc.location?.href || '');

  if (customTemplate) {
    if (customTemplate.baseTemplateId) {
      const inheritedData = await getTemplateManager().extractData(
        doc,
        customTemplate.baseTemplateId,
        customTemplate.id,
      );
      if (inheritedData) {
        const pageData = convertExtractedDataToPageData(inheritedData);
        const templateSettings = settings.templates[customTemplate.id];
        if (!templateSettings?.propertiesEnabled) return pageData;
        return {
          ...pageData,
          metadata: {
            ...pageData.metadata,
            ...propertiesToMetadata(resolveProperties(templateSettings.properties, pageData)),
          },
        };
      }
    }

    const pageData = await extractGenericPageContent(doc);
    if (!pageData) return null;

    const templateSettings = settings.templates[customTemplate.id];
    if (!templateSettings) return pageData;

    const rawData: Record<string, unknown> = {
      ...pageData.metadata,
      title: pageData.title,
      url: pageData.url,
      source: pageData.url,
      author: pageData.author || pageData.metadata?.author,
      description: pageData.description || pageData.metadata?.description,
      siteName: pageData.siteName || pageData.metadata?.siteName,
      content: pageData.markdown,
    };
    const properties = templateSettings.propertiesEnabled
      ? propertiesToMetadata(resolveProperties(templateSettings.properties, pageData))
      : {};
    const content = renderTemplate(templateSettings.contentTemplate, rawData);

    return {
      ...pageData,
      content,
      markdown: content,
      metadata: {
        ...pageData.metadata,
        ...properties,
        templateId: customTemplate.id,
        folder: templateSettings.folder,
      },
    };
  }

  // Explicitly choosing Default bypasses site-specific built-in templates.
  if (templateId !== 'default') {
    const templateData = await getTemplateManager().extractData(doc, templateId);
    if (templateData) {
      return convertExtractedDataToPageData(templateData);
    }
  }

  return extractGenericPageContent(doc);
}

/**
 * Extract clean content from the current page using Readability.
 */
async function extractGenericPageContent(doc: Document): Promise<PageData | null> {
  // Set base URL for resolving relative image URLs
  const baseUrl = doc.location?.href || doc.baseURI || '';
  setBaseUrl(baseUrl);

  // Extract this before Readability so the fallback path retains page metadata too.
  const metadata = extractMetadata(doc);

  // Clone the document to avoid modifying the original
  const documentClone = doc.cloneNode(true) as Document;
  
  // Pre-process the document to help Readability
  preprocessDocument(documentClone);
  
  // Use Readability to extract the main content
  const reader = new Readability(documentClone, {
    charThreshold: 50,
  });
  
  const article = reader.parse();
  
  // Check if Readability stripped too much structure
  const articleContent = article?.content || '';
  const originalHasStructure = hasStructuredContent(doc.body.innerHTML);
  const extractedHasStructure = hasStructuredContent(articleContent);
  const needsFallback = article && !extractedHasStructure && originalHasStructure;
  
  if (!article || needsFallback) {
    // Fallback: try to find main content container, or use body
    const mainContent = findMainContent(doc);
    
    // Pre-process the fallback content
    const tempContainer = document.createElement('div');
    const fallbackRoot = mainContent || doc.body;
    if (fallbackRoot) {
      tempContainer.append(...Array.from(fallbackRoot.childNodes, node => node.cloneNode(true)));
    }
    
    // Remove navigation, sidebars, footers, etc.
    const unwantedSelectors = [
      'nav', 'header', 'footer', 'aside',
      '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
      '.sidebar', '.navigation', '.nav', '.menu', '.toc',
      '.breadcrumb', '.pagination', '.comments',
      'script', 'style', 'noscript', 'iframe',
    ];
    unwantedSelectors.forEach(selector => {
      tempContainer.querySelectorAll(selector).forEach(el => el.remove());
    });
    
    const cleanedContent = tempContainer.innerHTML;
    let markdown = cleanMarkdown(htmlToMarkdown(cleanedContent));

    const ogImage = metadata['og:image'];
    if (ogImage && !markdown.includes(ogImage)) {
      let resolvedOgImage = ogImage;
      try {
        resolvedOgImage = new URL(ogImage, baseUrl).href;
      } catch {
        // Keep the original value when it is not a valid URL.
      }
      markdown = `![](${resolvedOgImage})\n\n${markdown}`;
    }

    const publishedDate = metadata['article:published_time'] || metadata.published || metadata.datePublished;
    const pageMetadata: PageMetadata = {
      ...metadata,
      title: article?.title || doc.title || undefined,
      source: doc.location?.href || undefined,
      author: article?.byline || metadata.author || undefined,
      published: publishedDate ? new Date(publishedDate).toISOString().split('T')[0] : undefined,
      description: article?.excerpt || metadata.description || metadata['og:description'] || undefined,
      siteName: article?.siteName || metadata['og:site_name'] || undefined,
      image: ogImage || undefined,
      tags: extractTags(doc),
    };
    
    return {
      title: article?.title || doc.title || 'Untitled',
      url: doc.location?.href || '',
      content: cleanedContent,
      markdown,
      author: article?.byline || undefined,
      siteName: article?.siteName || undefined,
      excerpt: article?.excerpt || undefined,
      metadata: pageMetadata,
    };
  }
  
  // Convert the extracted HTML content to Markdown
  let markdown = cleanMarkdown(htmlToMarkdown(article.content || ''));
  
  // If there's an og:image and it's not already in the markdown, prepend it as a featured image
  const ogImage = metadata['og:image'];
  if (ogImage && !markdown.includes(ogImage)) {
    // Resolve relative og:image URL if needed
    let resolvedOgImage = ogImage;
    if (!ogImage.startsWith('http://') && !ogImage.startsWith('https://')) {
      try {
        resolvedOgImage = new URL(ogImage, baseUrl).href;
      } catch {
        resolvedOgImage = ogImage;
      }
    }
    markdown = `![](${resolvedOgImage})\n\n${markdown}`;
  }
  // Extract published date from article metadata
  const publishedDate = metadata['article:published_time'] || metadata['published'] || metadata['datePublished'];
  const formattedPublished = publishedDate ? new Date(publishedDate).toISOString().split('T')[0] : undefined;

  const pageMetadata: PageMetadata = {
    ...metadata,
    title: article.title || doc.title || undefined,
    source: doc.location?.href || undefined,
    author: article.byline || metadata['author'] || undefined,
    published: formattedPublished,
    description: article.excerpt || metadata['description'] || metadata['og:description'] || undefined,
    siteName: article.siteName || metadata['og:site_name'] || undefined,
    image: metadata['og:image'] || undefined,
    tags: extractTags(doc),
  };

  return {
    title: article.title || doc.title || 'Untitled',
    url: doc.location?.href || '',
    content: article.content || '',
    markdown,
    author: article.byline || undefined,
    siteName: article.siteName || undefined,
    excerpt: article.excerpt || undefined,
    metadata: pageMetadata,
  };
}

/**
 * Extract tags/keywords from the page
 */
function extractTags(doc: Document): string[] {
  const tags: string[] = [];
  
  // Keywords meta tag
  const keywords = doc.querySelector('meta[name="keywords"]')?.getAttribute('content');
  if (keywords) {
    tags.push(...keywords.split(',').map(k => k.trim()).filter(Boolean));
  }
  
  // Article tags
  const articleTags = doc.querySelectorAll('meta[property="article:tag"]');
  articleTags.forEach(tag => {
    const content = tag.getAttribute('content');
    if (content && !tags.includes(content)) {
      tags.push(content);
    }
  });
  
  return tags.slice(0, 5); // Limit to 5 tags
}

/**
 * Extract metadata from the page
 */
export function extractMetadata(doc: Document): Record<string, string> {
  const metadata: Record<string, string> = {};
  
  // Standard meta tags
  const metaTags = doc.querySelectorAll('meta');
  metaTags.forEach((tag) => {
    const name = tag.getAttribute('name') || tag.getAttribute('property');
    const content = tag.getAttribute('content');
    if (name && content) {
      metadata[name] = content;
    }
  });
  
  // Open Graph
  const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
  const ogDescription = doc.querySelector('meta[property="og:description"]')?.getAttribute('content');
  const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');
  const ogSiteName = doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content');
  
  if (ogTitle) metadata['og:title'] = ogTitle;
  if (ogDescription) metadata['og:description'] = ogDescription;
  if (ogImage) metadata['og:image'] = ogImage;
  if (ogSiteName) metadata['og:site_name'] = ogSiteName;
  
  // Twitter Card
  const twitterTitle = doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content');
  const twitterDescription = doc.querySelector('meta[name="twitter:description"]')?.getAttribute('content');
  
  if (twitterTitle) metadata['twitter:title'] = twitterTitle;
  if (twitterDescription) metadata['twitter:description'] = twitterDescription;
  
  // Article metadata
  const articleAuthor = doc.querySelector('meta[name="author"]')?.getAttribute('content');
  const articlePublished = doc.querySelector('meta[property="article:published_time"]')?.getAttribute('content');
  
  if (articleAuthor) metadata['author'] = articleAuthor;
  if (articlePublished) metadata['published'] = articlePublished;
  
  return metadata;
}

/**
 * Get the currently selected text on the page
 */
export function getSelectedText(): string {
  const selection = window.getSelection();
  return selection?.toString().trim() || '';
}

/**
 * Get selected HTML content
 */
export function getSelectedHtml(): string {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return '';
  
  const range = selection.getRangeAt(0);
  const container = document.createElement('div');
  container.appendChild(range.cloneContents());
  
  return container.innerHTML;
}

/**
 * Convert selected HTML to Markdown
 */
export function getSelectedMarkdown(): string {
  const html = getSelectedHtml();
  if (!html) return '';
  
  return cleanMarkdown(htmlToMarkdown(html));
}
