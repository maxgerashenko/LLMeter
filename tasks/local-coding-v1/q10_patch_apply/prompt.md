Write `patcher.py` with a function `apply_patch(original, patch)` that applies a unified diff to a text and returns the new text, and an exception class `PatchError`.

**Lines.** `original` is split into lines, each keeping its line ending. Only `\n` is a line ending. The last line may have no `\n`; that difference matters (see the marker below).

**Patch format.**

- Lines before the first hunk header are ignored (for example `--- a/file` and `+++ b/file`, or `diff ...`).
- A hunk header is `@@ -OLD_START,OLD_COUNT +NEW_START,NEW_COUNT @@`, optionally followed by more text. `,COUNT` may be left out and then means 1.
- Hunk body lines start with a space (context), `-` (remove) or `+` (add). The body ends when the hunk has its `OLD_COUNT` old lines (context + remove) and `NEW_COUNT` new lines (context + add).
- A line `\ No newline at end of file` directly after a body line means that body line has no `\n`. Every other body line ends with `\n`.
- A completely empty line inside a hunk body counts as an empty context line.
- After the last hunk, blank lines are allowed and ignored.

A patch that breaks these rules (bad header, wrong line counts, unknown line prefix, text other than blank lines after a complete hunk, no hunk at all) raises `ValueError`. Check the whole patch before applying anything.

**Applying.** Hunks are applied in order. For each hunk:

- The *old block* is its context and remove lines; the *new block* is its context and add lines.
- The nominal position is line `OLD_START` (1-based) of the original. If `OLD_COUNT` is 0, the hunk inserts after line `OLD_START` instead (`OLD_START` 0 means at the very start).
- The old block must match original lines exactly, including whether the line ends with `\n`. It may not overlap or come before lines already used by an earlier hunk.
- The expected position is the nominal position plus the drift of the previous hunk (how many lines later, or earlier, the previous hunk was really found; 0 for the first hunk).
- Search order: try the expected position, then 1 line earlier, 1 line later, 2 earlier, 2 later, and so on, over the whole rest of the file.
- If nothing matches, retry the whole search with fuzz 1 and then fuzz 2. Fuzz `f` ignores up to `f` context lines at the start of the hunk and up to `f` at the end (only context lines, never add or remove lines, and only as many as there are). Ignored lines are not matched and the original's lines in those places are kept as they are; the expected position moves down by the number of lines ignored at the start. A hunk with `OLD_COUNT` 0 uses no search and no fuzz: it is placed at its expected position, limited to the range from the end of the previous hunk to the end of the file.
- If the hunk still does not match, raise `PatchError` whose attribute `hunk` is the 1-based number of that hunk. Nothing is returned in that case.

Return the patched text.
