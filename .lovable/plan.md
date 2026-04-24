## Auth + Roles + Global WP Credentials

### 1. Database migrations

**Roles & profiles** (security-definer, roles never on profiles):
- `app_role` enum: `super_admin`, `admin`, `user`
- `profiles` (id → auth.users, email, display_name, created_at) + RLS
- `user_roles` (user_id, role, unique pair) + RLS
- `has_role(_user_id, _role)` and `is_admin_or_super(_user_id)` security-definer functions

**Invitations** (link-based, no email sending):
- `invitations` (email, role, unique hex token, invited_by, accepted_at, expires_at default now()+14 days)

**Signup trigger** `handle_new_user` on `auth.users` insert:
- Always creates `profiles` row
- If email = `russell@feeed.com` → grants `super_admin`
- Else if valid unaccepted invitation exists → grants invited role + marks accepted
- Else → raises exception "Sign-up requires a valid invitation"

**RLS:**
- `profiles`: SELECT self or admin/super; UPDATE self only
- `user_roles`: SELECT self or admin/super; INSERT/UPDATE/DELETE only `super_admin`
- `invitations`: full access for admin/super; public SELECT by token (so accept page works pre-auth)

**WordPress settings → global singleton:**
- Drop existing 4 per-user policies
- Drop `user_id` column; add `singleton boolean` with unique index
- New policies: SELECT for any authenticated user; INSERT/UPDATE only for admin/super

### 2. Frontend

**New files:**
- `src/contexts/AuthContext.tsx` — `user`, `session`, `roles`, `isAdmin`, `isSuperAdmin`, `loading`, `signIn`, `signOut`. `onAuthStateChange` set up BEFORE `getSession()`. Hydrates WP creds from DB into localStorage on sign-in.
- `src/components/ProtectedRoute.tsx` — redirects to `/login`; supports `requireRole="admin" | "super_admin"`.
- `src/pages/Login.tsx` — email + password (no signup form).
- `src/pages/AcceptInvite.tsx` — `/accept-invite?token=...`. Validates token, password form, calls `supabase.auth.signUp` with email pre-filled read-only.
- `src/pages/admin/Users.tsx` — admin/super only. Lists users + roles. Invite form (email + role; admins can only invite "user", super can also invite "admin"). On submit: insert invitation, display copyable link `/accept-invite?token=...`. Super-only promote/demote controls.
- `src/components/AppHeader.tsx` — user email, sign-out, role-gated nav links.

**Updates:**
- `src/App.tsx`: wrap in `<AuthProvider>`. Public routes: `/login`, `/accept-invite`. All others via `<ProtectedRoute>`. `/settings`, `/categories`, `/admin/users` gated `requireRole="admin"`.
- `src/pages/Settings.tsx`:
  - Admins/super: full WP edit form. Saves upsert singleton row in `wordpress_settings`, mirrors to localStorage.
  - Non-admins: read-only badge "WordPress: Connected to `<site_url>`" (option B) — no username/password shown.

### 3. WP credential hydration

In `AuthContext`, on session change:
- `select * from wordpress_settings limit 1` → mirror to localStorage (`wp_site_url`, `wp_username`, `wp_password`)
- Existing 6 call sites keep reading from localStorage unchanged
- One-time: if super signs in and DB row empty but localStorage has values, push localStorage → DB

### 4. Security trade-off (acknowledged)

Any signed-in user can technically read WP password from DB (RLS allows authenticated SELECT) so general users can upload. Settings UI hides creds from non-admins. Fully secure alternative (route all WP calls through `wordpress-proxy` edge function with secret-based creds) deferred — much bigger refactor.

### 5. Post-build

Run `security--run_security_scan` and address findings.

---

### Outcomes
- `russell@feeed.com` → auto super_admin on first sign-up
- Admins → manage WP creds, categories, settings; invite users via copyable link
- General users → ingest + upload documents; see read-only WP status in Settings
- WP credentials → single global DB row, cached per-device on sign-in