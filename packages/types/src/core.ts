/**
 * Core Framework Types
 */

export interface FrameworkCore {
  version: string;
  initialized: boolean;
}

export interface BinaryTemplate {
  loadBinaryTemplate(path: string): Promise<Buffer>;
}
