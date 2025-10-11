import { useMaxWidth } from "@/hooks/use-breakpoint.ts";
import { cn } from "@/lib/utils.ts";
import React, { Suspense } from "react";
import { MinimalLoading } from "../loading/LoadingState.js";
import { useDebug } from "./debug-mode.tsx";

// Dynamic import for FPSMeter - development tool only
const FPSMeterComponent = React.lazy(() =>
  import("@overengineering/fps-meter").then((m) => ({
    default: m.FPSMeter,
  }))
);

export const FPSMeter = () => {
  const debug = useDebug();
  const isMedium = useMaxWidth("md");

  if (!debug.enabled || !import.meta.env.DEV) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-0 z-50 bg-black text-white",
        isMedium ? "right-0 bottom-12" : "right-12"
      )}
    >
      <Suspense fallback={<MinimalLoading message="Loading FPS meter..." />}>
        <FPSMeterComponent height={30} />
      </Suspense>
    </div>
  );
};
