import Ajv from "ajv";
import nbformatSchema from "@/data/nbformat.v4.schema.json";
import { JupyterNotebook } from "@/types/jupyter";

// Initialize AJV validator with nbformat schema
const ajv = new Ajv({
  schemaId: "$id",
  addUsedSchema: false,
  meta: true,
  validateSchema: false,
  strict: false,
});

const validateNotebook = ajv.compile(nbformatSchema);

/**
 * Validate notebook against Jupyter nbformat schema
 */
export function validateJupyterNotebook(notebook: JupyterNotebook): void {
  if (!validateNotebook(notebook)) {
    const errors =
      validateNotebook.errors
        ?.map((err: any) => `${err.instancePath || "root"}: ${err.message}`)
        .join(", ") || "Unknown validation error";
    throw new Error(
      `Failed to export a valid ipynb notebook. Validation errors: ${errors}`
    );
  }
}
