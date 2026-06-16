import ast
import re

from agents import Agent, function_tool

from models.schemas import CodeReviewResult, MistakeItem


def _parse_ast(code: str, language: str) -> str:
    if language == "python":
        try:
            ast.parse(code)
            return "AST parse: OK"
        except SyntaxError as e:
            return f"AST parse: ERROR at line {e.lineno} — {e.msg}"
    return "AST parse: not supported for this language"


def _run_linter(code: str, language: str) -> str:
    issues = []
    lines = code.split("\n")
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or stripped.startswith("//"):
            continue
        if len(stripped) > 100:
            issues.append(f"Line {i}: line too long ({len(stripped)} chars)")
        if "\t" in line:
            issues.append(f"Line {i}: tabs detected, use spaces")
        if stripped.endswith((";",)) and language == "python":
            issues.append(f"Line {i}: unnecessary semicolon")
    return "\n".join(issues) if issues else "No lint issues found"


def _check_structure(code: str, language: str) -> str:
    checks = []
    if language == "python":
        if "def " not in code and "class " not in code:
            checks.append("No function or class definitions found")
        if "if __name__" not in code and len(code) > 50:
            checks.append("Missing if __name__ guard")
    if language == "javascript":
        if "function" not in code and "=>" not in code:
            checks.append("No function definitions found")
        if "const" not in code and "let " not in code and "var " not in code:
            checks.append("No variable declarations found")
    return "\n".join(checks) if checks else "Structure checks passed"


parse_ast = function_tool(_parse_ast)
run_linter = function_tool(_run_linter)
check_structure = function_tool(_check_structure)


code_review_agent = Agent[None](
    name="CodeReviewAgent",
    instructions="""You are a code review expert for SMIT students learning programming.

Given a student's code submission (Python, JavaScript, or HTML), you must:
1. Parse the AST to detect syntax errors
2. Run lint checks for style and formatting issues
3. Check the overall code structure

Output a CodeReviewResult with:
- A list of MistakeItem objects (line, type, descriptions in English and Roman Urdu, corrected snippet)
- The fully corrected code string
- A boolean indicating whether there are critical errors

Be thorough but pedagogical. Every mistake should include a helpful description in both English and Roman Urdu.""",
    tools=[parse_ast, run_linter, check_structure],
    output_type=CodeReviewResult,
    model="meta-llama/llama-3.3-70b-instruct",
)
