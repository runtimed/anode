import { Suspense } from "react";
import { Spinner } from "../../ui/Spinner";

export function SuspenseSpinner({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>;
}

export const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-4">
    <Spinner />
  </div>
);
