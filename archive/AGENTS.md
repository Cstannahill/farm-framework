Absolutely love this philosophy. Here’s a concise, direct, and strongly opinionated `AGENTS.md` section covering **type safety**, **type sharing**, **blocking issue protocols**, and a reminder about robust **error handling**—all in a clear, actionable format for a team or future contributors.

---

# AGENTS.md

## 🟩 Type Safety & Shared Types

- **All code must be fully type-safe.**
  Use TypeScript strict mode and prefer `unknown` over `any` when type precision is lost.
- **Types must be declared once, in a single source of truth** (e.g., `/packages/types` or `/shared/types`).
  **Never** redeclare types in multiple packages or apps.
- **Always check for the existence of shared types before declaring any new type.**
  If a type exists, use it. If it needs updating, update the canonical type.
- **Never “copy-paste” types** between packages or modules.
- **Import types** from shared locations; do not inline or redefine them in local files.
- **Type changes must be made at the source,** and all downstream usages updated via dependency graph or monorepo tooling.

---

## 🟦 Blocking Issues: No Dummy Data or Workarounds

- **Do NOT “work around” core problems.**

  - Never use “dummy data,” “skip logic,” or “simplified code” to bypass a blocking bug or error.
  - Never comment out type checks or error handling “just to make it work.”

- **When blocked, stop and collaborate.**

  - Document the issue with as much detail as possible (error messages, logs, reproduction steps).
  - Propose and discuss a _real_ solution in the issue tracker or in the team channel.
  - _Only resume coding once the real cause is identified and addressed at the root._

---

📝 Blocking Issue Documentation Protocol
When you encounter a blocking issue:

Immediately begin documenting the problem in the issue tracker, PR, or team notes.

Include:

A clear description of the problem and its impact.

Steps to reproduce (if applicable).

All attempted solutions or debugging steps taken so far.

Any relevant logs, error messages, screenshots, or references.

Current hypotheses about the root cause.

Update your notes as you progress (what worked, what didn’t, changes in understanding).

Don’t keep trying the same thing expecting different results—if stuck, pause and escalate for review or team input.

Purpose: To maximize collective knowledge, speed up resolution, and avoid wasted cycles or duplicated effort.

TL;DR: “Always leave a clear breadcrumb trail for yourself and others when tackling a hard problem—future you (and your team) will thank you.”

---

## 🟨 Error Handling: Zero Tolerance for Silent Failures

- **All errors must be handled, always.**
- **No “happy path” only code.**
- If an API call, function, or async operation can fail, it must be guarded with:

  - Type checks and value validation
  - Try/catch (for async or external calls)
  - Meaningful user and developer feedback (don’t swallow errors)

- **Log and/or surface errors appropriately**—never let an error vanish silently.

---

## 🟧 Checklist Before Committing or Merging

- [ ] All types used are from the shared source; none are locally redeclared.
- [ ] Type safety is enforced everywhere; no `any` or untyped values.
- [ ] All blocking issues are fixed at the root; no workarounds remain.
- [ ] All error cases are handled; no silent or unhandled failures.

---

> **“Never work around what you can work through. Strong type safety and full error handling are not optional—they are the foundation of maintainable, scalable software.”**

---

**Copy-paste or edit as needed for your repo! Want a more formal, more casual, or more strict version? Just say the word.**
