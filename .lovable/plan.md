## Goal

For every row in the audit issues table, add a **Fix** button. Clicking it opens a modal that:

1. Searches the WordPress media library for files that likely match the document.
2. Shows the matching media file's **Title** and **URL** (with a copy-to-clipboard button on the URL).
3. Shows the **Doc ID** as a link that opens the Document Library Pro entry in WP admin (in a new tab).
4. Includes a short instruction: "Open the Document Library entry using the Doc ID link, then paste the File URL into its File URL field."

If multiple media files match, list them as candidates (best match first) so the user can pick which URL to copy.

## How matching works

The document title is the strongest signal (e.g. `"BS 1234 - Lorem Ipsum"`). The plan derives a search query from the document's title:

- Strip HTML tags.
- Use the leading "code/number" portion before the first ` - ` (e.g. `BS 1234`) as the primary query.
- Fall back to the full title if the leading portion is too short.

Then call WordPress REST: `GET /wp-json/wp/v2/media?search=<query>&per_page=10&_fields=id,title,source_url,mime_type,date`.

Optionally bias toward PDFs by also filtering client-side on `mime_type === 'application/pdf'`, but still show non-PDF results below as fallback.

The user can also override the search term in the modal (a small input pre-filled with the derived query) and re-search. This handles cases where the document title doesn't cleanly match the uploaded filename.

## UI changes (`src/pages/DocumentUrlAudit.tsx`)

- Add a **Fix** button (variant `outline`, small) next to the existing **Re-check** button in the Issue cell.
- Add a new dialog (`fixOpen`, `fixDoc`, `fixQuery`, `fixLoading`, `fixResults`, `fixError` state).
- The modal layout:
  - Header: "Fix suggestion for #<docId> — <title>"
  - **Doc ID link** (prominent): `#<docId>` linking to `${wpBase}/wp-admin/post.php?post=<docId>&action=edit` (target=_blank). Visually styled like a button/badge.
  - Search input + "Search" button (pre-filled with derived query).
  - Results list (table or card list) with columns: **Title**, **URL** (truncated, with a tooltip showing full URL), **Mime**, and a **Copy URL** icon button per row using `navigator.clipboard.writeText` + `toast.success("URL copied")`.
  - Empty / loading / error states.
  - Footer instruction text:
    > "Open the Document Library Pro entry using the Doc ID link above, paste the copied File URL into the document's File URL field, and save."

Reuse existing `Dialog`, `Button`, `Input`, `Table` components and `sonner` toast (already imported).

## Backend changes (`supabase/functions/wordpress-proxy/index.ts`)

Add a new action `search-media`:

- Inputs: `url`, `username`, `password`, `searchTerm`, optional `mimeType`, optional `perPage` (default 10).
- Calls `GET ${baseUrl}/wp-json/wp/v2/media?search=<term>&per_page=<n>&_fields=id,title,source_url,mime_type,date` via the existing `wpFetch` helper (handles Basic → URL-embedded → cookie auth fallback).
- Returns a normalized JSON array: `[{ id, title, sourceUrl, mimeType, date }]`.
- Includes CORS headers and validation (400 on missing fields).

Add a thin client helper in `src/utils/dlpAuditUtils.ts`:

```ts
export interface MediaCandidate {
  id: number;
  title: string;
  sourceUrl: string;
  mimeType: string;
  date: string;
}

export const searchWordPressMedia = async (
  searchTerm: string,
  mimeType?: string,
): Promise<MediaCandidate[]> => { /* invokes wordpress-proxy with action: 'search-media' */ };
```

## Edge cases

- Empty search term → disable "Search" button.
- No results → show "No matching media found. Try a shorter or different query."
- Network/auth error → show the error string in the modal.
- Long titles or URLs → truncate with `title=` tooltip; copy always uses the full URL.
- Clipboard API unavailable → fall back to `document.execCommand('copy')` (same pattern as existing `handleCopyTable`).

## Out of scope

- Automatically updating the WP document's `_dlp_attached_file_id` (the user explicitly wants to do this manually in WP admin).
- Any persistent record of suggested fixes.
