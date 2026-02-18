import browser from "webextension-polyfill";
import {
  extractPageContent,
  getSelectedText,
  getSelectedMarkdown,
} from "../utils/extractor";
import { htmlToMarkdown, cleanMarkdown, setBaseUrl } from "../utils/markdown-converter";
import {
  generateClipLink,
  generateCreateLink,
  generateDailyLink,
  openDeeplink,
} from "../utils/deeplink";
import type {
  ExtensionMessage,
  ExtensionResponse,
  ClipSelection,
  ClipPayload,
} from "../types";
import { initializeTemplates } from "../utils/templates";

// Initialize template system
initializeTemplates();

// Store for batched selections
let selections: ClipSelection[] = [];

// Floating toolbar reference
let floatingToolbar: HTMLElement | null = null;

// CSS classes for highlighting
const HOVER_OVERLAY_CLASS = "octarine-hover-overlay";
const HIGHLIGHT_OVERLAY_CLASS = "octarine-highlight-overlay";
const TOOLBAR_ID = "octarine-floating-toolbar";

// Multi-highlight mode state
let multiHighlightMode = false;
let hoverOverlay: HTMLElement | null = null;
let currentHoveredElement: Element | null = null;
const highlightedElements = new Map<string, Element>(); // xpath -> element

// Allowed block-level elements to highlight
const ALLOWED_HIGHLIGHT_TAGS = [
  'P', 'DIV', 'SECTION', 'ARTICLE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'LI', 'BLOCKQUOTE', 'PRE', 'CODE', 'FIGURE', 'FIGCAPTION',
  'TABLE', 'TR', 'TD', 'TH', 'UL', 'OL', 'DL'
];

/**
 * Inject CSS styles for highlighting
 */
function injectStyles(): void {
  if (document.getElementById("octarine-highlight-styles")) return;

  const style = document.createElement("style");
  style.id = "octarine-highlight-styles";
  style.textContent = `
    /* Hover overlay - shows on mouseover */
    .${HOVER_OVERLAY_CLASS} {
      position: absolute;
      pointer-events: none;
      z-index: 999999998;
      border: 2px dashed #fbbf24;
      border-radius: 4px;
      box-sizing: border-box;
      transition: opacity 0.1s ease;
    }

    /* Highlight overlay - shows when selected */
    .${HIGHLIGHT_OVERLAY_CLASS} {
      position: absolute;
      pointer-events: none;
      z-index: 999999997;
      background-color: rgba(255, 235, 0, 0.5);
      border-radius: 4px;
      box-sizing: border-box;
      mix-blend-mode: multiply;
    }

    #${TOOLBAR_ID} {
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      background: #1f2937;
      border-radius: 6px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      color: white;
      animation: slideDown 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    #${TOOLBAR_ID}.empty {
      border: 2px dashed rgba(255, 255, 255, 0.3);
    }

    @keyframes slideDown {
      from {
        transform: translateX(-50%) translateY(-100px);
        opacity: 0;
      }
      to {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
    }

    #${TOOLBAR_ID} .count-text {
      font-size: 13px;
      color: white;
      font-weight: 500;
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 4px;
      transition: all 0.15s ease;
    }

    #${TOOLBAR_ID} .count-text:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    #${TOOLBAR_ID}.empty .count-text {
      color: rgba(255, 255, 255, 0.6);
      cursor: default;
    }

    #${TOOLBAR_ID}.empty .count-text:hover {
      background: transparent;
    }

    #${TOOLBAR_ID} .separator {
      width: 1px;
      height: 16px;
      background: rgba(255, 255, 255, 0.2);
      margin: 0 2px;
    }

    #${TOOLBAR_ID} button {
      background: transparent;
      border: none;
      color: #8b5cf6;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 600;
      transition: all 0.15s ease;
      line-height: 1;
    }

    #${TOOLBAR_ID} button:hover {
      background: rgba(139, 92, 246, 0.15);
      color: #a78bfa;
    }

    #${TOOLBAR_ID} svg {
      width: 16px;
      height: 16px;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Get XPath for an element
 */
function getXPath(element: Element): string {
  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }

  const parts: string[] = [];
  let current: Element | null = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 0;
    let sibling: Element | null = current;

    while (sibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === current.tagName) {
        index++;
      }
      sibling = sibling.previousElementSibling;
    }

    const tagName = current.tagName.toLowerCase();
    const part = index > 1 ? `${tagName}[${index}]` : tagName;
    parts.unshift(part);

    current = current.parentElement;
  }

  return parts.length ? '/' + parts.join('/') : '';
}

/**
 * Find element that should be highlighted
 */
function findHighlightableElement(target: Element): Element | null {
  let current: Element | null = target;

  // Walk up the DOM tree to find a highlightable element
  while (current && current !== document.body) {
    if (ALLOWED_HIGHLIGHT_TAGS.includes(current.tagName)) {
      // Skip if too large (likely a container)
      const rect = current.getBoundingClientRect();
      if (rect.height < window.innerHeight * 0.8 && rect.width > 0) {
        return current;
      }
    }
    current = current.parentElement;
  }

  return null;
}

/**
 * Create or update hover overlay
 */
function showHoverOverlay(element: Element): void {
  const rect = element.getBoundingClientRect();

  if (!hoverOverlay) {
    hoverOverlay = document.createElement('div');
    hoverOverlay.className = HOVER_OVERLAY_CLASS;
    document.body.appendChild(hoverOverlay);
  }

  // Position the overlay over the element
  hoverOverlay.style.left = `${rect.left + window.scrollX}px`;
  hoverOverlay.style.top = `${rect.top + window.scrollY}px`;
  hoverOverlay.style.width = `${rect.width}px`;
  hoverOverlay.style.height = `${rect.height}px`;
  hoverOverlay.style.opacity = '1';
}

/**
 * Hide hover overlay
 */
function hideHoverOverlay(): void {
  if (hoverOverlay) {
    hoverOverlay.style.opacity = '0';
  }
  currentHoveredElement = null;
}

/**
 * Create highlight overlay for a selected element
 */
function createHighlightOverlay(element: Element, xpath: string): void {
  const rect = element.getBoundingClientRect();

  const overlay = document.createElement('div');
  overlay.className = HIGHLIGHT_OVERLAY_CLASS;
  overlay.setAttribute('data-xpath', xpath);
  overlay.style.left = `${rect.left + window.scrollX}px`;
  overlay.style.top = `${rect.top + window.scrollY}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;

  document.body.appendChild(overlay);
}

/**
 * Update all highlight overlay positions (e.g., after scroll/resize)
 */
function updateHighlightOverlays(): void {
  const overlays = document.querySelectorAll(`.${HIGHLIGHT_OVERLAY_CLASS}`);
  overlays.forEach((overlay) => {
    const xpath = overlay.getAttribute('data-xpath');
    if (xpath) {
      const element = highlightedElements.get(xpath);
      if (element) {
        const rect = element.getBoundingClientRect();
        (overlay as HTMLElement).style.left = `${rect.left + window.scrollX}px`;
        (overlay as HTMLElement).style.top = `${rect.top + window.scrollY}px`;
        (overlay as HTMLElement).style.width = `${rect.width}px`;
        (overlay as HTMLElement).style.height = `${rect.height}px`;
      }
    }
  });
}

/**
 * Remove highlight overlay for a specific xpath
 */
function removeHighlight(xpath: string): void {
  const overlay = document.querySelector(`[data-xpath="${xpath}"]`);
  if (overlay) {
    overlay.remove();
  }
  highlightedElements.delete(xpath);
}

/**
 * Remove all highlight overlays
 */
function removeAllHighlights(): void {
  const overlays = document.querySelectorAll(`.${HIGHLIGHT_OVERLAY_CLASS}`);
  overlays.forEach(overlay => overlay.remove());
  highlightedElements.clear();
  selections = [];
}

/**
 * Create floating toolbar
 */
function createFloatingToolbar(): HTMLElement {
  const toolbar = document.createElement("div");
  toolbar.id = TOOLBAR_ID;
  toolbar.innerHTML = `
    <span class="count-text" id="octarine-count-text">Select text to clip</span>
    <div class="separator"></div>
    <button id="octarine-close-btn" title="Close">×</button>
  `;

  // Add event listeners
  const countText = toolbar.querySelector("#octarine-count-text");
  const closeBtn = toolbar.querySelector("#octarine-close-btn");

  // Count text opens popup when there are selections
  countText?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (selections.length > 0) {
      // Open the clipper popup
      browser.runtime.sendMessage({ action: "OPEN_POPUP" }).catch(() => {
        console.log("[Octarine] Could not open popup automatically - please click the extension icon");
      });
    }
  });

  closeBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (selections.length > 0) {
      // If selections exist, act as delete
      selections = [];
      removeAllHighlights();
      updateToolbar();
    } else {
      // If no selections, exit multi-highlight mode
      disableMultiHighlightMode();
      hideFloatingToolbar();
    }
  });

  return toolbar;
}

/**
 * Show floating toolbar
 */
function showFloatingToolbar(): void {
  if (!floatingToolbar) {
    injectStyles();
    floatingToolbar = createFloatingToolbar();
    document.body.appendChild(floatingToolbar);
  }
  updateToolbar();
}

/**
 * Hide floating toolbar
 */
function hideFloatingToolbar(): void {
  if (floatingToolbar && floatingToolbar.parentNode) {
    floatingToolbar.parentNode.removeChild(floatingToolbar);
    floatingToolbar = null;
  }
}

/**
 * Update toolbar count and appearance
 */
function updateToolbar(): void {
  if (!floatingToolbar) return;

  const countTextElement = floatingToolbar.querySelector("#octarine-count-text");

  if (selections.length === 0) {
    // No selections - show placeholder text and dashed border
    if (countTextElement) {
      countTextElement.textContent = "Select text to clip";
    }
    floatingToolbar.classList.add("empty");
  } else {
    // Has selections - show count
    if (countTextElement) {
      countTextElement.textContent = `${selections.length} selected`;
    }
    floatingToolbar.classList.remove("empty");
  }
}

/**
 * Handle mouse move to show hover overlay
 */
function handleMouseMove(e: MouseEvent): void {
  if (!multiHighlightMode) return;

  const target = e.target as Element;

  // Ignore hover on the floating toolbar
  if (floatingToolbar && (floatingToolbar.contains(target) || target === floatingToolbar)) {
    hideHoverOverlay();
    return;
  }

  const highlightableElement = findHighlightableElement(target);

  if (highlightableElement && highlightableElement !== currentHoveredElement) {
    currentHoveredElement = highlightableElement;
    showHoverOverlay(highlightableElement);
  } else if (!highlightableElement) {
    hideHoverOverlay();
  }
}

/**
 * Handle click or keyboard shortcut to select element
 */
function handleElementSelect(): void {
  if (!multiHighlightMode || !currentHoveredElement) return;

  const xpath = getXPath(currentHoveredElement);

  // Toggle - if already highlighted, remove it
  if (highlightedElements.has(xpath)) {
    removeHighlight(xpath);
    // Also remove from selections array
    selections = selections.filter(s => s.rangeData?.startContainerPath !== xpath);
  } else {
    // Add new highlight
    highlightedElements.set(xpath, currentHoveredElement);
    createHighlightOverlay(currentHoveredElement, xpath);

    // Extract element's HTML and convert to markdown
    // Set base URL to ensure consistent link resolution
    const baseUrl = document.location?.href || document.baseURI || '';
    setBaseUrl(baseUrl);

    const elementHtml = currentHoveredElement.innerHTML || '';
    const elementMarkdown = cleanMarkdown(htmlToMarkdown(elementHtml));
    const text = currentHoveredElement.textContent || '';

    console.log('[Octarine] Element markdown:', elementMarkdown.substring(0, 100));

    const selection: ClipSelection = {
      id: crypto.randomUUID(),
      text: elementMarkdown || text, // Use markdown version
      timestamp: Date.now(),
      rangeData: {
        startContainerPath: xpath,
        startOffset: 0,
        endContainerPath: xpath,
        endOffset: 0,
      },
    };

    selections.push(selection);
  }

  // Update toolbar (always show in multi-highlight mode)
  showFloatingToolbar();
}

/**
 * Handle keyboard events
 */
function handleKeyDown(e: KeyboardEvent): void {
  // Alt+Shift+S to select current hovered element
  if (e.altKey && e.shiftKey && e.key.toLowerCase() === 's') {
    e.preventDefault();
    handleElementSelect();
  }

  // Escape to exit multi-highlight mode
  if (e.key === 'Escape' && multiHighlightMode) {
    disableMultiHighlightMode();
  }
}

/**
 * Handle click events in multi-highlight mode
 */
function handleClick(e: MouseEvent): void {
  if (!multiHighlightMode) return;

  const target = e.target as Element;

  // Ignore clicks on the floating toolbar
  if (floatingToolbar && (floatingToolbar.contains(target) || target === floatingToolbar)) {
    return;
  }

  const highlightableElement = findHighlightableElement(target);

  if (highlightableElement) {
    e.preventDefault();
    e.stopPropagation();
    currentHoveredElement = highlightableElement;
    handleElementSelect();
  }
}

/**
 * Enable multi-highlight mode
 */
function enableMultiHighlightMode(): void {
  if (multiHighlightMode) return;

  multiHighlightMode = true;
  injectStyles();

  // Add event listeners
  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeyDown, true);

  // Update cursor style
  document.body.style.cursor = 'crosshair';

  // Show toolbar immediately (even with 0 selections)
  showFloatingToolbar();

  // Toast notification removed per user request
  // showInstructionToast();
}

/**
 * Disable multi-highlight mode
 */
function disableMultiHighlightMode(): void {
  if (!multiHighlightMode) return;

  multiHighlightMode = false;

  // Remove event listeners
  document.removeEventListener('mousemove', handleMouseMove, true);
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('keydown', handleKeyDown, true);

  // Restore cursor
  document.body.style.cursor = '';

  // Hide hover overlay
  hideHoverOverlay();

  // Remove instruction toast
  const toast = document.getElementById('octarine-instruction-toast');
  if (toast) toast.remove();
}

/**
 * Handle messages from popup/background
 */
browser.runtime.onMessage.addListener(
  (message: unknown): Promise<ExtensionResponse> | undefined => {
    const msg = message as ExtensionMessage;
    if (msg && typeof msg === "object" && "action" in msg) {
      return handleMessage(msg);
    }
    return undefined;
  },
);

async function handleMessage(
  message: ExtensionMessage,
): Promise<ExtensionResponse> {
  switch (message.action) {
    case "GET_PAGE_DATA": {
      const pageData = await extractPageContent(document);
      if (pageData) {
        return { success: true, data: pageData };
      }
      return { success: false, error: "Failed to extract page content" };
    }

    case "GET_SELECTION": {
      const text = getSelectedText();
      const markdown = getSelectedMarkdown();
      return {
        success: true,
        data: { text, markdown },
      };
    }

    case "ADD_SELECTION": {
      // This is called when user presses Alt+Shift+S outside of multi-highlight mode
      // In multi-highlight mode, selection is handled by handleElementSelect()

      if (multiHighlightMode) {
        // In multi-highlight mode, trigger element selection
        handleElementSelect();
        return {
          success: true,
          data: { selection: null, total: selections.length },
        };
      }

      // Fallback: traditional text selection (kept for backward compatibility)
      const text = getSelectedText();
      const markdown = getSelectedMarkdown();

      if (!text) {
        return { success: false, error: "No text selected" };
      }

      const selection: ClipSelection = {
        id: crypto.randomUUID(),
        text: markdown || text,
        timestamp: Date.now(),
      };

      selections.push(selection);

      // Show the floating toolbar
      showFloatingToolbar();

      return {
        success: true,
        data: { selection, total: selections.length },
      };
    }

    case "GET_SELECTIONS": {
      // Get full page content with highlights marked
      let fullContentWithHighlights = '';

      if (selections.length > 0) {
        const pageData = await extractPageContent(document);
        if (pageData) {
          // Get the full markdown content
          let markdown = pageData.markdown;

          // Sort selections by text length (longest first) to avoid partial replacements
          const sortedSelections = [...selections].sort((a, b) => b.text.length - a.text.length);

          // Mark the highlighted sections with == == syntax
          // Since selections now contain markdown, we can do exact string matching
          sortedSelections.forEach(selection => {
            let highlightedMarkdown = selection.text.trim();
            if (!highlightedMarkdown) return;

            // Normalize whitespace for more reliable matching
            const normalizeWhitespace = (str: string) => str.replace(/\s+/g, ' ').trim();
            const normalizedSelection = normalizeWhitespace(highlightedMarkdown);

            // Try exact match first
            if (markdown.includes(highlightedMarkdown)) {
              const escapedMarkdown = highlightedMarkdown.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regex = new RegExp(escapedMarkdown, 'g');
              markdown = markdown.replace(regex, (match) => {
                if (match.startsWith('==') || markdown.substring(markdown.indexOf(match) - 2, markdown.indexOf(match)) === '==') {
                  return match;
                }
                return `==${match}==`;
              });
            } else {
              // Try normalized whitespace match
              console.log('[Octarine] Exact match failed for selection:', highlightedMarkdown);
              console.log('[Octarine] Selection normalized:', normalizedSelection);

              // Try to find similar content in the markdown
              const lines = markdown.split('\n');
              let found = false;

              for (let i = 0; i < lines.length; i++) {
                const normalizedLine = normalizeWhitespace(lines[i]);

                // Check if line contains most of the selection content (fuzzy match)
                const similarity = normalizedLine.includes(normalizedSelection) ||
                                  normalizedSelection.includes(normalizedLine) ||
                                  (normalizedSelection.length > 20 &&
                                   normalizedLine.includes(normalizedSelection.substring(0, 20)));

                if (similarity) {
                  // Found a potential match - wrap the line
                  if (!lines[i].includes('==')) {
                    console.log('[Octarine] Matched line:', lines[i].substring(0, 100));
                    lines[i] = `==${lines[i]}==`;
                    found = true;
                  }
                }
              }

              if (!found) {
                console.warn('[Octarine] Could not find match for selection:', highlightedMarkdown.substring(0, 100));
              }

              markdown = lines.join('\n');
            }
          });

          fullContentWithHighlights = markdown;
        }
      }

      return {
        success: true,
        data: {
          selections,
          fullContentWithHighlights: fullContentWithHighlights || null,
        },
      };
    }

    case "REMOVE_SELECTION": {
      const id = (message as ExtensionMessage & { payload?: { id: string } })
        .payload?.id;
      if (id) {
        selections = selections.filter((s) => s.id !== id);
        removeHighlight(id);
        updateToolbar();
        return { success: true, data: { remaining: selections.length } };
      }
      return { success: false, error: "No selection ID provided" };
    }

    case "CLEAR_SELECTIONS": {
      selections = [];
      removeAllHighlights();
      hideFloatingToolbar();
      return { success: true };
    }

    case "INSTANT_CLIP": {
      const pageData = await extractPageContent(document);
      if (!pageData) {
        return { success: false, error: "Failed to extract page content" };
      }

      // Get basePath and workspace from payload
      const payload = (
        message as ExtensionMessage & {
          payload?: { basePath?: string; workspace?: string };
        }
      ).payload;

      // Use template-specific folder from metadata if available, otherwise fall back to payload
      const basePath = pageData.metadata?.folder || payload?.basePath || "inbox/web-clips";
      const workspace = payload?.workspace;

      // Build the clip payload
      const clipPayload: ClipPayload = {
        title: pageData.title,
        url: pageData.url,
        content: pageData.markdown,
        clippedAt: new Date().toISOString(),
        metadata: pageData.metadata,
      };

      // Generate and open the deeplink
      const deeplink = generateClipLink(clipPayload, {
        basePath,
        workspace,
        openAfter: true,
      });

      openDeeplink(deeplink);

      return { success: true, data: { title: pageData.title } };
    }

    case "GET_TAB_METADATA": {
      // Extract og:title or fall back to document.title
      const ogTitle = document
        .querySelector('meta[property="og:title"]')
        ?.getAttribute("content");
      const title = ogTitle || document.title || "";
      const url = document.location.href;

      return { success: true, data: { title, url } };
    }

    case "SAVE_URL_BOOKMARK": {
      // Get bookmarksPath and workspace from payload
      const payload = (
        message as ExtensionMessage & {
          payload?: { bookmarksPath?: string; workspace?: string };
        }
      ).payload;
      const bookmarksPath = payload?.bookmarksPath || "Bookmarks";
      const workspace = payload?.workspace;

      const title = document.title;
      const url = document.location.href;

      // Append bookmark as a bullet list item to a single Bookmarks.md file
      const content = `- [${title}](${url})`;

      // Generate and open the deeplink
      const deeplink = generateCreateLink({
        path: bookmarksPath,
        content,
        workspace,
        fresh: false, // Append to existing file
        position: "bottom", // Add at the end
        separator: "\n", // Separate with newline
        openAfter: true,
      });

      openDeeplink(deeplink);

      return { success: true, data: { title } };
    }

    case "SAVE_ALL_TABS": {
      // Get content, date, and workspace from payload
      const payload = (
        message as ExtensionMessage & {
          payload?: { content?: string; date?: string; workspace?: string };
        }
      ).payload;
      const content = payload?.content || "";
      const date = payload?.date || new Date().toISOString().split("T")[0];
      const workspace = payload?.workspace;

      // Generate and open the daily note deeplink
      const deeplink = generateDailyLink({
        date,
        content,
        workspace,
        fresh: false,
        position: "bottom",
        openAfter: true,
      });

      openDeeplink(deeplink);

      return { success: true };
    }

    case "START_MULTI_HIGHLIGHT": {
      // Enable multi-highlight mode
      enableMultiHighlightMode();

      return { success: true };
    }

    default:
      return { success: false, error: "Unknown action" };
  }
}

// Add scroll and resize listeners to update overlay positions
window.addEventListener('scroll', updateHighlightOverlays, { passive: true });
window.addEventListener('resize', updateHighlightOverlays, { passive: true });

// Notify that content script is loaded
console.log("[Octarine Clipper] Content script loaded");
