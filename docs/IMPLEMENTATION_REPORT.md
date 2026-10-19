# Implementation and testing report

This report records what was built, how it was verified, and what is still limited. Test counts are from the latest local run described under *Verification*.

## Starting point

The repository contained a working **single-user** Next.js 16 app (~4,600 lines). It already had a validated JSON store with atomic writes and snapshots, a timer state machine, an examination engine with question snapshots, automatic and manual grading and critical questions, competency gates, reward de-duplication, and a 12-phase / 48-topic roadmap. It had no authentication, no user isolation, and no course, diagram, maths, game, or flashcard features.

At that baseline, 4 of 19 tests failed (stale assertions on schema version and resource count) and lint reported 2 errors. Both were fixed.

## Stages

| Stage | Status | Main changes |
| --- | --- | --- |
| 1. Foundation and security | Done | Argon2id accounts; hashed server-side sessions (HttpOnly, SameSite=Lax, `__Host-` + Secure in production); rate limiting with persistent lockout; password reset and email verification; roles; audit log; account export and deletion; per-user JSON documents with ownership checks; cross-process file locks; landing, auth, account, and admin pages; Render single-instance configuration. |
| 2. Learning management and course content | Done | Versioned course → module → lesson content with 12 typed section kinds; admin authoring, preview, publishing, and history; catalogue, details and enrolment, lesson viewer with 8 learning modes, tutorial player, video player with timestamped notes; roadmap reordering and priorities; topic pages; resource licence and availability fields; Markdown knowledge base. |
| 3. Time tracking | Already present; verified | Timer survives refresh and restart (browser test); interruption recovery; manual corrections are flagged. |
| 4. Examination engine | Extended | 18 question types; sample bank of 27 questions and 8 blueprints; rules review with acknowledgement; ordered draft saving; question navigator; confidence ratings; detailed results; configurable revision intervals. |
| 5. Learning intelligence | Done | Categorised gap analysis; explainable recommendations with pin, snooze, and dismiss; readiness-to-advance panels. |
| 6. Visual, mathematical, and game-based learning | Done | Diagram studio (`@xyflow/react`); maths lab with 7 explorers and 13 problem generators; 10 games; spaced-repetition flashcards. |
| 7. Projects and analytics | Extended | Seven Recharts dashboard charts from stored data; consistency and rewards with formulas shown; expanded project fields with product readiness separate from learning. |
| 8. Production readiness | Done | README, `.env.example`, `render.yaml`, operator CLI, health check, security headers, dependency audit (0 vulnerabilities after a KaTeX override). |

## Required pages (47)

| # | Page | Route |
| --- | --- | --- |
| 1 | Dashboard | `/dashboard` |
| 2 | Learning roadmap | `/roadmap` |
| 3 | Topics and tasks | `/topics`, `/topics/[topicId]` |
| 4 | Learning timer | `/timer` |
| 5 | Session history | `/sessions` |
| 6 | Daily and weekly planner | `/planner` |
| 7 | Resource library | `/resources` |
| 8 | Knowledge base | `/knowledge` |
| 9 | Revision planner | `/revisions` |
| 10 | Self-assessment | `/assessments` |
| 11 | Examination dashboard | `/exams` |
| 12 | Examination library | `/exam-library` |
| 13 | Question bank | `/questions` |
| 14 | Examination blueprint editor | `/blueprints` |
| 15 | Active examination | `/active-exam` |
| 16 | Practical examination | `/practical-exam` |
| 17 | Examination results | `/exam-results` |
| 18 | Answer review | `/answer-review` |
| 19 | Learning gap analysis | `/gaps` |
| 20 | Competency dashboard | `/competency` |
| 21 | Examination history | `/exam-history` |
| 22 | Examination analytics | `/exam-analytics` |
| 23 | Discipline tracker | `/discipline` |
| 24 | Rewards and achievements | `/rewards` |
| 25 | Goals and aspirations | `/goals` |
| 26 | Projects and portfolio | `/projects` |
| 27 | AI Sales Agent roadmap | `/sales-agent` |
| 28 | Reports and analytics | `/reports` (CSV, JSON, printable HTML) |
| 29 | Backup and restore | `/backup` |
| 30 | Settings | `/settings` |
| 31 | Public landing page | `/` |
| 32 | Registration, login, logout, recovery | `/register`, `/login`, sign-out button, `/forgot-password`, `/reset-password`, `/verify-email` |
| 33 | Profile and learning preferences | `/account`, `/settings` |
| 34 | Course catalogue | `/courses` |
| 35 | Course details and enrolment | `/courses/[courseId]` |
| 36 | Module and lesson viewer | `/courses/[courseId]/lessons/[lessonId]` |
| 37 | Interactive tutorial player | `/courses/[courseId]/lessons/[lessonId]/tutorial` |
| 38 | Video lesson player and notes | `/videos`, `/videos/[courseId]/[lessonId]/[blockId]` |
| 39 | Diagram learning studio | `/diagrams` |
| 40 | Mathematics learning lab | `/math-lab` |
| 41 | Game and challenge centre | `/games` |
| 42 | Flashcards and spaced repetition | `/flashcards` |
| 43 | Learning path recommendations | `/recommendations` |
| 44 | Course and lesson authoring | `/admin/content/[courseId]` |
| 45 | Content management and publishing | `/admin/content`, `/admin/content/diagrams` |
| 46 | Account data export and deletion | `/account` |
| 47 | Administrative audit log | `/admin/audit` |

An end-to-end test signs in and loads every learner page and every admin page against the production build, failing on any error status or error page.

## Verification

Commands run on macOS with Node 26 (Render uses Node 22):

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed with no errors |
| `npm run lint` | Passed with no errors or warnings |
| `npm test` | **98 / 98 passed** (13 files) |
| `npm run build` | Succeeded |
| `npm run test:e2e` | **11 / 11 passed**: 5 HTTP tests against `next start`, 6 browser tests in Google Chrome via `playwright-core` |
| `npm audit --omit=dev` | 0 vulnerabilities |

Bugs found and fixed through testing and review:

- The password hint was inside its `<label>`, which corrupted the field's accessible name (found by the browser tests).
- Unlayered global CSS overrode Tailwind utilities, so button sizes and link colours were ignored (found from screenshots).
- The examination answer-saving race: parallel per-keystroke requests could leave an older answer stored last.
- The settings form ignored saved values because it rendered before they loaded.
- The collections API returned the request body instead of the stored record.
- A missing favicon caused console errors.

## Known limitations (deliberate or out of scope)

- **Single instance only.** JSON storage with file locks is safe for one Render instance on one disk; this is documented and pinned in `render.yaml`.
- **Email:** the Resend integration follows Resend's documented API but has not been tested against a live account. Without a provider, operators generate reset links with `npm run admin -- reset-link`.
- **No AI tutoring or AI grading**, and **no code execution.** Written, practical, and code answers are reviewed by a person against rubrics.
- **Content depth:** the seed course has 8 introductory lessons and the question bank has 27 sample questions. Both are labelled as samples and are not a complete curriculum or a verified item bank.
- **Language:** the interface is English. Course and lesson titles support Bangla where written; no automatic translation is performed or claimed.
- **Diagrams** export as JSON definitions, not PNG or SVG images. **Highlights** are stored as quoted passages.
- **Video:** watch progress is self-reported; transcripts and captions are linked, not extracted.
- **Link checks** cover only reachability, and some sites block automated checks; those are shown as "needs checking".
- The earlier `course-materials` page and workbook catalogue (Excel and Python builders) remain as they were.
