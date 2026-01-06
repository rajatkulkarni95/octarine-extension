import { useState, useEffect, useCallback } from 'react';
import browser from 'webextension-polyfill';
import { generateClipLink, getPayloadSize, openDeeplink } from '../utils/deeplink';
import type { PageData, ClipSelection, ClipPayload, ExtensionResponse } from '../types';

type ClipMode = 'page' | 'selection';

// Hook to detect and sync with system theme
function useSystemTheme() {
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const updateTheme = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    
    // Set initial theme
    updateTheme(mediaQuery);
    
    // Listen for changes
    mediaQuery.addEventListener('change', updateTheme);
    
    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, []);
}

export default function App() {
  useSystemTheme();
  
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [selections, setSelections] = useState<ClipSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ClipMode>('page');
  const [previewContent, setPreviewContent] = useState<string>('');
  const [workspace, setWorkspace] = useState<string>('');
  const [basePath, setBasePath] = useState<string>('inbox/web-clips');

  // Fetch page data on mount
  useEffect(() => {
    async function fetchPageData() {
      try {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) {
          setError('No active tab found');
          setLoading(false);
          return;
        }

        // Get page data
        const response = await browser.tabs.sendMessage(tab.id, {
          action: 'GET_PAGE_DATA',
        }) as ExtensionResponse<PageData>;

        if (response.success && response.data) {
          setPageData(response.data);
          setPreviewContent(response.data.markdown);
        } else {
          setError(response.error || 'Failed to extract page data');
        }

        // Get existing selections
        const selectionsResponse = await browser.tabs.sendMessage(tab.id, {
          action: 'GET_SELECTIONS',
        }) as ExtensionResponse<ClipSelection[]>;

        if (selectionsResponse.success && selectionsResponse.data) {
          setSelections(selectionsResponse.data);
        }
      } catch (err) {
        setError('Failed to communicate with page. Try refreshing.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchPageData();
  }, []);

  // Update preview when mode or selections change
  useEffect(() => {
    if (mode === 'page' && pageData) {
      setPreviewContent(pageData.markdown);
    } else if (mode === 'selection') {
      const combined = selections.map((s) => s.text).join('\n\n---\n\n');
      setPreviewContent(combined || 'No selections added yet. Select text on the page and click "Add Selection".');
    }
  }, [mode, pageData, selections]);

  const addCurrentSelection = useCallback(async () => {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;

      const response = await browser.tabs.sendMessage(tab.id, {
        action: 'ADD_SELECTION',
      }) as ExtensionResponse<{ selection: ClipSelection; total: number }>;

      if (response.success && response.data) {
        setSelections((prev) => [...prev, response.data!.selection]);
        setMode('selection');
      } else {
        setError(response.error || 'Failed to add selection');
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const removeSelection = useCallback((id: string) => {
    setSelections((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const clearSelections = useCallback(async () => {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;

      await browser.tabs.sendMessage(tab.id, { action: 'CLEAR_SELECTIONS' });
      setSelections([]);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const handleClip = useCallback(() => {
    if (!pageData) return;

    const payload: ClipPayload = {
      title: pageData.title,
      url: pageData.url,
      content: mode === 'page' ? pageData.markdown : selections.map((s) => s.text).join('\n\n---\n\n'),
      selections: mode === 'selection' ? selections : undefined,
      clippedAt: new Date().toISOString(),
    };

    // Generate the Octarine deeplink
    const deeplink = generateClipLink(payload, {
      basePath: basePath || 'inbox/web-clips',
      workspace: workspace || undefined,
      openAfter: true,
    });

    const size = getPayloadSize(payload.content);
    console.log('[Octarine Clipper] Payload size:', size);
    console.log('[Octarine Clipper] Deeplink:', deeplink);

    // Open the deeplink
    openDeeplink(deeplink);
  }, [pageData, mode, selections, workspace, basePath]);

  const switchToSidebar = useCallback(async () => {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;

      // Send message to open sidebar
      await browser.tabs.sendMessage(tab.id, { action: 'TOGGLE_SIDEBAR' });
      
      // Close the popup
      window.close();
    } catch (err) {
      console.error('Failed to switch to sidebar:', err);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8 bg-primary">
        <div className="animate-pulse text-placeholder">Extracting page content...</div>
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
    <div className="flex flex-col h-full bg-primary">
      {/* Header */}
      <div className="border-b border-primary p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-primary truncate">
              {pageData?.title || 'Untitled'}
            </h1>
            <p className="text-xs text-placeholder truncate mt-1">
              {pageData?.url}
            </p>
            {pageData?.author && (
              <p className="text-xs text-tertiary mt-1">By {pageData.author}</p>
            )}
          </div>
          <button
            onClick={switchToSidebar}
            className="p-1.5 text-tertiary hover:text-secondary hover:bg-hover rounded transition-colors"
            title="Open as sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M15 3v18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="mx-4 mt-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-3 py-2">
          <p className="text-red-700 dark:text-red-400 text-xs">{error}</p>
        </div>
      )}

      {/* Mode Tabs */}
      <div className="flex border-b border-primary">
        <button
          onClick={() => setMode('page')}
          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
            mode === 'page'
              ? 'text-accent border-b-2 border-accent'
              : 'text-tertiary hover:text-secondary'
          }`}
        >
          Full Page
        </button>
        <button
          onClick={() => setMode('selection')}
          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
            mode === 'selection'
              ? 'text-accent border-b-2 border-accent'
              : 'text-tertiary hover:text-secondary'
          }`}
        >
          Selections ({selections.length})
        </button>
      </div>

      {/* Selection Controls */}
      {mode === 'selection' && (
        <div className="p-3 border-b border-primary bg-secondary space-y-2">
          <div className="flex gap-2">
            <button
              onClick={addCurrentSelection}
              className="flex-1 py-1.5 px-3 text-sm bg-accent text-white rounded hover:opacity-90 transition-opacity"
            >
              + Add Selection
            </button>
            {selections.length > 0 && (
              <button
                onClick={clearSelections}
                className="py-1.5 px-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
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
                  <span className="flex-1 truncate text-secondary">{sel.text.slice(0, 50)}...</span>
                  <button
                    onClick={() => removeSelection(sel.id)}
                    className="text-placeholder hover:text-error"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Preview */}
      <div className="flex-1 overflow-auto p-4">
        <pre className="whitespace-pre-wrap text-xs bg-secondary p-3 rounded-lg overflow-auto max-h-48 text-secondary font-mono border border-primary">
          {previewContent.slice(0, 2000)}
          {previewContent.length > 2000 && '\n\n... (truncated)'}
        </pre>
      </div>

      {/* Settings */}
      <div className="border-t border-primary p-3 space-y-2 bg-secondary">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs text-placeholder mb-1">Save to folder</label>
            <input
              type="text"
              value={basePath}
              onChange={(e) => setBasePath(e.target.value)}
              placeholder="inbox/web-clips"
              className="w-full text-sm px-2 py-1.5 border border-primary rounded bg-primary text-primary placeholder:text-placeholder focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-placeholder mb-1">Workspace (optional)</label>
            <input
              type="text"
              value={workspace}
              onChange={(e) => setWorkspace(e.target.value)}
              placeholder="Default workspace"
              className="w-full text-sm px-2 py-1.5 border border-primary rounded bg-primary text-primary placeholder:text-placeholder focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-primary p-4">
        <button
          onClick={handleClip}
          disabled={mode === 'selection' && selections.length === 0}
          className="w-full py-2.5 px-4 bg-accent text-white font-medium rounded-lg hover:opacity-90 disabled:bg-tertiary disabled:text-placeholder disabled:cursor-not-allowed transition-opacity"
        >
          Send to Octarine
        </button>
      </div>
    </div>
  );
}
