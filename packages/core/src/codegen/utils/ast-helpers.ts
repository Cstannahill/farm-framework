// Placeholder for AST manipulation utilities

/**
 * Prepend an import statement to the provided TypeScript source string.
 *
 * @param source - Original source code
 * @param statement - Import statement to insert
 * @returns Modified source with the import prepended
 */
export function addImport(source: string, statement: string): string {
  return statement + "\n" + source;
}
