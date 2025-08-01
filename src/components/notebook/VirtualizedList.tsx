import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef, useState } from "react";
import { VirtualizedItem } from "./VirtualizedItem";
import { Switch } from "@/components/ui/switch";
import { Label } from "../ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DEFAULT_LIST_SIZE = 25;
const DEFAULT_OVERSCAN = 0;
const DEFAULT_IS_STATIC_ESTIMATE = false;
const DEFAULT_IS_IFRAME = true;

// ---

const OVERSCAN_SIZES = [0, 3, 10, 50];
type OverscanSize = (typeof OVERSCAN_SIZES)[number];

const LIST_SIZES = [5, 10, 25, 100, 500, 1000, 5000, 10000];
type ListSize = (typeof LIST_SIZES)[number];

// ---

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateIframeHeights(count: number) {
  return Array.from({ length: count }, (_, i) => getRandomInt(60, 300));
}

function estimateSize(i: number, heights: number[]) {
  return heights[i] + 64;
}

export function VirtualizedList() {
  "use no memo";

  const [renderCount, setRenderCount] = useState(0);

  // settings
  const [isIframe, setIsIframe] = useState(DEFAULT_IS_IFRAME);
  const [isStaticEstimate, setIsStaticEstimate] = useState(
    DEFAULT_IS_STATIC_ESTIMATE
  );
  const [overscan, setOverscan] = useState<OverscanSize>(DEFAULT_OVERSCAN);
  const [selectedSize, setSelectedSize] = useState<ListSize>(DEFAULT_LIST_SIZE);

  const iframeHeights = useMemo(
    () => generateIframeHeights(selectedSize),
    [selectedSize]
  );

  // The scrollable element for your list
  const parentRef = useRef(null);

  // The virtualizer
  const virtualizer = useVirtualizer({
    count: iframeHeights.length,
    getScrollElement: () => parentRef.current,
    estimateSize: isStaticEstimate
      ? () => 400
      : (i) => estimateSize(i, iframeHeights),
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
      </div>
      <div className="p-2">
        <Tabs
          value={overscan.toString()}
          onValueChange={(value) => setOverscan(Number(value))}
        >
          <TabsList className="grid w-full grid-cols-8">
            {OVERSCAN_SIZES.map((size) => (
              <TabsTrigger key={size} value={size.toString()}>
                {size.toLocaleString()}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <div className="p-2">
        <Tabs
          value={selectedSize.toString()}
          onValueChange={(value) => setSelectedSize(Number(value))}
        >
          <TabsList className="grid w-full grid-cols-8">
            {LIST_SIZES.map((size) => (
              <TabsTrigger key={size} value={size.toString()}>
                {size.toLocaleString()}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      {/* The scrollable element for your list */}
      <div
        ref={parentRef}
        className="overflow-auto overscroll-contain border-2 border-red-500 contain-strict"
        style={{
          width: "400px",
          height: "400px",
          // https://github.com/TanStack/virtual/issues/925#issuecomment-2678438243
          overflowAnchor: "auto",
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
                height={estimateSize(virtualItem.index, iframeHeights)}
                measureElement={virtualizer.measureElement}
                inRange={Boolean(
                  virtualizer?.range?.startIndex &&
                    virtualizer?.range?.endIndex &&
                    virtualizer.range.startIndex <= virtualItem.index &&
                    virtualizer.range.endIndex >= virtualItem.index
                )}
                onHeightChange={(height) => {
                  iframeHeights[virtualItem.index] = height;
                  // Update render count to force re-render the items
                  setRenderCount((prev) => prev + 1);
                }}
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
        <pre>renderCount: {renderCount}</pre>
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
