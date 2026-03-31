

## Fix: Sanitize Non-Breaking Hyphens in WordPress Media Uploads

### Problem
`WordPressUploader.tsx` line 151 only replaces em dashes (`—`) and en dashes (`–`) in filenames sent to WordPress. It misses non-breaking hyphens (U+2011) and other Unicode hyphen variants. The CSV export already handles this correctly via `cleanNonAsciiHyphens()` in `csvUtils.ts`, but the uploader doesn't use the same logic.

### Change (1 file)

**`src/components/WordPressUploader.tsx`** — line 151

Replace the current regex:
```typescript
uploadName = uploadName.replace(/\//g, '-').replace(/[–—]/g, '-').replace(/\+/g, '');
```

With the full Unicode hyphen range (matching what `csvUtils.ts` already uses):
```typescript
uploadName = uploadName.replace(/\//g, '-').replace(/[\u2010-\u2015\u2212\u002D\u00AD–—]/g, '-').replace(/\+/g, '');
```

This covers: hyphen (U+2010), non-breaking hyphen (U+2011), figure dash (U+2012), en dash (U+2013), em dash (U+2014), horizontal bar (U+2015), minus sign (U+2212), and soft hyphen (U+00AD) — all replaced with a standard ASCII hyphen.

