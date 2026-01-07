import { Layers, Settings as SettingsIcon } from "lucide-react";
import OctarineTooltip from "../../components/OctarineTooltip";
import browser from "webextension-polyfill";

interface PopupHeaderProps {
  onSaveAllTabs: () => void;
  savingTabs: boolean;
}

export default function PopupHeader({
  onSaveAllTabs,
  savingTabs,
}: PopupHeaderProps) {
  const openSettings = () => {
    const settingsUrl = browser.runtime.getURL("settings.html");
    browser.tabs.create({ url: settingsUrl });
  };

  return (
    <div className="flex items-center justify-between px-2 mb-1">
      <img src="/icons/favicon.svg" alt="Octarine" className="w-5 h-5" />
      <div className="flex items-center gap-1">
        <OctarineTooltip tooltip="Save all open tabs to today's daily note">
          <button
            onClick={onSaveAllTabs}
            disabled={savingTabs}
            className="p-1 text-tertiary hover:text-primary hover:bg-secondary rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Layers size={16} />
          </button>
        </OctarineTooltip>
        <OctarineTooltip tooltip="Settings">
          <button
            onClick={openSettings}
            className="p-1 text-tertiary hover:text-primary hover:bg-secondary rounded transition-colors"
          >
            <SettingsIcon size={16} />
          </button>
        </OctarineTooltip>
      </div>
    </div>
  );
}
