import { useAuthenticatedUser } from "@/auth";
import { AuthGuard } from "@/auth/AuthGuard";
import { SimpleUserProfile } from "@/components/notebooks/SimpleUserProfile";
import { TrpcProvider, useTrpc } from "@/components/TrpcProvider";
import { Button } from "@/components/ui/button";
import { useAddCell } from "@/hooks/useAddCell";
import { CustomLiveStoreProvider } from "@/livestore";
import { useQuery, useStore } from "@livestore/react";
import {
  events,
  moveCellBetween,
  queries,
  queryDb,
  tables,
} from "@runtimed/schema";
import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import { useLocalStorage } from "react-use";

export const ReorderDemoPage = () => {
  return (
    <div>
      <AuthGuard>
        <SimpleUserProfile />
        <TrpcProvider>
          <InnerDemo />
        </TrpcProvider>
      </AuthGuard>
    </div>
  );
};

function InnerDemo() {
  const trpc = useTrpc();
  const createNotebookMutation = useMutation(
    trpc.createNotebook.mutationOptions()
  );

  const deleteNotebookMutation = useMutation(
    trpc.deleteNotebook.mutationOptions()
  );

  const [nbId, setNbId] = useLocalStorage<string>("last-demo-nb");

  if (nbId === undefined || nbId === "") {
    console.log("Creating new nb", nbId);
    return (
      <div>
        <Button
          onClick={async () => {
            const result = await createNotebookMutation.mutateAsync({
              title: "Test Nb",
            });
            if (result === null) {
              alert("There was an error creating notebook");
              return;
            }
            setNbId(result.id);
            document.location.search = `?nbId=${result.id}`;
          }}
        >
          Create Nb
        </Button>
      </div>
    );
  }

  return (
    <div>
      NB ID: {nbId}
      <Button
        onClick={async () => {
          setNbId("");
          await deleteNotebookMutation.mutateAsync({ nbId });
        }}
      >
        Delete Nb
      </Button>
      <CustomLiveStoreProvider storeId={nbId}>
        <NbDemo />
      </CustomLiveStoreProvider>
    </div>
  );
}

function NbDemo() {
  const userId = useAuthenticatedUser();
  const { store } = useStore();
  const cellReferences = useQuery(
    queryDb(
      tables.cells
        .select("id", "fractionalIndex", "cellType", "source")
        .orderBy("fractionalIndex", "asc"),
      { label: "cells.withIndices" }
    )
  );
  const moveLastCellToTop = useMoveLastCellToTop();

  const { addCell } = useAddCell();

  return (
    <div>
      <Button
        onClick={() => {
          const cellId = addCell(undefined, "sql", "after");
          store.commit(
            events.cellSourceChanged({
              id: cellId,
              source: cellReferences.length.toString(),
              modifiedBy: userId,
            })
          );
        }}
      >
        Add Cell
      </Button>
      <Button onClick={moveLastCellToTop}>Move Last Cell to Top</Button>
      {cellReferences.map((cell) => (
        <div key={cell.id}>
          <pre>{JSON.stringify(cell)}</pre>
        </div>
      ))}
    </div>
  );
}

export function useMoveLastCellToTop() {
  const { store } = useStore();
  const userId = useAuthenticatedUser();

  const moveLastCellToTop = useCallback(() => {
    const cellReferences = store.query(queries.cellsWithIndices$);
    const lastCell = cellReferences[cellReferences.length - 1];

    const moveEvent = moveCellBetween(
      lastCell,
      null,
      cellReferences[0],
      userId
    );
    if (moveEvent) {
      store.commit(moveEvent);
    }

    // const moveEvent = moveCellBetweenWithRebalancing(
    //   lastCell,
    //   null,
    //   cellReferences[0],
    //   cellReferences,
    //   userId
    // );
    // if (moveEvent.events) {
    //   moveEvent.events.forEach((event) => store.commit(event));
    // }
  }, [store, userId]);

  return moveLastCellToTop;
}
