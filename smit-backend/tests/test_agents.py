import pytest
import os
from unittest.mock import patch, MagicMock, AsyncMock
from uuid import uuid4


# TC-027
async def test_code_review_agent_has_correct_name():
    with patch.dict(os.environ, {"OPENROUTER_API_KEY": "sk-or-test"}):
        from agents.code_review import code_review_agent
    assert code_review_agent.name == "CodeReviewAgent"


# TC-028
async def test_code_review_agent_has_tools():
    with patch.dict(os.environ, {"OPENROUTER_API_KEY": "sk-or-test"}):
        from agents.code_review import code_review_agent
    assert len(code_review_agent.tools) == 3


# TC-029
async def test_tutor_agent_has_correct_name():
    with patch.dict(os.environ, {"OPENROUTER_API_KEY": "sk-or-test"}):
        from agents.tutor import tutor_agent
    assert tutor_agent.name == "TutorAgent"


# TC-030
async def test_tutor_agent_has_tools():
    with patch.dict(os.environ, {"OPENROUTER_API_KEY": "sk-or-test"}):
        from agents.tutor import tutor_agent
    assert len(tutor_agent.tools) == 2


# TC-031
async def test_rubric_agent_has_correct_name():
    with patch.dict(os.environ, {"OPENROUTER_API_KEY": "sk-or-test"}):
        from agents.rubric import rubric_agent
    assert rubric_agent.name == "RubricAgent"


# TC-032
async def test_rubric_agent_has_tools():
    with patch.dict(os.environ, {"OPENROUTER_API_KEY": "sk-or-test"}):
        from agents.rubric import rubric_agent
    assert len(rubric_agent.tools) == 2


# TC-033
async def test_feedback_agent_has_correct_name():
    with patch.dict(os.environ, {"OPENROUTER_API_KEY": "sk-or-test"}):
        from agents.feedback import feedback_agent
    assert feedback_agent.name == "FeedbackAgent"


# TC-034
async def test_feedback_agent_has_tools():
    with patch.dict(os.environ, {"OPENROUTER_API_KEY": "sk-or-test"}):
        from agents.feedback import feedback_agent
    assert len(feedback_agent.tools) == 2
