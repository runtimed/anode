import React, { useEffect, useState } from "react";
import { LogIn, ExternalLink } from "lucide-react";
import { getOpenIdService, RedirectUrls } from "../../services/openid";

const logoUrl = "/logo.svg";

interface LoginPromptProps {
  error: string | null;
  setError: (error: string | null) => void;
}

const LoginPrompt: React.FC<LoginPromptProps> = ({ error, setError }) => {
  const openIdService = getOpenIdService();
  const [redirectUrls, setRedirectUrls] = useState<RedirectUrls | null>(null);
  const [action, setAction] = useState<"login" | "registration" | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
    <div className="auth-wrapper mx-auto flex max-w-[400px] flex-col items-center">
      <div className="heading mt-8 flex items-center gap-2">
        <img className="anaconda-logo h-[30px]" src={logoUrl} alt="logo" />
        <div className="app-name text-primary text-2xl font-medium">
          Anode Notebooks
        </div>
      </div>
      <div className="mt-8 flex w-full justify-center">
        <button
          className="sign-in-button bg-primary flex h-14 w-[218px] cursor-pointer items-center justify-center gap-3 rounded-md text-lg font-semibold text-white"
          onClick={() => handler("login")}
          data-qa-id="sign-in-button"
          disabled={loading}
        >
          <span className="mr-2">Sign In</span>
          <LogIn className="h-5 w-5" />
        </button>
      </div>
      {error && (
        <div className="mt-4 w-full text-center">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}
      <div className="text-muted-foreground mt-8 w-full text-center text-xs text-gray-500">
        <p>
          Anode is a real-time collaborative notebook system.
          <br />
          Sign in with Anaconda to sync your work across devices.
        </p>
      </div>
      <div className="cta mt-5 w-full text-center">
        Don&apos;t have an account?
        <button
          onClick={() => handler("registration")}
          className="text-primary ml-2 inline-flex cursor-pointer items-center gap-1 border-none bg-none text-base font-medium underline"
          data-qa-id="registration-button"
          disabled={loading}
        >
          Get Started
          <ExternalLink className="relative -bottom-[2px] ml-[2px] h-4 w-4 scale-90" />
        </button>
      </div>
    </div>
  );
};

export default LoginPrompt;
