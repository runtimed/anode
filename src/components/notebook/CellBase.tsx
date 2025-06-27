import React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export const CellBase = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    asChild?: boolean;
    isMaximized?: boolean;
  }
>(({ asChild = false, isMaximized, style, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      ref={ref}
      style={{ minHeight: "2.5rem", ...style }}
      className={cn(
        "placeholder:text-muted-foreground/60 w-full resize-none border-0 bg-white px-2 py-2 font-mono text-base shadow-none transition-all duration-200 focus-visible:ring-0 sm:py-1 sm:text-sm",
        isMaximized
          ? "fixed inset-4 top-16 z-50 max-h-[calc(100vh-8rem)] min-h-[calc(100vh-8rem)] rounded-lg border bg-white shadow-2xl"
          : "max-h-[40vh] min-h-[2.5rem] sm:max-h-none sm:min-h-[1.5rem]",
        className
      )}
      {...props}
    >
      {props.children}
    </Comp>
  );
});

CellBase.displayName = "CellBase";
