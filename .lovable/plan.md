

## Plan: Add WordPress Duplicate Checker to Home Page

### What It Does
A new card on the home page (`/`) that fetches all documents from the WordPress Document Library via the existing REST API, then compares them against each other to find duplicates (documents with matching or very similar standard numbers).

### Changes

**1. New page: `src/pages/WpDuplicateAudit.tsx`**
- Full-page view with a "Start Scan" button
- Uses `fetchAllDlpDocuments` (via existing `wordpress-proxy` edge function and `fetch-all-dlp-titles` action) to pull all DLP documents
- Runs each document's title through `normalizeStandardNumber` and groups by normalized standard number
- Displays results in a table showing duplicate groups: standard number, document titles, IDs, statuses, and WordPress links
- Shows a real-time log panel (reusing the log pattern from `WpDuplicateCheckModal`) during the fetch/scan process
- Checks WordPress credentials first; shows a warning/link to Settings if missing

**2. Update `src/pages/Index.tsx`**
- Add a new card linking to `/wp-duplicate-audit` with a suitable icon (e.g., `Search` or `Copy` from lucide) and description like "Scan WordPress Document Library for duplicate entries"

**3. Update `src/App.tsx`**
- Add route for `/wp-duplicate-audit` pointing to the new page

**4. Export `fetchAllDlpDocuments` and `normalizeStandardNumber` from `src/utils/wordpressUtils.ts`**
- Currently `fetchAllDlpDocuments` is module-private; export it so the new page can use it
- `normalizeStandardNumber` is also private; export it

### Duplicate Detection Logic
```text
1. Fetch all DLP documents (uses existing cached fetch)
2. For each document, extract & normalize the standard number from title
3. Group documents by normalized standard number
4. Any group with 2+ documents = duplicates
5. Display grouped results with links to WordPress admin
```

### Technical Detail
- Reuses existing `getWordPressCredentials()`, `fetchAllDlpDocuments()`, `normalizeStandardNumber()` — no new API calls needed
- The session cache means repeated scans are instant
- The standard number is extracted from the title prefix (everything before the first ` - ` delimiter), matching the existing convention

