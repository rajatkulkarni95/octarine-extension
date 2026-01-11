/**
 * Template system type definitions
 */

export enum PropertyType {
  String = 'string',
  Number = 'number',
  Date = 'date',
  Array = 'array',
  Boolean = 'boolean',
  URL = 'url',
}

export interface PropertyDefinition {
  /** Property key (e.g., "prNumber") */
  key: string;

  /** Human-readable name (e.g., "PR Number") */
  displayName: string;

  /** Data type */
  type: PropertyType;

  /** Default value if not extracted */
  defaultValue?: any;

  /** Must be present for template to work */
  required: boolean;

  /** Default toggle state */
  enabled: boolean;
}

export interface Template {
  /** Unique identifier (e.g., "github-pr") */
  id: string;

  /** Display name (e.g., "GitHub Pull Request") */
  name: string;

  /** Short description for users */
  description: string;

  /** URL patterns to match (e.g., [/github\.com\/.*\/pull\/\d+/]) */
  urlPatterns: RegExp[];

  /** For ordering if multiple match (higher = first) */
  priority: number;

  /** Default save path (e.g., "Engineering/PRs") */
  defaultFolder: string;

  /** Template for filename (e.g., "{repo}-pr-{number}") */
  defaultFilename: string;

  /** List of available properties */
  properties: PropertyDefinition[];

  /** Markdown template with placeholders */
  contentTemplate: string;

  /** Template version for future migrations */
  version: string;

  /** Always true for shipped templates */
  isBuiltIn: boolean;

  /**
   * Extract data from document
   * @param doc The document to extract from
   * @returns Extracted data as key-value pairs
   */
  extract(doc: Document): Record<string, any>;
}

export interface TemplatePreferences {
  [templateId: string]: {
    /** Override default folder */
    folder?: string;

    /** Override enabled/disabled state per property */
    propertyToggles: {
      [propertyKey: string]: boolean;
    };
  };
}

export interface ExtractedData {
  /** Which template was used */
  templateId: string;

  /** Document title */
  title: string;

  /** Rendered markdown content */
  content: string;

  /** Extracted properties (only enabled ones) */
  properties: Record<string, any>;

  /** Source URL */
  url: string;

  /** Where to save (from template or user override) */
  folder: string;

  /** Suggested filename */
  filename?: string;
}

/**
 * Result of template selection
 */
export interface TemplateMatch {
  template: Template;
  isAutoDetected: boolean;
  matchedPattern?: RegExp;
}
