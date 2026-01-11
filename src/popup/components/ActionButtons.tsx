import { FileText, Bookmark, Layers, Edit3 } from "lucide-react";
import OctarineTooltip from "../../components/OctarineTooltip";

interface ActionButtonsProps {
  onClip: () => void;
  onSaveBookmark: () => void;
  onSaveAllTabs: () => void;
  clipDestination: string;
  bookmarkDestination: string;
  dailyDestination: string;
  onEditClipDestination: () => void;
  onEditBookmarkDestination: () => void;
  onEditDailyDestination: () => void;
  savingTabs?: boolean;
}

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  shortcut: string;
  destination: string;
  onAction: () => void;
  onEditDestination: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}

function ActionButton({
  icon,
  label,
  shortcut,
  destination,
  onAction,
  onEditDestination,
  disabled = false,
  variant = "secondary",
}: ActionButtonProps) {
  const isPrimary = variant === "primary";

  return (
    <div className="space-y-1">
      <button
        onClick={onAction}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          isPrimary
            ? "bg-accent text-white hover:bg-accent/90 font-medium"
            : "bg-secondary text-secondary hover:bg-tertiary border border-primary"
        }`}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span>{label}</span>
        </div>
        <span className="text-xs opacity-70 font-mono">{shortcut}</span>
      </button>
      <div className="flex items-center gap-1 px-2 text-[11px] text-placeholder">
        <span>Saving to {destination}</span>
        <OctarineTooltip tooltip="Change destination">
          <button
            onClick={onEditDestination}
            className="p-0.5 hover:text-secondary transition-colors"
          >
            <Edit3 className="w-3 h-3" />
          </button>
        </OctarineTooltip>
      </div>
    </div>
  );
}

export default function ActionButtons({
  onClip,
  onSaveBookmark,
  onSaveAllTabs,
  clipDestination,
  bookmarkDestination,
  dailyDestination,
  onEditClipDestination,
  onEditBookmarkDestination,
  onEditDailyDestination,
  savingTabs = false,
}: ActionButtonsProps) {
  return (
    <div className="px-2 pt-3 space-y-2">
      <ActionButton
        icon={<FileText className="w-4 h-4" />}
        label="Save to Octarine"
        shortcut="⌘D"
        destination={clipDestination}
        onAction={onClip}
        onEditDestination={onEditClipDestination}
        variant="primary"
      />

      <ActionButton
        icon={<Bookmark className="w-4 h-4" />}
        label="Save URL to Bookmarks"
        shortcut="⌘B"
        destination={bookmarkDestination}
        onAction={onSaveBookmark}
        onEditDestination={onEditBookmarkDestination}
      />

      <ActionButton
        icon={<Layers className="w-4 h-4" />}
        label="Save all tabs to Today"
        shortcut="⌘⇧D"
        destination={dailyDestination}
        onAction={onSaveAllTabs}
        onEditDestination={onEditDailyDestination}
        disabled={savingTabs}
      />
    </div>
  );
}
