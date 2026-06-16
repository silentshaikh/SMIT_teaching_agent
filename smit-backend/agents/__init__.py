import sys
import os

_here = os.path.dirname(os.path.abspath(__file__))
_root = os.path.dirname(_here)
_paths_to_restore = [p for p in sys.path if os.path.abspath(p) == _root]
sys.path = [p for p in sys.path if os.path.abspath(p) != _root]

_our_agents = sys.modules.pop("agents", None)
import agents as _real_sdk
if _our_agents is not None:
    sys.modules["agents"] = _our_agents
sys.path.extend(_paths_to_restore)

Agent = _real_sdk.Agent
Runner = _real_sdk.Runner
function_tool = _real_sdk.function_tool
set_default_openai_client = _real_sdk.set_default_openai_client

from openai import AsyncOpenAI

from config import settings

_openai_client = AsyncOpenAI(
    base_url=settings.openrouter_base_url,
    api_key=settings.openrouter_api_key or settings.openai_api_key,
)
set_default_openai_client(_openai_client)

MODEL = "meta-llama/llama-3.3-70b-instruct"
FALLBACK_MODEL = "anthropic/claude-3-haiku"
