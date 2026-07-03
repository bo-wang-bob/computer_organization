"""Teaching-agent orchestration for the computer organization tutor."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any, Protocol

from . import core
from .config import load_llm_config
from .llm import DeepSeekClient, LLMError


class ChatClient(Protocol):
    def chat(self, messages: list[dict[str, str]], **kwargs: Any) -> dict[str, Any]:
        ...


@dataclass(frozen=True)
class AgentProfile:
    id: str
    name: str
    role: str
    system_prompt: str


AGENT_PROFILES: dict[str, AgentProfile] = {
    "auto": AgentProfile(
        id="auto",
        name="总控调度智能体",
        role="识别学生意图，并把问题交给合适的课程子智能体。",
        system_prompt="你是计算机组成原理教学平台的总控调度智能体，需要先判断学生意图，再组织准确、可执行的学习反馈。",
    ),
    "qa": AgentProfile(
        id="qa",
        name="课程问答智能体",
        role="解释概念、公式、常见误区和考试提示。",
        system_prompt="你是计算机组成原理课程问答智能体，擅长把抽象概念讲成层次清楚的中文解释。",
    ),
    "derivation": AgentProfile(
        id="derivation",
        name="可视化推演智能体",
        role="结合规则工具解释补码、Cache、流水线等可验证推演。",
        system_prompt="你是可视化推演智能体。规则工具给出的数值结果是事实来源，你负责解释每一步为什么这样变化。",
    ),
    "assembly": AgentProfile(
        id="assembly",
        name="汇编解释智能体",
        role="逐条解释汇编指令、寄存器变化、访存和流水线相关性。",
        system_prompt="你是汇编解释智能体，擅长解释 RISC-V 和简化汇编的寄存器、内存与 PC 变化。",
    ),
    "diagnosis": AgentProfile(
        id="diagnosis",
        name="学习诊断智能体",
        role="定位答案中的关键错误，并给出下一步练习建议。",
        system_prompt="你是学习诊断智能体，需要先指出关键错因，再给出短小、可操作的复习建议。",
    ),
}


def list_agents() -> list[dict[str, str]]:
    return [
        {"id": profile.id, "name": profile.name, "role": profile.role}
        for profile in AGENT_PROFILES.values()
    ]


def choose_agent(agent_id: str | None, intent: str) -> AgentProfile:
    if agent_id and agent_id in AGENT_PROFILES and agent_id != "auto":
        return AGENT_PROFILES[agent_id]
    if intent == "assembly_help":
        return AGENT_PROFILES["assembly"]
    if intent in {"twos_complement_help", "cache_help", "pipeline_help"}:
        return AGENT_PROFILES["derivation"]
    if intent == "diagnosis_help":
        return AGENT_PROFILES["diagnosis"]
    return AGENT_PROFILES["qa"]


def extract_assembly_program(message: str) -> str | None:
    lines = []
    for line in message.splitlines():
        stripped = line.strip()
        if re.match(r"^(addi|add|sub|lw|sw|li|mov)\b", stripped, re.I):
            lines.append(stripped)
    return "\n".join(lines) if lines else None


def extract_twos_input(message: str) -> dict[str, Any] | None:
    if not any(keyword in message.lower() for keyword in ["补码", "two", "complement"]):
        return None
    numbers = [int(item) for item in re.findall(r"[-+]?\d+", message)]
    if len(numbers) < 2:
        return None
    bits = 8
    for number in numbers[2:]:
        if number in {4, 8, 16, 32}:
            bits = number
            break
    return {"x": numbers[0], "y": numbers[1], "bits": bits}


def build_tool_context(payload: dict[str, Any], intent: str) -> dict[str, Any]:
    message = str(payload.get("message") or payload.get("question") or "")
    tool_input = payload.get("toolInput") if isinstance(payload.get("toolInput"), dict) else {}
    context: dict[str, Any] = {
        "retrieval": core.answer_question(message, payload.get("chapterId", "all"), payload.get("mode", "standard")),
        "tool": None,
        "toolResult": None,
    }

    try:
        if intent == "twos_complement_help":
            params = tool_input.get("twosComplement") or tool_input.get("twos") or extract_twos_input(message)
            if params:
                context["tool"] = "simulate_twos_complement_add"
                context["toolResult"] = core.simulate_twos_complement_add(
                    params.get("x"), params.get("y"), params.get("bits", 8)
                )
        elif intent == "cache_help":
            params = tool_input.get("cache")
            if params:
                context["tool"] = "simulate_cache_address"
                context["toolResult"] = core.simulate_cache_address(params)
        elif intent == "pipeline_help":
            params = tool_input.get("pipeline") or {}
            program = params.get("program") or extract_assembly_program(message)
            if program:
                context["tool"] = "simulate_pipeline"
                context["toolResult"] = core.simulate_pipeline(program, {"forwarding": params.get("forwarding", True)})
        elif intent == "assembly_help":
            params = tool_input.get("assembly") or {}
            program = params.get("program") or extract_assembly_program(message)
            if program:
                context["tool"] = "execute_assembly"
                context["toolResult"] = core.execute_assembly(program)
        elif intent == "diagnosis_help":
            params = tool_input.get("diagnosis")
            if params:
                context["tool"] = "diagnose_practice"
                context["toolResult"] = core.diagnose_practice(params.get("questionId", ""), params.get("answer", ""))
    except ValueError as error:
        context["toolError"] = str(error)

    return context


def classify_intent(message: str, agent_id: str | None = None) -> str:
    if agent_id == "assembly":
        return "assembly_help"
    if agent_id == "derivation":
        lowered = core.normalize(message)
        if "cache" in lowered:
            return "cache_help"
        if "流水线" in lowered or "pipeline" in lowered:
            return "pipeline_help"
        return "twos_complement_help"
    if agent_id == "diagnosis":
        return "diagnosis_help"
    return core.dispatch_agent({"message": message}).get("intent", "qa")


def build_messages(profile: AgentProfile, payload: dict[str, Any], context: dict[str, Any]) -> list[dict[str, str]]:
    message = str(payload.get("message") or payload.get("question") or "")
    context_text = json.dumps(context, ensure_ascii=False, indent=2)
    system_prompt = (
        f"{profile.system_prompt}\n"
        "请遵守：\n"
        "1. 用中文回答，面向正在学习《计算机组成原理》的学生。\n"
        "2. 如果给出了规则工具结果，必须以工具结果为准，不要重新编造数值。\n"
        "3. 回答结构控制为：结论、关键步骤、易错点、下一步建议。\n"
        "4. 如果缺少推演参数，先说明需要哪些输入。"
    )
    user_prompt = f"学生问题：\n{message}\n\n平台检索和规则工具上下文：\n{context_text}"
    return [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}]


def fallback_answer(profile: AgentProfile, context: dict[str, Any], llm_error: str | None = None) -> str:
    retrieval = context.get("retrieval", {})
    parts = [
        f"{profile.name}已准备好。",
        f"结论：{retrieval.get('summary', '已找到相关课程知识点。')}",
        f"关键解释：{retrieval.get('explanation', '')}",
    ]
    if context.get("toolResult") is not None:
        parts.append("规则工具已完成计算，结果见 toolResult 字段。")
    if context.get("toolError"):
        parts.append(f"工具提示：{context['toolError']}")
    if llm_error:
        parts.append(f"大模型暂未返回，已使用本地规则兜底。原因：{llm_error}")
    return "\n\n".join(part for part in parts if part)


def run_agent(payload: dict[str, Any], client: ChatClient | None = None) -> dict[str, Any]:
    message = str(payload.get("message") or payload.get("question") or "").strip()
    if not message:
        raise ValueError("message 不能为空")

    agent_id = str(payload.get("agentId") or "auto")
    intent = classify_intent(message, agent_id)
    profile = choose_agent(agent_id, intent)
    context = build_tool_context(payload, intent)
    config = load_llm_config()

    result: dict[str, Any] = {
        "agent": {"id": profile.id, "name": profile.name, "role": profile.role},
        "intent": intent,
        "provider": config.provider,
        "model": config.model,
        "llmConfigured": config.configured,
        "context": context,
        "answer": "",
        "usedFallback": False,
    }

    if payload.get("useLLM", True) is False:
        result["answer"] = fallback_answer(profile, context)
        result["usedFallback"] = True
        return result

    chat_client = client or DeepSeekClient(config)
    try:
        response = chat_client.chat(build_messages(profile, payload, context))
        result["answer"] = response["content"]
        result["usage"] = response.get("usage", {})
        result["model"] = response.get("model", config.model)
    except LLMError as error:
        result["answer"] = fallback_answer(profile, context, str(error))
        result["llmError"] = str(error)
        result["usedFallback"] = True

    return result


def llm_status() -> dict[str, Any]:
    return load_llm_config().public_dict()
