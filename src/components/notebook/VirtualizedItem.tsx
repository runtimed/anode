import { VirtualItem } from "@tanstack/react-virtual";
import { useTimeout } from "react-use";

interface VirtualizedItemProps {
  virtualItem: VirtualItem;
  height: number;
  iframeHeight: number;
  inRange: boolean;
  onHeightChange?: (height: number) => void;
  measureElement: (node: HTMLElement | null) => void;
}

export function VirtualizedItem({
  virtualItem,
  height,
  iframeHeight,
  inRange,
  onHeightChange,
  measureElement,
}: VirtualizedItemProps) {
  const [isReady] = useTimeout(500);

  if (!isReady() && inRange) {
    return (
      <div
        key={virtualItem.key}
        data-index={virtualItem.index}
        className={`p-2 ${virtualItem.index % 2 === 0 ? "bg-yellow-100" : "bg-cyan-100"}`}
      >
        Loading...
      </div>
    );
  }

  return (
    <div
      data-index={virtualItem.index}
      ref={measureElement}
      className={`${virtualItem.index % 2 === 0 ? "bg-yellow-100" : "bg-cyan-100"}`}
      // style={{
      //   // height: height,
      //   // transform: `translateY(${virtualItem.start}px)`,
      // }}
    >
      <div className="p-2">
        {virtualItem.index} • {height}px
        {/* <div>Input:</div> */}
        {/* <CodeMirrorEditor
          value={`print ('${virtualItem.index} • ${ITEMS[virtualItem.index]}')`}
          language="python"
        /> */}
        <div>Output:</div>
        <div
          className="border-2 border-green-500"
          style={{ height: `${iframeHeight}px` }}
        ></div>
      </div>
    </div>
  );
}
