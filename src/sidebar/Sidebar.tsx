import { useState, useEffect, useCallback } from 'react';
import { extractPageContent, getSelectedText, getSelectedMarkdown } from '../utils/extractor';
import { generateClipLink, getPayloadSize, openDeeplink } from '../utils/deeplink';
import type { PageData, ClipSelection, ClipPayload, PageMetadata } from '../types';

type ClipMode = 'page' | 'selection';

// Default metadata with 'reading' tag
const getDefaultMetadata = (pageData?: PageData | null): PageMetadata => ({
  title: pageData?.title || '',
  source: pageData?.url || '',
  author: pageData?.metadata?.author || '',
  published: pageData?.metadata?.published || '',
  created: new Date().toISOString().split('T')[0],
  description: pageData?.metadata?.description || '',
  tags: ['reading', ...(pageData?.metadata?.tags || [])].filter((tag, i, arr) => arr.indexOf(tag) === i),
});

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
  const [propertiesExpanded, setPropertiesExpanded] = useState(true);
  const [metadata, setMetadata] = useState<PageMetadata>(getDefaultMetadata());

  // Fetch page data on mount
  useEffect(() => {
    async function fetchPageData() {
      try {
        // In sidebar context, we're already in the page, so extract directly
        const data = extractPageContent(document);
        if (data) {
          setPageData(data);
          setPreviewContent(data.markdown);
          setMetadata(getDefaultMetadata(data));
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
        </div>
        <button onClick={onClose} className="octarine-close-btn" title="Close sidebar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Collapsible Properties Section */}
      <div className="octarine-properties-section">
        <button
          onClick={() => setPropertiesExpanded(!propertiesExpanded)}
          className="octarine-properties-toggle"
        >
          <svg
            className={`octarine-properties-chevron ${propertiesExpanded ? 'octarine-properties-chevron-open' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <span>Properties</span>
        </button>

        {propertiesExpanded && (
          <div className="octarine-properties-list">
            {/* Title */}
            <div className="octarine-property-row">
              <div className="octarine-property-label">
                <svg className="octarine-property-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="15" y2="18" />
                </svg>
                <span>title</span>
              </div>
              <input
                type="text"
                value={metadata.title || ''}
                onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                placeholder="Enter title..."
                className="octarine-property-input"
              />
            </div>

            {/* Source */}
            <div className="octarine-property-row">
              <div className="octarine-property-label">
                <svg className="octarine-property-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="15" y2="18" />
                </svg>
                <span>source</span>
              </div>
              <input
                type="text"
                value={metadata.source || ''}
                onChange={(e) => setMetadata({ ...metadata, source: e.target.value })}
                placeholder="Enter source URL..."
                className="octarine-property-input"
              />
            </div>

            {/* Author */}
            <div className="octarine-property-row">
              <div className="octarine-property-label">
                <svg className="octarine-property-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
                <span>author</span>
              </div>
              <input
                type="text"
                value={metadata.author || ''}
                onChange={(e) => setMetadata({ ...metadata, author: e.target.value })}
                placeholder="Enter author..."
                className="octarine-property-input"
              />
            </div>

            {/* Published */}
            <div className="octarine-property-row">
              <div className="octarine-property-label">
                <svg className="octarine-property-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>published</span>
              </div>
              <input
                type="text"
                value={metadata.published || ''}
                onChange={(e) => setMetadata({ ...metadata, published: e.target.value })}
                placeholder="YYYY-MM-DD"
                className="octarine-property-input"
              />
            </div>

            {/* Created */}
            <div className="octarine-property-row">
              <div className="octarine-property-label">
                <svg className="octarine-property-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>created</span>
              </div>
              <input
                type="text"
                value={metadata.created || ''}
                onChange={(e) => setMetadata({ ...metadata, created: e.target.value })}
                placeholder="YYYY-MM-DD"
                className="octarine-property-input"
              />
            </div>

            {/* Description */}
            <div className="octarine-property-row">
              <div className="octarine-property-label">
                <svg className="octarine-property-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="15" y2="18" />
                </svg>
                <span>description</span>
              </div>
              <input
                type="text"
                value={metadata.description || ''}
                onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
                placeholder="Enter description..."
                className="octarine-property-input"
              />
            </div>

            {/* Tags */}
            <div className="octarine-property-row">
              <div className="octarine-property-label">
                <svg className="octarine-property-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
                <span>tags</span>
              </div>
              <input
                type="text"
                value={metadata.tags?.join(', ') || ''}
                onChange={(e) => setMetadata({ ...metadata, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                placeholder="tag1, tag2, tag3..."
                className="octarine-property-input"
              />
            </div>
          </div>
        )}
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
