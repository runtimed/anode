import { OutputData, tables } from "@/schema";
import { queryDb } from "@livestore/livestore";
import { useQuery } from "@livestore/react";
import { useEffect, useRef } from "react";

interface CellOutputsResult {
  outputs: OutputData[];
  hasOutputs: boolean;
}

/**
 * Track the last non-empty outputs for a cellId.
 * This is to prevent the UI from flashing when cell is executing, and outputs are empty.
 * Sometimes outputs are empty for multiple renders in a row.
 */
function useEffectiveOutputs(cellId: string, outputs: OutputData[]) {
  // Cache the last non-empty outputs for this cellId
  const lastNonEmptyOutputsRef = useRef<OutputData[] | null>(null);

  // Reset cached outputs when switching cells
  useEffect(() => {
    lastNonEmptyOutputsRef.current = null;
  }, [cellId]);

  // Update cache whenever we have non-empty outputs
  useEffect(() => {
    if (outputs.length > 0) {
      lastNonEmptyOutputsRef.current = outputs;
    }
  }, [outputs]);

  const effectiveOutputs =
    outputs.length > 0 ? outputs : (lastNonEmptyOutputsRef.current ?? outputs);

  return effectiveOutputs;
}

export const useCellOutputs = (cellId: string): CellOutputsResult => {
  const outputs = useQuery(
    queryDb(tables.outputs.select().where({ cellId }))
  ) as OutputData[];

  const effectiveOutputs = useEffectiveOutputs(cellId, outputs);
  const hasOutputs = effectiveOutputs.length > 0;

  return {
    outputs: effectiveOutputs,
    hasOutputs,
  };
};
