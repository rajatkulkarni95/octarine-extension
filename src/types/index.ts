export interface PageMetadata {
  title?: string;
  source?: string;
  author?: string;
  published?: string;
  description?: string;
  tags?: string[];
  siteName?: string;
  image?: string;
  templateId?: string;
  folder?: string;
  filename?: string;
  // Allow dynamic properties from templates
  [key: string]: unknown;
}

export interface PageData {
  title: string;
  url: string;
  content: string;
  markdown: string;
  author?: string;
  publishedDate?: string;
  siteName?: string;
  description?: string;
  excerpt?: string;
  metadata?: PageMetadata;
}

export interface ClipSelection {
  id: string;
  text: string;
  timestamp: number;
  // Store serialized range for highlighting
  rangeData?: {
    startContainerPath: string; // XPath or similar identifier
    startOffset: number;
    endContainerPath: string;
    endOffset: number;
  };
}

export interface ClipPayload {
  title: string;
  url: string;
  content: string;
  selections?: ClipSelection[];
  clippedAt: string;
  metadata?: PageMetadata | Record<string, unknown>;
}

export type MessageAction =
  | 'GET_PAGE_DATA'
  | 'GET_SELECTION'
  | 'ADD_SELECTION'
  | 'REMOVE_SELECTION'
  | 'CLEAR_SELECTIONS'
  | 'GET_SELECTIONS'
  | 'INSTANT_CLIP'
  | 'GET_TAB_METADATA'
  | 'SAVE_URL_BOOKMARK'
  | 'SAVE_ALL_TABS'
  | 'START_MULTI_HIGHLIGHT';

export interface TabInfo {
  url: string;
  title: string;
}

export interface ExtensionMessage {
  action: MessageAction;
  payload?: unknown;
}

export interface ExtensionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
