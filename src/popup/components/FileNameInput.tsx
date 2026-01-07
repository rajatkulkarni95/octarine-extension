interface FileNameInputProps {
  fileName: string;
  onChange: (fileName: string) => void;
}

export default function FileNameInput({
  fileName,
  onChange,
}: FileNameInputProps) {
  return (
    <div className="px-2 pt-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={fileName}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter filename..."
            className="w-full text-sm font-medium text-primary border border-primary hover:border-secondary focus:border-accent rounded bg-transparent px-1.5 py-1 placeholder:text-placeholder focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
