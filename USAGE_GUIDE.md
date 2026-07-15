# SMIT AI Teaching Assistant — How to Use

A practical guide for students and teachers using the AI code review platform.

---

## Who Is This For?

| User | Pages They Use | What They Do |
|---|---|---|
| **Student** | Home, Submit, Report, History | Submit code, get AI feedback, track progress |
| **Teacher** | Dashboard, Rubrics | Monitor class performance, manage grading criteria |

---

## What Happens When You Submit Code (Step by Step)

Here is the complete flow from the moment a student clicks "Submit":

### Step 1: Upload (Student → Submit Page)

The student fills in:
- **Student ID** — e.g. `smit-2024-001`
- **Assignment Name** — e.g. `Week 2 - Functions`
- **Rubric** — which grading criteria to use

Then uploads a code file (`.js`, `.py`, or `.html`, max 50KB).

### Step 2: File Validation (Backend)

The backend checks:
- Is the file extension allowed? (.js / .py / .html only)
- Is the file under 50KB?
- Can the file be read as UTF-8 text?

If anything fails → returns an error immediately (422 or 413).

### Step 3: Background Processing Begins

The backend saves the submission to the database with status `"processing"` and returns a **submission ID** to the frontend. The 4-agent pipeline starts running in the background (does not block the HTTP response).

### Step 4: Agent 1 — Code Review (~5-8 seconds)

**Input:** The student's raw source code + language

**What it does:**
- Reads the code line by line
- Finds mistakes: syntax errors, logic errors, naming issues, poor structure, style problems
- For each mistake, generates:
  - Line number
  - Type (syntax / logic / naming / structure / style)
  - Description in **English**
  - Description in **Roman Urdu** (for Pakistani students)
  - Corrected snippet (what the code should look like)
- Produces a corrected version of the full code

**Output:** List of `MistakeItem` objects + corrected code

### Step 5: Agent 2 — Tutor (~5-8 seconds)

**Input:** The mistakes list from Agent 1

**What it does:**
- Takes the raw mistake descriptions
- Writes a full walkthrough explanation in **plain English** (like a teacher would)
- Writes the same explanation in **Roman Urdu** (so students understand in their language)
- Identifies what programming concepts were tested

**Output:** `explanation_en` + `explanation_urdu` + `concepts_covered`

### Step 6: Agent 3 — Rubric / Grading (~5-8 seconds)

**Input:** The student's code + rubric ID + mistakes list

**What it does:**
- The LLM calls two **tools** (not pure text generation):
  - `calculate_score()` — a **deterministic function** that calculates the score mathematically
  - `grade_to_letter()` — converts the numeric score to A/B/C/D/F
- Score is based on:
  - Base: 60 points
  - +15 for having functions
  - +10 for having comments
  - +5 for code longer than 10 lines
  - +5 for conditionals (if/else)
  - +5 for loops (for/while)
  - -15 per bracket syntax error
  - -10 per logic error
- Produces a breakdown by criterion (e.g. "Syntax: 20/20, Logic: 30/40")

**Output:** Score (0-100), letter grade, breakdown by criterion

### Step 7: Agent 4 — Feedback (~5-8 seconds)

**Input:** Student ID, mistakes list, score, grade

**What it does:**
- Generates 3-5 **personalized suggestions** based on the specific mistakes found
- Suggests **next topics** the student should study
- Advice is tailored to the student's weak areas

**Output:** `suggestions[]` + `next_topics[]`

### Step 8: Report Saved to Database

All 4 agents' outputs are combined into one `AssignmentReport` object and saved to SQLite:
- Score, grade, breakdown
- Mistakes list (with line numbers, types, bilingual descriptions)
- Corrected code
- Bilingual explanations
- Suggestions + next topics
- Processing time in milliseconds

The submission status changes from `"processing"` to `"completed"`.

### Step 9: Frontend Displays the Report

The frontend has been **polling** the report endpoint every 15 seconds. Once status is `"completed"`, it renders the full report page showing:

```
┌─────────────────────────────────────────────────────────────┐
│  SUBMISSION REPORT                                          │
│                                                             │
│  Assignment: Week 2 - Functions    Student: smit-2024-001  │
│                                                             │
│  ┌─────────────┐  ┌──────────────────────────────────────┐  │
│  │ SCORE: 75   │  │  MISTAKES FOUND: 1                   │  │
│  │ GRADE: C    │  │                                      │  │
│  │             │  │  Line 1: No variable declarations     │  │
│  │ Breakdown:  │  │  Type: structure                     │  │
│  │ Syntax: 20  │  │  "Variable declare nahi kiye..."     │  │
│  │ Logic: 30   │  │                                      │  │
│  │ Style: 20   │  └──────────────────────────────────────┘  │
│  └─────────────┘                                           │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ EXPLANATION (English)                                │   │
│  │ In your code, you didn't declare any variables...    │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ EXPLANATION (Roman Urdu)                             │   │
│  │ Aapke code mein koi variable declare nahi kiye...    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────┐  ┌───────────────────────────┐   │
│  │ CORRECTED CODE       │  │ SUGGESTIONS               │   │
│  │ (side-by-side diff)  │  │ > Declare variables       │   │
│  │                      │  │ > Learn about scope       │   │
│  │                      │  │ > Practice functions      │   │
│  └──────────────────────┘  └───────────────────────────┘   │
│                                                             │
│  NEXT TOPICS:                                               │
│  [Variable Naming] [Scope & Hoisting] [Function Declaration]│
└─────────────────────────────────────────────────────────────┘
```

---

## Page-by-Page Guide

### Home Page (`/`)
**For:** Everyone

The landing page. Shows the AI teaching core interface with a 3D scene. Click **[SUBMIT CODE]** to go to the submission form, or **[VIEW HISTORY]** to see past submissions.

---

### Submit Page (`/submit`)
**For:** Students

This is where students upload their code for analysis.

**How to use:**
1. Enter your Student ID (ask your teacher for yours)
2. Enter the Assignment Name (e.g. "Week 3 - Loops")
3. Select a Rubric from the dropdown
4. Drag your code file onto the upload area, or click to browse
5. Click **Submit**

**Rules:**
- File must be `.js`, `.py`, or `.html`
- File must be under 50KB
- Only one file at a time

After submitting, you'll be taken to the Report page where you can watch the analysis happen in real-time.

---

### Report Page (`/report/{id}`)
**For:** Students

Shows the complete AI analysis of your submitted code.

**What you'll see:**

| Section | What It Shows |
|---|---|
| **Score & Grade** | Your numeric score (0-100) and letter grade (A-F) |
| **Mistakes** | Every issue found, with line numbers, type, and bilingual explanations |
| **Corrected Code** | Your code with fixes applied (side-by-side diff view) |
| **English Explanation** | Full walkthrough of what went wrong and why |
| **Roman Urdu Explanation** | Same explanation in Roman Urdu for easier understanding |
| **Suggestions** | 3-5 personalized tips to improve |
| **Next Topics** | What programming concepts to study next |
| **Processing Time** | How long the AI took to analyze your code |

**How to read mistakes:**
- **syntax** — Your code has bracket/parenthesis errors or missing punctuation
- **logic** — Your code runs but does the wrong thing
- **naming** — Variable or function names are unclear
- **structure** — Code organization needs improvement
- **style** — Formatting or consistency issues

---

### History Page (`/history`)
**For:** Students

Shows a timeline of all your past submissions, sorted by date.

**How to use:**
1. The page shows all submissions for your student ID
2. Each entry shows: assignment name, score, grade, date
3. Click any entry to see the full report again

**Why it's useful:**
- Track your improvement over time
- See which assignments you scored well/poorly on
- Review past feedback before exams

**Example:**
```
Week 1 - Variables     85  B    2026-07-01
Week 2 - Functions     75  C    2026-07-08
Week 3 - Loops         90  A    2026-07-13  ← You're improving!
```

---

### Dashboard Page (`/dashboard`)
**For:** Teachers

Shows class-wide statistics for a batch (e.g. "SMIT-Batch-42").

**What you'll see:**

| Metric | What It Means |
|---|---|
| **Students** | Total students in the batch |
| **Submissions** | Total submissions across all students |
| **Avg Score** | Class average (e.g. 70.2 means C average) |
| **Grade Distribution** | Bar chart showing how many A/B/C/D/F grades |

**How to use:**
1. Navigate to `/dashboard`
2. The batch is loaded from the URL parameter (default: "SMIT-Batch-42")
3. Use this to identify:
   - Which students are struggling (low scores)
   - Which assignments were too hard (low average)
   - Grade distribution patterns

**Example insight:**
```
A: 31  ████████████████
B: 11  ██████
C:  9  ████
D:  1  █
F: 21  ███████████
```
→ 21 students failed — the class needs review on this topic.

---

### Rubrics Page (`/rubrics`)
**For:** Teachers

Lists all available grading rubrics in the system.

**What you'll see:**
- Rubric name (e.g. "Week 2 - Functions")
- Language (javascript / python / html)
- Criteria breakdown (e.g. Syntax: 20, Logic: 40, Style: 20, Structure: 20)
- Maximum score
- Who created it

**How to create a new rubric:**

```bash
curl -X POST http://localhost:8000/api/v1/rubrics \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Week 5 - Arrays",
    "language": "python",
    "criteria": {
      "syntax": 20,
      "logic": 40,
      "style": 20,
      "structure": 20
    },
    "max_score": 100,
    "created_by": "teacher-1"
  }'
```

---

## Grading System Explained

### How Scores Are Calculated

The score is **not** decided by the AI. It's calculated by a deterministic formula:

```
START WITH 60 POINTS

ADD POINTS FOR GOOD PRACTICES:
  +15  if you used functions (def / function / =>)
  +10  if you added comments (# or //)
  +5   if your code is longer than 10 lines
  +5   if you used if/else statements
  +5   if you used for/while loops

SUBTRACT POINTS FOR ERRORS:
  -15  for each unmatched bracket { } ( ) [ ]
  -10  for each logic error found by the AI

RESULT: Score between 0 and 100
```

### Letter Grade Mapping

| Score | Grade | What It Means |
|---|---|---|
| 90-100 | **A** | Excellent — minimal or no errors |
| 80-89 | **B** | Good — minor issues only |
| 70-79 | **C** | Average — some mistakes but functional |
| 60-69 | **D** | Below average — needs improvement |
| 0-59 | **F** | Failing — significant issues |

### Example Scoring

```javascript
function greet(name) {
  console.log("Hello " + name);
}
greet("World");
```

**Calculation:**
- Base: 60
- Has functions (+15): yes → 75
- Has comments (+10): no → 75
- Lines > 10 (+5): no (4 lines) → 75
- Has conditionals (+5): no → 75
- Has loops (+5): no → 75
- Bracket errors (-15): 0 → 75
- Logic errors (-10): 0 → 75

**Final Score: 75 → Grade: C**

---

## API Quick Reference

For developers who want to integrate programmatically:

| Endpoint | Method | What It Does |
|---|---|---|
| `/api/v1/health` | GET | Check if backend is running |
| `/api/v1/submit` | POST | Upload code file for analysis |
| `/api/v1/report/{id}` | GET | Get the analysis report |
| `/api/v1/history/{student_id}` | GET | Get student's submission history |
| `/api/v1/dashboard/{batch}` | GET | Get class-wide statistics |
| `/api/v1/rubrics` | GET | List all rubrics |
| `/api/v1/rubrics` | POST | Create a new rubric |

### Submit Code via cURL

```bash
curl -X POST http://localhost:8000/api/v1/submit \
  -F "file=@my_homework.js" \
  -F "student_id=smit-001" \
  -F "assignment_name=Week 1" \
  -F "rubric_id=1"
```

### Poll for Results

```bash
# Keep calling this until "status" is "completed"
curl http://localhost:8000/api/v1/report/{submission_id}
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "Invalid file type" | Only `.js`, `.py`, `.html` are allowed. Rename your file. |
| "File too large" | Max 50KB. Split your code or remove comments. |
| Report stays "processing" | Check backend is running. Check OpenRouter credits. |
| 402 error in logs | OpenRouter credits exhausted. Add funds or reduce `max_tokens`. |
| Page shows 404 | Make sure you ran `npm run dev` in the `smit-frontend` directory. |
| Backend won't start | Run `python -m uvicorn api.main:app --reload --port 8000` from `smit-backend`. |

---

## Quick Start

```bash
# Terminal 1 — Backend
cd smit-backend
pip install -r requirements.txt
python -m uvicorn api.main:app --reload --port 8000

# Terminal 2 — Frontend
cd smit-frontend
npm install
npm run dev

# Browser
open http://localhost:3000
```

Submit a `.js`, `.py`, or `.html` file and get your AI-powered code review in ~25 seconds.
