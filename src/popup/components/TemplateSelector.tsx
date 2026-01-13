import * as Select from "@radix-ui/react-select";
import {
  ChevronDown,
  Check,
  Settings as SettingsIcon,
  Bookmark,
  Folders,
  Highlighter,
} from "lucide-react";
import OctarineTooltip from "../../components/OctarineTooltip";
import browser from "webextension-polyfill";

interface TemplateSelectorProps {
  selectedTemplate: "default" | "github-pr" | "github-issues";
  onTemplateChange: (
    templateId: "default" | "github-pr" | "github-issues",
  ) => void;
  onSaveBookmark?: () => void;
  onSaveAllTabs?: () => void;
  savingTabs?: boolean;
}

const TEMPLATE_NAMES: Record<
  "default" | "github-pr" | "github-issues",
  string
> = {
  default: "Default",
  "github-pr": "GitHub PR",
  "github-issues": "GitHub Issues",
};

export default function TemplateSelector({
  selectedTemplate,
  onTemplateChange,
  onSaveBookmark,
  onSaveAllTabs,
  savingTabs,
}: TemplateSelectorProps) {
  const openSettings = () => {
    const settingsUrl = browser.runtime.getURL("settings.html");
    browser.tabs.create({ url: settingsUrl });
  };

  const startMultiHighlight = async () => {
    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab?.id) return;

      // Send message to content script to show instructions
      await browser.tabs.sendMessage(tab.id, {
        action: "START_MULTI_HIGHLIGHT",
      });

      // Close popup so user can start selecting
      window.close();
    } catch (err) {
      console.error("[Octarine] Failed to start multi-highlight:", err);
    }
  };

  return (
    <div className="px-2 pb-1 flex items-center gap-2">
      <Select.Root value={selectedTemplate} onValueChange={onTemplateChange}>
        <Select.Trigger className="flex-1 flex items-center justify-between gap-2 text-[13px] px-2 py-1 border border-primary hover:border-secondary focus:border-accent rounded bg-primary text-secondary focus:outline-none">
          <Select.Value />
          <Select.Icon>
            <ChevronDown className="w-3.5 h-3.5 text-placeholder" />
          </Select.Icon>
        </Select.Trigger>

        <Select.Portal>
          <Select.Content className="overflow-hidden bg-primary border border-primary rounded shadow-lg">
            <Select.Viewport className="p-1">
              {(
                Object.keys(TEMPLATE_NAMES) as Array<
                  "default" | "github-pr" | "github-issues"
                >
              ).map((templateId) => (
                <Select.Item
                  key={templateId}
                  value={templateId}
                  className="relative flex items-center gap-2 px-2 py-1.5 text-[13px] text-secondary rounded cursor-pointer hover:bg-secondary focus:bg-secondary outline-none select-none"
                >
                  <Select.ItemIndicator className="w-4 h-4 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </Select.ItemIndicator>
                  <Select.ItemText className="ml-4">
                    {TEMPLATE_NAMES[templateId]}
                  </Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>

      <div className="flex items-center gap-1">
        <OctarineTooltip tooltip="Start multi-highlight mode (⌥⇧S to add)">
          <button
            onClick={startMultiHighlight}
            className="p-1.5 text-yellow-500 bg-yellow-500/20 hover:bg-yellow-500/30 rounded transition-colors"
          >
            <Highlighter size={16} />
          </button>
        </OctarineTooltip>

        {onSaveBookmark && (
          <OctarineTooltip tooltip="Save URL as bookmark (⌥⇧T)">
            <button
              onClick={onSaveBookmark}
              className="p-1.5 text-blue-500 bg-blue-500/20 hover:bg-blue-500/30 rounded transition-colors"
            >
              <Bookmark size={16} />
            </button>
          </OctarineTooltip>
        )}

        {onSaveAllTabs && (
          <OctarineTooltip tooltip="Save all tabs">
            <button
              onClick={onSaveAllTabs}
              disabled={savingTabs}
              className="p-1.5 text-amber-500 bg-amber-500/20 hover:bg-amber-500/30 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Folders size={16} />
            </button>
          </OctarineTooltip>
        )}

        <OctarineTooltip tooltip="Settings">
          <button
            onClick={openSettings}
            className="p-1.5 text-tertiary hover:text-primary hover:bg-secondary rounded transition-colors"
          >
            <SettingsIcon size={16} />
          </button>
        </OctarineTooltip>
      </div>
    </div>
  );
}
