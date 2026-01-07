export type ThemeMode = "system" | "light" | "dark";

export interface Settings {
  // Workspace settings
  workspaces: string[];
  defaultBasePath: string;

  // Theme settings
  themeMode: ThemeMode;

  // Behavior settings
  saveWithoutOpening: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  workspaces: [],
  defaultBasePath: "inbox/web-clips",
  themeMode: "system",
  saveWithoutOpening: false,
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
