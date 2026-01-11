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
        return { success: true, data: { remaining: selections.length } };
      }
      return { success: false, error: "No selection ID provided" };
    }

    case "CLEAR_SELECTIONS": {
      selections = [];
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
      const basePath = payload?.basePath || "inbox/web-clips";
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

    default:
      return { success: false, error: "Unknown action" };
  }
}

// Notify that content script is loaded
console.log("[Octarine Clipper] Content script loaded");
