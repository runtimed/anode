import type { Plugin } from "vite";

interface EnvConfig {
  [key: string]: string;
}

const DEVELOPMENT_DEFAULTS: EnvConfig = {
  VITE_AUTH_URI: "http://localhost:8787/local_oidc",
  VITE_AUTH_CLIENT_ID: "local-anode-client",
  VITE_AUTH_REDIRECT_URI: "http://localhost:5173/oidc",
  VITE_LIVESTORE_SYNC_URL: "ws://localhost:8787",
  VITE_IFRAME_OUTPUT_URI: "http://localhost:8000",
  VITE_AUTH_TOKEN: "insecure-token-change-me",
  AUTH_TOKEN: "insecure-token-change-me",
};

const REQUIRED_ENV_VARS = Object.keys(DEVELOPMENT_DEFAULTS);

export function envValidationPlugin(): Plugin {
  return {
    name: "env-validation",
    config(config, { mode }) {
      const isProduction = mode === "production";
      const isDevelopment = mode === "development";

      if (isDevelopment) {
        // Apply defaults for development
        for (const [key, defaultValue] of Object.entries(
          DEVELOPMENT_DEFAULTS
        )) {
          if (!process.env[key]) {
            process.env[key] = defaultValue;
            console.log(
              `[env-validation] Setting default ${key}=${defaultValue}`
            );
          }
        }
      } else if (isProduction) {
        // Validate required env vars for production
        const missingVars: string[] = [];

        for (const key of REQUIRED_ENV_VARS) {
          if (!process.env[key]) {
            missingVars.push(key);
          }
        }

        if (missingVars.length > 0) {
          const errorMessage = `
[env-validation] Production build requires the following environment variables to be set:

${missingVars.map((v) => `  - ${v}`).join("\n")}

Please set these variables in your environment or in a .env.production file.

Example values:
${missingVars.map((v) => `  ${v}="${DEVELOPMENT_DEFAULTS[v]}"`).join("\n")}
`;
          throw new Error(errorMessage);
        }

        // Log validated env vars
        console.log(
          "[env-validation] Production environment variables validated:"
        );
        for (const key of REQUIRED_ENV_VARS) {
          // Log the key but mask the value for security
          const value = process.env[key]!;
          const masked =
            value.length > 8
              ? value.substring(0, 4) +
                "..." +
                value.substring(value.length - 4)
              : "***";
          console.log(`  ${key}=${masked}`);
        }
      }

      // Pass the env vars to Vite's define config
      return {
        define: {
          ...config.define,
          // Ensure env vars are available in the app
          ...Object.fromEntries(
            REQUIRED_ENV_VARS.filter((key) => process.env[key]).map((key) => [
              `import.meta.env.${key}`,
              JSON.stringify(process.env[key]),
            ])
          ),
        },
      };
    },
  };
}
