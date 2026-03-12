

## Fix: Media Upload Auth Failure

### Problem
The `upload-media-only` (and legacy `upload-and-update-dlp`) action uses **cookie-based auth** via `getWpSessionAuth` (wp-login.php). But the stored credentials use a WordPress **Application Password**, which only works with HTTP Basic Auth — not wp-login.php. The login silently fails (returns 200 instead of 302), no nonce is obtained, and the upload returns a non-2xx error.

Read-only actions work fine because they use `wpFetch` which does Basic Auth correctly.

### Fix
Change `upload-media-only` to use **Basic Auth** for the media upload instead of cookie-based auth. The WordPress REST API `/wp-json/wp/v2/media` endpoint accepts multipart/form-data with Basic Auth headers.

### Files to modify

**`supabase/functions/wordpress-proxy/index.ts`** (lines 569-596)

Replace the `getWpSessionAuth` + cookie/nonce approach with a direct `fetch` using the `Authorization: Basic` header:

```typescript
// Instead of:
const session = await getWpSessionAuth(baseUrl3, username, cleanPassword);
// ...
const mediaResponse = await fetch(url, {
  headers: { Cookie: session.cookies, 'X-WP-Nonce': session.nonce },
  body: formData,
});

// Use:
const authString = btoa(`${username}:${cleanPassword}`);
const mediaResponse = await fetch(`${baseUrl3}/wp-json/wp/v2/media`, {
  method: 'POST',
  headers: {
    'Authorization': `Basic ${authString}`,
    'User-Agent': 'Supabase-Edge-Function',
  },
  body: formData,
});
```

Apply the same fix to the legacy `upload-and-update-dlp` action (line 756) for consistency.

Then redeploy the edge function.

