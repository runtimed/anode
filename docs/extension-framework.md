# Runt Backend Extensions
Runt works well in a standalone, local environment. It also needs to work well in an integrated production environment, including authentication, api key management, sharing resources and other permission management.

In order to accomplish this in a flexible manner, anode has an extension mechanism. The repository has a built-in implementation of this extension in [backend/local_extension](../backend/local_extension/), along with scripts to switch out the implementation at build time.


# Creating an extension
The backend interfaces are defined at https://github.com/runtimed/extensions.
Callers will import these interfaces and create their own implementation, such as this:
```ts
import { BackendExtension } from '@runtimed/extensions';
import apiKeyProvider from './api_key';

const extension: BackendExtension = {
  apiKey: apiKeyProvider,
};
export default extension;
```
This extension can be published as an NPM package, or any alternative mechanism of distribution as appropriate.

## Extension environment variables
The extension has access to the standard [ProviderEnv](https://github.com/runtimed/extensions/blob/main/src/providers/shared.ts#L9). However, if your extension needs custom variables, which are not generic to all extensions, we've provided the `EXTENSION_CONFIG` variable. This is intended to be a JSON string, which can contain any arbitrary data your extension needs

# Using a custom extension with Anode
Once you've built and published an extension, integration is simple:
1. Run `pnpm run set-extension your-package-name your-package-version`
2. Now you can use the other pnpm scripts as normal, such as `pnpm dev`, `pnpm build` etc.

## How it works
The extension mechansim takes advantage of vite/rollup's resolve alias mechanism. This allows you to rewrite `import x from myPackage` and have `myPackage` come from anywhere else you define.

In the product's source code, we use a dummy package name called `@runtimed/extension_impl`
```ts
import backendExtension from "@runtimed/extension_impl";
const { apiKey: apiKeyProvider } = backendExtension;
```

and that is resolved by default to `./backend/local_extension/index.ts` via this config option in
[vite.wrangler_config.ts](../vite.wrangler_config.ts)
```
"@runtimed/extension_impl": path.resolve(
  __dirname,
  "./backend/local_extension/index"
),
```

but it can be overriden by setting the same syntax to [extension_overrides.ts](../extension_overrides.ts)
The [set_extension.sh](../scripts/set_extension.sh) script does just that, making sure the overrides are correct.
