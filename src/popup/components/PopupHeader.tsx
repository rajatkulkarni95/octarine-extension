import { Settings as SettingsIcon } from "lucide-react";
import OctarineTooltip from "../../components/OctarineTooltip";
import browser from "webextension-polyfill";

export default function PopupHeader() {
  const openSettings = () => {
    const settingsUrl = browser.runtime.getURL("settings.html");
    browser.tabs.create({ url: settingsUrl });
  };

  return (
    <div className="flex items-center justify-between px-2 pb-4">
      <img src="/icons/favicon.svg" alt="Octarine" className="w-5 h-5" />
      <div className="flex items-center gap-1">
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
