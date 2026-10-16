/** Keep a deployment/schema problem distinct from a missing textbook or bad PDF. */
export const SOURCE_LIBRARY_SETUP_MESSAGE =
  "The upload database update is pending. An administrator must finish upload setup before adding new books. Existing library reading and lesson generation do not require sign-in.";

type DatabaseError = { code?: string; message?: string; details?: string };

export function isSourceLibrarySetupError(error: unknown): boolean {
  const value = typeof error === "string" ? { message: error } : error as DatabaseError | null;
  const message = `${value?.message || ""} ${value?.details || ""}`;
  if (message.includes(SOURCE_LIBRARY_SETUP_MESSAGE)) return true;
  return /\b(source_kind|approved_by|approved_at)\b/i.test(message) &&
    (value?.code === "42703" || value?.code === "PGRST204" ||
      /does not exist|could not find|schema cache/i.test(message));
}

export function sourceLibraryError(error: DatabaseError): Error {
  return new Error(isSourceLibrarySetupError(error) ? SOURCE_LIBRARY_SETUP_MESSAGE :
    error.message || "The source library could not be read. Please try again.");
}
