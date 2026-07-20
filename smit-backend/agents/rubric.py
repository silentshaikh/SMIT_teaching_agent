from agents import Agent, function_tool, AgentOutputSchema
from agents.config import get_model, PRIMARY_MODEL

from models.schemas import RubricScore


def _count_bracket_errors(code: str) -> int:
    pairs = {"(": ")", "{": "}", "[": "]"}
    expected: list[str] = []
    errors = 0
    for ch in code:
        if ch in pairs:
            expected.append(pairs[ch])
        elif ch in ")}]":
            if not expected or expected.pop() != ch:
                errors += 1
    errors += len(expected)
    return errors


def _calculate_score(code: str, rubric_text: str, logic_errors: int = 0) -> str:
    syntax_errors = _count_bracket_errors(code)
    lines_of_code = len(code.split("\n"))
    has_comments = "#" in code or "//" in code
    has_functions = "def " in code or "function" in code or "=>" in code

    score = 60
    if has_functions:
        score += 15
    if has_comments:
        score += 10
    if lines_of_code > 10:
        score += 5
    if "if " in code or "else" in code:
        score += 5
    if "for " in code or "while " in code:
        score += 5

    score -= syntax_errors * 15
    score -= logic_errors * 10
    score = max(0, min(score, 100))
    return str(score)


def _grade_to_letter(score_text: str) -> str:
    score = int(score_text)
    if score >= 90:
        return "A"
    if score >= 80:
        return "B"
    if score >= 70:
        return "C"
    if score >= 60:
        return "D"
    return "F"


calculate_score = function_tool(_calculate_score)
grade_to_letter = function_tool(_grade_to_letter)


rubric_agent = Agent[None](
    name="RubricAgent",
    instructions="""You are an assignment grading expert for SMIT programming courses.

Your job is to score student code submissions against a rubric.

Given the code review result (includes the code, mistakes list, and rubric_id):
1. Count how many mistakes have type 'logic' and call calculate_score with the code, rubric_text (pass rubric_id as text), and logic_errors count
2. Convert the numeric score to a letter grade (A/B/C/D/F) using grade_to_letter
3. Provide a detailed breakdown of points per criterion

The calculate_score function automatically detects syntax errors from bracket imbalance.""",
    tools=[calculate_score, grade_to_letter],
    output_type=AgentOutputSchema(RubricScore, strict_json_schema=False),
    model=get_model(PRIMARY_MODEL),
)
