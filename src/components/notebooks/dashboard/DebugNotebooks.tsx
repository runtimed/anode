import { useMutation } from "@tanstack/react-query";
import { nanoid } from "nanoid";
import { useTrpc } from "../../TrpcProvider";
import { Button } from "../../ui/button";
import { NotebookProcessed } from "../types";
import { toast } from "sonner";
import { trpcQueryClient } from "@/lib/trpc-client";
import { useState } from "react";
import { Spinner } from "../../ui/Spinner";

export const DebugNotebooks = ({
  notebooks,
}: {
  notebooks: NotebookProcessed[];
}) => {
  const trpc = useTrpc();
  const [processing, setProcessing] = useState(false);

  const deleteNotebookMutation = useMutation(
    trpc.deleteNotebook.mutationOptions()
  );

  const createNotebookMutation = useMutation(
    trpc.createNotebook.mutationOptions()
  );

  const createABunchOfNotebooks = async () => {
    setProcessing(true);
    for (let i = 0; i < 100; i++) {
      await createNotebookMutation.mutateAsync({
        title: `Debug Notebook ${nanoid(4)}`,
      });
    }
    toast.success("Created 100 notebooks");
    trpcQueryClient.invalidateQueries();
    setProcessing(false);
  };

  const deleteABunchOfNotebooks = async () => {
    setProcessing(true);
    for (let i = 0; i < notebooks.length; i++) {
      await deleteNotebookMutation.mutateAsync({
        nbId: notebooks[i].id,
      });
    }
    toast.success("Deleted all notebooks");
    trpcQueryClient.invalidateQueries();
    setProcessing(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border border-dotted border-black p-2">
      🐛 DEBUG:
      <Button onClick={createABunchOfNotebooks} disabled={processing}>
        Create 100 Notebooks
      </Button>
      <Button onClick={deleteABunchOfNotebooks} disabled={processing}>
        Delete All Notebooks
      </Button>
      {processing && <Spinner />}
    </div>
  );
};
