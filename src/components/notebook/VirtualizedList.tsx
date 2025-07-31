import { useVirtualizer } from "@tanstack/react-virtual";

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const ITEMS = Array.from({ length: 1000 }, (_, i) => getRandomInt(10, 100));

export function VirtualizedList() {
  // const rowVirtualizer = useVirtualizer({
  //   count: ITEMS.length,
  //   getScrollElement: () => document.body,
  //   estimateSize: () => 35,
  // });

  return (
    <div className="absolute top-0 left-0 h-screen w-screen overflow-scroll overscroll-contain border-2 border-red-500">
      VirtualizedList
      {ITEMS.map((item, i) => (
        <div
          key={i}
          className={`h-10 ${i % 2 === 0 ? "bg-red-100" : "bg-blue-100"}`}
        >
          {i} • {item}
        </div>
      ))}
    </div>
  );
}
