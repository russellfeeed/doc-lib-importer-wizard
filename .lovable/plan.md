

## Fix: File URL Not Set on New DLP Document

### Problem
The new `dlp_document` is created with `meta: { _dlp_attached_file_id: mediaId, _dlp_document_link_type: 'file' }`, but Barn2 DLP likely doesn't expose these meta fields for creation via the REST API either (same issue as with updates). The `meta` key in the POST body is silently ignored, so the new document has no file attached.

### Fix
After creating the new document, make a separate direct **POST to the WordPress post meta endpoint** to set the required meta fields. WordPress core always supports `/wp-json/wp/v2/dlp_document/{id}` for updating standard fields, but for custom meta that isn't registered with `show_in_rest`, we need to use the lower-level approach.

**Better approach**: Since Barn2 stores the file relationship as post meta (`_dlp_attached_file_id`), and the REST API may not expose it, we should try setting it via a direct meta update. Two options:

1. **Try updating meta via REST API post update** — POST to `/wp-json/wp/v2/dlp_document/{newId}` with just `{ meta: { _dlp_attached_file_id: mediaId } }` as a separate call after creation
2. **If that doesn't work**: Use the WordPress plugin endpoint (the existing `lovable-document-processor` plugin) to set the meta, or add a small custom endpoint

Since the meta fields may not be registered with `show_in_rest` by Barn2, the most reliable approach is:

**Add a fallback using the WordPress Application Passwords + direct meta update**: After creating the document, call the WP REST API to update it with the meta. If that still doesn't stick, log it clearly so we know the meta key isn't exposed.

Additionally, we should **log the full create response** to see what WordPress actually accepted, which will help debug.

### Files to modify

**`supabase/functions/wordpress-proxy/index.ts`** (~15 lines around line 700-720):

1. After creating the document, log the full response body to see if `meta` was accepted
2. Make a **separate PUT/POST call** to `/wp-json/wp/v2/dlp_document/{newDocumentId}` with `{ meta: { _dlp_attached_file_id: mediaId, _dlp_document_link_type: 'file' } }` as a dedicated meta-update step
3. If that also fails, try the WordPress custom fields endpoint: `POST /wp-json/wp/v2/dlp_document/{newDocumentId}` with `{ _dlp_attached_file_id: mediaId }` as a top-level field (some plugins register meta as top-level REST fields)
4. Log success/failure of the meta update step
5. Redeploy edge function

### Key detail
The `meta` object in the create body is likely being silently dropped because `_dlp_attached_file_id` isn't registered via `register_post_meta()` with `show_in_rest: true`. The separate update call gives us a chance to try different field formats and log exactly what WordPress accepts or rejects.

