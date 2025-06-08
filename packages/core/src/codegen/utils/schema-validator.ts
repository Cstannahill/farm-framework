type OpenAPIV3 = any;

/**
 * Perform a lightweight check that the provided value resembles an OpenAPI v3
 * schema definition.
 *
 * @param schema - Potential schema object
 * @returns True if the object exposes required OpenAPI properties
 */

export function validateSchema(schema: unknown): boolean {
  return (
    typeof schema === "object" &&
    !!schema &&
    (schema as any).openapi !== undefined &&
    (schema as any).info !== undefined &&
    (schema as any).paths !== undefined
  );
}
