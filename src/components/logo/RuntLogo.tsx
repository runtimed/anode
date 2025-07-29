import React from "react";
import { PixelatedCircle } from "./PixelatedCircle";

interface RuntLogoProps {
  /** Size classes for the logo container (e.g., "h-28 w-28") */
  size?: string;
  /** Whether to show hover effects (bunny movement, rune intensity) */
  showHoverEffects?: boolean;
  /** External hover state (for coordinating with other elements) */
  isHovered?: boolean;
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
  showHoverEffects = false,
  isHovered = false,
  className = "",
  animation = "",
  filterId,
}) => {
  const [localHover, setLocalHover] = React.useState(false);
  const hover = showHoverEffects && (isHovered || localHover);

  return (
    <div
      className={`relative ${size} ${animation} ${className}`}
      onMouseEnter={() => showHoverEffects && setLocalHover(true)}
      onMouseLeave={() => showHoverEffects && setLocalHover(false)}
    >
      <PixelatedCircle className="absolute inset-0" filterId={filterId} />

      <img
        src="/shadow.png"
        alt=""
        className={`pixel-logo absolute inset-0 h-full w-full ${
          showHoverEffects ? "transition-transform duration-200" : ""
        } ${hover ? "translate-x-1" : ""}`}
      />

      <img
        src="/bunny.png"
        alt=""
        className={`pixel-logo absolute inset-0 h-full w-full ${
          showHoverEffects ? "transition-transform duration-200" : ""
        } ${hover ? "translate-x-1 -translate-y-0.5" : ""}`}
      />

      <img
        src="/runes.png"
        alt=""
        className={`pixel-logo absolute inset-0 h-full w-full ${
          hover ? "rune-throb-intense" : "rune-throb"
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
