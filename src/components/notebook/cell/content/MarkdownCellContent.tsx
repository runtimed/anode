import React, { useCallback, useMemo, useRef, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useClickAway } from "react-use";
import { Editor } from "../shared/Editor.js";
import type { CellContentProps } from "../UniversalCell.js";

const MarkdownRenderer = React.lazy(() =>
  import("@/components/outputs/MarkdownRenderer.js").then((m) => ({
    default: m.MarkdownRenderer,
  }))
);

export const MarkdownCellContent: React.FC<CellContentProps> = ({
  cell,
  localSource,
  handleSourceChange,
  updateSource,
  autoFocus,
  onFocus,
  keyMap,
  isEditing = false,
  setIsEditing = () => {},
}) => {
  const cellContentRef = useRef<HTMLDivElement>(null);

  useClickAway(cellContentRef, () => {
    if (isEditing && localSource.length > 0) {
      setIsEditing(false);
      updateSource();
    }
  });

  // Enhanced keyMap for markdown-specific commands
  const extendedKeyMap = useMemo(() => {
    return [
      {
        key: "Escape",
        run: () => {
          if (isEditing) {
            setIsEditing(false);
            updateSource();
            return true;
          }
          return false;
        },
      },
      {
        key: "Mod-Enter",
        run: () => {
          if (isEditing) {
            setIsEditing(false);
            updateSource();
            return true;
          }
          return false;
        },
      },
      ...keyMap,
    ];
  }, [keyMap, updateSource, setIsEditing, isEditing]);

  return (
    <>
      {/* Cell Content */}
      <div ref={cellContentRef} className="relative">
        {/* Editor Content Area */}
        {cell.sourceVisible && isEditing && (
          <div className="cell-content bg-white py-1 pl-4 transition-colors">
            <ErrorBoundary fallback={<div>Error rendering editor</div>}>
              <Editor
                localSource={localSource}
                handleSourceChange={handleSourceChange}
                handleFocus={onFocus}
                cell={cell}
                autoFocus={autoFocus}
                keyMap={extendedKeyMap}
                onBlur={updateSource}
              />
            </ErrorBoundary>
          </div>
        )}
        {cell.sourceVisible && !isEditing && (
          <div
            className="cell-content bg-white py-1 pr-4 pl-4 transition-colors focus:ring-2 focus:ring-amber-300 focus:ring-offset-2 focus:outline-none"
            onDoubleClick={() => setIsEditing(true)}
            tabIndex={0}
            onFocus={onFocus}
            onKeyDown={(e) => {
              // Handle Enter key to start editing
              if (e.key === "Enter") {
                setIsEditing(true);
                e.preventDefault();
                return;
              }

              // Process navigation keys from keyMap when in preview mode
              for (const binding of keyMap) {
                const matchesKey =
                  binding.key === e.key ||
                  (binding.mac &&
                    e.metaKey &&
                    binding.mac.replace("Meta-", "") === e.key) ||
                  (binding.win &&
                    e.ctrlKey &&
                    binding.win.replace("Ctrl-", "") === e.key);

                if (matchesKey && binding.run) {
                  // Create a mock editor-like object for navigation
                  const mockEditor = {
                    state: {
                      doc: { length: localSource.length },
                      selection: { main: { head: localSource.length } },
                    },
                  };

                  if (binding.run(mockEditor)) {
                    e.preventDefault();
                    break;
                  }
                }
              }
            }}
          >
            <Suspense
              fallback={<div className="animate-pulse">Loading...</div>}
            >
              <MarkdownRenderer content={localSource} />
            </Suspense>
          </div>
        )}
      </div>
    </>
  );
};
