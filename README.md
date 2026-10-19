# AI/ML Learning Tracker

A multi-user learning platform for progressing from Python and mathematics foundations to production AI engineering and commercial AI agents. Each learner gets a private workspace that tracks what they **know**, what they can **implement independently**, what they have **forgotten**, and what to **learn next**. It does this from recorded evidence, not from hours logged.

The application never fabricates learner activity, scores, competencies, or achievements. Seeded examination questions are labelled as samples and are not independently verified. Closed-book results are self-declared, not proctored. Written and practical answers are graded by a person against a rubric. **No AI grading or AI tutoring service is connected**, and submitted code is never executed.

## Contents

- [Run locally](#run-locally)
- [Architecture](#architecture)
- [Storage: JSON files and their limits](#storage-json-files-and-their-limits)
- [Authentication and security](#authentication-and-security)
- [Configuration](#configuration)
- [Deploy to Render](#deploy-to-render)
- [Backup and recovery](#backup-and-recovery)
- [Operator commands](#operator-commands)
- [Testing](#testing)
- [Formulas](#formulas)
- [Known limitations](#known-limitations)

## Run locally

Requirements: Node.js 22 or later, npm.

```bash
npm ci
cp .env.example .env.local      # adjust ADMIN_EMAILS to your email to become an administrator
npm run dev
```

Open <http://localhost:3000>, create an account, and you are taken to your dashboard. In development, emails (verification, password reset) are printed to the server console.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm test` | Unit and integration tests |
| `npm run build` | Production build |
| `npm run test:e2e` | End-to-end tests against the production build (run `npm run build` first) |
| `npm start` | Production server |
| `npm run admin -- …` | Operator commands (see below) |

## Architecture

```
src/
  app/
    page.tsx, privacy/            Public landing and privacy pages
    (auth)/                       Login, registration, password recovery, email verification
    (app)/                        Authenticated area (layout validates the session)
      dashboard/, roadmap/, account/, admin/, [section]/ …
    api/                          Route handlers, all wrapped by withUser()/withPublic()
  proxy.ts                        Optimistic cookie gate + cross-site mutation rejection
  components/                     UI components
  lib/
    auth/                         Accounts, sessions, tokens, rate limiting, audit log
    storage/                      file-store (atomic writes, locks), document, user-store, migrations
    services/                     Timer, examinations, competency, rewards, dashboard
    calculations/                 Pure, tested calculations
    model.ts                      Zod schemas for every learning entity
    seed.ts                       Initial roadmap, resources, sample questions
  data/                           Curated catalogs bundled with the app
scripts/admin.ts                  Operator CLI
tests/                            Unit and integration tests (node:test)
e2e/                              End-to-end tests against `next start`
```

Business logic lives in `lib/services` and `lib/calculations`, not in components. Every route handler gets the user from the validated server-side session. Request bodies are never trusted for identity.

## Storage: JSON files and their limits

All data is stored as JSON files under `DATA_DIR`:

```
DATA_DIR/
  system/accounts.json           Accounts (email, Argon2id hash, role, profile)
  system/sessions.json           SHA-256 hashes of session tokens, expiry
  system/auth-tokens.json        SHA-256 hashes of email-verification / reset tokens
  system/audit-log.json          Administrative audit trail
  content/…                      Shared course content (administrator-managed)
  users/<userId>/learning-data.json   One learner's complete learning workspace
  users/<userId>/backups/snapshot-*.json
```

**How integrity is protected**

- **Isolation by construction:** a learner's file is chosen only from the authenticated session's user id. A record id from another learner can't resolve, because that learner's file is never opened. The file also records its owner, and a mismatch is refused.
- **Validation:** every read and write is validated with Zod schemas, including cross-references (for example, a session must point to an existing topic). Invalid data is never written.
- **Atomic writes:** each write goes to a temporary file, is fsynced, then renamed over the original. A crash leaves either the old or the new file, never a partial one.
- **Serialized writes, no lost updates:** every mutation is read-modify-write under an exclusive lock. The lock is an in-process queue plus a lock file using `O_EXCL`, so writes are serialized even across processes on the same disk. Stale locks (over 30 seconds) are reclaimed.
- **Corruption handling:** invalid JSON is reported as an error and the file is left untouched for manual recovery from a snapshot.
- **Versioned schema:** learning data carries `schemaVersion`. Older versions are migrated on read and existing records are preserved.
- **Paths:** paths are built only from validated segments (user ids must be UUIDs) and are checked to stay inside `DATA_DIR`. No endpoint serves raw files.

**Limits — read before deploying.** JSON-file storage is suitable for a **small deployment on a single application instance with one persistent disk**: tens of active learners, low write concurrency. It is not a robust long-term choice for high concurrency or horizontal scaling:

- Render persistent disks attach to exactly one instance and cannot be shared. Running two instances would give each its own disk and split the data. `render.yaml` pins `numInstances: 1`. Do not enable autoscaling.
- Each write rewrites a whole file. System files (accounts, sessions) are shared by all users, so heavy sign-in traffic serializes on them.
- The in-memory login rate limiter is per process. The persistent account lockout still applies after restarts.

If the platform outgrows these limits, the storage layer (`lib/storage`) is the only module that needs replacing. That would be a deliberate decision; no database has been substituted.

## Authentication and security

- **Passwords** are hashed with **Argon2id** (`@node-rs/argon2`, OWASP parameters: 19 MiB memory, 2 iterations). The minimum length is 12 characters. Unknown emails go through a dummy hash so response timing does not reveal which accounts exist.
- **Sessions:** a random 256-bit token is stored in an `HttpOnly`, `SameSite=Lax` cookie, which is `Secure` with the `__Host-` prefix in production. Only its SHA-256 hash is stored. Sessions have a 14-day idle expiry (`SESSION_TTL_DAYS`) and an absolute 90-day limit. They can be revoked individually from the account page. Changing your password revokes your other sessions; a password reset revokes all of them.
- **CSRF:** state-changing requests must carry a same-origin `Origin` header (or `Sec-Fetch-Site: same-origin`), on top of SameSite cookies.
- **Brute force:** login is rate-limited per IP (30 per 15 minutes) and per email (10 per 15 minutes). After 10 consecutive failures the account locks for 15 minutes, and this lock is persisted. Registration and reset requests are also rate-limited.
- **Recovery:** reset links are single-use, expire after 1 hour, and are stored only as hashes. Reset requests return the same response whether or not the account exists. A weak new password is rejected without consuming the link.
- **Email verification:** links are single-use and expire after 48 hours. Verifying requires a button press (POST), so link-scanning email filters can't consume the token.
- **Roles:**
  - `learner` can access only their own data.
  - `administrator` can manage accounts' roles and shared content. Administrators have no feature for reading learners' notes, answers, or history. The last administrator can't be demoted or deleted. Role changes, content publishing, and account deletions are recorded in the audit log.
- **Account data:** learners can download a complete export and permanently delete their account (password and typed confirmation required).
- **Headers:** `X-Frame-Options: DENY`, `nosniff`, a strict referrer policy, and a permissions policy.
- **Markdown and user text** are rendered safely, without raw HTML.

## Configuration

See `.env.example`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATA_DIR` | `./data` | Root for all JSON data. On Render: `/var/data/learning-tracker` (the disk mount). |
| `BACKUP_RETENTION` | `7` | Automatic snapshots kept per learner (1–100). |
| `APP_URL` | — | Public base URL for emailed links. Falls back to Render's `RENDER_EXTERNAL_URL`. In production, links are never built from request headers. |
| `ADMIN_EMAILS` | — | Comma-separated emails that receive the administrator role when they register. |
| `SESSION_TTL_DAYS` | `14` | Session idle lifetime (1–90 days). |
| `COOKIE_SECURE` | production: `true` | Set `false` only for plain-HTTP testing of a production build. |
| `EMAIL_PROVIDER` | dev: `console`, prod: `none` | `resend`, `console`, or `none`. |
| `RESEND_API_KEY`, `EMAIL_FROM` | — | Required for `EMAIL_PROVIDER=resend`. |
| `REQUIRE_EMAIL_VERIFICATION` | `false` | Block sign-in until verified (only when email delivery works). |

**About email:** the Resend integration calls Resend's documented HTTP API. It has not been tested against a live Resend account in this repository, so send yourself a test reset email after configuring it. Without a provider, self-service recovery emails can't be delivered. Users are told this, and an operator can generate a reset link with `npm run admin -- reset-link <email>`.

## Deploy to Render

1. Push the repository to GitHub.
2. In Render, choose **New → Blueprint** and select the repository. `render.yaml` creates a Node web service with a 1 GB persistent disk mounted at `/var/data/learning-tracker`, `DATA_DIR` pointing to it, a health check at `/api/health` (which performs a real write/read on the disk), and **one instance**.
3. Set the secret environment variables in the dashboard: `ADMIN_EMAILS`, `APP_URL` (your service URL), and, for email, `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, and `EMAIL_FROM`.
4. Deploy, then register using an address listed in `ADMIN_EMAILS`.

Important:

- Persistent disks require a paid instance type and disable zero-downtime deploys. Expect a brief restart on each deploy.
- **Never** store data in the application directory on Render; it is replaced on every deploy. Only `DATA_DIR` on the disk persists.
- Keep `numInstances: 1`. Do not add autoscaling.
- Upgrading from the earlier single-user version leaves `DATA_DIR/learning-tracker.json` untouched. After registering, import it into your account with `npm run admin -- import-legacy you@example.com` from the Render shell.

## Backup and recovery

- **Automatic:** the first data access each day creates a snapshot of that learner's data in `users/<id>/backups/`. Every restore snapshots the current state first. The newest `BACKUP_RETENTION` snapshots are kept.
- **Learner-controlled:** the *Backup and restore* page creates manual snapshots, lists them, restores one, downloads a full export, and restores an uploaded export. Uploads are validated completely before anything is replaced, and explicit confirmation is required. An export from another account is rejected.
- **Disk-level:** use Render's disk snapshots, or periodically copy `DATA_DIR` off the server (for example `tar czf` from the Render shell) and store the copy somewhere separate. Server snapshots live on the same disk and do not protect against losing the disk.
- **Corruption:** if a learner's file is corrupt, the app shows an error and does not overwrite it. Copy the newest valid `backups/snapshot-*.json` over `learning-data.json` from the shell, or restore it from the backup page once the file is readable.

## Operator commands

Run on the server (Render shell) with the same environment as the app:

```bash
npm run admin -- reset-link learner@example.com          # print a one-hour reset link
npm run admin -- set-role learner@example.com admin      # or learner (audited)
npm run admin -- import-legacy you@example.com [file]    # import a pre-accounts workspace
```

## Testing

```bash
npm test               # unit and integration (route handlers called directly)
npm run build && npm run test:e2e   # production server, real cookies, restart persistence
```

These suites cover: registration and login validation; Argon2id storage; session expiry, logout, and revocation; rate limiting and lockout; the password-reset and verification flows; anonymous, forged-cookie, and cross-site rejection; cross-user read, update, delete, timer, examination, export, and restore attempts; role enforcement and auditing; concurrent writes from several users, from one user, and from a second process; corruption handling; path traversal; snapshot retention; restore validation; legacy import; and persistence across a server restart.

## Formulas

- **Time-estimation accuracy** = `100 × (1 − |actual − estimated| / estimated)`, clamped to 0–100. It is N/A when the estimate is zero or missing. It measures planning accuracy, not ability.
- **Examination score** = `marks earned / total marks × 100`. It is N/A when the total is zero. A failed critical (practical) question blocks a pass whatever the percentage.

## Known limitations

- The deployment is limited to a single instance (see *Storage*).
- Closed-book examinations are self-declared and not tamper-proof.
- Submitted code is not executed. Programming answers are reviewed manually against recorded test cases.
- Email delivery depends on an external provider you configure.
- The Excel workbooks and Python `builder_*.py` scripts in the repository root are an independent companion workbook and are not used by the web app.
