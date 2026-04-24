## The problem

`/_pda/` URLs are served by the **Prevent Direct Access (PDA)** plugin, which gates files on a *frontend* WordPress login session — a `wordpress_logged_in_*` cookie — **not** on REST/Application Password Basic auth. That's why the audit (which already sends Basic auth) still gets blocked.

## Realistic options

### Option A — Log in with wp-login.php and reuse the session cookie (recommended)

In the `check-document-url` action of `wordpress-proxy`, before probing a `/_pda/` URL:

1. POST `log=<username>&pwd=<password>&wp-submit=Log+In&redirect_to=<site>/wp-admin/&testcookie=1` to `https://<site>/wp-login.php` with `redirect: 'manual'` and a cookie jar.
2. Capture all `Set-Cookie` headers. The keepers are `wordpress_logged_in_<hash>` and `wordpress_sec_<hash>`.
3. Cache the cookie string in module-level memory keyed by site URL with a ~30 min TTL so we don't re-login on every row of the audit.
4. Re-issue the file `GET` with `Cookie: <captured cookies>` (and drop the Basic auth header for this call — it confuses some setups).
5. If the response is still HTML / a login page, refresh the cookie once and retry.

Notes / gotchas:
- The WP user must be a real human-login user with at least Subscriber role. The "API File Uploader" account currently used for REST may not have a frontend login. We add a settings field for an optional separate "audit login" user, falling back to the existing `wp_username`/`wp_password` if not set.
- `wp-login.php` may require the `wordpress_test_cookie` round-trip; we handle that by sending `Cookie: wordpress_test_cookie=WP+Cookie+check` on the POST.
- Some sites have login CAPTCHAs / 2FA / Wordfence rate limits — if so, this will fail and we surface a clear "WP login blocked" error in the audit row.

### Option B — Ask PDA for a one-time download token via REST

PDA Gold exposes per-file tokens (the `?ddownload=<id>&_token=...` style URLs). If the customer has PDA Gold and exposes this in the REST response, we can read it from `dlp_document` meta and use the tokenised URL directly. Looking at the captured `dlp_document` JSON the user showed us, this token does not appear — so this is only viable if they enable it server-side. Listed for completeness; not the recommended path.

### Option C — Skip reachability check for /_pda/ URLs

Detect `/_pda/` in the URL and short-circuit the check with a `protected` status (gray badge) instead of red. Always honest, never a false negative. Cheap fallback if Option A is rejected.

## Recommended plan: A + C as a fallback

1. **Edge function (`supabase/functions/wordpress-proxy/index.ts`)**
   - Add a `wpLogin(siteUrl, user, pass)` helper that performs the wp-login.php round-trip and returns a cookie string. Cache results in a `Map<string, {cookie, exp}>`.
   - In `check-document-url`, when the URL contains `/_pda/` (or after a first probe returns HTML / a 302 to `wp-login.php`):
     - Call `wpLogin`, retry with `Cookie:` header, no Basic auth.
   - On the retry, evaluate the same PDF-magic / content-type rules already in place.
   - If login itself fails (non-2xx, no cookie set), return `{ ok: false, error: 'wp-login failed: <status>', status }` and let the UI mark the row as "Login blocked".

2. **Audit UI (`src/pages/DocumentUrlAudit.tsx` + `src/utils/dlpAuditUtils.ts`)**
   - Add a new issue class `protected` rendered as an amber badge "Protected (login required)" for rows where the edge function reports `loginBlocked: true`, so users can distinguish it from a true broken link.
   - Tooltip on the badge: "PDA-protected file. WordPress login attempt failed — file may still be valid."

3. **Optional settings field** *(can ship in a follow-up — not required for the fix)*
   - Add `wp_audit_username` / `wp_audit_password` to the `wordpress_settings` row + Settings page UI for a dedicated frontend-login account. The edge function prefers these when present.

## Files to edit

- `supabase/functions/wordpress-proxy/index.ts` — add `wpLogin` helper + cookie cache + updated `check-document-url` flow.
- `src/utils/dlpAuditUtils.ts` — add `loginBlocked` to `UrlCheckResult` and a new `protected` issue class.
- `src/pages/DocumentUrlAudit.tsx` — render the new badge + filter option.

No DB migrations required for the core fix.

## What the user will see

After re-running the audit, `/_pda/` URLs that resolve to real PDFs once logged in will show green "OK" instead of red "HTML / login page". Files that genuinely 404 or are missing still show red. If the WP login itself can't be performed (CAPTCHA, 2FA, missing user), affected rows show an amber "Protected (login required)" badge instead of a misleading red one.