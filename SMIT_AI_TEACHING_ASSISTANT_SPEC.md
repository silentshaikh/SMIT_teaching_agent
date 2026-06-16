# SMIT AI Teaching Assistant — Technical Specification

**Version:** 1.0
**Status:** Approved — ready for build
**Build tool:** OpenCode (terminal AI coding agent)

> This document is the single source of truth for the project. OpenCode should read this file first (`opencode run "read SPEC.md and scaffold the project"`), and all code generated must satisfy the contracts defined here. If a requirement changes, update this file first, then the code.

---

## 1. Problem statement

### 1.1 Problem

Teachers at SMIT spend 3–5 hours per session manually checking 30–100+ beginner programming assignments, repeatedly explaining the same concepts, and giving inconsistent individual feedback. Students receive delayed, generic feedback that doesn't address their specific mistakes.

### 1.2 Solution

A multi-agent AI system where students upload a code file (`app.js`, `index.js`, etc.) and receive, within seconds: a score, a list of mistakes, corrected code, and a beginner-friendly explanation in English and Roman Urdu.

### 1.3 Success criteria

| Metric | Target |
|---|---|
| Report generation time | < 10 seconds per submission |
| Grading consistency | Same code → same score (±2 points) |
| Teacher review time saved | > 80% reduction |
| Output languages | English + Roman Urdu |

### 1.4 Out of scope (MVP)

- Code execution / running student code
- Real-time collaboration
- Payment / subscription system
- Mobile app
- Video/audio feedback

---

## 2. System architecture

### 2.1 Layers

| Layer | Components | Technology |
|---|---|---|
| Frontend | Student portal, teacher dashboard, 3D landing hero | Next.js 14, TypeScript, Tailwind CSS, Three.js, GSAP |
| API Gateway | REST endpoints, auth, file validation, rate limiting | FastAPI, Pydantic v2, JWT |
| Agent Layer | Orchestrator + 4 specialized agents | OpenAI Agents SDK, OpenRouter |
| RAG Layer | 5 Qdrant collections + retrieval tools | Qdrant Cloud, sentence-transformers |
| Storage | Submissions, reports, users | SQLite (file-based, via SQLAlchemy) |

> No Docker Compose, no Postgres, no Neon. The backend runs directly with `uvicorn`, the frontend with `next dev` / `next build`. SQLite is a single file (`smit.db`) — zero infrastructure, perfect for MVP and small-batch SMIT deployments.

### 2.2 End-to-end data flow

1. Student uploads file via Next.js portal → multipart `POST /api/v1/submit`
2. FastAPI validates file type (`.js` / `.py` / `.html`), size (< 50KB), and JWT auth → returns `submission_id`
3. Orchestrator agent receives code + metadata, begins sequential handoff chain
4. Each agent queries Qdrant for RAG context, returns a typed Pydantic model
5. Orchestrator merges all 4 outputs → `AssignmentReport` → stored in SQLite
6. Frontend polls `GET /api/v1/report/{id}` every 2s → renders score, mistakes, code diff, explanation

### 2.3 LLM provider — OpenRouter

All agents use **OpenRouter** as the single LLM gateway (one API key → access to Claude, GPT-4o, Llama, Mistral, etc.).

- **Default model:** `meta-llama/llama-3.3-70b-instruct`
- **Fallback model:** `anthropic/claude-3-haiku`
- **API key env var:** `OPENROUTER_API_KEY`
- **Base URL:** `https://openrouter.ai/api/v1`

---

## 3. Module / agent design

All agents are built with the **OpenAI Agents SDK**, configured to call OpenRouter's OpenAI-compatible endpoint:

```python
from agents import Agent, Runner, set_default_openai_client
from openai import AsyncOpenAI
import os

client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ["OPENROUTER_API_KEY"],
)
set_default_openai_client(client)

MODEL = "meta-llama/llama-3.3-70b-instruct"
FALLBACK_MODEL = "anthropic/claude-3-haiku"
```

### 3.1 Code Review Agent

- **Responsibility:** Checks syntax errors, logic bugs, variable naming, file/folder structure against the rubric.
- **Input:** `SubmissionInput`
- **Output:** `CodeReviewResult`
- **Tools:** `parse_ast()`, `run_linter()`, `check_structure()`

### 3.2 Tutor Agent

- **Responsibility:** Explains each mistake in simple, beginner-friendly language — both English and Roman Urdu.
- **Input:** `CodeReviewResult`
- **Output:** `TutorOutput`
- **Tools:** `explain_concept()`, `translate_roman_urdu()`

### 3.3 Assignment Rubric Agent

- **Responsibility:** Scores the submission 0–100 and maps it to a letter grade (A–F).
- **Input:** `CodeReviewResult`
- **Output:** `RubricScore`
- **Tools:** `calculate_score()`, `grade_to_letter()`

### 3.4 Feedback Agent

- **Responsibility:** Generates 3–5 personalized improvement suggestions using the student's submission history.
- **Input:** All previous outputs + `student_id`
- **Output:** `FeedbackOutput`
- **Tools:** `get_student_history()`, `build_plan()`

### 3.5 Orchestrator Agent

- **Responsibility:** Receives the raw submission, runs the handoff chain in order, merges all outputs into the final `AssignmentReport`, and persists it to SQLite.

### 3.6 Handoff chain order

| # | Agent | Input | Output |
|---|---|---|---|
| 1 | Orchestrator | Raw file + `student_id` | Routes to sub-agents |
| 2 | Code Review | `SubmissionInput` | `CodeReviewResult` |
| 3 | Tutor | `CodeReviewResult` | `TutorOutput` |
| 4 | Rubric | `CodeReviewResult` | `RubricScore` |
| 5 | Feedback | All 3 outputs + history | `FeedbackOutput` |
| 6 | Orchestrator | All 4 outputs | `AssignmentReport` |

---

## 4. Data models (Pydantic v2)

```python
from pydantic import BaseModel
from typing import Literal
from uuid import UUID
from datetime import datetime


# ── Core input ─────────────────────────────────────
class SubmissionInput(BaseModel):
    student_id: str
    assignment_name: str
    language: Literal["javascript", "python", "html"]
    code: str                    # raw source code string
    rubric_id: str                # links to Qdrant rubric


# ── Agent output models ─────────────────────────────
class MistakeItem(BaseModel):
    line: int | None
    type: Literal["syntax", "logic", "naming", "structure", "style"]
    description: str             # English explanation
    description_urdu: str        # Roman Urdu explanation
    corrected_snippet: str | None


class CodeReviewResult(BaseModel):
    mistakes: list[MistakeItem]
    corrected_code: str
    has_critical_errors: bool


class TutorOutput(BaseModel):
    explanation_en: str          # English walkthrough
    explanation_urdu: str        # Roman Urdu walkthrough
    concepts_covered: list[str]


class RubricScore(BaseModel):
    score: int                   # 0–100
    grade: str                   # A / B / C / D / F
    breakdown: dict[str, int]    # criterion -> points earned


class FeedbackOutput(BaseModel):
    suggestions: list[str]       # 3-5 personalized items
    next_topics: list[str]       # what to study next


# ── Final unified report ────────────────────────────
class AssignmentReport(BaseModel):
    submission_id: UUID
    student_id: str
    assignment_name: str
    score: int
    grade: str
    mistakes: list[MistakeItem]
    corrected_code: str
    explanation_en: str
    explanation_urdu: str
    suggestions: list[str]
    next_topics: list[str]
    breakdown: dict[str, int]
    processing_time_ms: int
    created_at: datetime


# ── DB models (SQLAlchemy, mirrors above) ───────────
class Student(BaseModel):
    id: UUID
    name: str
    email: str
    batch: str                    # e.g. "SMIT-Batch-42"
    created_at: datetime


class Rubric(BaseModel):
    id: str
    assignment_name: str
    language: str
    criteria: dict[str, int]      # criterion -> max points
    max_score: int
    created_by: str
```

---

## 5. API contracts

### 5.1 Student endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/submit` | Upload file → returns `submission_id` |
| GET | `/api/v1/report/{id}` | Poll for completed `AssignmentReport` |
| GET | `/api/v1/history/{student_id}` | All past submissions + scores |
| GET | `/api/v1/report/{id}/download` | Download report as PDF |

### 5.2 Teacher / admin endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/rubrics` | List all rubrics |
| POST | `/api/v1/rubrics` | Create new rubric |
| POST | `/api/v1/ingest` | Ingest documents into Qdrant |
| GET | `/api/v1/dashboard/{batch}` | Class analytics + score distribution |
| GET | `/api/v1/health` | Service health check |

### 5.3 Submit — request / response

**Request** (`multipart/form-data`):

```
file: UploadFile (.js / .py / .html)
student_id: str
assignment_name: str
rubric_id: str
```

**Response 202**:

```json
{
  "submission_id": "uuid",
  "status": "processing",
  "poll_url": "/api/v1/report/uuid"
}
```

**Response 200** (`GET /api/v1/report/{id}` once complete) — returns the full `AssignmentReport` JSON.

---

## 6. Storage design

### 6.1 SQLite tables (via SQLAlchemy)

```
students    (id, name, email, batch, created_at)
submissions (id, student_id, file_name, language, code_hash, status, created_at)
reports     (id, submission_id, score, grade, report_json, processing_ms, created_at)
rubrics     (id, name, language, criteria_json, max_score, created_by)
```

Database file: `./smit.db` (created automatically on first run via `SQLAlchemy` + `aiosqlite`).

## 7. Tech stack

### 7.1 Backend

| Technology | Version | Purpose |
|---|---|---|
| Python | 3.11+ | Core runtime |
| FastAPI | 0.110+ | Async REST API with auto OpenAPI docs |
| Pydantic v2 | 2.6+ | All request/response + agent data models |
| OpenAI Agents SDK | latest | Agent orchestration, tools, handoffs, tracing |
| OpenRouter | — | LLM gateway — one API key, many models |
| SQLAlchemy | 2.0+ | Async ORM — SQLite backend |
| aiosqlite | latest | Async SQLite driver |
| python-multipart | latest | File upload handling in FastAPI |
| python-jose | latest | JWT auth tokens |

### 7.2 Frontend

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 14 (App Router) | Frontend framework with SSR |
| TypeScript | 5+ | Full type safety |
| Tailwind CSS | 3+ | Utility-first styling |
| Three.js | r160+ | 3D animated landing hero |
| GSAP | 3+ | Score reveal animation, transitions |
| Monaco Editor | latest | Code diff viewer (original vs corrected) |
| React Query | 5+ | Submission polling + server state cache |
| Zustand | 4+ | Lightweight client state |
| shadcn/ui | latest | Accessible UI components |

### 7.3 Infrastructure (simplified — no Docker/Postgres/Neon)

| Service | Role | Notes |
|---|---|---|
| Local dev (backend) | `uvicorn main:app --reload` | SQLite file created automatically |
| Local dev (frontend) | `npm run dev` | Standard Next.js dev server |
| Qdrant Cloud | Managed vector store | Free tier sufficient for MVP |
| Vercel | Frontend deployment | Free tier |
| Railway or Render | Backend deployment | SQLite file persists on a volume; free tier sufficient for MVP |
| GitHub Actions | CI: lint + test on push | No deploy step required for MVP |

---

## 8. Folder structure

### 8.1 Backend — `smit-backend/`

```
smit-backend/
├── agents/
│   ├── orchestrator.py
│   ├── code_review.py
│   ├── tutor.py
│   ├── rubric.py
│   └── feedback.py
├── models/
│   ├── schemas.py        # Pydantic models
│   └── db_models.py       # SQLAlchemy models (SQLite)
├── api/
│   ├── routes/
│   │   ├── submit.py
│   │   ├── reports.py
│   │   └── admin.py
│   └── main.py
├── db/
│   └── session.py          # SQLite + SQLAlchemy session setup
├── config.py
├── tests/
├── requirements.txt
└── .env.example
```

### 8.2 Frontend — `smit-frontend/`

```
smit-frontend/
├── app/
│   ├── (student)/
│   │   ├── submit/
│   │   │   └── page.tsx
│   │   ├── report/[id]/
│   │   │   └── page.tsx
│   │   └── history/
│   │       └── page.tsx
│   ├── (teacher)/
│   │   ├── dashboard/
│   │   └── rubrics/
│   └── layout.tsx
├── components/
│   ├── FileUploader.tsx
│   ├── CodeViewer.tsx       # Monaco diff
│   ├── ScoreReveal.tsx      # GSAP animation
│   ├── HeroScene.tsx        # Three.js landing hero
│   └── MistakeList.tsx
├── lib/
│   ├── api.ts
│   └── types.ts
├── store/
│   └── submission.ts
├── package.json
└── .env.example
```

---

## 9. MVP scope + roadmap

### 9.1 Phase 1 — MVP (Weeks 1–4)

- [ ] Upload `app.js` / `index.js` via web form
- [ ] Code Review Agent — syntax + logic checks
- [ ] Rubric Agent — 1 hardcoded JS rubric in Qdrant
- [ ] Tutor Agent — top 3 mistakes explained in English
- [ ] Feedback Agent — 3 improvement suggestions
- [ ] Next.js results page (renders `AssignmentReport`)
- [ ] Three.js landing hero
- [ ] GSAP score reveal animation
- [ ] SQLite persistence for submissions + reports

### 9.2 Phase 2 — Enhancements (Weeks 5–8)

- [ ] Roman Urdu explanations (Tutor Agent)
- [ ] Python + HTML/CSS submission support
- [ ] Student login + submission history
- [ ] Teacher dashboard with class analytics
- [ ] Rubric admin panel (CRUD)
- [ ] Monaco code diff viewer
- [ ] Streaming agent responses

### 9.3 Phase 3 — Production (Weeks 9–12)

- [ ] Full SMIT class notes ingested into Qdrant
- [ ] Auto preference learning (per-teacher grading style)
- [ ] Bulk batch processing
- [ ] WhatsApp bot submission integration
- [ ] PDF report download
- [ ] Mobile PWA

---

## 10. Testing strategy

| Test type | Tool | Validates | Target |
|---|---|---|---|
| Unit tests | pytest + pytest-asyncio | Each agent tool function in isolation | 90%+ per module |
| Agent contract tests | Mock LLM + Pydantic assertions | Agent returns correct output model | All handoffs |
| RAG tests | Qdrant test collection | Top-k retrieval accuracy | > 85% relevance |
| API integration | FastAPI TestClient | All endpoints — valid + invalid inputs | 100% endpoints |
| Schema validation | Pydantic parse tests | All report fields populated correctly | Zero schema errors |
| E2E | Playwright | Submit → poll → view report flow | Happy path + errors |
| Load test | Locust | 50 concurrent submissions | < 10s per report |

### 10.1 Environment variables

```bash
# LLM — OpenRouter (single key, many models)
OPENROUTER_API_KEY=sk-or-...

# Database (SQLite — file-based, no server needed)
DATABASE_URL=sqlite+aiosqlite:///./smit.db

# Auth
JWT_SECRET=...
JWT_EXPIRE_MINUTES=60

# App constraints
MAX_FILE_SIZE_KB=50
ALLOWED_EXTENSIONS=.js,.py,.html,.css
RATE_LIMIT_PER_MINUTE=10
ALLOWED_ORIGINS=http://localhost:3000
```

---

## 11. OpenCode build instructions

Run these from the project root, one at a time, in order. OpenCode should treat this `SPEC.md` as the contract for every step.

```bash
# 1. Scaffold backend structure + dependencies
opencode run "Read SPEC.md sections 7.1 and 8.1. Create the smit-backend/ folder structure exactly as specified, with requirements.txt and .env.example."

# 2. Data models first (foundation)
opencode run "Read SPEC.md section 4. Create models/schemas.py with all Pydantic models exactly as defined, and models/db_models.py with SQLAlchemy equivalents for the SQLite tables in section 6.1."

# 3. Agents
opencode run "Read SPEC.md section 3. Implement agents/code_review.py, agents/tutor.py, agents/rubric.py, agents/feedback.py, and agents/orchestrator.py using the OpenAI Agents SDK configured for OpenRouter as shown in section 2.3 and 3."

# 4. API routes
opencode run "Read SPEC.md section 5. Implement api/main.py and all routes in api/routes/ exactly matching the contracts defined."

# 5. Tests
opencode run "Read SPEC.md section 10. Generate the pytest suite covering all test types listed, targeting the coverage goals specified."

# 6. Frontend scaffold
opencode run "Read SPEC.md sections 7.2 and 8.2. Create the smit-frontend/ Next.js 14 App Router project with the folder structure, Tailwind, and dependencies specified."

# 7. Frontend pages + components
opencode run "Read SPEC.md sections 5 and 8.2. Implement the submit page, report page with Monaco diff viewer, GSAP ScoreReveal component, and Three.js HeroScene on the landing page."
```

---

*End of specification. Update this file before updating code.*
