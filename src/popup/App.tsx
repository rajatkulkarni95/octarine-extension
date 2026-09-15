import { useState, useEffect, useCallback } from "react";
import browser from "webextension-polyfill";
import {
  loadSettings,
  applyTheme,
  setupThemeListener,
} from "../utils/settings";
import type { Settings } from "../types/settings";
import { DEFAULT_SETTINGS } from "../types/settings";
import type { ClipPayload, ExtensionResponse } from "../types";
import {
  generateClipLink,
  generateCreateLink,
} from "../utils/deeplink";
import { propertiesToMetadata } from "../utils/properties";
import { initializeTemplates } from "../utils/templates";

import {
  FileNameInput,
  TemplateSelector,
  PrimaryActionButton,
  ContentPropertiesTabs,
  // SecondaryActions,
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

async function openDeeplinkFromActiveTab(url: string): Promise<void> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab available");

  const response = await browser.tabs.sendMessage(tab.id, {
    action: "OPEN_DEEPLINK",
    payload: { url },
  }) as ExtensionResponse;
  if (!response.success) {
    throw new Error(response.error || "Failed to open Octarine");
  }
}

export default function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [bookmarksPath, setBookmarksPath] = useState<string>("Bookmarks");
  const [matchedTemplateId, setMatchedTemplateId] = useState("default");
  const [manualTemplateId, setManualTemplateId] = useState<string>();

  useTheme(settings);
  const templateSettings = settings.templates[matchedTemplateId] ?? settings.templates.default;
  const templateOptions = [
    { id: "default", name: "Default" },
    { id: "github-pr", name: "GitHub PR" },
    { id: "github-issues", name: "GitHub Issues" },
    ...settings.customTemplates.map((template) => ({
      id: template.id,
      name: template.name,
    })),
  ];

  // Load settings on mount
  useEffect(() => {
    async function initSettings() {
      try {
        // Initialize templates before loading settings
        initializeTemplates();

        const loaded = await loadSettings();
        setSettings(loaded);
        setBookmarksPath(loaded.bookmarksPath);
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
  } = usePageData({
    propertyDefinitions: templateSettings.properties,
    propertiesEnabled: templateSettings.propertiesEnabled,
    templateId: manualTemplateId,
  });

  // Detect which template matched and update state
  useEffect(() => {
    if (pageData?.metadata?.templateId) {
      const templateId = String(pageData.metadata.templateId);
      if (templateId !== matchedTemplateId) {
        setMatchedTemplateId(templateId);
      }
    }
  }, [pageData?.metadata?.templateId, matchedTemplateId]);

  const { savingTabs, handleSaveAllTabs } = useSaveAllTabs(
    setError,
    settings.workspaces[0],
    !settings.saveWithoutOpening,
  );

  const handleClip = useCallback(async () => {
    if (!pageData) return;

    // Convert resolved properties to metadata format
    const metadata = templateSettings.propertiesEnabled
      ? propertiesToMetadata(resolvedProperties)
      : undefined;

    // ALWAYS use the preview content - this is what the user sees and what should be saved
    // The preview content already has highlights marked with ==text== if there are selections
    const finalContent = previewContent;

    const payload: ClipPayload = {
      title: pageData.title,
      url: pageData.url,
      content: finalContent,
      selections: selections.length > 0 ? selections : undefined,
      clippedAt: new Date().toISOString(),
      metadata,
    };

    const deeplink = generateClipLink(payload, {
      basePath: templateSettings.folder,
      workspace: settings.workspaces[0] || undefined,
      openAfter: !settings.saveWithoutOpening,
      fileName: fileName || undefined,
    });

    try {
      await openDeeplinkFromActiveTab(deeplink);
    } catch {
      setError("Failed to open Octarine from this page");
    }
  }, [
    pageData,
    selections,
    fileName,
    resolvedProperties,
    previewContent,
    templateSettings.folder,
    templateSettings.propertiesEnabled,
    settings.workspaces,
    settings.saveWithoutOpening,
    setError,
  ]);

  const handleSaveBookmark = useCallback(async () => {
    if (!pageData) return;

    // Append bookmark as a bullet list item to a single Bookmarks.md file
    const content = `- [${pageData.title}](${pageData.url})`;

    const deeplink = generateCreateLink({
      path: bookmarksPath || "Bookmarks",
      content,
      workspace: settings.workspaces[0] || undefined,
      fresh: false, // Append to existing file
      position: "bottom", // Add at the end
      separator: "\n", // Separate with newline
      openAfter: !settings.saveWithoutOpening,
    });

    try {
      await openDeeplinkFromActiveTab(deeplink);
    } catch {
      setError("Failed to open Octarine from this page");
    }
  }, [
    pageData,
    bookmarksPath,
    settings.workspaces,
    settings.saveWithoutOpening,
    setError,
  ]);

  const handleTemplateChange = useCallback(
    (templateId: string) => {
      setMatchedTemplateId(templateId);
      setManualTemplateId(templateId);
    },
    [],
  );

  // Show loading until both settings and page data are loaded
  if (!settingsLoaded || loading) {
    return <LoadingState />;
  }

  if (error && !pageData) {
    return <ErrorState error={error} />;
  }

  return (
    <div className="flex flex-col h-full bg-primary overflow-hidden">
      {error && <ErrorToast error={error} />}

      <div className="flex-1 overflow-hidden flex flex-col">
        <TemplateSelector
          selectedTemplate={matchedTemplateId}
          templates={templateOptions}
          onTemplateChange={handleTemplateChange}
          onSaveBookmark={handleSaveBookmark}
          onSaveAllTabs={handleSaveAllTabs}
          savingTabs={savingTabs}
        />

        <FileNameInput fileName={fileName} onChange={setFileName} />

        <ContentPropertiesTabs
          content={previewContent}
          onContentChange={setPreviewContent}
          properties={resolvedProperties}
          onPropertiesChange={setResolvedProperties}
          propertiesEnabled={
            templateSettings.propertiesEnabled
          }
        />

        <div className="mt-auto flex-shrink-0 border-t border-faded bg-intermediate p-2">
          <PrimaryActionButton onClip={handleClip} content={previewContent} />
        </div>
      </div>

      {/* <div className="flex-shrink-0">
        <SecondaryActions
          onSaveBookmark={handleSaveBookmark}
          onSaveAllTabs={handleSaveAllTabs}
          savingTabs={savingTabs}
        />
      </div> */}
    </div>
  );
}
