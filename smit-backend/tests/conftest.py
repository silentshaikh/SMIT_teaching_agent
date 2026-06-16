import os
import sys
from unittest.mock import MagicMock, patch

import pytest

os.environ["OPENROUTER_API_KEY"] = "test-key"
os.environ["JWT_SECRET"] = "test-secret"
os.environ["OPENAI_API_KEY"] = "test-openai"

import config as cfg
cfg.settings = cfg.Settings(_env_file=None)

_here = os.path.dirname(os.path.abspath(__file__))
_root = os.path.dirname(_here)
if _root not in sys.path:
    sys.path.insert(0, _root)
