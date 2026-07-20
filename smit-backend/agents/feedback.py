from agents import Agent, function_tool
from agents.config import get_model, PRIMARY_MODEL

from models.schemas import FeedbackOutput


def _get_student_history(student_id: str) -> str:
    return f"Student {student_id}: previous assignments show progress in basic syntax, needs work on loops and functions."


def _build_plan(mistakes_summary: str, history_summary: str) -> str:
    plan = []
    if "loop" in mistakes_summary.lower():
        plan.append("Practice loop patterns (for, while) on HackerRank")
    if "function" in mistakes_summary.lower():
        plan.append("Review function definition and parameter passing")
    if "variable" in mistakes_summary.lower():
        plan.append("Study variable naming conventions and scope")
    if "syntax" in mistakes_summary.lower():
        plan.append("Revisit basic syntax rules for your language")
    if "logic" in mistakes_summary.lower():
        plan.append("Trace through your code line-by-line to catch logic errors")
    if not plan:
        plan.append("Review class notes from this week")
        plan.append("Try the next practice assignment")
    return "\n".join(plan)


get_student_history = function_tool(_get_student_history)
build_plan = function_tool(_build_plan)


feedback_agent = Agent[None](
    name="FeedbackAgent",
    instructions="""You are a personalized learning coach for SMIT programming students.

Your job is to generate 3-5 personalized improvement suggestions based on:
- The student's code review results
- Their past submission history

Given the code review, tutor explanation, and rubric score:
1. Look up the student's submission history using get_student_history
2. Build a personalized study/improvement plan using build_plan
3. Suggest specific topics the student should study next
4. Generate 1-2 short practice prompts targeting the student's most frequent mistake type — these should be specific coding exercises (e.g., "Write a function that reverses a string using a loop") that the student can do right now to improve

Be constructive and specific. Tailor suggestions to the student's actual mistakes.""",
    tools=[get_student_history, build_plan],
    output_type=FeedbackOutput,
    model=get_model(PRIMARY_MODEL),
)
