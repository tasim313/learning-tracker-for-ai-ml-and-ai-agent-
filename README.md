# AI/ML Learning Tracker

A multi-user learning platform for progressing from Python and mathematics foundations to production AI engineering and commercial AI agents. Each learner gets a private workspace that tracks what they **know**, what they can **implement independently**, what they have **forgotten**, and what to **learn next**. It does this from recorded evidence, not from hours logged.

The application never fabricates learner activity, scores, competencies, or achievements. Seeded examination questions are labelled as samples and are not independently verified. Closed-book results are self-declared, not proctored. Written and practical answers are graded by a person against a rubric. **No AI grading or AI tutoring service is connected**, and submitted code is never executed.

## Features

**Learn**
- *Course platform:* Courses are organised into modules and lessons. Lessons are built from typed sections: explanations, callouts, code, images, videos, interactive diagrams, worked examples, guided and independent exercises, pause-and-practise checkpoints, knowledge checks before and after the lesson, practical assignments, reflections, further reading, and downloadable material.
- *Lesson tools:* Each lesson has a glossary, prerequisites, related roadmap topics, previous/next navigation, bookmarks, notes, highlights and questions, and progress checkpoints. Knowledge checks are graded on the server, and answer keys are never sent to the browser before an attempt.
- *Learning modes:* read and study, watch and take notes, visualize, practise step by step, challenge, exam mode, review mistakes, and build a project. Switching modes keeps your progress and the last mode is remembered. An *interactive tutorial player* steps through a lesson one section at a time and resumes where you stopped.
- *Video lessons:* YouTube embeds use the privacy-enhanced domain with no autoplay, and only where embedding is marked as permitted; otherwise a link is shown. You can jump to chapters, take notes at timestamps, and record your own watch progress. The platform does not read the video provider's history and does not extract transcripts.
- *Seed course:* "AI Engineering Foundations (introductory)" has 8 platform-authored lessons, from vectors to tool-calling agents. It is clearly labelled as introductory seed material, not a comprehensive curriculum. External links are attributed and have not been availability-checked by the platform.
- *Roadmap:* 12 editable phases and 48 topics, grouped by subject and placed on a suggested one-phase-per-month schedule. Each topic has persistent subtopics and learning, recall, and practical tasks. Task progress is separate from topic completion and demonstrated competency. Phases and topics can be reordered and topics reprioritized. Each topic has its own page with learning status, competency, a **Readiness to Advance** panel, estimated vs. revised vs. actual time, assessment history, linked lessons, resources, notes, and revisions.
- *Resource library:* Records publisher, licence, attribution, and language. A **link check** performs a real, SSRF-protected HTTP request and stores the result with a timestamp; links are marked "not checked" until one runs. The library also has a searchable Markdown **knowledge base**.

**Practise**
- *Mathematics Learning Lab:* interactive explorers for vectors and similarity, derivatives and tangents, gradient descent (including divergence), Bayes with natural frequencies, the normal distribution, descriptive statistics, and evaluation metrics. 13 generated problem types at three levels come with hints, a "show your work" field, server-checked answers, step-by-step solutions, and common mistakes. Numerical approximations are labelled.
- *Diagram Learning Studio:* diagrams are stored as structured nodes and edges (`@xyflow/react`). You can reveal them step by step, inspect nodes, read a text alternative, export JSON, answer questions generated from the diagram's structure, and copy or draw your own diagrams as exercises.
- *Game and Challenge Centre:* concept matching, workflow reconstruction, code-output puzzles, bug hunts, AI-sales safety decisions, and an optionally timed maths sprint. Answers are graded on the server and you can revisit your mistakes. Game scores are kept separate from examinations, and rewards are granted once per game.
- *Flashcards:* spaced repetition with configurable intervals (default 1/3/7/14/30 days). Cards can be generated from lesson glossaries.
- *Timer and planning:* a timestamp-based timer with learning, review, debugging, and practical activity categories; session history, daily and weekly planners, revision planner, and self-assessment.

**Assess**
- *Examination engine:* 8 examination types and 18 question types. The seed includes a sample bank of 27 questions and 8 blueprints, all labelled as unverified samples. Before starting, you review the rules (objectives, time limit, threshold, allowed materials, practical requirements, retake policy) and must acknowledge them. The active examination has a timer computed from saved timestamps, debounced and strictly ordered draft saving, a question navigator, unanswered-question warnings, and confidence ratings kept separate from grading.
- *Results:* marks, percentage, threshold, outcome, time taken, correct/partial/incorrect/unanswered counts, and breakdowns by topic, difficulty, and question type. Practical status, improvement since the previous attempt, and first/best/latest scores are reported separately.
- *Learning gap analysis:* gaps are grouped into fundamental knowledge, conceptual understanding, recall, application, debugging, practical implementation, and time management. Each shows the tested concept, your answer, the expected answer, why it was marked that way, *possible* misconceptions, prerequisites, recommended exercises, and a revision date.
- *Competency:* topic, practical, and retention gates (configurable), as described below.

**Personalize**
- *What to learn next:* explainable recommendations from diagnostics, examinations, practical evidence, retention, revisions, flashcards, lesson progress, and practice. Each one states its reason and evidence. You can pin, snooze, or dismiss any recommendation.
- *Dashboard charts (Recharts):* daily planned vs. actual time, weekly time and study days, examination scores over time, retention, proficiency by subject, completion by phase, and project progress. Every chart has a data-table alternative, date and subject filters, and empty states.
- *Rewards and discipline:* XP, levels, badges, optional weekly challenges, and monthly goals. The consistency score excludes rest days and has its formula shown on the page.

**Administer**
- Course authoring with draft editing, live preview (quizzes graded locally), validation, publish and unpublish, and versioned history (every published version is kept). A shared diagram library, account roles, and an audit log are also included.

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

Current results: **101 unit and integration tests** and **11 end-to-end checks** (5 HTTP-level tests against `next start`; 6 browser tests are skipped automatically if Google Chrome is not installed). See `docs/IMPLEMENTATION_REPORT.md` for the latest recorded run.

These suites cover: registration and login validation; Argon2id storage; session expiry, logout, and revocation; rate limiting and lockout; the password-reset and verification flows; anonymous, forged-cookie, and cross-site rejection; cross-user read, update, delete, timer, examination, export, and restore attempts; role enforcement and auditing; concurrent writes from several users, from one user, and from a second process; corruption handling; path traversal; snapshot retention; restore validation; legacy import; and persistence across a server restart.

## Formulas

- **Time-estimation accuracy** = `100 × (1 − |actual − estimated| / estimated)`, clamped to 0–100. It is N/A when the estimate is zero or missing. It measures planning accuracy, not ability.
- **Examination score** = `marks earned / total marks × 100`. It is N/A when the total is zero. A failed critical (practical) question blocks a pass whatever the percentage.
- **Consistency** = `planned study days with ≥ 1 completed session ÷ planned study days × 100` over 28 days. Planned study days are the weekdays chosen in Settings, minus planner rest days, so breaks never lower the score. The **flexible streak** counts consecutive planned study days.
- **Level** = `floor(XP ÷ 100) + 1`. XP sums recorded reward events, each awarded once: session 2, lesson 3, first fully correct game 5, passed assessment 10, project milestone 20.
- **Revision schedule:** not yet passed → first interval; first pass → second interval; each further pass → next interval (capped). Intervals are configurable, with a default of 1, 3, 7, 14, and 30 days.
- **Competency:** a topic exam at ≥ 80% gives *Competent* (*Developing* while required practical evidence is missing). A practical pass at ≥ 80% is required for programming and engineering topics. One retention pass at ≥ 70% gives *Proficient*; two retention passes give *Mastered*. Thresholds are configurable. Time spent, lesson completion, and self-ratings never raise competency.

## Known limitations

- The deployment is limited to a single instance (see *Storage*).
- Closed-book examinations are self-declared and not tamper-proof.
- Submitted code is not executed. Programming answers are reviewed manually against recorded test cases.
- Email delivery depends on an external provider you configure.
- **No AI tutoring or AI grading is integrated**; the platform works entirely without a paid AI API.
- The interface text is English. Course and lesson content has Bangla title fields, and Bangla is shown only where a translation has actually been written.
- Diagrams export as JSON definitions, not images. Highlights are saved as quoted passages, not inline marks in the text.
- Video watch progress is self-reported, and transcripts are linked only when the content author provides a link.
- Link checks can report "needs checking" for sites that block automated requests. A short DNS-rebinding window between the address check and the request is mitigated by rate limiting and by returning only reachability, never page content.
- The Excel workbooks and Python `builder_*.py` scripts in the repository root are an independent companion workbook and are not used by the web app.
