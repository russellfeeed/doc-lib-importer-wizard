

## Plan: Strip `+` from Standards URLs in CSV Export

### Problem
Standard numbers like `BS EN ISO 9001:2015+A1:2024` produce URLs with a hyphen where the `+` was (e.g., `...-90012015-A12024-...`). The expected output strips the `+` entirely: `...-90012015A12024-...`.

### Changes (3 files, add `.replace(/\+/g, '')` before the general sanitization)

**1. `src/utils/csvUtils.ts` (line ~242)**
Add `.replace(/\+/g, '')` to the sanitization chain before the catch-all character replacement.

**2. `src/components/WordPressUploader.tsx` (line ~151)**
Same — add `.replace(/\+/g, '')` after the em/en dash replacement so uploaded filenames also strip `+`.

**3. `src/components/document/editor/DocumentContent.tsx` (lines 34, 44)**
Same — add `.replace(/\+/g, '')` to both `getFileUrlPlaceholder` and `getDirectUrlPlaceholder` sanitization chains.

### Example Result
`BS EN ISO 9001:2015+A1:2024 - Quality management systems - Requirements.pdf`
→ `BS-EN-ISO-90012015A12024-Quality-management-systems-Requirements.pdf`

