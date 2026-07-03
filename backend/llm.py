"""DeepSeek chat client using the OpenAI-compatible HTTP API."""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Any

from .config import LLMConfig, load_llm_config


class LLMError(RuntimeError):
    pass


class DeepSeekClient:
    def __init__(self, config: LLMConfig | None = None) -> None:
        self.config = config or load_llm_config()

    def status(self) -> dict[str, Any]:
        return self.config.public_dict()

    def chat(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> dict[str, Any]:
        if not self.config.api_key:
            raise LLMError("DeepSeek API key is not configured")

        body: dict[str, Any] = {
            "model": self.config.model,
            "messages": messages,
            "stream": False,
            "temperature": self.config.temperature if temperature is None else temperature,
            "max_tokens": self.config.max_tokens if max_tokens is None else max_tokens,
        }
        if self.config.thinking:
            body["thinking"] = {"type": "enabled"}
            if self.config.reasoning_effort:
                body["reasoning_effort"] = self.config.reasoning_effort

        request = urllib.request.Request(
            f"{self.config.base_url.rstrip('/')}/chat/completions",
            data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self.config.api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=self.config.timeout) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")
            raise LLMError(f"DeepSeek API returned HTTP {error.code}: {detail}") from error
        except urllib.error.URLError as error:
            raise LLMError(f"DeepSeek API request failed: {error.reason}") from error
        except TimeoutError as error:
            raise LLMError("DeepSeek API request timed out") from error

        try:
            content = payload["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as error:
            raise LLMError("DeepSeek API response did not contain a chat message") from error

        return {
            "content": content,
            "model": payload.get("model", self.config.model),
            "usage": payload.get("usage", {}),
            "raw": payload,
        }
