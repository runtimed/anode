// import { useVirtualizer } from "@tanstack/react-virtual";

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const ITEMS = Array.from({ length: 1000 }, (_, i) => getRandomInt(20, 300));

export function VirtualizedList() {
  // const rowVirtualizer = useVirtualizer({
  //   count: ITEMS.length,
  //   getScrollElement: () => document.body,
  //   estimateSize: (i) => ITEMS[i],
  // });

  return (
    <div className="absolute top-0 left-0 h-screen w-screen overflow-scroll overscroll-contain border-2 border-red-500">
      VirtualizedList
      {ITEMS.map((item, i) => (
        <div
          key={i}
          className={`h-10 ${i % 2 === 0 ? "bg-yellow-100" : "bg-cyan-100"}`}
          style={{
            height: `${item}px`,
          }}
        >
          {i} • {item}
        </div>
      ))}
    </div>
  );
}
