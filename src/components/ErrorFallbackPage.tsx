import { FallbackProps } from "react-error-boundary";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Copy,
  RefreshCw,
  Home,
  ExternalLink,
} from "lucide-react";

export const ErrorFallbackPage = (props: Partial<FallbackProps>) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Detect error type and extract information
  const getErrorInfo = (error: unknown) => {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack || "",
      };
    }

    if (typeof error === "string") {
      return {
        name: "String",
        message: error,
        stack: "",
      };
    }

    if (typeof error === "object" && error !== null) {
      // Check for Promise
      if (
        error instanceof Promise ||
        (typeof error === "object" && "then" in error)
      ) {
        return {
          name: "Promise",
          message: "A Promise was thrown instead of being awaited",
          stack: "",
        };
      }

      // Check for objects with message property
      if ("message" in error && typeof error.message === "string") {
        return {
          name: error.constructor?.name || "Object",
          message: error.message,
          stack:
            "stack" in error && typeof error.stack === "string"
              ? error.stack
              : "",
        };
      }

      // Generic object
      return {
        name: error.constructor?.name || "Object",
        message: JSON.stringify(error, null, 2),
        stack: "",
      };
    }

    // Primitive types (number, boolean, etc.)
    return {
      name: typeof error,
      message: String(error),
      stack: "",
    };
  };

  const { name, message, stack } = getErrorInfo(props.error);

  const handleCopyError = async () => {
    const errorInfo = `${name}: ${message}\n\n${stack}`;
    try {
      await navigator.clipboard.writeText(errorInfo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy error details:", err);
    }
  };

  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = "/";
  };

  const handleReportIssue = () => {
    const errorInfo = `**Error Type:** ${name}\n**Message:** ${message}\n\n**Stack Trace:**\n\`\`\`\n${stack}\n\`\`\``;
    const issueUrl = `https://github.com/runtimed/intheloop/issues/new?title=${encodeURIComponent(`Error: ${message}`)}&body=${encodeURIComponent(errorInfo)}`;
    window.open(issueUrl, "_blank");
  };

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Main Error Alert */}
        <Alert variant="destructive" className="border-red-200">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-lg font-semibold">
            Something went wrong
          </AlertTitle>
          <AlertDescription className="mt-2 text-sm">
            {message}
          </AlertDescription>
        </Alert>

        {/* Error Details Card */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <Card>
            <CardHeader>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-0 font-normal hover:bg-transparent"
                >
                  <div className="text-left">
                    <CardTitle>Error Details</CardTitle>
                    <CardDescription>
                      Technical information about the error
                    </CardDescription>
                  </div>
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </CardHeader>

            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="mb-2 text-sm font-medium">Error Type</h4>
                  <code className="bg-muted rounded px-2 py-1 text-sm">
                    {name}
                  </code>
                </div>

                <Separator />

                <div>
                  <h4 className="mb-2 text-sm font-medium">Message</h4>
                  <p className="text-muted-foreground bg-muted rounded border-l-4 border-red-500 p-3 text-sm">
                    {message}
                  </p>
                </div>

                {stack && (
                  <>
                    <Separator />
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="text-sm font-medium">Stack Trace</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyError}
                          className="h-7 px-2"
                        >
                          <Copy className="mr-1 h-3 w-3" />
                          {copied ? "Copied!" : "Copy"}
                        </Button>
                      </div>
                      <pre className="bg-muted max-h-64 overflow-auto rounded border p-3 text-xs">
                        {stack}
                      </pre>
                    </div>
                  </>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Recovery Actions */}
        <Card>
          <CardHeader>
            <CardTitle>What can you do?</CardTitle>
            <CardDescription>
              Try these options to recover from the error
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={handleReload} className="flex-1">
                <RefreshCw className="mr-2 h-4 w-4" />
                Reload Page
              </Button>
              <Button
                variant="outline"
                onClick={handleGoHome}
                className="flex-1"
              >
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Button>
            </div>

            <Button
              variant="outline"
              onClick={handleReportIssue}
              className="w-full"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Report Issue on GitHub
            </Button>

            <div className="text-muted-foreground space-y-2 text-sm">
              <p>• Try refreshing the page to see if the error resolves</p>
              <p>• Check your network connection</p>
              <p>
                • If the problem persists, the error details above can help with
                debugging
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
