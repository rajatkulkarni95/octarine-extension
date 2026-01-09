export type ThemeMode = "system" | "light" | "dark";

export type PropertyType = "text" | "number" | "date" | "datetime" | "checkbox" | "url" | "list";

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
  { id: "prop-title", name: "title", type: "text", value: "{{title}}" },
  { id: "prop-source", name: "source", type: "url", value: "{{url}}" },
  { id: "prop-author", name: "author", type: "text", value: "{{author}}" },
  { id: "prop-published", name: "published", type: "date", value: "{{published}}" },
  { id: "prop-description", name: "description", type: "text", value: "{{description}}" },
  { id: "prop-tags", name: "tags", type: "list", value: "{{tags}}" },
];

export interface TemplateSettings {
  propertiesEnabled: boolean;
  properties: PropertyDefinition[];
  contentTemplate: string;
}

export interface Settings {
  // Workspace settings
  workspaces: string[];
  defaultBasePath: string;

  // Theme settings
  themeMode: ThemeMode;

  // Behavior settings
  saveWithoutOpening: boolean;

  // Template-specific settings (per template ID)
  templates: {
    default: TemplateSettings;
    "github-pr": TemplateSettings;
    "github-issues": TemplateSettings;
  };
}

export const DEFAULT_SETTINGS: Settings = {
  workspaces: [],
  defaultBasePath: "inbox/web-clips",
  themeMode: "system",
  saveWithoutOpening: false,
  templates: {
    default: {
      propertiesEnabled: true,
      properties: DEFAULT_PROPERTIES,
      contentTemplate: "{content}",
    },
    "github-pr": {
      propertiesEnabled: true,
      properties: [
        { id: "prop-prNumber", name: "pr", type: "text", value: "{{prNumber}}" },
        { id: "prop-repo", name: "repo", type: "text", value: "{{repo}}" },
        { id: "prop-status", name: "status", type: "list", value: "{{status}}" },
        { id: "prop-author", name: "author", type: "text", value: "{{author}}" },
        { id: "prop-reviewers", name: "reviewers", type: "list", value: "{{reviewers}}" },
        { id: "prop-url", name: "url", type: "url", value: "{{url}}" },
        { id: "prop-filesChanged", name: "filesChanged", type: "number", value: "{{filesChanged}}" },
        { id: "prop-linesAdded", name: "linesAdded", type: "text", value: "{{linesAdded}}" },
        { id: "prop-linesRemoved", name: "linesRemoved", type: "text", value: "{{linesRemoved}}" },
        { id: "prop-mergedDate", name: "mergedDate", type: "date", value: "{{mergedDate}}" },
      ],
      contentTemplate: "{if:description}\n{description}\n{/if}",
    },
    "github-issues": {
      propertiesEnabled: true,
      properties: [
        { id: "prop-repo", name: "repo", type: "text", value: "{{repo}}" },
        { id: "prop-pageNumber", name: "pageNumber", type: "number", value: "{{pageNumber}}" },
        { id: "prop-issueCount", name: "issueCount", type: "number", value: "{{issueCount}}" },
      ],
      contentTemplate: "{each:issues}\n{value}\n{/each}",
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
    action: "open-popup",
    description: "Open Octarine Clipper",
    macShortcut: "⌥ ⇧ O",
    otherShortcut: "Alt + Shift + O",
  },
  {
    action: "clip-selection",
    description: "Quick clip selection",
    macShortcut: "⌥ ⇧ S",
    otherShortcut: "Alt + Shift + S",
  },
  {
    action: "clip-page",
    description: "Quick clip full page",
    macShortcut: "⌥ ⇧ C",
    otherShortcut: "Alt + Shift + C",
  },
];
