

## WordPress Duplicate Check: API Efficiency Analysis

### Current Problem

Each duplicate check triggers **5-6 separate edge function invocations**, each of which independently authenticates against WordPress (wp-login.php + cookie + nonce). Here's the breakdown:

| # | Call | Purpose | Necessary? |
|---|------|---------|------------|
| 1 | `fetch-user-me` | Diagnostic — verify auth | No (debugging only) |
| 2 | `fetch-wp-categories` "standards" | Diagnostic — inspect categories | No |
| 3 | `fetch-wp-categories` "system" | Diagnostic — inspect categories | No |
| 4 | `fetch-wp-categories` "service" | Diagnostic — inspect categories | No |
| 5 | `fetch-all-dlp-titles` | **The actual duplicate check** | Yes |
| 6 | `fetch-dlp-detail` | Fetch detail if match found | Yes |

So **4 out of 6 calls are purely diagnostic** and were added during debugging. Each triggers a full WordPress login cycle (wp-login.php POST + admin page fetch for nonce). That's likely what's causing rate limiting.

Additionally, the in-memory cache is explicitly disabled (line 178: "Always fetch fresh data - never use cache"), so even consecutive checks re-fetch all documents.

### Proposed Fix

**1. Remove diagnostic calls from `checkExistingDlpDocumentWithLogs`**

Strip out the `fetch-user-me` and the 3x `fetch-wp-categories` loop. These were useful for initial debugging but are now unnecessary overhead. The function should go straight to fetching DLP documents.

**2. Re-enable the session cache**

Allow `fetchAllDlpDocuments` to use its in-memory cache when credentials haven't changed. The "Clear WP Cache" button already exists for manual resets. This reduces repeated checks from ~5 calls to 0-1 calls.

**3. Keep the log modal useful**

The modal will still show: credential check, normalized search term, document comparison list, and match result — just without the 4 extra WordPress round-trips.

### Files to modify

- **`src/utils/wordpressUtils.ts`** — Remove the `fetch-user-me` call and the `fetch-wp-categories` loop from `checkExistingDlpDocumentWithLogs`; re-enable cache in `fetchAllDlpDocuments`

This reduces each duplicate check from 5-6 API calls to 1-2 (or 0-1 with cache).

