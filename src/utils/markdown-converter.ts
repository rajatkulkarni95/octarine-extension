import TurndownService from 'turndown';

// Create and configure Turndown service
const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
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
    
    const src = img.getAttribute('src') || '';
    const alt = img.getAttribute('alt') || figcaption?.textContent?.trim() || '';
    
    let result = `![${alt}](${src})`;
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
    // Clean up whitespace
    .trim();
}

export { turndownService };
