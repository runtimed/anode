import { OutputData, tables } from "@/schema";
import { queryDb } from "@livestore/livestore";
import { useQuery } from "@livestore/react";
import { useState } from "react";

interface CellOutputsResult {
  outputs: OutputData[];
  hasOutputs: boolean;
  staleOutputs: OutputData[];
  setStaleOutputs: (outputs: OutputData[]) => void;
}

export const useCellOutputs = (cellId: string): CellOutputsResult => {
  const [staleOutputs, setStaleOutputs] = useState<OutputData[]>([]);

  const outputs = useQuery(
    queryDb(tables.outputs.select().where({ cellId }))
  ) as OutputData[];

  const hasOutputs = outputs.length > 0;

  return {
    outputs,
    hasOutputs,
    staleOutputs,
    setStaleOutputs,
  };
};
