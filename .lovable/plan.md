

## Problem

Categories are passed as hierarchical strings like `"Standards > System"` — but the edge function splits by comma and searches WordPress for a term literally named `"Standards > System"`. No such term exists in the `doc_categories` taxonomy; the actual terms are `"Standards"` (parent) and `"System"` (child of Standards). Hence: "Categories: none" / "(not found)".

Tags like `"standards"` also show "(not found)" — likely because the term doesn't exist in `doc_tags`, which is expected behavior.

## Fix

**`supabase/functions/wordpress-proxy/index.ts`** — in the `resolveTermIds` function within `update-dlp-only`:

For `doc_categories` specifically, handle the `" > "` hierarchy notation:
1. Split each comma-separated category by `" > "` to get path segments (e.g., `["Standards", "System"]`)
2. Resolve the **leaf term** (last segment, e.g., `"System"`) — this is the most specific category and the one that should be assigned
3. Optionally resolve parent terms too, but WordPress taxonomies with `hierarchical: true` only need the child ID assigned — the parent relationship is already defined in the taxonomy structure

The actual change is small: before searching, check if the name contains `" > "` and if so, use the last segment for the search query while keeping the full path for logging.

```text
Before:  search for "Standards > System"  →  no match
After:   search for "System"              →  match (ID 45)
```

### Files to modify

**`supabase/functions/wordpress-proxy/index.ts`** (~5 lines in `resolveTermIds`):
- Before the search call, extract the leaf term: `const searchName = name.includes(' > ') ? name.split(' > ').pop()! : name;`
- Use `searchName` for the API search query and name/slug matching
- Keep original `name` as the key in the `resolved` map for display purposes
- Redeploy edge function

