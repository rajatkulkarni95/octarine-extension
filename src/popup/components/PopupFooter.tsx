interface PopupFooterProps {
  basePath: string;
  onBasePathChange: (path: string) => void;
  onClip: () => void;
}

export default function PopupFooter({
  basePath,
  onBasePathChange,
  onClip,
}: PopupFooterProps) {
  return (
    <div className="shrink-0 bg-intermediate flex flex-col gap-2 border-t p-2 mt-auto border-primary">
      <div className="flex-1">
        <input
          type="text"
          value={basePath}
          onChange={(e) => onBasePathChange(e.target.value)}
          placeholder="inbox/web-clips"
          className="w-full text-[13px] px-2 py-1.5 border border-primary rounded bg-primary text-primary placeholder:text-placeholder focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={onClip}
          className="flex-1 py-1.5 px-4 text-[13px] bg-accent-lite text-accent border border-transparent hover:bg-accent hover:text-white font-medium rounded disabled:bg-tertiary disabled:text-placeholder disabled:cursor-not-allowed transition-opacity"
        >
          Save to Octarine
        </button>
      </div>
    </div>
  );
}
