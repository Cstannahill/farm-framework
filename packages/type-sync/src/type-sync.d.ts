/**
 * Utility class used to detect schema changes between generations.
 */
export declare class TypeDiffer {
    /**
     * Determine if two JSON schema objects differ.
     */
    hasSchemaChanges(prev: any, next: any): boolean;
    /**
     * Produce a diff of files between two directories.
     */
    compareDirectories(dirA: string, dirB: string): Promise<{
        file: string;
        message: string;
    }[]>;
}
//# sourceMappingURL=type-sync.d.ts.map