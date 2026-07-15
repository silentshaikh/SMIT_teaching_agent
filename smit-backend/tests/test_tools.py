import pytest
from unittest.mock import patch, MagicMock


# TC-019
def test_parse_code_valid_js_no_errors():
    from tools.ast_parser import parse_code
    result = parse_code("const x = 1;", "javascript")
    assert result["has_errors"] is False
    assert isinstance(result["errors"], list)
    assert len(result["errors"]) == 0


# TC-020
def test_parse_code_bad_js_detects_errors():
    from tools.ast_parser import parse_code
    result = parse_code("const x = {", "javascript")
    assert result["has_errors"] is True
    assert len(result["errors"]) > 0


# TC-021
def test_parse_code_valid_python_no_errors():
    from tools.ast_parser import parse_code
    result = parse_code("x = 1\nprint(x)", "python")
    assert result["has_errors"] is False


# TC-022
def test_parse_code_bad_python_detects_errors():
    from tools.ast_parser import parse_code
    result = parse_code("def foo(\n    pass", "python")
    assert result["has_errors"] is True


# TC-023
def test_parse_code_empty_string():
    from tools.ast_parser import parse_code
    result = parse_code("", "javascript")
    assert "has_errors" in result


# TC-024
def test_parse_code_returns_dict_with_required_keys():
    from tools.ast_parser import parse_code
    result = parse_code("const x = 1;", "javascript")
    assert "has_errors" in result
    assert "errors" in result


# TC-025
def test_run_linter_returns_list():
    from tools.linter import run_linter
    result = run_linter("var x = 1", "javascript")
    assert isinstance(result, list)


# TC-026
def test_run_linter_flags_var_usage():
    from tools.linter import run_linter
    result = run_linter("var x = 1; var y = 2;", "javascript")
    # Linter should suggest const/let over var
    messages = [r.get("message", "").lower() for r in result]
    has_var_warning = any("var" in m or "const" in m or "let" in m for m in messages)
    assert has_var_warning, (
        f"Expected var/const warning, got: {result}"
    )


# ── Coverage boosters: agents/rubric.py helpers ──

def test_count_bracket_errors_valid():
    from agents.rubric import _count_bracket_errors
    assert _count_bracket_errors("const x = [1, 2, 3];") == 0
    assert _count_bracket_errors("function foo() { return (1 + 2); }") == 0


def test_count_bracket_errors_unbalanced():
    from agents.rubric import _count_bracket_errors
    assert _count_bracket_errors("const x = {") > 0
    assert _count_bracket_errors("const x = (") > 0
    assert _count_bracket_errors("const x = [") > 0


def test_count_bracket_errors_mismatched():
    from agents.rubric import _count_bracket_errors
    errors = _count_bracket_errors("const x = (1];")
    assert errors > 0


def test_calculate_score_no_functions():
    from agents.rubric import _calculate_score
    score = int(_calculate_score("x = 1", "default"))
    assert 0 <= score <= 100


def test_calculate_score_with_functions():
    from agents.rubric import _calculate_score
    code = "def greet(name):\n    return f'Hello {name}'"
    score = int(_calculate_score(code, "default"))
    assert score > 60


def test_calculate_score_with_comments():
    from agents.rubric import _calculate_score
    code = "# This is a comment\ndef foo():\n    pass"
    score = int(_calculate_score(code, "default"))
    assert score > 60


def test_calculate_score_syntax_errors_reduce():
    from agents.rubric import _calculate_score
    score_clean = int(_calculate_score("def foo(): pass", "default"))
    score_bad = int(_calculate_score("def foo(} pass", "default"))
    assert score_clean >= score_bad


def test_calculate_score_logic_errors_reduce():
    from agents.rubric import _calculate_score
    score_clean = int(_calculate_score("def foo(): pass", "default"))
    score_logic = int(_calculate_score("def foo(): pass", "default", logic_errors=3))
    assert score_clean >= score_logic


def test_calculate_score_clamped_to_100():
    from agents.rubric import _calculate_score
    code = "# c\n" * 20 + "def f():\n" + "if x:\n" + "for i in range(10):\n" + "while True:\n"
    score = int(_calculate_score(code, "default"))
    assert score <= 100


def test_calculate_score_clamped_to_0():
    from agents.rubric import _calculate_score
    score = int(_calculate_score("{{(([[", "default", logic_errors=10))
    assert score >= 0


def test_grade_to_letter_a():
    from agents.rubric import _grade_to_letter
    assert _grade_to_letter("95") == "A"
    assert _grade_to_letter("90") == "A"


def test_grade_to_letter_b():
    from agents.rubric import _grade_to_letter
    assert _grade_to_letter("85") == "B"
    assert _grade_to_letter("80") == "B"


def test_grade_to_letter_c():
    from agents.rubric import _grade_to_letter
    assert _grade_to_letter("75") == "C"
    assert _grade_to_letter("70") == "C"


def test_grade_to_letter_d():
    from agents.rubric import _grade_to_letter
    assert _grade_to_letter("65") == "D"
    assert _grade_to_letter("60") == "D"


def test_grade_to_letter_f():
    from agents.rubric import _grade_to_letter
    assert _grade_to_letter("50") == "F"
    assert _grade_to_letter("0") == "F"


# ── Coverage boosters: agents/code_review.py tools ──

def test_parse_ast_python_valid():
    from agents.code_review import _parse_ast
    result = _parse_ast("x = 1\nprint(x)", "python")
    assert "OK" in result


def test_parse_ast_python_invalid():
    from agents.code_review import _parse_ast
    result = _parse_ast("def foo(", "python")
    assert "ERROR" in result


def test_parse_ast_unsupported_language():
    from agents.code_review import _parse_ast
    result = _parse_ast("x = 1", "javascript")
    assert "not supported" in result


def test_run_linter_code_review_clean():
    from agents.code_review import _run_linter
    result = _run_linter("x = 1", "python")
    assert "No lint issues" in result


def test_run_linter_code_review_long_line():
    from agents.code_review import _run_linter
    result = _run_linter("x = " + "a" * 110, "python")
    assert "too long" in result


def test_run_linter_code_review_tabs():
    from agents.code_review import _run_linter
    result = _run_linter("\tx = 1", "python")
    assert "tabs" in result


def test_run_linter_code_review_semicolon_python():
    from agents.code_review import _run_linter
    result = _run_linter("x = 1;", "python")
    assert "semicolon" in result


def test_check_structure_python_no_func():
    from agents.code_review import _check_structure
    result = _check_structure("x = 1\ny = 2", "python")
    assert "No function" in result


def test_check_structure_python_long_no_guard():
    from agents.code_review import _check_structure
    code = "x = 1\n" * 20
    result = _check_structure(code, "python")
    assert "guard" in result


def test_check_structure_js_no_func():
    from agents.code_review import _check_structure
    result = _check_structure("const x = 1;", "javascript")
    assert "No function" in result


def test_check_structure_js_no_var():
    from agents.code_review import _check_structure
    result = _check_structure("function foo() {}", "javascript")
    assert "No variable" in result


def test_check_structure_js_clean():
    from agents.code_review import _check_structure
    result = _check_structure("const x = 1; function foo() {}", "javascript")
    assert "passed" in result


# ── Coverage boosters: agents/tutor.py tools ──

def test_explain_concept_variable():
    from agents.tutor import _explain_concept
    result = _explain_concept("variable", "python")
    assert "container" in result.lower()


def test_explain_concept_function():
    from agents.tutor import _explain_concept
    result = _explain_concept("function", "javascript")
    assert "reusable" in result.lower()


def test_explain_concept_loop():
    from agents.tutor import _explain_concept
    result = _explain_concept("loop", "python")
    assert "repeat" in result.lower()


def test_explain_concept_condition():
    from agents.tutor import _explain_concept
    result = _explain_concept("condition", "python")
    assert "decision" in result.lower()


def test_explain_concept_unknown():
    from agents.tutor import _explain_concept
    result = _explain_concept("recursion", "python")
    assert "recursion" in result.lower()


def test_translate_roman_urdu_syntax_error():
    from agents.tutor import _translate_roman_urdu
    result = _translate_roman_urdu("syntax error in code")
    assert "galat" in result.lower() or "tareeqa" in result.lower()


def test_translate_roman_urdu_logic_error():
    from agents.tutor import _translate_roman_urdu
    result = _translate_roman_urdu("logic error found")
    assert "galat" in result.lower() or "jawab" in result.lower()


def test_translate_roman_urdu_unknown():
    from agents.tutor import _translate_roman_urdu
    result = _translate_roman_urdu("unknown concept")
    assert "unknown concept" in result.lower()


# ── Coverage boosters: agents/feedback.py tools ──

def test_get_student_history():
    from agents.feedback import _get_student_history
    result = _get_student_history("s001")
    assert "s001" in result


def test_build_plan_with_loops():
    from agents.feedback import _build_plan
    result = _build_plan("loop errors found", "some history")
    assert "loop" in result.lower()


def test_build_plan_with_functions():
    from agents.feedback import _build_plan
    result = _build_plan("function errors", "history")
    assert "function" in result.lower()


def test_build_plan_with_syntax():
    from agents.feedback import _build_plan
    result = _build_plan("syntax errors", "history")
    assert "syntax" in result.lower()


def test_build_plan_with_logic():
    from agents.feedback import _build_plan
    result = _build_plan("logic errors", "history")
    assert "logic" in result.lower()


def test_build_plan_with_variables():
    from agents.feedback import _build_plan
    result = _build_plan("variable naming issues", "history")
    assert "variable" in result.lower()


def test_build_plan_no_match():
    from agents.feedback import _build_plan
    result = _build_plan("general issues", "history")
    assert "class notes" in result.lower() or "practice" in result.lower()


# ── Coverage boosters: tools/linter.py edge cases ──

def test_linter_python_clean():
    from tools.linter import run_linter
    result = run_linter("x = 1\nprint(x)", "python")
    assert isinstance(result, list)
    assert len(result) == 0


def test_linter_python_comments():
    from tools.linter import run_linter
    result = run_linter("# comment\nx = 1", "python")
    assert len(result) == 0


def test_linter_python_tabs():
    from tools.linter import run_linter
    result = run_linter("\tx = 1", "python")
    assert len(result) > 0


def test_linter_python_long_line():
    from tools.linter import run_linter
    result = run_linter("x = " + "a" * 110, "python")
    assert len(result) > 0


def test_linter_python_semicolon():
    from tools.linter import run_linter
    result = run_linter("x = 1;", "python")
    assert len(result) > 0


def test_linter_js_comments():
    from tools.linter import run_linter
    result = run_linter("// comment\nconst x = 1;", "javascript")
    assert len(result) == 0


def test_linter_js_tabs():
    from tools.linter import run_linter
    result = run_linter("\tconst x = 1;", "javascript")
    assert len(result) > 0


def test_linter_js_long_line():
    from tools.linter import run_linter
    result = run_linter("const x = " + "a" * 110 + ";", "javascript")
    assert len(result) > 0


def test_linter_empty_lines():
    from tools.linter import run_linter
    result = run_linter("\n\n\n", "python")
    assert len(result) == 0


# ── Coverage booster: orchestrator._hash_code ──

def test_hash_code_returns_hex():
    from agents.orchestrator import _hash_code
    result = _hash_code("const x = 1;")
    assert len(result) == 16
    assert all(c in "0123456789abcdef" for c in result)


def test_hash_code_deterministic():
    from agents.orchestrator import _hash_code
    assert _hash_code("test") == _hash_code("test")


def test_hash_code_different_for_different_input():
    from agents.orchestrator import _hash_code
    assert _hash_code("a") != _hash_code("b")
