import Ajv, { ErrorObject } from "ajv";
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
 * Custom error type for notebook validation failures
 */
export class NotebookValidationError extends Error {
  readonly validationErrors: ErrorObject[];

  constructor(validationErrors: ErrorObject[]) {
    const message = "Couldn't export a valid ipynb notebook.";
    super(message);
    this.name = "NotebookValidationError";
    this.validationErrors = validationErrors;
  }
}

/**
 * Validate notebook against Jupyter nbformat schema
 */
export function validateJupyterNotebook(notebook: JupyterNotebook): void {
  if (!validateNotebook(notebook)) {
    throw new NotebookValidationError(validateNotebook.errors || []);
  }
}
