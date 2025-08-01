import { VirtualItem } from "@tanstack/react-virtual";
import { useState } from "react";
import { HtmlOutput } from "../outputs";

interface VirtualizedItemProps {
  virtualItem: VirtualItem;
  height: number;
  iframeHeight: number;
  inRange: boolean;
  onHeightChange?: (height: number) => void;
  measureElement: (node: HTMLElement | null) => void;
}

export function VirtualizedItemIframe({
  virtualItem,
  height,
  iframeHeight,
  inRange,
  onHeightChange,
  measureElement,
}: VirtualizedItemProps) {
  const [isReady, setIsReady] = useState(false);
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
        {virtualItem.index} • {height}px • {inRange ? "inRange" : "not inRange"}
        {/* <div>Input:</div> */}
        {/* <CodeMirrorEditor
          value={`print ('${virtualItem.index} • ${ITEMS[virtualItem.index]}')`}
          language="python"
        /> */}
        <div>Output:</div>
        {/* {showPreview && <div>Loading...</div>} */}
        {inRange && (
          <HtmlOutput
            style={{ height: !isReady ? "0px" : `${iframeHeight}px` }}
            content={`<div id="container" style="height: ${iframeHeight}px; border: 2px solid green;">${virtualItem.index}<button style="padding: .5em; font-size: 1em" onclick="console.log('clicked'); document.getElementById('container').style.height = (${iframeHeight} + Math.floor(Math.random() * 100) - 50)+ 'px';">Click to resize</button></div>`}
            onHeightChange={(height) => {
              // console.log({
              //   i: virtualItem.index,
              //   inRange,
              //   isReady,
              //   iframeHeight,
              //   height,
              // });
              setIsReady(true);
              onHeightChange?.(height);
            }}
          />
        )}
      </div>
    </div>
  );
}
