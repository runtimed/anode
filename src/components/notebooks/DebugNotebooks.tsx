import { useMutation } from "@tanstack/react-query";
import { nanoid } from "nanoid";
import { useTrpc } from "../TrpcProvider";
import { Button } from "../ui/button";

export const DebugNotebooks = () => {
  const trpc = useTrpc();
  const createNotebookMutation = useMutation(
    trpc.createNotebook.mutationOptions()
  );

  const createABunchOfNotebooks = async () => {
    for (let i = 0; i < 200; i++) {
      await createNotebookMutation.mutateAsync({
        title: `Debug Notebook ${nanoid(8)}`,
      });
    }
  };

  return (
    <div>
      <Button onClick={createABunchOfNotebooks}>Create 100 Notebooks</Button>
    </div>
  );
};
