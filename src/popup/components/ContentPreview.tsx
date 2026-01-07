interface ContentPreviewProps {
  content: string;
  onChange: (content: string) => void;
}

export default function ContentPreview({
  content,
  onChange,
}: ContentPreviewProps) {
  return (
    <div className="flex-1 overflow-hidden px-2 py-2 min-h-0">
      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-full resize-none text-sm text-secondary font-sans font-normal bg-intermediate border border-primary rounded p-2 focus:outline-none focus:border-accent"
        placeholder="Preview content..."
      />
    </div>
  );
}
