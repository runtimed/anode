import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, useState } from "react";
import { VirtualizedItem } from "./VirtualizedItem";
import { Switch } from "@/components/ui/switch";
import { Label } from "../ui/label";
import { Input } from "../ui/input";

const ITEM_COUNT = 25;

// ---

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const iframeHeights = Array.from({ length: ITEM_COUNT }, (_, i) =>
  getRandomInt(60, 300)
);

function estimateSize(i: number) {
  return iframeHeights[i] + 64;
}

export function VirtualizedList() {
  // eslint-disable-next-line react-compiler/react-compiler
  "use no memo";

  const [isIframe, setIsIframe] = useState(false);
  const [isStaticEstimate, setIsStaticEstimate] = useState(true);
  const [overscan, setOverscan] = useState<number | undefined>(0);

  // The scrollable element for your list
  const parentRef = useRef(null);

  // The virtualizer
  const virtualizer = useVirtualizer({
    count: iframeHeights.length,
    getScrollElement: () => parentRef.current,
    estimateSize: isStaticEstimate ? (i) => 400 : estimateSize,
    overscan,
  });

  const vItems = virtualizer.getVirtualItems();

  return (
    <>
      <div className="flex flex-wrap gap-2 p-2">
        <div className="flex items-center space-x-2">
          <Switch
            id="use-iframe"
            checked={isIframe}
            onCheckedChange={setIsIframe}
          />
          <Label htmlFor="use-iframe">Use Iframe</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="use-static-estimate"
            checked={isStaticEstimate}
            onCheckedChange={setIsStaticEstimate}
          />
          <Label htmlFor="use-static-estimate">Static Estimate</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Label htmlFor="overscan">Overscan</Label>
          <Input
            className="w-16"
            id="overscan"
            type="number"
            value={overscan}
            onChange={(e) => {
              const value = Number(e.target.value);
              setOverscan(value);
            }}
          />
        </div>
      </div>
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
                iframeHeight={iframeHeights[virtualItem.index]}
                height={estimateSize(virtualItem.index)}
                measureElement={virtualizer.measureElement}
                isIframe={isIframe}
              />
            ))}
          </div>
        </div>
      </div>
      {/* <div className="text-sm text-gray-500">renderCount: {renderCount}</div> */}
      <div className="text-sm text-gray-500">
        cache size:{virtualizer.measurementsCache.length}
      </div>
      <div className="font-mono text-sm text-gray-500">
        <pre>
          total size:{" "}
          {String(virtualizer.getTotalSize().toLocaleString()).padStart(
            10,
            " "
          )}
          px
        </pre>
        {virtualizer.measurementsCache.map((virtualItem) => (
          <pre key={virtualItem.index}>
            {String(virtualItem.index).padStart(4, " ")}:{" "}
            {String(virtualItem.size).padStart(5, " ")}px iframe:
            {String(iframeHeights[virtualItem.index]).padStart(5, " ")}px
            {/* {cachedSize.has(virtualItem.index)
              ? ` cached: ${String(cachedSize.get(virtualItem.index)).padStart(5, " ")}px`
              : ""} */}
          </pre>
        ))}
      </div>
    </>
  );
}
