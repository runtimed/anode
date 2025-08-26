import { useEffect, useState } from "react";
import { useAuth as useOidcAuth } from "react-oidc-context";
import { UserManager } from "oidc-client-ts";
import { createOidcConfig } from "@/auth/oidc-config";

// Manual OIDC callback processing page
export const OidcCallbackPage: React.FC = () => {
  const auth = useOidcAuth();
  const [processing, setProcessing] = useState(false);
  const [processedCallback, setProcessedCallback] = useState(false);

  useEffect(() => {
    const processCallback = async () => {
      if (processing || processedCallback) return;

      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const state = urlParams.get("state");

      if (!code || !state) {
        console.log(
          "🔍 OidcCallbackPage: No callback params, redirecting home"
        );
        window.location.href = "/";
        return;
      }

      console.log("🔍 OidcCallbackPage: Processing callback manually", {
        hasCode: !!code,
        hasState: !!state,
        url: window.location.href,
      });

      setProcessing(true);
      setProcessedCallback(true);

      try {
        // Create UserManager with same config as AuthProvider
        const config = createOidcConfig();
        const userManager = new UserManager(config);

        console.log("🔍 OidcCallbackPage: Calling signinCallback");
        const user = await userManager.signinCallback();

        console.log("🔍 OidcCallbackPage: Callback successful", {
          user: user
            ? {
                profile: user.profile,
                hasAccessToken: !!user.access_token,
                hasIdToken: !!user.id_token,
              }
            : null,
        });

        // Clean URL and redirect
        window.history.replaceState({}, document.title, "/");
        window.location.href = "/";
      } catch (error) {
        console.error("🔍 OidcCallbackPage: Callback failed", error);
        // On error, redirect home
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      }
    };

    processCallback();
  }, [processing, processedCallback]);

  // Fallback for auth state changes from react-oidc-context
  useEffect(() => {
    if (
      auth.user &&
      auth.user.access_token &&
      auth.user.id_token &&
      !processing
    ) {
      console.log(
        "🔍 OidcCallbackPage: Auth context updated with user, redirecting"
      );
      window.location.href = "/";
    }
  }, [auth.user, processing]);

  // Fallback redirect after 15 seconds if stuck
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      console.warn("🔍 OidcCallbackPage: Fallback redirect after timeout");
      window.location.href = "/";
    }, 15000);

    return () => clearTimeout(fallbackTimer);
  }, []);

  if (auth.error) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold text-red-600">
            Authentication Error
          </div>
          <p className="mt-2 text-sm text-gray-600">{auth.error.message}</p>
          <button
            onClick={() => (window.location.href = "/")}
            className="mt-4 rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <div className="space-y-6 text-center">
        <div>
          <div className="text-foreground mb-2 text-lg font-semibold">
            Following the White Rabbit...
          </div>
          <p className="text-muted-foreground text-sm">
            Processing authentication
          </p>
          <div className="text-muted-foreground mt-4 text-xs">
            Processing: {processing ? "Yes" : "No"} | Authenticated:{" "}
            {auth.isAuthenticated ? "Yes" : "No"} | Has User:{" "}
            {auth.user ? "Yes" : "No"}
          </div>
        </div>
      </div>
    </div>
  );
};
