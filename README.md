# Octarine Web Clipper

An open-source browser extension that captures web pages and selections as local Markdown notes in [Octarine](https://octarine.app).

## Features

- Readability-based article extraction and Markdown conversion
- Multi-selection highlighting and editable previews
- Specialized GitHub pull request and issues-page templates
- Configurable workspace, destination folders, templates, and typed properties
- Full-page, selection, instant-clip, bookmark, and all-tabs workflows
- Chrome/Edge/Brave, Firefox, and Safari build targets
- Local-only processing; no analytics or remote content service

Clips are currently sent to an explicit folder through Octarine's `octarine://` desktop protocol. Managed Inbox support is intentionally not included.

## Requirements

- [Octarine](https://octarine.app) installed with deep links enabled
- Node.js 20 or newer
- pnpm 8.15.9

## Try the extension from GitHub

Until the browser-store listings are available, download the appropriate ZIP from the [latest GitHub release](https://github.com/rajatkulkarni95/octarine-extension/releases/latest). You still need [Octarine](https://octarine.app) installed with deep links enabled.

### Chrome, Edge, or Brave

1. Download `octarine-web-clipper-chromium.zip` and extract it to a folder.
2. Open `chrome://extensions` in Chrome, `edge://extensions` in Edge, or `brave://extensions` in Brave.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the extracted folder containing `manifest.json`.

Keep that folder in place while the extension is installed. To update, replace its contents with a newer release and click **Reload** on the extensions page.

### Firefox

1. Download `octarine-web-clipper-firefox.zip` and extract it.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on** and select `manifest.json` from the extracted folder.

Firefox removes temporary add-ons when the browser restarts. A permanent installation requires the signed XPI from Firefox Add-ons.

### Safari

Safari cannot load the release ZIP directly as an unpacked extension. Building the Safari app wrapper currently requires the source code, macOS, Xcode, and `pnpm safari:convert`. Most users should wait for the App Store release.

## Develop

```bash
pnpm install --frozen-lockfile
pnpm build
```

Load `dist/chromium` as an unpacked extension in a Chromium browser. Other targets:

```bash
pnpm build:firefox  # dist/firefox
pnpm build:safari   # dist/safari
pnpm build:all
```

For Chromium watch builds, run `pnpm build:watch`. Before contributing, run:

```bash
pnpm lint
pnpm typecheck
pnpm test:run
pnpm package
```

## Use

| Shortcut | Action |
| --- | --- |
| `Alt+Shift+O` / `⌥⇧O` | Open the clipper |
| `Alt+Shift+S` / `⌥⇧S` | Add the current selection |
| `Alt+Shift+C` / `⌥⇧C` | Instantly save the page |
| `Alt+Shift+T` / `⌥⇧T` | Append the URL to Bookmarks |

The popup lets you preview and edit the Markdown, choose a workspace and folder, and decide whether Octarine should open after saving. See [the user guide](USER_GUIDE.md) for detailed usage.

## Package and publish

`pnpm package` creates store-ready ZIP inputs in `artifacts/`. Safari additionally requires Xcode and `pnpm safari:convert`. See [Publishing](PUBLISHING.md) for signing, store submission, privacy disclosures, and release steps.

## Project policy

- [Contributing](CONTRIBUTING.md)
- [Privacy](PRIVACY.md)
- [Security](SECURITY.md)
- [Changelog](CHANGELOG.md)
- [MIT license](LICENSE)

The extension requests access to web pages because extraction happens in the page. Extracted content and settings stay on the device and are passed only to the locally installed Octarine app.
