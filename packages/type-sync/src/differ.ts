// @farm/type-sync differ
import fs from 'fs-extra';
import path from 'path';
import { diffLines } from 'diff';

export class TypeDiffer {
  hasSchemaChanges(prev: any, next: any): boolean {
    return JSON.stringify(prev) !== JSON.stringify(next);
  }

  async compareDirectories(dirA: string, dirB: string) {
    const diffs: { file: string; message: string }[] = [];
    const filesA = await fs.readdir(dirA);
    for (const file of filesA) {
      const aPath = path.join(dirA, file);
      const bPath = path.join(dirB, file);
      if (!fs.existsSync(bPath)) {
        diffs.push({ file, message: 'missing in B' });
        continue;
      }
      const [aContent, bContent] = await Promise.all([
        fs.readFile(aPath, 'utf-8'),
        fs.readFile(bPath, 'utf-8'),
      ]);
      if (diffLines(aContent, bContent).some(d => d.added || d.removed)) {
        diffs.push({ file, message: 'content differs' });
      }
    }
    return diffs;
  }
}
