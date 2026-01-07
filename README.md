# Octarine Clipper

A browser extension for clipping web pages and selections directly to [Octarine](https://octarine.app).

## Features

- **Full Page Clipping**: Extract and save entire articles using Mozilla's Readability algorithm
- **Selection Mode**: Batch multiple text selections from a page into a single clip
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
4. Configure the save location (optional)
5. Click "Send to Octarine"

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
