"""Teaching-agent orchestration for the computer organization tutor."""

from __future__ import annotations

import json
import random
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


SUPPORTED_DEMO_PANELS = {
    "twos-sim",
    "cache-sim",
    "virtual-sim",
    "memory-access-sim",
    "memory-expansion-sim",
    "pipeline-sim",
    "datapath-sim",
    "assembly-sim",
    "hardwire-sim",
    "control-expression-sim",
    "bus-transaction-sim",
    "bus-arbitration-sim",
    "keyboard-sim",
}
UNSUPPORTED_DEMO_MESSAGE = (
    "暂不支持该功能仿真。当前可演示：补码/定点、IEEE 754、Cache、虚拟存储、"
    "存储读写、存储扩展、流水线、CPU 数据通路、汇编解释、硬布线控制、"
    "时序表达式、总线事务、总线仲裁、键盘扫描。"
)


def random_power(options: list[int]) -> int:
    return random.choice(options)


def extract_numbers(message: str) -> list[float]:
    values: list[float] = []
    for token in re.findall(r"[-+]?0x[0-9a-fA-F]+|[-+]?0b[01]+|[-+]?\d+\.\d+|[-+]?\d+", message):
        try:
            if "." in token and not token.lower().startswith(("0x", "0b")):
                values.append(float(token))
            else:
                values.append(float(core.parse_integer(token)))
        except (TypeError, ValueError):
            continue
    return values


def extract_ints(message: str) -> list[int]:
    return [int(value) for value in extract_numbers(message) if float(value).is_integer()]


def extract_hex_tokens(message: str) -> list[str]:
    return re.findall(r"[-+]?0x[0-9a-fA-F]+", message)


def find_bit_width(message: str, default: int = 8) -> int:
    match = re.search(r"(\d+)\s*(?:位|bit|bits)", message, re.I)
    if match:
        value = int(match.group(1))
        if value in {4, 8, 16, 24, 32}:
            return value
    for value in extract_ints(message):
        if value in {4, 8, 16, 24, 32}:
            return value
    return default


def choose_replacement(message: str, default: str = "lru") -> str:
    lowered = core.normalize(message)
    if "fifo" in lowered:
        return "fifo"
    if "lfu" in lowered:
        return "lfu"
    if "opt" in lowered:
        return "opt"
    if "random" in lowered or "随机" in message:
        return "random"
    if "lru" in lowered:
        return "lru"
    return default


def choose_fixed_operation(message: str) -> str:
    lowered = core.normalize(message)
    if any(keyword in lowered for keyword in ["multiply", "mul", "乘", "乘法"]):
        return "multiply"
    if any(keyword in lowered for keyword in ["divide", "div", "除", "除法"]):
        return "divide"
    return "add"


def choose_float_operation(message: str) -> str:
    lowered = core.normalize(message)
    return "subtract" if any(keyword in lowered for keyword in ["subtract", "minus", "减", "相减"]) else "add"


def pipeline_demo_program() -> str:
    return "lw x1, 0(x2)\nadd x3, x1, x4\nsub x5, x3, x6"


def assembly_demo_program(message: str = "") -> str:
    extracted = extract_assembly_program(message)
    if extracted:
        return extracted
    variants = [
        "addi x1, x0, 5\naddi x2, x0, 7\nadd x3, x1, x2\nsw x3, 0(x0)\nlw x4, 0(x0)",
        "addi x1, x0, 12\nsw x1, 0(x0)\nlw x2, 0(x0)\nsub x3, x2, x1",
        "li R1, 6\nmov R2, R1\nADD R3, R1, R2\nSUB R4, R3, R1",
    ]
    return random.choice(variants)


def datapath_demo_program(message: str = "") -> str:
    extracted = extract_assembly_program(message)
    if extracted:
        return extracted
    lowered = core.normalize(message)
    if "lw" in lowered or "load" in lowered:
        return "addi x1, x0, 5\nsw x1, 0(x0)\nlw x2, 0(x0)\nadd x3, x1, x2"
    if "sw" in lowered or "store" in lowered:
        return "addi x1, x0, 9\nsw x1, 4(x0)"
    if "sub" in lowered:
        return "addi x1, x0, 9\naddi x2, x0, 4\nsub x3, x1, x2"
    return random.choice(
        [
            "addi x1, x0, 5\naddi x2, x0, 7\nadd x3, x1, x2",
            "addi x1, x0, 12\nsw x1, 0(x0)\nlw x2, 0(x0)",
        ]
    )


def fixed_point_inputs(message: str) -> dict[str, Any]:
    operation = choose_fixed_operation(message)
    bits = min(find_bit_width(message, random.choice([4, 8, 16])), 16)
    value_range = (-(2 ** (bits - 1)), 2 ** (bits - 1) - 1)
    ints = extract_ints(message)
    if bits in ints:
        ints = ints.copy()
        ints.remove(bits)
    if len(ints) >= 2:
        x, y = ints[0], ints[1]
    elif operation == "divide":
        x = random.randint(max(value_range[0], -20), min(value_range[1], 20))
        y = random.choice([value for value in range(-7, 8) if value != 0])
    else:
        x = random.randint(max(value_range[0], -12), min(value_range[1], 12))
        y = random.randint(max(value_range[0], -12), min(value_range[1], 12))
    if operation == "divide" and y == 0:
        y = random.choice([-3, -2, -1, 1, 2, 3])
    x = max(value_range[0], min(value_range[1], x))
    y = max(value_range[0], min(value_range[1], y))
    return {"demoType": "fixed", "fixedOperation": operation, "x": x, "y": y, "bits": bits}


def ieee754_inputs(message: str) -> dict[str, Any]:
    numbers = [value for value in extract_numbers(message) if value != 754]
    if len(numbers) >= 2:
        a, b = numbers[0], numbers[1]
    else:
        a = random.choice([1.5, 2.75, -3.5, 6.25])
        b = random.choice([-0.25, 0.5, 1.125, -2.0])
    return {"demoType": "ieee754", "a": a, "b": b, "operation": choose_float_operation(message)}


def parse_memory_spec_pairs(message: str) -> list[tuple[int, int]]:
    pairs: list[tuple[int, int]] = []
    pattern = re.compile(r"(\d+)\s*([kK]?)\s*[xX×]\s*(\d+)")
    for match in pattern.finditer(message):
        words = int(match.group(1)) * (1024 if match.group(2) else 1)
        bits = int(match.group(3))
        pairs.append((words, bits))
    return pairs


def cache_inputs(message: str) -> dict[str, Any]:
    lowered = core.normalize(message)
    mapping = "direct"
    if "组相联" in message or "set" in lowered:
        mapping = "set"
    elif "全相联" in message or "fully" in lowered:
        mapping = "fully"
    lines = 4
    block_size = 4
    address_bits = 6
    associativity = 2 if mapping == "set" else 1
    hex_tokens = extract_hex_tokens(message)
    if hex_tokens:
        accesses = " ".join(hex_tokens)
    else:
        accesses = "0x00 0x04 0x08 0x00 0x10 0x00 0x14 0x04"
    return {
        "accesses": accesses,
        "addressBits": address_bits,
        "lines": lines,
        "blockSize": block_size,
        "mapping": mapping,
        "associativity": associativity,
        "replacement": choose_replacement(message, "lru"),
    }


def cache_accesses_fit_default_range(accesses: Any, address_bits: int) -> bool:
    try:
        parsed = core.parse_address_list(accesses)
    except (TypeError, ValueError):
        return False
    return bool(parsed) and all(0 <= address < 2**address_bits for address in parsed)


def virtual_memory_inputs(message: str) -> dict[str, Any]:
    lowered = core.normalize(message)
    if "段页" in message or "segmented" in lowered:
        mode = "segmented-paging"
    elif "段表" in message or "segmentation" in lowered:
        mode = "segmentation"
    else:
        mode = "paging"
    page_size = random.choice([256, 512, 1024])
    frames = random.choice([3, 4])
    ints = extract_ints(message)
    references = " ".join(str(value) for value in ints if 0 <= value <= 16)
    if not references or len(references.split()) < 4:
        references = random.choice(["0 1 2 3 0 1 4 0 1 2 3 4", "1 2 3 4 1 2 5 1 2 3 4 5"])
    logical = ints[0] if ints else random.randint(0, page_size * 4 - 1)
    if mode == "segmentation":
        logical_address: int | str = "0:512"
    elif mode == "segmented-paging":
        logical_address = "0:1:128"
    else:
        logical_address = logical
    return {
        "mode": mode,
        "logicalAddress": logical_address,
        "pageSize": page_size,
        "frames": frames,
        "replacement": choose_replacement(message, "lru"),
        "references": references,
        "segmentTable": "0 4096 1024\n1 8192 2048",
        "segmentPageTable": "0 0 2\n0 1 5\n1 0 7",
    }


def memory_access_inputs(message: str) -> dict[str, Any]:
    lowered = core.normalize(message)
    address_bits = 8
    column_bits = 4
    data_bits = 8
    hex_tokens = extract_hex_tokens(message)
    operation = "read" if any(keyword in lowered for keyword in ["read", "读取", "读"]) else "write"
    address = hex_tokens[0] if hex_tokens else f"0x{random.randint(0, 2**address_bits - 1):X}"
    data = hex_tokens[1] if len(hex_tokens) > 1 else f"0x{random.randint(0, 2**data_bits - 1):X}"
    return {
        "operation": operation,
        "addressBits": address_bits,
        "columnBits": column_bits,
        "dataBits": data_bits,
        "address": address,
        "data": data,
    }


def memory_expansion_inputs(message: str) -> dict[str, Any]:
    lowered = core.normalize(message)
    mode = "word" if any(keyword in lowered for keyword in ["word", "字扩展", "字扩展法"]) else "bit"
    specs = parse_memory_spec_pairs(message)
    if len(specs) >= 2:
        chip_words, chip_bits = specs[0]
        target_words, target_bits = specs[1]
        mode = "word" if target_words > chip_words else "bit"
        return {
            "mode": mode,
            "chipWords": chip_words,
            "chipBits": chip_bits,
            "targetWords": target_words,
            "targetBits": target_bits,
        }
    ints = [value for value in extract_ints(message) if value > 0]
    if len(ints) >= 4:
        chip_words, chip_bits, target_words, target_bits = ints[:4]
    elif mode == "word":
        chip_words = random.choice([256, 512, 1024])
        chip_bits = random.choice([4, 8])
        target_words = chip_words * random.choice([2, 4])
        target_bits = chip_bits
    else:
        chip_words = random.choice([512, 1024])
        chip_bits = random.choice([1, 2, 4])
        target_words = chip_words
        target_bits = chip_bits * random.choice([2, 4])
    return {
        "mode": mode,
        "chipWords": chip_words,
        "chipBits": chip_bits,
        "targetWords": target_words,
        "targetBits": target_bits,
    }


def default_demo_plan(kind: str, message: str = "", *, reason: str | None = None) -> dict[str, Any]:
    lowered = core.normalize(message)
    if kind == "fixed":
        return {
            "supported": True,
            "targetPanel": "twos-sim",
            "title": "补码/定点运算演示",
            "inputs": fixed_point_inputs(message),
            "reason": reason or "检测到补码、定点、乘法、除法或溢出相关表达。",
        }
    if kind == "ieee754":
        return {
            "supported": True,
            "targetPanel": "twos-sim",
            "title": "IEEE 754 浮点运算演示",
            "inputs": ieee754_inputs(message),
            "reason": reason or "检测到 IEEE 754、浮点、对阶或规格化相关表达。",
        }
    if kind == "cache":
        return {
            "supported": True,
            "targetPanel": "cache-sim",
            "title": "Cache 映射与替换演示",
            "inputs": cache_inputs(message),
            "reason": reason or "检测到 Cache、命中、冲突或替换算法相关表达。",
        }
    if kind == "virtual":
        return {
            "supported": True,
            "targetPanel": "virtual-sim",
            "title": "虚拟存储演示",
            "inputs": virtual_memory_inputs(message),
            "reason": reason or "检测到虚存、页表、段表、缺页或页面置换相关表达。",
        }
    if kind == "memory_access":
        return {
            "supported": True,
            "targetPanel": "memory-access-sim",
            "title": "存储读写过程演示",
            "inputs": memory_access_inputs(message),
            "reason": reason or "检测到存储器读写、MAR、MDR、地址译码或总线相关表达。",
        }
    if kind == "memory_expansion":
        return {
            "supported": True,
            "targetPanel": "memory-expansion-sim",
            "title": "存储器容量扩展演示",
            "inputs": memory_expansion_inputs(message),
            "reason": reason or "检测到存储器扩展、位扩展、字扩展或片选相关表达。",
        }
    if kind == "hardwire":
        return {
            "supported": True,
            "targetPanel": "hardwire-sim",
            "title": "硬布线控制器演示",
            "inputs": {
                "op": "ADD",
                "pc": 100,
                "dest": "R1",
                "source": "R2",
                "destValue": 5,
                "sourceValue": 3,
                "address": "0x40",
                "bits": 8,
            },
            "reason": reason or "检测到硬布线控制器、指令译码或控制信号形成相关表达。",
        }
    if kind == "control_expression":
        return {
            "supported": True,
            "targetPanel": "control-expression-sim",
            "title": "控制信号表达式推导演示",
            "inputs": {"signal": "LDPC"},
            "reason": reason or "检测到时序、节拍或控制信号逻辑表达式相关表达。",
        }
    if kind == "bus_transaction":
        return {
            "supported": True,
            "targetPanel": "bus-transaction-sim",
            "title": "总线事务演示",
            "inputs": {"operation": "read-memory", "address": "0x2A", "data": "10110110", "deviceName": "键盘接口"},
            "reason": reason or "检测到地址总线、数据总线、控制总线或总线事务相关表达。",
        }
    if kind == "bus_arbitration":
        return {
            "supported": True,
            "targetPanel": "bus-arbitration-sim",
            "title": "总线仲裁演示",
            "inputs": {
                "mode": "chain",
                "devices": "CPU,4,1010\nDMA,3,1100\n网卡,2,0111\n硬盘,1,1001",
                "requests": "DMA,网卡,硬盘",
                "counterStart": 0,
                "priorityRule": "priority",
            },
            "reason": reason or "检测到总线仲裁、链式查询、计数器查询、独立请求或分布式仲裁相关表达。",
        }
    if kind == "keyboard":
        return {
            "supported": True,
            "targetPanel": "keyboard-sim",
            "title": "矩阵键盘扫描演示",
            "inputs": {
                "layout": "1 2 3 4 5 6\n7 8 9 0 A B\nC D E F G H\nI J K L M N\nO P Q R S T\nU V W X Y Z",
                "key": "6",
                "debounce": 10,
            },
            "reason": reason or "检测到矩阵键盘、按键扫描或防抖相关表达。",
        }
    if kind == "pipeline":
        forwarding = not any(keyword in lowered for keyword in ["关闭转发", "不开转发", "无转发", "no forwarding"])
        return {
            "supported": True,
            "targetPanel": "pipeline-sim",
            "title": "流水线冒险演示",
            "inputs": {"program": pipeline_demo_program(), "forwarding": forwarding},
            "reason": reason or "检测到流水线、RAW、load-use、转发或冒险相关表达。",
        }
    if kind == "datapath":
        return {
            "supported": True,
            "targetPanel": "datapath-sim",
            "title": "CPU 数据通路演示",
            "inputs": {"program": datapath_demo_program(message)},
            "reason": reason or "检测到数据通路、控制信号或单条指令执行相关表达。",
        }
    if kind == "assembly":
        return {
            "supported": True,
            "targetPanel": "assembly-sim",
            "title": "汇编逐步执行演示",
            "inputs": {"program": assembly_demo_program(message)},
            "reason": reason or "检测到汇编执行、寄存器变化或内存写入相关表达。",
        }
    return unsupported_demo_plan(reason)


def unsupported_demo_plan(reason: str | None = None) -> dict[str, Any]:
    return {
        "supported": False,
        "targetPanel": None,
        "title": "暂不支持该功能仿真",
        "inputs": {},
        "reason": reason or UNSUPPORTED_DEMO_MESSAGE,
    }


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
    if intent in {"twos_complement_help", "fixed_point_help", "float_help", "cache_help", "virtual_memory_help", "pipeline_help", "datapath_help"}:
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
        elif intent == "fixed_point_help":
            params = tool_input.get("fixedPoint")
            if params:
                context["tool"] = "simulate_fixed_point_operation"
                context["toolResult"] = core.simulate_fixed_point_operation(params)
        elif intent == "float_help":
            params = tool_input.get("ieee754") or tool_input.get("float")
            if params:
                context["tool"] = "simulate_ieee754_operation"
                context["toolResult"] = core.simulate_ieee754_operation(
                    params.get("a"), params.get("b"), params.get("operation", "add")
                )
        elif intent == "cache_help":
            params = tool_input.get("cacheSystem") or tool_input.get("cache")
            if params:
                if params.get("accesses"):
                    context["tool"] = "simulate_cache_system"
                    context["toolResult"] = core.simulate_cache_system(params)
                else:
                    context["tool"] = "simulate_cache_address"
                    context["toolResult"] = core.simulate_cache_address(params)
        elif intent == "virtual_memory_help":
            params = tool_input.get("virtualMemory")
            if params:
                context["tool"] = "simulate_virtual_memory"
                context["toolResult"] = core.simulate_virtual_memory(params)
        elif intent == "pipeline_help":
            params = tool_input.get("pipeline") or {}
            program = params.get("program") or extract_assembly_program(message)
            if program:
                context["tool"] = "simulate_pipeline"
                context["toolResult"] = core.simulate_pipeline(program, {"forwarding": params.get("forwarding", True)})
        elif intent == "datapath_help":
            params = tool_input.get("datapath") or {}
            program = params.get("program") or extract_assembly_program(message)
            if program:
                context["tool"] = "simulate_datapath"
                context["toolResult"] = core.simulate_datapath(program)
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
        if any(keyword in lowered for keyword in ["ieee", "754", "浮点"]):
            return "float_help"
        if any(keyword in lowered for keyword in ["虚存", "虚拟存储", "页表", "段表", "段页", "页面置换"]):
            return "virtual_memory_help"
        if any(keyword in lowered for keyword in ["cache", "缓存", "组相联", "全相联", "lru", "fifo", "lfu"]):
            return "cache_help"
        if "流水线" in lowered or "pipeline" in lowered:
            return "pipeline_help"
        if "数据通路" in lowered or "控制信号" in lowered or "datapath" in lowered:
            return "datapath_help"
        if "乘" in lowered or "除" in lowered:
            return "fixed_point_help"
        return "twos_complement_help"
    if agent_id == "diagnosis":
        return "diagnosis_help"
    return core.dispatch_agent({"message": message}).get("intent", "qa")


def fallback_demo_plan(message: str) -> dict[str, Any]:
    lowered = core.normalize(message)
    if any(keyword in lowered for keyword in ["ieee", "754", "float", "浮点", "对阶", "规格化", "尾数", "阶码"]):
        return default_demo_plan("ieee754", message)
    if any(keyword in lowered for keyword in ["补码", "定点", "溢出", "乘法", "除法", "two", "complement", "fixed"]):
        return default_demo_plan("fixed", message)
    if any(
        keyword in lowered
        for keyword in ["cache", "缓存", "命中", "冲突", "lru", "fifo", "lfu", "直接映射", "组相联", "全相联", "替换"]
    ):
        return default_demo_plan("cache", message)
    if any(keyword in lowered for keyword in ["虚存", "虚拟存储", "页表", "段表", "段页", "缺页", "页面置换", "paging", "page replacement", "virtual memory"]):
        return default_demo_plan("virtual", message)
    if any(keyword in lowered for keyword in ["存储读写", "读写过程", "mar", "mdr", "地址译码", "memory access"]):
        return default_demo_plan("memory_access", message)
    if any(keyword in lowered for keyword in ["存储扩展", "容量扩展", "位扩展", "字扩展", "片选", "memory expansion"]):
        return default_demo_plan("memory_expansion", message)
    if any(keyword in lowered for keyword in ["硬布线", "硬连线", "控制器", "指令译码", "微命令", "hardwired"]):
        return default_demo_plan("hardwire", message)
    if any(keyword in lowered for keyword in ["时序", "节拍", "控制信号表达式", "逻辑表达式", "ldpc", "ldir", "ldar", "lddr"]):
        return default_demo_plan("control_expression", message)
    if any(keyword in lowered for keyword in ["总线仲裁", "仲裁", "链式查询", "计数器定时", "独立请求", "分布式仲裁", "bus arbitration"]):
        return default_demo_plan("bus_arbitration", message)
    if any(keyword in lowered for keyword in ["总线事务", "地址总线", "数据总线", "控制总线", "总线基本", "bus transaction"]):
        return default_demo_plan("bus_transaction", message)
    if any(keyword in lowered for keyword in ["键盘", "矩阵键盘", "按键扫描", "防抖", "keyboard"]):
        return default_demo_plan("keyboard", message)
    if any(keyword in lowered for keyword in ["数据通路", "控制信号", "单周期", "datapath"]):
        return default_demo_plan("datapath", message)
    if any(keyword in lowered for keyword in ["流水线", "pipeline", "raw", "load-use", "load use", "冒险", "转发", "停顿", "stall"]):
        return default_demo_plan("pipeline", message)
    if any(keyword in lowered for keyword in ["汇编", "assembly", "寄存器变化", "逐步执行"]):
        return default_demo_plan("assembly", message)
    if re.search(r"\b(lw|sw|add|sub|addi)\b", lowered) and any(keyword in lowered for keyword in ["指令", "执行", "过程"]):
        return default_demo_plan("datapath", message)
    return unsupported_demo_plan()


def build_demo_plan_messages(message: str) -> list[dict[str, str]]:
    system_prompt = (
        "你是计算机组成原理教师课堂演示平台的意图规划器。"
        "你的任务是把教师的自然语言输入映射到已有仿真模块，并生成可直接运行的课堂演示参数。"
        "只能使用以下 targetPanel：twos-sim、cache-sim、virtual-sim、memory-access-sim、memory-expansion-sim、pipeline-sim、datapath-sim、assembly-sim、hardwire-sim、control-expression-sim、bus-transaction-sim、bus-arbitration-sim、keyboard-sim。"
        "如果教师想演示的内容不属于这些仿真模块，必须返回 supported=false。"
        "只输出一个 JSON 对象，不要输出 Markdown、解释文字或代码块。"
        "JSON 字段必须包含 supported、targetPanel、title、inputs、reason。"
        "twos-sim 有两种：补码/定点演示 inputs 使用 demoType=fixed、fixedOperation、x、y、bits；IEEE 754 演示 inputs 使用 demoType=ieee754、a、b、operation。"
        "cache-sim 的 inputs 使用 accesses、mapping、replacement；地址位数、缓存行数、块大小和相联度固定为默认值。"
        "virtual-sim 的 inputs 使用 mode、logicalAddress、pageSize、frames、replacement、references、segmentTable、segmentPageTable。"
        "memory-access-sim 的 inputs 使用 operation、address、data；地址位数、列地址位数、数据位数固定为默认值。"
        "memory-expansion-sim 的 inputs 使用 mode、chipWords、chipBits、targetWords、targetBits。"
        "pipeline-sim 的 inputs 使用 program 和 forwarding。"
        "datapath-sim 的 inputs 使用 program。"
        "assembly-sim 的 inputs 使用 program。"
        "hardwire-sim 的 inputs 使用 op、pc、dest、source、destValue、sourceValue、address、bits。"
        "control-expression-sim 的 inputs 可使用 signal。"
        "bus-transaction-sim 的 inputs 使用 operation、address、data、deviceName。"
        "bus-arbitration-sim 的 inputs 使用 mode、devices、requests、counterStart、priorityRule。"
        "keyboard-sim 的 inputs 使用 layout、key、debounce。"
        "如果用户给出具体数值、地址、位数、算法或程序，尽量使用用户给出的值；缺少的值补充一个合理随机例子。"
    )
    user_prompt = (
        f"教师输入：{message}\n"
        "请生成一个适合课堂立即演示的例子。"
        "示例要短小、稳定、能突出知识点。"
        f"不支持时 reason 写：{UNSUPPORTED_DEMO_MESSAGE}"
    )
    return [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}]


def parse_json_object(content: str) -> dict[str, Any]:
    text = str(content or "").strip()
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.I)
    text = re.sub(r"\s*```$", "", text)
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise ValueError("DeepSeek 未返回 JSON 对象")
    return json.loads(text[start : end + 1])


def normalize_demo_plan(plan: dict[str, Any], message: str) -> dict[str, Any]:
    if not isinstance(plan, dict):
        raise ValueError("演示计划格式错误")

    supported = plan.get("supported") is True
    target_panel = plan.get("targetPanel")
    if not supported:
        return unsupported_demo_plan(str(plan.get("reason") or UNSUPPORTED_DEMO_MESSAGE))
    if target_panel not in SUPPORTED_DEMO_PANELS:
        raise ValueError("演示计划指向了不存在的仿真模块")

    inputs = plan.get("inputs") if isinstance(plan.get("inputs"), dict) else {}
    title = str(plan.get("title") or "智能课堂演示")
    reason = str(plan.get("reason") or "DeepSeek 已匹配到可用仿真模块。")

    if target_panel == "twos-sim":
        if inputs.get("demoType") == "ieee754" or "a" in inputs or "b" in inputs:
            defaults = default_demo_plan("ieee754", message)["inputs"]
            normalized_inputs = {
                "demoType": "ieee754",
                "a": inputs.get("a", defaults["a"]),
                "b": inputs.get("b", defaults["b"]),
                "operation": inputs.get("operation") or defaults["operation"],
            }
        else:
            defaults = default_demo_plan("fixed", message)["inputs"]
            normalized_inputs = {
                "demoType": "fixed",
                "fixedOperation": inputs.get("fixedOperation") or inputs.get("operation") or defaults["fixedOperation"],
                "x": inputs.get("x", defaults["x"]),
                "y": inputs.get("y", defaults["y"]),
                "bits": inputs.get("bits", defaults["bits"]),
            }
    elif target_panel == "cache-sim":
        defaults = default_demo_plan("cache", message)["inputs"]
        address_bits = defaults["addressBits"]
        accesses = inputs.get("accesses") or defaults["accesses"]
        if not cache_accesses_fit_default_range(accesses, address_bits):
            accesses = defaults["accesses"]
        normalized_inputs = {
            "accesses": accesses,
            "addressBits": address_bits,
            "lines": defaults["lines"],
            "blockSize": defaults["blockSize"],
            "mapping": inputs.get("mapping") or defaults["mapping"],
            "associativity": defaults["associativity"],
            "replacement": inputs.get("replacement") or defaults["replacement"],
        }
    elif target_panel == "virtual-sim":
        defaults = default_demo_plan("virtual", message)["inputs"]
        normalized_inputs = {
            "mode": inputs.get("mode") or defaults["mode"],
            "logicalAddress": inputs.get("logicalAddress", defaults["logicalAddress"]),
            "pageSize": inputs.get("pageSize", defaults["pageSize"]),
            "frames": inputs.get("frames", defaults["frames"]),
            "replacement": inputs.get("replacement") or defaults["replacement"],
            "references": inputs.get("references") or defaults["references"],
            "segmentTable": inputs.get("segmentTable") or defaults["segmentTable"],
            "segmentPageTable": inputs.get("segmentPageTable") or defaults["segmentPageTable"],
        }
    elif target_panel == "memory-access-sim":
        defaults = default_demo_plan("memory_access", message)["inputs"]
        normalized_inputs = {
            "operation": inputs.get("operation") or defaults["operation"],
            "addressBits": defaults["addressBits"],
            "columnBits": defaults["columnBits"],
            "dataBits": defaults["dataBits"],
            "address": inputs.get("address", defaults["address"]),
            "data": inputs.get("data", defaults["data"]),
        }
    elif target_panel == "memory-expansion-sim":
        defaults = default_demo_plan("memory_expansion", message)["inputs"]
        normalized_inputs = {
            "mode": inputs.get("mode") or defaults["mode"],
            "chipWords": inputs.get("chipWords", defaults["chipWords"]),
            "chipBits": inputs.get("chipBits", defaults["chipBits"]),
            "targetWords": inputs.get("targetWords", defaults["targetWords"]),
            "targetBits": inputs.get("targetBits", defaults["targetBits"]),
        }
    elif target_panel == "hardwire-sim":
        defaults = default_demo_plan("hardwire", message)["inputs"]
        normalized_inputs = {
            "op": inputs.get("op") or defaults["op"],
            "pc": inputs.get("pc", defaults["pc"]),
            "dest": inputs.get("dest") or defaults["dest"],
            "source": inputs.get("source") or defaults["source"],
            "destValue": inputs.get("destValue", defaults["destValue"]),
            "sourceValue": inputs.get("sourceValue", defaults["sourceValue"]),
            "address": inputs.get("address", defaults["address"]),
            "bits": inputs.get("bits", defaults["bits"]),
        }
    elif target_panel == "control-expression-sim":
        defaults = default_demo_plan("control_expression", message)["inputs"]
        normalized_inputs = {"signal": inputs.get("signal") or defaults["signal"]}
    elif target_panel == "bus-transaction-sim":
        defaults = default_demo_plan("bus_transaction", message)["inputs"]
        normalized_inputs = {
            "operation": inputs.get("operation") or defaults["operation"],
            "address": inputs.get("address", defaults["address"]),
            "data": inputs.get("data", defaults["data"]),
            "deviceName": inputs.get("deviceName") or defaults["deviceName"],
        }
    elif target_panel == "bus-arbitration-sim":
        defaults = default_demo_plan("bus_arbitration", message)["inputs"]
        normalized_inputs = {
            "mode": inputs.get("mode") or defaults["mode"],
            "devices": inputs.get("devices") or defaults["devices"],
            "requests": inputs.get("requests") or defaults["requests"],
            "counterStart": inputs.get("counterStart", defaults["counterStart"]),
            "priorityRule": inputs.get("priorityRule") or defaults["priorityRule"],
        }
    elif target_panel == "keyboard-sim":
        defaults = default_demo_plan("keyboard", message)["inputs"]
        normalized_inputs = {
            "layout": inputs.get("layout") or defaults["layout"],
            "key": inputs.get("key") or defaults["key"],
            "debounce": inputs.get("debounce", defaults["debounce"]),
        }
    elif target_panel == "pipeline-sim":
        defaults = default_demo_plan("pipeline", message)["inputs"]
        normalized_inputs = {
            "program": str(inputs.get("program") or defaults["program"]),
            "forwarding": inputs.get("forwarding", defaults["forwarding"]) is not False,
        }
    elif target_panel == "datapath-sim":
        defaults = default_demo_plan("datapath", message)["inputs"]
        normalized_inputs = {"program": str(inputs.get("program") or defaults["program"])}
    else:
        defaults = default_demo_plan("assembly", message)["inputs"]
        normalized_inputs = {
            "program": str(inputs.get("program") or defaults["program"]),
        }

    return {
        "supported": True,
        "targetPanel": target_panel,
        "title": title,
        "inputs": normalized_inputs,
        "reason": reason,
    }


def validate_demo_plan(plan: dict[str, Any]) -> dict[str, Any]:
    if not plan.get("supported"):
        return plan

    inputs = plan["inputs"]
    target_panel = plan["targetPanel"]
    if target_panel == "twos-sim":
        if inputs.get("demoType") == "ieee754":
            preview = core.simulate_ieee754_operation(inputs["a"], inputs["b"], inputs.get("operation", "add"))
            plan["simulationPreview"] = {
                "tool": "simulate_ieee754_operation",
                "result": preview["result"]["value"],
                "operation": preview["operation"],
            }
        else:
            preview = core.simulate_fixed_point_operation(
                {
                    "operation": inputs.get("fixedOperation", "add"),
                    "x": inputs["x"],
                    "y": inputs["y"],
                    "bits": inputs["bits"],
                }
            )
            plan["simulationPreview"] = {
                "tool": "simulate_fixed_point_operation",
                "operation": preview["operation"],
                "result": preview.get("result"),
            }
    elif target_panel == "cache-sim":
        preview = core.simulate_cache_system(inputs)
        plan["simulationPreview"] = {
            "tool": "simulate_cache_system",
            "hitRate": preview["hitRate"],
            "missCount": preview["misses"],
        }
    elif target_panel == "virtual-sim":
        preview = core.simulate_virtual_memory(inputs)
        plan["simulationPreview"] = {
            "tool": "simulate_virtual_memory",
            "mode": preview["mode"],
            "physicalAddress": preview.get("physicalAddress"),
        }
    elif target_panel == "memory-access-sim":
        address_bits = core.parse_integer(inputs["addressBits"])
        column_bits = core.parse_integer(inputs["columnBits"])
        data_bits = core.parse_integer(inputs["dataBits"])
        address = core.parse_integer(inputs["address"])
        data = core.parse_integer(inputs["data"])
        if column_bits >= address_bits:
            inputs["columnBits"] = max(1, address_bits - 1)
        if address < 0 or address >= 2**address_bits:
            inputs["address"] = f"0x{random.randint(0, 2**address_bits - 1):X}"
        if data < 0 or data >= 2**data_bits:
            inputs["data"] = f"0x{random.randint(0, 2**data_bits - 1):X}"
        plan["simulationPreview"] = {"tool": "frontend_memory_access", "operation": inputs["operation"]}
    elif target_panel == "memory-expansion-sim":
        for key in ["chipWords", "chipBits", "targetWords", "targetBits"]:
            if core.parse_integer(inputs[key]) <= 0:
                raise ValueError(f"{key} 必须为正整数")
        plan["simulationPreview"] = {"tool": "frontend_memory_expansion", "mode": inputs["mode"]}
    elif target_panel == "hardwire-sim":
        plan["simulationPreview"] = {"tool": "frontend_hardwire", "op": inputs["op"]}
    elif target_panel == "control-expression-sim":
        plan["simulationPreview"] = {"tool": "frontend_control_expression", "signal": inputs["signal"]}
    elif target_panel == "bus-transaction-sim":
        plan["simulationPreview"] = {"tool": "frontend_bus_transaction", "operation": inputs["operation"]}
    elif target_panel == "bus-arbitration-sim":
        plan["simulationPreview"] = {"tool": "frontend_bus_arbitration", "mode": inputs["mode"]}
    elif target_panel == "keyboard-sim":
        plan["simulationPreview"] = {"tool": "frontend_keyboard_matrix", "key": inputs["key"]}
    elif target_panel == "pipeline-sim":
        preview = core.simulate_pipeline(inputs["program"], {"forwarding": inputs.get("forwarding", True)})
        plan["simulationPreview"] = {
            "tool": "simulate_pipeline",
            "cycleCount": preview["cycleCount"],
            "hazardCount": len(preview["hazards"]),
        }
    elif target_panel == "datapath-sim":
        preview = core.simulate_datapath(inputs["program"])
        plan["simulationPreview"] = {
            "tool": "simulate_datapath",
            "instructionCount": len(preview["instructions"]),
            "frameCount": len(preview["frames"]),
        }
    elif target_panel == "assembly-sim":
        preview = core.execute_assembly(inputs["program"])
        plan["simulationPreview"] = {
            "tool": "execute_assembly",
            "stepCount": len(preview["steps"]),
        }
    return plan


def plan_demo(payload: dict[str, Any], client: ChatClient | None = None) -> dict[str, Any]:
    message = str(payload.get("message") or "").strip()
    if not message:
        raise ValueError("message 不能为空")

    config = load_llm_config()
    result: dict[str, Any] = {
        "provider": config.provider,
        "model": config.model,
        "llmConfigured": config.configured,
        "usedFallback": False,
    }

    fallback = fallback_demo_plan(message)
    if payload.get("useLLM", True) is False:
        result.update(validate_demo_plan(fallback))
        result["usedFallback"] = True
        return result

    chat_client = client or DeepSeekClient(config)
    try:
        response = chat_client.chat(build_demo_plan_messages(message), temperature=0.2, max_tokens=900)
        plan = normalize_demo_plan(parse_json_object(response["content"]), message)
        if not plan.get("supported") and fallback.get("supported"):
            result.update(validate_demo_plan(fallback))
            result["usedFallback"] = True
            result["model"] = response.get("model", config.model)
            return result
        result.update(validate_demo_plan(plan))
        result["model"] = response.get("model", config.model)
        result["usage"] = response.get("usage", {})
        return result
    except (LLMError, ValueError, json.JSONDecodeError, KeyError, TypeError) as error:
        result.update(validate_demo_plan(fallback))
        result["usedFallback"] = True
        result["llmError"] = str(error)
        return result


def build_messages(profile: AgentProfile, payload: dict[str, Any], context: dict[str, Any]) -> list[dict[str, str]]:
    message = str(payload.get("message") or payload.get("question") or "")
    context_text = json.dumps(context, ensure_ascii=False, indent=2)
    system_prompt = (
        f"{profile.system_prompt}\n"
        "你必须输出适合网页直接渲染的 Markdown 正文。请严格遵守：\n"
        "1. 只输出 Markdown 内容，不要包裹 ```markdown 代码块，不要输出 HTML。\n"
        "2. 固定使用这些二级标题，且标题文字不要改名：\n"
        "   ## 结论\n"
        "   ## 关键步骤\n"
        "   ## 易错点\n"
        "   ## 下一步\n"
        "3. “结论”写 1 到 2 句，先直接回答学生问题。\n"
        "4. “关键步骤”使用 3 到 5 条有序列表，每条尽量短，公式直接用普通文本书写，例如 a - b = a + (-b)。\n"
        "5. “易错点”和“下一步”使用无序列表，每节 1 到 3 条。\n"
        "6. 不要使用嵌套列表，不要使用表格，不要使用 LaTeX 语法；公式用普通文本表示，二进制数或指令名可以用反引号。\n"
        "7. 如果给出了规则工具结果，必须以工具结果为准，不要重新编造数值。\n"
        "8. 禁止输出任何形如 @@CODE0@@、@@CODE_0@@ 的占位符；如果需要表示变量，请直接写变量名。\n"
        "9. 如果缺少推演参数，在“结论”说明还需要哪些输入，并仍保持上述 Markdown 结构。"
    )
    user_prompt = f"学生问题：\n{message}\n\n平台检索和规则工具上下文：\n{context_text}"
    return [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}]


def fallback_answer(profile: AgentProfile, context: dict[str, Any], llm_error: str | None = None) -> str:
    retrieval = context.get("retrieval", {})
    parts = [
        "## 结论",
        retrieval.get("summary", "已找到相关课程知识点。"),
        "## 关键步骤",
        f"1. {retrieval.get('explanation', '先确认题目涉及的核心概念。')}",
        f"2. 例子：{retrieval.get('example', '结合具体输入再做一步推演。')}",
        "3. 回到题目条件，检查范围、单位和边界情况。",
        "## 易错点",
    ]
    for mistake in retrieval.get("commonMistakes", ["忽略题目中的位数、地址大小或硬件约束。"])[:3]:
        parts.append(f"- {mistake}")
    parts.append("## 下一步")
    followups = retrieval.get("followups", ["换一组参数继续验证。"])
    for followup in followups[:3]:
        parts.append(f"- {followup}")
    if context.get("toolResult") is not None:
        parts.append("- 规则工具已完成计算，页面可查看对应仿真结果。")
    if context.get("toolError"):
        parts.append(f"- 工具提示：{context['toolError']}")
    if llm_error:
        parts.append(f"- 大模型暂未返回，已使用本地规则兜底。原因：{llm_error}")
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
