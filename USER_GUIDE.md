# Octarine Web Clipper - User Guide

Welcome to Octarine Web Clipper, the browser extension that saves web content directly to folders in [Octarine](https://octarine.app).

## Table of Contents

- [Installation](#installation)
- [Getting Started](#getting-started)
- [Features](#features)
- [How to Use](#how-to-use)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Settings](#settings)
- [Troubleshooting](#troubleshooting)
- [FAQs](#faqs)

## Installation

### Chrome, Edge, Brave

1. Download the extension from the Chrome Web Store *(coming soon)*
2. Click "Add to Chrome"
3. Click "Add extension" in the confirmation dialog
4. The Octarine icon will appear in your browser toolbar

### Firefox

1. Use Firefox 142 or newer and download the extension from Firefox Add-ons *(coming soon)*
2. Click "Add to Firefox"
3. Click "Add" in the confirmation dialog
4. The Octarine icon will appear in your browser toolbar

### Safari (macOS)

1. Download the Safari extension *(coming soon)*
2. Open the downloaded `.app` file
3. Enable the extension in Safari Preferences → Extensions
4. The Octarine icon will appear in your browser toolbar

## Getting Started

1. **Install Octarine**: Make sure you have [Octarine](https://octarine.app) installed on your computer
2. **Install the Extension**: Follow the installation steps above
3. **Navigate to any webpage** you want to save
4. **Click the Octarine icon** in your browser toolbar
5. **Click "Send to Octarine"** to save the content

That's it! By default, the saved note opens in Octarine. Enable **Save without opening** in settings to keep Octarine in the background.

## Features

### Full Page Clipping
Extract and save entire articles with clean, readable formatting. The extension automatically removes ads, sidebars, and other distractions using Mozilla's Readability algorithm.

**Best for**: Blog posts, articles, documentation, tutorials

### Selection Mode
Highlight and save multiple text selections from a page into a single clip. Perfect for gathering related information scattered across a page.

**Best for**: Research, quotes, code snippets

### GitHub Integration

#### GitHub Issues Pages
Automatically extracts all visible issues from a GitHub repository's issues page as a clean markdown bullet list with clickable links.

**Example output**:
```markdown
# facebook/react Issues Page 1

- [#28000] Add support for feature X
- [#27999] Bug: Component crashes when...
- [#27998] Documentation: Update hooks guide
```

#### GitHub Pull Requests
Extracts comprehensive PR information including title, status, description, author, reviewers, and file changes.

**Example output**:
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

### Automatic Markdown Conversion
All content is automatically converted to clean Markdown format, preserving:
- Headings and formatting
- Links and images
- Code blocks
- Tables
- Lists

### Custom Save Paths
Configure where your clips are saved in Octarine by setting custom workspace and folder paths.

## How to Use

### Method 1: Browser Toolbar (Recommended)

1. Navigate to the webpage you want to clip
2. Click the **Octarine icon** in your browser toolbar
3. The popup will show a preview of the content
4. Choose your clipping mode:
   - **Full Page**: Automatically selected for most pages
   - **Selections**: Click to enable selection mode
   - **GitHub**: Automatically detected on GitHub pages
5. *(Optional)* Configure the save location
6. Click **"Send to Octarine"**

### Method 2: Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+Shift+O` (or `⌥⇧O` on Mac) | Open the clipper popup |
| `Alt+Shift+S` (or `⌥⇧S` on Mac) | Add current selection to batch |
| `Alt+Shift+C` (or `⌥⇧C` on Mac) | Instantly save page to Octarine |
| `Alt+Shift+T` (or `⌥⇧T` on Mac) | Append the page URL to Bookmarks |

**Quick Save**: Press `Alt+Shift+C` to instantly save the current page without opening the popup.

### Method 3: Context Menu (Right-Click)

**To clip selected text**:
1. Highlight text on any webpage
2. Right-click the selection
3. Choose **"Add selection to Octarine"**

**To clip the full page**:
1. Right-click anywhere on the page
2. Choose **"Clip page to Octarine"**

### Using Selection Mode

Selection mode lets you batch multiple text selections into a single clip:

1. Click the Octarine icon to open the popup
2. Click **"Start Selecting"** (or press `Alt+Shift+S`)
3. Highlight text on the page - it will be saved automatically
4. Continue highlighting additional sections
5. Open the popup again to review all selections
6. Click **"Send to Octarine"** to save everything together

**Tips**:
- Selections are numbered and preserved in order
- You can add as many selections as you need
- All selections are combined into a single markdown document

## Keyboard Shortcuts

### Windows/Linux

- **Alt+Shift+O** - Open clipper popup
- **Alt+Shift+S** - Add current selection to batch
- **Alt+Shift+C** - Instant save (no popup)
- **Alt+Shift+T** - Append URL to Bookmarks

### macOS

- **⌥⇧O** (Option+Shift+O) - Open clipper popup
- **⌥⇧S** (Option+Shift+S) - Add current selection to batch
- **⌥⇧C** (Option+Shift+C) - Instant save (no popup)
- **⌥⇧T** (Option+Shift+T) - Append URL to Bookmarks

### Customizing Shortcuts

**Chrome/Edge/Brave**:
1. Go to `chrome://extensions/shortcuts`
2. Find "Octarine Clipper"
3. Click the edit icon next to each shortcut
4. Press your desired key combination

**Firefox**:
1. Go to `about:addons`
2. Click the gear icon → "Manage Extension Shortcuts"
3. Find "Octarine Clipper" and customize

## Settings

Access extension settings by clicking the gear icon in the popup.

### Workspace
The Octarine workspace where clips will be saved. Leave empty to use your default workspace.

**Example**: `Personal`, `Work`, `Research`

### Folder
The folder path within your workspace where clips will be saved.

**Example**: `Clippings/Articles`, `Research/Papers`, `Work/Documentation`

**Tips**:
- Use `/` to create nested folders
- Folders are created automatically if they don't exist
- Leave empty to save to the workspace root

The clipper currently saves to folders. Octarine's managed Inbox is a Pro desktop feature and is intentionally not used by this extension yet.

### Save without opening
When enabled, clipping still saves the note but passes `openAfter=false` to Octarine. This setting applies to popup saves, instant clips, bookmarks, and saving all tabs.

### Multi-Selection Clip Mode
Choose whether a clip with multiple highlights saves only the selections or the full page with those selections highlighted.

## Troubleshooting

### The extension icon doesn't appear
- Make sure the extension is enabled in your browser's extension settings
- Try restarting your browser
- Check that the extension installed successfully

### Content isn't extracting properly
- **Try selection mode** instead of full page clipping
- Some websites block content extraction - selection mode works on all sites
- Refresh the page and try again

### Octarine doesn't open after clipping
- Make sure Octarine is installed on your computer
- Check that your browser allows opening `octarine://` links
- You may need to approve the protocol handler on first use

### GitHub pages aren't being detected
- Make sure you're on a valid GitHub issues or PR page
- Try refreshing the page
- Check the URL matches the expected format:
  - Issues: `github.com/<user>/<repo>/issues`
  - PR: `github.com/<user>/<repo>/pull/<number>`

### Keyboard shortcuts don't work
- Check that shortcuts are enabled in your browser settings
- Make sure the shortcuts aren't conflicting with other extensions
- Try customizing to different key combinations

### Content is missing formatting
- The extension converts HTML to Markdown - some complex formatting may be simplified
- Tables, code blocks, and links are preserved
- Try using selection mode to preserve specific sections

## FAQs

### Is this extension free?
Yes, the Octarine Clipper extension is completely free and open-source.

### What data does the extension collect?
None. The extension processes everything locally and sends content directly to your local Octarine installation. No data is sent to external servers.

### Can I clip from any website?
Yes! Full page clipping works best on article-style pages, but selection mode works on any website.

### How do I uninstall the extension?
- **Chrome/Edge/Brave**: Go to `chrome://extensions`, find Octarine Clipper, click "Remove"
- **Firefox**: Go to `about:addons`, find Octarine Clipper, click "Remove"
- **Safari**: Safari Preferences → Extensions → uncheck Octarine Clipper

### Can I customize the markdown output?
Yes. Open **Settings → Templates** to edit a built-in template or create your own. Custom templates use wildcard URL patterns such as `*.example.com/*`, and can customize the destination folder, Markdown content, and note properties. Use the URL tester before saving to confirm that a page will match.

### Does it support mobile browsers?
Not yet. The extension currently supports desktop browsers only.

## Need Help?

- **Report bugs**: [GitHub Issues](https://github.com/rajatkulkarni95/octarine-extension/issues)
- **Feature requests**: [GitHub Discussions](https://github.com/rajatkulkarni95/octarine-extension/discussions)
- **Octarine support**: [octarine.app](https://octarine.app)

## Privacy & Security

- **No tracking**: We don't collect any usage data or analytics
- **Local processing**: All content extraction happens in your browser
- **Direct transfer**: Content goes directly from your browser to your local Octarine app
- **Open source**: Full source code available for review

---

Made with ❤️ for [Octarine](https://octarine.app) users
