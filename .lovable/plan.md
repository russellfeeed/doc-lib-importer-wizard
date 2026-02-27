

## Add `/users/me` Authentication Check to WordPress Duplicate Check Log

### What changes

Before fetching DLP documents, the system will call `GET /wp-json/wp/v2/users/me` via the WordPress proxy edge function to verify authentication. The request URL and full response will be displayed in the duplicate check log modal.

### Changes

**1. Edge function: `supabase/functions/wordpress-proxy/index.ts`**

Add a new action `fetch-user-me` that:
- Accepts `siteUrl`, `username`, `password`
- Calls `GET {siteUrl}/wp-json/wp/v2/users/me`
- Returns the full JSON response (user ID, name, roles, capabilities, etc.)

**2. Client utility: `src/utils/wordpressUtils.ts`**

In `checkExistingDlpDocumentWithLogs`, after the "API user" log line and before the document fetch:
- Log the outgoing request: `GET {url}/wp-json/wp/v2/users/me`
- Call the edge function with action `fetch-user-me`
- Log the full JSON response (formatted) so the user can see their WordPress user ID, display name, roles, and capabilities
- If the call fails, log the error but continue with the document fetch (non-blocking)

### Technical detail

The new edge function action will be minimal:

```text
action: 'fetch-user-me'
  -> GET {siteUrl}/wp-json/wp/v2/users/me
  -> Returns full JSON response
```

In the log modal, users will see something like:

```text
[10:30:01] API user: doc-lib-importer-wizard.lovable.app
[10:30:01] GET /wp-json/wp/v2/users/me
[10:30:02] Response: { "id": 42, "name": "...", "roles": ["editor"], ... }
[10:30:02] Fetching all DLP documents from WordPress...
```

### Files to modify
- `supabase/functions/wordpress-proxy/index.ts` -- add `fetch-user-me` action
- `src/utils/wordpressUtils.ts` -- add `/users/me` call in `checkExistingDlpDocumentWithLogs`

