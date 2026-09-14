import browser from "webextension-polyfill";
import type { PropertyDefinition, Settings, ThemeMode } from "../types/settings";
import { DEFAULT_SETTINGS } from "../types/settings";
import { normalizePropertyType } from "./properties";

const STORAGE_KEY = "octarine_settings";

// Legacy key for migration
const LEGACY_BASE_PATH_KEY = "octarine_basePath";

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
      return [id, { ...merged, properties: migrateProperties(merged.properties) }];
    }),
  ) as Settings["templates"];

  return { ...DEFAULT_SETTINGS, ...stored, templates };
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

      // Migrate old bookmarksPath from "Daily/Bookmarks" to "Bookmarks"
      if (stored.bookmarksPath === "Daily/Bookmarks") {
        // Save the migration
        const migrated = {
          ...DEFAULT_SETTINGS,
          ...stored,
          bookmarksPath: "Bookmarks",
          templates: mergeSettings(stored).templates,
        };
        await saveSettings(migrated);
        return migrated;
      }

      return mergeSettings(stored);
    }

    // Migrate from legacy basePath if exists
    if (result[LEGACY_BASE_PATH_KEY]) {
      const migratedSettings: Settings = {
        ...DEFAULT_SETTINGS,
        defaultBasePath: result[LEGACY_BASE_PATH_KEY] as string,
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
