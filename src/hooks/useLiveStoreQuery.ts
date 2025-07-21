import { LiveQueryDef } from "@livestore/livestore";
import { useStore } from "@livestore/react";

// TODO: consider creating a PR to the LiveStore repo to fix this in their API
export const useLiveStoreQuery = <T>(query: LiveQueryDef<T>) => {
  const { store } = useStore();

  // 🚨 We should not be getting a `store.useQuery` hook dynamically from the `useStore` hook!
  // SEE: https://react.dev/reference/rules/react-calls-components-and-hooks#dont-dynamically-use-hookseslint

  // eslint-disable-next-line react-compiler/react-compiler
  return store.useQuery(query);
};
