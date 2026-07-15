import httpx, asyncio

BASE = "http://localhost:8000"

TEST_CODE = """
// Week 1 JavaScript Assignment
const studentName = "Ahmed"
const age = 20

function greet(name) {
  console.log("Hello " + name)
}

greet(studentName)
"""

async def test_full_submission_flow():
    async with httpx.AsyncClient(timeout=90.0) as client:

        # Submit file
        r = await client.post(
            f"{BASE}/api/v1/submit",
            data={
                "student_id": "test_student_002",
                "assignment_name": "Week 1 JS",
                "rubric_id": "rubric_js_w1"
            },
            files={"file": ("app.js", TEST_CODE.encode(), "text/javascript")}
        )

        print(f"Submit status: {r.status_code}")
        assert r.status_code in [200, 202], f"Submit failed: {r.text}"

        submission_id = r.json()["submission_id"]
        print(f"Submission ID: {submission_id}")

        # Poll for report (max 90 seconds)
        report = None
        for attempt in range(30):
            await asyncio.sleep(3)
            poll = await client.get(f"{BASE}/api/v1/report/{submission_id}")
            print(f"Poll attempt {attempt+1}: status={poll.status_code}")

            if poll.status_code == 200:
                report = poll.json()
                if report.get("status") != "processing":
                    break

        assert report is not None, "Report never returned"
        print(f"\n=== REPORT ===")
        print(f"Score:       {report.get('score')}")
        print(f"Grade:       {report.get('grade')}")
        print(f"Mistakes:    {len(report.get('mistakes', []))}")
        print(f"Suggestions: {len(report.get('suggestions', []))}")
        print(f"English:     {report.get('explanation_en', '')[:100]}...")
        print(f"Urdu:        {report.get('explanation_urdu', '')[:100]}...")

        # Assertions
        assert "score" in report, "Missing score"
        assert "grade" in report, "Missing grade"
        assert isinstance(report["score"], int), "Score must be int"
        assert 0 <= report["score"] <= 100, "Score out of range"
        assert report["grade"] in ["A","B","C","D","F"], "Invalid grade"
        assert isinstance(report["mistakes"], list), "Mistakes must be list"
        assert isinstance(report["suggestions"], list), "Suggestions must be list"
        assert len(report["explanation_en"]) > 20, "English explanation too short"
        assert "corrected_code" in report, "Missing corrected code"

        print("\nFull E2E submission test PASSED")

asyncio.run(test_full_submission_flow())
