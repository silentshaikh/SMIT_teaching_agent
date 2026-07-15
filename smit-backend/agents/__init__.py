import sys
import os

_here = os.path.dirname(os.path.abspath(__file__))
_root = os.path.dirname(_here)
_paths_to_restore = [p for p in sys.path if os.path.abspath(p) == _root]
sys.path = [p for p in sys.path if os.path.abspath(p) != _root]

_our_agents = sys.modules.pop("agents", None)
import agents as _real_sdk
# Import submodules while sys.modules["agents"] points to the SDK
from agents.agent_output import AgentOutputSchema as _AgentOutputSchema
from agents.run import RunConfig as RunConfig
from agents.model_settings import ModelSettings as ModelSettings
if _our_agents is not None:
    sys.modules["agents"] = _our_agents
sys.path.extend(_paths_to_restore)

Agent = _real_sdk.Agent
Runner = _real_sdk.Runner
function_tool = _real_sdk.function_tool
set_default_openai_client = _real_sdk.set_default_openai_client
AgentOutputSchema = _AgentOutputSchema

from agents.tracing import set_tracing_disabled
set_tracing_disabled(True)

from openai import AsyncOpenAI

from config import settings

_openai_client = AsyncOpenAI(
    base_url=settings.openrouter_base_url,
    api_key=settings.openrouter_api_key or settings.openai_api_key,
)
set_default_openai_client(_openai_client)
