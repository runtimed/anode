import { CellData } from "@runt/schema";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Cell } from "./cell/Cell.js";
import { CellBetweener } from "./cell/CellBetweener.js";

interface VirtualizedCellListProps {
  cells: CellData[];
  focusedCellId: string | null;
  onAddCell: (
    cellId?: string,
    cellType?: string,
    position?: "before" | "after"
  ) => void;
  onDeleteCell: (cellId: string) => void;
  onMoveUp: (cellId: string) => void;
  onMoveDown: (cellId: string) => void;
  onFocusNext: (cellId: string) => void;
  onFocusPrevious: (cellId: string) => void;
  onFocus: (cellId: string) => void;
  contextSelectionMode?: boolean;
  // Virtualization config
  itemHeight?: number;
  overscan?: number;
  threshold?: number; // Number of cells before virtualization kicks in
}

const MemoizedCell = React.memo(Cell, (prevProps, nextProps) => {
  // Only re-render if cell data, autoFocus, or contextSelectionMode changes
  return (
    prevProps.cell.id === nextProps.cell.id &&
    prevProps.cell.source === nextProps.cell.source &&
    prevProps.cell.executionState === nextProps.cell.executionState &&
    prevProps.cell.executionCount === nextProps.cell.executionCount &&
    prevProps.cell.cellType === nextProps.cell.cellType &&
    prevProps.cell.sourceVisible === nextProps.cell.sourceVisible &&
    prevProps.cell.outputVisible === nextProps.cell.outputVisible &&
    prevProps.cell.aiContextVisible === nextProps.cell.aiContextVisible &&
    prevProps.cell.aiProvider === nextProps.cell.aiProvider &&
    prevProps.cell.aiModel === nextProps.cell.aiModel &&
    prevProps.autoFocus === nextProps.autoFocus &&
    prevProps.contextSelectionMode === nextProps.contextSelectionMode
  );
});

export const VirtualizedCellList: React.FC<VirtualizedCellListProps> = ({
  cells,
  focusedCellId,
  onAddCell,
  onDeleteCell,
  onMoveUp,
  onMoveDown,
  onFocusNext,
  onFocusPrevious,
  onFocus,
  contextSelectionMode = false,
  itemHeight = 200, // Estimated height per cell
  overscan = 5, // Extra items to render outside viewport
  threshold = 100, // Enable virtualization when cells > threshold
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const cellHeights = useRef<Map<string, number>>(new Map());
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [heightsVersion, setHeightsVersion] = useState(0);

  // Cells are already sorted by database query (orderBy("position", "asc"))
  // Memoize cells array to prevent unnecessary recalculations
  const memoizedCells = useMemo(() => cells, [cells]);

  // Check if we should use virtualization
  const shouldVirtualize = memoizedCells.length > threshold;

  // Calculate cumulative heights for positioning
  const cellPositions = useMemo(() => {
    const positions = new Map<string, { top: number; height: number }>();
    let cumulativeHeight = 0;
    const CELL_SPACING = 16; // 1rem spacing between cells

    memoizedCells.forEach((cell) => {
      const height = cellHeights.current.get(cell.id) || itemHeight;
      positions.set(cell.id, { top: cumulativeHeight, height });
      cumulativeHeight += height + CELL_SPACING;
    });

    return { positions, totalHeight: cumulativeHeight };
  }, [memoizedCells, itemHeight, heightsVersion]); // eslint-disable-line react-hooks/exhaustive-deps -- heightsVersion is needed to trigger recalculation when cellHeights ref changes

  // Calculate visible range for virtualization using actual heights
  const visibleRange = useMemo(() => {
    if (!shouldVirtualize) return { start: 0, end: memoizedCells.length };

    // If containerHeight is 0 (initial load), show first few cells as fallback
    if (containerHeight === 0) {
      return { start: 0, end: Math.min(overscan * 2, memoizedCells.length) };
    }

    const viewportTop = scrollTop;
    const viewportBottom = scrollTop + containerHeight;
    let start = 0;
    let end = memoizedCells.length;

    // Find first visible cell
    for (let i = 0; i < memoizedCells.length; i++) {
      const cell = memoizedCells[i];
      const position = cellPositions.positions.get(cell.id);
      if (position && position.top + position.height >= viewportTop) {
        start = Math.max(0, i - overscan);
        break;
      }
    }

    // Find last visible cell
    for (let i = start; i < memoizedCells.length; i++) {
      const cell = memoizedCells[i];
      const position = cellPositions.positions.get(cell.id);
      if (position && position.top > viewportBottom) {
        end = Math.min(i + overscan, memoizedCells.length);
        break;
      }
    }

    return { start, end };
  }, [
    shouldVirtualize,
    scrollTop,
    containerHeight,
    overscan,
    memoizedCells,
    cellPositions.positions,
  ]);

  // Get visible cells
  const visibleCells = useMemo(() => {
    return memoizedCells.slice(visibleRange.start, visibleRange.end);
  }, [memoizedCells, visibleRange.start, visibleRange.end]);

  // Use calculated heights instead of estimated
  const totalHeight = shouldVirtualize ? cellPositions.totalHeight : 0;

  // Calculate offset based on actual cell positions
  const offsetY =
    shouldVirtualize && visibleRange.start > 0
      ? (memoizedCells[visibleRange.start] &&
          cellPositions.positions.get(memoizedCells[visibleRange.start].id)
            ?.top) ||
        0
      : 0;

  // Handle scroll events with requestAnimationFrame to prevent layout thrashing
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (shouldVirtualize) {
        const scrollTop = e.currentTarget.scrollTop;
        requestAnimationFrame(() => {
          setScrollTop(scrollTop);
        });
      }
    },
    [shouldVirtualize]
  );

  // Observe container height changes with optimized ResizeObserver
  useLayoutEffect(() => {
    if (!shouldVirtualize) return;

    const container = containerRef.current;
    if (!container) return;

    // Set initial height immediately to prevent 0 height issue
    const initialHeight = container.getBoundingClientRect().height;
    if (initialHeight > 0) {
      setContainerHeight(initialHeight);
    }

    // Cleanup previous observer
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
    }

    resizeObserverRef.current = new ResizeObserver((entries) => {
      // Use requestAnimationFrame to batch layout updates
      requestAnimationFrame(() => {
        for (const entry of entries) {
          setContainerHeight(entry.contentRect.height);
        }
      });
    });

    resizeObserverRef.current.observe(container);
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };
  }, [shouldVirtualize]);

  // Auto-scroll to focused cell using actual cell positions
  useEffect(() => {
    if (!shouldVirtualize || !focusedCellId || !containerRef.current) return;

    const position = cellPositions.positions.get(focusedCellId);
    if (!position) return;

    const cellTop = position.top;
    const cellBottom = cellTop + position.height;
    const viewportTop = scrollTop;
    const viewportBottom = scrollTop + containerHeight;

    // Check if cell is outside viewport
    if (cellTop < viewportTop || cellBottom > viewportBottom) {
      // Use requestAnimationFrame for smooth scrolling
      requestAnimationFrame(() => {
        const targetScroll =
          cellTop - containerHeight / 2 + position.height / 2;
        containerRef.current?.scrollTo({
          top: Math.max(0, targetScroll),
          behavior: "smooth",
        });
      });
    }
  }, [
    shouldVirtualize,
    focusedCellId,
    cellPositions.positions,
    scrollTop,
    containerHeight,
  ]);

  // Measure cell heights when they render
  const measureCellHeight = useCallback(
    (cellId: string, element: HTMLDivElement | null) => {
      if (element) {
        cellRefs.current.set(cellId, element);

        // Use ResizeObserver to track height changes
        const observer = new ResizeObserver(() => {
          const height = element.getBoundingClientRect().height;
          const currentHeight = cellHeights.current.get(cellId);

          if (Math.abs(height - (currentHeight || 0)) > 1) {
            // Only update if significant change
            cellHeights.current.set(cellId, height);
            // Force re-render to update positions
            setHeightsVersion((prev) => prev + 1);
          }
        });

        observer.observe(element);
        return () => observer.disconnect();
      } else {
        cellRefs.current.delete(cellId);
        cellHeights.current.delete(cellId);
      }
    },
    []
  );

  const cellElements = useMemo(
    () =>
      visibleCells.map((cell, index) => (
        <div key={cell.id} ref={(el) => measureCellHeight(cell.id, el)}>
          <ErrorBoundary fallback={<div>Error rendering cell</div>}>
            {index === 0 && (
              <CellBetweener
                cell={cell}
                onAddCell={onAddCell}
                position="before"
              />
            )}
            <MemoizedCell
              cell={cell}
              onDeleteCell={() => onDeleteCell(cell.id)}
              onMoveUp={() => onMoveUp(cell.id)}
              onMoveDown={() => onMoveDown(cell.id)}
              onFocusNext={() => onFocusNext(cell.id)}
              onFocusPrevious={() => onFocusPrevious(cell.id)}
              onFocus={() => onFocus(cell.id)}
              autoFocus={cell.id === focusedCellId}
              contextSelectionMode={contextSelectionMode}
            />
            <CellBetweener cell={cell} onAddCell={onAddCell} position="after" />
          </ErrorBoundary>
        </div>
      )),
    [
      visibleCells,
      measureCellHeight,
      focusedCellId,
      contextSelectionMode,
      onAddCell,
      onDeleteCell,
      onMoveUp,
      onMoveDown,
      onFocusNext,
      onFocusPrevious,
      onFocus,
    ]
  );

  // If we have fewer cells than threshold, render normally
  if (!shouldVirtualize) {
    return (
      <div ref={containerRef} style={{ paddingLeft: "1rem" }}>
        {cellElements}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        paddingLeft: "1rem",
      }}
      onScroll={handleScroll}
    >
      {/* Spacer for virtualized offset */}
      {offsetY > 0 && <div style={{ height: offsetY }} />}

      {/* Visible cells */}
      {cellElements}

      {/* Spacer for remaining content */}
      {totalHeight -
        offsetY -
        visibleCells.reduce((sum, cell) => {
          const height =
            cellPositions.positions.get(cell.id)?.height || itemHeight;
          return sum + height + 16; // 16px for spacing
        }, 0) >
        0 && (
        <div
          style={{
            height:
              totalHeight -
              offsetY -
              visibleCells.reduce((sum, cell) => {
                const height =
                  cellPositions.positions.get(cell.id)?.height || itemHeight;
                return sum + height + 16;
              }, 0),
          }}
        />
      )}
    </div>
  );
};
