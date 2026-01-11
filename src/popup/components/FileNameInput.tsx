interface FileNameInputProps {
  fileName: string;
  onChange: (fileName: string) => void;
}

export default function FileNameInput({
  fileName,
  onChange,
}: FileNameInputProps) {
  return (
    <div className="px-2 pb-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={fileName}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter filename..."
            className="w-full text-sm font-medium text-primary border border-primary hover:border-secondary focus:border-accent rounded bg-secondary px-2 py-1.5 placeholder:text-placeholder focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
