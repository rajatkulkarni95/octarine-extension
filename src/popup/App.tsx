import { useState, useEffect, useCallback } from "react";
import {
  loadSettings,
  applyTheme,
  setupThemeListener,
} from "../utils/settings";
import type { Settings } from "../types/settings";
import { DEFAULT_SETTINGS } from "../types/settings";
import type { ClipPayload } from "../types";
import {
  generateClipLink,
  getPayloadSize,
  openDeeplink,
} from "../utils/deeplink";
import { propertiesToMetadata } from "../utils/properties";

import {
  PopupHeader,
  PropertiesPanel,
  SelectionIndicator,
  ContentPreview,
  PopupFooter,
  FileNameInput,
  LoadingState,
  ErrorState,
  ErrorToast,
} from "./components";
import { usePageData, useSaveAllTabs } from "./hooks";

// Hook to apply theme based on settings
function useTheme(settings: Settings) {
  useEffect(() => {
    const cleanup = setupThemeListener(settings.themeMode);
    return cleanup;
  }, [settings.themeMode]);
}

export default function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [basePath, setBasePath] = useState<string>("inbox/web-clips");
  const [propertiesExpanded, setPropertiesExpanded] = useState(false);

  useTheme(settings);

  // Load settings on mount
  useEffect(() => {
    async function initSettings() {
      try {
        const loaded = await loadSettings();
        setSettings(loaded);
        setBasePath(loaded.defaultBasePath);
        applyTheme(loaded.themeMode);
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setSettingsLoaded(true);
      }
    }
    initSettings();
  }, []);

  const {
    pageData,
    selections,
    loading,
    error,
    previewContent,
    resolvedProperties,
    fileName,
    setPreviewContent,
    setResolvedProperties,
    setFileName,
    setError,
    clearSelections,
  } = usePageData({
    propertyDefinitions: settings.properties,
    propertiesEnabled: settings.propertiesEnabled,
  });

  const { savingTabs, handleSaveAllTabs } = useSaveAllTabs(setError);

  const handleClip = useCallback(() => {
    if (!pageData) return;

    // Convert resolved properties to metadata format
    const metadata = settings.propertiesEnabled
      ? propertiesToMetadata(resolvedProperties)
      : undefined;

    const payload: ClipPayload = {
      title: pageData.title,
      url: pageData.url,
      content: previewContent,
      selections: selections.length > 0 ? selections : undefined,
      clippedAt: new Date().toISOString(),
      metadata,
    };

    const deeplink = generateClipLink(payload, {
      basePath: basePath || "inbox/web-clips",
      openAfter: true,
      fileName: fileName || undefined,
    });

    const size = getPayloadSize(payload.content);
    console.log("[Octarine Clipper] Payload size:", size);
    console.log("[Octarine Clipper] Deeplink:", deeplink);

    openDeeplink(deeplink);
  }, [pageData, selections, basePath, fileName, resolvedProperties, previewContent, settings.propertiesEnabled]);

  // Show loading until both settings and page data are loaded
  if (!settingsLoaded || loading) {
    return <LoadingState />;
  }

  if (error && !pageData) {
    return <ErrorState error={error} />;
  }

  return (
    <div className="flex flex-col h-full bg-primary pt-2 overflow-hidden">
      <PopupHeader
        onSaveAllTabs={handleSaveAllTabs}
        savingTabs={savingTabs}
      />

      <FileNameInput fileName={fileName} onChange={setFileName} />

      {error && <ErrorToast error={error} />}

      {settings.propertiesEnabled && (
        <PropertiesPanel
          properties={resolvedProperties}
          onPropertiesChange={setResolvedProperties}
          expanded={propertiesExpanded}
          onToggleExpanded={() => setPropertiesExpanded(!propertiesExpanded)}
        />
      )}

      <SelectionIndicator count={selections.length} onClear={clearSelections} />

      <ContentPreview content={previewContent} onChange={setPreviewContent} />

      <PopupFooter
        basePath={basePath}
        onBasePathChange={setBasePath}
        onClip={handleClip}
      />
    </div>
  );
}
