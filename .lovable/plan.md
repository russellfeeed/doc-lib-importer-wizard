

## Problem: File URL not updating after upload

From the screenshots, the existing DLP document uses **"File URL" mode** (`_dlp_document_link_type = file_url`). The edge function currently sets `_dlp_attached_file_id` (the attachment ID), but since the document is in "File URL" mode, DLP ignores the attachment ID and keeps showing the old URL.

Now that you have WP REST API Controller exposing all the DLP meta keys (including `_dlp_document_link_type`), we can fix this.

### Fix

**File: `supabase/functions/wordpress-proxy/index.ts`** — in the `upload-and-update-dlp` action (around line 653):

Currently:
```typescript
updateBody.meta = {
  _dlp_attached_file_id: mediaResult.id,
};
```

Change to:
```typescript
updateBody.meta = {
  _dlp_attached_file_id: mediaResult.id,
  _dlp_document_link_type: 'file',
};
```

This switches the document from "File URL" mode to "Attached File" mode, so DLP will use the newly uploaded media attachment. The file URL will be derived automatically by DLP from the attachment.

One file change, two lines added. Then redeploy the edge function.

