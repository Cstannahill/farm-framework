# FEATURE PLAN : 1.2 Assistant‑UI Integration

\*Professional chat UI baked into FARM with **zero custom wiring\***

---

## 1. Why this matters

|                   |                                                                                                                                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Impact**        | **High** – instantly gives every FARM app a polished chat/assistant interface that rivals commercial SaaS dashboards.                                                      |
| **Pain solved**   | Teams currently hack together ad‑hoc chat UIs or postpone them entirely. Shipping a first‑class, theme‑ready component removes days of work from every AI‑centric project. |
| **Strategic fit** | Aligns perfectly with FARM’s “AI‑first” promise: local Ollama in dev, cloud providers in prod **and** a turnkey UI on top.                                                 |

---

## 2. Deliverables

1. **`farm add ui assistant` CLI command** (alias: `farm add ui chat`)
2. Automatic **package installation** and **Tailwind preset injection**
3. Generated source files:

   ```
   apps/web/src/pages/AssistantChat.tsx
   apps/web/src/hooks/useFarmAssistant.ts
   apps/web/src/providers/AssistantProvider.tsx
   ```

4. **API proxy route** (`/api/assistant`) that pipes to existing FastAPI → `apps/api/src/routes/ai.py`
5. Playground example in **`examples/assistant-chat`**
6. Docs page in FARM docs site under **“UI Drops › Assistant‑UI”**

---

## 3. Current state snapshot

- **Backend** – `/apps/api/src/ai/router.py` already exposes `POST /chat` through the generic `useAIChat` hook.
- **Frontend** – `apps/web` has primitive `AIChat.tsx`; no markdown rendering, no tool‑calling UI.
- **Monorepo tooling** – `packages/cli` generator utilities (`file-generator`, `installPackages`) are battle‑tested from feature 1.1.
- **Styling** – Tailwind + ShadCN installed; Mermaid & Recharts present, so markdown+code highlighting libs are acceptable additions.

---

## 4. High‑level architecture

```mermaid
flowchart LR
  subgraph CLI
      A[add‑ui.ts] --installs--> P[NPM packages]
      A --generates--> F1[AssistantProvider.tsx]
      A --> F2[AssistantChat.tsx]
      A --> F3[useFarmAssistant.ts]
      A --touch--> Config[tailwind.config.ts]
      A --create--> R[api/assistant.ts (proxy)]
  end
  F2 --> "@assistant-ui/react::Thread"
  F3 --> useAIChat --> FastAPI[/apps/api/ai/]
  FastAPI --> Ollama[(Dev : Ollama)] & OpenAI[(Prod : OpenAI)]
```

- **Runtime provider** – encapsulates assistant runtime so any page/component can opt‑in by wrapping in `<AssistantProvider/>`.
- **Local vs Remote routing** – `useFarmAssistantRuntime` bridges `@assistant-ui/react`’s `useLocalRuntime` with FARM’s `useAIChat`, preserving multi‑provider switching already implemented in core package.

---

## 5. CLI flow (pseudo)

```ts
// packages/cli/src/commands/add-ui.ts
await installPackages([
  "@assistant-ui/react",
  "@assistant-ui/react-tailwind",
  "@assistant-ui/react-markdown", // auto‑added
  "remark-gfm", // markdown tables, task‑lists, etc.
]);

await addToTailwindConfig(`
  require('@assistant-ui/react-tailwind')
`);

generateFile("apps/web/src/providers/AssistantProvider.tsx", providerTpl);
generateFile("apps/web/src/hooks/useFarmAssistant.ts", hookTpl);
generateFile("apps/web/src/pages/AssistantChat.tsx", pageTpl);

await addApiProxyRoute("/api/assistant", {
  target: "http://localhost:8000/chat",
  changeOrigin: true,
});
```

---

## 6. Generated files (key excerpts)

### `AssistantProvider.tsx`

```tsx
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useFarmAssistantRuntime } from "../hooks/useFarmAssistant";

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const runtime = useFarmAssistantRuntime();
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
```

### `AssistantChat.tsx`

```tsx
import { Thread } from "@assistant-ui/react";
import { makeMarkdownText } from "@assistant-ui/react-markdown";

const MarkdownText = makeMarkdownText(); // GitHub‑style MD

export default function AssistantChat() {
  return (
    <div className="h-screen flex flex-col bg-background">
      <Thread
        assistantMessage={{ components: { Text: MarkdownText } }}
        className="flex-1"
      />
    </div>
  );
}
```

### `useFarmAssistant.ts`

```tsx
import { useLocalRuntime } from "@assistant-ui/react";
import { useAIChat } from "@farm/ai-hooks";

export function useFarmAssistantRuntime() {
  const farmChat = useAIChat(); // provider‑aware hook

  return useLocalRuntime({
    async onNew(message) {
      const response = await farmChat.send({
        messages: [{ role: "user", content: message.content }],
      });

      return {
        id: response.id,
        role: "assistant",
        content: [{ type: "text", text: response.content }],
      };
    },
  });
}
```

---

## 7. Testing & QA matrix

| Layer          | Test type   | Tooling      | Success criteria                                       |
| -------------- | ----------- | ------------ | ------------------------------------------------------ |
| CLI            | Unit        | Vitest       | `farm add ui assistant` exits 0, files generated       |
| UI             | E2E         | Playwright   | User can send/receive messages, markdown renders       |
| API            | Contract    | Schemathesis | `/chat` proxy returns 200 + schema‑valid body          |
| Perf           | Bench       | Lighthouse   | Thread page stays under **75 CLS**, **1.75 LCP**       |
| Cross‑provider | Integration | Vitest + msw | Switching `OPENAI_API_KEY` on/off falls back to Ollama |

---

## 8. Documentation updates

- **`docs/quickstart/chat-ui.mdx`** – 5‑minute guide
- **CLI reference** – new section under **UI Drops**
- **API docs** – add `/chat` proxy note + provider switching diagram
- **Changelog** – `feat(cli): add assistant‑ui integration`

---

## 9. Roll‑out plan

|  When      |  Step                                                      |
| ---------- | ---------------------------------------------------------- |
| **Day 0**  | Merge feature branch → `next`                              |
| **Day 1**  | Publish `@farm/*` packages **v0.4.0** with UI dependencies |
| **Day 2**  | Tweet + Discord announcement, call for testers             |
| **Week 1** | Collect feedback, patch bugs → **v0.4.1**                  |
| **Week 2** | Promote to **latest** tag, update starter template         |

---

## 10. Success metrics

- **Time‑to‑chat‑UI:** ≤ **60 seconds** from `farm add ui assistant` to functional UI
- **Adoption:** ≥ **70 %** of new example repos use AssistantChat page within one month
- **Bug reports:** < 3 critical issues first fortnight
- **DX NPS:** +20 uplift in developer survey compared to 0.3.x baseline

---

## 11. Risks & mitigations

| Risk                                                 | Mitigation                                               |
| ---------------------------------------------------- | -------------------------------------------------------- |
| Package version drift (`@assistant-ui` beta changes) | Pin minor versions; nightly CI verifies build            |
| Tailwind plugin conflicts                            | Namespaced preset, documented overrides                  |
| Providers returning streaming chunks > 64 KB         | Chunk slicing utility already exists in `@farm/ai-hooks` |

---

## 12. Next steps checklist (owner ↔ due)

- [ ] **CLI** – scaffold generator code (Alice ↔ 06/10)
- [ ] **Proxy route** – add to dev‑server orchestration (Ben ↔ 06/10)
- [ ] **Playwright tests** – baseline scenarios (Cara ↔ 06/11)
- [ ] **Docs** – quick‑start draft (DevRel ↔ 06/12)
- [ ] **Release** – cut v0.4.0 alpha (Maintainers ↔ 06/13)

---

### _“Ship the UI, not just the API.”_ – With this drop, FARM projects feel complete out‑of‑the‑box, giving developers an immediate, delightful conversation interface while the framework continues to handle the heavy AI lifting under the hood.
