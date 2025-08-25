import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, hasAuthParams } from "react-oidc-context";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  updateLoadingStage,
  removeStaticLoadingScreen,
} from "../../util/domUpdates";
import { Home, AlertCircle } from "lucide-react";
import { RuntLogo } from "../logo";
import { redirectHelper } from "./redirect-url-helper";

const AuthRedirect: React.FC = () => {
  const auth = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    updateLoadingStage("checking-auth");
    removeStaticLoadingScreen();
  }, []);

  React.useEffect(() => {
    if (auth.isAuthenticated) {
      redirectHelper.navigateToSavedNotebook(navigate);
    }
  }, [auth.isAuthenticated, navigate]);

  // Check if this is a legitimate OIDC callback
  const isCallback = hasAuthParams();
  console.log("🔐 AuthRedirect: hasAuthParams check", {
    isCallback,
    currentUrl: window.location.href,
    searchParams: Object.fromEntries(
      new URLSearchParams(window.location.search)
    ),
  });

  // Direct access case - no auth params
  if (!isCallback) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
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

  // Add auth state debugging
  console.log("🔐 AuthRedirect: Current auth state", {
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    hasError: !!auth.error,
    error: auth.error?.message,
    hasUser: !!auth.user,
    activeNavigator: auth.activeNavigator,
  });

  // Error case
  if (auth.error) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-8 flex items-center justify-center">
            <RuntLogo size="h-24 w-24" filterId="pixelate-auth-error" />
          </div>

          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-destructive">
                Authentication Error
              </CardTitle>
              <CardDescription>
                Something went wrong during authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md bg-white p-3 text-sm text-red-700">
                {auth.error.message || "An authentication error occurred"}
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => auth.signinRedirect()}
                  className="w-full bg-[rgb(8,202,74)] text-white hover:bg-[rgb(7,180,66)]"
                >
                  Try Again
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

  // Loading state - OIDC callback processing
  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <div className="space-y-6 text-center">
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

export default AuthRedirect;
