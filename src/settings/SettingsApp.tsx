import { useState, useEffect, useCallback } from "react";
import {
  Moon,
  Sun,
  Monitor,
  ChevronDown,
  Check,
  X,
  GripVertical,
  Plus,
  Type,
  Hash,
  Calendar,
  Clock,
  CheckSquare,
  Link,
  List,
} from "lucide-react";
import * as Switch from "@radix-ui/react-switch";
import * as Select from "@radix-ui/react-select";
import browser from "webextension-polyfill";
import type {
  Settings as SettingsType,
  ThemeMode,
  PropertyDefinition,
  PropertyType,
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

export default function SettingsApp() {
  const [settings, setSettings] = useState<SettingsType>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

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
      <div className="w-[600px] h-[80vh] bg-primary border border-primary rounded-xl shadow-lg overflow-hidden flex flex-col">
        <main className="flex-1 overflow-y-auto p-6 space-y-8">
          <WorkspacesSettings
            settings={settings}
            updateSetting={updateSetting}
          />
          <PropertiesSettings
            settings={settings}
            updateSetting={updateSetting}
          />
          <GeneralSettings settings={settings} updateSetting={updateSetting} />
          <HotkeysSettings />
          <AboutSettings />
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

function WorkspacesSettings({ settings, updateSetting }: GeneralSettingsProps) {
  const workspaceName = settings.workspaces[0] || "";

  const handleWorkspaceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    updateSetting("workspaces", value ? [value] : []);
  };

  return (
    <div>
      <h2 className="text-sm font-medium text-primary mb-3">Workspace</h2>

      <div className="rounded-none bg-intermediate p-4 border border-primary space-y-4">
        <p className="text-sm text-tertiary">
          Clipped notes usually save to your current workspace. You can specify
          a workspace here if you want to ensure it saves there. The name must
          exactly match your Octarine workspace name.
        </p>

        <input
          type="text"
          value={workspaceName}
          onChange={handleWorkspaceChange}
          placeholder="Enter workspace name..."
          className="w-full px-3 py-2 text-sm border border-primary rounded bg-primary text-primary placeholder:text-placeholder focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
    </div>
  );
}

// Property type icon component
function PropertyTypeIcon({ type }: { type: PropertyType }) {
  const iconProps = { size: 14, className: "text-tertiary" };
  switch (type) {
    case "text":
      return <Type {...iconProps} />;
    case "number":
      return <Hash {...iconProps} />;
    case "date":
      return <Calendar {...iconProps} />;
    case "datetime":
      return <Clock {...iconProps} />;
    case "checkbox":
      return <CheckSquare {...iconProps} />;
    case "url":
      return <Link {...iconProps} />;
    case "list":
      return <List {...iconProps} />;
    default:
      return <Type {...iconProps} />;
  }
}

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "datetime", label: "DateTime" },
  { value: "checkbox", label: "Checkbox" },
  { value: "url", label: "URL" },
  { value: "list", label: "List" },
];

function PropertiesSettings({ settings, updateSetting }: GeneralSettingsProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleToggleProperties = (enabled: boolean) => {
    updateSetting("propertiesEnabled", enabled);
  };

  const handleUpdateProperty = (
    id: string,
    field: keyof PropertyDefinition,
    value: string | PropertyType,
  ) => {
    const updated = settings.properties.map((prop) =>
      prop.id === id ? { ...prop, [field]: value } : prop,
    );
    updateSetting("properties", updated);
  };

  const handleRemoveProperty = (id: string) => {
    updateSetting(
      "properties",
      settings.properties.filter((prop) => prop.id !== id),
    );
  };

  const handleAddProperty = () => {
    const newId = `prop-${Date.now()}`;
    const newProp: PropertyDefinition = {
      id: newId,
      name: "new_property",
      type: "text",
      value: "",
    };
    updateSetting("properties", [...settings.properties, newProp]);
  };

  const handleResetToDefaults = () => {
    updateSetting("properties", DEFAULT_PROPERTIES);
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

      const newProperties = [...settings.properties];
      const [removed] = newProperties.splice(draggedIndex, 1);
      newProperties.splice(dropIndex, 0, removed);

      updateSetting("properties", newProperties);
      setDraggedIndex(null);
      setDragOverIndex(null);
    },
    [draggedIndex, settings.properties, updateSetting],
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  return (
    <div>
      <h2 className="text-sm font-medium text-primary mb-3">Properties</h2>

      <div className="rounded-none bg-intermediate p-4 border border-primary space-y-4">
        {/* Enable/Disable Toggle */}
        <SettingRow
          title="Auto-detect Properties"
          description="Extract metadata from pages and add as frontmatter properties"
        >
          <Switch.Root
            checked={settings.propertiesEnabled}
            onCheckedChange={handleToggleProperties}
            className="w-11 h-6 bg-tertiary rounded-full relative data-[state=checked]:bg-accent outline-none cursor-pointer transition-colors"
          >
            <Switch.Thumb className="block w-5 h-5 bg-white rounded-full shadow-sm transition-transform translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px]" />
          </Switch.Root>
        </SettingRow>

        {settings.propertiesEnabled && (
          <>
            {/* Description */}
            <p className="text-sm text-tertiary">
              Define properties to extract from pages. Use variables like{" "}
              <code className="text-xs bg-secondary px-1 py-0.5 rounded">
                {"{{title}}"}
              </code>{" "}
              or{" "}
              <code className="text-xs bg-secondary px-1 py-0.5 rounded">
                {"{{og:image}}"}
              </code>{" "}
              to auto-fill values. Drag to reorder.
            </p>

            {/* Available Variables */}
            <details className="text-sm">
              <summary className="text-tertiary cursor-pointer hover:text-secondary">
                Available variables
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                {AVAILABLE_VARIABLES.map((v) => (
                  <div key={v.key} className="flex items-center gap-2">
                    <code className="bg-secondary px-1 py-0.5 rounded text-primary">
                      {v.key}
                    </code>
                    <span className="text-placeholder truncate">
                      {v.description}
                    </span>
                  </div>
                ))}
              </div>
            </details>

            {/* Property List */}
            <div className="space-y-2">
              {settings.properties.map((prop, index) => (
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
      <h2 className="text-sm font-medium text-primary mb-3">Preferences</h2>

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

        {/* Default Path */}
        <SettingRow
          title="Default Save Path"
          description="Path where clipped notes will be saved"
        >
          <div className="flex items-center gap-2 min-w-[180px]">
            <input
              type="text"
              value={settings.defaultBasePath}
              onChange={(e) => updateSetting("defaultBasePath", e.target.value)}
              placeholder="inbox/web-clips"
              className="w-full px-3 py-2 text-sm rounded-md bg-secondary text-primary placeholder:text-placeholder focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
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
      <h2 className="text-sm font-medium text-primary mb-3">
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
      <h2 className="text-sm font-medium text-primary mb-3">About</h2>

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
            href="https://octarine.app/docs"
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
