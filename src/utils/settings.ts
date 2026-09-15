import browser from "webextension-polyfill";
import type { PropertyDefinition, Settings, ThemeMode } from "../types/settings";
import { DEFAULT_CLIP_FOLDER, DEFAULT_SETTINGS } from "../types/settings";
import { normalizePropertyType } from "./properties";

const STORAGE_KEY = "octarine_settings";

// Legacy key for migration
const LEGACY_BASE_PATH_KEY = "octarine_basePath";
const LEGACY_DEFAULT_CLIP_FOLDER = "inbox/web-clips";

function migrateProperties(properties: PropertyDefinition[]): PropertyDefinition[] {
  return properties.map((property) => ({
    ...property,
    type: normalizePropertyType(property.type),
  }));
}

function mergeSettings(stored: Settings): Settings {
  const templates = Object.fromEntries(
    Object.entries(DEFAULT_SETTINGS.templates).map(([id, defaults]) => {
      const saved = stored.templates?.[id as keyof Settings["templates"]];
      const merged = { ...defaults, ...saved };
      return [id, {
        ...merged,
        folder: merged.folder === LEGACY_DEFAULT_CLIP_FOLDER
          ? DEFAULT_CLIP_FOLDER
          : merged.folder,
        properties: migrateProperties(merged.properties),
      }];
    }),
  ) as Settings["templates"];

  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    defaultBasePath: stored.defaultBasePath === LEGACY_DEFAULT_CLIP_FOLDER
      ? DEFAULT_CLIP_FOLDER
      : stored.defaultBasePath || DEFAULT_SETTINGS.defaultBasePath,
    templates,
  };
}

export async function loadSettings(): Promise<Settings> {
  try {
    const result = await browser.storage.local.get([
      STORAGE_KEY,
      LEGACY_BASE_PATH_KEY,
    ]);

    // If we have new settings, return them with deep merge for templates
    if (result[STORAGE_KEY]) {
      const stored = result[STORAGE_KEY] as Settings;
      const merged = mergeSettings(stored);
      const usesLegacyClipFolder =
        stored.defaultBasePath === LEGACY_DEFAULT_CLIP_FOLDER ||
        Object.values(stored.templates ?? {}).some(
          (template) => template?.folder === LEGACY_DEFAULT_CLIP_FOLDER,
        );

      // Migrate old bookmarksPath from "Daily/Bookmarks" to "Bookmarks"
      if (stored.bookmarksPath === "Daily/Bookmarks" || usesLegacyClipFolder) {
        const migrated = {
          ...merged,
          bookmarksPath: stored.bookmarksPath === "Daily/Bookmarks"
            ? "Bookmarks"
            : merged.bookmarksPath,
        };
        await saveSettings(migrated);
        return migrated;
      }

      return merged;
    }

    // Migrate from legacy basePath if exists
    if (result[LEGACY_BASE_PATH_KEY]) {
      const legacyPath = result[LEGACY_BASE_PATH_KEY] as string;
      const folder = legacyPath === LEGACY_DEFAULT_CLIP_FOLDER
        ? DEFAULT_CLIP_FOLDER
        : legacyPath;
      const migratedSettings: Settings = {
        ...DEFAULT_SETTINGS,
        defaultBasePath: folder,
        templates: {
          ...DEFAULT_SETTINGS.templates,
          default: {
            ...DEFAULT_SETTINGS.templates.default,
            folder,
          },
        },
      };
      // Save migrated settings
      await saveSettings(migratedSettings);
      // Clean up legacy key
      await browser.storage.local.remove([LEGACY_BASE_PATH_KEY]);
      return migratedSettings;
    }

    return DEFAULT_SETTINGS;
  } catch (err) {
    console.error("[Octarine] Failed to load settings:", err);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await browser.storage.local.set({ [STORAGE_KEY]: settings });
  } catch (err) {
    console.error("[Octarine] Failed to save settings:", err);
    throw err;
  }
}

export async function updateSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K]
): Promise<Settings> {
  const current = await loadSettings();
  const updated = { ...current, [key]: value };
  await saveSettings(updated);
  return updated;
}

export function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement;
  try {
    window.localStorage?.setItem("octarine_theme", mode);
  } catch {
    // Storage may be unavailable in restricted documents; theme still applies below.
  }
  root.classList.remove("light");

  if (mode === "system") {
    // Follow system preference
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    if (prefersDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  } else if (mode === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
  }
}

export function setupThemeListener(mode: ThemeMode): () => void {
  if (mode !== "system") {
    applyTheme(mode);
    return () => {};
  }

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = (e: MediaQueryListEvent) => {
    if (e.matches) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // Apply initial theme
  applyTheme("system");

  // Listen for changes
  mediaQuery.addEventListener("change", handler);

  return () => mediaQuery.removeEventListener("change", handler);
}
