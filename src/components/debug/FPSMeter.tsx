import { MinimalLoading } from "../loading/LoadingState.js";
import { useDebug } from "./debug-mode.tsx";
import React, { Suspense } from "react";

// Dynamic import for FPSMeter - development tool only
const FPSMeterComponent = React.lazy(() =>
  import("@overengineering/fps-meter").then((m) => ({
    default: m.FPSMeter,
  }))
);

export const FPSMeter = () => {
  const debug = useDebug();

  if (!debug.enabled || !import.meta.env.DEV) {
    return null;
  }

  return (
    <div
      style={{
        bottom: 0,
        right: debug.enabled ? 400 : 0, // Leave space for debug panel
        position: "fixed",
        background: "#333",
        zIndex: 50,
      }}
    >
      <Suspense fallback={<MinimalLoading message="Loading FPS meter..." />}>
        <FPSMeterComponent height={40} />
      </Suspense>
    </div>
  );
};
