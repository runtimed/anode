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
}) => {
  const isAnimated = animated && energized;

  return (
    <div className={`relative ${size} ${animation} ${className}`}>
      <PixelatedCircle className="absolute inset-0" filterId={filterId} />

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
