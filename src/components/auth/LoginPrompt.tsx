import React, { useEffect, useState } from "react";
import { LogIn, ExternalLink } from "lucide-react";
import { getOpenIdService, RedirectUrls } from "../../services/openid";

// DEV MODE: Design testing states
const DESIGN_TEST_MODE = {
  enabled: false,
  state: "normal" as "normal" | "loading" | "error",
  errorMessage:
    "Authentication service temporarily unavailable. Please try again.",
};

interface LoginPromptProps {
  error: string | null;
  setError: (error: string | null) => void;
  onButtonHover?: (hovered: boolean) => void;
}

const LoginPrompt: React.FC<LoginPromptProps> = ({
  error,
  setError,
  onButtonHover,
}) => {
  const openIdService = getOpenIdService();
  const [redirectUrls, setRedirectUrls] = useState<RedirectUrls | null>(null);
  const [action, setAction] = useState<"login" | "registration" | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Skip real auth service in design test mode
    if (DESIGN_TEST_MODE.enabled) {
      setRedirectUrls({
        loginUrl: new URL("http://localhost:3000/login"),
        registrationUrl: new URL("http://localhost:3000/register"),
      });
      if (DESIGN_TEST_MODE.state === "loading") {
        setLoading(true);
      } else if (DESIGN_TEST_MODE.state === "error") {
        setError(DESIGN_TEST_MODE.errorMessage);
      }
      return;
    }

    error; // Because the subscription dies on error,
    // we need to listen to when that value changes (e.g. on reset)
    // in order to re-subscribe. TL;DR this variable is needed
    // to force the useEffect dependencies to change
    const subscription = openIdService.getRedirectUrls().subscribe({
      next: (urls: RedirectUrls) => {
        setError(null);
        setRedirectUrls(urls);
      },
      error: (error) => {
        setError(error.message);
        setLoading(false);
      },
    });

    return () => subscription.unsubscribe();
  }, [openIdService, error, setError]);

  useEffect(() => {
    if (action && redirectUrls) {
      // The user has clicked the button, and the urls have been loaded
      // (in either order), and now it's time to trigger a redirect
      // Note that generally calling setState within a useEffect risks an
      // infinite re-render loop. However, in this case we're calling setAction(false)
      // and the the only way that becomes true is on user click
      // (Additionally we're also navigating away from the page, sooo...)
      const url =
        action === "login"
          ? redirectUrls.loginUrl
          : redirectUrls.registrationUrl;
      setAction(null);
      setLoading(false);
      window.location.href = url.toString();
    }
  }, [action, redirectUrls]);

  const handler = (action: "login" | "registration") => {
    // In design test mode, just simulate loading
    if (DESIGN_TEST_MODE.enabled) {
      setLoading(true);
      setTimeout(() => setLoading(false), 2000);
      return;
    }

    setAction(action);
    setLoading(true);
    if (error) {
      // There was a previous error, but now the user has clicked the button again
      // Telling the openIdService to reset will cause getRedirectUrls to clear its state
      // and be open to trying again.
      // However, we _also_ need to kick that off by re-subscribing.
      // So, it's important that we both setError(null) (which will re-trigger the useEffect subscription)
      // and also reset() which will cause the openidService to re-set.
      setError(null);
      openIdService.reset();
    }
  };

  return (
    <div className="auth-wrapper mx-auto flex max-w-[400px] flex-col items-center space-y-8">
      {/* Primary action button */}
      <div className="flex w-full justify-center">
        <button
          className="group flex h-12 w-full max-w-[280px] cursor-pointer items-center justify-center gap-3 rounded-lg bg-[rgb(8,202,74)] text-base font-semibold text-white transition-all duration-200 hover:bg-[rgb(7,180,66)] active:bg-[rgb(6,160,59)] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => handler("login")}
          onMouseEnter={() => onButtonHover?.(true)}
          onMouseLeave={() => onButtonHover?.(false)}
          data-qa-id="sign-in-button"
          disabled={loading}
        >
          {loading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          ) : (
            <>
              <span>Sign In with Anaconda</span>
              <LogIn className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="w-full rounded-md bg-red-50 p-3 text-center">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Secondary action */}
      <div className="text-center">
        <button
          onClick={() => handler("registration")}
          onMouseEnter={() => onButtonHover?.(true)}
          onMouseLeave={() => onButtonHover?.(false)}
          className="text-primary hover:text-primary/80 group inline-flex cursor-pointer items-center gap-1.5 border-none bg-none text-base font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          data-qa-id="registration-button"
          disabled={loading}
        >
          <span>Create your account</span>
          <ExternalLink className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      </div>
    </div>
  );
};

export default LoginPrompt;
