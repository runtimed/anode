import { OutputsContainer } from "@/components/outputs/shared-with-iframe/OutputsContainer";
import { SingleOutput } from "@/components/outputs/shared-with-iframe/SingleOutput";
import { SuspenseSpinner } from "@/components/outputs/shared-with-iframe/SuspenseSpinner";
import { useIframeCommsChild } from "@/components/outputs/shared-with-iframe/comms";
import React from "react";

export const IframeReactApp: React.FC = () => {
  const { outputs } = useIframeCommsChild();

  if (outputs.length === 0) {
    return null;
  }

  // Default content or non-React mode
  return (
    <SuspenseSpinner>
      <OutputsContainer>
        {outputs.map((output) => (
          <SingleOutput key={output.id} output={output} />
        ))}
      </OutputsContainer>
    </SuspenseSpinner>
  );
};
