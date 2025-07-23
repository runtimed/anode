import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getOpenIdService } from "../../services/openid";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

// Ignore all problems with the react lifecycle
// by treating the redirect as a global flag, outside of react
let didRedirect = false;

const AuthRedirect: React.FC = () => {
  const openIdService = getOpenIdService();
  const [error, setError] = useState<Error | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!didRedirect) {
      didRedirect = true;
      openIdService.handleRedirect(new URL(window.location.href)).subscribe({
        complete: () => {
          navigate("/", { replace: true });
        },
        error: (error) => {
          setError(error)
        }
      });
    }
  });

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Login Error</CardTitle>
            <CardDescription>
              There was a problem during the authentication process.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
              {error.message || `Unknown error: ${error}`}
            </div>
            <Button
              onClick={() => navigate("/", { replace: true })}
              className="w-full"
            >
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Logging in...</p>
      </div>
    </div>
  );
};

export default AuthRedirect;
