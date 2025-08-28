import { useMutation } from "@tanstack/react-query";
import { nanoid } from "nanoid";
import { useTrpc } from "../TrpcProvider";
import { Button } from "../ui/button";
import { NotebookProcessed } from "./types";

export const DebugNotebooks = ({
  notebooks,
}: {
  notebooks: NotebookProcessed[];
}) => {
  const trpc = useTrpc();

  const deleteNotebookMutation = useMutation(
    trpc.deleteNotebook.mutationOptions()
  );

  const createNotebookMutation = useMutation(
    trpc.createNotebook.mutationOptions()
  );

  const createABunchOfNotebooks = async () => {
    for (let i = 0; i < 100; i++) {
      await createNotebookMutation.mutateAsync({
        title: `Debug Notebook ${nanoid(8)}`,
      });
    }
  };

  const deleteABunchOfNotebooks = async () => {
    for (let i = 0; i < notebooks.length; i++) {
      await deleteNotebookMutation.mutateAsync({
        nbId: notebooks[i].id,
      });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border border-dotted border-black p-2">
      🐛 DEBUG:
      <Button onClick={createABunchOfNotebooks}>Create 100 Notebooks</Button>
      <Button onClick={deleteABunchOfNotebooks}>Delete All Notebooks</Button>
    </div>
  );
};
