/**
 * Utility functions for handling unknown errors in a type-safe way
 */
/**
 * Safely extracts an error message from an unknown error type
 * @param error - The unknown error to extract message from
 * @returns A string error message
 */
export function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === "string") {
        return error;
    }
    if (error && typeof error === "object" && "message" in error) {
        return String(error.message);
    }
    return "An unknown error occurred";
}
/**
 * Safely checks if an error is an instance of a specific error class
 * @param error - The unknown error to check
 * @param ErrorClass - The error class to check against
 * @returns true if error is instance of ErrorClass
 */
export function isErrorInstance(error, ErrorClass) {
    return error instanceof ErrorClass;
}
/**
 * Wraps an unknown error in a standardized Error object
 * @param error - The unknown error to wrap
 * @param defaultMessage - Default message if error message cannot be extracted
 * @returns A proper Error instance
 */
export function wrapError(error, defaultMessage = "An error occurred") {
    if (error instanceof Error) {
        return error;
    }
    const message = getErrorMessage(error);
    return new Error(message || defaultMessage);
}
//# sourceMappingURL=error-utils.js.map