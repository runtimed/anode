import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, ExternalLink } from "lucide-react";
import { getOpenIdService, RedirectUrls } from "./openid";
import { redirectHelper } from "./redirect-url-helper";
import { getAuthProviderName } from "./auth-provider-name";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/Spinner";

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
  const navigate = useNavigate();
  const [redirectUrls, setRedirectUrls] = useState<RedirectUrls | null>(null);
  const [action, setAction] = useState<"login" | "registration" | null>(null);
  const [loading, setLoading] = useState(false);

  const providerName = getAuthProviderName(redirectUrls?.loginUrl);

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
        if (
          error.message.includes("unexpected response content-type") &&
          providerName === null
        ) {
          setError(
            "ALLOW_LOCAL_AUTH not enabled, or you should check that AUTH_ISSUER is set in your .dev.vars file"
          );
        } else {
          setError(error.message);
        }
        setLoading(false);
      },
    });

    return () => subscription.unsubscribe();
  }, [openIdService, error, setError, providerName]);

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

      redirectHelper.saveNotebookId();

      // Check if it's an internal route (local auth) or external URL
      const currentOrigin = window.location.origin;
      const targetOrigin = url.origin;

      if (currentOrigin === targetOrigin) {
        // Internal route - use React Router for smooth transition
        navigate(url.pathname + url.search);
      } else {
        // External URL - use window.location for full page navigation
        if ("startViewTransition" in document) {
          document.startViewTransition(() => {
            window.location.href = url.toString();
          });
        } else {
          window.location.href = url.toString();
        }
      }
    }
  }, [action, redirectUrls, navigate]);

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

  const signinText = providerName ? (
    <>
      <span>Sign In with</span>
      {/* https://css-tricks.com/snippets/css/prevent-long-urls-from-breaking-out-of-container/ */}
      <span
        className="whitespace-normal underline decoration-white/50 decoration-1 underline-offset-2"
        style={{ wordBreak: "break-word" }}
      >
        {providerName}
      </span>
    </>
  ) : (
    <>Sign In</>
  );

  return (
    <div className="auth-wrapper mx-auto flex max-w-[400px] flex-col items-center space-y-1">
      {/* Primary action button */}
      <div className="flex w-full justify-center">
        <Button
          size="xl"
          variant="success"
          className="group h-auto min-h-12 w-full flex-wrap items-center justify-center gap-1 p-2.5"
          onClick={() => handler("login")}
          onMouseEnter={() => onButtonHover?.(true)}
          onMouseLeave={() => onButtonHover?.(false)}
          data-qa-id="sign-in-button"
          disabled={loading}
        >
          {loading ? (
            <div className="size-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          ) : (
            <>
              {signinText}
              <LogIn
                className="size-5 transition-transform group-hover:translate-x-0.5"
                strokeWidth={2}
              />
            </>
          )}
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <div className="w-full rounded-md bg-red-50 p-3 text-center">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Secondary action */}
      <div className="text-center">
        <Button
          variant="link"
          size="xl"
          onClick={() => handler("registration")}
          onMouseEnter={() => onButtonHover?.(true)}
          data-qa-id="registration-button"
          disabled={loading}
        >
          {loading && action === "registration" ? (
            <>
              <Spinner size="md" className="text-black" />
              <span>Creating account...</span>
            </>
          ) : (
            <>
              <span>Create your account</span>
              {providerName && (
                <ExternalLink
                  strokeWidth={2}
                  className="h-4 w-4 transition-transform"
                />
              )}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default LoginPrompt;
