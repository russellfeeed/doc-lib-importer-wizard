

## Replace DLP Document Update with Create-New + Trash-Old

### Problem
The WordPress REST API accepts the POST to update a `dlp_document`, but Barn2 Document Library Pro doesn't actually persist the changes (meta fields like `_dlp_attached_file_id` are likely not exposed for update via REST). The update silently succeeds at the HTTP level but has no real effect.

### Approach
Instead of updating the existing document in place, the flow becomes:
1. **Upload media** (unchanged — `upload-media-only` works)
2. **Create a new `dlp_document`** via `POST /wp-json/wp/v2/dlp_document` with all metadata: title, excerpt, categories, tags, status, and meta fields for the file attachment
3. **Trash the old document** via `POST /wp-json/wp/v2/dlp_document/{oldId}` with `{ status: 'trash' }` (or `DELETE` endpoint)
4. Return both the new document ID and confirmation the old one was trashed

### Steps 3 & 4 label changes in the progress modal
```text
 1. Converting file to base64          ✅
 2. Uploading to Media Library          ✅ Media ID: 35331
 3. Creating new DLP document           ✅ New post 35400 created
 4. Trashing old DLP document           ✅ Post 35179 trashed
 5. Complete                            ✅
```

### Files to change

**1. `supabase/functions/wordpress-proxy/index.ts`**
- Rename `update-dlp-only` action to `create-and-replace-dlp` (keep old name as alias for safety)
- Change the update logic:
  - Instead of `POST /wp-json/wp/v2/dlp_document/{documentId}` (update), do `POST /wp-json/wp/v2/dlp_document` (create new) with body: `{ title, excerpt, status: 'publish', doc_categories: [...ids], doc_tags: [...ids], meta: { _dlp_attached_file_id: mediaId, _dlp_document_link_type: 'file' } }`
  - After successful creation, trash the old document: `DELETE /wp-json/wp/v2/dlp_document/{oldDocumentId}` (or POST with `status: 'trash'`)
- Return `{ newDocumentId, oldDocumentId, trashedOld: true/false, categoryIds, tagIds, ... }`
- Redeploy edge function

**2. `src/utils/wordpressUtils.ts`**
- Update `uploadAndUpdateDlpDocument`:
  - Change the second call from `action: 'update-dlp-only'` to `action: 'create-and-replace-dlp'`
  - Update progress step labels: `'resolving-terms'` → `'creating-document'`, `'updating-document'` → `'trashing-old'`
  - Update the return type to include `newDocumentId` and `oldDocumentId`

**3. `src/components/document/editor/WpComparisonPanel.tsx`**
- Update `initialSteps` labels: "Updating DLP document" → "Creating new DLP document" + adjust step 4 to "Trashing old document"
- Update step map and result handling for the new response shape

**4. `src/components/document/editor/WpUploadProgressModal.tsx`**
- Update result display to show new document ID and old document trashed status

