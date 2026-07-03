"""Runtime configuration helpers.

Secrets are read from environment variables first, then from the local
configs.yaml file. The local config file is intentionally ignored by Git.
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG_PATH = PROJECT_ROOT / "configs.yaml"


@dataclass(frozen=True)
class LLMConfig:
    provider: str
    api_key: str | None
    base_url: str
    model: str
    timeout: int
    temperature: float
    max_tokens: int
    thinking: bool
    reasoning_effort: str | None

    @property
    def configured(self) -> bool:
        return bool(self.api_key)

    def public_dict(self) -> dict[str, Any]:
        return {
            "provider": self.provider,
            "configured": self.configured,
            "baseUrl": self.base_url,
            "model": self.model,
            "timeout": self.timeout,
            "temperature": self.temperature,
            "maxTokens": self.max_tokens,
            "thinking": self.thinking,
            "reasoningEffort": self.reasoning_effort,
        }


def read_local_config(path: Path = DEFAULT_CONFIG_PATH) -> dict[str, Any]:
    if not path.exists():
        return {}

    text = path.read_text(encoding="utf-8-sig").strip()
    if not text:
        return {}

    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        pass

    result: dict[str, Any] = {}
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or ":" not in stripped:
            continue
        key, value = stripped.split(":", 1)
        value = value.strip().strip("'\"")
        result[key.strip()] = value
    return result


def config_value(local_config: dict[str, Any], *names: str, default: Any = None) -> Any:
    for name in names:
        env_value = os.environ.get(name)
        if env_value not in {None, ""}:
            return env_value
    for name in names:
        if name in local_config and local_config[name] not in {None, ""}:
            return local_config[name]
    return default


def parse_bool(value: Any, default: bool = False) -> bool:
    if value in {None, ""}:
        return default
    return str(value).strip().lower() in {"1", "true", "yes", "on", "enabled"}


def parse_int(value: Any, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def parse_float(value: Any, default: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def load_llm_config(path: Path = DEFAULT_CONFIG_PATH) -> LLMConfig:
    local_config = read_local_config(path)
    api_key = config_value(
        local_config,
        "DEEPSEEK_API_KEY",
        "DEEPSEEK_KEY",
        "APIKEYS",
        "api_key",
        "deepseek_api_key",
    )
    if api_key:
        api_key = re.sub(r"\s+", "", str(api_key))

    return LLMConfig(
        provider="deepseek",
        api_key=api_key or None,
        base_url=str(config_value(local_config, "DEEPSEEK_BASE_URL", "base_url", default="https://api.deepseek.com")),
        model=str(config_value(local_config, "DEEPSEEK_MODEL", "model", default="deepseek-v4-pro")),
        timeout=parse_int(config_value(local_config, "DEEPSEEK_TIMEOUT", "timeout", default=60), 60),
        temperature=parse_float(config_value(local_config, "DEEPSEEK_TEMPERATURE", "temperature", default=0.3), 0.3),
        max_tokens=parse_int(config_value(local_config, "DEEPSEEK_MAX_TOKENS", "max_tokens", default=1400), 1400),
        thinking=parse_bool(config_value(local_config, "DEEPSEEK_THINKING", "thinking", default=False), False),
        reasoning_effort=config_value(local_config, "DEEPSEEK_REASONING_EFFORT", "reasoning_effort", default=None),
    )
