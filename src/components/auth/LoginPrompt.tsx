import React from "react";

interface LoginPromptProps {
  signIn: () => Promise<void>;
  register: () => Promise<void>;
}

const logoUrl = "/logo.svg";

const LoginPrompt: React.FC<LoginPromptProps> = ({ signIn, register }) => (
  <div className="auth-wrapper max-w-[400px] mx-auto flex flex-col items-center">
    <div className="heading flex items-center gap-2 mt-8">
      <img
        className="anaconda-logo h-[30px]"
        src={logoUrl}
        alt="logo"
      />
      <div className="app-name text-primary font-medium text-2xl">
        Anode Notebooks
      </div>
    </div>
    <div className="mt-8 w-full flex justify-center">
      <button
        className="sign-in-button flex items-center justify-center w-[218px] h-14 gap-3 bg-primary text-white rounded-md text-lg font-semibold cursor-pointer"
        onClick={signIn}
        data-qa-id="sign-in-button"
      >
        <span className="mr-2">Sign In</span>
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3h7v7"/><path d="M5 19l16-16"/></svg>
      </button>
    </div>
    <div className="text-muted-foreground mt-8 text-xs text-center text-gray-500 w-full">
      <p>Anode is a real-time collaborative notebook system.<br />Sign in with Anaconda to sync your work across devices.</p>
    </div>
    <div className="cta mt-5 text-center w-full">
      Don&apos;t have an account?
      <button
        onClick={register}
        className="bg-none border-none text-primary underline text-base font-medium ml-2 cursor-pointer inline-flex items-center gap-1"
        data-qa-id="registration-button"
      >
        Get Started
        <svg className="w-4 h-4 ml-[2px] relative -bottom-[2px] scale-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3h7v7"/><path d="M5 19l16-16"/></svg>
      </button>
    </div>
  </div>
);

export default LoginPrompt; 
