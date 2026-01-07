export type ThemeMode = "system" | "light" | "dark";

export interface Settings {
  // Workspace settings
  defaultBasePath: string;

  // Theme settings
  themeMode: ThemeMode;

  // Behavior settings
  saveWithoutOpening: boolean;

  // Future settings can be added here
}

export const DEFAULT_SETTINGS: Settings = {
  defaultBasePath: "inbox/web-clips",
  themeMode: "system",
  saveWithoutOpening: false,
};

// Keyboard shortcuts (read-only, defined in manifest)
export interface KeyboardShortcut {
  action: string;
  description: string;
  shortcut: string;
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  {
    action: "open-popup",
    description: "Open Octarine Clipper",
    shortcut: "Alt+Shift+O",
  },
  {
    action: "clip-selection",
    description: "Quick clip selection",
    shortcut: "Alt+Shift+S",
  },
  {
    action: "clip-page",
    description: "Quick clip full page",
    shortcut: "Alt+Shift+C",
  },
];
