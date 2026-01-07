import { useState, useEffect } from "react";
import {
  Settings,
  Keyboard,
  Moon,
  Sun,
  Monitor,
  ChevronDown,
  Info,
  Check,
} from "lucide-react";
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

type SettingsSection = "general" | "hotkeys" | "about";

export default function SettingsApp() {
  const [settings, setSettings] = useState<SettingsType>(DEFAULT_SETTINGS);
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("general");
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
    value: SettingsType[K]
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
        <div className="animate-pulse text-placeholder">Loading settings...</div>
      </div>
    );
  }

  const navItems: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
    { id: "general", label: "General", icon: <Settings size={16} /> },
    { id: "hotkeys", label: "Hotkeys", icon: <Keyboard size={16} /> },
    { id: "about", label: "About", icon: <Info size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-8">
      <div className="w-full max-w-[700px] bg-primary border border-primary rounded-xl shadow-lg overflow-hidden">
        <div className="flex">
          {/* Sidebar */}
          <aside className="flex h-full w-48 flex-shrink-0 flex-col border-r border-primary bg-intermediate px-2 py-4">
            <div className="flex flex-col gap-px">
              <span className="mx-1.5 mb-2 text-xs font-medium text-tertiary">
                Settings
              </span>

              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`group flex select-none items-center gap-2 rounded-md border-none bg-transparent py-1 px-1.5 text-left text-sm font-normal text-secondary hover:bg-secondary hover:text-primary ${
                    activeSection === item.id ? "bg-secondary text-primary" : ""
                  }`}
                >
                  <span className="text-tertiary">{item.icon}</span>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto max-h-[600px]">
            <div className="p-6">
              {activeSection === "general" && (
                <GeneralSettings settings={settings} updateSetting={updateSetting} />
              )}
              {activeSection === "hotkeys" && <HotkeysSettings />}
              {activeSection === "about" && <AboutSettings />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

interface GeneralSettingsProps {
  settings: SettingsType;
  updateSetting: <K extends keyof SettingsType>(
    key: K,
    value: SettingsType[K]
  ) => Promise<void>;
}

function GeneralSettings({ settings, updateSetting }: GeneralSettingsProps) {
  return (
    <div>
      <h2 className="text-sm font-medium text-primary mb-3">Preferences</h2>

      <div className="border-l border-secondary pl-4 space-y-6">
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
                {settings.themeMode === "system" && <Monitor size={14} className="text-tertiary" />}
                {settings.themeMode === "light" && <Sun size={14} className="text-tertiary" />}
                {settings.themeMode === "dark" && <Moon size={14} className="text-tertiary" />}
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
          description="Save clipped notes without switching to Octarine app"
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

function HotkeysSettings() {
  const openShortcutsPage = () => {
    const isFirefox = navigator.userAgent.toLowerCase().includes("firefox");
    if (isFirefox) {
      browser.tabs.create({ url: "about:addons" });
    } else {
      browser.tabs.create({ url: "chrome://extensions/shortcuts" });
    }
  };

  return (
    <div>
      <h2 className="text-sm font-medium text-primary mb-3">Keyboard Shortcuts</h2>

      <div className="border-l border-secondary pl-4 space-y-6">
        <p className="text-sm text-tertiary">
          Keyboard shortcuts give you quick access to clipper features. To change
          key assignments, go to{" "}
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
            <kbd className="px-3 py-2 text-sm bg-secondary rounded-md text-primary min-w-[120px] text-center">
              {shortcut.shortcut}
            </kbd>
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

      <div className="border-l border-secondary pl-4 space-y-6">
        <SettingRow
          title={`Version ${version}`}
          description="You are using the latest version"
        >
          <a
            href="https://github.com/AnomalyInnovations/octarine-extension/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 text-sm rounded-md bg-secondary text-primary hover:bg-tertiary transition-colors"
          >
            Changelog
          </a>
        </SettingRow>

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

        <SettingRow
          title="Support"
          description="Get help and report issues"
        >
          <a
            href="https://octarine.app/support"
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
  children: React.ReactNode;
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
