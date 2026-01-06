import { useState, useEffect, useCallback } from 'react';
import { extractPageContent, getSelectedText, getSelectedMarkdown } from '../utils/extractor';
import { generateClipLink, getPayloadSize, openDeeplink } from '../utils/deeplink';
import type { PageData, ClipSelection, ClipPayload } from '../types';

type ClipMode = 'page' | 'selection';

interface SidebarProps {
  onClose: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
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
        // In sidebar context, we're already in the page, so extract directly
        const data = extractPageContent(document);
        if (data) {
          setPageData(data);
          setPreviewContent(data.markdown);
        } else {
          setError('Failed to extract page content');
        }
      } catch (err) {
        setError('Failed to extract page content');
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

  const addCurrentSelection = useCallback(() => {
    const text = getSelectedText();
    const markdown = getSelectedMarkdown();
    
    if (!text) {
      setError('No text selected');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    const selection: ClipSelection = {
      id: crypto.randomUUID(),
      text: markdown || text,
      timestamp: Date.now(),
    };
    
    setSelections((prev) => [...prev, selection]);
    setMode('selection');
  }, []);

  const removeSelection = useCallback((id: string) => {
    setSelections((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const clearSelections = useCallback(() => {
    setSelections([]);
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
      <div className="octarine-sidebar-content">
        <div className="octarine-loading">Extracting page content...</div>
      </div>
    );
  }

  if (error && !pageData) {
    return (
      <div className="octarine-sidebar-content">
        <div className="octarine-error">
          <p>{error}</p>
          <p className="octarine-error-hint">Make sure the page is fully loaded and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="octarine-sidebar-inner">
      {/* Header */}
      <div className="octarine-header">
        <div className="octarine-header-content">
          <h1 className="octarine-title">{pageData?.title || 'Untitled'}</h1>
          <p className="octarine-url">{pageData?.url}</p>
          {pageData?.author && <p className="octarine-author">By {pageData.author}</p>}
        </div>
        <button onClick={onClose} className="octarine-close-btn" title="Close sidebar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="octarine-toast octarine-toast-error">
          <p>{error}</p>
        </div>
      )}

      {/* Mode Tabs */}
      <div className="octarine-tabs">
        <button
          onClick={() => setMode('page')}
          className={`octarine-tab ${mode === 'page' ? 'octarine-tab-active' : ''}`}
        >
          Full Page
        </button>
        <button
          onClick={() => setMode('selection')}
          className={`octarine-tab ${mode === 'selection' ? 'octarine-tab-active' : ''}`}
        >
          Selections ({selections.length})
        </button>
      </div>

      {/* Selection Controls */}
      {mode === 'selection' && (
        <div className="octarine-selection-controls">
          <div className="octarine-selection-buttons">
            <button onClick={addCurrentSelection} className="octarine-btn octarine-btn-primary">
              + Add Selection
            </button>
            {selections.length > 0 && (
              <button onClick={clearSelections} className="octarine-btn octarine-btn-danger">
                Clear All
              </button>
            )}
          </div>
          
          {/* Selection List */}
          {selections.length > 0 && (
            <div className="octarine-selection-list">
              {selections.map((sel, index) => (
                <div key={sel.id} className="octarine-selection-item">
                  <span className="octarine-selection-index">{index + 1}.</span>
                  <span className="octarine-selection-text">{sel.text.slice(0, 50)}...</span>
                  <button
                    onClick={() => removeSelection(sel.id)}
                    className="octarine-selection-remove"
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
      <div className="octarine-preview">
        <pre className="octarine-preview-content">
          {previewContent.slice(0, 2000)}
          {previewContent.length > 2000 && '\n\n... (truncated)'}
        </pre>
      </div>

      {/* Settings */}
      <div className="octarine-settings">
        <div className="octarine-settings-row">
          <div className="octarine-setting">
            <label className="octarine-label">Save to folder</label>
            <input
              type="text"
              value={basePath}
              onChange={(e) => setBasePath(e.target.value)}
              placeholder="inbox/web-clips"
              className="octarine-input"
            />
          </div>
          <div className="octarine-setting">
            <label className="octarine-label">Workspace (optional)</label>
            <input
              type="text"
              value={workspace}
              onChange={(e) => setWorkspace(e.target.value)}
              placeholder="Default workspace"
              className="octarine-input"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="octarine-footer">
        <button
          onClick={handleClip}
          disabled={mode === 'selection' && selections.length === 0}
          className="octarine-btn octarine-btn-submit"
        >
          Send to Octarine
        </button>
      </div>
    </div>
  );
}
