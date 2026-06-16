from agents import Agent, function_tool

from models.schemas import RubricScore


def _calculate_score(code: str, rubric_text: str) -> str:
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

    score = min(score, 100)
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

Given the code review result:
1. Calculate a score from 0-100 based on the code quality
2. Convert the numeric score to a letter grade (A/B/C/D/F)
3. Provide a detailed breakdown of points per criterion

Use calculate_score for the numeric evaluation, and grade_to_letter for the final grade mapping.""",
    tools=[calculate_score, grade_to_letter],
    output_type=RubricScore,
    model="meta-llama/llama-3.3-70b-instruct",
)
