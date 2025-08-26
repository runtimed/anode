import { useEffect } from "react";
import { useAuth as useOidcAuth } from "react-oidc-context";

// Simple OIDC callback page
export const OidcCallbackPage: React.FC = () => {
  const auth = useOidcAuth();

  useEffect(() => {
    if (auth.isAuthenticated) {
      console.log("🔍 OidcCallbackPage: Authenticated, redirecting to home");
      window.location.href = "/";
    }
  }, [auth.isAuthenticated]);

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
        </div>
      </div>
    </div>
  );
};
