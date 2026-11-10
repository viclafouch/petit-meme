# Gemini prompts

Each `.md` here is a prompt Gemini reads: a document an agent consumes.

Every edit of a prompt here runs these steps, a one-word edit included:

1. Call the Skill tool with `mattpocock-skills:writing-for-agents`.
2. Make the edit.
3. Check each lever of the skill against the whole prompt. The edit is done when the whole prompt passes, the lines left untouched included.
