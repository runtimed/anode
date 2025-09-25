import { useAuthenticatedUser } from "@/auth";
import { AuthGuard } from "@/auth/AuthGuard";
import { cellTypeStyles } from "@/components/notebook/cell/CellTypeButtons";
import { ExecutableCell } from "@/components/notebook/cell/ExecutableCell";
import { RuntimePanel } from "@/components/notebook/sidebar-panels/RuntimePanel";
import { useNotebook } from "@/components/notebooks/notebook/helpers";
import { TitleEditor } from "@/components/notebooks/notebook/TitleEditor";
import { SimpleUserProfile } from "@/components/notebooks/SimpleUserProfile";
import { TrpcProvider, useTrpc } from "@/components/TrpcProvider";
import { Button } from "@/components/ui/button";
import { useAddCell } from "@/hooks/useAddCell";
import { CustomLiveStoreProvider } from "@/livestore";
import { useQuery, useStore } from "@livestore/react";
import {
  cellTypes,
  events,
  moveCellBetween,
  queries,
  queryDb,
  tables,
} from "@runtimed/schema";
import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useCallback } from "react";
import { useLocalStorage } from "react-use";

export const ReorderDemoPage = () => {
  return (
    <div>
      <AuthGuard>
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
    <>
      <div className="sticky top-0 flex items-center gap-2 border-b border-gray-200 bg-white p-2">
        <NbTitle nbId={nbId} />
        ID: <pre className="text-xs">{nbId}</pre>
        <Button
          size="xs"
          variant="destructive"
          onClick={async () => {
            setNbId("");
            await deleteNotebookMutation.mutateAsync({ nbId });
          }}
        >
          Delete Nb
        </Button>
        <div className="flex-1" />
        <SimpleUserProfile />
      </div>
      <CustomLiveStoreProvider storeId={nbId}>
        <AddCellButtons />
        <div className="flex flex-col gap-2 p-2">
          <div className="max-w-lg rounded-md border border-gray-200 p-4">
            <RuntimePanelView nbId={nbId} />
          </div>
          <NbDemo />
        </div>
      </CustomLiveStoreProvider>
    </>
  );
}

function RuntimePanelView({ nbId }: { nbId: string }) {
  const { notebook, isLoading, refetch } = useNotebook(nbId);
  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!notebook) {
    return <div>Notebook not found</div>;
  }

  return <RuntimePanel notebook={notebook} onUpdate={refetch} />;
}

function NbTitle({ nbId }: { nbId: string }) {
  const { notebook, isLoading, refetch } = useNotebook(nbId);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!notebook) {
    return <div>Notebook not found</div>;
  }

  return (
    <TitleEditor notebook={notebook} onTitleSaved={refetch} canEdit={true} />
  );
}

const cellTypeStylesWithRaw = {
  ...cellTypeStyles,
  raw: "border-gray-300 focus-visible:border-gray-500 text-gray-600 hover:bg-gray-50 hover:text-gray-600 focus:bg-gray-50 focus-visible:ring-gray-100",
};

const cellReferences$ = queryDb(
  tables.cells
    .select("id", "fractionalIndex", "cellType", "source")
    .orderBy("fractionalIndex", "asc"),
  { label: "cells.withIndices" }
);

function AddCellButtons() {
  const cellReferences = useQuery(cellReferences$);
  const userId = useAuthenticatedUser();
  const { store } = useStore();
  const moveLastCellToTop = useMoveLastCellToTop();

  const { addCell } = useAddCell();

  return (
    <>
      {/* Add cell buttons */}
      <div className="sticky top-0 z-50 flex flex-wrap gap-1 border-b border-gray-200 bg-white p-2">
        {cellTypes.map((cellType) => (
          <Button
            variant="outline"
            className={cellTypeStylesWithRaw[cellType]}
            key={cellType}
            onClick={() => {
              const cellId = addCell(undefined, cellType, "after");
              store.commit(
                events.cellSourceChanged({
                  id: cellId,
                  source: cellReferences.length.toString(),
                  modifiedBy: userId,
                })
              );
            }}
          >
            <Plus className="h-3 w-3" /> {cellType}
          </Button>
        ))}
        <Button onClick={moveLastCellToTop}>Move Last Cell to Top</Button>
      </div>
    </>
  );
}

function NbDemo() {
  const cellReferences = useQuery(cellReferences$);

  return (
    <div>
      {/* Cell list */}
      <div className="relative flex flex-col gap-2">
        {cellReferences.map((cell) => (
          <div key={cell.id}>
            <Cell cell={cell} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Cell({
  cell,
}: {
  cell: {
    id: string;
    fractionalIndex: string | null;
    cellType: string;
    source: string;
  };
}) {
  const cell2 = useQuery(queries.cellQuery.byId(cell.id));

  if (!cell2) {
    console.warn("Asked to render a cell that does not exist");
    return null;
  }

  return (
    <div>
      {/* <pre>{JSON.stringify(cell)}</pre> */}
      <ExecutableCell cell={cell2} />
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
