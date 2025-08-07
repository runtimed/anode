import React from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Editor } from "../shared/Editor.js";

import type { CellContentProps } from "../ExecutableCell.js";

export const SqlCellContent: React.FC<CellContentProps> = ({
  cell,
  localSource,
  handleSourceChange,
  updateSource,
  autoFocus,
  onFocus,
  keyMap,
}) => {
  return (
    <>
      {/* Editor Content Area */}
      {cell.sourceVisible && (
        <div className="cell-content bg-white py-1 pl-4 transition-colors">
          <ErrorBoundary fallback={<div>Error rendering SQL editor</div>}>
            <Editor
              localSource={localSource}
              handleSourceChange={handleSourceChange}
              onBlur={updateSource}
              handleFocus={onFocus}
              cell={cell}
              autoFocus={autoFocus}
              keyMap={keyMap}
            />
          </ErrorBoundary>
        </div>
      )}
    </>
  );
};
