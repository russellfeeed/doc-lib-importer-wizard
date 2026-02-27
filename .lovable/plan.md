

## Investigate: Fetch WordPress Categories and Add Status Parameter to DLP Document Fetch

### Problem
The DLP document fetch (`fetch-all-dlp-titles`) currently requests:
```
/wp-json/wp/v2/dlp_document?per_page=100&page=1&_fields=id,title,status,link,date
```

Two potential issues:
1. **Missing `status` parameter** -- WordPress REST API defaults to `status=publish`, hiding drafts, private, and pending documents
2. **Category structure** -- Standards may be nested under categories like "Standards > System" and "Standards > Service"; we need to verify these categories exist and whether category-based filtering affects results

### Changes

**1. Edge function: `supabase/functions/wordpress-proxy/index.ts`**

- Add a new action `fetch-wp-categories` that:
  - Calls `GET {url}/wp-json/wp/v2/dlp_document_category?per_page=100&search={searchTerm}` (or equivalent taxonomy endpoint)
  - Returns the category list so we can inspect IDs, names, parent relationships, and post counts
  - Falls back to trying common taxonomy slugs: `dlp_document_category`, `category`, `doc_category`

- Update the `fetch-all-dlp-titles` action to include `&status=publish,draft,private,pending` so all document statuses are returned

**2. Client utility: `src/utils/wordpressUtils.ts`**

In `checkExistingDlpDocumentWithLogs`, after the `/users/me` call and before fetching documents:
- Call the new `fetch-wp-categories` action with search terms "standards", "system", "service"
- Log each matching category with its ID, name, parent ID, and post count
- This will reveal whether documents are organized by category and if any categories are restricting results

Also log the `X-WP-Total` header value that comes back from the document fetch so we can see if the total changes after adding the status parameter.

### Files to modify
- `supabase/functions/wordpress-proxy/index.ts` -- add `fetch-wp-categories` action; add `&status=publish,draft,private,pending` to DLP fetch URL
- `src/utils/wordpressUtils.ts` -- add category inspection logging in `checkExistingDlpDocumentWithLogs`

