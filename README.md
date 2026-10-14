# SwopBlog

A shared blogging application with JWT accounts, author-owned stories and drafts, comments, unique likes, searchable feeds, and role-based moderation. Built with vanilla HTML/CSS/JavaScript, Hono, jose and SQLite. The historical repository name does not describe the current frontend implementation.

The authentication core is adapted from [Swopnab/JWT-auth-service-plus-RBAC](https://github.com/Swopnab/JWT-auth-service-plus-RBAC). The original profile/feed design and browser demo are preserved.

## Run the shared app locally

Use **Node 24 LTS** (minimum Node 22.13). Node's built-in `node:sqlite` may print an experimental-feature warning on these versions; no separate database package or cloud account is needed.

```sh
npm ci
npm start
```

Open **http://127.0.0.1:8000**. Create an account, then write a story or save a private draft. Open another browser profile/incognito window and create another account to see the same public feed. The shared app starts with **no fake accounts or sample posts**. Sign-in is local to this server; it does not log into an existing account on the separate JWT project.

On first start, the app creates an ignored `.data/swopblog.sqlite` database and a random, ignored `.data/jwt-secret` with restricted permissions. Migrations run once using a migration ledger. Both data and signing key survive restarts. Back up the database and key before upgrades; do not commit either. A database backup should use SQLite's backup facilities or be taken after stopping the server, so WAL changes are not omitted.

Optional environment variables: `PORT` (default 8000), `BLOG_DATABASE_PATH` (default `.data/swopblog.sqlite`), and `JWT_ACCESS_SECRET` (a random string of at least 32 characters). The server binds to **127.0.0.1**, and browser mutations must come from that exact origin. Use the printed URL; a localhost alias is a different origin. No production hosting, email delivery, payment system or external AI service is configured.

## What's implemented

- Sign-up/sign-in, logout, logout on all devices, password changes and active-session revocation.
- Short-lived JWT access tokens, single-use refresh rotation and immediate live-session revocation, adapted from the owner's auth repo.
- Server-side SQLite persistence for users, profiles, posts, comments and likes. Profiles are joined by user ID, so changing a display name updates authorship display without rewriting stories.
- Authors can publish, edit, remove or unpublish their own stories. Private drafts never appear in someone else's public feed. A revision check rejects stale edits instead of silently overwriting newer changes.
- Public/category/search feeds and authenticated My stories/My drafts views. Posts and comments use bounded pages of 20 records with a cursor for loading more.
- Replies with author/moderator deletion. Each reader can like a post once, unlike it, and like it again; repeated identical requests do not inflate counts.
- Current database roles decide permission on every protected request. Moderator/Admin can remove public content; they cannot edit another author's story or access private drafts.
- Server-side validation, bounded input/body sizes, persistent write/login limits, parameterized SQL, foreign-key cascades, literal text rendering, local icons and responsive native dialogs.
- The original browser-local demo, compatible existing browser storage, and a static-only Pages build.

## Roles and moderation

New accounts always receive **User**. A registration payload cannot assign Admin or Moderator. To grant a role, the local operator can run:

```sh
npm run role -- someone@example.com Moderator
# or Admin; to remove elevated permissions:
npm run role -- someone@example.com User
```

This command replaces that account's roles in the local database. There is no self-promotion endpoint. Existing access tokens do not preserve a removed role because the middleware reloads current roles. Treat access to the local database/operator command as administrator access.

## Authentication boundaries

Access tokens exist **only in page memory**, not localStorage. Refresh tokens are in an **HttpOnly, SameSite=Strict** cookie limited to `/api/auth`; the cookie also becomes Secure when served over HTTPS. The database stores SHA-256 refresh-token digests. JWT verification pins HS256, issuer and audience and checks a live session bound to the token subject. Passwords use the original service's salted PBKDF2 implementation (100,000 iterations).

Logout, session revocation and password changes invalidate prior access immediately. Refresh replay revokes its session. The browser serializes refreshes within a page and uses Web Locks across same-origin tabs; older browsers without Web Locks may need to sign in again after concurrent-tab refresh. Origin checks protect cookie-based mutations, and the Node adapter takes rate-limit identity from the connection rather than spoofable request headers.

Email addresses are account identifiers, **not verified email addresses**. Verification emails and forgotten-password email recovery are not implemented. Password changes require the current password. Do not present this as an independently audited security service. Before public hosting, review HTTPS, reverse-proxy origin/IP handling, password parameters, abuse controls, backups, moderation and hosting limits. No paid integration is included.

## Demo and GitHub Pages

```sh
npm run demo
# Open http://127.0.0.1:8000 after stopping the shared server.
npm run build
```

`config.js` selects the browser demo for static hosting. The Node server serves a shared-mode config instead. The demo prominently says that data remains in that browser. GitHub Pages cannot run the Node API, so it does not claim to provide shared accounts. `dist-site` contains only public HTML, CSS, JavaScript and an avatar SVG; it never includes API code, signing keys, account data or SQLite files.

The old `swopblog_profile_v2` and `swopblog_posts_v2` keys remain intact. Shared mode does not read, overwrite or auto-publish that data. Switch back to the browser demo to access old local stories; copy the stories you want to publish into a signed-in account explicitly. Fictional seed authors/replies never enter the shared database. Storage failures in demo mode warn and keep the tab usable.

No executable script is loaded from a third-party CDN. Fonts and optional preset avatar images may still request Google Fonts/Unsplash; local icons and the default shared avatar work without them.

## Verification

```sh
npx playwright install chromium --only-shell
npm test
npm run build
npm audit --omit=dev
```

Tests use temporary/in-memory databases and fictional accounts; they never access `.data` account records. API tests execute the actual SQL and cover ownership, drafts, moderator permissions, stale edits, pagination, unique likes, foreign-key deletion, URL/field validation, origin/body limits, JWT claims, refresh replay, session/password revocation, rate limits and disk reopening. The shared browser suite also exercises the local role command and moderator deletion.

The original demo browser suite checks profile edits, stories, replies, likes, deletion, reload, literal HTML, blocked/corrupt storage, and 390px/768px/1440px layouts with external resources disabled. The shared browser suite uses two accounts and a guest in separate contexts against a real local server. It checks shared visibility, protected author actions, private drafts, edits, search/categories, HttpOnly-cookie reload, concurrent refresh, profiles, failed saves retaining text, deletion, server restart, logout-all and the same viewports.

CI runs these suites, builds the static artifact, audits runtime dependencies and checks that private backend files are absent from the build. Browser emulation is not a physical-device certification or a concurrency/load benchmark.

## Limits

This is a single-server portfolio application, not a deployed large-scale community. SQLite queries run synchronously in Node; profile avatars are bounded inline images or HTTP/HTTPS URLs, not a cloud upload pipeline. Story bodies are plain text (30,000 characters), titles 120 characters, replies 500 characters, bios 500 characters, and uploads are limited to 150 KB in the UI. The API caps bodies at 300 KB and avatar strings at 220,000 characters. No rich HTML editor, background email worker or external image fetching is used.

See [architecture and auth provenance](docs/ARCHITECTURE.md) for the data flow and the original JWT modules reused here.
