import React, { useCallback, useEffect, useState } from "react";
import { useStore } from "@livestore/react";
import { events, tables } from "@runt/schema";
import { queryDb } from "@livestore/livestore";
import { Input } from "@/components/ui/input";
import { useLiveStoreQuery } from "@/hooks/useLiveStoreQuery";

interface NotebookTitleProps {
  className?: string;
}

export const NotebookTitle: React.FC<NotebookTitleProps> = ({ className }) => {
  const { store } = useStore();

  // Get notebook title from metadata using SQL filtering for better performance
  const titleMetadata = useLiveStoreQuery(
    queryDb(tables.notebookMetadata.select().where({ key: "title" }).limit(1))
  );
  const notebookTitle = titleMetadata[0]?.value ?? "Untitled";

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [localTitle, setLocalTitle] = useState(notebookTitle);

  // Sync local title with notebook title
  useEffect(() => {
    setLocalTitle(notebookTitle);
  }, [notebookTitle]);

  const updateTitle = useCallback(() => {
    if (localTitle !== notebookTitle) {
      store.commit(
        events.notebookTitleChanged({
          title: localTitle,
        })
      );
    }
    setIsEditingTitle(false);
  }, [notebookTitle, localTitle, store]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        updateTitle();
      }
      if (e.key === "Escape") {
        setLocalTitle(notebookTitle);
        setIsEditingTitle(false);
      }
    },
    [updateTitle, notebookTitle]
  );

  const handleTitleClick = useCallback(() => {
    setIsEditingTitle(true);
  }, []);

  if (isEditingTitle) {
    return (
      <Input
        value={localTitle}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setLocalTitle(e.target.value)
        }
        onBlur={updateTitle}
        onKeyDown={handleKeyDown}
        className="border-none bg-transparent p-0 text-lg font-semibold focus-visible:ring-0"
        autoFocus
      />
    );
  }

  return (
    <h1
      className={`hover:text-muted-foreground cursor-pointer truncate text-base font-semibold transition-colors sm:text-lg ${className || ""}`}
      onClick={handleTitleClick}
    >
      {notebookTitle}
    </h1>
  );
};
