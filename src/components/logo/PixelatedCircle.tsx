import React from "react";

interface PixelatedCircleProps {
  className?: string;
  filterId?: string; // Allow custom filter ID to avoid conflicts
}

/**
 * Reusable pixelated circle SVG component used as the base layer for the Runt logo.
 * Creates a black circle with pixelated edges using SVG filters.
 */
export const PixelatedCircle: React.FC<PixelatedCircleProps> = ({
  className = "",
  filterId = "pixelate",
}) => {
  return (
    <svg width="100%" height="100%" viewBox="0 0 200 200" className={className}>
      <defs>
        <filter id={filterId}>
          <feMorphology
            operator="erode"
            radius="2"
            in="SourceGraphic"
            result="morphed"
          />
          <feComponentTransfer in="morphed">
            <feFuncA type="discrete" tableValues="0 1" />
          </feComponentTransfer>
        </filter>
      </defs>
      <circle
        cx="100"
        cy="100"
        r="95"
        fill="#000000"
        filter={`url(#${filterId})`}
      />
    </svg>
  );
};
