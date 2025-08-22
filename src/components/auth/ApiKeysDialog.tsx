import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Key,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  ShieldOff,
  Plus,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useApiKeys, type ApiKey, Scope } from "../../hooks/useApiKeys.js";

interface ApiKeysDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const maskApiKey = (apiKey: string) => {
  if (apiKey.length <= 16) return apiKey;
  return `${apiKey.slice(0, 8)}${"•".repeat(apiKey.length - 16)}${apiKey.slice(-8)}`;
};

const ApiKeyItem: React.FC<{
  apiKey: ApiKey;
  keyValue?: string;
  onRevoke: (keyId: string) => Promise<void>;
  onDelete: (keyId: string) => Promise<void>;
  onCopy: (keyValue: string) => void;
}> = ({ apiKey, keyValue, onRevoke, onDelete, onCopy }) => {
  const [revealed, setRevealed] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleRevoke = async () => {
    setActionLoading("revoke");
    try {
      await onRevoke(apiKey.id);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    setActionLoading("delete");
    try {
      await onDelete(apiKey.id);
    } finally {
      setActionLoading(null);
    }
  };

  const displayKey = keyValue || "eyJ" + "•".repeat(32);
  const maskedKey = revealed && keyValue ? keyValue : maskApiKey(displayKey);

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Key className="text-muted-foreground h-4 w-4" />
            <span className="text-sm font-medium">
              {apiKey.name || "Runtime Agent Key"}
            </span>
            {apiKey.revoked && (
              <Badge variant="destructive" className="text-xs">
                Revoked
              </Badge>
            )}
          </div>
          <div className="text-muted-foreground text-xs">
            Expires: {formatDate(apiKey.expiresAt)}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {keyValue && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRevealed(!revealed)}
              className="h-6 w-6 p-0"
            >
              {revealed ? (
                <EyeOff className="h-3 w-3" />
              ) : (
                <Eye className="h-3 w-3" />
              )}
            </Button>
          )}
          {keyValue && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCopy(keyValue)}
              className="h-6 w-6 p-0"
            >
              <Copy className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      <div className="bg-muted max-h-20 overflow-y-auto rounded p-2 font-mono text-xs break-all">
        {maskedKey}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-xs">
          Scopes: {apiKey.scopes.join(", ")}
        </div>
        {!apiKey.revoked && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRevoke}
              disabled={actionLoading === "revoke"}
              className="text-destructive hover:text-destructive h-6 text-xs"
            >
              <ShieldOff className="mr-1 h-3 w-3" />
              Revoke
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={actionLoading === "delete"}
              className="text-destructive hover:text-destructive h-6 text-xs"
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Delete
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export const ApiKeysDialog: React.FC<ApiKeysDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const {
    createApiKey,
    listApiKeys,
    revokeApiKey,
    deleteApiKey,
    loading,
    error,
  } = useApiKeys();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const loadApiKeys = useCallback(async () => {
    try {
      const keys = await listApiKeys();
      setApiKeys(keys);
    } catch (err) {
      console.error("Failed to load API keys:", err);
    }
  }, [listApiKeys]);

  useEffect(() => {
    if (open) {
      loadApiKeys();
    }
  }, [open, loadApiKeys]);

  const handleCreateKey = async () => {
    try {
      // Create key that expires in 1 year
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      const keyValue = await createApiKey({
        scopes: [Scope.RuntRead, Scope.RuntExecute],
        expiresAt: expiresAt.toISOString(),
        name: "Runtime Agent Key",
        userGenerated: true,
      });

      setNewKeyValue(keyValue);
      await loadApiKeys();
    } catch (err) {
      console.error("Failed to create API key:", err);
    }
  };

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(text.slice(-4));
    setTimeout(() => setCopySuccess(null), 2000);
  }, []);

  const handleRevoke = async (keyId: string) => {
    await revokeApiKey(keyId);
    await loadApiKeys();
  };

  const handleDelete = async (keyId: string) => {
    await deleteApiKey(keyId);
    await loadApiKeys();
  };

  const handleCloseNewKey = () => {
    setNewKeyValue(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Keys
          </DialogTitle>
          <DialogDescription>
            Manage API keys for connecting runtime agents to your notebooks.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* New API Key Display */}
          {newKeyValue && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">
                    New API Key Created
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseNewKey}
                  className="h-6 w-6 p-0"
                >
                  ×
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-green-700">
                  Copy this key now. You won't be able to see it again.
                </p>

                <div className="flex items-center gap-2">
                  <div className="max-h-32 flex-1 overflow-y-auto rounded border bg-white p-2 font-mono text-xs break-all">
                    {newKeyValue}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(newKeyValue)}
                    className="shrink-0"
                  >
                    <Copy className="mr-1 h-3 w-3" />
                    Copy
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Copy Success Notification */}
          {copySuccess && (
            <div className="rounded border border-green-200 bg-green-100 p-2 text-sm text-green-800">
              API key ending in {copySuccess} copied to clipboard!
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 rounded border border-red-200 bg-red-100 p-2 text-sm text-red-800">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Create New Key */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Runtime Agent Keys</h3>
              <p className="text-muted-foreground text-sm">
                Keys for connecting external runtime agents
              </p>
            </div>
            <Button onClick={handleCreateKey} disabled={loading} size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Generate Key
            </Button>
          </div>

          {/* API Keys List */}
          {apiKeys.length > 0 ? (
            <div className="space-y-3">
              {apiKeys.map((apiKey) => (
                <ApiKeyItem
                  key={apiKey.id}
                  apiKey={apiKey}
                  keyValue={
                    apiKey.id === apiKeys.find((k) => k.id === apiKey.id)?.id
                      ? undefined
                      : undefined
                  }
                  onRevoke={handleRevoke}
                  onDelete={handleDelete}
                  onCopy={handleCopy}
                />
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground py-8 text-center">
              <Key className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>No API keys created yet</p>
              <p className="text-sm">Generate your first key to get started</p>
            </div>
          )}

          <Separator />

          {/* Usage Instructions */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Usage Instructions</h4>
            <div className="bg-muted space-y-2 rounded p-3 text-sm">
              <p>Set your API key as an environment variable:</p>
              <code className="bg-background block rounded border px-2 py-1 font-mono text-xs">
                export RUNT_API_KEY=your-api-key-here
              </code>
              <p>Then run the runtime command from your notebook.</p>
            </div>

            <div className="rounded border border-blue-200 bg-blue-50 p-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-800">Security Note</p>
                  <p className="text-blue-700">
                    Keep your API keys secure. Don't share them or commit them
                    to version control. Revoke keys immediately if they may have
                    been compromised.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
