export interface PageMetadata {
  title?: string;
  source?: string;
  author?: string;
  published?: string;
  description?: string;
  tags?: string[];
  siteName?: string;
  image?: string;
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
}

export interface ClipPayload {
  title: string;
  url: string;
  content: string;
  selections?: ClipSelection[];
  clippedAt: string;
  metadata?: PageMetadata;
}

export type MessageAction = 
  | 'GET_PAGE_DATA'
  | 'GET_SELECTION'
  | 'ADD_SELECTION'
  | 'REMOVE_SELECTION'
  | 'CLEAR_SELECTIONS'
  | 'GET_SELECTIONS'
  | 'INSTANT_CLIP';

export interface ExtensionMessage {
  action: MessageAction;
  payload?: unknown;
}

export interface ExtensionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
