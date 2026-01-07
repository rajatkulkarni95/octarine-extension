import { X } from "lucide-react";
import OctarineTooltip from "../../components/OctarineTooltip";

interface SelectionIndicatorProps {
  count: number;
  onClear: () => void;
}

export default function SelectionIndicator({
  count,
  onClear,
}: SelectionIndicatorProps) {
  if (count === 0) return null;

  return (
    <div className="mx-2 mt-2 px-2 py-1.5 rounded bg-accent-lite flex items-center justify-between">
      <span className="text-xs text-accent font-medium">
        Selection ({count})
      </span>
      <OctarineTooltip tooltip="Clear selections and show full page">
        <button
          onClick={onClear}
          className="p-0.5 text-accent hover:text-accent/70 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </OctarineTooltip>
    </div>
  );
}
