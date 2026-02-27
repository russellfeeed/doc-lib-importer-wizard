

## Fix: Filter DLP Documents Client-Side by Category

### Problem
The `doc_categories=649,645` query parameter is silently ignored by WordPress REST API when filtering `dlp_document` posts. This happens because the custom taxonomy likely doesn't have `query_var => true` set in its WordPress registration, so the REST API doesn't recognize it as a filter. We cannot change the WordPress server configuration.

### Solution
Revert the URL to the original unfiltered fetch, but request the `doc_categories` field in the response so we can filter client-side. This way we fetch all DLP documents but only cache the ones belonging to categories 649 or 645.

### Changes

**`supabase/functions/wordpress-proxy/index.ts`** (line 287)

1. Remove `&doc_categories=649,645` from the URL
2. Add `doc_categories` to the `_fields` parameter so each document includes its category IDs

Current:
```
...?per_page=100&page=${page}&doc_categories=649,645&_fields=id,title,status,link,date
```

Updated:
```
...?per_page=100&page=${page}&_fields=id,title,status,link,date,doc_categories
```

3. After fetching all pages, filter the results to only include documents where `doc_categories` contains 649 or 645:

```typescript
const targetCategories = [649, 645];
const filtered = allDocuments.filter(doc =>
  Array.isArray(doc.doc_categories) &&
  doc.doc_categories.some(id => targetCategories.includes(id))
);
```

4. Log the count before and after filtering for debugging visibility

### Files to modify
- `supabase/functions/wordpress-proxy/index.ts` -- update fetch URL and add client-side category filtering

