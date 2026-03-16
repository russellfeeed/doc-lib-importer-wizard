

## Add Date-Based Batch Tag

Add a tag with today's date (e.g., `2026-03-12`) to every document created, both via the REST API and CSV export, to enable batch identification in WordPress.

### Changes

**1. `supabase/functions/wordpress-proxy/index.ts`** — Two locations:

- **`create-and-replace-dlp` action (~line 680)**: Before resolving tags, append today's date tag to the tags string:
  ```typescript
  const dateTag = new Date().toISOString().split('T')[0]; // "2026-03-12"
  const tagsWithDate = tags ? `${tags}, ${dateTag}` : dateTag;
  ```
  Then use `tagsWithDate` instead of `tags` in the `resolveTermIds` call. Since the tag likely won't exist yet, `resolveTermIds` won't find it — so we also need to **create the tag** if it doesn't exist (POST to `/wp-json/wp/v2/doc_tags` with `{ name: dateTag }`).

- **`upload-and-update-dlp` action (~line 882)**: Same change — prepend the date tag to the tags string before resolving.

- **Update `resolveTermIds`**: Add a `createIfMissing` flag (default `false`). When `true` and a term isn't found, POST to create it in the taxonomy. Use this flag for `doc_tags` resolution so the date tag is auto-created.

**2. `src/utils/csvUtils.ts`** — Two locations:

- **Circular letters (~line 209)**: Append the date tag to the tags value:
  ```typescript
  const dateTag = new Date().toISOString().split('T')[0];
  const tagsWithDate = letter.tags ? `${letter.tags}, ${dateTag}` : dateTag;
  ```
  Use `tagsWithDate` in `forceQuoteCsvValue`.

- **Regular documents (~line 252)**: Same — append date tag to `docFile.tags` before writing.

### Summary of touch points
| Location | File | What changes |
|----------|------|-------------|
| CSV circular letters | `csvUtils.ts:209` | Append date tag |
| CSV regular docs | `csvUtils.ts:252` | Append date tag |
| REST create-and-replace | `wordpress-proxy:680` | Append date tag + auto-create in WP |
| REST upload-and-update | `wordpress-proxy:882` | Append date tag + auto-create in WP |
| `resolveTermIds` | `wordpress-proxy` | Add `createIfMissing` param |

