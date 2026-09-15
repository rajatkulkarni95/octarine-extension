interface FileNameInputProps {
  fileName: string;
  onChange: (fileName: string) => void;
}

export default function FileNameInput({
  fileName,
  onChange,
}: FileNameInputProps) {
  return (
    <div className="px-3 pt-2 pb-1.5">
      <label htmlFor="clip-title" className="mb-1 block text-[11px] font-medium text-tertiary">
        Title
      </label>
      <div className="min-w-0 flex-1">
        <input
          id="clip-title"
          type="text"
          value={fileName}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter filename..."
          className="w-full rounded border border-faded bg-intermediate px-2 py-1.5 text-[13px] font-medium text-primary placeholder:text-placeholder hover:border-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
    </div>
  );
}
