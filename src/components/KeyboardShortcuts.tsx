export function KeyboardShortcuts() {
  return (
    <div className="mb-6 hidden sm:block">
      <div className="bg-muted/30 rounded-md px-4 py-2">
        <div className="text-muted-foreground flex items-center justify-center gap-6 text-xs">
          <div className="flex items-center gap-1">
            <kbd className="bg-background rounded border px-1.5 py-0.5 font-mono text-xs">
              ↑↓
            </kbd>
            <span>Navigate</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="bg-background rounded border px-1.5 py-0.5 font-mono text-xs">
              ⇧↵
            </kbd>
            <span>Run & next</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="bg-background rounded border px-1.5 py-0.5 font-mono text-xs">
              ⌘↵
            </kbd>
            <span>Run</span>
          </div>
        </div>
      </div>
    </div>
  );
}
