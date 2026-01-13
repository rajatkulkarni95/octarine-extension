import browser from "webextension-polyfill";
import {
  extractPageContent,
  getSelectedText,
  getSelectedMarkdown,
} from "../utils/extractor";
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
      background-color: rgba(255, 235, 0, 0.35);
      border-radius: 4px;
      box-sizing: border-box;
      mix-blend-mode: multiply;
    }

    #${TOOLBAR_ID} {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: #1f2937;
      border-radius: 9999px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      color: white;
      animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
      from {
        transform: translateX(-50%) translateY(100px);
        opacity: 0;
      }
      to {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
    }

    #${TOOLBAR_ID} button {
      background: transparent;
      border: none;
      color: white;
      cursor: pointer;
      padding: 6px 12px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      font-weight: 500;
      transition: background-color 0.2s ease;
    }

    #${TOOLBAR_ID} button:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    #${TOOLBAR_ID} button.primary {
      background: #8b5cf6;
      color: white;
    }

    #${TOOLBAR_ID} button.primary:hover {
      background: #7c3aed;
    }

    #${TOOLBAR_ID} .count {
      background: #374151;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      min-width: 24px;
      text-align: center;
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
    <button class="primary" id="octarine-clip-btn">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
      </svg>
      Clip highlights
    </button>
    <span class="count" id="octarine-count">0</span>
    <button id="octarine-delete-btn" title="Delete all highlights">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
    <button id="octarine-close-btn" title="Close">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  `;

  // Add event listeners
  const clipBtn = toolbar.querySelector("#octarine-clip-btn");
  const deleteBtn = toolbar.querySelector("#octarine-delete-btn");
  const closeBtn = toolbar.querySelector("#octarine-close-btn");

  clipBtn?.addEventListener("click", () => {
    // Open extension popup
    browser.action.openPopup?.().catch(() => {
      // Fallback: just open the popup if browser.action.openPopup is not available
      console.log("[Octarine] Opening popup via toolbar");
    });
  });

  deleteBtn?.addEventListener("click", async () => {
    selections = [];
    removeAllHighlights();
    updateToolbar();
  });

  closeBtn?.addEventListener("click", () => {
    removeAllHighlights();
    hideFloatingToolbar();
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
 * Update toolbar count
 */
function updateToolbar(): void {
  if (!floatingToolbar) return;

  const countElement = floatingToolbar.querySelector("#octarine-count");
  if (countElement) {
    countElement.textContent = String(selections.length);
  }

  // Hide toolbar if no selections
  if (selections.length === 0) {
    hideFloatingToolbar();
  }
}

/**
 * Handle mouse move to show hover overlay
 */
function handleMouseMove(e: MouseEvent): void {
  if (!multiHighlightMode) return;

  const target = e.target as Element;
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

    // Extract text content and add to selections
    const text = currentHoveredElement.textContent || '';
    const markdown = text; // Could convert to markdown if needed

    const selection: ClipSelection = {
      id: crypto.randomUUID(),
      text: markdown,
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

  // Update toolbar
  if (selections.length > 0) {
    showFloatingToolbar();
  } else {
    hideFloatingToolbar();
  }
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

  showInstructionToast();
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
 * Show instruction toast for multi-highlight mode
 */
function showInstructionToast(): void {
  // Remove existing toast if any
  const existingToast = document.getElementById("octarine-instruction-toast");
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement("div");
  toast.id = "octarine-instruction-toast";
  toast.style.cssText = `
    position: fixed;
    top: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2147483647;
    background: #1f2937;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    animation: slideDown 0.3s ease;
    max-width: 400px;
    text-align: center;
  `;

  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <svg width="20" height="20" fill="none" stroke="#fbbf24" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
      </svg>
      <div>
        <div style="font-weight: 600; margin-bottom: 2px;">Multi-Highlight Mode Active</div>
        <div style="font-size: 12px; color: #9ca3af;">Hover over elements to see outline, then <strong>click</strong> or press <kbd style="background: #374151; padding: 2px 6px; border-radius: 4px; font-size: 11px;">Alt+Shift+S</kbd> to highlight</div>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" style="background: transparent; border: none; color: #9ca3af; cursor: pointer; padding: 4px; margin-left: 8px; font-size: 18px; line-height: 1;">×</button>
    </div>
  `;

  // Add animation styles
  const style = document.createElement("style");
  style.textContent = `
    @keyframes slideDown {
      from {
        transform: translateX(-50%) translateY(-20px);
        opacity: 0;
      }
      to {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
    }
  `;

  if (!document.getElementById("octarine-toast-styles")) {
    style.id = "octarine-toast-styles";
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);

  // Auto-remove after 8 seconds
  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.animation = "slideUp 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }
  }, 8000);
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
      return {
        success: true,
        data: selections,
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
