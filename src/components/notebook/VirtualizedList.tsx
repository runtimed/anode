import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { VirtualizedItem } from "./VirtualizedItem";

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const ITEMS = Array.from({ length: 100 }, (_, i) => getRandomInt(60, 300));

function estimateSize(i: number) {
  return ITEMS[i] + 4 + 88;
}

export function VirtualizedList() {
  // eslint-disable-next-line react-compiler/react-compiler
  "use no memo";

  // The scrollable element for your list
  const parentRef = useRef(null);

  // The virtualizer
  const virtualizer = useVirtualizer({
    count: ITEMS.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    // overscan: 2,
  });

  const vItems = virtualizer.getVirtualItems();

  return (
    <>
      {/* The scrollable element for your list */}
      <div
        ref={parentRef}
        className="overflow-auto overscroll-contain border-2 border-red-500 contain-strict"
        style={{
          width: "400px",
          height: "400px",
        }}
      >
        {/* The large inner element to hold all of the items */}
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${vItems[0]?.start ?? 0}px)`,
            }}
          >
            {/* Only the visible items in the virtualizer, manually positioned to be in view */}
            {vItems.map((virtualItem) => (
              <VirtualizedItem
                key={virtualItem.key}
                virtualItem={virtualItem}
                height={estimateSize(virtualItem.index)}
                measureElement={virtualizer.measureElement}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
