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
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useApiKeys, type ApiKey } from "../../hooks/useApiKeys.js";

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

export const ApiKeysDialog: React.FC<ApiKeysDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { getUserKey, smartDeleteOrRevoke, loading, error } = useApiKeys();
  const [apiKey, setApiKey] = useState<ApiKey | null>(null);
  const [keyValue, setKeyValue] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isCreated, setIsCreated] = useState(false);

  const loadUserKey = useCallback(async () => {
    try {
      const result = await getUserKey();
      setApiKey(result.api_key);
      setKeyValue(result.key_value);
      setIsCreated(result.created);
      if (result.created && result.key_value) {
        setRevealed(true);
      }
    } catch (err) {
      console.error("Failed to load API key:", err);
      setApiKey(null);
      setKeyValue(null);
      setIsCreated(false);
    }
  }, [getUserKey]);

  useEffect(() => {
    if (open) {
      loadUserKey();
    } else {
      // Reset state when dialog closes
      setRevealed(false);
      setCopySuccess(false);
      setIsCreated(false);
    }
  }, [open, loadUserKey]);

  const handleCopy = useCallback(() => {
    if (keyValue) {
      navigator.clipboard.writeText(keyValue);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  }, [keyValue]);

  const handleRefresh = async () => {
    if (apiKey) {
      await smartDeleteOrRevoke(apiKey.id);
    }
    await loadUserKey();
  };

  const displayKey = keyValue && (apiKey ? "eyJ" + "•".repeat(32) : "");
  const shouldShowValue = revealed && keyValue;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Runtime API Key
          </DialogTitle>
          <DialogDescription>
            Your API key for connecting runtime agents to notebooks.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 rounded border border-red-200 bg-red-100 p-3 text-sm text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Copy Success Notification */}
          {copySuccess && (
            <div className="flex items-center gap-2 rounded border border-green-200 bg-green-100 p-3 text-sm text-green-800">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              API key copied to clipboard!
            </div>
          )}

          {/* API Key Display */}
          {apiKey ? (
            <div className="space-y-4">
              {isCreated && keyValue && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-800">
                      New API Key Created
                    </span>
                  </div>
                  <p className="text-sm text-green-700">
                    Copy this key now. You won't be able to see it again after
                    closing this dialog.
                  </p>
                </div>
              )}

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
                    <div className="text-muted-foreground text-xs">
                      Scopes: {apiKey.scopes.join(", ")}
                    </div>
                  </div>
                </div>

                {/* Key Value Display */}
                <div className="space-y-2">
                  <div className="bg-muted rounded p-3 font-mono text-xs break-all">
                    {shouldShowValue ? keyValue : displayKey}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {keyValue && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRevealed(!revealed)}
                          className="h-8 px-2"
                        >
                          {revealed ? (
                            <>
                              <EyeOff className="mr-1 h-3 w-3" />
                              Hide
                            </>
                          ) : (
                            <>
                              <Eye className="mr-1 h-3 w-3" />
                              Reveal
                            </>
                          )}
                        </Button>
                      )}
                      {keyValue && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopy}
                          className="h-8 px-2"
                        >
                          <Copy className="mr-1 h-3 w-3" />
                          Copy
                        </Button>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefresh}
                      disabled={loading}
                      className="h-8 px-2"
                    >
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Generate New
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <Key className="text-muted-foreground mx-auto mb-4 h-12 w-12 opacity-50" />
              <p className="text-muted-foreground mb-4">No API key found</p>
              <Button onClick={loadUserKey} disabled={loading}>
                <Key className="mr-2 h-4 w-4" />
                Create API Key
              </Button>
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
                    Keep your API key secure. Don't share it or commit it to
                    version control. Generate a new key immediately if it may
                    have been compromised.
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
