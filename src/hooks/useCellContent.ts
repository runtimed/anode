import { useCallback, useEffect, useState } from "react";
import { useStore } from "@livestore/react";
import { events } from "@runt/schema";
import { useAuth } from "@/components/auth/AuthProvider.js";

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
  const {
    user: { sub: userId },
  } = useAuth();
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
          modifiedBy: userId,
        })
      );
      onUpdate?.(localSource);
    }
  }, [localSource, initialSource, cellId, store, onUpdate, userId]);

  const handleSourceChange = useCallback((value: string) => {
    setLocalSource(value);
  }, []);

  return {
    localSource,
    setLocalSource,
    updateSource,
    handleSourceChange,
  };
};
