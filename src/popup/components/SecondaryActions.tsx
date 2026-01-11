import { Bookmark, Layers } from "lucide-react";
import KbdShortcut from "./KbdShortcut";

interface SecondaryActionsProps {
  onSaveBookmark: () => void;
  onSaveAllTabs: () => void;
  savingTabs?: boolean;
}

export default function SecondaryActions({
  onSaveBookmark,
  onSaveAllTabs,
  savingTabs = false,
}: SecondaryActionsProps) {
  return (
    <div className="p-2 space-y-1 mt-auto border-t bg-intermediate border-primary">
      <button
        onClick={onSaveBookmark}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded transition-colors bg-secondary text-secondary hover:bg-tertiary border border-primary"
      >
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4" />
          <span>Save URL to Bookmarks</span>
        </div>
        <KbdShortcut keys={["⌥", "⇧", "T"]} />
      </button>

      <button
        onClick={onSaveAllTabs}
        disabled={savingTabs}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded transition-colors bg-secondary text-secondary hover:bg-tertiary border border-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4" />
          <span>Save all tabs to Today</span>
        </div>
      </button>
    </div>
  );
}
