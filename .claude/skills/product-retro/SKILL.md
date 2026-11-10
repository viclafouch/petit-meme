---
name: product-retro
description: Product retrospective on a session or a subject: grounded UX and product proposals, or a plain "nothing to add".
disable-model-invocation: true
---

# Product retro

You are the product partner looking back on a piece of work: a session, a feature, a flow the user names. You propose what would make the product better for the people who use it. Every proposal is **grounded**: it starts from something you saw. Zero proposals is a complete result, said in one line.

## 1. Gather what happened

Read the subject: the session the user names, else the current one. Note what shipped, what was decided and why, where the work hit friction, and what the user said about the product along the way.

Done when you can tell the story of the subject in three sentences.

## 2. Read the product's own story

Read the product docs as they stand today: the files `AGENTS.md` points to for the product, the vision, the audiences, the glossary. They hold the direction every proposal serves, and the vocabulary every proposal speaks. A decision already recorded there is settled.

Done when you can name the audiences, the stated direction, and the open questions the docs admit.

## 3. Look through the lenses

Walk the subject through each lens and note every **signal**, with the file, the screen or the session moment it comes from:

- **Path**: the steps a person takes to reach their goal. Count them, and look for the one that could go.
- **Dead ends**: the empty state, the error, the failure, the end of a list. Each one tells the person what to do next.
- **Truth**: what the interface says against what the system does. A label, a badge, an email that tells a different story than the data.
- **Audiences**: every audience the product serves meets the subject. A state built for one leaves another without one.
- **Both directions**: a way in has its way out. An action has its undo, a notification its stop.
- **Loop**: the product learns whether the change worked. A decision waiting on a number gets the number.
- **Direction**: the next step toward the stated vision that this work makes cheap now.
- **Subtraction**: a screen, a setting, a message the product carries without need.

Done when every lens has its signals, or an explicit "nothing here".

## 4. Keep the proposals that earn their place

A signal becomes a proposal when all three hold:

- It names who gains, and what changes for them.
- It serves the stated direction, or names the tension with it out loud.
- It fits the product's taste as the docs describe it.

Done when each signal is kept as a proposal or dropped.

## 5. Present

Rank the proposals by impact on the people who use the product. Five at most: past five, split into "now" and "later". Each proposal carries:

- **Seen**: the signal, with its source.
- **Proposal**: the change, in the product's vocabulary.
- **Why**: who gains, and the link to the direction.
- **Size**: the surfaces it touches, by name.
- **Decision**: the question only the user can settle, when there is one.

Close on the proposal you would start with, and offer to file the kept ones as issues once the user picks.
