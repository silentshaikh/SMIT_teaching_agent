"""Agent contract tests — section 10: mock LLM + Pydantic assertions."""
from unittest.mock import MagicMock, patch

import pytest

from models.schemas import (
    CodeReviewResult, TutorOutput, RubricScore, FeedbackOutput, AssignmentReport, SubmissionInput,
)


class TestCodeReviewAgentContract:
    def test_agent_defined(self):
        from agents.code_review import code_review_agent, parse_ast, run_linter, check_structure
        assert code_review_agent.name == "CodeReviewAgent"
        assert code_review_agent.output_type == CodeReviewResult
        assert len(code_review_agent.tools) == 3
        assert parse_ast is not None
        assert run_linter is not None


class TestTutorAgentContract:
    def test_agent_defined(self):
        from agents.tutor import tutor_agent, explain_concept, translate_roman_urdu
        assert tutor_agent.name == "TutorAgent"
        assert tutor_agent.output_type == TutorOutput
        assert len(tutor_agent.tools) == 2
        assert explain_concept is not None
        assert translate_roman_urdu is not None


class TestRubricAgentContract:
    def test_agent_defined(self):
        from agents.rubric import rubric_agent, calculate_score, grade_to_letter
        assert rubric_agent.name == "RubricAgent"
        assert rubric_agent.output_type == RubricScore
        assert len(rubric_agent.tools) == 2
        assert calculate_score is not None
        assert grade_to_letter is not None


class TestFeedbackAgentContract:
    def test_agent_defined(self):
        from agents.feedback import feedback_agent, get_student_history, build_plan
        assert feedback_agent.name == "FeedbackAgent"
        assert feedback_agent.output_type == FeedbackOutput
        assert len(feedback_agent.tools) == 2
        assert get_student_history is not None
        assert build_plan is not None


class TestOrchestratorContract:
    @pytest.mark.asyncio
    async def test_process_submission_returns_assignment_report(self):

        class FakeSession:
            async def execute(self, stmt):
                result = MagicMock()
                m = MagicMock()
                m.status = "completed"
                result.scalar_one_or_none.return_value = m
                result.scalar_one.return_value = m
                result.scalars.return_value.all.return_value = []
                return result

            async def add(self, obj):
                obj.id = "test-id"

            async def commit(self):
                pass

            async def __aenter__(self):
                return self

            async def __aexit__(self, *a):
                pass

        with patch("agents.orchestrator.Runner.run") as mock_runner, \
             patch("agents.orchestrator.init_db"), \
             patch("agents.orchestrator.AsyncSessionLocal", return_value=FakeSession()):

            from models.schemas import MistakeItem

            mock_cr = MagicMock(spec=CodeReviewResult)
            mock_cr.mistakes = [MistakeItem(line=1, type="syntax", description="err", description_urdu="x", corrected_snippet=None)]
            mock_cr.corrected_code = "fixed"
            mock_cr.has_critical_errors = False

            mock_tr = MagicMock(spec=TutorOutput)
            mock_tr.explanation_en = "en"
            mock_tr.explanation_urdu = "ur"
            mock_tr.concepts_covered = ["loop"]

            mock_rr = MagicMock(spec=RubricScore)
            mock_rr.score = 85
            mock_rr.grade = "B"
            mock_rr.breakdown = {"logic": 85}

            mock_fr = MagicMock(spec=FeedbackOutput)
            mock_fr.suggestions = ["practice"]
            mock_fr.next_topics = ["functions"]

            mock_runner.side_effect = [
                MagicMock(final_output=mock_cr),
                MagicMock(final_output=mock_tr),
                MagicMock(final_output=mock_rr),
                MagicMock(final_output=mock_fr),
            ]

            from agents.orchestrator import process_submission
            input_data = SubmissionInput(
                student_id="test_student", assignment_name="hw1",
                language="python", code="def foo():\n    pass", rubric_id="r1",
            )

            uid = "123e4567-e89b-12d3-a456-426614174000"
            report = await process_submission(uid, input_data)

            assert isinstance(report, AssignmentReport)
            assert str(report.submission_id) == uid
            assert report.score == 85
            assert report.grade == "B"
            assert report.corrected_code == "fixed"


class TestOrchestratorCallsAllAgents:
    @pytest.mark.asyncio
    async def test_all_four_agents_called_in_order(self):

        class FakeSession:
            async def execute(self, stmt):
                result = MagicMock()
                m = MagicMock()
                m.status = "completed"
                result.scalar_one_or_none.return_value = m
                result.scalar_one.return_value = m
                return result

            async def add(self, obj):
                pass

            async def commit(self):
                pass

            async def __aenter__(self):
                return self

            async def __aexit__(self, *a):
                pass

        with patch("agents.orchestrator.Runner.run") as mock_runner, \
             patch("agents.orchestrator.init_db"), \
             patch("agents.orchestrator.AsyncSessionLocal", return_value=FakeSession()):

            from models.schemas import MistakeItem

            mock_cr = MagicMock(spec=CodeReviewResult)
            mock_cr.mistakes = [MistakeItem(line=1, type="syntax", description="err", description_urdu="x", corrected_snippet=None)]
            mock_cr.corrected_code = "fixed"
            mock_cr.has_critical_errors = False

            mock_tr = MagicMock(spec=TutorOutput)
            mock_tr.explanation_en = "en"
            mock_tr.explanation_urdu = "ur"
            mock_tr.concepts_covered = []

            mock_rr = MagicMock(spec=RubricScore)
            mock_rr.score = 85
            mock_rr.grade = "B"
            mock_rr.breakdown = {}

            mock_fr = MagicMock(spec=FeedbackOutput)
            mock_fr.suggestions = []
            mock_fr.next_topics = []

            mock_runner.side_effect = [
                MagicMock(final_output=mock_cr),
                MagicMock(final_output=mock_tr),
                MagicMock(final_output=mock_rr),
                MagicMock(final_output=mock_fr),
            ]

            from agents.orchestrator import process_submission
            input_data = SubmissionInput(
                student_id="s1", assignment_name="hw1", language="python",
                code="x=1", rubric_id="r1",
            )
            uid = "123e4567-e89b-12d3-a456-426614174000"
            await process_submission(uid, input_data)
            assert mock_runner.call_count == 4
