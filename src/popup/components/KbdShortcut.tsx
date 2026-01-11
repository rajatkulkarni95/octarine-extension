interface KbdShortcutProps {
  keys: string[];
}

export default function KbdShortcut({ keys }: KbdShortcutProps) {
  return (
    <div className="flex items-center gap-0.5">
      {keys.map((key, index) => (
        <kbd
          key={index}
          className="inline-flex items-center justify-center rounded bg-tertiary px-1.5 py-0.5 font-[system-ui] text-xs text-secondary h-6 min-w-[24px]"
        >
          {key}
        </kbd>
      ))}
    </div>
  );
}
