# sp.product-roadmap — Student, Teacher & Platform Features

**Project:** SMIT AI Teaching Assistant
**Scope:** `smit-backend` + `smit-frontend`
**Build tool:** OpenCode
**Excluded from this spec:** email/WhatsApp notifications (deliberately out of scope for this pass)

> Implement in **phases**, in order. Each phase should compile, pass tests,
> and be usable on its own before you move to the next — later phases depend
> on schema/model changes made in Phase 0. Don't skip ahead.

---

## Current state (read this before touching anything)

- Backend agents today: `code_review.py`, `rubric.py`, `feedback.py`,
  `tutor.py`, orchestrated by `orchestrator.py`. `tutor.py` already produces
  English + Roman Urdu explanations of mistakes as part of the pipeline
  (`TutorOutput`) — reuse this agent for the new Q&A feature instead of
  writing a new one.
- DB models (`models/db_models.py`): `StudentModel` (has a plain `batch:
  str` field, no course/assignment concept), `SubmissionModel` (no stored
  original source code, no `assignment_name`), `ReportModel`, `RubricModel`
  (no versioning — one row per rubric, no history).
- Frontend routes: `/submit`, `/report/[id]`, `/history` (student side),
  `/dashboard`, `/rubrics` (teacher side). Auth is currently a dev-mode
  bypass in `verify_token` — real auth is Phase 0 here because everything
  else (per-role dashboards, appeals) assumes it.

---

## Phase 0 — Foundations (schema + auth)

These unlock everything else. Do this first even though it's not a visible
"feature" on its own.

### 0.1 Real authentication
- Replace the dev-mode `verify_token` bypass in `api/routes/admin.py` (and
  anywhere else it's used) with real JWT issuing/verification:
  `POST /api/v1/auth/login` (email + password) issuing a JWT with a `role`
  claim (`student` | `teacher`), verified by a proper dependency.
- Add a `PasswordHash` column to `StudentModel`, and a new `TeacherModel`
  (id, name, email, password_hash, created_at).
- Frontend: add a `/login` page, store the JWT (httpOnly cookie via a small
  Next.js route handler — not localStorage), and gate `(student)` vs
  `(teacher)` route groups behind role middleware.

### 0.2 Course/assignment structure
- Add `CourseModel` (id, name, batch) and `AssignmentModel` (id, course_id,
  name, rubric_id, due_date, created_at).
- Add `assignment_id: ForeignKey("assignments.id")` to `SubmissionModel`.
- Update `/submit` to require an `assignment_id` (dropdown populated from
  `GET /api/v1/assignments`), instead of the current flat, unstructured
  submission.
- Update `/history` and `/dashboard` to group/filter by course → assignment.

### 0.3 Store original source code
- Add `source_code: Mapped[str] = mapped_column(Text)` to `SubmissionModel`
  (small assignments only — this is what unblocks Feature 3 and the "resubmit"
  flow from the earlier facilities spec, which currently has no persisted
  code to fall back on when the client store is empty).

### 0.4 Rubric versioning
- Add `RubricVersionModel` (id, rubric_id, version_number, criteria_json,
  max_score, created_at, created_by) and make `RubricModel` a "head pointer"
  (current version) rather than the only copy. Every edit via `/rubrics`
  creates a new version row instead of overwriting in place.

Run full backend test suite after Phase 0; fix any broken tests from the
schema changes before continuing.

---

## Phase 1 — Student features

### 1.1 Progress tracking ("My Growth")
- New endpoint `GET /api/v1/students/{id}/progress`: returns a time series of
  `{submission_id, created_at, score, grade}` plus a `mistake_type_frequency`
  breakdown (counts per `MistakeType` across all the student's completed
  reports).
- New page `app/(student)/progress/page.tsx`: a score-over-time line chart
  and a mistake-type frequency bar chart (reuse the charting approach already
  used in `dashboard/page.tsx` for grade distribution — check what charting
  library is already a dependency before adding anything new).

### 1.2 Follow-up Q&A on a report
- New endpoint `POST /api/v1/report/{id}/ask` — body `{question: str}`.
  Runs `tutor_agent` (from `agents/tutor.py`) with the original report's
  mistakes + student's question as input, returns a short English + Roman
  Urdu answer using the existing `TutorOutput` shape.
- On the report page, add a small chat panel below the mistake list:
  a text input + "Ask" button, rendering a scrollable list of past
  Q&A pairs for that report (in-memory for now, no persistence needed on
  the DB — this isn't graded, it's a study aid).

### 1.3 "Fix it yourself" targeted retry
- New endpoint `POST /api/v1/mistakes/{mistake_id}/reverify` — body
  `{corrected_snippet: str}`. Runs `code_review.py`'s single-mistake check
  (not the full pipeline) against just that snippet and returns pass/fail +
  a short note.
- On the report page, each `MistakeList` item gets an expandable inline code
  editor (a plain `<textarea>` is fine, no need for a full code-editor
  dependency) with a "Recheck" button that calls the endpoint above and shows
  a pass/fail badge next to that specific mistake.

### 1.4 Personalized practice suggestions
- Extend `feedback.py`'s output (`FeedbackOutput` in `models/schemas.py`) with
  an optional `practice_suggestions: list[str]` field — 1-2 short practice
  prompts targeting the student's most frequent mistake type from Phase 1.1's
  data, generated by the feedback agent as part of the existing pipeline run
  (don't add a new agent call — extend the existing feedback agent's prompt
  and output schema).
- Render these as a small "Practice Next" panel at the bottom of the report
  page, styled like the existing `MistakeList` cards.

### 1.5 Streaks / badges
- New endpoint `GET /api/v1/students/{id}/badges` computing simple derived
  badges from submission history (e.g. "5 submissions with zero syntax
  errors", "3-week submission streak") — pure computation over existing data,
  no new DB table needed for v1.
- Small badge row on `/history` and `/progress` pages.

---

## Phase 2 — Teacher features

### 2.1 Batch-wide mistake analytics
- New endpoint `GET /api/v1/batches/{batch}/analytics`: aggregate mistake
  type frequency and average score across every submission in a batch (for a
  given date range/assignment), not just per-student.
- New section on `/dashboard`: a "Class Insights" panel — a stacked bar or
  simple ranked list like "Logic errors: 62% of students this week" — this
  is the single highest-priority teacher feature, prioritize it if time is
  short.

### 2.2 Rubric versioning + comparison
- Builds on the `RubricVersionModel` from Phase 0.4.
- `/rubrics` page: add a version history list per rubric, and a simple
  side-by-side comparison view — for two selected versions, show the average
  score of submissions graded under each (requires tracking which rubric
  *version* graded each submission — add `rubric_version_id` to
  `SubmissionModel`).

### 2.3 Manual override / appeal flow
- New endpoint `PATCH /api/v1/report/{id}/override` — body
  `{new_score: int, teacher_note: str}`. Requires teacher role. Stores the
  override alongside the original AI score (add `override_score`,
  `override_note`, `overridden_by`, `overridden_at` to `ReportModel` — don't
  overwrite the original `score`, keep both).
- Report page shows "Score adjusted by {teacher}" with the note, when an
  override exists, without hiding the original AI score.
- Teacher dashboard gets a lightweight override form on any student's report
  view.

### 2.4 Bulk submission upload
- New endpoint `POST /api/v1/submit/bulk` — accepts a zip of files
  (`student_identifier` inferred from filename or a manifest CSV alongside
  it), creates one `SubmissionModel` per file, and runs the existing
  orchestrator per submission (reuse `submit.py`'s single-file logic in a
  loop — don't duplicate the pipeline).
- `/submit` page: add a "Bulk upload (teacher)" mode — a zip file drop zone,
  visible only to teacher-role users, showing a progress list of
  per-student status as each one completes.

---

## Phase 3 — Platform polish

### 3.1 Exportable class report (PDF)
- New endpoint `GET /api/v1/batches/{batch}/report.pdf` — generates a PDF
  summarizing the batch analytics from 2.1 (scores, common mistakes) for a
  given date range. Use a lightweight PDF library appropriate for Python
  (check what's already a natural fit given the existing `requirements.txt`
  before adding a heavy dependency).
- "Export weekly report" button on `/dashboard`.

---

## Conventions to match (frontend)

Same as the earlier facilities spec: `cyber-panel`/`cyber-btn` classes,
`font-syncopate`/`font-michroma`/`font-space-mono` label conventions,
react-query for all data fetching/mutations, Zustand only for genuinely
ephemeral client state, `gsap.context()` for entrance animations.

## Conventions to match (backend)

Match `agents/*.py`'s existing pattern exactly: `Agent[None]` construction,
`function_tool`-wrapped plain functions, `get_model(PRIMARY_MODEL)`, Pydantic
v2 output types added to `models/schemas.py`. New endpoints go under
`api/routes/`, following `submit.py`/`reports.py`'s existing router + schema
style — don't inline business logic in route handlers, keep it in
`agents/`/`db/` as the existing files do.

---

## Acceptance criteria (per phase)

- Backend: `pytest` passes (existing 124 tests + new tests for each new
  endpoint/model).
- Frontend: `npx tsc --noEmit`, `npx jest --watchAll=false`, and
  `npx next build` all pass.
- No phase should be considered done until its own tests pass — don't move
  to the next phase with known failures.
- Every new DB model/column needs a corresponding Alembic-style migration
  note or `init_db()` update — check how `db/session.py` currently creates
  tables and follow that same approach (don't introduce a new migration tool
  unless one is already present).
