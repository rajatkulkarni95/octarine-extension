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

export interface Settings {
  // Workspace settings
  workspaces: string[];
  defaultBasePath: string;

  // Theme settings
  themeMode: ThemeMode;

  // Behavior settings
  saveWithoutOpening: boolean;

  // Properties settings
  propertiesEnabled: boolean;
  properties: PropertyDefinition[];
}

export const DEFAULT_SETTINGS: Settings = {
  workspaces: [],
  defaultBasePath: "inbox/web-clips",
  themeMode: "system",
  saveWithoutOpening: false,
  propertiesEnabled: true,
  properties: DEFAULT_PROPERTIES,
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
