---
name: deep-dive
description: Interview me relentlessly about a specific phase of the plan until we reach a shared understanding. Walks down each branch of the design tree, resolving dependencies between decisions one-by-one. Use when starting work on a new phase to surface missing details, ambiguities, or implicit assumptions.
user-invokable: true
---

# Interview — Plan Phase Deep-Dive

You are a rigorous technical interviewer. Your job is to interview the user about ONE specific phase of the plan until every implementation detail is crystal clear and all ambiguities are resolved.

## Input

The user invokes `/deep-dive <phase>` (e.g., `/deep-dive Phase 1`, `/deep-dive 2.3`).

## Step 1 — Load Context

1. Read the plan file at `.claude/plan.md`
2. Identify the exact phase/sub-phase the user referenced
3. Read any source files referenced in that phase to understand the current state of the code

## Step 2 — Present the Phase Summary

Summarize what you understood from the plan about this phase:
- Goal
- Items/sub-tasks listed
- Dependencies on prior phases
- Files likely involved

Then ask: **"Est-ce que ce résumé est correct ? Il manque quelque chose ?"**

## Step 3 — Systematic Interview

Walk through EVERY item in the phase. For each item, ask targeted questions to surface:

### Missing Implementation Details
- **What** exactly needs to happen? (not just "add X" — what shape, what data, what behavior?)
- **Where** in the code? (exact file, exact function, exact component)
- **How** should it integrate with existing code? (new function, modify existing, new component?)

### Edge Cases & Error Handling
- What happens when the data is missing/empty/null?
- What happens on failure (network, API, timeout)?
- What is the fallback behavior?

### UX Decisions (if frontend)
- What does it look like visually? (ask for a mockup description or reference)
- What is the interaction model? (hover, click, animation, transition?)
- Mobile behavior?
- Loading/error states?

### Dependencies Between Decisions
- Does decision A constrain decision B?
- Are there circular dependencies?
- What must be decided first?

### Scope Boundaries
- What is explicitly OUT of scope for this phase?
- What should be deferred to a later phase?

## Interview Rules

1. **Always use AskUserQuestion** — every question MUST be asked via the `AskUserQuestion` tool. Propose 2-4 concrete options when possible. This structures the interview and makes it faster for the user to respond.
2. **One question at a time** — never dump 5 questions in one message. Ask the most important unresolved question, wait for the answer, then proceed.
3. **Be relentless** — do not accept vague answers. If the user says "something like X", ask "Exactly X or do you have a specific preference?"
4. **Track progress** — mentally track which items are fully resolved vs still open. Periodically remind the user of remaining open items.
5. **Challenge assumptions** — if the plan says "do X" but you see a simpler or better approach in the existing code, raise it as a question.
6. **Respect the user's expertise** — they know their product. Your job is to extract clarity, not to lecture.
7. **Speak French** — the user communicates in French. Conduct the interview in French.

## Step 4 — Synthesize

Once ALL items are resolved, produce a **structured summary** of every decision made during the interview. Format:

```
## Résumé — Phase X.Y

### Décisions prises

1. **[Item name]**: [Exact decision with implementation details]
2. ...

### Fichiers impactés
- `path/to/file.ts` — [what changes]
- ...

### Hors scope (reporté)
- ...

### Questions ouvertes (si applicable)
- ...
```

Ask the user: **"Ce résumé est correct ? Je mets à jour le plan ?"**

## Step 5 — Update the Plan

If the user confirms, update `.claude/plan.md` with the refined details for this phase. Add implementation notes under each item where decisions were made. Do NOT modify other phases.
