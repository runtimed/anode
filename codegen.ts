import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "./schema.graphql",
  documents: ["src/**/*.tsx", "src/**/*.ts"],
  generates: {
    "./src/generated/graphql.ts": {
      plugins: ["typescript", "typescript-operations", "typescript-urql"],
      config: {
        withHooks: true,
        withComponent: false,
        documentMode: "documentNode",
        skipTypename: false,
        dedupeOperationSuffix: true,
        dedupeFragments: true,
        useTypeImports: true,
        scalars: {
          ID: "string",
        },
      },
    },
  },
};

export default config;
