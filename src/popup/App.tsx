import { useState, useEffect, useCallback } from 'react';
import browser from 'webextension-polyfill';
import { generateClipLink, getPayloadSize, openDeeplink } from '../utils/deeplink';
import type { PageData, ClipSelection, ClipPayload, ExtensionResponse } from '../types';

type ClipMode = 'page' | 'selection';

export default function App() {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="animate-pulse text-gray-500">Extracting page content...</div>
      </div>
    );
  }

  if (error && !pageData) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error}</p>
          <p className="text-red-500 text-xs mt-2">
            Make sure the page is fully loaded and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <h1 className="text-lg font-semibold text-gray-900 truncate">
          {pageData?.title || 'Untitled'}
        </h1>
        <p className="text-xs text-gray-500 truncate mt-1">
          {pageData?.url}
        </p>
        {pageData?.author && (
          <p className="text-xs text-gray-400 mt-1">By {pageData.author}</p>
        )}
      </div>

      {/* Error Toast */}
      {error && (
        <div className="mx-4 mt-2 bg-red-50 border border-red-200 rounded px-3 py-2">
          <p className="text-red-700 text-xs">{error}</p>
        </div>
      )}

      {/* Mode Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setMode('page')}
          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
            mode === 'page'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Full Page
        </button>
        <button
          onClick={() => setMode('selection')}
          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
            mode === 'selection'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Selections ({selections.length})
        </button>
      </div>

      {/* Selection Controls */}
      {mode === 'selection' && (
        <div className="p-3 border-b border-gray-200 bg-gray-50 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={addCurrentSelection}
              className="flex-1 py-1.5 px-3 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              + Add Selection
            </button>
            {selections.length > 0 && (
              <button
                onClick={clearSelections}
                className="py-1.5 px-3 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
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
                  className="flex items-center gap-2 text-xs bg-white rounded px-2 py-1 border"
                >
                  <span className="text-gray-400">{index + 1}.</span>
                  <span className="flex-1 truncate text-gray-700">{sel.text.slice(0, 50)}...</span>
                  <button
                    onClick={() => removeSelection(sel.id)}
                    className="text-gray-400 hover:text-red-500"
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
        <pre className="whitespace-pre-wrap text-xs bg-gray-50 p-3 rounded-lg overflow-auto max-h-48 text-gray-700 font-mono">
          {previewContent.slice(0, 2000)}
          {previewContent.length > 2000 && '\n\n... (truncated)'}
        </pre>
      </div>

      {/* Settings */}
      <div className="border-t border-gray-200 p-3 space-y-2 bg-gray-50">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Save to folder</label>
            <input
              type="text"
              value={basePath}
              onChange={(e) => setBasePath(e.target.value)}
              placeholder="inbox/web-clips"
              className="w-full text-sm px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Workspace (optional)</label>
            <input
              type="text"
              value={workspace}
              onChange={(e) => setWorkspace(e.target.value)}
              placeholder="Default workspace"
              className="w-full text-sm px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        <button
          onClick={handleClip}
          disabled={mode === 'selection' && selections.length === 0}
          className="w-full py-2.5 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Send to Octarine
        </button>
      </div>
    </div>
  );
}
