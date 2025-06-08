import type { OpenAPIV3 } from 'openapi-types';

export function validateSchema(schema: unknown): schema is OpenAPIV3.Document {
  return (
    typeof schema === 'object' &&
    !!schema &&
    (schema as any).openapi !== undefined &&
    (schema as any).info !== undefined &&
    (schema as any).paths !== undefined
  );
}
