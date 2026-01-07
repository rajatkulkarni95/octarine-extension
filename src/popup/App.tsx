import { useState, useEffect, useCallback, useRef } from "react";
import {
  AlignLeft,
  List,
  Calendar,
  ChevronDown,
  ChevronRight,
  Layers,
  X,
} from "lucide-react";
import browser from "webextension-polyfill";
import {
  generateClipLink,
  generateDailyLink,
  getPayloadSize,
  openDeeplink,
  sanitizeFileName,
} from "../utils/deeplink";
import type {
  PageData,
  ClipSelection,
  ClipPayload,
  ExtensionResponse,
  PageMetadata,
  TabInfo,
} from "../types";

// Default metadata with 'reading' tag
const getDefaultMetadata = (pageData?: PageData | null): PageMetadata => ({
  title: pageData?.title || "",
  source: pageData?.url || "",
  author: pageData?.metadata?.author || "",
  published: new Date().toISOString().split("T")[0],
  description: pageData?.metadata?.description || "",
  tags: ["reading", ...(pageData?.metadata?.tags || [])].filter(
    (tag, i, arr) => arr.indexOf(tag) === i,
  ), // Remove duplicates
});

// Storage key for persisting basePath
const STORAGE_KEY_BASE_PATH = "octarine_basePath";

// Hook to detect and sync with system theme
function useSystemTheme() {
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const updateTheme = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    // Set initial theme
    updateTheme(mediaQuery);

    // Listen for changes
    mediaQuery.addEventListener("change", updateTheme);

    return () => mediaQuery.removeEventListener("change", updateTheme);
  }, []);
}

export default function App() {
  useSystemTheme();

  const [pageData, setPageData] = useState<PageData | null>(null);
  const [selections, setSelections] = useState<ClipSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string>("");
  const [basePath, setBasePath] = useState<string>("inbox/web-clips");
  const [fileName, setFileName] = useState<string>("");
  const [metadata, setMetadata] = useState<PageMetadata>(getDefaultMetadata());
  const [propertiesExpanded, setPropertiesExpanded] = useState(false);
  const [savingTabs, setSavingTabs] = useState(false);

  // Load saved basePath from storage on mount
  useEffect(() => {
    async function loadSavedBasePath() {
      try {
        const result = await browser.storage.local.get(STORAGE_KEY_BASE_PATH);
        const savedPath = result[STORAGE_KEY_BASE_PATH] as string | undefined;
        if (savedPath) {
          setBasePath(savedPath);
        }
      } catch (err) {
        console.error("Failed to load saved basePath:", err);
      }
    }
    loadSavedBasePath();
  }, []);

  // Save basePath to storage whenever it changes
  useEffect(() => {
    async function saveBasePath() {
      // Only save if basePath is not empty (avoid saving during initial load)
      if (basePath) {
        try {
          await browser.storage.local.set({
            [STORAGE_KEY_BASE_PATH]: basePath,
          });
        } catch (err) {
          console.error("Failed to save basePath:", err);
        }
      }
    }
    saveBasePath();
  }, [basePath]);

  // Fetch page data on mount
  useEffect(() => {
    async function fetchPageData() {
      try {
        const [tab] = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (!tab?.id) {
          setError("No active tab found");
          setLoading(false);
          return;
        }

        // Check if this is a restricted page where content scripts can't run
        const url = tab.url || "";
        if (
          url.startsWith("chrome://") ||
          url.startsWith("chrome-extension://") ||
          url.startsWith("edge://") ||
          url.startsWith("about:") ||
          url.startsWith("moz-extension://") ||
          url.startsWith("https://chrome.google.com/webstore")
        ) {
          setError(
            "Cannot clip browser internal pages or the extension store.",
          );
          setLoading(false);
          return;
        }

        // Helper function to inject content script if needed
        const ensureContentScript = async (tabId: number): Promise<boolean> => {
          try {
            // Try a ping to see if content script is already there
            await browser.tabs.sendMessage(tabId, { action: "GET_SELECTIONS" });
            return true;
          } catch {
            // Content script not present, inject it
            console.log(
              "[Octarine Clipper] Content script not found, injecting...",
            );
            try {
              // Get the content script path from the manifest
              const manifest = browser.runtime.getManifest();
              const contentScriptPath = manifest.content_scripts?.[0]?.js?.[0];

              if (contentScriptPath) {
                await browser.scripting.executeScript({
                  target: { tabId },
                  files: [contentScriptPath],
                });
                // Small delay to let the script initialize
                await new Promise((resolve) => setTimeout(resolve, 100));
                return true;
              }
            } catch (injectErr) {
              console.error(
                "[Octarine Clipper] Failed to inject content script:",
                injectErr,
              );
            }
            return false;
          }
        };

        // Ensure content script is present
        const scriptReady = await ensureContentScript(tab.id);
        if (!scriptReady) {
          setError(
            "Failed to initialize on this page. The page may be restricted.",
          );
          setLoading(false);
          return;
        }

        // Get page data
        const response = (await browser.tabs.sendMessage(tab.id, {
          action: "GET_PAGE_DATA",
        })) as ExtensionResponse<PageData>;

        if (response.success && response.data) {
          setPageData(response.data);
          setPreviewContent(response.data.markdown);
          setMetadata(getDefaultMetadata(response.data));
          setFileName(sanitizeFileName(response.data.title));
        } else {
          setError(response.error || "Failed to extract page data");
        }

        // Get existing selections
        const selectionsResponse = (await browser.tabs.sendMessage(tab.id, {
          action: "GET_SELECTIONS",
        })) as ExtensionResponse<ClipSelection[]>;

        if (selectionsResponse.success && selectionsResponse.data) {
          setSelections(selectionsResponse.data);
        }
      } catch (err) {
        setError("Failed to communicate with page. Try refreshing.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchPageData();
  }, []);

  // Track previous selections length to detect changes
  const prevSelectionsLengthRef = useRef(selections.length);

  // Update preview when selections are added (auto-switch to selection content)
  useEffect(() => {
    const selectionsChanged =
      prevSelectionsLengthRef.current !== selections.length;

    // When selections are added, show selection content
    if (
      selectionsChanged &&
      selections.length > prevSelectionsLengthRef.current
    ) {
      const combined = selections.map((s) => s.text).join("\n\n---\n\n");
      setPreviewContent(combined);
    }

    prevSelectionsLengthRef.current = selections.length;
  }, [selections]);

  const clearSelections = useCallback(async () => {
    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) return;

      await browser.tabs.sendMessage(tab.id, { action: "CLEAR_SELECTIONS" });
      setSelections([]);
      // Revert to full page content
      if (pageData) {
        setPreviewContent(pageData.markdown);
      }
    } catch (err) {
      console.error(err);
    }
  }, [pageData]);

  const handleClip = useCallback(() => {
    if (!pageData) return;

    const payload: ClipPayload = {
      title: pageData.title,
      url: pageData.url,
      content: previewContent,
      selections: selections.length > 0 ? selections : undefined,
      clippedAt: new Date().toISOString(),
      metadata,
    };

    // Generate the Octarine deeplink
    const deeplink = generateClipLink(payload, {
      basePath: basePath || "inbox/web-clips",
      openAfter: true,
      fileName: fileName || undefined,
      // fresh: mode !== "selection", // Append for selections, replace for full page
    });

    const size = getPayloadSize(payload.content);
    console.log("[Octarine Clipper] Payload size:", size);
    console.log("[Octarine Clipper] Deeplink:", deeplink);

    // Open the deeplink
    openDeeplink(deeplink);
  }, [pageData, selections, basePath, fileName, metadata, previewContent]);

  const handleSaveAllTabs = useCallback(async () => {
    setSavingTabs(true);
    try {
      // Get all tabs in the current window
      const tabs = await browser.tabs.query({ currentWindow: true });

      // Collect tab info with og:title where possible
      const tabInfos: TabInfo[] = await Promise.all(
        tabs.map(async (tab) => {
          // Skip non-http tabs (extensions, chrome://, etc.)
          if (!tab.id || !tab.url?.startsWith("http")) {
            return { url: tab.url || "", title: tab.title || "" };
          }

          try {
            // Try to get og:title from content script
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

      // Filter out empty URLs and format as bullet list
      const validTabs = tabInfos.filter(
        (t) => t.url && t.url.startsWith("http"),
      );
      const bulletList = validTabs
        .map((t) => `- [${t.title || t.url}](${t.url})`)
        .join("\n");

      // Generate timestamp
      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      // Build content with header
      const content = `\n\n#### Tabs from ${timeStr}\n${bulletList}`;

      // Generate daily link (append to bottom, don't create fresh)
      const today = now.toISOString().split("T")[0];
      const deeplink = generateDailyLink({
        date: today,
        content,
        fresh: false,
        position: "bottom",
        openAfter: true,
      });

      console.log(
        "[Octarine Clipper] Saving",
        validTabs.length,
        "tabs to daily note",
      );
      openDeeplink(deeplink);
    } catch (err) {
      console.error("[Octarine Clipper] Failed to save tabs:", err);
      setError("Failed to collect tabs");
      setTimeout(() => setError(null), 3000);
    } finally {
      setSavingTabs(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8 bg-primary">
        <div className="animate-pulse text-placeholder">
          Extracting page content...
        </div>
      </div>
    );
  }

  if (error && !pageData) {
    return (
      <div className="p-4 bg-primary">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          <p className="text-red-500 dark:text-red-500 text-xs mt-2">
            Make sure the page is fully loaded and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-primary pt-2 overflow-hidden">
      {/* Header */}
      <div className="px-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Enter filename..."
              className="w-full text-sm font-normal text-primary border border-transparent hover:border-primary focus:border-accent rounded bg-transparent px-1.5 py-1 placeholder:text-placeholder focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="mx-4 mt-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-3 py-2">
          <p className="text-red-700 dark:text-red-400 text-xs">{error}</p>
        </div>
      )}

      {/* Properties Toggle */}
      <div className="mx-2 px-2 py-2 mt-2 rounded bg-secondary">
        <button
          onClick={() => setPropertiesExpanded(!propertiesExpanded)}
          className="flex items-center gap-1.5 text-xs text-tertiary hover:text-secondary w-full"
        >
          {propertiesExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
          <span>Properties</span>
        </button>
        <div
          className={`overflow-hidden transition-all duration-200 ease-in-out ${
            propertiesExpanded
              ? "max-h-96 opacity-100 mt-2"
              : "max-h-0 opacity-0"
          }`}
        >
          <div className="space-y-1.5 text-xs">
            {/* Title */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-placeholder w-24 shrink-0">
                <AlignLeft className="w-3.5 h-3.5" />
                <span>title</span>
              </div>
              <input
                type="text"
                value={metadata.title || ""}
                onChange={(e) =>
                  setMetadata({ ...metadata, title: e.target.value })
                }
                placeholder="Enter title..."
                className="flex-1 text-xs px-1.5 py-1 border border-transparent hover:border-primary focus:border-accent rounded bg-transparent text-secondary placeholder:text-placeholder focus:outline-none focus:bg-secondary"
              />
            </div>

            {/* Source */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-placeholder w-24 shrink-0">
                <AlignLeft className="w-3.5 h-3.5" />
                <span>source</span>
              </div>
              <input
                type="text"
                value={metadata.source || ""}
                onChange={(e) =>
                  setMetadata({ ...metadata, source: e.target.value })
                }
                placeholder="Enter source URL..."
                className="flex-1 text-xs px-1.5 py-0.5 border border-transparent hover:border-primary focus:border-accent rounded bg-transparent text-secondary placeholder:text-placeholder focus:outline-none focus:bg-secondary"
              />
            </div>

            {/* Author */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-placeholder w-24 shrink-0">
                <List className="w-3.5 h-3.5" />
                <span>author</span>
              </div>
              <input
                type="text"
                value={metadata.author || ""}
                onChange={(e) =>
                  setMetadata({ ...metadata, author: e.target.value })
                }
                placeholder="Enter author..."
                className="flex-1 text-xs px-1.5 py-0.5 border border-transparent hover:border-primary focus:border-accent rounded bg-transparent text-secondary placeholder:text-placeholder focus:outline-none focus:bg-secondary"
              />
            </div>

            {/* Created */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-placeholder w-24 shrink-0">
                <Calendar className="w-3.5 h-3.5" />
                <span>published</span>
              </div>
              <input
                type="text"
                value={metadata.published || ""}
                onChange={(e) =>
                  setMetadata({ ...metadata, published: e.target.value })
                }
                placeholder="YYYY-MM-DD"
                className="flex-1 text-xs px-1.5 py-0.5 border border-transparent hover:border-primary focus:border-accent rounded bg-transparent text-secondary placeholder:text-placeholder focus:outline-none focus:bg-secondary"
              />
            </div>

            {/* Description */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-placeholder w-24 shrink-0">
                <AlignLeft className="w-3.5 h-3.5" />
                <span>description</span>
              </div>
              <input
                type="text"
                value={metadata.description || ""}
                onChange={(e) =>
                  setMetadata({ ...metadata, description: e.target.value })
                }
                placeholder="Enter description..."
                className="flex-1 text-xs px-1.5 py-0.5 border border-transparent hover:border-primary focus:border-accent rounded bg-transparent text-secondary placeholder:text-placeholder focus:outline-none focus:bg-secondary"
              />
            </div>

            {/* Tags */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-placeholder w-24 shrink-0">
                <List className="w-3.5 h-3.5" />
                <span>tags</span>
              </div>
              <input
                type="text"
                value={metadata.tags?.join(", ") || ""}
                onChange={(e) =>
                  setMetadata({
                    ...metadata,
                    tags: e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="tag1, tag2, tag3..."
                className="flex-1 text-xs px-1.5 py-0.5 border border-transparent hover:border-primary focus:border-accent rounded bg-transparent text-secondary placeholder:text-placeholder focus:outline-none focus:bg-secondary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Selection Indicator */}
      {selections.length > 0 && (
        <div className="mx-2 mt-2 px-2 py-1.5 rounded bg-accent-lite flex items-center justify-between">
          <span className="text-xs text-accent font-medium">
            Selection ({selections.length})
          </span>
          <button
            onClick={clearSelections}
            className="p-0.5 text-accent hover:text-accent/70 transition-colors"
            title="Clear selections and show full page"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Preview */}
      <div className="flex-1 overflow-hidden px-2 py-2 min-h-0">
        <textarea
          value={previewContent}
          onChange={(e) => setPreviewContent(e.target.value)}
          className="w-full h-full resize-none text-sm text-secondary font-sans font-normal bg-intermediate border border-primary rounded p-2 focus:outline-none focus:border-accent"
          placeholder="Preview content..."
        />
      </div>

      {/* Footer - fixed at bottom */}
      <div className="shrink-0 bg-intermediate flex flex-col gap-2 border-t p-2 mt-auto border-primary">
        {/* Settings */}

        <div className="flex-1">
          <input
            type="text"
            value={basePath}
            onChange={(e) => setBasePath(e.target.value)}
            placeholder="inbox/web-clips"
            className="w-full text-[13px] px-2 py-1.5 border border-primary rounded bg-primary text-primary placeholder:text-placeholder focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {/* Save All Tabs Button */}
          <button
            onClick={handleSaveAllTabs}
            disabled={savingTabs}
            title="Save all open tabs to today's daily note"
            className="flex items-center justify-center gap-1.5 py-1.5 px-3 text-[13px] bg-secondary text-secondary border border-primary hover:bg-hover font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Layers size={14} />
            {savingTabs ? "Saving..." : "Tabs"}
          </button>

          {/* Send Button */}
          <button
            onClick={handleClip}
            className="flex-1 py-1.5 px-4 text-[13px] bg-accent-lite text-accent border border-transparent hover:bg-accent hover:text-white font-medium rounded disabled:bg-tertiary disabled:text-placeholder disabled:cursor-not-allowed transition-opacity"
          >
            Send to Octarine
          </button>
        </div>
      </div>
    </div>
  );
}
