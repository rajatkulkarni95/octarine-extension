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
  generateCreateLink,
  getPayloadSize,
  openDeeplink,
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

export default function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [basePath, setBasePath] = useState<string>("inbox/web-clips");
  const [bookmarksPath, setBookmarksPath] = useState<string>("Bookmarks");
  const [matchedTemplateId, setMatchedTemplateId] = useState<
    "default" | "github-pr" | "github-issues"
  >("default");

  useTheme(settings);

  // Load settings on mount
  useEffect(() => {
    async function initSettings() {
      try {
        // Initialize templates before loading settings
        initializeTemplates();

        const loaded = await loadSettings();
        setSettings(loaded);
        // Use the default template's folder instead of global defaultBasePath
        setBasePath(loaded.templates.default.folder);
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
    propertyDefinitions: settings.templates[matchedTemplateId].properties,
    propertiesEnabled: settings.templates[matchedTemplateId].propertiesEnabled,
  });

  // Detect which template matched and update state
  useEffect(() => {
    if (pageData?.metadata?.templateId) {
      const templateId = pageData.metadata.templateId as
        | "default"
        | "github-pr"
        | "github-issues";
      if (templateId !== matchedTemplateId) {
        console.log("[Octarine Popup] Matched template:", templateId);
        setMatchedTemplateId(templateId);
      }
    }
  }, [pageData?.metadata?.templateId, matchedTemplateId]);

  const { savingTabs, handleSaveAllTabs } = useSaveAllTabs(
    setError,
    settings.workspaces[0],
  );

  // Update basePath when template provides a default folder
  useEffect(() => {
    if (pageData?.metadata?.folder) {
      console.log(
        "[Octarine Popup] Using template folder:",
        pageData.metadata.folder,
      );
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
  }, [
    pageData,
    selections,
    basePath,
    fileName,
    resolvedProperties,
    previewContent,
    settings.templates[matchedTemplateId].propertiesEnabled,
    matchedTemplateId,
  ]);

  const handleSaveBookmark = useCallback(() => {
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
      openAfter: true,
    });

    console.log("[Octarine Clipper] Saving bookmark to:", bookmarksPath);
    openDeeplink(deeplink);
  }, [pageData, bookmarksPath, settings.workspaces]);

  const handleTemplateChange = useCallback(
    (templateId: "default" | "github-pr" | "github-issues") => {
      setMatchedTemplateId(templateId);
      // Update basePath based on the selected template
      setBasePath(settings.templates[templateId].folder);
    },
    [settings],
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

      <div className="flex-1 overflow-y-auto flex flex-col pt-2">
        <TemplateSelector
          selectedTemplate={matchedTemplateId}
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
            settings.templates[matchedTemplateId].propertiesEnabled
          }
        />

        <div className="mt-auto pb-2">
          <div className="px-2 pb-1 mt-2 flex flex-col gap-1">
            <div className="text-xs text-tertiary">Note Location</div>
            <input
              type="text"
              value={basePath}
              onChange={(e) => setBasePath(e.target.value)}
              placeholder="inbox/web-clips"
              className="w-full text-[13px] px-2 py-1.5 border border-primary rounded bg-secondary text-primary placeholder:text-placeholder focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

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
