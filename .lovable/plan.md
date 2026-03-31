

## Fix: CSV Always Uses Current WordPress Settings for URLs

### Root Cause
The CSV generation at `csvUtils.ts:285` does `docFile.fileUrl || fileUrlPath` — since `fileUrl` is initialized as `''` (falsy), it falls back to `fileUrlPath` which calls `getWpBaseUrl()`. However, `getWpBaseUrl()` reads `wp_site_url` from `localStorage`, and if that value is missing (e.g. localStorage cleared between preview rebuilds, or settings not yet saved in the current session), it falls back to the hardcoded `dev.members.nsi.org.uk`.

Additionally, if a user manually edits the File URL or Direct URL fields in the editor (even accidentally), those values get persisted on the document object and override the dynamic fallback forever.

### Changes (2 files)

**1. `src/utils/csvUtils.ts`** (~lines 285-286)
- Instead of `docFile.fileUrl || fileUrlPath`, always use `fileUrlPath` (the dynamically generated URL) unless the user has explicitly set a custom URL that doesn't match the auto-generated pattern.
- Simplest fix: always regenerate the URL from current settings, ignoring stored `fileUrl`/`directUrl` since those are never intentionally user-set in the standards workflow.

Replace:
```typescript
row['File URL'] = forceQuoteCsvValue(docFile.fileUrl || fileUrlPath);
row['Direct URL'] = forceQuoteCsvValue(docFile.directUrl || directUrlPath);
```
With:
```typescript
row['File URL'] = forceQuoteCsvValue(fileUrlPath);
row['Direct URL'] = forceQuoteCsvValue(directUrlPath);
```

**2. `src/components/document/editor/DocumentContent.tsx`** (~lines 107-120)
- Same change for the editor display: always show the dynamically computed URL, and if the user types a custom value, store it. But on CSV export the dynamic value wins (per change above).
- No change needed here since it already shows `document.fileUrl || getFileUrlPlaceholder()` which is correct for display.

### Impact
- CSV URLs will always reflect the current WordPress Settings, regardless of what was previously stored on the document objects.
- The editor still shows a live preview of the URL but edits there won't affect CSV output (which is the desired behavior since URLs should match the configured WordPress site).

