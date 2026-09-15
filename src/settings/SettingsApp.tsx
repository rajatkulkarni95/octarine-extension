import { useState, useEffect, useCallback } from "react";
import {
  Moon,
  Sun,
  Monitor,
  ChevronDown,
  ArrowLeft,
  Check,
  X,
  GripVertical,
  Plus,
  Type,
  Hash,
  Calendar,
  Clock,
  CheckSquare,
  List,
  Save,
  Copy,
  Trash2,
  Link,
  Folder,
} from "lucide-react";
import * as Switch from "@radix-ui/react-switch";
import * as Select from "@radix-ui/react-select";
import browser from "webextension-polyfill";
import type {
  Settings as SettingsType,
  ThemeMode,
  ClipMode,
  PropertyDefinition,
  PropertyType,
  TemplateSettings,
  CustomTemplate,
} from "../types/settings";
import {
  KEYBOARD_SHORTCUTS,
  DEFAULT_SETTINGS,
  DEFAULT_PROPERTIES,
  AVAILABLE_VARIABLES,
} from "../types/settings";
import {
  loadSettings,
  saveSettings,
  applyTheme,
  setupThemeListener,
} from "../utils/settings";
import { urlMatchesPattern } from "../utils/custom-templates";

type SettingsSection = "general" | "templates";

export default function SettingsApp() {
  const [settings, setSettings] = useState<SettingsType>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<SettingsSection>("general");

  // Apply theme
  useEffect(() => {
    const cleanup = setupThemeListener(settings.themeMode);
    return cleanup;
  }, [settings.themeMode]);

  // Load settings on mount
  useEffect(() => {
    loadSettings().then((loaded) => {
      setSettings(loaded);
      applyTheme(loaded.themeMode);
      setLoading(false);
    });
  }, []);

  const updateSetting = async <K extends keyof SettingsType>(
    key: K,
    value: SettingsType[K],
  ) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);

    if (key === "themeMode") {
      applyTheme(value as ThemeMode);
    }

    await saveSettings(updated);
  };

  const replaceSettings = async (updated: SettingsType) => {
    setSettings(updated);
    await saveSettings(updated);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-primary">
        <div className="animate-pulse text-placeholder">
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-8">
      <div className="w-[900px] h-[80vh] bg-primary border border-primary rounded-xl shadow-lg overflow-hidden flex">
        {/* Sidebar */}
        <aside className="w-56 bg-intermediate border-r border-primary flex-shrink-0">
          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveSection("general")}
              className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                activeSection === "general"
                  ? "bg-tertiary text-primary font-medium"
                  : "text-tertiary hover:text-primary hover:bg-secondary/50"
              }`}
            >
              General
            </button>

            <button
              onClick={() => setActiveSection("templates")}
              className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                activeSection === "templates"
                  ? "bg-tertiary text-primary font-medium"
                  : "text-tertiary hover:text-primary hover:bg-secondary/50"
              }`}
            >
              Templates
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {activeSection === "general" && (
            <div className="space-y-8">
              <WorkspacesSettings
                settings={settings}
                updateSetting={updateSetting}
              />
              <GeneralSettings settings={settings} updateSetting={updateSetting} />
              <HotkeysSettings />
              <AboutSettings />
            </div>
          )}
          {activeSection === "templates" && (
            <TemplatesSection
              settings={settings}
              updateSetting={updateSetting}
              replaceSettings={replaceSettings}
            />
          )}
        </main>
      </div>
    </div>
  );
}

interface GeneralSettingsProps {
  settings: SettingsType;
  updateSetting: <K extends keyof SettingsType>(
    key: K,
    value: SettingsType[K],
  ) => Promise<void>;
}

const BUILT_IN_TEMPLATES = {
  default: {
    name: "Default Web Clipper",
    description: "Capture web pages with a clean, readable format.",
    matchSummary: "Matches all URLs",
    duplicatePattern: "*",
    urlPatterns: undefined,
    availableVariables: AVAILABLE_VARIABLES,
  },
  "github-pr": {
      name: "GitHub Pull Request",
      description: "Extract PR details with status, reviewers, and file changes",
      matchSummary: "github.com/*/*/pull/*",
      duplicatePattern: "github.com/*/*/pull/*",
      urlPatterns: [/github\.com\/[^/]+\/[^/]+\/pull\/\d+/],
      availableVariables: [
        { key: "{{prNumber}}", description: "PR number" },
        { key: "{{repo}}", description: "Repository name" },
        { key: "{{status}}", description: "PR status (open/merged/closed)" },
        { key: "{{author}}", description: "PR author" },
        { key: "{{reviewers}}", description: "List of reviewers" },
        { key: "{{url}}", description: "PR URL" },
        { key: "{{filesChanged}}", description: "Number of files changed" },
        { key: "{{linesAdded}}", description: "Lines added" },
        { key: "{{linesRemoved}}", description: "Lines removed" },
        { key: "{{mergedDate}}", description: "Date PR was merged" },
        { key: "{{description}}", description: "PR description" },
      ],
  },
  "github-issues": {
      name: "GitHub Issues List",
      description: "Extract list of issues from GitHub issues page",
      matchSummary: "github.com/*/*/issues*",
      duplicatePattern: "github.com/*/*/issues*",
      urlPatterns: [/github\.com\/[^/]+\/[^/]+\/issues\/?(\?.*)?$/],
      availableVariables: [
        { key: "{{repo}}", description: "Repository name" },
        { key: "{{pageNumber}}", description: "Current page number" },
        { key: "{{issueCount}}", description: "Number of issues on page" },
        { key: "{{issues}}", description: "List of issues (for {each} loop)" },
      ],
  },
} as const;

type BuiltInTemplateId = keyof typeof BUILT_IN_TEMPLATES;

interface TemplatesSectionProps extends GeneralSettingsProps {
  replaceSettings: (settings: SettingsType) => Promise<void>;
}

function TemplatesSection({ settings, updateSetting, replaceSettings }: TemplatesSectionProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const customTemplate = settings.customTemplates.find(
    (template) => template.id === selectedTemplate,
  );

  const saveCustomTemplate = async (
    template: CustomTemplate,
    templateSettings: TemplateSettings,
  ) => {
    const exists = settings.customTemplates.some((item) => item.id === template.id);
    await replaceSettings({
      ...settings,
      customTemplates: exists
        ? settings.customTemplates.map((item) => item.id === template.id ? template : item)
        : [...settings.customTemplates, template],
      templates: {
        ...settings.templates,
        [template.id]: templateSettings,
      },
    });
    setSelectedTemplate(null);
  };

  const duplicateTemplate = async (templateId: string) => {
    const builtIn = BUILT_IN_TEMPLATES[templateId as BuiltInTemplateId];
    const custom = settings.customTemplates.find((template) => template.id === templateId);
    const id = `custom-${crypto.randomUUID()}`;
    const duplicate: CustomTemplate = {
      id,
      name: `${builtIn?.name ?? custom?.name ?? "Template"} copy`,
      description: builtIn?.description ?? custom?.description ?? "",
      urlPattern: builtIn?.duplicatePattern ?? custom?.urlPattern ?? "*",
      baseTemplateId: builtIn && templateId !== "default"
        ? templateId
        : custom?.baseTemplateId,
    };
    await replaceSettings({
      ...settings,
      customTemplates: [...settings.customTemplates, duplicate],
      templates: {
        ...settings.templates,
        [id]: {
          ...(settings.templates[templateId] ?? DEFAULT_SETTINGS.templates.default),
          properties: (settings.templates[templateId]?.properties ?? DEFAULT_PROPERTIES).map(
            (property) => ({ ...property }),
          ),
        },
      },
    });
    setSelectedTemplate(id);
  };

  const deleteTemplate = async (templateId: string) => {
    const template = settings.customTemplates.find((item) => item.id === templateId);
    if (!window.confirm(`Delete ${template?.name ?? "this template"}?`)) return;
    const templates = { ...settings.templates };
    delete templates[templateId];
    await replaceSettings({
      ...settings,
      customTemplates: settings.customTemplates.filter((template) => template.id !== templateId),
      templates,
    });
    setSelectedTemplate(null);
  };

  if (selectedTemplate === "new" || customTemplate) {
    return (
      <CustomTemplateForm
        key={selectedTemplate}
        template={customTemplate}
        templateSettings={customTemplate ? settings.templates[customTemplate.id] : undefined}
        onCancel={() => setSelectedTemplate(null)}
        onSave={saveCustomTemplate}
      />
    );
  }

  if (selectedTemplate && selectedTemplate in BUILT_IN_TEMPLATES) {
    const config = BUILT_IN_TEMPLATES[selectedTemplate as BuiltInTemplateId];
    const templateSettings = settings.templates[selectedTemplate];
    const updateTemplateSettings = async (updates: Partial<TemplateSettings>) => {
      await updateSetting("templates", {
        ...settings.templates,
        [selectedTemplate]: { ...templateSettings, ...updates },
      });
    };

    return (
      <div>
        <button
          onClick={() => setSelectedTemplate(null)}
          className="mb-4 flex items-center gap-1.5 text-sm text-tertiary hover:text-primary"
        >
          <ArrowLeft size={15} /> Back to templates
        </button>
        <TemplateEditor
          key={selectedTemplate}
          name={config.name}
          description={config.description}
          urlPatterns={config.urlPatterns}
          availableVariables={config.availableVariables}
          templateSettings={templateSettings}
          updateTemplateSettings={updateTemplateSettings}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-primary">Templates</h1>
          <p className="mt-1 text-sm text-tertiary">
            Create and manage templates for clipping content.
          </p>
        </div>
        <button
          onClick={() => setSelectedTemplate("new")}
          className="flex items-center gap-1.5 rounded bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent/90"
        >
          <Plus size={15} /> New template
        </button>
      </div>

      <div className="space-y-3">
        {(Object.entries(BUILT_IN_TEMPLATES) as Array<[
          BuiltInTemplateId,
          (typeof BUILT_IN_TEMPLATES)[BuiltInTemplateId],
        ]>).map(([id, config]) => (
          <TemplateCard
            key={id}
            name={config.name}
            description={config.description}
            badge="Built-in"
            matchSummary={config.matchSummary}
            folder={settings.templates[id].folder}
            onEdit={() => setSelectedTemplate(id)}
            onDuplicate={() => duplicateTemplate(id)}
          />
        ))}
        {settings.customTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            name={template.name}
            description={template.description || "Custom clipping template"}
            badge="Custom"
            matchSummary={template.urlPattern}
            folder={settings.templates[template.id]?.folder ?? ""}
            onEdit={() => setSelectedTemplate(template.id)}
            onDuplicate={() => duplicateTemplate(template.id)}
            onDelete={() => deleteTemplate(template.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface TemplateCardProps {
  name: string;
  description: string;
  badge: "Built-in" | "Custom";
  matchSummary: string;
  folder: string;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete?: () => void;
}

function TemplateCard({
  name,
  description,
  badge,
  matchSummary,
  folder,
  onEdit,
  onDuplicate,
  onDelete,
}: TemplateCardProps) {
  return (
    <div className="rounded-lg border border-primary bg-intermediate p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-primary">{name}</h2>
            <span className={`rounded-full px-2 py-0.5 text-[11px] ${
              badge === "Custom" ? "bg-accent/10 text-accent" : "bg-tertiary text-tertiary"
            }`}>
              {badge}
            </span>
          </div>
          <p className="mt-1 text-sm text-tertiary">{description}</p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          <button onClick={onEdit} className="rounded px-2 py-1.5 text-xs text-primary hover:bg-tertiary">
            Edit
          </button>
          <button onClick={onDuplicate} className="rounded p-1.5 text-tertiary hover:bg-tertiary hover:text-primary" title="Duplicate template">
            <Copy size={14} />
          </button>
          {onDelete && (
            <button onClick={onDelete} className="rounded p-1.5 text-tertiary hover:bg-tertiary hover:text-error" title="Delete template">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-5 border-t border-faded pt-3 text-xs text-tertiary">
        <span className="flex min-w-0 items-center gap-1.5"><Link size={13} /><span className="truncate">{matchSummary}</span></span>
        <span className="flex min-w-0 items-center gap-1.5"><Folder size={13} /><span className="truncate">{folder}</span></span>
      </div>
    </div>
  );
}

interface CustomTemplateFormProps {
  template?: CustomTemplate;
  templateSettings?: TemplateSettings;
  onCancel: () => void;
  onSave: (template: CustomTemplate, settings: TemplateSettings) => Promise<void>;
}

function CustomTemplateForm({ template, templateSettings, onCancel, onSave }: CustomTemplateFormProps) {
  const [details, setDetails] = useState<CustomTemplate>(template ?? {
    id: `custom-${crypto.randomUUID()}`,
    name: "",
    description: "",
    urlPattern: "",
  });
  const [draftSettings, setDraftSettings] = useState<TemplateSettings>(templateSettings ?? {
    propertiesEnabled: true,
    properties: DEFAULT_PROPERTIES.map((property) => ({ ...property })),
    contentTemplate: "# {title}\n\n{content}\n\nSource: {url}",
    folder: DEFAULT_SETTINGS.templates.default.folder,
  });
  const [testUrl, setTestUrl] = useState("");
  const canSave = Boolean(details.name.trim() && details.urlPattern.trim() && draftSettings.folder.trim());
  const testMatches = testUrl ? urlMatchesPattern(testUrl, details.urlPattern) : null;

  const updateDraftSettings = async (updates: Partial<TemplateSettings>) => {
    setDraftSettings((current) => ({ ...current, ...updates }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 border-b border-faded pb-4">
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="rounded p-1 text-tertiary hover:bg-tertiary hover:text-primary" aria-label="Back to templates">
            <ArrowLeft size={17} />
          </button>
          <h1 className="text-lg font-semibold text-primary">{template ? "Edit template" : "Create template"}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="rounded border border-primary px-3 py-2 text-sm text-primary hover:bg-secondary">Cancel</button>
          <button
            disabled={!canSave}
            onClick={() => onSave(
              { ...details, name: details.name.trim(), urlPattern: details.urlPattern.trim() },
              { ...draftSettings, folder: draftSettings.folder.trim() },
            )}
            className="rounded bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save template
          </button>
        </div>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-primary">Template name</span>
        <input value={details.name} onChange={(event) => setDetails({ ...details, name: event.target.value })} placeholder="Recipe Pages" className="w-full rounded border border-primary bg-secondary px-3 py-2 text-sm text-primary placeholder:text-placeholder focus:outline-none focus:ring-1 focus:ring-accent" />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-primary">Description <span className="font-normal text-placeholder">(optional)</span></span>
        <input value={details.description} onChange={(event) => setDetails({ ...details, description: event.target.value })} placeholder="Save recipes with structured details" className="w-full rounded border border-primary bg-secondary px-3 py-2 text-sm text-primary placeholder:text-placeholder focus:outline-none focus:ring-1 focus:ring-accent" />
      </label>

      <div>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-primary">Use this template when URL matches</span>
          <input value={details.urlPattern} onChange={(event) => setDetails({ ...details, urlPattern: event.target.value })} placeholder="*.example-recipes.com/*" className="w-full rounded border border-primary bg-secondary px-3 py-2 font-mono text-sm text-primary placeholder:text-placeholder focus:outline-none focus:ring-1 focus:ring-accent" />
        </label>
        <p className="mt-1.5 text-xs text-tertiary">Use * as a wildcard. The most specific matching template is used.</p>
        <div className="mt-3 flex items-center gap-2 rounded bg-secondary p-3">
          <input value={testUrl} onChange={(event) => setTestUrl(event.target.value)} placeholder="Test a URL" className="min-w-0 flex-1 rounded border border-primary bg-primary px-3 py-2 text-sm text-primary placeholder:text-placeholder focus:outline-none focus:ring-1 focus:ring-accent" />
          {testMatches !== null && (
            <span className={`text-xs font-medium ${testMatches ? "text-green-600" : "text-error"}`}>
              {testMatches ? "Matches" : "Does not match"}
            </span>
          )}
        </div>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-primary">Default folder</span>
        <input value={draftSettings.folder} onChange={(event) => setDraftSettings({ ...draftSettings, folder: event.target.value })} placeholder="Recipes" className="w-full rounded border border-primary bg-secondary px-3 py-2 text-sm text-primary placeholder:text-placeholder focus:outline-none focus:ring-1 focus:ring-accent" />
      </label>

      <div>
        <h2 className="mb-2 text-sm font-medium text-primary">Content</h2>
        <p className="mb-3 text-xs text-tertiary">Build the note with {"{title}"}, {"{content}"}, {"{url}"}, and other available variables.</p>
        <textarea value={draftSettings.contentTemplate} onChange={(event) => setDraftSettings({ ...draftSettings, contentTemplate: event.target.value })} className="h-44 w-full resize-y rounded border border-primary bg-secondary px-3 py-2 font-mono text-xs text-primary focus:outline-none focus:ring-1 focus:ring-accent" />
      </div>

      <PropertiesSettings
        templateSettings={draftSettings}
        updateTemplateSettings={updateDraftSettings}
        availableVariables={AVAILABLE_VARIABLES}
      />
    </div>
  );
}

// Unified Template Editor
interface TemplateEditorProps {
  name: string;
  description: string;
  urlPatterns?: readonly RegExp[];
  availableVariables: readonly { key: string; description: string }[];
  templateSettings: TemplateSettings;
  updateTemplateSettings: (updates: Partial<TemplateSettings>) => Promise<void>;
}

function TemplateEditor({
  name,
  description,
  urlPatterns,
  availableVariables,
  templateSettings,
  updateTemplateSettings,
}: TemplateEditorProps) {
  const [localFolder, setLocalFolder] = useState(templateSettings.folder);
  const [hasChanges, setHasChanges] = useState(false);

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalFolder(value);
    setHasChanges(value !== templateSettings.folder);
  };

  const handleSaveFolder = () => {
    const trimmed = localFolder.trim();
    // Only save if there are changes and value is not empty
    if (!hasChanges || !trimmed) return;

    updateTemplateSettings({ folder: trimmed });
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      {/* Template Info */}
      <div>
        <h1 className="text-base font-semibold text-primary mb-1">{name}</h1>
        <p className="text-sm text-tertiary">{description}</p>
      </div>

      {/* URL Patterns (if provided) */}
      {urlPatterns && urlPatterns.length > 0 && (
        <div>
          <h3 className="text-base font-medium text-primary mb-2">URL Patterns</h3>
          <div className="space-y-1">
            {urlPatterns.map((pattern, idx) => (
              <div
                key={idx}
                className="text-xs font-mono bg-secondary px-3 py-2 rounded text-tertiary"
              >
                {pattern.toString()}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Folder Location */}
      <div>
        <h3 className="text-base font-medium text-primary mb-2">Default Folder</h3>
        <p className="text-sm text-tertiary mb-3">
          The folder path where clipped notes will be saved by default.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={localFolder}
            onChange={handleFolderChange}
            placeholder="e.g., Reading/Clippings"
            className="flex-1 px-3 py-2 text-sm bg-secondary border border-primary rounded text-primary placeholder:text-placeholder focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            onClick={handleSaveFolder}
            disabled={!hasChanges || !localFolder.trim()}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded transition-colors ${
              hasChanges && localFolder.trim()
                ? "bg-accent text-white hover:bg-accent/90"
                : "bg-tertiary text-placeholder cursor-not-allowed"
            }`}
            title={
              !localFolder.trim()
                ? "Folder cannot be empty"
                : hasChanges
                ? "Save changes"
                : "No changes to save"
            }
          >
            <Save size={14} />
            Save
          </button>
        </div>
      </div>

      {/* Properties Section */}
      <PropertiesSettings
        templateSettings={templateSettings}
        updateTemplateSettings={updateTemplateSettings}
        availableVariables={availableVariables}
      />

      {/* Content Template */}
      <div>
        <h3 className="text-base font-medium text-primary mb-2">Content Template</h3>
        <p className="text-sm text-tertiary mb-3">
          The markdown template used to generate note content. Use{" "}
          <code className="text-xs font-mono bg-secondary px-1 rounded">
            {"{{propertyName}}"}
          </code>{" "}
          placeholders or <code className="text-xs font-mono bg-secondary px-1 rounded">{"{content}"}</code> for the clipped content.
        </p>
        <textarea
          value={templateSettings.contentTemplate}
          onChange={(e) => updateTemplateSettings({ contentTemplate: e.target.value })}
          className="w-full h-48 px-3 py-2 text-xs font-mono bg-secondary border border-primary rounded text-primary resize-none focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="Template content..."
        />
      </div>
    </div>
  );
}

function WorkspacesSettings({ settings, updateSetting }: GeneralSettingsProps) {
  const workspaceName = settings.workspaces[0] || "";
  const [localWorkspaceName, setLocalWorkspaceName] = useState(workspaceName);
  const [hasChanges, setHasChanges] = useState(false);

  const handleWorkspaceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalWorkspaceName(value);
    setHasChanges(value !== workspaceName);
  };

  const handleSave = () => {
    const trimmed = localWorkspaceName.trim();
    // Only save if there are changes
    if (!hasChanges) return;

    updateSetting("workspaces", trimmed ? [trimmed] : []);
    setHasChanges(false);
  };

  return (
    <div>
      <h2 className="text-base font-medium text-primary mb-3">Workspace</h2>

      <div className="rounded-none bg-intermediate p-4 border border-primary space-y-4">
        <p className="text-sm text-tertiary">
          Clipped notes usually save to your current workspace. You can specify
          a workspace here if you want to ensure it saves there. The name must
          exactly match your Octarine workspace name.
        </p>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={localWorkspaceName}
            onChange={handleWorkspaceChange}
            placeholder="Enter workspace name..."
            className="flex-1 px-3 py-2 text-sm border border-primary rounded bg-primary text-primary placeholder:text-placeholder focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded transition-colors ${
              hasChanges
                ? "bg-accent text-white hover:bg-accent/90"
                : "bg-tertiary text-placeholder cursor-not-allowed"
            }`}
            title={hasChanges ? "Save changes" : "No changes to save"}
          >
            <Save size={14} />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// Property type icon component
function PropertyTypeIcon({ type }: { type: PropertyType }) {
  const iconProps = { size: 14, className: "text-tertiary" };
  switch (type) {
    case "string":
      return <Type {...iconProps} />;
    case "number":
      return <Hash {...iconProps} />;
    case "date":
      return <Calendar {...iconProps} />;
    case "datetime":
      return <Clock {...iconProps} />;
    case "checkbox":
      return <CheckSquare {...iconProps} />;
    case "list":
    case "tags":
      return <List {...iconProps} />;
    default:
      return <Type {...iconProps} />;
  }
}

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "string", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "datetime", label: "DateTime" },
  { value: "checkbox", label: "Checkbox" },
  { value: "list", label: "List" },
  { value: "tags", label: "Tags" },
];

interface PropertiesSettingsProps {
  templateSettings: TemplateSettings;
  updateTemplateSettings: (updates: Partial<TemplateSettings>) => Promise<void>;
  availableVariables: readonly { key: string; description: string }[];
}

function PropertiesSettings({ templateSettings, updateTemplateSettings, availableVariables }: PropertiesSettingsProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleToggleProperties = (enabled: boolean) => {
    updateTemplateSettings({ propertiesEnabled: enabled });
  };

  const handleUpdateProperty = (
    id: string,
    field: keyof PropertyDefinition,
    value: string | PropertyType,
  ) => {
    const updated = templateSettings.properties.map((prop) =>
      prop.id === id ? { ...prop, [field]: value } : prop,
    );
    updateTemplateSettings({ properties: updated });
  };

  const handleRemoveProperty = (id: string) => {
    updateTemplateSettings({
      properties: templateSettings.properties.filter((prop) => prop.id !== id),
    });
  };

  const handleAddProperty = () => {
    const newId = `prop-${Date.now()}`;
    const newProp: PropertyDefinition = {
      id: newId,
      name: "new_property",
      type: "string",
      value: "",
    };
    updateTemplateSettings({ properties: [...templateSettings.properties, newProp] });
  };

  const handleResetToDefaults = () => {
    updateTemplateSettings({ properties: DEFAULT_PROPERTIES });
  };

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      if (draggedIndex === null || draggedIndex === dropIndex) {
        setDraggedIndex(null);
        setDragOverIndex(null);
        return;
      }

      const newProperties = [...templateSettings.properties];
      const [removed] = newProperties.splice(draggedIndex, 1);
      newProperties.splice(dropIndex, 0, removed);

      updateTemplateSettings({ properties: newProperties });
      setDraggedIndex(null);
      setDragOverIndex(null);
    },
    [draggedIndex, templateSettings.properties, updateTemplateSettings],
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  return (
    <div>
      <h2 className="text-base font-medium text-primary mb-3">Properties</h2>

      <div className="rounded-none bg-intermediate p-4 border border-primary space-y-4">
        {/* Enable/Disable Toggle */}
        <SettingRow
          title="Auto-detect Properties"
          description="Extract metadata from pages and add as frontmatter properties"
        >
          <Switch.Root
            checked={templateSettings.propertiesEnabled}
            onCheckedChange={handleToggleProperties}
            className="w-11 h-6 bg-tertiary rounded-full relative data-[state=checked]:bg-accent outline-none cursor-pointer transition-colors"
          >
            <Switch.Thumb className="block w-5 h-5 bg-white rounded-full shadow-sm transition-transform translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px]" />
          </Switch.Root>
        </SettingRow>

        {templateSettings.propertiesEnabled && (
          <>
            {/* Description */}
            <p className="text-sm text-tertiary">
              Define properties to extract from pages. Use variables like{" "}
              <code className="text-xs font-mono bg-secondary px-1 py-0.5 rounded">
                {"{{title}}"}
              </code>{" "}
              or{" "}
              <code className="text-xs font-mono bg-secondary px-1 py-0.5 rounded">
                {"{{og:image}}"}
              </code>{" "}
              to auto-fill values. Drag to reorder.
            </p>

            {/* Available Variables */}
            <details className="text-sm">
              <summary className="text-sm text-tertiary cursor-pointer hover:text-secondary">
                Available variables
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-1">
                {availableVariables.map((v) => (
                  <div key={v.key} className="flex items-center gap-2">
                    <code className="text-xs font-mono bg-secondary px-1 py-0.5 rounded text-primary">
                      {v.key}
                    </code>
                    <span className="text-sm text-placeholder truncate">
                      {v.description}
                    </span>
                  </div>
                ))}
              </div>
            </details>

            {/* Property List */}
            <div className="space-y-2">
              {templateSettings.properties.map((prop, index) => (
                <div
                  key={prop.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-2 p-2 rounded bg-secondary border transition-all ${
                    dragOverIndex === index
                      ? "border-accent"
                      : "border-transparent"
                  } ${draggedIndex === index ? "opacity-50" : ""}`}
                >
                  {/* Drag Handle */}
                  <div className="cursor-grab active:cursor-grabbing text-placeholder hover:text-tertiary">
                    <GripVertical size={16} />
                  </div>

                  {/* Type Icon/Select */}
                  <Select.Root
                    value={prop.type}
                    onValueChange={(value) =>
                      handleUpdateProperty(
                        prop.id,
                        "type",
                        value as PropertyType,
                      )
                    }
                  >
                    <Select.Trigger className="p-1.5 rounded hover:bg-tertiary focus:outline-none focus:ring-1 focus:ring-accent">
                      <PropertyTypeIcon type={prop.type} />
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content
                        className="bg-secondary border border-primary rounded-lg shadow-xl overflow-hidden z-50"
                        position="popper"
                        sideOffset={4}
                      >
                        <Select.Viewport className="p-1">
                          {PROPERTY_TYPES.map((pt) => (
                            <Select.Item
                              key={pt.value}
                              value={pt.value}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-primary rounded cursor-pointer outline-none data-[highlighted]:bg-tertiary"
                            >
                              <PropertyTypeIcon type={pt.value} />
                              <Select.ItemText>{pt.label}</Select.ItemText>
                              <Select.ItemIndicator className="ml-auto">
                                <Check size={14} className="text-accent" />
                              </Select.ItemIndicator>
                            </Select.Item>
                          ))}
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>

                  {/* Name Input */}
                  <input
                    type="text"
                    value={prop.name}
                    onChange={(e) =>
                      handleUpdateProperty(prop.id, "name", e.target.value)
                    }
                    placeholder="name"
                    className="w-28 px-2 py-1 text-sm bg-primary border border-primary rounded text-primary placeholder:text-placeholder focus:outline-none focus:ring-1 focus:ring-accent"
                  />

                  {/* Value Input */}
                  <input
                    type="text"
                    value={prop.value}
                    onChange={(e) =>
                      handleUpdateProperty(prop.id, "value", e.target.value)
                    }
                    placeholder="{{variable}} or static value"
                    className="flex-1 px-2 py-1 text-[13px] bg-primary border border-primary rounded text-primary placeholder:text-placeholder focus:outline-none focus:ring-1 focus:ring-accent font-mono"
                  />

                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemoveProperty(prop.id)}
                    className="p-1.5 text-placeholder hover:text-primary hover:bg-tertiary rounded transition-colors"
                    title="Remove property"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleAddProperty}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-secondary hover:bg-tertiary rounded transition-colors text-primary"
              >
                <Plus size={14} />
                Add Property
              </button>
              <button
                onClick={handleResetToDefaults}
                className="px-3 py-1.5 text-sm text-tertiary hover:text-primary hover:bg-tertiary rounded transition-colors"
              >
                Reset to Defaults
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function GeneralSettings({ settings, updateSetting }: GeneralSettingsProps) {
  return (
    <div>
      <h2 className="text-base font-medium text-primary mb-3">Preferences</h2>

      <div className="rounded-none bg-intermediate p-4 border border-primary space-y-6">
        {/* Theme */}
        <SettingRow
          title="Theme"
          description="Choose the color scheme for the extension"
        >
          <Select.Root
            value={settings.themeMode}
            onValueChange={(value) =>
              updateSetting("themeMode", value as ThemeMode)
            }
          >
            <Select.Trigger className="inline-flex items-center justify-between min-w-[160px] gap-2 px-3 py-2 text-sm rounded-md bg-secondary text-primary hover:bg-tertiary focus:outline-none focus:ring-1 focus:ring-accent">
              <div className="flex items-center gap-2">
                {settings.themeMode === "system" && (
                  <Monitor size={14} className="text-tertiary" />
                )}
                {settings.themeMode === "light" && (
                  <Sun size={14} className="text-tertiary" />
                )}
                {settings.themeMode === "dark" && (
                  <Moon size={14} className="text-tertiary" />
                )}
                <Select.Value />
              </div>
              <Select.Icon>
                <ChevronDown size={14} className="text-placeholder" />
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content
                className="bg-secondary border border-primary rounded-lg shadow-xl overflow-hidden z-50"
                position="popper"
                sideOffset={4}
              >
                <Select.Viewport className="p-1">
                  <SelectItem value="system" icon={<Monitor size={14} />}>
                    System
                  </SelectItem>
                  <SelectItem value="light" icon={<Sun size={14} />}>
                    Light
                  </SelectItem>
                  <SelectItem value="dark" icon={<Moon size={14} />}>
                    Dark
                  </SelectItem>
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </SettingRow>

        {/* Save without opening */}
        <SettingRow
          title="Save Without Opening"
          description="Save clipped notes without creating a new tab in Octarine"
        >
          <Switch.Root
            checked={settings.saveWithoutOpening}
            onCheckedChange={(checked) =>
              updateSetting("saveWithoutOpening", checked)
            }
            className="w-11 h-6 bg-tertiary rounded-full relative data-[state=checked]:bg-accent outline-none cursor-pointer transition-colors"
          >
            <Switch.Thumb className="block w-5 h-5 bg-white rounded-full shadow-sm transition-transform translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px]" />
          </Switch.Root>
        </SettingRow>

        {/* Clip Mode */}
        <SettingRow
          title="Multi-Selection Clip Mode"
          description="Choose how to save when multiple text selections are highlighted"
        >
          <Select.Root
            value={settings.clipMode}
            onValueChange={(value) =>
              updateSetting("clipMode", value as ClipMode)
            }
          >
            <Select.Trigger className="inline-flex items-center justify-between min-w-[200px] gap-2 px-3 py-2 text-sm rounded-md bg-secondary text-primary hover:bg-tertiary focus:outline-none focus:ring-1 focus:ring-accent">
              <Select.Value />
              <Select.Icon>
                <ChevronDown size={14} className="text-placeholder" />
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content
                className="bg-secondary border border-primary rounded-lg shadow-xl overflow-hidden z-50"
                position="popper"
                sideOffset={4}
              >
                <Select.Viewport className="p-1">
                  <Select.Item
                    value="selections-only"
                    className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-primary rounded cursor-pointer outline-none data-[highlighted]:bg-tertiary"
                  >
                    <Select.ItemText>Selections only</Select.ItemText>
                    <Select.ItemIndicator>
                      <Check size={14} className="text-accent" />
                    </Select.ItemIndicator>
                  </Select.Item>
                  <Select.Item
                    value="full-page-with-highlights"
                    className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-primary rounded cursor-pointer outline-none data-[highlighted]:bg-tertiary"
                  >
                    <Select.ItemText>Full page with highlights</Select.ItemText>
                    <Select.ItemIndicator>
                      <Check size={14} className="text-accent" />
                    </Select.ItemIndicator>
                  </Select.Item>
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </SettingRow>
      </div>
    </div>
  );
}

function KbdShort({ keys }: { keys: string[] }) {
  return (
    <div className="flex items-center gap-0.5">
      {keys.map((key) => (
        <kbd
          key={key}
          className="inline-flex items-center justify-center rounded border border-primary bg-kbd px-1.5 py-0.5 font-[system-ui] text-xs text-secondary h-6 min-w-[24px]"
        >
          {key}
        </kbd>
      ))}
    </div>
  );
}

function HotkeysSettings() {
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  const openShortcutsPage = () => {
    const isFirefox = navigator.userAgent.toLowerCase().includes("firefox");
    if (isFirefox) {
      browser.tabs.create({ url: "about:addons" });
    } else {
      browser.tabs.create({ url: "chrome://extensions/shortcuts" });
    }
  };

  // Parse shortcut string into array of keys
  const parseShortcut = (shortcut: string): string[] => {
    return shortcut.split(" ").filter((key) => key.length > 0);
  };

  return (
    <div>
      <h2 className="text-base font-medium text-primary mb-3">
        Keyboard Shortcuts
      </h2>

      <div className="rounded-none bg-intermediate p-4 border border-primary space-y-6">
        <p className="text-sm text-tertiary">
          Keyboard shortcuts give you quick access to clipper features. To
          change key assignments, go to{" "}
          <button
            onClick={openShortcutsPage}
            className="text-accent hover:underline"
          >
            chrome://extensions/shortcuts
          </button>
        </p>

        {KEYBOARD_SHORTCUTS.map((shortcut) => (
          <div
            key={shortcut.action}
            className="flex items-center justify-between"
          >
            <span className="text-sm text-primary">{shortcut.description}</span>
            <KbdShort
              keys={parseShortcut(
                isMac ? shortcut.macShortcut : shortcut.otherShortcut,
              )}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function AboutSettings() {
  const version = browser.runtime.getManifest?.()?.version || "1.0.0";

  return (
    <div>
      <h2 className="text-base font-medium text-primary mb-3">About</h2>

      <div className="rounded-none bg-intermediate border border-primary p-4 space-y-6">
        <SettingRow
          title={`Version ${version}`}
          description="You are using the latest version"
        />

        <SettingRow
          title="Documentation"
          description="Learn how to use Octarine Clipper"
        >
          <a
            href="https://github.com/rajatkulkarni95/octarine-extension/blob/master/USER_GUIDE.md"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 text-sm rounded-md bg-secondary text-primary hover:bg-tertiary transition-colors"
          >
            Open
          </a>
        </SettingRow>
      </div>
    </div>
  );
}

interface SettingRowProps {
  title: string;
  description: string;
  children?: React.ReactNode;
}

function SettingRow({ title, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex-1 pr-6">
        <p className="text-sm font-medium text-primary">{title}</p>
        <p className="text-sm text-tertiary mt-0.5">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

interface SelectItemProps {
  value: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

function SelectItem({ value, icon, children }: SelectItemProps) {
  return (
    <Select.Item
      value={value}
      className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-primary rounded cursor-pointer outline-none data-[highlighted]:bg-tertiary"
    >
      <div className="flex items-center gap-2">
        {icon && <span className="text-tertiary">{icon}</span>}
        <Select.ItemText>{children}</Select.ItemText>
      </div>
      <Select.ItemIndicator>
        <Check size={14} className="text-accent" />
      </Select.ItemIndicator>
    </Select.Item>
  );
}
