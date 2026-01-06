import browser from 'webextension-polyfill';
import { extractPageContent, getSelectedText, getSelectedMarkdown } from '../utils/extractor';
import type { ExtensionMessage, ExtensionResponse, ClipSelection } from '../types';

// Store for batched selections
let selections: ClipSelection[] = [];

/**
 * Handle messages from popup/background
 */
browser.runtime.onMessage.addListener((message: unknown): Promise<ExtensionResponse> | undefined => {
  const msg = message as ExtensionMessage;
  if (msg && typeof msg === 'object' && 'action' in msg) {
    return handleMessage(msg);
  }
  return undefined;
});

async function handleMessage(message: ExtensionMessage): Promise<ExtensionResponse> {
  switch (message.action) {
    case 'GET_PAGE_DATA': {
      const pageData = extractPageContent(document);
      if (pageData) {
        return { success: true, data: pageData };
      }
      return { success: false, error: 'Failed to extract page content' };
    }

    case 'GET_SELECTION': {
      const text = getSelectedText();
      const markdown = getSelectedMarkdown();
      return {
        success: true,
        data: { text, markdown },
      };
    }

    case 'ADD_SELECTION': {
      const text = getSelectedText();
      const markdown = getSelectedMarkdown();
      
      if (!text) {
        return { success: false, error: 'No text selected' };
      }
      
      const selection: ClipSelection = {
        id: crypto.randomUUID(),
        text: markdown || text,
        timestamp: Date.now(),
      };
      
      selections.push(selection);
      
      return {
        success: true,
        data: { selection, total: selections.length },
      };
    }

    case 'GET_SELECTIONS': {
      return {
        success: true,
        data: selections,
      };
    }

    case 'CLEAR_SELECTIONS': {
      selections = [];
      return { success: true };
    }

    default:
      return { success: false, error: 'Unknown action' };
  }
}

// Notify that content script is loaded
console.log('[Octarine Clipper] Content script loaded');
