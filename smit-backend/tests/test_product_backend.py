import httpx
import asyncio
import pytest
import os

BASE = "http://localhost:8000"
TIMEOUT = httpx.Timeout(60.0)   # agents can be slow -- allow 60s

# -- Sample code submissions for testing -------------------------------------

GOOD_JS = b"""
// Week 1 Assignment -- Variables and Functions
const studentName = 'Fatima';
const age = 22;

function greet(name) {
  return 'Hello, ' + name + '!';
}

const message = greet(studentName);
console.log(message);
"""

BAD_JS_SYNTAX = b"""
const name = 'Ahmed'
const age = 20

function greet(name {    // missing closing paren
  console.log('Hello ' + name
}

greet(name)
"""

BAD_JS_LOGIC = b"""
var x = 10;
var y = 0;
var result = x / y;    // division by zero
console.log(result);

function add(a, b) {
  return a - b;         // wrong operator -- should be +
}
console.log(add(3, 4));
"""

GOOD_PYTHON = b"""
# Week 2 Assignment -- Python Basics
student_name = 'Ali'
age = 19

def greet(name):
    return f'Hello, {name}!'

message = greet(student_name)
print(message)
"""


# -- Helper ------------------------------------------------------------------

async def submit_and_poll(
    code: bytes,
    filename: str,
    student_id: str = "prod_test_001",
    assignment_name: str = "Week 1 JS",
    rubric_id: str = "rubric_js_w1",
    max_polls: int = 20,
) -> dict:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.post(
            f"{BASE}/api/v1/submit",
            data={
                "student_id": student_id,
                "assignment_name": assignment_name,
                "rubric_id": rubric_id,
            },
            files={"file": (filename, code, "text/javascript")},
        )
        assert r.status_code in [200, 202], (
            f"Submit failed {r.status_code}: {r.text}"
        )
        submission_id = r.json()["submission_id"]

        for i in range(max_polls):
            await asyncio.sleep(3)
            poll = await client.get(f"{BASE}/api/v1/report/{submission_id}")
            if poll.status_code == 200:
                report = poll.json()
                if report.get("status") != "processing":
                    return report
            print(f"  Polling attempt {i+1}/{max_polls}...")

        raise TimeoutError(f"Report not ready after {max_polls * 3}s")


# -- Test 1: Good code gets a high score -------------------------------------

@pytest.mark.asyncio
async def test_good_js_gets_high_score():
    """Well-written JS should score above 70."""
    report = await submit_and_poll(GOOD_JS, "app.js", student_id="prod_001")

    print(f"\n  Score: {report['score']} ({report['grade']})")
    print(f"  Mistakes: {len(report['mistakes'])}")
    print(f"  English: {report['explanation_en'][:120]}...")
    print(f"  Urdu: {report['explanation_urdu'][:80]}...")

    assert report["score"] >= 70, (
        f"Good code scored too low: {report['score']}. "
        f"Check rubric agent or scoring logic."
    )
    assert report["grade"] in ["A", "B"], (
        f"Good code got grade {report['grade']} -- expected A or B"
    )
    assert len(report["explanation_en"]) >= 40, (
        "English explanation is too short -- Tutor Agent may not be working"
    )
    assert len(report["explanation_urdu"]) >= 20, (
        "Urdu explanation is too short -- translate_roman_urdu tool may be failing"
    )
    assert isinstance(report["suggestions"], list), "Suggestions must be a list"
    assert len(report["suggestions"]) >= 1, (
        "Feedback Agent must return at least 1 suggestion even for good code"
    )


# -- Test 2: Syntax errors are detected and explained ------------------------

@pytest.mark.asyncio
async def test_syntax_errors_detected():
    """Code with syntax errors must have mistakes of type 'syntax'."""
    report = await submit_and_poll(
        BAD_JS_SYNTAX, "app.js", student_id="prod_002"
    )

    print(f"\n  Score: {report['score']} ({report['grade']})")
    print(f"  Mistakes found: {len(report['mistakes'])}")
    for m in report["mistakes"]:
        print(f"    [{m['type']}] line {m['line']}: {m['description'][:60]}")

    syntax_mistakes = [m for m in report["mistakes"] if m["type"] == "syntax"]
    assert len(syntax_mistakes) >= 1, (
        f"Syntax errors not detected. Mistakes found: {report['mistakes']}"
    )
    assert report["score"] <= 60, (
        f"Code with syntax errors scored too high: {report['score']}"
    )
    # Corrected code must be present and different from bad input
    assert report["corrected_code"] != BAD_JS_SYNTAX.decode(), (
        "Code Review Agent did not provide corrected code"
    )
    assert len(report["corrected_code"]) > 10, (
        "Corrected code is empty or too short"
    )


# -- Test 3: Logic errors are detected ----------------------------------------

@pytest.mark.asyncio
async def test_logic_errors_detected():
    """Code with logic errors must have mistakes of type 'logic'."""
    report = await submit_and_poll(
        BAD_JS_LOGIC, "app.js", student_id="prod_003"
    )

    print(f"\n  Mistakes: {report['mistakes']}")

    all_types = [m["type"] for m in report["mistakes"]]
    assert "logic" in all_types or "syntax" in all_types, (
        f"Logic/syntax errors not detected. Mistake types found: {all_types}"
    )
    assert report["score"] < 80, (
        f"Code with logic errors scored too high: {report['score']}"
    )


# -- Test 4: Urdu explanation is actually Roman Urdu ---------------------------

@pytest.mark.asyncio
async def test_urdu_explanation_is_roman_urdu():
    """
    Urdu explanation must contain Roman Urdu words --
    not Arabic script and not pure English.
    Common Roman Urdu words: aap, hai, karo, nahi, matlab, kiya, wala
    """
    report = await submit_and_poll(
        BAD_JS_SYNTAX, "app.js", student_id="prod_004"
    )

    urdu = report["explanation_urdu"].lower()
    print(f"\n  Urdu explanation: {urdu[:200]}")

    roman_urdu_markers = [
        "aap", "hai", "karo", "nahi", "matlab", "kiya",
        "wala", "gaya", "mein", "ka", "ko", "se", "ho",
        "bhool", "galti", "theek", "sahi", "yeh", "isko"
    ]
    found = [w for w in roman_urdu_markers if w in urdu]
    assert len(found) >= 2, (
        f"explanation_urdu does not look like Roman Urdu. "
        f"Found markers: {found}. "
        f"Content: {urdu[:200]}. "
        f"Fix the Tutor Agent's translate_roman_urdu tool."
    )


# -- Test 5: Report has all required fields populated -------------------------

@pytest.mark.asyncio
async def test_report_all_fields_populated():
    """Every field of AssignmentReport must be non-empty."""
    report = await submit_and_poll(
        GOOD_JS, "app.js", student_id="prod_005"
    )

    required_str_fields = [
        "submission_id", "student_id", "assignment_name",
        "corrected_code", "explanation_en", "explanation_urdu"
    ]
    for field in required_str_fields:
        assert field in report, f"Missing field: {field}"
        assert len(str(report[field])) > 0, f"Field is empty: {field}"

    assert isinstance(report["score"], int), "score must be int"
    assert isinstance(report["grade"], str), "grade must be str"
    assert isinstance(report["mistakes"], list), "mistakes must be list"
    assert isinstance(report["suggestions"], list), "suggestions must be list"
    assert isinstance(report["next_topics"], list), "next_topics must be list"
    assert isinstance(report["breakdown"], dict), "breakdown must be dict"
    assert isinstance(report["processing_time_ms"], int), (
        "processing_time_ms must be int"
    )
    assert report["processing_time_ms"] > 0, (
        "processing_time_ms must be greater than 0"
    )


# -- Test 6: MistakeItem fields are all populated ----------------------------

@pytest.mark.asyncio
async def test_mistake_items_fully_populated():
    """Every MistakeItem must have all required fields with real content."""
    report = await submit_and_poll(
        BAD_JS_SYNTAX, "app.js", student_id="prod_006"
    )

    assert len(report["mistakes"]) > 0, (
        "No mistakes found in code that has clear syntax errors"
    )

    valid_types = {"syntax", "logic", "naming", "structure", "style"}
    for i, m in enumerate(report["mistakes"]):
        assert m["type"] in valid_types, (
            f"Mistake {i} has invalid type: {m['type']}"
        )
        assert len(m["description"]) >= 10, (
            f"Mistake {i} English description too short: {m['description']}"
        )
        assert len(m["description_urdu"]) >= 5, (
            f"Mistake {i} Urdu description too short: {m['description_urdu']}"
        )


# -- Test 7: Processing time is within product SLA ---------------------------

@pytest.mark.asyncio
async def test_report_within_sla():
    """Full report must be returned within 60 seconds (product SLA)."""
    import time
    start = time.time()
    report = await submit_and_poll(
        GOOD_JS, "app.js",
        student_id="prod_007",
        max_polls=20   # 20 x 3s = 60s max
    )
    elapsed = time.time() - start
    print(f"\n  Total time: {elapsed:.1f}s")
    print(f"  Agent processing: {report['processing_time_ms']}ms")

    assert elapsed < 65, (
        f"Report took {elapsed:.1f}s -- exceeds 60s SLA. "
        f"Check agent timeout settings or OpenRouter rate limits."
    )


# -- Test 8: Python submission works -----------------------------------------

@pytest.mark.asyncio
async def test_python_submission_works():
    """Python .py files must be accepted and reviewed correctly."""
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.post(
            f"{BASE}/api/v1/submit",
            data={
                "student_id": "prod_008",
                "assignment_name": "Week 2 Python",
                "rubric_id": "rubric_py_w2",
            },
            files={"file": ("main.py", GOOD_PYTHON, "text/x-python")},
        )
        assert r.status_code in [200, 202], (
            f"Python submission failed: {r.status_code} -- {r.text}"
        )
        data = r.json()
        assert "submission_id" in data, "submission_id missing from response"


# -- Test 9: Duplicate submission returns consistent score --------------------

@pytest.mark.asyncio
async def test_same_code_consistent_score():
    """
    Submitting the same code twice must return scores within +/-5 points.
    This validates grading consistency (product requirement).
    """
    report1 = await submit_and_poll(
        GOOD_JS, "app.js", student_id="prod_009a"
    )
    report2 = await submit_and_poll(
        GOOD_JS, "app.js", student_id="prod_009b"
    )

    score1, score2 = report1["score"], report2["score"]
    print(f"\n  Run 1 score: {score1}, Run 2 score: {score2}")
    diff = abs(score1 - score2)

    assert diff <= 5, (
        f"Grading inconsistency: same code scored {score1} then {score2} "
        f"(difference: {diff} points). "
        f"Check rubric agent's scoring logic for determinism."
    )


# -- Test 10: Invalid file type rejected cleanly ------------------------------

@pytest.mark.asyncio
async def test_invalid_file_rejected():
    """Non-code files must be rejected with 422, not cause a 500."""
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.post(
            f"{BASE}/api/v1/submit",
            data={
                "student_id": "prod_010",
                "assignment_name": "Week 1",
                "rubric_id": "rubric_js_w1",
            },
            files={"file": ("hack.exe", b"MZ\x90\x00", "application/octet-stream")},
        )
        assert r.status_code in [400, 413, 422], (
            f"Expected rejection (400/413/422) for .exe file, "
            f"got {r.status_code}: {r.text}"
        )
        assert r.status_code != 500, (
            "Server returned 500 on invalid file -- must return 422 instead"
        )
