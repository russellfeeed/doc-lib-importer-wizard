

## Simplify: Use Only `doc_categories` Taxonomy Slug

### Problem
The `fetch-wp-categories` action tries three taxonomy slugs (`dlp_document_category`, `doc_categories`, `category`), but only `doc_categories` returns results. The other two produce 404 errors, adding noise to the logs and wasting API calls.

### Change

**`supabase/functions/wordpress-proxy/index.ts`** (line 232)

- Replace the array `['dlp_document_category', 'doc_categories', 'category']` with just `['doc_categories']`
- This eliminates two unnecessary 404 requests per search term and cleans up the log output

One-line change, no other files affected.

