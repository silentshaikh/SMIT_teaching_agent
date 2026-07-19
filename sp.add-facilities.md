# sp.add-facilities — Report Download, Resubmit-on-Failure, Dashboard States

**Project:** SMIT AI Teaching Assistant
**Scope:** `smit-frontend` only (no backend changes — the endpoints already exist)
**Build tool:** OpenCode

> Read this file, then implement each facility in order. Follow the existing
> code conventions exactly (see "Conventions to match" below) — don't
> introduce a new styling system, state pattern, or animation approach.

---

## 0. Context (read first)

`lib/hooks/useReportPoller.ts` was just fixed so that the report page now
correctly exposes three states for a submission: still loading (`isLoading`),
permanently failed (`isFailed`), and done (`data` populated with the full
`AssignmentReport`). The three facilities below build directly on top of that
fix — implement the poller fix first if it isn't already in the codebase you're
working from.

## Conventions to match

- Client components start with `"use client"`.
- Panels use the `cyber-panel` utility class; buttons use `cyber-btn`.
- Section labels follow the pattern:
  `<span className="font-syncopate text-xs tracking-[0.3em] text-cyber-{color} uppercase">&gt;&gt; LABEL</span>`
- Server calls go through `lib/api.ts` (typed functions returning parsed JSON),
  never raw `fetch`/`axios` inline in components.
- Data fetching/mutation uses `@tanstack/react-query` (`useQuery`, `useMutation`),
  not manual `useEffect` + `useState` fetch logic.
- Client-only ephemeral state (current submission, original code, language)
  lives in `store/submission.ts` (Zustand) — don't add new global state unless
  it genuinely needs to persist across route changes.
- GSAP entrance animations use `gsap.context()` inside `useEffect`, cleaned up
  with `ctx.revert()`, matching the pattern in every existing page.
- Error/status colors: green = `cyber-green` (ok), crimson = `cyber-crimson`
  (error/danger), purple = `cyber-purple`, cyan = `cyber-cyan` (info/neutral).

---

## Facility 1 — Download report button

**Where:** `app/(student)/report/[id]/page.tsx`, in the footer bar (next to
the existing `processing_time_ms` display).

**Backend contract (already exists, do not modify):**
`GET /api/v1/report/{submission_id}/download` → returns the full
`AssignmentReport` JSON with a `Content-Disposition: attachment` header.

**Frontend contract (already exists in `lib/api.ts`):**
`downloadReport(submissionId: string): Promise<AssignmentReport>`

**Task:**
- Add a small `cyber-btn`-styled button/icon labeled `>> DOWNLOAD REPORT` in
  the report page footer, visible only once `data` (the completed report) is
  available.
- On click, call `downloadReport(submissionId)`, then trigger a client-side
  file save of the returned JSON as `report-{submission_id}.json` (construct a
  `Blob`, an object URL, and a temporary `<a download>` — no new dependency
  needed).
- Wrap the call in a small `useMutation`. Show a disabled/`>> SAVING...` state
  while pending, and surface an inline error (same visual pattern as the
  existing `FileUploader` error block) if the request fails.
- No new backend work — this is a pure frontend wiring task.

---

## Facility 2 — Resubmit-on-failure

**Where:** `app/(student)/report/[id]/page.tsx`, inside the existing
`ErrorBlock` (or a variant of it) shown when `isFailed` is true.

**Context:** the orchestrator marks a submission `"failed"` when the agent
pipeline throws (see `agents/orchestrator.py::_mark_failed`). There is
currently no way to retry from the UI once that happens — the user has to
manually go back to `/submit` and re-fill the whole form, re-picking the file
from disk.

**Task:**
- Extend `ErrorBlock` to optionally take an `onRetry` callback and render a
  `>> RESUBMIT` button (styled like `cyber-btn`, crimson-tinted since it's on
  an error surface) when provided.
- On the report page, when `isFailed` is true, wire `onRetry` to:
  1. Read `originalCode`, `language` (and, if available, `student_id` /
     `assignment_name` — check `store/submission.ts` and extend it with those
     two fields if they aren't already stored) from `useSubmissionStore`.
  2. If the original code/metadata is still present in the store (i.e. the
     user is resubmitting in the same session right after a failure), call
     `submitFile(...)` again directly from the report page with the same
     inputs, then `router.replace` to the new `/report/{new_submission_id}`.
  3. If the store is empty (e.g. the user opened this failed report from
     History or a fresh reload, so there's no original file in memory),
     fall back to `router.push('/submit')` — don't try to resubmit without
     the actual file.
- This should feel like a single click gets you back into the pipeline
  whenever possible, and only asks the user to re-upload when it truly has to.

---

## Facility 3 — Dashboard loading & empty states

**Where:** `app/(teacher)/dashboard/page.tsx`.

**Problem:** the page currently renders nothing until `data` resolves (no
loading indicator), and nothing meaningful if a batch has zero students/
submissions — same blank-page problem `history/page.tsx` already avoids with
its `isLoading` and `data.length === 0` blocks.

**Task:**
- Destructure `isLoading` from the existing `useQuery` call.
- Add a loading block identical in spirit to the one in `history/page.tsx`:
  a `cyber-panel p-6 text-center` with a `font-michroma` pulsing label (e.g.
  `>> COMPILING BATCH TELEMETRY...`).
- Add an empty-state block (shown when `data` has resolved but
  `total_students === 0`): `cyber-panel p-6 text-center` with a
  `font-syncopate` label, e.g. `// NO STUDENTS IN THIS BATCH YET`.
- Keep the existing stat-grid and grade-distribution chart exactly as they
  are for the populated case — this task only fills the two gaps around it.

---

## Acceptance criteria

- `npx tsc --noEmit` passes with no new errors.
- `npx jest --watchAll=false` still passes all existing 50 tests.
- Add tests for the new behavior, following the existing patterns in
  `__tests__/components/` and `__tests__/pages/`:
  - A test that the download button appears only when a report is loaded,
    and that clicking it triggers the download call.
  - A test that `ErrorBlock`/report page renders a resubmit button on
    `isFailed`, and that clicking it calls the expected store/router actions.
  - A test that the dashboard shows a loading state before data resolves and
    an empty state when `total_students` is 0.
- No changes to any file under `smit-backend/`.
- No new npm dependencies — everything here is achievable with what's already
  installed (`@tanstack/react-query`, `zustand`, `next/navigation`, native
  `Blob`/`URL.createObjectURL`).
