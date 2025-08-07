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
    if (localSource.length > 0) {
      setIsEditing(false);
    }
    updateSource();
  });

  // Enhanced keyMap for markdown-specific commands (only when editing)
  const extendedKeyMap = useMemo(() => {
    if (!isEditing) {
      return keyMap; // Use default keymap when not editing
    }

    return [
      {
        key: "Escape",
        run: () => {
          if (isEditing && cell.source.length > 0) {
            setIsEditing(false);
            return true; // Handled escape
          }
          return false; // Let default handler take over
        },
      },
      {
        key: "Mod-Enter",
        run: () => {
          if (isEditing) {
            setIsEditing(false);
            updateSource();
            return true; // Handled mod-enter
          }
          return false; // Let default handler take over
        },
      },
      ...keyMap,
    ];
  }, [cell.source, keyMap, updateSource, setIsEditing, isEditing]);

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
            className="cell-content bg-white py-1 pr-4 pl-4 transition-colors"
            onDoubleClick={() => setIsEditing(true)}
          >
            <div onClick={() => setIsEditing(true)} className="cursor-text">
              <Suspense
                fallback={<div className="animate-pulse">Loading...</div>}
              >
                <MarkdownRenderer content={localSource} />
              </Suspense>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
