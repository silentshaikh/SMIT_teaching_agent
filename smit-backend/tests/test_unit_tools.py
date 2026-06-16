"""Unit tests for agent tool functions — section 10: 90%+ per module."""
import pytest

from agents.code_review import _parse_ast, _run_linter, _check_structure
from agents.tutor import _explain_concept, _translate_roman_urdu
from agents.rubric import _calculate_score, _grade_to_letter
from agents.feedback import _build_plan, _get_student_history


class TestParseAst:
    def test_valid_python(self):
        result = _parse_ast("x = 1\nprint(x)", "python")
        assert "OK" in result

    def test_syntax_error_python(self):
        result = _parse_ast("def add(a b):\n    pass", "python")
        assert "ERROR" in result

    def test_unsupported_language(self):
        result = _parse_ast("var x = 1;", "javascript")
        assert "not supported" in result


class TestRunLinter:
    def test_clean_code(self):
        result = _run_linter("x = 1\n", "python")
        assert "No lint issues" in result

    def test_long_line(self):
        result = _run_linter("x = " + "a" * 200, "python")
        assert "line too long" in result

    def test_tabs(self):
        result = _run_linter("\tx = 1", "python")
        assert "tabs" in result

    def test_unnecessary_semicolon(self):
        result = _run_linter("x = 1;", "python")
        assert "semicolon" in result

    def test_javascript_does_not_flag_semicolons(self):
        result = _run_linter("var x = 1;", "javascript")
        assert "semicolon" not in result


class TestCheckStructure:
    def test_python_without_functions(self):
        result = _check_structure("x = 1", "python")
        assert "No function" in result

    def test_python_with_functions(self):
        result = _check_structure("def foo():\n    pass", "python")
        assert "passed" in result

    def test_javascript_without_functions(self):
        result = _check_structure("var x = 1;", "javascript")
        assert "No function" in result

    def test_javascript_with_arrow(self):
        result = _check_structure("const add = (a, b) => a + b;", "javascript")
        assert "passed" in result


class TestExplainConcept:
    def test_known_concept(self):
        result = _explain_concept("variable", "python")
        assert "container" in result

    def test_case_insensitive(self):
        result = _explain_concept("LOOP", "python")
        assert "repeat" in result

    def test_unknown_concept(self):
        result = _explain_concept("fibonacci", "python")
        assert "relates to" in result


class TestTranslateRomanUrdu:
    def test_known_term(self):
        result = _translate_roman_urdu("syntax error")
        assert "galat" in result

    def test_partial_match(self):
        result = _translate_roman_urdu("I see a logic error in your code")
        assert "galat jawab" in result

    def test_unknown_term(self):
        result = _translate_roman_urdu("recursion")
        assert "Roman Urdu" in result


class TestCalculateScore:
    def test_minimum_score(self):
        result = _calculate_score("x = 1", "any")
        assert int(result) >= 60

    def test_with_functions(self):
        result = _calculate_score("def foo():\n    pass\n# comment", "any")
        assert int(result) >= 75

    def test_max_score_capped(self):
        result = _calculate_score(
            "def foo():\n    pass\n# comment\nif x:\n    pass\nfor i in x:\n    pass\n" * 10,
            "any",
        )
        assert int(result) == 100


class TestGradeToLetter:
    @pytest.mark.parametrize("score,grade", [
        ("95", "A"), ("90", "A"), ("85", "B"), ("80", "B"),
        ("75", "C"), ("70", "C"), ("65", "D"), ("60", "D"),
        ("50", "F"), ("0", "F"),
    ])
    def test_grade_boundaries(self, score, grade):
        assert _grade_to_letter(score) == grade


class TestGetStudentHistory:
    def test_returns_string(self):
        result = _get_student_history("s1")
        assert isinstance(result, str)
        assert "s1" in result


class TestBuildPlan:
    def test_loop_mistake(self):
        result = _build_plan("loop error in code", "some history")
        assert "HackerRank" in result

    def test_function_mistake(self):
        result = _build_plan("function parameter issue", "some history")
        assert "function definition" in result

    def test_no_mistakes(self):
        result = _build_plan("everything looks fine", "history")
        assert "class notes" in result
