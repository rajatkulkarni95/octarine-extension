import { useState, useCallback } from "react";
import browser from "webextension-polyfill";
import type { ExtensionResponse, TabInfo } from "../../types";
import { generateDailyLink, openDeeplink } from "../../utils/deeplink";

interface UseSaveAllTabsResult {
  savingTabs: boolean;
  handleSaveAllTabs: () => Promise<void>;
}

export function useSaveAllTabs(
  setError: (error: string | null) => void,
  workspace?: string,
  openAfter = true,
): UseSaveAllTabsResult {
  const [savingTabs, setSavingTabs] = useState(false);

  const handleSaveAllTabs = useCallback(async () => {
    setSavingTabs(true);
    try {
      const tabs = await browser.tabs.query({ currentWindow: true });

      const tabInfos: TabInfo[] = await Promise.all(
        tabs.map(async (tab) => {
          if (!tab.id || !tab.url?.startsWith("http")) {
            return { url: tab.url || "", title: tab.title || "" };
          }

          try {
            const response = (await browser.tabs.sendMessage(tab.id, {
              action: "GET_TAB_METADATA",
            })) as ExtensionResponse<TabInfo>;

            if (response.success && response.data) {
              return response.data;
            }
          } catch {
            // Content script not available, use tab title
          }

          return { url: tab.url || "", title: tab.title || "" };
        }),
      );

      const validTabs = tabInfos.filter(
        (t) => t.url && t.url.startsWith("http"),
      );
      const bulletList = validTabs
        .map((t) => `- [${t.title || t.url}](${t.url})`)
        .join("\n");

      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      const content = `\n\n#### Tabs from ${timeStr}\n${bulletList}`;

      const today = now.toISOString().split("T")[0];
      const deeplink = generateDailyLink({
        date: today,
        content,
        workspace,
        fresh: false,
        position: "bottom",
        openAfter,
      });
      openDeeplink(deeplink);
    } catch (err) {
      console.error("[Octarine Clipper] Failed to save tabs:", err);
      setError("Failed to collect tabs");
      setTimeout(() => setError(null), 3000);
    } finally {
      setSavingTabs(false);
    }
  }, [setError, workspace, openAfter]);

  return {
    savingTabs,
    handleSaveAllTabs,
  };
}
