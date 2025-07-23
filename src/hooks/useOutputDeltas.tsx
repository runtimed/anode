import { useMemo } from "react";
import { tables } from "@runt/schema";
import { queryDb } from "@livestore/livestore";
import { useQuery } from "@livestore/react";

interface OutputDelta {
  id: string;
  outputId: string;
  delta: string;
  sequenceNumber: number;
}

interface UseOutputDeltasOptions {
  outputId: string;
  originalContent: string;
}

interface UseOutputDeltasResult {
  content: string;
  hasDeltas: boolean;
  deltaCount: number;
}

/**
 * Hook to handle output deltas for streaming content.
 * Queries deltas for a given outputId and applies them in sequence order
 * to build the complete content.
 */
export const useOutputDeltas = ({
  outputId,
  originalContent,
}: UseOutputDeltasOptions): UseOutputDeltasResult => {
  // Query deltas for this output, sorted by sequence number
  const deltas = useQuery(
    queryDb(
      tables.outputDeltas
        .select()
        .where({ outputId })
        .orderBy("sequenceNumber", "asc"),
      { deps: [outputId], label: "outputDeltas" }
    )
  ) as OutputDelta[];

  const result = useMemo(() => {
    const hasDeltas = deltas.length > 0;

    if (!hasDeltas) {
      return {
        content: originalContent,
        hasDeltas: false,
        deltaCount: 0,
      };
    }

    // Apply deltas in sequence order
    const content = deltas.reduce((acc, delta) => {
      return acc + delta.delta;
    }, originalContent);

    return {
      content,
      hasDeltas: true,
      deltaCount: deltas.length,
    };
  }, [originalContent, deltas]);

  return result;
};
