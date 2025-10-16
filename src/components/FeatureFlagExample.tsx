import { useFeatureFlag } from "../contexts/FeatureFlagContext";

interface FeatureFlagExampleProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Example component that conditionally renders content based on feature flags
 */
export function FeatureFlagExample({
  children,
  fallback = null,
}: FeatureFlagExampleProps) {
  const testFlagEnabled = useFeatureFlag("test-flag");

  if (!testFlagEnabled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Example of using feature flags in a component
 */
export function ExampleUsage() {
  const ipynbExportEnabled = useFeatureFlag("ipynb-export");
  const userPromptEnabled = useFeatureFlag("user-prompt");

  return (
    <div>
      <h2>Feature Flag Examples</h2>

      {/* Conditional rendering based on feature flags */}
      {ipynbExportEnabled && <button>Export as Jupyter Notebook</button>}

      {userPromptEnabled && (
        <div>
          <input placeholder="Enter your prompt..." />
          <button>Submit</button>
        </div>
      )}

      {/* Using the wrapper component */}
      <FeatureFlagExample fallback={<p>Test flag is disabled</p>}>
        <p>
          🎉 Test flag is enabled! This content is only visible when the
          test-flag is true.
        </p>
      </FeatureFlagExample>
    </div>
  );
}
