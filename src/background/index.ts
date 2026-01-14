import browser from "webextension-polyfill";
import { loadSettings } from "../utils/settings";
import type { ExtensionResponse, TabInfo } from "../types";

// Create context menu items when extension is installed
browser.runtime.onInstalled.addListener(() => {
  // Context menu for clipping selection
  browser.contextMenus.create({
    id: "octarine-clip-selection",
    title: "Add selection to Octarine",
    contexts: ["selection"],
  });

  // Context menu for clipping entire page
  browser.contextMenus.create({
    id: "octarine-clip-page",
    title: "Clip page to Octarine",
    contexts: ["page"],
  });

  console.log("[Octarine Clipper] Extension installed");
});

// Handle context menu clicks
browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  switch (info.menuItemId) {
    case "octarine-clip-selection":
      // Send message to content script to add selection
      await browser.tabs.sendMessage(tab.id, { action: "ADD_SELECTION" });
      break;

    case "octarine-clip-page":
      // Open the popup or trigger clip action
      // For now, just open the popup
      await browser.action.openPopup();
      break;
  }
});

// Handle keyboard shortcuts
browser.commands.onCommand.addListener(async (command) => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) return;

  switch (command) {
    case "clip-page":
      await browser.action.openPopup();
      break;

    case "add-selection":
      await browser.tabs.sendMessage(tab.id, { action: "ADD_SELECTION" });
      break;

    case "instant-clip": {
      // Get settings
      const settings = await loadSettings();
      // Use default template's folder as fallback (content script will use template-specific folder if available)
      const basePath = settings.templates.default.folder || "inbox/web-clips";
      const workspace = settings.workspaces[0] || undefined;

      // Send message to content script to perform instant clip
      await browser.tabs.sendMessage(tab.id, {
        action: "INSTANT_CLIP",
        payload: { basePath, workspace },
      });
      break;
    }

    case "save-url-bookmark": {
      // Get settings
      const settings = await loadSettings();
      const bookmarksPath = settings.bookmarksPath || "Bookmarks";
      const workspace = settings.workspaces[0] || undefined;

      // Send message to content script to save URL as bookmark
      await browser.tabs.sendMessage(tab.id, {
        action: "SAVE_URL_BOOKMARK",
        payload: { bookmarksPath, workspace },
      });
      break;
    }

    case "save-all-tabs": {
      // Get settings
      const settings = await loadSettings();
      const workspace = settings.workspaces[0] || undefined;

      // Get all tabs in current window
      const tabs = await browser.tabs.query({ currentWindow: true });

      // Collect tab info
      const tabInfos: TabInfo[] = await Promise.all(
        tabs.map(async (t) => {
          if (!t.id || !t.url?.startsWith("http")) {
            return { url: t.url || "", title: t.title || "" };
          }

          try {
            const response = (await browser.tabs.sendMessage(t.id, {
              action: "GET_TAB_METADATA",
            })) as ExtensionResponse<TabInfo>;

            if (response.success && response.data) {
              return response.data;
            }
          } catch {
            // Content script not available, use tab title
          }

          return { url: t.url || "", title: t.title || "" };
        }),
      );

      // Filter valid tabs and create bullet list
      const validTabs = tabInfos.filter(
        (t: TabInfo) => t.url && t.url.startsWith("http"),
      );
      const bulletList = validTabs
        .map((t: TabInfo) => `- [${t.title || t.url}](${t.url})`)
        .join("\n");

      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      const content = `\n\n#### Tabs from ${timeStr}\n${bulletList}`;
      const today = now.toISOString().split("T")[0];

      // Send to first tab to handle the deeplink
      if (tabs[0]?.id) {
        await browser.tabs.sendMessage(tabs[0].id, {
          action: "SAVE_ALL_TABS",
          payload: { content, date: today, workspace },
        });
      }
      break;
    }
  }
});

// Handle messages from content script
browser.runtime.onMessage.addListener((message: unknown) => {
  const msg = message as { action?: string };
  if (msg.action === "OPEN_POPUP") {
    browser.action.openPopup().catch((err) => {
      console.error("[Octarine Clipper] Failed to open popup:", err);
    });
  }
});

console.log("[Octarine Clipper] Background script loaded");
