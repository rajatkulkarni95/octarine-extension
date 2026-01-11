interface FileNameInputProps {
  fileName: string;
  onChange: (fileName: string) => void;
}

export default function FileNameInput({
  fileName,
  onChange,
}: FileNameInputProps) {
  return (
    <div className="px-2 mb-1">
      <div className="flex-1 min-w-0">
        <input
          type="text"
          value={fileName}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter filename..."
          className="w-full text-[13px] font-medium text-primary border border-secondary rounded bg-secondary px-2 py-1.5 placeholder:text-placeholder focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
    </div>
  );
}
