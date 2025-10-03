import { TrpcProvider, useTrpc } from "@/components/TrpcProvider";
import { useQuery } from "@tanstack/react-query";

export const TrpcDemoPage = () => {
  return (
    <TrpcProvider>
      {" "}
      <InnerDemo />{" "}
    </TrpcProvider>
  );
};

function InnerDemo() {
  const trpc = useTrpc();

  const { data, isLoading, error } = useQuery(trpc.debug.queryOptions());

  return (
    <div>
      Trpc Demo Page
      <pre>{JSON.stringify(data, null, 2)}</pre>
      {isLoading && <div>Loading...</div>}
      {error && <div>Error: {error.message}</div>}
    </div>
  );
}
