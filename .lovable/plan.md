# Fix bogus File URLs from page scrape (Font Awesome CSS, etc.)

## The bug

In `supabase/functions/wordpress-proxy/index.ts`, the `fetch-dlp-by-category` action falls back to fetching the document's public WordPress page and scraping it for a download link via `scrapeFileUrl()`.

That helper uses regexes that only look for `href="..."`, so they match **any** tag — including `<link rel="stylesheet" href="...">` in the page `<head>`. The page loads Font Awesome from `/wp-content/uploads/font-awesome/v6.7.2/css/svg-with-js.css`, which matches Priority 1 (`/wp-content/uploads/...\.[ext]`) and gets returned as the document's File URL.

It also matches anything ending in `.css`, `.js`, `.png`, `.svg`, `.woff`, etc. — none of which are documents.

## Fix

Tighten `scrapeFileUrl` so it only returns plausible document links:

1. **Strip `<head>` before scraping.** Remove everything up to `</head>` so stylesheet/script/font links in the head can never match.
2. **Only match anchor tags (`<a ... href="...">`)**, not `<link>` or `<script>`. Use a regex anchored on `<a` with `href` as an attribute.
3. **Whitelist document extensions only.** Replace the catch-all "any file under /wp-content/uploads" priority with an explicit allow-list: `pdf, doc, docx, xls, xlsx, ppt, pptx, zip, csv, rtf, txt, odt`. Drop the generic Priority 4.
4. **Reject obvious non-documents.** Even within anchors, skip URLs whose path ends in `.css`, `.js`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp`, `.woff`, `.woff2`, `.ttf`, `.otf`, `.ico`, `.map`.
5. Keep the DLP `dlp-listing-action=download` priority (those are real download links).
6. Apply the same hardening when scraping `doc.content.rendered` (post body).

## What the user will see

Re-running the audit will no longer report Font Awesome (or other theme assets) as the File URL. Documents whose page truly has no document link will correctly show "No file URL" instead of a false-positive CSS path.

## Files to edit

- `supabase/functions/wordpress-proxy/index.ts` — rewrite `scrapeFileUrl` inside the `fetch-dlp-by-category` handler (around lines 550–566) and re-deploy the function.

No client-side changes needed.
