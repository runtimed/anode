import { OutputData, tables } from "@/schema";
import { queryDb } from "@livestore/livestore";
import { useQuery } from "@livestore/react";

interface CellOutputsResult {
  outputs: OutputData[];
  hasOutputs: boolean;
}

export const useCellOutputs = (cellId: string): CellOutputsResult => {
  const outputs = useQuery(
    queryDb(tables.outputs.select().where({ cellId }))
  ) as OutputData[];

  const hasOutputs = outputs.length > 0;

  return {
    outputs,
    hasOutputs,
  };
};
