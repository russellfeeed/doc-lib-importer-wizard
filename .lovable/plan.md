

## Fix: Preserve Original Case in CSV File URLs

### Problem
The CSV generates **lowercase** filenames in URLs (e.g., `bs-iso-310002018-risk-management-guidelines.pdf`), but WordPress preserves the **original case** when storing uploaded files (e.g., `BS-ISO-310002018-Risk-management-Guidelines.pdf`). On a case-sensitive Linux server, this causes 404 errors.

### Root Cause
In `src/utils/csvUtils.ts` line 242, the URL filename is forced to `.toLowerCase()`. The WordPress uploader (line 228 of the edge function) sends the filename with original case, and WordPress preserves it.

### Fix

**`src/utils/csvUtils.ts`** (~line 242) — Remove `.toLowerCase()` from the standards URL filename sanitization. Keep the other sanitization (spaces→hyphens, strip colons, collapse multiple hyphens) but preserve original case:

```typescript
// Before
urlFileName = uploadName
  .toLowerCase()
  .replace(/\s+/g, '-')
  .replace(/[:]/g, '')
  .replace(/[^a-z0-9.\-]/g, '-')
  .replace(/-+/g, '-');

// After
urlFileName = uploadName
  .replace(/\s+/g, '-')
  .replace(/[:]/g, '')
  .replace(/[^a-zA-Z0-9.\-]/g, '-')
  .replace(/-+/g, '-');
```

Note the character class also changes from `[^a-z0-9.\-]` to `[^a-zA-Z0-9.\-]` to preserve uppercase letters.

**Also update `src/components/document/editor/DocumentContent.tsx`** — The `getFileUrlPlaceholder` and `getDirectUrlPlaceholder` functions apply the same lowercase sanitization to URL previews. Update these to preserve case as well.

Single-file logic change in two files, no structural changes.

