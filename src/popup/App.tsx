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
import { initializeTemplates } from "../utils/templates";

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
  const [matchedTemplateId, setMatchedTemplateId] = useState<"default" | "github-pr" | "github-issues">("default");

  useTheme(settings);

  // Load settings on mount
  useEffect(() => {
    async function initSettings() {
      try {
        // Initialize templates before loading settings
        initializeTemplates();

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
    propertyDefinitions: settings.templates[matchedTemplateId].properties,
    propertiesEnabled: settings.templates[matchedTemplateId].propertiesEnabled,
  });

  // Detect which template matched and update state
  useEffect(() => {
    if (pageData?.metadata?.templateId) {
      const templateId = pageData.metadata.templateId as "default" | "github-pr" | "github-issues";
      if (templateId !== matchedTemplateId) {
        console.log('[Octarine Popup] Matched template:', templateId);
        setMatchedTemplateId(templateId);
      }
    }
  }, [pageData?.metadata?.templateId, matchedTemplateId]);

  const { savingTabs, handleSaveAllTabs } = useSaveAllTabs(setError, settings.workspaces[0]);

  // Update basePath when template provides a default folder
  useEffect(() => {
    if (pageData?.metadata?.folder) {
      console.log('[Octarine Popup] Using template folder:', pageData.metadata.folder);
      setBasePath(pageData.metadata.folder);
    }
  }, [pageData?.metadata?.folder]);

  const handleClip = useCallback(() => {
    if (!pageData) return;

    // Convert resolved properties to metadata format
    const metadata = settings.templates[matchedTemplateId].propertiesEnabled
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
      workspace: settings.workspaces[0] || undefined,
      openAfter: true,
      fileName: fileName || undefined,
    });

    const size = getPayloadSize(payload.content);
    console.log("[Octarine Clipper] Payload size:", size);
    console.log("[Octarine Clipper] Deeplink:", deeplink);

    openDeeplink(deeplink);
  }, [pageData, selections, basePath, fileName, resolvedProperties, previewContent, settings.templates[matchedTemplateId].propertiesEnabled, matchedTemplateId]);

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

      {settings.templates[matchedTemplateId].propertiesEnabled && (
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
