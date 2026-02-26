

## Fix: Fetch All DLP Documents for Client-Side Fuzzy Matching

### Problem
The current approach sends the full standard number (e.g., `PD CLC/TS 50131-2-9:2016`) to WordPress's `?search=` parameter. WordPress splits this into keywords and may return no results due to special characters. The fuzzy normalization logic never gets a chance to work because the API returns an empty array.

### Solution
Instead of relying on WordPress search, fetch **all** `dlp_document` titles and perform the fuzzy matching entirely client-side. DLP document libraries typically have hundreds to low thousands of entries, so fetching titles only (minimal payload) is practical.

### Changes

#### 1. Update `wordpress-proxy` edge function — new action `fetch-all-dlp-titles`

Add a new action that paginates through all `dlp_document` posts, fetching only `id,title,status,link,date` fields:

- First request: `GET /wp-json/wp/v2/dlp_document?per_page=100&page=1&_fields=id,title,status,link,date`
- Read the `X-WP-TotalPages` response header to determine if more pages exist
- Loop through all pages, collecting results
- Return the full array

This ensures we get every document regardless of WordPress search quirks.

#### 2. Update `checkExistingDlpDocument` in `src/utils/wordpressUtils.ts`

- Change `action` from `'search-dlp-documents'` to `'fetch-all-dlp-titles'`
- Remove the `searchTerm` parameter (no longer needed server-side)
- Keep the existing client-side normalization and `includes()` matching — this already works correctly

#### 3. Optional: Cache results

Since fetching all titles is heavier than a search query, cache the results in memory (module-level variable) for the duration of the session so subsequent checks during the same upload batch don't re-fetch. Clear cache when credentials change.

### Technical Notes

- The `_fields=id,title,status,link,date` parameter keeps the payload small (no content/body)
- WordPress REST API default max `per_page` is 100, so pagination is needed for larger libraries
- The existing `normalizeStandardNumber` function and fuzzy matching logic remain unchanged
- The old `search-dlp-documents` action can be kept for backward compatibility or removed

