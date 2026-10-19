# AI/ML Learning Tracker

A personal learning platform for progressing from Python and mathematics foundations to advanced AI engineering and agent systems. The Next.js app combines a structured curriculum, learning resources, hands-on practice, progress tracking, and self-assessment in one workspace.

## What it includes

- **Guided learning path:** 12 phases with 48 seeded topics, prerequisites, learning objectives, estimated study time, practical exercises, and completion criteria.
- **Learner dashboard:** recommended next lesson, linked study material, topic progress, study history, and assessment evidence based on saved records.
- **Lesson tracking:** start, complete, and revisit topics; use phase and status filters to find the next step.
- **Resource library:** 77 curated materials across courses, documentation, videos, audio, lecture slides, papers, repositories, and guided practice. Materials are grouped by learning phase and open at their source.
- **Examinations:** question bank and configurable knowledge checks and practical challenges, with saved attempts, timed sessions, supported auto-grading, and manual grading for written work.
- **Study tools:** learning timer, daily and weekly planning, review schedules, notes, projects, goals, reports, and competency evidence.
- **Workbook support:** Python scripts and Excel workbooks for creating and maintaining the companion learning tracker workbook.
- **Local-first persistence:** validated JSON storage, schema migrations, automatic snapshots, and JSON export/restore.

The application does not fabricate learner activity, scores, competencies, experiment results, or customer research. Written and practical responses are reviewed manually; submitted code is not executed. Closed-book status is self-declared and is not proctored.

## Run locally

Requirements: Node.js 22 and npm.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful commands:

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
npm start
```

## Data and configuration

By default, the app stores its data in `data/learning-tracker.json`. The `data/` directory is excluded from Git so personal progress and backups are not committed. On first run, the app creates the learning catalog and sample diagnostic questions; sample questions are identified as samples and are not externally verified.

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATA_DIR` | `./data` | Directory for the JSON database and snapshots. Use persistent writable storage when deployed. |
| `BACKUP_RETENTION` | `7` | Number of automatic snapshots to retain (integer from 1 to 100). |
| `NODE_VERSION` | `22` | Runtime configured for the Render deployment. |

The JSON store is designed for one Node.js process. It is not a multi-user database and should not be shared by multiple concurrent app instances.

## Workbook tools

The repository also contains the Excel workbooks and Python builder scripts used to create the companion workbook. They can be run independently from the Next.js application. Workbook resource catalogs are checked in under `src/data/`; linked Google Drive files remain subject to their owners’ sharing permissions.

## Deploy

A `render.yaml` Blueprint is included for a Node web service with a persistent disk. Connect the repository to Render, create the service from the Blueprint, and verify that `DATA_DIR` points to the persistent disk mount. Keep an export outside the service disk as a separate backup.

## Security and limitations

- There is no built-in authentication or authorization. Protect any public deployment with an appropriate access layer.
- Closed-book exams are self-declared and not tamper-proof.
- Practical and written answers require manual review; the application does not execute submitted code.
- JSON file writes are serialized within one Node process only.
- No external AI grading, model API, or autonomous sales integration is included.
