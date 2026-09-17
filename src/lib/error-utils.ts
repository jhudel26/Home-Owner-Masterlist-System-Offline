import { ZodError } from "zod";

/**
 * Safely extract a human-readable error message from unknown error types.
 * Eliminates the need for `catch (err: any)`.
 */
export function getErrorMessage(error: unknown): string {
  if (!error) {
    return "An unknown error occurred.";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof ZodError) {
    return error.issues.map((e) => e.message).join(", ");
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && "message" in error && typeof (error as Record<string, unknown>).message === "string") {
    return (error as Record<string, unknown>).message as string;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "An unexpected error occurred.";
  }
}

/**
 * Formats Zod validation errors into a key-value record for form fields.
 */
export function formatZodFieldErrors(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }
  return fieldErrors;
}