## Diagnosis: Yes, it's a timing/concurrency issue

The logs prove it. Look at this timestamp cluster:

```text
1777145568243 — isolate boots
1777145568244 — isolate boots
1777145568245 — isolate boots   ← 8+ separate isolates
1777145568314 — isolate boots
1777145568315 — isolate boots
1777145568379 — isolate boots
...
1777145568698 — loginToWp SUCCESS
1777145568705 — loginToWp SUCCESS
1777145568736 — loginToWp SUCCESS   ← 6 logins in 60ms
1777145568845 — loginToWp SUCCESS
...
1777145568925 — /_pda/ probe → 404 HTML  ← false positive
1777145568949 — /_pda/ probe → 200 PDF
1777145569002 — /_pda/ probe → 404 HTML  ← false positive
```

Three things are happening at the same instant:

1. The frontend fires **5 concurrent** probes (`CONCURRENCY = 5`).
2. Each probe lands on a **separate Supabase edge isolate**, so the module-level `wpCookieCache` is useless — every isolate logs in fresh.
3. WordPress receives a burst of 5+ `wp-login.php` POSTs followed immediately by 5+ `/_pda/` GETs. Under that load, the PDA plugin (and/or Wordfence/PHP session locks) sometimes returns a `404` HTML page instead of the file — even for URLs that exist.

When you click **Re-check** afterwards, the request runs alone, the server isn't under burst load, and it correctly returns the PDF. That's the smoking gun.

## Fix

Two changes, layered:

### 1. Auto-retry transient 404/HTML responses on `/_pda/` URLs (edge function)

In `supabase/functions/wordpress-proxy/index.ts`, inside the `check-document-url` action:

- After the initial probe, if the URL is `/_pda/` AND the response was `404` or HTML (not a real PDF), wait 400–800ms with jitter and retry once with a fresh cookie.
- If the retry succeeds, return the success result. If it still fails, return the failure (genuine missing file).
- Log retries so we can see how often the false positives occur.

This already partly exists for the `isHtml` cookie-refresh case, but it doesn't cover the `404 + HTML body` case that the logs show. Extend it to:
- Trigger on `status === 404 && isHtml` for `/_pda/` URLs
- Trigger on any non-OK HTML response for `/_pda/` URLs (regardless of auth mode)

### 2. Lower frontend concurrency for `/_pda/` URLs (frontend)

In `src/pages/DocumentUrlAudit.tsx`:

- Drop `CONCURRENCY` from `5` to `2` — small enough to stop the burst, large enough to keep the audit reasonably fast.
- Add a small inter-request delay (150ms) between probe dispatches so we don't hammer wp-login.php.

This trades ~2× audit duration for dramatically fewer false positives, which the user has to manually re-check anyway.

### 3. (Optional) Persist cookie across isolates

The module-level `Map` cache doesn't help when each row lands on a fresh isolate. Move the cookie to the `wordpress_settings` table (or a dedicated `wp_session_cache` row) with a 25-minute TTL, so all isolates share one login.

I'll mark this as optional — changes 1 + 2 should resolve the user-visible problem on their own, and persistence is a bigger change. Recommend deferring unless re-checks still occasionally false-positive after 1 + 2.

## Files to edit

- `supabase/functions/wordpress-proxy/index.ts` — add retry-on-transient-failure logic for `/_pda/` probes.
- `src/pages/DocumentUrlAudit.tsx` — lower `CONCURRENCY` to 2, add small dispatch delay.

## Expected outcome

Running the audit will produce far fewer false positives. Any `/_pda/` URL that returns HTML/404 on the first try gets one automatic retry inside the edge function, mimicking the manual Re-check button. The remaining "issues" should be genuine missing files (like 35615).
