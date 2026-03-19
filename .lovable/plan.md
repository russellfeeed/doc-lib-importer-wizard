

## Assign `nsi-media-type` Taxonomy During Media Upload

### Overview
Yes — the WordPress REST API supports setting taxonomy terms on the media item during the upload POST. We'll resolve the term ID once per batch, then include it in each upload's FormData.

### Changes

**1. `src/components/WordPressUploader.tsx`**
- Accept optional `isStandards` prop
- Pass `isStandards` in the request body to the edge function

**2. `src/components/StandardsDocumentImporter.tsx`**
- Pass `isStandards={true}` to `<WordPressUploader>`

**3. `supabase/functions/wordpress-upload/index.ts`**
- Accept `isStandards` from request body
- Before the upload loop, if `isStandards` is true, resolve the `standard` term ID from `GET /wp-json/wp/v2/nsi-media-type?search=standard` (cache it for the batch)
- In the FormData for each upload, append `nsi-media-type` with the resolved term ID: `formData.append('nsi-media-type', termId)`
- If term resolution fails, log a warning but continue uploads without the taxonomy

### Technical notes
- The `nsi-media-type` taxonomy must be registered for the `attachment` post type in WordPress
- Term resolution happens once per function invocation, not per file
- Non-fatal: if taxonomy assignment fails, the file still uploads successfully

