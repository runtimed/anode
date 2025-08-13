import { Suspense } from "react";
import { Spinner } from "../../ui/Spinner";

import React from "react";
import { useTimeout } from "react-use";

function DelayedSpinner({ delay = 500 }) {
  const [isReady] = useTimeout(delay);

  return isReady() ? <LoadingSpinner /> : null;
}

export function SuspenseSpinner({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<DelayedSpinner />}>{children}</Suspense>;
}

export const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-4">
    <Spinner />
  </div>
);
