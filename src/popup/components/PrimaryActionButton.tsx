import { FileText } from "lucide-react";
import KbdShortcut from "./KbdShortcut";

interface PrimaryActionButtonProps {
  onClip: () => void;
}

export default function PrimaryActionButton({
  onClip,
}: PrimaryActionButtonProps) {
  return (
    <div className="px-2 pb-1">
      <button
        onClick={onClip}
        className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-sm rounded transition-colors bg-accent text-white hover:bg-accent/90 font-medium"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5" />
          <span>Save to Octarine</span>
        </div>
        <KbdShortcut keys={["⌥", "⇧", "C"]} />
      </button>
    </div>
  );
}
