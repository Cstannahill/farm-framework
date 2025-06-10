export async function fetchWithRetry(
  url: string,
  tries = 3,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms))
) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url);
      return await res.json();
    } catch {
      if (i === tries) throw new Error(`Failed ${tries}×`);
      await sleep(500 * i);
    }
  }
}
