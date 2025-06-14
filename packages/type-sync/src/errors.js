// packages/type-sync/src/errors.ts
export class TypeSyncError extends Error {
    details;
    constructor(message, details) {
        super(message);
        this.details = details;
        this.name = "TypeSyncError";
    }
}
//# sourceMappingURL=errors.js.map