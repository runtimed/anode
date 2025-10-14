import { useQuery } from "@livestore/react";
import { useStore } from "@livestore/react";
import { events, maxAiIterations$ } from "@runtimed/schema";
import { useState } from "react";
import { useDebounce } from "react-use";

export function useMaxIterations() {
  const { store } = useStore();
  const maxIterationsQuery = useQuery(maxAiIterations$);

  // Parse the value from the query result, defaulting to 10
  const currentValue = parseInt(maxIterationsQuery || "10", 10);
  const [localMaxIterations, setLocalMaxIterations] = useState(currentValue);

  const setMaxIterations = (value: number) => {
    store.commit(
      events.notebookMetadataSet({
        key: "max_ai_iterations",
        value: value.toString(),
      })
    );
  };

  // Debounce the setMaxIterations call to prevent excessive commits
  useDebounce(() => setMaxIterations(localMaxIterations), 1000, [
    localMaxIterations,
  ]);

  return {
    setLocalMaxIterations,
    localMaxIterations,
    setMaxIterations,
  };
}
