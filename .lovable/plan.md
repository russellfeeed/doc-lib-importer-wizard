

## Feature: Compare WordPress Document with Local Edit Information

### What it does
After the "Check WordPress Duplicate" finds a match, fetch the full WordPress document details and display a side-by-side comparison highlighting differences between the WordPress version and the local Edit Information fields.

### Current behavior
- `fetch-all-dlp-titles` returns only `id, title, status, link, date, doc_categories`
- `WpDuplicateCheckModal` shows a log of the search process
- If matched, `wpExisting` is set on the document with minimal info (`id, title, status, link, date`)
- The orange alert banner in `SingleDocumentEditor` just shows the match exists

### Plan

**1. Add a new edge function action: `fetch-dlp-document-detail`**
- In `supabase/functions/wordpress-proxy/index.ts`, add a handler for `action: 'fetch-dlp-detail'`
- Fetches a single DLP document by ID: `/wp-json/wp/v2/dlp_document/{id}?_fields=id,title,excerpt,content,status,link,date,doc_categories,doc_tags`
- Also resolves `doc_categories` and `doc_tags` term IDs to their names (fetch `/wp-json/wp/v2/doc_categories?include=X,Y` and similar for tags)
- Returns structured data: `{ title, excerpt, categories, tags, status, link, date }`

**2. Expand `wpExisting` type in `src/types/document.ts`**
- Add optional fields: `excerpt`, `categories`, `tags` to the `wpExisting` interface

**3. Update `WpDuplicateCheckModal`**
- After a match is found, automatically fetch the full document detail using the new action
- Pass the enriched match data back via `onMatchFound`

**4. Create a new `WpComparisonPanel` component**
- Displayed in `DocumentMetadata` (or `SingleDocumentEditor`) when `wpExisting` has detailed data
- Shows a compact comparison table with rows for: Title, Excerpt, Categories, Tags
- Each row shows "WordPress" vs "Local" values
- Highlights rows where values differ (e.g., amber/yellow background, or a "differs" badge)
- Fields that match get a green checkmark

**5. Add comparison utility in `src/utils/wordpressUtils.ts`**
- `compareDocumentFields(local: DocumentFile, wpData: wpExisting)` returns an array of `{ field, localValue, wpValue, isDifferent }` objects
- Normalize strings before comparison (trim, lowercase for matching)

### Files to modify
- `supabase/functions/wordpress-proxy/index.ts` — new `fetch-dlp-detail` action
- `src/types/document.ts` — extend `wpExisting` type
- `src/utils/wordpressUtils.ts` — add fetch detail function + comparison helper
- `src/components/document/editor/WpDuplicateCheckModal.tsx` — fetch detail after match
- `src/components/document/editor/WpComparisonPanel.tsx` — new component for diff display
- `src/components/document/editor/DocumentMetadata.tsx` — render `WpComparisonPanel` when data available

