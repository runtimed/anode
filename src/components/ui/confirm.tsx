import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  useCallback,
  useState,
  createContext,
  useContext,
  ReactNode,
} from "react";

interface ConfirmOptions {
  title: string;
  description: ReactNode;
  actionButtonText: string;
  onConfirm: (() => void) | null;
}

interface ConfirmContextType {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  confirmOptions: ConfirmOptions;
  setConfirmOptions: (options: Partial<ConfirmOptions>) => void;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmOptions, setConfirmOptionsState] = useState<ConfirmOptions>({
    title: "",
    description: null,
    onConfirm: null,
    actionButtonText: "Delete",
  });

  const setConfirmOptions = useCallback((options: Partial<ConfirmOptions>) => {
    setConfirmOptionsState((prev) => ({ ...prev, ...options }));
  }, []);

  return (
    <ConfirmContext.Provider
      value={{
        isOpen,
        setIsOpen,
        confirmOptions,
        setConfirmOptions,
      }}
    >
      {children}
    </ConfirmContext.Provider>
  );
}

function useConfirmContext() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirmContext must be used within a ConfirmProvider");
  }
  return context;
}

export function Confirmer() {
  const { confirmOptions, isOpen, setIsOpen } = useConfirmContext();
  const { title, description, onConfirm, actionButtonText } = confirmOptions;

  const handleConfirm = () => {
    onConfirm?.();
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={handleCancel} showFocusRing>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {actionButtonText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function useConfirm() {
  const { setConfirmOptions, setIsOpen } = useConfirmContext();

  const confirm = useCallback(
    ({
      title,
      description,
      onConfirm,
      actionButtonText,
    }: {
      title: string;
      description: ReactNode | null;
      onConfirm: () => void;
      actionButtonText?: string;
    }) => {
      setConfirmOptions({
        title,
        description,
        onConfirm,
        actionButtonText: actionButtonText || "Delete",
      });
      setIsOpen(true);
    },
    [setConfirmOptions, setIsOpen]
  );

  return { confirm };
}

export function createDescription(toDelete: string) {
  return `Are you sure you want to delete "${toDelete}"? This action cannot be undone.`;
}
