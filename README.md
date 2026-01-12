# Octarine Clipper

A browser extension for clipping web pages and selections directly to [Octarine](https://octarine.app).

## Features

- **Full Page Clipping**: Extract and save entire articles using Mozilla's Readability algorithm
- **Selection Mode**: Batch multiple text selections from a page into a single clip
- **GitHub Integration**:
  - **Issues Extraction**: Automatically extracts issue lists from GitHub issues pages as markdown bullet lists with links
  - **Pull Request Details**: Extracts PR title, status, description, author, reviewers, and file changes
- **Markdown Conversion**: Automatically converts HTML content to clean Markdown
- **Keyboard Shortcuts**: Quick access with `Alt+Shift+O` (open popup), `Alt+Shift+S` (add selection), and `Alt+Shift+C` (instant save)
- **Context Menu Integration**: Right-click to clip selections or pages
- **Compression**: Uses LZ-String compression for efficient data transfer via deeplinks
- **Custom Save Paths**: Configure the destination folder and workspace

## Installation

### Development

1. Clone the repository:
   ```bash
   git clone https://github.com/rajatkulkarni95/octarine-extension.git
   cd octarine-extension
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Build the extension:
   ```bash
   pnpm build
   ```

4. Load the extension in your browser:

   **Chrome/Edge/Brave:**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

   **Firefox:**
   - Navigate to `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select any file in the `dist` folder

### Development Mode

For live reloading during development:

```bash
pnpm build:watch
```

## Usage

1. Navigate to any web page you want to clip
2. Click the Octarine Clipper icon in your browser toolbar
3. Choose between:
   - **Full Page**: Clips the entire article content
   - **Selections**: Add multiple text selections before clipping
   - **GitHub**: Automatically extracts issues or PR details from GitHub pages
4. Configure the save location (optional)
5. Click "Send to Octarine"

### Special Page Support

#### GitHub Issues
When on a page like `github.com/<user>/<repo>/issues`, the extension will automatically extract all visible issues as a markdown bullet list with links. The title will be formatted as `<repo_name> Issues Page <page_number>` (e.g., "facebook/react Issues Page 1").

#### GitHub Pull Requests
When on a PR page like `github.com/<user>/<repo>/pull/<number>`, the extension extracts:
- PR title and number
- Status (Open/Merged/Closed) with dates
- Author and reviewers
- Description/first comment
- File changes statistics (+/- lines, files changed)

Example output:
```markdown
# [PR #123] Fix authentication bug

**Status**: ✅ Merged on Jan 8, 2024
**Author**: @username
**Reviewers**: @reviewer1, @reviewer2

## Description
The authentication token was expiring...

## Changes
- 5 files changed
- +45 lines added
- -23 lines removed
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+Shift+O` | Open clipper popup |
| `Alt+Shift+S` | Add current selection to batch |
| `Alt+Shift+C` | Instantly save page to Octarine |

### Context Menu

- **Right-click on selected text**: "Add selection to Octarine"
- **Right-click on page**: "Clip page to Octarine"

## Architecture

```
src/
├── background/
│   └── index.ts          # Service worker for context menus and commands
├── content/
│   └── index.ts          # Content script for page interaction
├── popup/
│   ├── App.tsx           # Main popup UI component
│   └── main.tsx          # Popup entry point
├── utils/
│   ├── extractor.ts      # Page content extraction (Readability)
│   ├── markdown-converter.ts  # HTML to Markdown conversion
│   ├── compression.ts    # LZ-String compression utilities
│   └── deeplink.ts       # Octarine URI scheme generation
└── types/
    └── index.ts          # TypeScript type definitions
```

### Component Overview

| Component | Description |
|-----------|-------------|
| **Background Script** | Handles extension lifecycle, context menus, and keyboard shortcuts |
| **Content Script** | Runs on web pages to extract content and handle selections |
| **Popup** | React-based UI for previewing and configuring clips |
| **Extractor** | Uses Readability to extract clean article content from pages |
| **Markdown Converter** | Converts HTML to Markdown with support for tables, code blocks, and more |
| **Deeplink Generator** | Creates `octarine://` URIs with compressed payloads |

### Data Flow

1. User triggers clip action (popup, shortcut, or context menu)
2. Content script extracts page content using Readability
3. HTML is converted to Markdown via Turndown
4. Content is compressed using LZ-String
5. Deeplink is generated and opened, launching Octarine

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Vite dev server |
| `pnpm build` | Build for production |
| `pnpm build:watch` | Build with file watching |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript type checking |

## Adding Custom Extractors/Parsers

The extension uses a template-based extraction system that allows you to add support for new websites and content types. Each template defines how to extract and format content from specific pages.

### Template Architecture

Templates consist of:
- **URL Pattern Matching** - Regular expressions to identify matching pages
- **Data Extraction** - Logic to extract content from the DOM
- **Property Definitions** - Structured metadata to extract (author, date, tags, etc.)
- **Content Template** - Markdown template with placeholders for the final output

### Creating a New Template

#### 1. Create the Template File

Create a new file in `src/utils/templates/` (e.g., `my-site-template.ts`):

```typescript
import { BaseTemplate } from "./base-template";
import type { PropertyDefinition } from "../../types/template";
import { PropertyType } from "../../types/template";

/**
 * My Site Template
 * Extracts content from example.com
 */
class MySiteTemplate extends BaseTemplate {
  // Unique identifier
  id = "my-site";

  // Display name shown in UI
  name = "My Site";

  // Description for users
  description = "Extract articles from example.com";

  // URL patterns to match (uses RegExp)
  urlPatterns = [/example\.com\/articles\/[\w-]+/];

  // Priority for template selection (higher = preferred)
  priority = 10;

  // Default save location
  defaultFolder = "Articles/MySite";

  // Default filename template (supports {placeholders})
  defaultFilename = "{slug}-{date}";

  // Template version
  version = "1.0.0";

  // Define extractable properties
  properties: PropertyDefinition[] = [
    {
      key: "author",
      displayName: "Author",
      type: PropertyType.String,
      required: false,
      enabled: true,
    },
    {
      key: "publishedDate",
      displayName: "Published",
      type: PropertyType.Date,
      required: false,
      enabled: true,
    },
    {
      key: "tags",
      displayName: "Tags",
      type: PropertyType.Array,
      required: false,
      enabled: true,
    },
  ];

  // Content template (supports {placeholder} syntax)
  contentTemplate = `
{if:author}
**Author**: {author}
{/if}

{if:publishedDate}
**Published**: {publishedDate}
{/if}

{if:tags}
**Tags**: {each:tags}{value}, {/each}
{/if}

{content}
`;

  // Main extraction logic
  extract(doc: Document): Record<string, any> {
    const url = this.getUrl(doc);

    // Extract title
    const titleElement = this.querySelector(
      doc,
      ".article-title",
      "h1.title"
    );
    const title = this.getText(titleElement) || "Untitled";

    // Extract author
    const authorElement = this.querySelector(doc, ".author-name");
    const author = this.getText(authorElement);

    // Extract date
    const dateElement = this.querySelector(doc, "time");
    const dateStr = this.getAttribute(dateElement, "datetime");
    const publishedDate = this.parseDate(dateStr);

    // Extract tags
    const tags: string[] = [];
    const tagElements = this.querySelectorAll(doc, ".tag");
    tagElements.forEach(tag => {
      tags.push(this.getText(tag));
    });

    // Extract main content
    const contentElement = this.querySelector(doc, ".article-content");
    const content = contentElement?.innerHTML || "";

    // Extract slug from URL
    const slugMatch = url.match(/\/articles\/([\w-]+)/);
    const slug = slugMatch ? slugMatch[1] : "article";

    return {
      title,
      author,
      publishedDate,
      tags,
      content,
      slug,
      url,
    };
  }
}

// Export singleton instance
export const mySiteTemplate = new MySiteTemplate();
```

#### 2. Register the Template

Add your template to `src/utils/templates/index.ts`:

```typescript
import { mySiteTemplate } from './my-site-template';

export const builtInTemplates: Template[] = [
  githubPRTemplate,
  githubIssuesTemplate,
  mySiteTemplate, // Add your template here
];
```

#### 3. Property Types

Available property types in `PropertyType`:

| Type | Description | Example |
|------|-------------|---------|
| `String` | Text values | "John Doe" |
| `Number` | Numeric values | 42 |
| `Date` | Date/time values | Date object |
| `Array` | Lists of values | ["tag1", "tag2"] |
| `Boolean` | True/false values | true |
| `URL` | URL strings | "https://..." |

#### 4. Helper Methods

`BaseTemplate` provides these helper methods:

- `getText(element)` - Extract text content from an element
- `getAttribute(element, attr)` - Get attribute value
- `querySelector(doc, ...selectors)` - Query with fallback selectors
- `querySelectorAll(doc, selector)` - Query all matching elements
- `getUrl(doc)` - Get current page URL
- `parseDate(dateString)` - Parse date from string
- `extractNumber(text)` - Extract first number from text
- `cleanText(text)` - Normalize whitespace
- `isVisible(element)` - Check if element is visible

#### 5. Content Template Syntax

Templates support:

**Placeholders**: `{propertyName}`
```markdown
Title: {title}
Author: {author}
```

**Conditionals**: `{if:property}...{/if}`
```markdown
{if:author}
Written by {author}
{/if}
```

**Loops**: `{each:arrayProperty}...{/each}`
```markdown
Tags:
{each:tags}
- {value}
{/each}
```

#### 6. Testing Your Template

1. Build the extension: `pnpm build`
2. Reload the extension in your browser
3. Navigate to a matching URL
4. Click the extension icon - your template should be auto-detected
5. Check the preview and verify all properties are extracted correctly

### Example: Reddit Thread Template

Here's a more complex example for extracting Reddit threads:

```typescript
class RedditThreadTemplate extends BaseTemplate {
  id = "reddit-thread";
  name = "Reddit Thread";
  description = "Extract Reddit thread with comments";
  urlPatterns = [/reddit\.com\/r\/[\w]+\/comments\/[\w]+/];
  priority = 10;
  defaultFolder = "Social/Reddit";
  defaultFilename = "reddit-{subreddit}-{postId}";
  version = "1.0.0";

  properties: PropertyDefinition[] = [
    { key: "subreddit", displayName: "Subreddit", type: PropertyType.String, required: true, enabled: true },
    { key: "author", displayName: "Author", type: PropertyType.String, required: false, enabled: true },
    { key: "upvotes", displayName: "Upvotes", type: PropertyType.Number, required: false, enabled: true },
    { key: "commentCount", displayName: "Comments", type: PropertyType.Number, required: false, enabled: true },
  ];

  contentTemplate = `
**r/{subreddit}** • Posted by u/{author} • {upvotes} upvotes • {commentCount} comments

---

{content}
`;

  extract(doc: Document): Record<string, any> {
    const url = this.getUrl(doc);

    // Extract from URL
    const match = url.match(/\/r\/([\w]+)\/comments\/([\w]+)/);
    const subreddit = match?.[1] || "";
    const postId = match?.[2] || "";

    // Extract post details
    const title = this.getText(this.querySelector(doc, 'h1'));
    const author = this.getText(this.querySelector(doc, '[data-testid="post-author"]'));
    const upvotesText = this.getText(this.querySelector(doc, '[data-testid="vote-count"]'));
    const upvotes = this.extractNumber(upvotesText);

    // Extract content
    const contentEl = this.querySelector(doc, '[data-testid="post-content"]');
    const content = contentEl?.innerHTML || "";

    // Count comments
    const commentEls = this.querySelectorAll(doc, '[data-testid="comment"]');
    const commentCount = commentEls.length;

    return {
      title: `${title} - r/${subreddit}`,
      subreddit,
      postId,
      author,
      upvotes,
      commentCount,
      content,
      url,
    };
  }
}
```

### Tips for Template Development

1. **Use Browser DevTools** - Inspect the page to find reliable selectors
2. **Provide Fallback Selectors** - Sites change their HTML; use multiple selectors via `querySelector(doc, 'selector1', 'selector2')`
3. **Handle Missing Data** - Always check if elements exist before extracting
4. **Test Edge Cases** - Try different page variations (empty content, missing fields, etc.)
5. **Set Appropriate Priority** - Higher priority (10+) for specific matches, lower (5) for generic patterns
6. **Use Descriptive Property Keys** - Makes debugging easier and templates more readable

## Acknowledgements

This extension is built with the following open-source tools:

- **[@mozilla/readability](https://github.com/mozilla/readability)** - Article extraction library used by Firefox Reader View
- **[Turndown](https://github.com/mixmark-io/turndown)** - HTML to Markdown converter
- **[LZ-String](https://github.com/pieroxy/lz-string)** - Fast compression for deeplink payloads
- **[webextension-polyfill](https://github.com/niccokunzmann/niccokunzmann.github.io)** - Cross-browser extension API compatibility
- **[React](https://react.dev)** - UI framework
- **[Vite](https://vite.dev)** - Build tool
- **[@crxjs/vite-plugin](https://crxjs.dev/vite-plugin)** - Vite plugin for browser extension development
- **[Tailwind CSS](https://tailwindcss.com)** - Utility-first CSS framework

## License

MIT
