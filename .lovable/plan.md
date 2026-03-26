

## Replace All Non-ASCII Hyphens with Simple Hyphens

### Scope

Found non-ASCII hyphens (em dash `—` and en dash `–`) in 8 files. Some are in regex patterns used for sanitization (these are correct and must stay), others are in display strings that should use simple hyphens or standard punctuation.

### Changes

**Files with em/en dashes in display text / log strings (to fix):**

1. **`src/components/file-uploader/WordPressStatus.tsx`** (line 22)
   - `"WordPress not configured — duplicate check"` → `"WordPress not configured - duplicate check"`

2. **`src/utils/wordpressUtils.ts`** (lines 255, 262)
   - `"WordPress credentials not configured — cannot check"` → use simple hyphen
   - `"No standard number provided — nothing to search"` → use simple hyphen

3. **`src/components/document/editor/WpDuplicateCheckModal.tsx`** (lines 78, 80)
   - `"Detail fetched — Categories"` → use simple hyphen
   - `"Could not fetch full detail — comparison"` → use simple hyphen

**Files with em/en dashes in regex patterns (keep as-is — these are the sanitization logic):**

4. `src/utils/csvUtils.ts` line 234 — regex `/[–—]/g` to replace dashes ✅
5. `src/components/WordPressUploader.tsx` line 151 — same ✅
6. `src/components/document/editor/DocumentContent.tsx` lines 34, 44 — same ✅
7. `supabase/functions/wordpress-upload/index.ts` line 228 — same ✅
8. `src/utils/openaiClient.ts` line 636 — regex to strip dashes ✅

### Summary

3 files need display string updates (5 occurrences). Regex sanitization patterns are left intact since they need to match non-ASCII dashes in input data.

