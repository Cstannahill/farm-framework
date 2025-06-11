// packages/type-sync/src/errors.ts
export class TypeSyncError extends Error {
  constructor(
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "TypeSyncError";
  }
}
