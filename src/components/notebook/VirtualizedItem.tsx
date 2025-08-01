import { VirtualItem } from "@tanstack/react-virtual";
import { HtmlOutput } from "../outputs";
import { useTimeout } from "react-use";

interface VirtualizedItemProps {
  virtualItem: VirtualItem;
  height: number;
  iframeHeight: number;
  isIframe: boolean;
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
  isIframe,
}: VirtualizedItemProps) {
  const [isReady] = useTimeout(500);

  if (!isReady() && !isIframe && inRange) {
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
      key={virtualItem.key}
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
        {isIframe ? (
          <HtmlOutput
            // style={{ height: `${iframeHeight}px` }}
            content={`<div id="container" style="height: ${iframeHeight}px; border: 2px solid green;">${virtualItem.index}<button style="padding: .5em; font-size: 1em" onclick="console.log('clicked'); document.getElementById('container').style.height = (${iframeHeight} + Math.floor(Math.random() * 100) - 50)+ 'px';">Click to resize</button></div>`}
            onHeightChange={onHeightChange}
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
