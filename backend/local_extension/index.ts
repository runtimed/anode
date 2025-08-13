import type { BackendExtension } from "@runtimed/extensions";
import apiKeyProvider from "./api_key_provider";

export const extension: BackendExtension = {
  apiKey: apiKeyProvider,
};

export default extension;
