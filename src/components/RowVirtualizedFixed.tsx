import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";

export function RowVirtualizerFixed() {
  const parentRef = useRef(null);

  const rowVirtualizer = useVirtualizer({
    count: 10000,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35,
    overscan: 5,
  });

  return (
    <>
      <div
        ref={parentRef}
        className="m-4 border border-2 border-gray-300"
        style={{
          height: `200px`,
          width: `400px`,
          overflow: "auto",
        }}
      >
        <div
          className="relative w-full"
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => (
            <div
              key={virtualRow.index}
              className={virtualRow.index % 2 ? "bg-gray-100" : "bg-gray-200"}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              Row {virtualRow.index}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
