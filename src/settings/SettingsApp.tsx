import { useState, useEffect } from "react";
import { Moon, Sun, Monitor, ChevronDown, Check, X } from "lucide-react";
import * as Switch from "@radix-ui/react-switch";
import * as Select from "@radix-ui/react-select";
import browser from "webextension-polyfill";
import type { Settings as SettingsType, ThemeMode } from "../types/settings";
import { KEYBOARD_SHORTCUTS, DEFAULT_SETTINGS } from "../types/settings";
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
  const [inputValue, setInputValue] = useState("");

  const handleAddWorkspace = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !settings.workspaces.includes(trimmed)) {
      updateSetting("workspaces", [...settings.workspaces, trimmed]);
      setInputValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddWorkspace();
    }
  };

  const handleRemoveWorkspace = (workspace: string) => {
    updateSetting(
      "workspaces",
      settings.workspaces.filter((w) => w !== workspace),
    );
  };

  return (
    <div>
      <h2 className="text-sm font-medium text-primary mb-3">Workspaces</h2>

      <div className="rounded-none bg-intermediate p-4 border border-primary space-y-4">
        <p className="text-sm text-tertiary">
          Clipped notes usually save to your current workspace. You can specify
          a workspace here if you want to ensure it saves there. The name must
          exactly match your Octarine workspace name. Press Enter to add.
        </p>

        <div className="space-y-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter workspace name..."
            className="w-full px-3 py-2 text-sm border border-primary rounded bg-primary text-primary placeholder:text-placeholder focus:outline-none focus:ring-1 focus:ring-accent"
          />

          {settings.workspaces.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {settings.workspaces.map((workspace) => (
                <span
                  key={workspace}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-sm bg-secondary rounded-md text-primary"
                >
                  {workspace}
                  <button
                    onClick={() => handleRemoveWorkspace(workspace)}
                    className="text-tertiary hover:text-primary transition-colors"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
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
