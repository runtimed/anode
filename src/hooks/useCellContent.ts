import { useCallback, useEffect, useState } from "react";
import { useStore } from "@livestore/react";
import { events } from "@runt/schema";

interface CellContentOptions {
  cellId: string;
  initialSource: string;
  onUpdate?: (source: string) => void;
}

export const useCellContent = ({
  cellId,
  initialSource,
  onUpdate,
}: CellContentOptions) => {
  const { store } = useStore();
  const [localSource, setLocalSource] = useState(initialSource);

  // Sync local source with cell source
  useEffect(() => {
    setLocalSource(initialSource);
  }, [initialSource]);

  const updateSource = useCallback(() => {
    if (localSource !== initialSource) {
      store.commit(
        events.cellSourceChanged({
          id: cellId,
          source: localSource,
          modifiedBy: "current-user", // TODO: get from auth
        }),
      );
      onUpdate?.(localSource);
    }
  }, [localSource, initialSource, cellId, store, onUpdate]);

  const handleSourceChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setLocalSource(e.target.value);
    },
    [],
  );

  return {
    localSource,
    setLocalSource,
    updateSource,
    handleSourceChange,
  };
};
