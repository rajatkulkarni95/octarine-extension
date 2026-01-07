import { Readability } from '@mozilla/readability';
import { htmlToMarkdown, cleanMarkdown, setBaseUrl } from './markdown-converter';
import type { PageData, PageMetadata } from '../types';

/**
 * Extract clean content from the current page using Readability
 */
export function extractPageContent(doc: Document): PageData | null {
  // Set base URL for resolving relative image URLs
  const baseUrl = doc.location?.href || doc.baseURI || '';
  setBaseUrl(baseUrl);
  
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
  let markdown = cleanMarkdown(htmlToMarkdown(article.content || ''));
  
  // Extract metadata for properties display
  const metadata = extractMetadata(doc);
  
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
