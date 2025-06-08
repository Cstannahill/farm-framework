type OpenAPIV3 = any;

export function validateSchema(schema: unknown): boolean {
  return (
    typeof schema === "object" &&
    !!schema &&
    (schema as any).openapi !== undefined &&
    (schema as any).info !== undefined &&
    (schema as any).paths !== undefined
  );
}
