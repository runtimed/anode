import { OutputData, tables } from "@/schema";
import { queryDb } from "@livestore/livestore";
import { getFinalContent } from "@/runt-schema";

// TODO: code here is duplicated from `runt/packages/schema/queries/outputDeltas.ts`
// Reconcile it in the future

interface OutputDelta {
  id: string;
  outputId: string;
  delta: string;
  sequenceNumber: number;
}

/**
 * Query deltas for a given output ID, sorted by sequence number
 */
export const outputsDeltasQuery = (outputIds: readonly string[]) =>
  queryDb(
    tables.outputDeltas
      .select()
      .where({ outputId: { op: "IN", value: outputIds } })
      .orderBy("sequenceNumber", "asc"),
    { deps: outputIds, label: "outputDeltas" }
  );

export function processDeltas(
  outputs: OutputData[],
  outputDeltas: readonly OutputDelta[]
) {
  return outputs.map((output) => {
    if (output.outputType === "markdown") {
      const outputDeltasFiltered = outputDeltas.filter(
        (delta) => delta.outputId === output.id
      );
      return {
        ...output,
        data: getFinalContent(output.data || "", outputDeltasFiltered).content,
      };
    }
    return output;
  });
}
