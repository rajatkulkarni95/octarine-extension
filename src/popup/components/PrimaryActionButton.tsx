import { useState, useEffect } from "react";
import { FileText, Copy, Check } from "lucide-react";

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
    <div className="flex gap-1.5">
      <button
        onClick={onClip}
        className="flex flex-1 items-center justify-between gap-2 rounded-md border border-transparent bg-accent px-3 py-2 text-[13px] font-medium text-white hover:brightness-110"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5" />
          <span>Save to Octarine</span>
        </div>
        <span className="text-[11px] font-normal text-white/70">⌥⇧C</span>
      </button>

      <button
        onClick={handleCopy}
        disabled={!content}
        className={`flex w-9 items-center justify-center rounded-md border transition-colors ${
          copied
            ? "border-green-500 bg-green-500 text-white"
            : "border-faded bg-secondary text-icon hover:border-primary hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
        }`}
        title={copied ? "Copied!" : "Copy content to clipboard"}
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
