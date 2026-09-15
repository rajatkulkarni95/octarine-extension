export type ThemeMode = "system" | "light" | "dark";

export type ClipMode = "selections-only" | "full-page-with-highlights";

export type PropertyType =
  | "string"
  | "number"
  | "date"
  | "datetime"
  | "checkbox"
  | "list"
  | "tags";

export interface PropertyDefinition {
  id: string;
  name: string;
  type: PropertyType;
  value: string; // Template value like "{{og:title}}" or static value
}

// Available template variables that can be extracted from pages
export const AVAILABLE_VARIABLES = [
  { key: "{{title}}", description: "Page title" },
  { key: "{{url}}", description: "Page URL" },
  { key: "{{source}}", description: "Source URL (same as url)" },
  { key: "{{author}}", description: "Author name" },
  { key: "{{published}}", description: "Published date" },
  { key: "{{description}}", description: "Page description" },
  { key: "{{siteName}}", description: "Site name" },
  { key: "{{og:title}}", description: "Open Graph title" },
  { key: "{{og:description}}", description: "Open Graph description" },
  { key: "{{og:image}}", description: "Open Graph image URL" },
  { key: "{{og:site_name}}", description: "Open Graph site name" },
  { key: "{{twitter:title}}", description: "Twitter card title" },
  { key: "{{twitter:description}}", description: "Twitter card description" },
  { key: "{{clippedAt}}", description: "Date/time when clipped" },
  { key: "{{tags}}", description: "Extracted page tags" },
] as const;

export const DEFAULT_PROPERTIES: PropertyDefinition[] = [
  { id: "prop-title", name: "title", type: "string", value: "{{title}}" },
  { id: "prop-source", name: "source", type: "string", value: "{{url}}" },
  { id: "prop-author", name: "author", type: "string", value: "{{author}}" },
  {
    id: "prop-published",
    name: "published",
    type: "date",
    value: "{{published}}",
  },
  {
    id: "prop-description",
    name: "description",
    type: "string",
    value: "{{description}}",
  },
  { id: "prop-tags", name: "tags", type: "tags", value: "{{tags}}" },
];

export interface TemplateSettings {
  propertiesEnabled: boolean;
  properties: PropertyDefinition[];
  contentTemplate: string;
  folder: string;
}

export interface CustomTemplate {
  id: string;
  name: string;
  description: string;
  urlPattern: string;
  baseTemplateId?: string;
}

export interface Settings {
  // Workspace settings
  workspaces: string[];
  defaultBasePath: string;
  bookmarksPath: string;
  dailyNotesPath: string;

  // Theme settings
  themeMode: ThemeMode;

  // Behavior settings
  saveWithoutOpening: boolean;
  clipMode: ClipMode;

  // Template-specific settings (built-in and custom template IDs)
  templates: Record<string, TemplateSettings>;
  customTemplates: CustomTemplate[];
}

export const DEFAULT_CLIP_FOLDER = "web-clips";

export const DEFAULT_SETTINGS: Settings = {
  workspaces: [],
  defaultBasePath: DEFAULT_CLIP_FOLDER,
  bookmarksPath: "Bookmarks",
  dailyNotesPath: "Daily",
  themeMode: "system",
  saveWithoutOpening: false,
  clipMode: "selections-only",
  customTemplates: [],
  templates: {
    default: {
      propertiesEnabled: true,
      properties: DEFAULT_PROPERTIES,
      contentTemplate: "{content}",
      folder: DEFAULT_CLIP_FOLDER,
    },
    "github-pr": {
      propertiesEnabled: true,
      properties: [
        {
          id: "prop-prNumber",
          name: "pr",
          type: "string",
          value: "{{prNumber}}",
        },
        { id: "prop-repo", name: "repo", type: "string", value: "{{repo}}" },
        {
          id: "prop-status",
          name: "status",
          type: "list",
          value: "{{status}}",
        },
        {
          id: "prop-author",
          name: "author",
          type: "string",
          value: "{{author}}",
        },
        {
          id: "prop-reviewers",
          name: "reviewers",
          type: "list",
          value: "{{reviewers}}",
        },
        { id: "prop-url", name: "url", type: "string", value: "{{url}}" },
        {
          id: "prop-filesChanged",
          name: "filesChanged",
          type: "number",
          value: "{{filesChanged}}",
        },
        {
          id: "prop-linesAdded",
          name: "linesAdded",
          type: "number",
          value: "{{linesAdded}}",
        },
        {
          id: "prop-linesRemoved",
          name: "linesRemoved",
          type: "number",
          value: "{{linesRemoved}}",
        },
        {
          id: "prop-mergedDate",
          name: "mergedDate",
          type: "date",
          value: "{{mergedDate}}",
        },
      ],
      contentTemplate: "{if:description}\n{description}\n{/if}",
      folder: "Engineering/PRs",
    },
    "github-issues": {
      propertiesEnabled: true,
      properties: [
        { id: "prop-repo", name: "repo", type: "string", value: "{{repo}}" },
        {
          id: "prop-pageNumber",
          name: "pageNumber",
          type: "number",
          value: "{{pageNumber}}",
        },
        {
          id: "prop-issueCount",
          name: "issueCount",
          type: "number",
          value: "{{issueCount}}",
        },
      ],
      contentTemplate: "{each:issues}\n{value}\n{/each}",
      folder: "Engineering/Issues",
    },
  },
};

// Keyboard shortcuts (read-only, defined in manifest)
export interface KeyboardShortcut {
  action: string;
  description: string;
  macShortcut: string;
  otherShortcut: string;
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  {
    action: "instant-clip",
    description: "Save to Octarine",
    macShortcut: "⌥ ⇧ C",
    otherShortcut: "Alt + Shift + C",
  },
  {
    action: "save-url-bookmark",
    description: "Save URL to Bookmarks",
    macShortcut: "⌥ ⇧ T",
    otherShortcut: "Alt + Shift + T",
  },
];
