

## Filter DLP Document Fetch by Category IDs 649 and 645

### Problem
The `fetch-all-dlp-titles` action currently fetches **all** `dlp_document` posts, but we only care about the 120 documents in categories 649 (System) and 645 (Service). Fetching everything wastes API calls and returns irrelevant results.

### Change

**`supabase/functions/wordpress-proxy/index.ts`** (line 287)

Add `&doc_categories=649,645` to the WordPress REST API query URL. WordPress supports filtering by taxonomy terms using the taxonomy slug as a query parameter with comma-separated term IDs.

Current:
```
/wp-json/wp/v2/dlp_document?per_page=100&page=${page}&_fields=id,title,status,link,date
```

Updated:
```
/wp-json/wp/v2/dlp_document?per_page=100&page=${page}&doc_categories=649,645&_fields=id,title,status,link,date
```

This single URL change filters results to only documents in the System (649) and Service (645) categories, reducing the result set to the ~120 relevant standards documents.

### Files to modify
- `supabase/functions/wordpress-proxy/index.ts` -- add `&doc_categories=649,645` to the fetch URL on line 287

