/**
 * Utility functions for handling unknown errors in a type-safe way
 */
/**
 * Safely extracts an error message from an unknown error type
 * @param error - The unknown error to extract message from
 * @returns A string error message
 */
export declare function getErrorMessage(error: unknown): string;
/**
 * Safely checks if an error is an instance of a specific error class
 * @param error - The unknown error to check
 * @param ErrorClass - The error class to check against
 * @returns true if error is instance of ErrorClass
 */
export declare function isErrorInstance<T extends Error>(error: unknown, ErrorClass: new (...args: any[]) => T): error is T;
/**
 * Wraps an unknown error in a standardized Error object
 * @param error - The unknown error to wrap
 * @param defaultMessage - Default message if error message cannot be extracted
 * @returns A proper Error instance
 */
export declare function wrapError(error: unknown, defaultMessage?: string): Error;
//# sourceMappingURL=error-utils.d.ts.map