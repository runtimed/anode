import { CustomLiveStoreProvider } from "@/components/livestore/CustomLiveStoreProvider.tsx";
import { LoadingScreen } from "@/components/loading/LoadingScreen";
import { NotebookApp } from "@/components/NotebookApp.tsx";
import { getStoreId } from "@/util/store-id.ts";
import React, { useState } from "react";

export const HomePage: React.FC = () => {
  const [liveStoreReady, setLiveStoreReady] = useState(false);

  return (
    <>
      <LoadingScreen liveStoreReady={liveStoreReady} />
      {/* Main app with LiveStore integration */}
      <CustomLiveStoreProvider
        storeId={getStoreId()}
        onLiveStoreReady={() => setLiveStoreReady(true)}
      >
        <NotebookApp />
      </CustomLiveStoreProvider>
    </>
  );
};
