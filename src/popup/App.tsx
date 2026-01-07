import { useState, useEffect, useCallback, useRef } from "react";
import {
  AlignLeft,
  List,
  Calendar,
  FileText,
  MousePointer,
  Settings2,
  X,
} from "lucide-react";
import browser from "webextension-polyfill";
import {
  generateClipLink,
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
} from "../types";

type ClipMode = "page" | "selection" | "properties";

// Tab button component
interface TabButtonProps {
  mode: ClipMode;
  currentMode: ClipMode;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

function TabButton({
  mode,
  currentMode,
  onClick,
  icon,
  label,
  badge,
}: TabButtonProps) {
  const isActive = currentMode === mode;
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center rounded bg-intermediate justify-center gap-1.5 py-1.5 px-2 text-[13px] ${
        isActive
          ? "text-accent !bg-accent-lite -mb-px"
          : "text-tertiary hover:text-secondary hover:bg-hover"
      }`}
    >
      {icon}
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="ml-0.5 px-1 py-0.5 tabular-nums text-xs rounded bg-accent-lite text-accent">
          {badge}
        </span>
      )}
    </button>
  );
}

// Default metadata with 'reading' tag
const getDefaultMetadata = (pageData?: PageData | null): PageMetadata => ({
  title: pageData?.title || "",
  source: pageData?.url || "",
  author: pageData?.metadata?.author || "",
  created: new Date().toISOString().split("T")[0],
  description: pageData?.metadata?.description || "",
  tags: ["reading", ...(pageData?.metadata?.tags || [])].filter(
    (tag, i, arr) => arr.indexOf(tag) === i,
  ), // Remove duplicates
});

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
  const [mode, setMode] = useState<ClipMode>("page");
  const [previewContent, setPreviewContent] = useState<string>("");
  const [basePath, setBasePath] = useState<string>("inbox/web-clips");
  const [fileName, setFileName] = useState<string>("");
  const [metadata, setMetadata] = useState<PageMetadata>(getDefaultMetadata());

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

  // Track previous mode to detect mode changes
  const prevModeRef = useRef(mode);
  const prevSelectionsLengthRef = useRef(selections.length);

  // Update preview when mode changes or selections are added/removed
  useEffect(() => {
    const modeChanged = prevModeRef.current !== mode;
    const selectionsChanged = prevSelectionsLengthRef.current !== selections.length;
    
    // Only reset preview content when switching modes or when selections are added/removed
    if (modeChanged) {
      if (mode === "page" && pageData) {
        setPreviewContent(pageData.markdown);
      } else if (mode === "selection") {
        const combined = selections.map((s) => s.text).join("\n\n---\n\n");
        setPreviewContent(
          combined ||
            'No selections added yet. Select text on the page and click "Add Selection".',
        );
      }
    } else if (selectionsChanged && mode === "selection") {
      // Only update if selections were added/removed, not on manual edits
      const combined = selections.map((s) => s.text).join("\n\n---\n\n");
      setPreviewContent(
        combined ||
          'No selections added yet. Select text on the page and click "Add Selection".',
      );
    }
    
    prevModeRef.current = mode;
    prevSelectionsLengthRef.current = selections.length;
  }, [mode, pageData, selections]);

  const addCurrentSelection = useCallback(async () => {
    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) return;

      const response = (await browser.tabs.sendMessage(tab.id, {
        action: "ADD_SELECTION",
      })) as ExtensionResponse<{ selection: ClipSelection; total: number }>;

      if (response.success && response.data) {
        setSelections((prev) => [...prev, response.data!.selection]);
        setMode("selection");
      } else {
        setError(response.error || "Failed to add selection");
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const removeSelection = useCallback(async (id: string) => {
    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) return;

      await browser.tabs.sendMessage(tab.id, {
        action: "REMOVE_SELECTION",
        payload: { id },
      });
      setSelections((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  }, []);

  const clearSelections = useCallback(async () => {
    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) return;

      await browser.tabs.sendMessage(tab.id, { action: "CLEAR_SELECTIONS" });
      setSelections([]);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const handleClip = useCallback(() => {
    if (!pageData) return;

    // Determine content based on mode (properties tab uses page content)
    const contentMode = mode === "properties" ? "page" : mode;
    const payload: ClipPayload = {
      title: pageData.title,
      url: pageData.url,
      content: previewContent,
      selections: contentMode === "selection" ? selections : undefined,
      clippedAt: new Date().toISOString(),
      metadata,
    };

    // Generate the Octarine deeplink
    const deeplink = generateClipLink(payload, {
      basePath: basePath || "inbox/web-clips",
      openAfter: true,
      fileName: fileName || undefined,
      fresh: contentMode !== "selection", // Append for selections, replace for full page
    });

    const size = getPayloadSize(payload.content);
    console.log("[Octarine Clipper] Payload size:", size);
    console.log("[Octarine Clipper] Deeplink:", deeplink);

    // Open the deeplink
    openDeeplink(deeplink);
  }, [pageData, mode, selections, basePath, fileName, metadata, previewContent]);

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
    <div className="flex flex-col h-full bg-primary overflow-hidden">
      {/* Header */}
      <div className="px-2 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Enter filename..."
              className="w-full text-sm font-normal bg-secondary text-primary border border-transparent hover:border-primary focus:border-accent rounded px-1.5 py-1 placeholder:text-placeholder focus:outline-none focus:bg-secondary"
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

      {/* Mode Tabs */}
      <div className="flex bg-transparent px-2 gap-2">
        <TabButton
          mode="page"
          currentMode={mode}
          onClick={() => setMode("page")}
          icon={<FileText size={12} />}
          label="Page"
        />
        <TabButton
          mode="selection"
          currentMode={mode}
          onClick={() => setMode("selection")}
          icon={<MousePointer size={12} />}
          label="Selections"
          badge={selections.length}
        />
        <TabButton
          mode="properties"
          currentMode={mode}
          onClick={() => setMode("properties")}
          icon={<Settings2 size={12} />}
          label="Properties"
        />
      </div>

      {/* Selection Controls */}
      {mode === "selection" && (
        <div className="px-2 py-3 border-b border-primary space-y-2">
          <div className="flex gap-2">
            <button
              onClick={addCurrentSelection}
              className="flex-1 py-1 px-2 text-xs bg-accent text-white rounded hover:opacity-90 transition-opacity"
            >
              + Add Selection
            </button>
            {selections.length > 0 && (
              <button
                onClick={clearSelections}
                className="py-1 px-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Selection List */}
          {selections.length > 0 && (
            <div className="space-y-1 max-h-24 overflow-auto">
              {selections.map((sel, index) => (
                <div
                  key={sel.id}
                  className="flex items-center gap-2 text-xs bg-primary rounded px-2 py-1 border border-primary"
                >
                  <span className="text-placeholder">{index + 1}.</span>
                  <span className="flex-1 truncate text-secondary">
                    {sel.text.slice(0, 50)}...
                  </span>
                  <button
                    onClick={() => removeSelection(sel.id)}
                    className="text-placeholder hover:text-error"
                  >
                    <X className="h-3 w-3 text-icon" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Properties Panel */}
      {mode === "properties" && (
        <div className="px-2 py-3 mt-2 border-b border-primary space-y-2">
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
                <span>created</span>
              </div>
              <input
                type="text"
                value={metadata.created || ""}
                onChange={(e) =>
                  setMetadata({ ...metadata, created: e.target.value })
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
      )}

      {/* Preview - only show for page and selection modes */}
      {mode !== "properties" && (
        <div className="flex-1 overflow-hidden px-2 py-2   min-h-0">
          <textarea
            value={previewContent}
            onChange={(e) => setPreviewContent(e.target.value)}
            className="w-full h-full resize-none text-[13px] text-tertiary font-sans font-normal bg-intermediate border border-primary rounded p-2 focus:outline-none focus:border-accent"
            placeholder="Preview content..."
          />
        </div>
      )}

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

        {/* Send Button */}
        <button
          onClick={handleClip}
          disabled={mode === "selection" && selections.length === 0}
          className="w-full py-1.5 px-4 text-[13px] bg-accent-lite text-accent border border-transparent hover:bg-accent hover:text-white font-medium rounded disabled:bg-tertiary disabled:text-placeholder disabled:cursor-not-allowed transition-opacity"
        >
          Send to Octarine
        </button>
      </div>
    </div>
  );
}
