import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getOpenIdService } from "@/auth/openid";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  updateLoadingStage,
  removeStaticLoadingScreen,
} from "@/util/domUpdates";
import { Home, AlertCircle } from "lucide-react";
import { RuntLogo } from "@/components/logo";
import { redirectHelper } from "@/auth/redirect-url-helper";

const OidcCallbackPage: React.FC = () => {
  const openIdService = getOpenIdService();
  const [error, setError] = useState<Error | null>(null);
  const [isDirectAccess, setIsDirectAccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Remove the static loading screen so our component UI is visible
    updateLoadingStage("checking-auth");
    removeStaticLoadingScreen();

    // Check if this is a legitimate OIDC callback
    const urlParams = new URLSearchParams(window.location.search);
    const hasCode = urlParams.has("code");
    const hasState = urlParams.has("state");

    if (!hasCode || !hasState) {
      // User directly navigated to /oidc without being redirected from auth provider
      setIsDirectAccess(true);
      return;
    }

    // Legitimate OIDC callback - process it
    const subscription = openIdService.handleRedirect().subscribe({
      complete: () => {
        redirectHelper.navigateToSavedNotebook(navigate);
      },
      error: (error) => {
        setError(error);
      },
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [openIdService, navigate]);

  // Direct access case - show informative message
  if (isDirectAccess) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          {/* Logo section matching login page */}
          <div className="mb-8 flex items-center justify-center">
            <RuntLogo size="h-24 w-24" filterId="pixelate-direct-access" />
          </div>

          <Card className="border-muted bg-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2 text-xl">
                <AlertCircle className="text-muted-foreground h-5 w-5" />
                Lost in the Matrix?
              </CardTitle>
              <CardDescription className="text-base">
                You've stumbled upon a secret portal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Armed with no <code>state</code> and no <code>code</code>, this
                page does nothing for you
              </p>
              <Button
                onClick={() => navigate("/", { replace: true })}
                variant="outline"
                className="w-full"
              >
                <Home className="mr-2 h-4 w-4" />
                Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error case - authentication failed
  if (error) {
    // Check if this is a configuration error
    const isConfigError = error.message?.includes(
      "Authentication not configured"
    );

    // Show developer-friendly message for configuration errors
    if (isConfigError) {
      return (
        <div className="bg-background flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-md text-center">
            {/* Logo section */}
            <div className="mb-8 flex items-center justify-center">
              <RuntLogo size="h-24 w-24" filterId="pixelate-auth-error" />
            </div>

            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-amber-900">
                  Missing Authentication Config
                </CardTitle>
                <CardDescription>
                  Local development setup required
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md bg-white p-3 font-mono text-xs text-amber-800">
                  <div>Missing environment variables:</div>
                  <div className="mt-2">VITE_AUTH_URI</div>
                  <div>VITE_AUTH_CLIENT_ID</div>
                </div>
                <p className="text-muted-foreground text-sm">
                  Check your <code>.env</code> file or see the project README
                  for setup instructions.
                </p>
                <Button
                  onClick={() => navigate("/", { replace: true })}
                  variant="outline"
                  className="w-full"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Home
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-background flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          {/* Logo section */}
          <div className="mb-8 flex items-center justify-center">
            <RuntLogo size="h-24 w-24" filterId="pixelate-config-error" />
          </div>

          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-destructive">
                Oops, Something Went Wrong
              </CardTitle>
              <CardDescription>
                Something went wrong during authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md bg-white p-3 text-sm text-red-700">
                {error.message === "invalid response encountered"
                  ? "The authentication link may have expired or there was an issue with the authentication service. Please try again."
                  : error.message || `Authentication error: ${error}`}
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => {
                    // Clear auth state and try again
                    openIdService.reset();
                    navigate("/", { replace: true });
                  }}
                  className="w-full bg-[rgb(8,202,74)] text-white hover:bg-[rgb(7,180,66)]"
                >
                  Start Over
                </Button>
                <Button
                  onClick={() => navigate("/", { replace: true })}
                  variant="outline"
                  className="w-full"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Loading state - processing authentication
  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <div className="space-y-6 text-center">
        {/* Animated logo */}
        <div className="flex items-center justify-center">
          <RuntLogo
            size="h-20 w-20"
            animation="animate-pulse"
            filterId="pixelate-loading"
          />
        </div>
        <div>
          <div className="text-foreground mb-2 text-lg font-semibold">
            Following the White Rabbit...
          </div>
          <p className="text-muted-foreground text-sm">
            Preparing your notebook in just a moment
          </p>
        </div>
      </div>
    </div>
  );
};

export default OidcCallbackPage;
