import React, { useEffect, useState } from "react";
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
      const url = action === "login" ? redirectUrls.loginUrl : redirectUrls.registrationUrl;
      setAction(null);
      setLoading(false);
      window.location.href = url.toString();
    }
  }, [action, redirectUrls]);

  const handler = (action: "login" | "registration") => {
    setAction(action);
    setLoading(true);
    if (error) {
      setError(null);
      openIdService.reset();
    }
  };

  return (<div className="auth-wrapper mx-auto flex max-w-[400px] flex-col items-center">
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
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 3h7v7" />
          <path d="M5 19l16-16" />
        </svg>
      </button>
    </div>
    {error && (
      <div className="mt-4 w-full text-center">
        <p className="text-red-500 text-sm">{error}</p>
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
        <svg
          className="relative -bottom-[2px] ml-[2px] h-4 w-4 scale-90"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 3h7v7" />
          <path d="M5 19l16-16" />
        </svg>
      </button>
    </div>
  </div>);
};

export default LoginPrompt;
