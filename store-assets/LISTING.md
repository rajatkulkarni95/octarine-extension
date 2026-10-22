# Octarine Web Clipper Store Listing

## Product details

- **Name:** Octarine Web Clipper
- **Category:** Productivity
- **Language:** English
- **Website:** https://octarine.app
- **Support:** https://octarine.app/contact
- **Privacy policy:** https://github.com/rajatkulkarni95/octarine-feedback/blob/main/OCTARINE_WEB_CLIPPER_PRIVACY.md
- **License:** MIT

## Short description

Capture web pages and selections as local Markdown notes in Octarine.

## Detailed description

Octarine Web Clipper turns useful web content into clean, local Markdown notes in Octarine.

Use it to:

- Clip a readable version of the current page.
- Save selected passages while preserving links and formatting.
- Collect multiple highlights into one note.
- Save a URL directly to your bookmarks note.
- Capture all open tabs.
- Extract structured details from GitHub pull requests and issue lists.
- Save Hacker News threads (on news.ycombinator.com or hckrnws.com) and X threads with replies as nested quotes.
- Create custom templates that match websites, format Markdown, add properties, and choose destination folders. Share them as JSON.

Everything is processed in your browser and sent directly to the Octarine desktop app through its local `octarine://` protocol. The extension has no analytics, advertising, account system, or external data service.

Octarine must be installed with deep links enabled.

## Chrome single-purpose statement

Octarine Web Clipper has one purpose: capture user-requested web content as local Markdown notes in the Octarine desktop application.

## Permission justifications

- **activeTab:** Reads the page the user explicitly chooses to clip or highlight.
- **contextMenus:** Provides user-invoked clipping and bookmark actions from the browser context menu.
- **storage:** Stores local preferences, destination folders, properties, and user-created templates.
- **scripting:** Injects the packaged content script when clipping a tab where it is not already active.
- **tabs:** Finds the active tab and, only when the user selects “Save all tabs,” reads titles and URLs from open tabs.
- **Host access (`<all_urls>`):** Clipping must work on any website the user visits. Access is used only to extract content for user-invoked clipping features; browser-restricted pages remain inaccessible.

## Privacy answers

- **Remote code:** No. All executable code is packaged with the extension.
- **Data sale or advertising:** No.
- **Analytics or tracking:** No.
- **Account or authentication data:** Not collected.
- **Website content:** Processed locally only when clipping or highlighting. It is sent directly to the locally installed Octarine app and not to the publisher or a third party.
- **Browsing activity:** Not collected or retained. “Save all tabs” reads tab titles and URLs only after the user invokes that action. On X post pages, posts that load on screen are kept in memory in that tab so a thread clip can include replies the user scrolled past; this is never stored or sent anywhere, is replaced when the tab opens another post, and is discarded when the page reloads or the tab closes.
- **User-created templates and settings:** Stored locally in browser extension storage and never sent to the publisher.

## Reviewer instructions

1. Install the current public release of Octarine from https://octarine.app and enable deep links.
2. Open an article page and click the Octarine Web Clipper toolbar icon.
3. Confirm that the popup shows a Markdown preview and properties.
4. Click **Save to Octarine** and allow the browser’s external-protocol prompt. Confirm that Octarine opens the note.
5. Open extension Settings → Templates → New template.
6. Enter a name, a wildcard such as `*.example.com/*`, a test URL, folder, and Markdown content; save it and confirm it appears in the template list and popup selector.
7. Open a Hacker News discussion such as https://news.ycombinator.com/item?id=8863, open the popup, and confirm that the Hacker News Thread template is selected and the preview shows comments as nested quotes.
8. No login or reviewer credentials are required.

## Release notes — 1.1.0

- New built-in templates for Hacker News (including hckrnws.com) and X threads. Replies are saved as nested quotes, and X clips include replies you scrolled past.
- Import templates from JSON and copy your own to share them.
- Clips no longer add an automatic title heading, so the saved note matches the preview. Add `# {title}` to a template to keep one.
- The Default template's content setting now applies to clips.

## Release notes — 1.0.0

Initial public release of Octarine Web Clipper, including page and selection clipping, multi-highlight capture, bookmarks, all-tabs capture, GitHub templates, and user-created templates.
