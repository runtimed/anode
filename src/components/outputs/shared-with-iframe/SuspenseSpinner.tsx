import { Suspense } from "react";
import { Spinner, type SpinnerSize } from "../../ui/Spinner";

import React from "react";
import { useTimeout } from "react-use";

export function DelayedSpinner({
  size = "md",
  delay = 200,
}: {
  size?: SpinnerSize;
  delay?: number;
}) {
  // eslint-disable-next-line react-compiler/react-compiler
  "use no memo";

  const [isReady] = useTimeout(delay);

  return isReady() ? <LoadingSpinner size={size} /> : null;
}

export function SuspenseSpinner({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<DelayedSpinner />}>{children}</Suspense>;
}

export const LoadingSpinner = ({ size = "md" }: { size?: SpinnerSize }) => (
  <div className="flex items-center justify-center p-4">
    <Spinner size={size} />
  </div>
);
