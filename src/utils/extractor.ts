import { Readability } from '@mozilla/readability';
import { htmlToMarkdown, cleanMarkdown, setBaseUrl } from './markdown-converter';
import type { PageData, PageMetadata } from '../types';

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
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  const hasHeadings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6').length > 0;
  const hasLists = tempDiv.querySelectorAll('ul, ol').length > 0;
  
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
 * Extract GitHub issues from an issues page
 */
function extractGitHubIssues(doc: Document): PageData | null {
  const url = doc.location?.href || '';

  // Check if we're on a GitHub issues page
  const isIssuesPage = /github\.com\/[^/]+\/[^/]+\/issues\/?(\?.*)?$/.test(url);
  if (!isIssuesPage) return null;

  const issues: string[] = [];
  const seenUrls = new Set<string>();

  // Find all links that point to individual issues
  const allLinks = doc.querySelectorAll('a[href*="/issues/"]');

  allLinks.forEach((link) => {
    const anchor = link as HTMLAnchorElement;
    const href = anchor.href;

    // Only process links that point to a specific issue number (not the issues list page)
    // and don't have fragment identifiers (like #issuecomment)
    if (/\/issues\/\d+$/.test(href) && !seenUrls.has(href)) {
      // Get the text content, cleaning up whitespace
      let title = anchor.textContent?.trim() || '';

      // Skip if the link is just the issue number (like "#209")
      if (title && !title.match(/^#\d+$/)) {
        seenUrls.add(href);
        issues.push(`- [${title}](${href})`);
      }
    }
  });

  if (issues.length === 0) return null;

  const markdown = issues.join('\n');

  // Extract repo name from URL
  const repoMatch = url.match(/github\.com\/([^/]+\/[^/]+)/);
  const repoName = repoMatch ? repoMatch[1] : 'GitHub Issues';

  // Extract page number from URL query params
  const urlObj = new URL(url);
  const pageParam = urlObj.searchParams.get('page');
  const pageNumber = pageParam ? parseInt(pageParam, 10) : 1;

  return {
    title: `${repoName} Issues Page ${pageNumber}`,
    url,
    content: `<ul>${issues.map(i => `<li>${i}</li>`).join('')}</ul>`,
    markdown,
  };
}

/**
 * Extract clean content from the current page using Readability
 */
export function extractPageContent(doc: Document): PageData | null {
  // Try GitHub-specific extraction first
  const githubData = extractGitHubIssues(doc);
  if (githubData) return githubData;

  // Set base URL for resolving relative image URLs
  const baseUrl = doc.location?.href || doc.baseURI || '';
  setBaseUrl(baseUrl);

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
    const fallbackContent = mainContent?.innerHTML || doc.body?.innerHTML || '';
    
    // Pre-process the fallback content
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = fallbackContent;
    
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
    const markdown = cleanMarkdown(htmlToMarkdown(cleanedContent));
    
    return {
      title: article?.title || doc.title || 'Untitled',
      url: doc.location?.href || '',
      content: cleanedContent,
      markdown,
      author: article?.byline || undefined,
      siteName: article?.siteName || undefined,
      excerpt: article?.excerpt || undefined,
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
