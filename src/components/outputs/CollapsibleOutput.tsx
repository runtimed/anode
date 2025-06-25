import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface CollapsibleOutputProps {
  children: React.ReactNode;
  maxHeight?: number;
  className?: string;
}

export const CollapsibleOutput: React.FC<CollapsibleOutputProps> = ({
  children,
  maxHeight = 600,
  className = "",
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkOverflow = () => {
      if (contentRef.current) {
        const element = contentRef.current;

        // For SVG/images, measure the actual rendered content
        let actualHeight = element.scrollHeight;

        // Check for SVG elements specifically
        const svgElement = element.querySelector("svg");
        if (svgElement) {
          const svgRect = svgElement.getBoundingClientRect();
          actualHeight = Math.max(actualHeight, svgRect.height);
        }

        // Check for images
        const imgElements = element.querySelectorAll("img");
        imgElements.forEach((img) => {
          if (img.complete) {
            actualHeight = Math.max(actualHeight, img.offsetHeight);
          }
        });

        console.log(
          `CollapsibleOutput: actualHeight=${actualHeight}, maxHeight=${maxHeight}, scrollHeight=${element.scrollHeight}`
        );

        const shouldCollapse = actualHeight > maxHeight;
        console.log(`Should collapse: ${shouldCollapse}`);
        setIsOverflowing(shouldCollapse);
        setIsCollapsed(shouldCollapse);
      }
    };

    // Check overflow after content renders - multiple timeouts for dynamic content
    const timers = [
      setTimeout(checkOverflow, 100),
      setTimeout(checkOverflow, 500),
      setTimeout(checkOverflow, 1000),
      setTimeout(checkOverflow, 2000),
    ];

    // Also check on window resize
    window.addEventListener("resize", checkOverflow);

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", checkOverflow);
    };
  }, [children, maxHeight]);

  const handleToggle = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={`relative ${className}`}>
      <div
        ref={contentRef}
        className={`transition-all duration-300 ease-in-out ${
          isCollapsed ? "overflow-hidden" : "overflow-visible"
        }`}
        style={{
          maxHeight: isCollapsed ? `${maxHeight}px` : "none",
        }}
      >
        {children}
      </div>

      {isOverflowing && (
        <div className="relative">
          {isCollapsed && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white via-white/90 to-transparent" />
          )}
          <div className="flex justify-center pt-2 pb-1">
            <button
              onClick={handleToggle}
              className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 shadow-sm transition-all duration-200 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 hover:shadow-md"
              aria-label={isCollapsed ? "Expand output" : "Collapse output"}
            >
              {isCollapsed ? (
                <>
                  <span>Show more</span>
                  <ChevronDown className="h-3 w-3" />
                </>
              ) : (
                <>
                  <span>Show less</span>
                  <ChevronUp className="h-3 w-3" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollapsibleOutput;
