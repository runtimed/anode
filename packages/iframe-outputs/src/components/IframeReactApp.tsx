import { SingleOutput, useIframeCommsChild } from "@anode/shared";
import React from "react";

export const IframeReactApp: React.FC = () => {
  const { outputs } = useIframeCommsChild();

  if (outputs.length === 0) {
    return null;
  }

  // Default content or non-React mode
  return outputs.map((output) => (
    <SingleOutput key={output.id} output={output} />
  ));
};
