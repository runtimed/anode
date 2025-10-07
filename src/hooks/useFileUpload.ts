import { useCallback, useState } from "react";
import { useAuth } from "@/auth";
import { toast } from "sonner";

interface FileUploadOptions {
  notebookId: string;
  onFileUploaded?: (artifactId: string, fileName: string) => void;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const useFileUpload = ({
  notebookId,
  onFileUploaded,
}: FileUploadOptions) => {
  const { accessToken, isAuthenticated } = useAuth();
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = useCallback(
    async (file: File): Promise<string> => {
      console.log("uploadFile", file);
      if (!isAuthenticated) {
        const message = "User must be authenticated to upload files";
        toast.error(message);
        setIsUploading(false);
        throw new Error(message);
      }

      setIsUploading(true);
      await sleep(500);

      const response = await fetch("/api/artifacts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-notebook-id": notebookId,
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });

      if (!response.ok) {
        setIsUploading(false);
        const error = await response
          .json()
          .catch(() => ({ error: "Upload failed" }));
        toast.error(error.error || response.statusText);
        throw new Error(error.error || response.statusText);
      }

      const result = await response.json();
      console.log("result", result);

      setIsUploading(false);
      onFileUploaded?.(result.artifactId, file.name);
      return result.artifactId;
    },
    [accessToken, notebookId, isAuthenticated, onFileUploaded]
  );

  return {
    isUploading,
    uploadFile,
  };
};
