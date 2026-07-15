import os
import pytest
from unittest.mock import patch


# TC-011
def test_openrouter_client_base_url():
    with patch.dict(os.environ, {"OPENROUTER_API_KEY": "sk-or-test"}):
        from agents.config import get_openrouter_client
        client = get_openrouter_client()
        assert "openrouter.ai" in str(client.base_url), (
            f"base_url must point to OpenRouter, got: {client.base_url}"
        )


# TC-012
def test_openrouter_client_uses_env_key():
    with patch.dict(os.environ, {"OPENROUTER_API_KEY": "sk-or-mykey"}):
        from agents.config import get_openrouter_client
        client = get_openrouter_client()
        assert client.api_key == "sk-or-mykey"


# TC-013
def test_openrouter_client_raises_without_key():
    env = {k: v for k, v in os.environ.items() if k != "OPENROUTER_API_KEY"}
    with patch.dict(os.environ, env, clear=True):
        import config as cfg
        original_key = cfg.settings.openrouter_api_key
        cfg.settings.openrouter_api_key = ""
        try:
            from agents.config import get_openrouter_client
            with pytest.raises(EnvironmentError, match="OPENROUTER_API_KEY"):
                get_openrouter_client()
        finally:
            cfg.settings.openrouter_api_key = original_key


# TC-014
def test_get_model_returns_correct_type():
    with patch.dict(os.environ, {"OPENROUTER_API_KEY": "sk-or-test"}):
        from agents.config import get_model
        from agents.models.openai_chatcompletions import OpenAIChatCompletionsModel
        model = get_model()
        assert isinstance(model, OpenAIChatCompletionsModel)


# TC-015
def test_get_model_uses_primary_model_name():
    with patch.dict(os.environ, {"OPENROUTER_API_KEY": "sk-or-test"}):
        from agents.config import get_model, PRIMARY_MODEL
        model = get_model(PRIMARY_MODEL)
        assert model.model == PRIMARY_MODEL


# TC-016
def test_get_model_accepts_fallback():
    with patch.dict(os.environ, {"OPENROUTER_API_KEY": "sk-or-test"}):
        from agents.config import get_model, FALLBACK_MODEL
        model = get_model(FALLBACK_MODEL)
        assert model.model == FALLBACK_MODEL


# TC-017
@pytest.mark.parametrize("agent_file", [
    "agents/code_review.py",
    "agents/tutor.py",
    "agents/rubric.py",
    "agents/feedback.py",
    "agents/orchestrator.py",
])
def test_no_forbidden_imports_in_agent_files(agent_file):
    forbidden = [
        "from groq", "import groq",
        "from anthropic", "import anthropic",
        "from langchain", "import langchain",
        "from openai import OpenAI",
    ]
    with open(agent_file) as f:
        source = f.read()
    for pattern in forbidden:
        assert pattern not in source, (
            f"Forbidden import '{pattern}' found in {agent_file}"
        )


# TC-018
@pytest.mark.parametrize("module,attr", [
    ("agents.code_review", "code_review_agent"),
    ("agents.tutor", "tutor_agent"),
    ("agents.rubric", "rubric_agent"),
    ("agents.feedback", "feedback_agent"),
])
def test_each_agent_exported_at_module_level(module, attr):
    with patch.dict(os.environ, {"OPENROUTER_API_KEY": "sk-or-test"}):
        import importlib
        mod = importlib.import_module(module)
        agent = getattr(mod, attr, None)
        assert agent is not None, (
            f"{attr} not found in {module} — must be exported at module level"
        )
