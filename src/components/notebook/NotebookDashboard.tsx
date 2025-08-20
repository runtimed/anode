import { trpc, trpcQueryClient } from "@/lib/trpc-client";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";

export const NotebookDashboard = () => {
  return (
    <div>
      NotebookDashboard
      <QueryClientProvider client={trpcQueryClient}>
        <NotebookDashboardContent />
      </QueryClientProvider>
    </div>
  );
};

const NotebookDashboardContent = () => {
  // const trpc = useTRPC(); // use `import { trpc } from './utils/trpc'` if you're using the singleton pattern
  const { data } = useQuery(trpc.userById.queryOptions("34"));

  return <div>{data?.givenName}</div>;
};

async function bla() {
  const user = await trpcQueryClient.getQueryData(trpc.userById.queryKey("34"));

  console.log(user);
}

bla();
