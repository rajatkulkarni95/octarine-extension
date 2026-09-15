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
  selectedTemplate: string;
  templates: Array<{ id: string; name: string }>;
  onTemplateChange: (templateId: string) => void;
  onSaveBookmark?: () => void;
  onSaveAllTabs?: () => void;
  savingTabs?: boolean;
}

export default function TemplateSelector({
  selectedTemplate,
  templates,
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
    <header className="flex h-10 flex-shrink-0 items-center gap-2 border-b border-faded bg-intermediate px-2">
      <div className="flex min-w-0 items-center gap-1.5">
        <img src="/icons/icon32.png" alt="" className="h-4 w-4" />
        <span className="whitespace-nowrap text-[13px] font-medium text-primary">
          Web Clipper
        </span>
      </div>
      <Select.Root value={selectedTemplate} onValueChange={onTemplateChange}>
        <Select.Trigger className="ml-auto flex h-7 w-28 items-center justify-between gap-1 rounded border border-faded bg-primary px-2 text-[12px] text-secondary hover:border-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-accent">
          <Select.Value />
          <Select.Icon>
            <ChevronDown className="w-3.5 h-3.5 text-placeholder" />
          </Select.Icon>
        </Select.Trigger>

        <Select.Portal>
          <Select.Content className="overflow-hidden rounded-md border border-faded bg-primary shadow-lg">
            <Select.Viewport className="p-1">
              {templates.map((template) => (
                <Select.Item
                  key={template.id}
                  value={template.id}
                  className="relative flex cursor-pointer select-none items-center gap-2 rounded px-2 py-1.5 text-[12px] text-secondary outline-none hover:bg-hover focus:bg-hover"
                >
                  <Select.ItemIndicator className="w-4 h-4 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </Select.ItemIndicator>
                  <Select.ItemText className="ml-4">
                    {template.name}
                  </Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>

      <div className="flex items-center gap-0.5">
        <OctarineTooltip tooltip="Start multi-highlight mode (⌥⇧S to add)">
          <button
            onClick={startMultiHighlight}
            className="flex h-7 w-7 items-center justify-center rounded bg-transparent text-icon hover:bg-hover"
            aria-label="Start multi-highlight mode"
          >
            <Highlighter size={15} strokeWidth={1.5} />
          </button>
        </OctarineTooltip>

        {onSaveBookmark && (
          <OctarineTooltip tooltip="Save URL as bookmark (⌥⇧T)">
            <button
              onClick={onSaveBookmark}
              className="flex h-7 w-7 items-center justify-center rounded bg-transparent text-icon hover:bg-hover"
              aria-label="Save URL as bookmark"
            >
              <Bookmark size={15} strokeWidth={1.5} />
            </button>
          </OctarineTooltip>
        )}

        {onSaveAllTabs && (
          <OctarineTooltip tooltip="Save all tabs">
            <button
              onClick={onSaveAllTabs}
              disabled={savingTabs}
              className="flex h-7 w-7 items-center justify-center rounded bg-transparent text-icon hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Save all tabs"
            >
              <Folders size={15} strokeWidth={1.5} />
            </button>
          </OctarineTooltip>
        )}

        <OctarineTooltip tooltip="Settings">
          <button
            onClick={openSettings}
            className="flex h-7 w-7 items-center justify-center rounded bg-transparent text-icon hover:bg-hover"
            aria-label="Open settings"
          >
            <SettingsIcon size={15} strokeWidth={1.5} />
          </button>
        </OctarineTooltip>
      </div>
    </header>
  );
}
