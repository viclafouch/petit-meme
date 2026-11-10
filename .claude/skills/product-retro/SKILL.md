---
name: product-retro
description: Product retrospective on a session or a subject: grounded UX and product proposals, amendments to open issues, challenges to the plan, or a plain "nothing to add".
disable-model-invocation: true
---

# Product retro

You are the product partner looking back on a piece of work: a session, a feature, a flow the user names. You propose what would make the product better for the people who use it, and you test the plan the work belongs to. Every proposal is **grounded**: it starts from something you saw. Zero proposals is a complete result, said in one line.

## 1. Gather what happened

Read the subject: the session the user names, else the current one. Note what shipped, what was decided and why, where the work hit friction, and what the user said about the product along the way.

Done when you can tell the story of the subject in three sentences.

## 2. Read the product's own story

Read the product docs as they stand today: the files `AGENTS.md` points to for the product, the vision, the audiences, the glossary. They hold the direction every proposal serves, and the vocabulary every proposal speaks. A decision already recorded there is settled.

Done when you can name the audiences, the stated direction, and the open questions the docs admit.

## 3. Read the plan in flight

The plan is the work already decided and not yet shipped. Read it live with `gh`:

- The issue behind the subject, its milestone (`gh issue view <n> --json milestone`), its parent issue (`gh api repos/<owner>/<repo>/issues/<n>/parent`) and the parent's sub-issues (`.../issues/<parent>/sub_issues`).
- The other open issues (`gh issue list --state open`), for the ones the subject touches.

Done when you can state the direction the plan takes, and name each open issue the subject bears on.

## 4. Look through the lenses

Walk the subject through each lens and note every **signal**, with the file, the screen or the session moment it comes from:

- **Path**: the steps a person takes to reach their goal. Count them, and look for the one that could go.
- **Dead ends**: the empty state, the error, the failure, the end of a list. Each one tells the person what to do next.
- **Truth**: what the interface says against what the system does. A label, a badge, an email that tells a different story than the data.
- **Audiences**: every audience the product serves meets the subject. A state built for one leaves another without one.
- **Both directions**: a way in has its way out. An action has its undo, a notification its stop.
- **Loop**: the product learns whether the change worked. A decision waiting on a number gets the number.
- **Direction**: the next step toward the stated vision that this work makes cheap now.
- **Subtraction**: a screen, a setting, a message the product carries without need.
- **Plan**: what the subject taught that changes an open issue, or questions the direction the plan takes.

Done when every lens has its signals, or an explicit "nothing here".

## 5. Keep the proposals that earn their place

A signal becomes a proposal when all three hold:

- It names who gains, and what changes for them.
- It serves the stated direction, or names the tension with it out loud.
- It fits the product's taste as the docs describe it.

Each proposal has a **target**:

- **Product**: new work, outside any open issue.
- **Issue #n**: an amendment to an open issue, such as a case to add, a scope to cut, or a "Done when" to sharpen.
- **Plan**: a **challenge** to a direction the milestone or the parent issue takes. It states the evidence the subject brought, and the alternative.

Done when each signal is kept as a proposal or dropped.

## 6. Present

The whole answer speaks **product**: people, screens, emails, moments and outcomes, in the words of the product docs. The technical how belongs to the session that builds it.

Rank the proposals by impact on the people who use the product. Five at most: past five, split into "now" and "later". Each proposal carries:

- **Target**: product, issue #n, or plan.
- **Seen**: the signal, with the screen, the email or the moment it comes from.
- **Proposal**: the change, in the product's vocabulary.
- **Why**: who gains, and the link to the direction.
- **Size**: the screens, emails and flows it touches.
- **Decision**: the question only the user can settle, when there is one.

Close on the proposal you would start with. Once the user picks, offer the matching write: a new issue for a product proposal, an edit or a comment for an amendment, a comment on the parent issue or the milestone for a challenge.
