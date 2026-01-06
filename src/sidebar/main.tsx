import { createRoot, type Root } from 'react-dom/client';
import Sidebar from './Sidebar';

const SIDEBAR_CONTAINER_ID = 'octarine-clipper-sidebar-container';

let root: Root | null = null;

// Inject styles
function injectStyles() {
  if (document.getElementById('octarine-sidebar-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'octarine-sidebar-styles';
  style.textContent = `
    /* Light theme variables */
    #${SIDEBAR_CONTAINER_ID} {
      --octarine-text-primary: #000000;
      --octarine-text-secondary: #1a1a1a;
      --octarine-text-tertiary: #333333;
      --octarine-text-placeholder: #595959;
      --octarine-text-accent: #0036b3;
      --octarine-text-error: #b30000;
      --octarine-bg-primary: #ffffff;
      --octarine-bg-intermediate: #fafafa;
      --octarine-bg-secondary: #f5f5f5;
      --octarine-bg-tertiary: #e0e0e0;
      --octarine-bg-hover: #d9d9d9;
      --octarine-bg-accent: #0036b3;
      --octarine-border-primary: #d4d4d8;
      --octarine-border-secondary: #a1a1aa;
      --octarine-border-accent: #0036b3;
      --octarine-shadow: rgba(0, 0, 0, 0.15);
    }

    /* Dark theme variables */
    #${SIDEBAR_CONTAINER_ID}.octarine-dark {
      --octarine-text-primary: #ffffff;
      --octarine-text-secondary: #e6e6e6;
      --octarine-text-tertiary: #cccccc;
      --octarine-text-placeholder: #999999;
      --octarine-text-accent: #339af0;
      --octarine-text-error: #ff6b6b;
      --octarine-bg-primary: #000000;
      --octarine-bg-intermediate: #0a0a0a;
      --octarine-bg-secondary: #141414;
      --octarine-bg-tertiary: #1f1f1f;
      --octarine-bg-hover: #262626;
      --octarine-bg-accent: #1971c2;
      --octarine-border-primary: #262626;
      --octarine-border-secondary: #404040;
      --octarine-border-accent: #339af0;
      --octarine-shadow: rgba(0, 0, 0, 0.5);
    }

    #${SIDEBAR_CONTAINER_ID} {
      position: fixed;
      top: 16px;
      right: 16px;
      bottom: 16px;
      width: 400px;
      height: calc(100vh - 32px);
      z-index: 2147483647;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 4px 20px var(--octarine-shadow);
      background: var(--octarine-bg-primary);
      display: flex;
      flex-direction: column;
      animation: octarine-slide-in 0.2s ease-out;
      color-scheme: light dark;
      border-radius: 12px;
      overflow: hidden;
    }

    @keyframes octarine-slide-in {
      from {
        transform: translateX(100%);
      }
      to {
        transform: translateX(0);
      }
    }

    #${SIDEBAR_CONTAINER_ID}.octarine-closing {
      animation: octarine-slide-out 0.2s ease-in forwards;
    }

    @keyframes octarine-slide-out {
      from {
        transform: translateX(0);
      }
      to {
        transform: translateX(100%);
      }
    }

    .octarine-sidebar-inner {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--octarine-bg-primary);
    }

    .octarine-sidebar-content {
      padding: 16px;
    }

    .octarine-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 32px;
      color: var(--octarine-text-placeholder);
      background: var(--octarine-bg-primary);
    }

    .octarine-error {
      background: rgba(179, 0, 0, 0.1);
      border: 1px solid var(--octarine-text-error);
      border-radius: 8px;
      padding: 16px;
      margin: 16px;
    }

    .octarine-error p {
      color: var(--octarine-text-error);
      font-size: 14px;
      margin: 0;
    }

    .octarine-error-hint {
      opacity: 0.8;
      font-size: 12px !important;
      margin-top: 8px !important;
    }

    .octarine-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid var(--octarine-border-primary);
      gap: 12px;
    }

    .octarine-header-content {
      flex: 1;
      min-width: 0;
    }

    .octarine-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--octarine-text-primary);
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .octarine-url {
      font-size: 12px;
      color: var(--octarine-text-placeholder);
      margin: 4px 0 0 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .octarine-author {
      font-size: 12px;
      color: var(--octarine-text-tertiary);
      margin: 4px 0 0 0;
    }

    .octarine-close-btn {
      background: none;
      border: none;
      padding: 4px;
      cursor: pointer;
      color: var(--octarine-text-placeholder);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .octarine-close-btn:hover {
      background: var(--octarine-bg-hover);
      color: var(--octarine-text-secondary);
    }

    .octarine-toast {
      margin: 8px 16px;
      padding: 8px 12px;
      border-radius: 4px;
    }

    .octarine-toast-error {
      background: rgba(179, 0, 0, 0.1);
      border: 1px solid var(--octarine-text-error);
    }

    .octarine-toast-error p {
      color: var(--octarine-text-error);
      font-size: 12px;
      margin: 0;
    }

    /* Properties Section */
    .octarine-properties-section {
      padding: 12px 16px;
      border-bottom: 1px solid var(--octarine-border-primary);
    }

    .octarine-properties-toggle {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 14px;
      color: var(--octarine-text-secondary);
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      transition: color 0.15s ease;
    }

    .octarine-properties-toggle:hover {
      color: var(--octarine-text-primary);
    }

    .octarine-properties-chevron {
      width: 16px;
      height: 16px;
      transition: transform 0.15s ease;
      transform: rotate(-90deg);
    }

    .octarine-properties-chevron-open {
      transform: rotate(0deg);
    }

    .octarine-properties-list {
      margin-top: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .octarine-property-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
    }

    .octarine-property-label {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--octarine-text-placeholder);
      width: 90px;
      flex-shrink: 0;
    }

    .octarine-property-icon {
      width: 14px;
      height: 14px;
    }

    .octarine-property-value {
      color: var(--octarine-text-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .octarine-property-value-clamp {
      white-space: normal;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .octarine-property-input {
      flex: 1;
      font-size: 12px;
      padding: 2px 6px;
      border: 1px solid transparent;
      border-radius: 4px;
      background: transparent;
      color: var(--octarine-text-secondary);
      outline: none;
      transition: all 0.15s ease;
      min-width: 0;
    }

    .octarine-property-input::placeholder {
      color: var(--octarine-text-placeholder);
    }

    .octarine-property-input:hover {
      border-color: var(--octarine-border-primary);
    }

    .octarine-property-input:focus {
      border-color: var(--octarine-border-accent);
      background: var(--octarine-bg-secondary);
    }

    .octarine-tabs {
      display: flex;
      border-bottom: 1px solid var(--octarine-border-primary);
    }

    .octarine-tab {
      flex: 1;
      padding: 8px 16px;
      font-size: 14px;
      font-weight: 500;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      color: var(--octarine-text-tertiary);
      transition: all 0.15s ease;
    }

    .octarine-tab:hover {
      color: var(--octarine-text-secondary);
    }

    .octarine-tab-active {
      color: var(--octarine-text-accent);
      border-bottom-color: var(--octarine-border-accent);
    }

    .octarine-selection-controls {
      padding: 12px;
      border-bottom: 1px solid var(--octarine-border-primary);
      background: var(--octarine-bg-secondary);
    }

    .octarine-selection-buttons {
      display: flex;
      gap: 8px;
    }

    .octarine-btn {
      padding: 6px 12px;
      font-size: 14px;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .octarine-btn-primary {
      flex: 1;
      background: var(--octarine-bg-accent);
      color: white;
    }

    .octarine-btn-primary:hover {
      opacity: 0.9;
    }

    .octarine-btn-danger {
      color: var(--octarine-text-error);
      background: none;
    }

    .octarine-btn-danger:hover {
      background: rgba(179, 0, 0, 0.1);
    }

    .octarine-selection-list {
      margin-top: 8px;
      max-height: 96px;
      overflow: auto;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .octarine-selection-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      background: var(--octarine-bg-primary);
      border-radius: 4px;
      padding: 4px 8px;
      border: 1px solid var(--octarine-border-primary);
    }

    .octarine-selection-index {
      color: var(--octarine-text-placeholder);
    }

    .octarine-selection-text {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--octarine-text-secondary);
    }

    .octarine-selection-remove {
      background: none;
      border: none;
      color: var(--octarine-text-placeholder);
      cursor: pointer;
      padding: 2px 4px;
    }

    .octarine-selection-remove:hover {
      color: var(--octarine-text-error);
    }

    .octarine-preview {
      flex: 1;
      overflow: auto;
      padding: 16px;
    }

    .octarine-preview-content {
      white-space: pre-wrap;
      font-size: 12px;
      max-height: 300px;
      overflow: auto;
      color: var(--octarine-text-secondary);
      font-family: inherit;
      margin: 0;
    }

    .octarine-settings {
      padding: 12px;
      border-top: 1px solid var(--octarine-border-primary);
      background: var(--octarine-bg-secondary);
    }

    .octarine-settings-row {
      display: flex;
      gap: 8px;
    }

    .octarine-setting {
      flex: 1;
    }

    .octarine-label {
      display: block;
      font-size: 12px;
      color: var(--octarine-text-placeholder);
      margin-bottom: 4px;
    }

    .octarine-input {
      width: 100%;
      font-size: 14px;
      padding: 6px 8px;
      border: 1px solid var(--octarine-border-primary);
      border-radius: 4px;
      outline: none;
      box-sizing: border-box;
      background: var(--octarine-bg-primary);
      color: var(--octarine-text-primary);
    }

    .octarine-input::placeholder {
      color: var(--octarine-text-placeholder);
    }

    .octarine-input:focus {
      border-color: var(--octarine-border-accent);
      box-shadow: 0 0 0 1px var(--octarine-border-accent);
    }

    .octarine-footer {
      padding: 16px;
      border-top: 1px solid var(--octarine-border-primary);
    }

    .octarine-btn-submit {
      width: 100%;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 500;
      background: var(--octarine-bg-accent);
      color: white;
      border-radius: 8px;
    }

    .octarine-btn-submit:hover {
      opacity: 0.9;
    }

    .octarine-btn-submit:disabled {
      background: var(--octarine-bg-tertiary);
      color: var(--octarine-text-placeholder);
      cursor: not-allowed;
    }

    /* Scrollbar styling for dark mode */
    #${SIDEBAR_CONTAINER_ID}.octarine-dark ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    #${SIDEBAR_CONTAINER_ID}.octarine-dark ::-webkit-scrollbar-track {
      background: var(--octarine-bg-secondary);
    }

    #${SIDEBAR_CONTAINER_ID}.octarine-dark ::-webkit-scrollbar-thumb {
      background: var(--octarine-border-secondary);
      border-radius: 4px;
    }

    #${SIDEBAR_CONTAINER_ID}.octarine-dark ::-webkit-scrollbar-thumb:hover {
      background: var(--octarine-text-placeholder);
    }

    `;
  document.head.appendChild(style);
}

// Set up theme listener
function setupThemeListener(container: HTMLElement) {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const updateTheme = (e: MediaQueryListEvent | MediaQueryList) => {
    if (e.matches) {
      container.classList.add('octarine-dark');
    } else {
      container.classList.remove('octarine-dark');
    }
  };
  
  // Set initial theme
  updateTheme(mediaQuery);
  
  // Listen for changes
  mediaQuery.addEventListener('change', updateTheme);
  
  // Return cleanup function
  return () => mediaQuery.removeEventListener('change', updateTheme);
}

let themeCleanup: (() => void) | null = null;

export function openSidebar() {
  // If sidebar already exists, just show it
  if (document.getElementById(SIDEBAR_CONTAINER_ID)) {
    return;
  }

  injectStyles();

  // Create container
  const container = document.createElement('div');
  container.id = SIDEBAR_CONTAINER_ID;
  document.body.appendChild(container);
  
  // Set up theme detection
  themeCleanup = setupThemeListener(container);

  // Mount React
  root = createRoot(container);
  root.render(<Sidebar onClose={closeSidebar} />);
}

export function closeSidebar() {
  const container = document.getElementById(SIDEBAR_CONTAINER_ID);
  if (!container) return;

  // Clean up theme listener
  if (themeCleanup) {
    themeCleanup();
    themeCleanup = null;
  }

  // Add closing animation
  container.classList.add('octarine-closing');
  
  // Wait for animation to complete
  setTimeout(() => {
    if (root) {
      root.unmount();
      root = null;
    }
    container.remove();
  }, 200);
}

export function toggleSidebar() {
  const container = document.getElementById(SIDEBAR_CONTAINER_ID);
  if (container) {
    closeSidebar();
  } else {
    openSidebar();
  }
}

export function isSidebarOpen(): boolean {
  return !!document.getElementById(SIDEBAR_CONTAINER_ID);
}
