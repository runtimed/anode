import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { RuntLogo } from "../logo";
import { removeStaticLoadingScreen } from "@/util/domUpdates";
import { useSpring, animated } from "@react-spring/web";

interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
}

const LOCAL_STORAGE_KEY = "local-auth-registration"; // Keep in sync with openid.ts

const AuthorizePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialPrompt = searchParams.get("prompt");
  const [prompt, setPrompt] = useState<string | null>(initialPrompt);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<RegisterFormData>({
    firstName: "",
    lastName: "",
    email: "",
  });

  const [userData, setUserData] = useState<RegisterFormData | null>(null);
  const [showContent, setShowContent] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Spring animations for smooth entry
  const logoSpring = useSpring({
    from: { opacity: 0, transform: "scale(0.9) translateY(-20px)" },
    to: {
      opacity: showContent ? 1 : 0,
      transform: showContent
        ? "scale(1) translateY(0px)"
        : "scale(0.9) translateY(-20px)",
    },
    config: { tension: 280, friction: 60 },
  });

  const cardSpring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: {
      opacity: showContent ? 1 : 0,
      transform: showContent ? "translateY(0px)" : "translateY(20px)",
    },
    config: { tension: 280, friction: 60 },
    delay: showContent ? 150 : 0,
  });

  useEffect(() => {
    const redirectUri = searchParams.get("redirect_uri");
    if (!redirectUri) {
      setError("Missing redirect_uri parameter");
      return;
    }

    try {
      const redirectUrl = new URL(redirectUri);
      const currentUrl = new URL(window.location.href);

      if (redirectUrl.hostname !== currentUrl.hostname) {
        setError("Invalid redirect_uri: must be same hostname");
        return;
      }
    } catch (error) {
      setError("Invalid redirect_uri format");
      return;
    }

    // Handle standard OIDC prompt parameters from react-oidc-context
    let normalizedPrompt = prompt;
    if (
      prompt === "login" ||
      prompt === "consent" ||
      prompt === "select_account"
    ) {
      // Standard OIDC login prompts - check if we have existing registration
      const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
      normalizedPrompt = savedData ? "login" : "registration";
    } else if (prompt === "registration") {
      normalizedPrompt = "registration";
    } else if (!prompt) {
      // No prompt specified - default behavior
      const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
      normalizedPrompt = savedData ? "login" : "registration";
    } else {
      setError("Invalid prompt parameter. Must be 'login' or 'registration'.");
      return;
    }

    setPrompt(normalizedPrompt);

    if (normalizedPrompt === "login") {
      const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!savedData) {
        setPrompt("registration");
      } else {
        const parsedData = JSON.parse(savedData) as RegisterFormData;
        setUserData(parsedData);
      }
    }
  }, [prompt, searchParams]);

  useEffect(() => {
    removeStaticLoadingScreen();
    // Trigger animations after a brief delay
    const timer = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleInputChange =
    (field: keyof RegisterFormData) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));
    };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formData));

    const redirectUri = searchParams.get("redirect_uri");
    const state = searchParams.get("state");

    const authCode = btoa(JSON.stringify(formData));

    const redirectUrl = new URL(redirectUri!);
    redirectUrl.searchParams.set("code", authCode);
    if (state) {
      redirectUrl.searchParams.set("state", state);
    }

    setIsNavigating(true);
    navigate(redirectUrl.pathname + redirectUrl.search, { replace: true });
  };

  const handleLogin = () => {
    const redirectUri = searchParams.get("redirect_uri");
    const state = searchParams.get("state");

    const authCode = btoa(JSON.stringify(userData));

    const redirectUrl = new URL(redirectUri!);
    redirectUrl.searchParams.set("code", authCode);
    if (state) {
      redirectUrl.searchParams.set("state", state);
    }

    setIsNavigating(true);
    navigate(redirectUrl.pathname + redirectUrl.search, { replace: true });
  };

  if (error) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center p-4">
        <div className="auth-content w-full max-w-md text-center">
          <animated.div
            className="mb-8 flex items-center justify-center"
            style={logoSpring}
          >
            <RuntLogo
              size="h-24 w-24"
              className="auth-logo"
              filterId="pixelate-error"
            />
          </animated.div>
          <animated.div style={cardSpring}>
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-destructive">Error</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-700">{error}</p>
                <Button
                  onClick={() => navigate("/", { replace: true })}
                  className="mt-4 w-full"
                  variant="outline"
                >
                  Go Home
                </Button>
              </CardContent>
            </Card>
          </animated.div>
        </div>
      </div>
    );
  }

  // Show loading state during navigation to prevent white flicker
  if (isNavigating) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <RuntLogo
            size="h-24 w-24 sm:h-32 sm:w-32"
            variant="portal"
            animated={true}
            className="mx-auto"
            filterId="pixelate-navigate"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <div className="auth-content w-full max-w-md text-center">
        <animated.div
          className="mb-8 flex items-center justify-center"
          style={logoSpring}
        >
          <RuntLogo
            size="h-24 w-24"
            className="auth-logo"
            filterId="pixelate-authorize"
          />
        </animated.div>

        <animated.div style={cardSpring}>
          <Card className="border-muted bg-card">
            <CardHeader>
              <CardTitle className="text-xl">
                {prompt === "registration" ? "Create Account" : "Sign In"}
              </CardTitle>
              <CardDescription>
                {prompt === "registration"
                  ? "Enter your details to get started locally"
                  : "Sign in to your account"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {prompt === "registration" ? (
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="firstName"
                        className="mb-1 block text-sm font-medium"
                      >
                        First Name
                      </label>
                      <Input
                        id="firstName"
                        type="text"
                        value={formData.firstName}
                        onChange={handleInputChange("firstName")}
                        required
                        placeholder="White"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="lastName"
                        className="mb-1 block text-sm font-medium"
                      >
                        Last Name
                      </label>
                      <Input
                        id="lastName"
                        type="text"
                        value={formData.lastName}
                        onChange={handleInputChange("lastName")}
                        required
                        placeholder="Rabbit"
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-1 block text-sm font-medium"
                    >
                      Email Address
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange("email")}
                      required
                      placeholder="white.rabbit@runt.run"
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Create Account
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  {userData ? (
                    <>
                      <p className="text-muted-foreground text-sm">
                        Logging in as{" "}
                        <strong>
                          {userData.firstName} {userData.lastName}
                        </strong>
                      </p>
                      <Button onClick={handleLogin} className="w-full">
                        Login
                      </Button>
                    </>
                  ) : (
                    <Button onClick={handleLogin} className="w-full">
                      Continue to Login
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </animated.div>
      </div>
    </div>
  );
};

export default AuthorizePage;
