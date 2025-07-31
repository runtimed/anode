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
import {
  removeStaticLoadingScreen,
} from "@/util/domUpdates";

interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
}

const AuthorizePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const prompt = searchParams.get("prompt");
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<RegisterFormData>({
    firstName: "",
    lastName: "",
    email: "",
  });

  useEffect(() => {
    if (prompt !== "login" && prompt !== "registration") {
      setError("Invalid prompt parameter. Must be 'login' or 'registration'.");
    }
  }, [prompt]);

  useEffect(() => {
    removeStaticLoadingScreen();
  });

  const handleInputChange =
    (field: keyof RegisterFormData) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));
    };

  if (error) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-8 flex items-center justify-center">
            <RuntLogo size="h-24 w-24" filterId="pixelate-error" />
          </div>
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
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex items-center justify-center">
          <RuntLogo size="h-24 w-24" filterId="pixelate-authorize" />
        </div>

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
              <form className="space-y-4">
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
                <p className="text-muted-foreground text-sm">
                  Login functionality is currently a stub. Click the button
                  below to proceed with the login flow.
                </p>
                <Button className="w-full">Continue to Login</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthorizePage;
