import { ArrowLeft, ArrowUp } from "lucide-react";
import React, { RefObject, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useScroll } from "react-use";

import { CustomLiveStoreProvider } from "../../../livestore/index.js";
import { HtmlRuntimeManager } from "../../../runtime/managers/HtmlRuntimeManager.js";
import { LoadingState } from "../../loading/LoadingState.js";

import { NotebookContent } from "../../notebook/NotebookContent.js";
import { NotebookSidebar } from "../../notebook/NotebookSidebar.js";

import { useIsMobile } from "@/hooks/use-mobile.js";
import { ChatModeProvider } from "@/hooks/useChatMode.js";
import { Button } from "../../ui/button.js";
import { SharingModal } from "../SharingModal.js";
import type { NotebookProcessed } from "../types.js";
import { useNavigateToCanonicalUrl, useNotebook } from "./helpers.js";
import { NotebookHeader } from "./NotebookHeader.js";

export const NotebookPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  if (!id) return <div>No notebook id</div>;

  return (
    <CustomLiveStoreProvider storeId={id}>
      <HtmlRuntimeManager notebookId={id}>
        <ChatModeProvider>
          <NotebookPageWithId id={id} />
        </ChatModeProvider>
      </HtmlRuntimeManager>
    </CustomLiveStoreProvider>
  );
};

function NotebookPageWithId({ id }: { id: string }) {
  const location = useLocation();
  // Get initial notebook data from router state (if navigated from creation)
  const initialNotebook = location.state?.initialNotebook as
    | NotebookProcessed
    | undefined;

  const { notebook, isLoading, error, refetch } = useNotebook(
    id,
    initialNotebook
  );

  if (isLoading && !initialNotebook) {
    return <LoadingState variant="fullscreen" message="Loading notebook..." />;
  }

  if (error || !notebook) {
    return <NotebookError error={error} />;
  }

  return (
    <NotebookPageWithIdAndNotebook notebook={notebook} refetch={refetch} />
  );
}

function NotebookPageWithIdAndNotebook({
  notebook,
  refetch,
}: {
  notebook: NotebookProcessed;
  refetch: () => void;
}) {
  useNavigateToCanonicalUrl(notebook);

  const isMobile = useIsMobile();
  const [isSharingModalOpen, setIsSharingModalOpen] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const nbContentScrollRef = useRef<HTMLDivElement>(null);

  const { y: scrollY } = useScroll(
    nbContentScrollRef as RefObject<HTMLElement>
  );
  const isScrolled = scrollY > 0;

  return (
    <div className="flex h-screen w-full">
      <NotebookSidebar
        notebook={notebook}
        onUpdate={refetch}
        onAiPanelToggle={setIsAiPanelOpen}
      />

      <div
        className={`flex flex-1 flex-col overflow-x-hidden pb-16 transition-all duration-200 lg:pb-0 ${
          isAiPanelOpen ? "lg:ml-[368px]" : "lg:ml-12"
        }`}
      >
        <NotebookHeader
          notebook={notebook}
          onTitleSaved={refetch}
          setIsSharingModalOpen={() => setIsSharingModalOpen(true)}
        />

        <div
          ref={nbContentScrollRef}
          className="w-full min-w-0 flex-1 overflow-y-scroll"
        >
          <div className="px-2 sm:mx-auto sm:px-4 xl:container">
            <NotebookContent />
            <div className="h-[70vh]"></div>
          </div>
        </div>
        {isScrolled && !isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              nbContentScrollRef.current?.scrollTo({ top: 0 });
            }}
            className="bg-background/50 absolute right-4 bottom-4 bg-white/50 backdrop-blur-xs"
          >
            <ArrowUp />
          </Button>
        )}
      </div>

      {/* Sharing Modal */}
      <SharingModal
        notebook={notebook}
        isOpen={isSharingModalOpen}
        onClose={() => setIsSharingModalOpen(false)}
        onUpdate={refetch}
      />
    </div>
  );
}

function NotebookError({
  error,
}: {
  error: { message: string } | null | undefined;
}) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center">
        <h1 className="mb-4 text-2xl font-bold text-red-600">
          {error ? "Error Loading Notebook" : "Notebook Not Found"}
        </h1>
        <p className="mb-6 text-gray-600">
          {error
            ? error.message
            : "The notebook you're looking for doesn't exist or you don't have access to it."}
        </p>
        <Link to="/nb">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Notebooks
          </Button>
        </Link>
      </div>
    </div>
  );
}
