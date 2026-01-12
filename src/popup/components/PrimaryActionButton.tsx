import { useState, useEffect } from "react";
import { FileText, Copy, Check } from "lucide-react";
import KbdShortcut from "./KbdShortcut";

interface PrimaryActionButtonProps {
  onClip: () => void;
  content?: string;
}

export default function PrimaryActionButton({
  onClip,
  content,
}: PrimaryActionButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => {
        setCopied(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopy = async () => {
    if (!content) return;

    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  return (
    <div className="px-2 pb-1 flex gap-1">
      <button
        onClick={onClip}
        className="flex-1 flex items-center justify-between gap-2 px-3 py-1.5 text-sm rounded transition-colors bg-accent text-white hover:bg-accent/90 font-medium"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5" />
          <span>Save to Octarine</span>
        </div>
        <KbdShortcut keys={["⌥", "⇧", "C"]} />
      </button>

      <button
        onClick={handleCopy}
        disabled={!content}
        className={`flex items-center justify-center p-1.5 rounded transition-colors ${
          copied
            ? "bg-green-500 text-white"
            : "bg-secondary text-secondary hover:bg-tertiary border border-primary disabled:opacity-50 disabled:cursor-not-allowed"
        }`}
        title={copied ? "Copied!" : "Copy content to clipboard"}
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
