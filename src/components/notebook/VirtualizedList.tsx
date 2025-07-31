import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const ITEMS = Array.from({ length: 1000 }, (_, i) => getRandomInt(20, 300));

export function VirtualizedList() {
  // eslint-disable-next-line react-compiler/react-compiler
  "use no memo";

  // The scrollable element for your list
  const parentRef = useRef(null);

  // The virtualizer
  const rowVirtualizer = useVirtualizer({
    count: ITEMS.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => ITEMS[i],
  });

  return (
    <>
      {/* The scrollable element for your list */}
      <div
        ref={parentRef}
        className="overflow-auto overscroll-contain border-2 border-red-500"
        style={{
          height: `400px`,
        }}
      >
        {/* The large inner element to hold all of the items */}
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {/* Only the visible items in the virtualizer, manually positioned to be in view */}
          {rowVirtualizer.getVirtualItems().map((virtualItem) => (
            <div
              key={virtualItem.key}
              className={`absolute top-0 left-0 w-full ${virtualItem.index % 2 === 0 ? "bg-yellow-100" : "bg-cyan-100"}`}
              style={{
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {virtualItem.index} • {ITEMS[virtualItem.index]}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
