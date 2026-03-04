

## Fix: Upload & Update Document Library

### Problems Found

**1. Double `_pda` in path** - The logs show:
```
source_url: .../wp-content/uploads/_pda/2026/03/PD-CLC-TS-50131-2-9_2016.pdf
Derived _pda URL: .../wp-content/uploads/_pda/_pda/2026/03/...
```
The WP Prevent Direct Access plugin already places uploaded files in `_pda/`, so the code's blanket `.replace('/uploads/', '/uploads/_pda/')` creates a double `_pda/_pda/` path.

**2. Wrong meta key for file URL** - The code sets `meta: { _dlp_document_file_url: ... }` but Barn2 DLP links files via `_dlp_attached_file_id` (the media attachment ID, not a URL). This is confirmed by the WordPress plugin at line 408: `update_post_meta($post_id, '_dlp_attached_file_id', $attachment_id)`. The REST API likely ignores the unregistered meta key silently.

**3. Categories not resolved** - "System" is a child category under "Standards" and the search API may not return it correctly. Less critical but worth noting.

### Fix Plan

**File: `supabase/functions/wordpress-proxy/index.ts`** (both copies of the action block)

1. **Fix the `_pda` path derivation**: Check if `source_url` already contains `/_pda/` before applying the replacement. If it does, use it as-is.

2. **Use `_dlp_attached_file_id` instead of `_dlp_document_file_url`**: Set the attachment ID from the media upload response (`mediaResult.id`) on the DLP document. This is how Barn2 DLP actually links a file to a document.

3. **Also set the file URL via the DLP's custom field**: Barn2 DLP also supports a URL-based file reference. From the screenshot, the document uses "File URL" mode. The correct approach is to update both:
   - `_dlp_attached_file_id` → `mediaResult.id` 
   - And pass the URL using the `content` or a known registered meta field

   Actually, the simplest reliable approach: just set `_dlp_attached_file_id` to the new media ID. Barn2 DLP will derive the URL from the attachment automatically.

4. **Fix duplicate action block**: There are two identical `upload-and-update-dlp` blocks (lines 557-694 and 696-832). Remove the duplicate.

### Changes

**`supabase/functions/wordpress-proxy/index.ts`**:
- Fix `_pda` path: only apply replacement if `source_url` doesn't already contain `/_pda/`
- Replace `meta: { _dlp_document_file_url: relativePdaPath }` with `meta: { _dlp_attached_file_id: mediaResult.id }`
- Remove the duplicate action block
- Return the correct `pdaUrl` and `relativePdaPath` to the client

**`src/utils/wordpressUtils.ts`** - no changes needed (it already handles the response correctly)

