import {
  useFeatureFlag,
  useFeatureFlagContext,
} from "../contexts/FeatureFlagContext";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

export function FeatureFlagDemoPage() {
  const testFlagEnabled = useFeatureFlag("test-flag");
  const ipynbExportEnabled = useFeatureFlag("ipynb-export");
  const userPromptEnabled = useFeatureFlag("user-prompt");
  const { setFlag } = useFeatureFlagContext();

  const toggleTestFlag = () => {
    setFlag("test-flag", !testFlagEnabled);
  };

  const toggleIpynbExport = () => {
    setFlag("ipynb-export", !ipynbExportEnabled);
  };

  const toggleUserPrompt = () => {
    setFlag("user-prompt", !userPromptEnabled);
  };

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Feature Flag Demo</h1>
        <p className="text-muted-foreground">
          This page demonstrates the feature flag system. Toggle flags below to
          see them in action. Flags are stored in sessionStorage and persist
          across page reloads.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Test Flag Demo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Test Flag
              <span
                className={`rounded-full px-2 py-1 text-xs ${
                  testFlagEnabled
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                }`}
              >
                {testFlagEnabled ? "Enabled" : "Disabled"}
              </span>
            </CardTitle>
            <CardDescription>
              A demo flag to test the feature flag system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={toggleTestFlag}
              variant="outline"
              className="w-full"
            >
              {testFlagEnabled ? "Disable" : "Enable"} Test Flag
            </Button>

            {testFlagEnabled && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                <h4 className="mb-2 font-semibold text-green-800 dark:text-green-200">
                  🎉 Test Flag is Enabled!
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  This content only appears when the test-flag is enabled. You
                  can use this pattern to show/hide features conditionally.
                </p>
              </div>
            )}

            {!testFlagEnabled && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/20">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Test flag is disabled. Enable it to see the special content
                  above.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* IPYNB Export Flag */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              IPYNB Export
              <span
                className={`rounded-full px-2 py-1 text-xs ${
                  ipynbExportEnabled
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                }`}
              >
                {ipynbExportEnabled ? "Enabled" : "Disabled"}
              </span>
            </CardTitle>
            <CardDescription>
              Enable Jupyter notebook export functionality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={toggleIpynbExport}
              variant="outline"
              className="w-full"
            >
              {ipynbExportEnabled ? "Disable" : "Enable"} IPYNB Export
            </Button>
          </CardContent>
        </Card>

        {/* User Prompt Flag */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              User Prompt
              <span
                className={`rounded-full px-2 py-1 text-xs ${
                  userPromptEnabled
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                }`}
              >
                {userPromptEnabled ? "Enabled" : "Disabled"}
              </span>
            </CardTitle>
            <CardDescription>Enable user prompt functionality</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={toggleUserPrompt}
              variant="outline"
              className="w-full"
            >
              {userPromptEnabled ? "Disable" : "Enable"} User Prompt
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* SessionStorage Info */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>SessionStorage Information</CardTitle>
          <CardDescription>
            Feature flags are stored in sessionStorage with keys like
            "feature-flag-test-flag"
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">
              To manually set flags in the browser console:
            </p>
            <pre className="bg-muted overflow-x-auto rounded p-3 text-sm">
              {`// Enable test flag
sessionStorage.setItem('feature-flag-test-flag', 'true');

// Disable test flag  
sessionStorage.setItem('feature-flag-test-flag', 'false');

// Check current flags
Object.keys(sessionStorage)
  .filter(key => key.startsWith('feature-flag-'))
  .forEach(key => console.log(key, sessionStorage.getItem(key)));`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
