import pytest
import os
from unittest.mock import patch, MagicMock, AsyncMock
from uuid import uuid4


# TC-027
@patch("agents.code_review.Runner")
async def test_code_review_returns_code_review_result(mock_runner):
    from models.schemas import CodeReviewResult, MistakeItem, SubmissionInput
    mock_runner.run = AsyncMock(return_value=MagicMock(
        final_output=CodeReviewResult(
            mistakes=[MistakeItem(
                line=1, type="syntax",
                description="Missing semicolon",
                description_urdu="Semicolon nahi hai",
                corrected_snippet="const x = 1;"
            )],
            corrected_code="const x = 1;",
            has_critical_errors=False
        )
    ))
    with patch.dict(os.environ, {"OPENROUTER_API_KEY": "sk-or-test"}):
        from agents.code_review import run_code_review
        result = await run_code_review(SubmissionInput(
            student_id="s001", assignment_name="W1",
            language="javascript", code="const x = 1",
            rubric_id="r1"
        ))
    assert isinstance(result, CodeReviewResult)
    assert len(result.mistakes) == 1
    assert result.mistakes[0].type == "syntax"


# TC-028
@patch("agents.code_review.Runner")
async def test_code_review_corrected_code_is_string(mock_runner):
    from models.schemas import CodeReviewResult, SubmissionInput
    mock_runner.run = AsyncMock(return_value=MagicMock(
        final_output=CodeReviewResult(
            mistakes=[], corrected_code="const x = 1;", has_critical_errors=False
        )
    ))
    with patch.dict(os.environ, {"OPENROUTER_API_KEY": "sk-or-test"}):
        from agents.code_review import run_code_review
        result = await run_code_review(SubmissionInput(
            student_id="s001", assignment_name="W1",
            language="javascript", code="const x = 1;", rubric_id="r1"
        ))
    assert isinstance(result.corrected_code, str)
    assert len(result.corrected_code) > 0


# TC-029
@patch("agents.tutor.Runner")
async def test_tutor_returns_tutor_output(mock_runner):
    from models.schemas import TutorOutput, CodeReviewResult
    mock_runner.run = AsyncMock(return_value=MagicMock(
        final_output=TutorOutput(
            explanation_en="You forgot a semicolon after const x = 1.",
            explanation_urdu="Aap semicolon bhool gaye.",
            concepts_covered=["variables", "syntax"]
        )
    ))
    with patch.dict(os.environ, {"OPENROUTER_API_KEY": "sk-or-test"}):
        from agents.tutor import run_tutor
        result = await run_tutor(MagicMock(spec=CodeReviewResult))
    assert isinstance(result, TutorOutput)
    assert len(result.explanation_en) > 0
    assert len(result.explanation_urdu) > 0


# TC-030
@patch("agents.tutor.Runner")
async def test_tutor_explanation_has_both_languages(mock_runner):
    from models.schemas import TutorOutput
    mock_runner.run = AsyncMock(return_value=MagicMock(
        final_output=TutorOutput(
            explanation_en="Missing semicolon at line 5.",
            explanation_urdu="Line 5 pe semicolon nahi hai.",
            concepts_covered=["syntax"]
        )
    ))
    with patch.dict(os.environ, {"OPENROUTER_API_KEY": "sk-or-test"}):
        from agents.tutor import run_tutor
        result = await run_tutor(MagicMock())
    assert result.explanation_en != result.explanation_urdu


# TC-031
@patch("agents.rubric.Runner")
async def test_rubric_returns_rubric_score(mock_runner):
    from models.schemas import RubricScore
    mock_runner.run = AsyncMock(return_value=MagicMock(
        final_output=RubricScore(
            score=78, grade="C",
            breakdown={"syntax": 20, "logic": 18, "style": 10}
        )
    ))
    with patch.dict(os.environ, {"OPENROUTER_API_KEY": "sk-or-test"}):
        from agents.rubric import run_rubric
        result = await run_rubric(MagicMock(), "rubric_js_w1")
    assert isinstance(result, RubricScore)
    assert 0 <= result.score <= 100


# TC-032
@patch("agents.rubric.Runner")
async def test_rubric_grade_is_valid_letter(mock_runner):
    from models.schemas import RubricScore
    mock_runner.run = AsyncMock(return_value=MagicMock(
        final_output=RubricScore(score=90, grade="A", breakdown={})
    ))
    with patch.dict(os.environ, {"OPENROUTER_API_KEY": "sk-or-test"}):
        from agents.rubric import run_rubric
        result = await run_rubric(MagicMock(), "rubric_js_w1")
    assert result.grade in ["A", "B", "C", "D", "F"]


# TC-033
@patch("agents.feedback.Runner")
async def test_feedback_returns_suggestions(mock_runner):
    from models.schemas import FeedbackOutput
    mock_runner.run = AsyncMock(return_value=MagicMock(
        final_output=FeedbackOutput(
            suggestions=["Use const instead of var", "Add comments to your code"],
            next_topics=["Functions", "Scope"]
        )
    ))
    with patch.dict(os.environ, {"OPENROUTER_API_KEY": "sk-or-test"}):
        from agents.feedback import run_feedback
        result = await run_feedback(
            MagicMock(), MagicMock(), MagicMock(), "s001"
        )
    assert isinstance(result, FeedbackOutput)
    assert len(result.suggestions) >= 1
    assert len(result.next_topics) >= 1


# TC-034
@patch("agents.feedback.Runner")
async def test_feedback_suggestions_are_strings(mock_runner):
    from models.schemas import FeedbackOutput
    mock_runner.run = AsyncMock(return_value=MagicMock(
        final_output=FeedbackOutput(
            suggestions=["tip one", "tip two"],
            next_topics=["Functions"]
        )
    ))
    with patch.dict(os.environ, {"OPENROUTER_API_KEY": "sk-or-test"}):
        from agents.feedback import run_feedback
        result = await run_feedback(
            MagicMock(), MagicMock(), MagicMock(), "s001"
        )
    for s in result.suggestions:
        assert isinstance(s, str) and len(s) > 0
