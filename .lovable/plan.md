

## Fix: Strip Spaces from WordPress Application Passwords

### Problem
WordPress Application Passwords are displayed with spaces for readability (e.g., `abcd efgh ijkl mnop`), but the REST API expects them without spaces in the Basic Auth header. The current code passes the password as-is to `btoa()`, causing a 401 "not logged in" error.

### Solution
Strip all spaces from the `password` field at the top of the edge function, before it is used anywhere. This is a single-line fix that affects all auth paths.

### Changes

**`supabase/functions/wordpress-proxy/index.ts`**

- After destructuring `password` from the request body (around line 38), add a line to strip spaces:
  ```
  const cleanPassword = password ? password.replace(/\s+/g, '') : password;
  ```
- Replace all usages of `password` in `btoa()` calls with `cleanPassword` (lines 50, 96, 165, 224, 330 -- five occurrences total)

This single change fixes authentication for `/users/me`, `fetch-all-dlp-titles`, `test-connection`, `check-taxonomies`, and all other WordPress API calls.

### Files to modify
- `supabase/functions/wordpress-proxy/index.ts` -- strip spaces from password, use cleaned value in all auth headers

