

## Fix: Filter DLP Documents by "standards" Category

### Problem
The current API call fetches all `dlp_document` posts without filtering, returning only 237 of 358 published standards documents. The WordPress REST API likely applies default permission-based filtering.

### Solution
Add the `doc_categories` taxonomy filter to the API query. The WordPress REST API supports taxonomy filtering via query parameters like `?doc_categories=<term_id>`. We need to:

1. First resolve the `standards` category slug to its term ID
2. Then filter the document fetch by that term ID

### Changes

#### 1. Update edge function: `supabase/functions/wordpress-proxy/index.ts`

Modify the `fetch-all-dlp-titles` action to accept an optional `categorySlug` parameter (default: `"standards"`). Before fetching documents, it will:
- Call `/wp-json/wp/v2/doc_categories?slug=standards` to get the term ID
- Then append `&doc_categories=<term_id>` to the document fetch URL

Updated URL pattern:
```text
/wp-json/wp/v2/dlp_document?per_page=100&page=N&doc_categories=<ID>&_fields=id,title,status,link,date
```

Also log the `X-WP-Total` header on the first page for visibility.

#### 2. Update `src/utils/wordpressUtils.ts`

Pass `categorySlug: 'standards'` in the request body when calling `fetch-all-dlp-titles`, so the edge function knows to filter. No other client-side changes needed.

#### 3. Update log output

Add a log line in `checkExistingDlpDocumentWithLogs` showing: "Filtering by category: standards (ID: XX)" so the user can verify the filter is applied.

### Files to edit
- `supabase/functions/wordpress-proxy/index.ts` -- add category slug resolution and filter to `fetch-all-dlp-titles`
- `src/utils/wordpressUtils.ts` -- pass `categorySlug` param and update log messaging

