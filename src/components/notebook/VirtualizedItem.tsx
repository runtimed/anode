import { VirtualItem } from "@tanstack/react-virtual";
import { HtmlOutput } from "../outputs";

interface VirtualizedItemProps {
  virtualItem: VirtualItem;
  height: number;
  iframeHeight: number;
  isIframe: boolean;
  measureElement: (node: HTMLElement | null) => void;
}

export function VirtualizedItem({
  virtualItem,
  height,
  iframeHeight,
  measureElement,
  isIframe,
}: VirtualizedItemProps) {
  return (
    <div
      key={virtualItem.key}
      data-index={virtualItem.index}
      ref={measureElement}
      className={`${virtualItem.index % 2 === 0 ? "bg-yellow-100" : "bg-cyan-100"} overflow-hidden contain-strict`}
      style={{
        height: height,
        // transform: `translateY(${virtualItem.start}px)`,
      }}
    >
      <div className="p-2">
        {virtualItem.index} • {height}px
        {/* <div>Input:</div> */}
        {/* <CodeMirrorEditor
          value={`print ('${virtualItem.index} • ${ITEMS[virtualItem.index]}')`}
          language="python"
        /> */}
        <div>Output:</div>
        {isIframe ? (
          <HtmlOutput
            content={`<div style="height: ${iframeHeight}px; border: 2px solid green;">${virtualItem.index}</div>`}
          />
        ) : (
          <div
            className="border-2 border-green-500"
            style={{ height: `${iframeHeight}px` }}
          ></div>
        )}
      </div>
    </div>
  );
}
