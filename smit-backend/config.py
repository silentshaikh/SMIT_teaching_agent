from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_host: str = "0.0.0.0"
    app_port: int = 8000

    openai_api_key: str = ""
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    jwt_secret: str = "change-me-to-a-random-secret"
    dev_mode: bool = False

    teacher_invite_code: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()


def _check_jwt_secret():
    """Fail loudly if jwt_secret is still the insecure default."""
    if settings.jwt_secret == "change-me-to-a-random-secret" and not settings.dev_mode:
        import sys
        print(
            "FATAL: jwt_secret is still the default value. "
            "Set JWT_SECRET in your .env file or environment.",
            file=sys.stderr,
        )
        sys.exit(1)


_check_jwt_secret()
