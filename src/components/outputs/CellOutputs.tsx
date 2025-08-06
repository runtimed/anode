// Note: this approach is not ideal, but it ensures that if this component throws, we can put an error boundary that works

import { IframeOutputs } from "./IframeOutputs";
import { OutputData } from "@runt/schema";

// Otherwise, just calling `<ErrorBoundary FallbackComponent={OutputsErrorBoundary}>renderOutputs()</ErrorBoundary>` will not work as expected
export function MaybeCellOutputs({ outputs }: { outputs: OutputData[] }) {
  if (!outputs.length) return null;

  return (
    <div className="outputs-container px-4 py-2">
      <IframeOutputs outputs={outputs} />
    </div>
  );
}
