import React from "react";
import { PixelatedCircle } from "./PixelatedCircle";

interface RuntLogoProps {
  /** Size classes for the logo container (e.g., "h-28 w-28") */
  size?: string;
  /** Whether the logo is animated (bunny movement, rune intensity) */
  animated?: boolean;
  /** Whether the logo is in an energized state (excited bunny, intense runes) */
  energized?: boolean;
  /** Additional container classes */
  className?: string;
  /** Animation class for the container (e.g., "animate-pulse") */
  animation?: string;
  /** Unique filter ID to avoid conflicts when multiple logos are on the same page */
  filterId?: string;
  /** Variant of the logo - 'circle' for background circle, 'portal' for black hole */
  variant?: "circle" | "portal";
}

/**
 * The main Runt logo component with all its layers:
 * - Pixelated circle background
 * - Shadow layer
 * - Bunny layer
 * - Runes layer (with throbbing animation)
 * - Bracket layer
 */
export const RuntLogo: React.FC<RuntLogoProps> = ({
  size = "h-24 w-24",
  animated = false,
  energized = false,
  className = "",
  animation = "",
  filterId,
  variant = "circle",
}) => {
  const isAnimated = animated && energized;

  return (
    <div className={`relative ${size} ${animation} ${className}`}>
      {variant === "circle" ? (
        <PixelatedCircle className="absolute inset-0" filterId={filterId} />
      ) : (
        <div
          className="absolute"
          style={{
            left: "37%",
            top: "63%",
            width: "119%",
            height: "119%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 200 200"
            style={{ transformOrigin: "center center" }}
          >
            <defs>
              <filter id={filterId || "pixelate-portal"}>
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
              filter={`url(#${filterId || "pixelate-portal"})`}
            />
          </svg>
        </div>
      )}

      <img
        src="/shadow.png"
        alt=""
        className={`pixel-logo absolute inset-0 h-full w-full ${
          animated ? "transition-transform duration-200" : ""
        } ${isAnimated ? "translate-x-1" : ""}`}
      />

      <img
        src="/bunny.png"
        alt=""
        className={`pixel-logo absolute inset-0 h-full w-full ${
          animated ? "transition-transform duration-200" : ""
        } ${isAnimated ? "translate-x-1 -translate-y-0.5" : ""}`}
      />

      <img
        src="/runes.png"
        alt=""
        className={`pixel-logo absolute inset-0 h-full w-full ${
          isAnimated ? "rune-throb-intense" : "rune-throb"
        }`}
      />

      <img
        src="/bracket.png"
        alt="Runt"
        className="pixel-logo absolute inset-0 h-full w-full"
      />
    </div>
  );
};
