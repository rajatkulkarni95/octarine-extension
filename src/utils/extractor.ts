import { Readability } from '@mozilla/readability';
import { htmlToMarkdown, cleanMarkdown } from './markdown-converter';
import type { PageData } from '../types';

/**
 * Extract clean content from the current page using Readability
 */
export function extractPageContent(doc: Document): PageData | null {
  // Clone the document to avoid modifying the original
  const documentClone = doc.cloneNode(true) as Document;
  
  // Use Readability to extract the main content
  const reader = new Readability(documentClone, {
    charThreshold: 50,
  });
  
  const article = reader.parse();
  
  if (!article) {
    // Fallback: get the body content if Readability fails
    const bodyContent = doc.body?.innerHTML || '';
    const markdown = cleanMarkdown(htmlToMarkdown(bodyContent));
    
    return {
      title: doc.title || 'Untitled',
      url: doc.location?.href || '',
      content: bodyContent,
      markdown,
    };
  }
  
  // Convert the extracted HTML content to Markdown
  const markdown = cleanMarkdown(htmlToMarkdown(article.content || ''));
  
  return {
    title: article.title || doc.title || 'Untitled',
    url: doc.location?.href || '',
    content: article.content || '',
    markdown,
    author: article.byline || undefined,
    siteName: article.siteName || undefined,
    excerpt: article.excerpt || undefined,
  };
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
