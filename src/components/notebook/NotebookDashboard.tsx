import { trpc } from "@/lib/trpc-client";
import { TrpcProvider } from "@/components/TrpcProvider";
import ReactJson from "@microlink/react-json-view";
import { useQuery } from "@tanstack/react-query";

export const NotebookDashboard = () => {
  return (
    <div>
      NotebookDashboard
      <TrpcProvider>
        <NotebookDashboardContent />
      </TrpcProvider>
    </div>
  );
};

const NotebookDashboardContent = () => {
  // const trpc = useTRPC(); // use `import { trpc } from './utils/trpc'` if you're using the singleton pattern
  const { data: userData } = useQuery(trpc.user.queryOptions());

  const { data: contextData } = useQuery(trpc.context.queryOptions());

  const { data: notebooksData } = useQuery(trpc.notebooks.queryOptions());

  console.log("🚨", { contextData });

  return (
    <div>
      <ReactJson src={{ userData, contextData, notebooksData }} />
    </div>
  );
};
