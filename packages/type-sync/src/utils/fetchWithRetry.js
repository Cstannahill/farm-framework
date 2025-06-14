export async function fetchWithRetry(url, tries = 3, sleep = (ms) => new Promise((r) => setTimeout(r, ms))) {
    for (let i = 1; i <= tries; i++) {
        try {
            const res = await fetch(url);
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            return await res.json();
        }
        catch (error) {
            if (i === tries) {
                throw new Error(`Failed after ${tries} attempts: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
            await sleep(500 * i); // exponential backoff
        }
    }
}
//# sourceMappingURL=fetchWithRetry.js.map