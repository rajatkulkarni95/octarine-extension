import TurndownService from 'turndown';

// Store base URL for resolving relative image URLs
let currentBaseUrl: string = '';

export function setBaseUrl(url: string): void {
  currentBaseUrl = url;
}

/**
 * Resolve a potentially relative URL to an absolute URL
 */
function resolveUrl(src: string, baseUrl: string): string {
  if (!src) return '';
  
  // Already absolute
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
    return src;
  }
  
  // Protocol-relative URL
  if (src.startsWith('//')) {
    return 'https:' + src;
  }
  
  // Relative URL - resolve against base
  try {
    return new URL(src, baseUrl).href;
  } catch {
    return src;
  }
}

/**
 * Get the best available image source from an img element
 * Handles lazy-loading attributes and srcset
 */
function getBestImageSrc(img: HTMLElement): string {
  // Check common lazy-loading attributes first (these often have the real/high-res URL)
  const lazySrcAttrs = [
    'data-src',
    'data-lazy-src', 
    'data-original',
    'data-src-retina',
    'data-full-src',
    'data-image',
  ];
  
  for (const attr of lazySrcAttrs) {
    const value = img.getAttribute(attr);
    if (value && !value.startsWith('data:image/gif') && !value.startsWith('data:image/svg')) {
      return value;
    }
  }
  
  // Check srcset for the highest resolution image
  const srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset');
  if (srcset) {
    const sources = srcset.split(',').map(s => s.trim());
    // Get the last (usually highest resolution) source
    const lastSource = sources[sources.length - 1];
    const srcMatch = lastSource.match(/^(\S+)/);
    if (srcMatch) {
      return srcMatch[1];
    }
  }
  
  // Fall back to regular src
  return img.getAttribute('src') || '';
}

// Create and configure Turndown service
const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
});

// Handle images with lazy-loading and relative URL support
turndownService.addRule('image', {
  filter: 'img',
  replacement: (_content, node) => {
    const img = node as HTMLElement;
    const src = getBestImageSrc(img);
    
    if (!src) return '';
    
    // Skip tiny tracking pixels and spacer images
    const width = img.getAttribute('width');
    const height = img.getAttribute('height');
    if ((width === '1' || width === '0') && (height === '1' || height === '0')) {
      return '';
    }
    
    // Skip base64 placeholder images (tiny ones)
    if (src.startsWith('data:') && src.length < 200) {
      return '';
    }
    
    const resolvedSrc = resolveUrl(src, currentBaseUrl);
    const alt = img.getAttribute('alt') || img.getAttribute('title') || '';
    
    // Clean alt text - remove newlines and excessive whitespace
    const cleanAlt = alt.replace(/\s+/g, ' ').trim();
    
    return `![${cleanAlt}](${resolvedSrc})`;
  },
});

// Preserve code blocks with language hints
turndownService.addRule('fencedCodeBlock', {
  filter: (node) => {
    return (
      node.nodeName === 'PRE' &&
      node.firstChild !== null &&
      node.firstChild.nodeName === 'CODE'
    );
  },
  replacement: (_content, node) => {
    const codeNode = node.firstChild as HTMLElement;
    const className = codeNode.getAttribute('class') || '';
    const languageMatch = className.match(/language-(\w+)/);
    const language = languageMatch ? languageMatch[1] : '';
    const code = codeNode.textContent || '';
    return `\n\`\`\`${language}\n${code}\n\`\`\`\n`;
  },
});

// Handle strikethrough
turndownService.addRule('strikethrough', {
  filter: ['del', 's'],
  replacement: (content) => `~~${content}~~`,
});

// Handle legacy <strike> element
turndownService.addRule('strikethroughLegacy', {
  filter: (node) => node.nodeName === 'STRIKE',
  replacement: (content) => `~~${content}~~`,
});

// Handle mark/highlight
turndownService.addRule('highlight', {
  filter: ['mark'],
  replacement: (content) => `==${content}==`,
});

// Handle tables
turndownService.addRule('table', {
  filter: 'table',
  replacement: (_content, node) => {
    const table = node as HTMLTableElement;
    const rows = Array.from(table.querySelectorAll('tr'));
    
    if (rows.length === 0) return '';
    
    const result: string[] = [];
    
    rows.forEach((row, rowIndex) => {
      const cells = Array.from(row.querySelectorAll('th, td'));
      const cellContents = cells.map((cell) => {
        const text = cell.textContent?.trim().replace(/\|/g, '\\|') || '';
        return text;
      });
      
      result.push(`| ${cellContents.join(' | ')} |`);
      
      // Add header separator after first row if it contains th elements
      if (rowIndex === 0 && row.querySelector('th')) {
        result.push(`| ${cells.map(() => '---').join(' | ')} |`);
      } else if (rowIndex === 0) {
        result.push(`| ${cells.map(() => '---').join(' | ')} |`);
      }
    });
    
    return `\n${result.join('\n')}\n`;
  },
});

// Handle figure with caption
turndownService.addRule('figure', {
  filter: 'figure',
  replacement: (_content, node) => {
    const figure = node as HTMLElement;
    const img = figure.querySelector('img');
    const figcaption = figure.querySelector('figcaption');
    
    if (!img) return '';
    
    const src = getBestImageSrc(img);
    if (!src) return '';
    
    const resolvedSrc = resolveUrl(src, currentBaseUrl);
    const alt = img.getAttribute('alt') || figcaption?.textContent?.trim() || '';
    const cleanAlt = alt.replace(/\s+/g, ' ').trim();
    
    let result = `![${cleanAlt}](${resolvedSrc})`;
    if (figcaption) {
      result += `\n*${figcaption.textContent?.trim()}*`;
    }
    
    return `\n${result}\n`;
  },
});

// Handle blockquotes with citations
turndownService.addRule('blockquoteWithCite', {
  filter: (node) => {
    return node.nodeName === 'BLOCKQUOTE' && node.hasAttribute('cite');
  },
  replacement: (content, node) => {
    const cite = (node as HTMLElement).getAttribute('cite');
    const trimmedContent = content.trim().replace(/\n/g, '\n> ');
    return `\n> ${trimmedContent}\n> — [Source](${cite})\n`;
  },
});

export function htmlToMarkdown(html: string): string {
  return turndownService.turndown(html);
}

export function cleanMarkdown(markdown: string): string {
  return markdown
    // Remove excessive newlines
    .replace(/\n{3,}/g, '\n\n')
    // Escape setext heading markers (lines with only ==== or ----)
    // to prevent them from being interpreted as heading underlines
    .replace(/^(={3,}|-{3,})$/gm, (match) => {
      // Escape by adding backslash before first character
      return '\\' + match;
    })
    // Clean up whitespace
    .trim();
}

export { turndownService };
