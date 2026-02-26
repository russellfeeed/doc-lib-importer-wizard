

## Fuzzy Matching for WordPress DLP Document Duplicate Check

### Problem
The extracted standard number (e.g., `PD CLC/TS 50131-2-9:2016`) doesn't match the WordPress document title (e.g., `PD CLC TS 50131-2-9_2016`) because special characters differ -- slashes become spaces, colons become underscores, etc.

### Solution
Add a normalization function that strips/replaces special characters before comparing, so both strings reduce to the same canonical form for matching.

### Implementation

**File: `src/utils/wordpressUtils.ts`**

1. Add a `normalizeStandardNumber` helper function:
   - Remove or replace `/`, `\`, `:`, `_`, `-`, `.` and whitespace
   - Lowercase everything
   - Example: both `"PD CLC/TS 50131-2-9:2016"` and `"PD CLC TS 50131-2-9_2016"` normalize to `"pdclcts50131292016"`

2. Update the match logic in `checkExistingDlpDocument` (line 152) to use normalized comparison instead of `includes()`:
   - Normalize the incoming `standardNumber`
   - Normalize each `doc.title.rendered`
   - Match if the normalized title **contains** the normalized standard number

This is a single-file change of roughly 15 lines -- no new dependencies needed.

### Technical Detail

```text
function normalizeStandardNumber(str: string): string {
  return str
    .toLowerCase()
    .replace(/[\/\\:_\-.\s,]+/g, '')  // strip all punctuation/whitespace
    .trim();
}
```

Matching becomes:
```text
const normalizedSearch = normalizeStandardNumber(standardNumber);
const match = data.find((doc) =>
  normalizeStandardNumber(doc.title?.rendered || '').includes(normalizedSearch)
);
```

