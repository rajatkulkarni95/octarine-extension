import { FileText, Edit3 } from "lucide-react";
import OctarineTooltip from "../../components/OctarineTooltip";

interface PrimaryActionButtonProps {
  onClip: () => void;
  destination: string;
  onEditDestination: () => void;
}

export default function PrimaryActionButton({
  onClip,
  destination,
  onEditDestination,
}: PrimaryActionButtonProps) {
  return (
    <div className="px-2 pb-3 space-y-1">
      <button
        onClick={onClip}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm rounded transition-colors bg-accent text-white hover:bg-accent/90 font-medium"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          <span>Save to Octarine</span>
        </div>
        <span className="text-xs opacity-70 font-mono">⌘D</span>
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
