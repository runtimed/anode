/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
  VITE_URI: string;
  VITE_IFRAME_OUTPUT_URI: string;
  VITE_AUTH_URI: string;
  VITE_AUTH_CLIENT_ID?: string;
  VITE_AUTH_REDIRECT_URI: string;
  VITE_LIVESTORE_URL?: string;
  VITE_RUNTIME_COMMAND?: string;
  VITE_GIT_COMMIT_HASH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
