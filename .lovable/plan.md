

## Fix: Fetch Standards Documents from Child Categories

### Problem
The "Standards" category (term ID 41) only has 1 document directly assigned. The actual standards documents are in child categories:
- **Service** (slug: `service`) -- 35 documents
- **System** (slug: `system`) -- 85 documents

The WordPress REST API `doc_categories=41` only matches documents in the exact category, not its children. That is why the edge function returns 0 documents.

### Solution
Update the edge function to also fetch child categories of the resolved parent, then pass all term IDs (parent + children) as a comma-separated list to the `doc_categories` filter.

### Changes

#### 1. `supabase/functions/wordpress-proxy/index.ts`

After resolving the parent category slug to a term ID, make a second API call to fetch its children:

```text
GET /wp-json/wp/v2/doc_categories?parent=41&per_page=100
```

Then combine the parent ID with all child IDs into the filter:

```text
&doc_categories=41,XX,YY
```

The WordPress REST API accepts comma-separated term IDs, which acts as an OR filter -- returning documents in any of the listed categories.

Add logging so the modal shows:
- "Category 'standards' resolved to term ID 41"
- "Found 2 child categories: Service (ID: XX), System (ID: YY)"
- "Filtering by term IDs: 41,XX,YY"

#### 2. `src/utils/wordpressUtils.ts`

Update the log line in `checkExistingDlpDocumentWithLogs` to mention child category resolution so the user sees the full picture in the modal.

### Files to edit
- `supabase/functions/wordpress-proxy/index.ts` -- fetch child categories and include in filter
- `src/utils/wordpressUtils.ts` -- update log messaging

