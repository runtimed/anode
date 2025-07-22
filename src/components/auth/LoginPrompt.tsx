import React from "react";

interface LoginPromptProps {
  signIn: () => Promise<void>;
  register: () => Promise<void>;
}

const logoUrl = "/logo.svg";

const LoginPrompt: React.FC<LoginPromptProps> = ({ signIn, register }) => (
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
        onClick={signIn}
        data-qa-id="sign-in-button"
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
        onClick={register}
        className="text-primary ml-2 inline-flex cursor-pointer items-center gap-1 border-none bg-none text-base font-medium underline"
        data-qa-id="registration-button"
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
  </div>
);

export default LoginPrompt;
