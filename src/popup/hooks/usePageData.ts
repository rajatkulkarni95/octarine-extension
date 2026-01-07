import { useState, useEffect, useCallback, useRef } from "react";
import browser from "webextension-polyfill";
import type {
  PageData,
  ClipSelection,
  ExtensionResponse,
  PageMetadata,
} from "../../types";
import { sanitizeFileName } from "../../utils/deeplink";

// Default metadata with 'reading' tag
export const getDefaultMetadata = (pageData?: PageData | null): PageMetadata => ({
  title: pageData?.title || "",
  source: pageData?.url || "",
  author: pageData?.metadata?.author || "",
  published: new Date().toISOString().split("T")[0],
  description: pageData?.metadata?.description || "",
  tags: ["reading", ...(pageData?.metadata?.tags || [])].filter(
    (tag, i, arr) => arr.indexOf(tag) === i,
  ),
});

// Helper function to check if URL is restricted
const isRestrictedUrl = (url: string): boolean => {
  return (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("moz-extension://") ||
    url.startsWith("https://chrome.google.com/webstore")
  );
};

// Helper function to inject content script if needed
const ensureContentScript = async (tabId: number): Promise<boolean> => {
  try {
    await browser.tabs.sendMessage(tabId, { action: "GET_SELECTIONS" });
    return true;
  } catch {
    console.log("[Octarine Clipper] Content script not found, injecting...");
    try {
      const manifest = browser.runtime.getManifest();
      const contentScriptPath = manifest.content_scripts?.[0]?.js?.[0];

      if (contentScriptPath) {
        await browser.scripting.executeScript({
          target: { tabId },
          files: [contentScriptPath],
        });
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

interface UsePageDataResult {
  pageData: PageData | null;
  selections: ClipSelection[];
  loading: boolean;
  error: string | null;
  previewContent: string;
  metadata: PageMetadata;
  fileName: string;
  setPreviewContent: (content: string) => void;
  setMetadata: (metadata: PageMetadata) => void;
  setFileName: (name: string) => void;
  setError: (error: string | null) => void;
  clearSelections: () => Promise<void>;
}

export function usePageData(): UsePageDataResult {
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [selections, setSelections] = useState<ClipSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string>("");
  const [metadata, setMetadata] = useState<PageMetadata>(getDefaultMetadata());
  const [fileName, setFileName] = useState<string>("");

  // Track previous selections length to detect changes
  const prevSelectionsLengthRef = useRef(selections.length);

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

        const url = tab.url || "";
        if (isRestrictedUrl(url)) {
          setError(
            "Cannot clip browser internal pages or the extension store.",
          );
          setLoading(false);
          return;
        }

        const scriptReady = await ensureContentScript(tab.id);
        if (!scriptReady) {
          setError(
            "Failed to initialize on this page. The page may be restricted.",
          );
          setLoading(false);
          return;
        }

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

  // Update preview when selections are added
  useEffect(() => {
    const selectionsChanged =
      prevSelectionsLengthRef.current !== selections.length;

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
      if (pageData) {
        setPreviewContent(pageData.markdown);
      }
    } catch (err) {
      console.error(err);
    }
  }, [pageData]);

  return {
    pageData,
    selections,
    loading,
    error,
    previewContent,
    metadata,
    fileName,
    setPreviewContent,
    setMetadata,
    setFileName,
    setError,
    clearSelections,
  };
}
