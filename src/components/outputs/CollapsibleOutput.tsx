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
        const { scrollHeight } = contentRef.current;
        const shouldCollapse = scrollHeight > maxHeight;
        setIsOverflowing(shouldCollapse);
        setIsCollapsed(shouldCollapse);
      }
    };

    // Check overflow after content renders
    const timer = setTimeout(checkOverflow, 100);

    // Also check on window resize
    window.addEventListener("resize", checkOverflow);

    return () => {
      clearTimeout(timer);
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
