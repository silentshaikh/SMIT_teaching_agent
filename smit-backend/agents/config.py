import os
from openai import AsyncOpenAI
from agents.models.openai_chatcompletions import OpenAIChatCompletionsModel
from config import settings


def get_openrouter_client() -> AsyncOpenAI:
    api_key = os.environ.get("OPENROUTER_API_KEY") or settings.openrouter_api_key
    if not api_key:
        raise EnvironmentError(
            "OPENROUTER_API_KEY is not set. "
            "Add it to your .env file. It must start with 'sk-or-'."
        )
    return AsyncOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
    )


def get_model(
    model_name: str = "meta-llama/llama-3.3-70b-instruct",
) -> OpenAIChatCompletionsModel:
    return OpenAIChatCompletionsModel(
        model=model_name,
        openai_client=get_openrouter_client(),
    )


PRIMARY_MODEL = "openai/gpt-4o-mini"
