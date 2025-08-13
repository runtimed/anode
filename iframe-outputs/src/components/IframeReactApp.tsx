import { SingleOutput } from "@/components/outputs/shared-with-iframe/SingleOutput";
import { useIframeCommsChild } from "@/components/outputs/shared-with-iframe/comms";
import React from "react";

export const IframeReactApp: React.FC = () => {
  const { outputs } = useIframeCommsChild();

  if (outputs.length === 0) {
    return null;
  }

  // Default content or non-React mode
  return outputs.map((output, index) => (
    <div
      key={output.id}
      className={index > 0 ? "mt-2 border-t border-black/10 pt-2" : ""}
    >
      <SingleOutput output={output} />
    </div>
  ));
};
