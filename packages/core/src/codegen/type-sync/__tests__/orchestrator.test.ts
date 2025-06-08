import { describe, it, expect } from 'vitest';
import { TypeSyncOrchestrator } from '../orchestrator';

describe('TypeSyncOrchestrator', () => {
  it('initializes without error', async () => {
    const orchestrator = new TypeSyncOrchestrator();
    await orchestrator.initialize({
      apiUrl: 'http://localhost:8000',
      outputDir: '.farm/test',
      features: { client: true, hooks: true, streaming: false },
    });
    expect(true).toBe(true);
  });
});
