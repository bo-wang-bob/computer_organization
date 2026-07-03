"""Deterministic teaching tools for the computer organization agent.

The functions in this module intentionally avoid third-party dependencies so
they can be tested even when the web framework is not installed yet.
"""

from __future__ import annotations

import re
import struct
from copy import deepcopy
from typing import Any


PIPELINE_STAGES = ["IF", "ID", "EX", "MEM", "WB"]


CHAPTERS: list[dict[str, Any]] = [
    {
        "id": "data",
        "title": "数据表示",
        "description": "原码、反码、补码、浮点数与溢出判断。",
        "progress": 72,
    },
    {
        "id": "alu",
        "title": "运算器",
        "description": "ALU、定点加减法、乘除法与标志位。",
        "progress": 58,
    },
    {
        "id": "isa",
        "title": "指令系统",
        "description": "指令格式、寻址方式与汇编语义。",
        "progress": 64,
    },
    {
        "id": "cpu",
        "title": "CPU 与流水线",
        "description": "数据通路、控制信号、冒险与转发。",
        "progress": 46,
    },
    {
        "id": "memory",
        "title": "存储系统",
        "description": "Cache 映射、地址划分、命中率与虚拟存储。",
        "progress": 52,
    },
]


KNOWLEDGE_BASE: list[dict[str, Any]] = [
    {
        "id": "twos_complement",
        "chapterId": "data",
        "title": "补码为什么能统一加减法",
        "keywords": ["补码", "减法", "加法", "负数", "溢出", "two", "complement"],
        "summary": "补码把负数表示成模意义下的等价正数，因此减法可以转化为加上另一个数的补码。",
        "explanation": (
            "在 n 位机器中，所有结果都按 2^n 取模。-b 的补码等价于 2^n - b，"
            "所以 a - b 可以写成 a + (2^n - b)。硬件只需要加法器，超过 n 位的进位会被截断。"
        ),
        "example": "8 位下，+5 是 00000101，-3 是 11111101。二者相加得到 00000010，也就是十进制 +2。",
        "commonMistakes": ["把最高位进位当成有符号溢出", "忘记结果仍然要截断到固定 bit 数"],
        "checkQuestion": "如果 8 位补码中 127 + 1 的结果是什么？为什么发生溢出？",
        "followups": ["演示补码加法", "讲溢出判断", "出一道补码题"],
    },
    {
        "id": "ieee754_float",
        "chapterId": "data",
        "title": "IEEE 754 浮点数加减法",
        "keywords": ["IEEE", "754", "浮点", "单精度", "阶码", "尾数", "对阶", "规格化"],
        "summary": "IEEE 754 加减法先拆分符号、阶码和尾数，再对阶、尾数运算、规格化并舍入。",
        "explanation": (
            "浮点加减不能直接把 32 位编码相加，而要先比较阶码，把阶码较小的尾数右移到同一阶，"
            "再按符号做尾数加减。结果需要规格化，最后按目标精度舍入。"
        ),
        "example": "1.5 + (-0.25) 的单精度结果是 1.25，对应编码 00111111101000000000000000000000。",
        "commonMistakes": ["把浮点编码当整数直接相加", "忘记减法可以转为加上相反数", "忽略舍入误差"],
        "checkQuestion": "为什么浮点加法前通常需要对阶？",
        "followups": ["运行 IEEE 754 仿真", "讲对阶过程", "解释规格化"],
    },
    {
        "id": "cache_mapping",
        "chapterId": "memory",
        "title": "Cache 映射与替换",
        "keywords": ["cache", "Cache", "缓存", "直接映射", "组相联", "全相联", "替换", "LRU", "FIFO", "LFU", "地址", "命中", "tag", "index"],
        "summary": "Cache 映射决定主存块能放到哪些行，替换算法决定冲突时换出哪一行。",
        "explanation": (
            "块内偏移由块大小决定；直接映射只有一个候选行，组相联映射在某一组内选择一路，"
            "全相联可放入任意行。发生冲突时，可用 LRU、FIFO、LFU 等策略选择牺牲行。"
        ),
        "example": "16 行 Cache、块大小 4B 时，Offset 为 2 位，Index 为 4 位，Tag 为地址剩余高位。",
        "commonMistakes": ["用主存块数计算 Index 位数", "混淆块内偏移和 Cache 行号"],
        "checkQuestion": "块大小从 4B 变为 16B 时，Offset 位数会怎样变化？",
        "followups": ["运行 Cache 仿真", "比较直接映射和组相联", "出一道地址划分题"],
    },
    {
        "id": "virtual_memory",
        "chapterId": "memory",
        "title": "虚拟存储映射与页面置换",
        "keywords": ["虚存", "虚拟存储", "页表", "段表", "段页式", "页面置换", "缺页", "页框", "LRU", "OPT"],
        "summary": "虚拟存储把逻辑地址转换为物理地址，并在页不在内存时通过页面置换处理缺页。",
        "explanation": (
            "页式存储把地址拆成页号和页内偏移，段式存储先检查段号和段内偏移，"
            "段页式先查段表再查页表。页面置换算法用于物理页框不足时选择换出的页面。"
        ),
        "example": "页大小 1024B 时，逻辑地址 2052 可拆为页号 2、页内偏移 4。",
        "commonMistakes": ["把页号当成页框号", "忘记段式存储需要越界检查", "混淆缺页和地址越界"],
        "checkQuestion": "页式地址转换中，页内偏移为什么不参与页表查找？",
        "followups": ["运行虚存仿真", "比较页表和段表", "讲页面置换算法"],
    },
    {
        "id": "pipeline_hazard",
        "chapterId": "cpu",
        "title": "流水线数据冒险与转发",
        "keywords": ["流水线", "冒险", "RAW", "转发", "暂停", "load-use", "IF", "ID", "EX"],
        "summary": "流水线冒险来自指令重叠执行时的资源、数据或控制冲突，其中 RAW 是最常见的数据冒险。",
        "explanation": (
            "当后一条指令需要读取前一条尚未写回的结果时，会出现 RAW 数据冒险。ALU 指令之间通常可通过"
            "转发解决，但 load-use 冒险常需要插入一个暂停周期。"
        ),
        "example": "lw x1, 0(x2) 后紧接 add x3, x1, x4 时，add 在 EX 阶段需要 x1，而 lw 的数据到 MEM 后才可用。",
        "commonMistakes": ["只看相邻指令而忽略读写寄存器", "认为所有数据冒险都能零暂停转发"],
        "checkQuestion": "add x1, x2, x3 后接 sub x4, x1, x5，在开启转发时是否必须暂停？",
        "followups": ["生成流水线表", "解释 load-use", "出一道冒险分析题"],
    },
    {
        "id": "instruction_format",
        "chapterId": "isa",
        "title": "RISC-V 指令格式与逐步执行",
        "keywords": ["RISC-V", "汇编", "指令", "寄存器", "addi", "add", "lw", "sw", "寻址", "MOV"],
        "summary": "汇编指令可以从读寄存器、运算、访存、写寄存器四个角度逐步解释。",
        "explanation": (
            "例如 addi x1, x0, 5 会读取 x0 和立即数 5，在 ALU 中相加，然后把结果写回 x1。"
            "load/store 指令还需要先计算有效地址。"
        ),
        "example": "sw x3, 0(x0) 表示把 x3 的值写入地址 x0 + 0 对应的内存位置。",
        "commonMistakes": ["把 sw 的第一个寄存器当成目的寄存器", "忽略 x0 恒为 0"],
        "checkQuestion": "lw x5, 8(x2) 中，哪一个寄存器被写入？有效地址如何计算？",
        "followups": ["解释一段汇编", "查看寄存器变化", "练 load/store"],
    },
    {
        "id": "datapath",
        "chapterId": "cpu",
        "title": "单周期 CPU 数据通路",
        "keywords": ["数据通路", "控制信号", "PC", "ALU", "寄存器堆", "CPU"],
        "summary": "数据通路描述指令执行时数据经过哪些硬件部件，控制信号决定部件的选择和写使能。",
        "explanation": (
            "一条指令通常经历取指、译码、执行、访存、写回等动作。即使在单周期 CPU 中，"
            "这些动作也会在一个时钟周期内沿着组合数据通路完成。"
        ),
        "example": "add 指令会读取两个源寄存器，交给 ALU 相加，再把结果写回目的寄存器，不访问数据存储器。",
        "commonMistakes": ["把指令存储器和数据存储器混为一谈", "只记控制信号表而不理解数据流向"],
        "checkQuestion": "为什么 sw 指令需要写数据存储器，但不需要写寄存器堆？",
        "followups": ["讲 add 数据通路", "讲 lw 数据通路", "生成控制信号表"],
    },
]


DIAGNOSTIC_QUESTIONS: list[dict[str, Any]] = [
    {
        "id": "overflow_8bit",
        "title": "8 位补码中 127 + 1 是否溢出？",
        "expected": "溢出",
        "topic": "twos_complement",
        "hint": "两个正数相加得到负数，说明超出 8 位补码可表示范围。",
        "recommendation": "继续练习补码范围和符号位溢出判断。",
    },
    {
        "id": "cache_offset",
        "title": "块大小 16B 时，块内偏移需要几位？",
        "expected": "4",
        "topic": "cache_mapping",
        "hint": "块内偏移位数等于 log2(块大小)。",
        "recommendation": "继续练习 Cache 地址拆分。",
    },
    {
        "id": "sw_semantics",
        "title": "sw x3, 0(x0) 会写哪个寄存器？",
        "expected": "不写寄存器",
        "topic": "instruction_format",
        "hint": "store 指令把寄存器值写入内存，不写回寄存器堆。",
        "recommendation": "继续练习 load/store 指令语义。",
    },
]


def normalize(value: Any) -> str:
    return str(value or "").strip().lower()


def parse_integer(value: Any) -> int:
    if isinstance(value, bool):
        raise ValueError("布尔值不能作为整数输入")
    if isinstance(value, int):
        return value
    if isinstance(value, float) and value.is_integer():
        return int(value)

    text = str(value or "").strip()
    if not text:
        raise ValueError("整数输入不能为空")
    sign = -1 if text.startswith("-") else 1
    unsigned = text[1:] if text[:1] in "+-" else text
    if unsigned.lower().startswith("0x"):
        return sign * int(unsigned[2:], 16)
    if unsigned.lower().startswith("0b"):
        return sign * int(unsigned[2:], 2)
    return int(text, 10)


def assert_integer(value: int, label: str) -> None:
    if not isinstance(value, int) or isinstance(value, bool):
        raise ValueError(f"{label} 必须是整数")


def is_power_of_two(value: int) -> bool:
    return isinstance(value, int) and value > 0 and (value & (value - 1)) == 0


def to_unsigned(value: int, bits: int) -> int:
    return value % (2**bits)


def to_binary_unsigned(value: int, bits: int) -> str:
    return format(to_unsigned(value, bits), f"0{bits}b")[-bits:]


def from_unsigned(unsigned: int, bits: int) -> int:
    sign_bit = 2 ** (bits - 1)
    mod = 2**bits
    return unsigned - mod if unsigned >= sign_bit else unsigned


def get_chapters() -> list[dict[str, Any]]:
    return deepcopy(CHAPTERS)


def get_knowledge_base() -> list[dict[str, Any]]:
    return deepcopy(KNOWLEDGE_BASE)


def answer_question(question: str, chapter_id: str | None = "all", mode: str = "standard") -> dict[str, Any]:
    query = normalize(question)
    selected_chapter = chapter_id if chapter_id and chapter_id != "all" else None

    candidates = [
        item for item in KNOWLEDGE_BASE if selected_chapter is None or item["chapterId"] == selected_chapter
    ]
    if not candidates:
        candidates = KNOWLEDGE_BASE

    scored: list[tuple[int, dict[str, Any]]] = []
    for item in candidates:
        score = 0
        for keyword in item["keywords"]:
            if normalize(keyword) in query:
                score += 3
        if normalize(item["title"]) in query:
            score += 5
        scored.append((score, item))

    scored.sort(key=lambda pair: pair[0], reverse=True)
    best_score, best = scored[0] if scored else (0, KNOWLEDGE_BASE[0])

    mode_notes = {
        "beginner": "入门视角：先抓住直观含义，再看一个最小例子。",
        "standard": "标准视角：按定义、规则、例题和误区组织答案。",
        "exam": "考试视角：重点关注判定条件、公式和易错点。",
        "lab": "实验视角：重点关注硬件状态、寄存器变化和实现边界。",
    }

    return {
        "title": best["title"],
        "summary": best["summary"],
        "explanation": best["explanation"],
        "example": best["example"],
        "commonMistakes": deepcopy(best["commonMistakes"]),
        "checkQuestion": best["checkQuestion"],
        "followups": deepcopy(best["followups"]),
        "modeNote": mode_notes.get(mode, mode_notes["standard"]),
        "knowledgePointId": best["id"],
        "chapterId": best["chapterId"],
        "matched": best_score > 0,
    }


def simulate_twos_complement_add(x_value: Any, y_value: Any, bits_value: Any) -> dict[str, Any]:
    x = parse_integer(x_value)
    y = parse_integer(y_value)
    bits = parse_integer(bits_value)

    assert_integer(x, "x")
    assert_integer(y, "y")
    assert_integer(bits, "位数")
    if bits < 2 or bits > 32:
        raise ValueError("位数建议在 2 到 32 之间")

    min_value = -(2 ** (bits - 1))
    max_value = 2 ** (bits - 1) - 1
    if x < min_value or x > max_value or y < min_value or y > max_value:
        raise ValueError(f"{bits} 位补码可表示范围是 {min_value} 到 {max_value}")

    x_unsigned = to_unsigned(x, bits)
    y_unsigned = to_unsigned(y, bits)
    sum_unsigned = (x_unsigned + y_unsigned) % (2**bits)
    result = from_unsigned(sum_unsigned, bits)
    raw = x + y
    overflow = raw < min_value or raw > max_value

    steps = []
    carry = 0
    for pos in range(bits):
        x_bit = (x_unsigned >> pos) & 1
        y_bit = (y_unsigned >> pos) & 1
        total = x_bit + y_bit + carry
        sum_bit = total % 2
        carry_out = 1 if total >= 2 else 0
        steps.append(
            {
                "position": pos,
                "xBit": x_bit,
                "yBit": y_bit,
                "carryIn": carry,
                "sumBit": sum_bit,
                "carryOut": carry_out,
            }
        )
        carry = carry_out

    explanation = (
        f"数学结果 {raw} 超出 {bits} 位补码范围，因此发生溢出。"
        if overflow
        else f"结果仍在 {bits} 位补码范围内，机器结果 {result} 与数学结果一致。"
    )

    return {
        "x": x,
        "y": y,
        "bits": bits,
        "range": {"min": min_value, "max": max_value},
        "xBinary": to_binary_unsigned(x, bits),
        "yBinary": to_binary_unsigned(y, bits),
        "sumBinary": to_binary_unsigned(sum_unsigned, bits),
        "result": result,
        "raw": raw,
        "overflow": overflow,
        "carryOut": carry,
        "steps": list(reversed(steps)),
        "explanation": explanation,
    }


def assert_signed_range(value: int, bits: int, label: str) -> dict[str, int]:
    min_value = -(2 ** (bits - 1))
    max_value = 2 ** (bits - 1) - 1
    if value < min_value or value > max_value:
        raise ValueError(f"{label} 超出 {bits} 位补码范围：{min_value} 到 {max_value}")
    return {"min": min_value, "max": max_value}


def simulate_fixed_point_multiply(x_value: Any, y_value: Any, bits_value: Any) -> dict[str, Any]:
    x = parse_integer(x_value)
    y = parse_integer(y_value)
    bits = parse_integer(bits_value)
    assert_integer(x, "x")
    assert_integer(y, "y")
    assert_integer(bits, "位数")
    if bits < 2 or bits > 16:
        raise ValueError("乘法位数建议在 2 到 16 之间，便于展示双倍位宽乘积")

    value_range = assert_signed_range(x, bits, "x")
    assert_signed_range(y, bits, "y")
    raw = x * y
    product_bits = bits * 2
    low_result = from_unsigned(to_unsigned(raw, bits), bits)
    overflow = raw < value_range["min"] or raw > value_range["max"]
    abs_x = abs(x)
    abs_y = abs(y)
    partials = []
    for pos in range(bits):
        bit = (abs_y >> pos) & 1
        partial_value = abs_x << pos if bit else 0
        partials.append(
            {
                "position": pos,
                "multiplierBit": bit,
                "partialValue": partial_value,
                "partialBinary": to_binary_unsigned(partial_value, product_bits),
            }
        )

    return {
        "operation": "multiply",
        "x": x,
        "y": y,
        "bits": bits,
        "productBits": product_bits,
        "raw": raw,
        "result": low_result,
        "overflow": overflow,
        "xBinary": to_binary_unsigned(x, bits),
        "yBinary": to_binary_unsigned(y, bits),
        "productBinary": to_binary_unsigned(raw, product_bits),
        "truncatedBinary": to_binary_unsigned(raw, bits),
        "partials": partials,
        "explanation": (
            f"数学乘积 {raw} 超出 {bits} 位补码范围，低 {bits} 位机器结果为 {low_result}。"
            if overflow
            else f"数学乘积 {raw} 可由 {bits} 位补码表示，机器结果为 {low_result}。"
        ),
        "signExplanation": f"符号由两个操作数符号异或决定：结果为{'负' if raw < 0 else '非负'}。",
    }


def simulate_fixed_point_divide(x_value: Any, y_value: Any, bits_value: Any) -> dict[str, Any]:
    x = parse_integer(x_value)
    y = parse_integer(y_value)
    bits = parse_integer(bits_value)
    assert_integer(x, "x")
    assert_integer(y, "y")
    assert_integer(bits, "位数")
    if bits < 2 or bits > 16:
        raise ValueError("除法位数建议在 2 到 16 之间，便于展示步骤")
    if y == 0:
        raise ValueError("除数不能为 0")

    value_range = assert_signed_range(x, bits, "x")
    assert_signed_range(y, bits, "y")
    quotient = int(x / y)
    remainder = x - quotient * y
    overflow = quotient < value_range["min"] or quotient > value_range["max"]
    abs_dividend = abs(x)
    abs_divisor = abs(y)
    current = 0
    steps = []
    for pos in range(bits - 1, -1, -1):
        current = current * 2 + ((abs_dividend >> pos) & 1)
        quotient_bit = 1 if current >= abs_divisor else 0
        if quotient_bit:
            current -= abs_divisor
        steps.append({"position": pos, "shiftedRemainder": current, "quotientBit": quotient_bit})

    return {
        "operation": "divide",
        "x": x,
        "y": y,
        "bits": bits,
        "quotient": quotient,
        "remainder": remainder,
        "overflow": overflow,
        "xBinary": to_binary_unsigned(x, bits),
        "yBinary": to_binary_unsigned(y, bits),
        "quotientBinary": to_binary_unsigned(quotient, bits),
        "remainderBinary": to_binary_unsigned(remainder, bits),
        "steps": steps,
        "explanation": (
            f"商 {quotient} 超出 {bits} 位补码范围，发生除法溢出。"
            if overflow
            else f"商为 {quotient}，余数为 {remainder}，满足 {x} = {quotient} × {y} + {remainder}。"
        ),
    }


def simulate_fixed_point_operation(params: dict[str, Any]) -> dict[str, Any]:
    operation = params.get("operation", "add")
    if operation == "multiply":
        return simulate_fixed_point_multiply(params.get("x"), params.get("y"), params.get("bits", 8))
    if operation == "divide":
        return simulate_fixed_point_divide(params.get("x"), params.get("y"), params.get("bits", 8))
    return {"operation": "add", **simulate_twos_complement_add(params.get("x"), params.get("y"), params.get("bits", 8))}


def float32(value: float) -> float:
    return struct.unpack(">f", struct.pack(">f", float(value)))[0]


def float32_bits(value: float) -> int:
    return struct.unpack(">I", struct.pack(">f", float32(value)))[0]


def decode_float32(value: Any) -> dict[str, Any]:
    rounded = float32(float(value))
    bits = float32_bits(rounded)
    sign = bits >> 31
    exponent_raw = (bits >> 23) & 0xFF
    fraction = bits & 0x7FFFFF
    exponent = -126 if exponent_raw == 0 else exponent_raw - 127
    if exponent_raw == 0xFF:
        category = "infinity" if fraction == 0 else "nan"
    elif exponent_raw == 0:
        category = "zero" if fraction == 0 else "subnormal"
    else:
        category = "normal"

    return {
        "value": rounded,
        "bits": bits,
        "binary": format(bits, "032b"),
        "sign": sign,
        "exponentRaw": exponent_raw,
        "exponent": exponent,
        "fraction": fraction,
        "fractionBinary": format(fraction, "023b"),
        "category": category,
    }


def simulate_ieee754_operation(a_value: Any, b_value: Any, operation_value: str = "add") -> dict[str, Any]:
    a = float(a_value)
    b = float(b_value)
    operation = operation_value or "add"
    if operation not in {"add", "subtract"}:
        raise ValueError("浮点运算仅支持 add 或 subtract")

    left = decode_float32(a)
    right = decode_float32(b)
    effective_right = decode_float32(-b) if operation == "subtract" else right
    result_value = float32(float32(a) - float32(b) if operation == "subtract" else float32(a) + float32(b))
    result = decode_float32(result_value)
    exponent_delta = left["exponent"] - effective_right["exponent"]
    aligned_operand = "右操作数尾数右移" if exponent_delta >= 0 else "左操作数尾数右移"

    return {
        "operation": operation,
        "a": a,
        "b": b,
        "left": left,
        "right": right,
        "effectiveRight": effective_right,
        "result": result,
        "resultValue": result_value,
        "steps": [
            "拆分 IEEE 754 单精度：符号位、8 位阶码、23 位尾数。",
            f"对阶：阶码差为 {abs(exponent_delta)}，{aligned_operand}。",
            "减法转化为加上第二个操作数的相反数。" if operation == "subtract" else "尾数按符号执行加法。",
            "规格化并按单精度舍入，得到最终 32 位结果。",
        ],
        "explanation": f"单精度结果为 {result_value}，二进制编码为 {result['binary']}。",
    }


def simulate_cache_address(params: dict[str, Any]) -> dict[str, Any]:
    address = parse_integer(params.get("address"))
    address_bits = parse_integer(params.get("addressBits", params.get("address_bits", 12)))
    lines = parse_integer(params.get("lines"))
    block_size = parse_integer(params.get("blockSize", params.get("block_size")))

    assert_integer(address, "地址")
    assert_integer(address_bits, "地址位数")
    assert_integer(lines, "Cache 行数")
    assert_integer(block_size, "块大小")

    if address < 0:
        raise ValueError("地址不能为负数")
    if not is_power_of_two(lines):
        raise ValueError("Cache 行数必须是 2 的幂")
    if lines > 1024:
        raise ValueError("Cache 行数暂时限制在 1024 以内，避免返回过大的表格")
    if not is_power_of_two(block_size):
        raise ValueError("块大小必须是 2 的幂")
    if address_bits < 4 or address_bits > 64:
        raise ValueError("地址位数建议在 4 到 64 之间")
    if address >= 2**address_bits:
        raise ValueError(f"地址超出 {address_bits} 位地址空间")

    offset_bits = block_size.bit_length() - 1
    index_bits = lines.bit_length() - 1
    tag_bits = address_bits - offset_bits - index_bits
    if tag_bits < 0:
        raise ValueError("地址位数不足，无法容纳 tag、index 和 offset")

    full_binary = to_binary_unsigned(address, address_bits)
    offset = address % block_size
    block_number = address // block_size
    index = block_number % lines
    tag = block_number // lines

    tag_binary = full_binary[:tag_bits] if tag_bits else ""
    index_binary = full_binary[tag_bits : tag_bits + index_bits] if index_bits else ""
    offset_binary = full_binary[tag_bits + index_bits :] if offset_bits else ""
    rows = [
        {
            "line": line,
            "active": line == index,
            "valid": line == index,
            "tag": tag_binary or "0" if line == index else "-",
            "block": block_number if line == index else "-",
            "offset": offset if line == index else "-",
        }
        for line in range(lines)
    ]

    return {
        "address": address,
        "addressHex": f"0x{address:X}",
        "addressBits": address_bits,
        "lines": lines,
        "blockSize": block_size,
        "mapping": "direct",
        "offsetBits": offset_bits,
        "indexBits": index_bits,
        "tagBits": tag_bits,
        "fullBinary": full_binary,
        "offset": offset,
        "index": index,
        "tag": tag,
        "tagBinary": tag_binary,
        "indexBinary": index_binary,
        "offsetBinary": offset_binary,
        "blockNumber": block_number,
        "rows": rows,
        "explanation": (
            f"块大小 {block_size}B 决定 offset 为 {offset_bits} 位，{lines} 行 Cache 决定 index 为 "
            f"{index_bits} 位，剩余 {tag_bits} 位作为 tag。"
        ),
    }


def parse_address_list(value: Any) -> list[int]:
    if isinstance(value, (list, tuple)):
        return [parse_integer(item) for item in value]
    return [parse_integer(item) for item in re.split(r"[\s,;]+", str(value or "").strip()) if item]


def choose_cache_victim(lines: list[dict[str, Any]], policy: str, clock: int) -> dict[str, Any]:
    if policy == "fifo":
        return min(lines, key=lambda line: line["insertedAt"])
    if policy == "lfu":
        return min(lines, key=lambda line: (line["frequency"], line["lastUsed"]))
    if policy == "random":
        return lines[clock % len(lines)]
    return min(lines, key=lambda line: line["lastUsed"])


def simulate_cache_system(params: dict[str, Any]) -> dict[str, Any]:
    accesses = parse_address_list(params.get("accesses", params.get("address")))
    address_bits = parse_integer(params.get("addressBits", params.get("address_bits", 12)))
    lines = parse_integer(params.get("lines", 16))
    block_size = parse_integer(params.get("blockSize", params.get("block_size", 4)))
    mapping = params.get("mapping", "direct")
    replacement = params.get("replacement", "lru")
    associativity_input = parse_integer(params.get("associativity", 2))

    if not accesses:
        raise ValueError("请输入至少一个访问地址")
    if mapping not in {"direct", "set", "fully"}:
        raise ValueError("映射算法仅支持 direct、set、fully")
    if replacement not in {"lru", "fifo", "lfu", "random"}:
        raise ValueError("替换算法仅支持 lru、fifo、lfu、random")
    if not is_power_of_two(lines):
        raise ValueError("缓存行数必须是 2 的幂")
    if not is_power_of_two(block_size):
        raise ValueError("块大小必须是 2 的幂")
    if address_bits < 4 or address_bits > 32:
        raise ValueError("地址位数建议在 4 到 32 之间")

    associativity = 1 if mapping == "direct" else lines if mapping == "fully" else min(associativity_input, lines)
    if not is_power_of_two(associativity):
        raise ValueError("组相联路数必须是 2 的幂")
    if lines % associativity != 0:
        raise ValueError("缓存行数必须能被组相联路数整除")

    set_count = lines // associativity
    offset_bits = block_size.bit_length() - 1
    index_bits = set_count.bit_length() - 1
    tag_bits = address_bits - offset_bits - index_bits
    if tag_bits < 0:
        raise ValueError("地址位数不足，无法容纳 tag、index 和 offset")

    sets = [
        {
            "setIndex": set_index,
            "lines": [
                {
                    "setIndex": set_index,
                    "way": way,
                    "valid": False,
                    "tag": None,
                    "block": None,
                    "lastUsed": 0,
                    "insertedAt": 0,
                    "frequency": 0,
                }
                for way in range(associativity)
            ],
        }
        for set_index in range(set_count)
    ]
    events = []
    hits = 0
    misses = 0

    for access_index, address in enumerate(accesses):
        if address < 0 or address >= 2**address_bits:
            raise ValueError(f"地址 {address} 超出 {address_bits} 位地址空间")
        block_number = address // block_size
        offset = address % block_size
        set_index = 0 if mapping == "fully" else block_number % set_count
        tag = block_number // set_count if mapping in {"direct", "set"} else block_number
        cache_set = sets[set_index]
        clock = access_index + 1
        hit_line = next((line for line in cache_set["lines"] if line["valid"] and line["tag"] == tag), None)

        if hit_line is not None:
            hits += 1
            hit_line["lastUsed"] = clock
            hit_line["frequency"] += 1
            events.append(
                {
                    "accessIndex": access_index,
                    "address": address,
                    "blockNumber": block_number,
                    "setIndex": set_index,
                    "tag": tag,
                    "offset": offset,
                    "hit": True,
                    "action": f"命中：第 {set_index} 组第 {hit_line['way']} 路。",
                }
            )
            continue

        misses += 1
        empty_line = next((line for line in cache_set["lines"] if not line["valid"]), None)
        target = empty_line or choose_cache_victim(cache_set["lines"], replacement, clock)
        evicted = {"tag": target["tag"], "block": target["block"], "way": target["way"]} if target["valid"] else None
        target.update(
            {
                "valid": True,
                "tag": tag,
                "block": block_number,
                "lastUsed": clock,
                "insertedAt": clock,
                "frequency": 1,
            }
        )
        events.append(
            {
                "accessIndex": access_index,
                "address": address,
                "blockNumber": block_number,
                "setIndex": set_index,
                "tag": tag,
                "offset": offset,
                "hit": False,
                "evicted": evicted,
                "action": (
                    f"未命中：按 {replacement.upper()} 替换第 {set_index} 组第 {evicted['way']} 路。"
                    if evicted
                    else f"未命中：装入第 {set_index} 组第 {target['way']} 路空行。"
                ),
            }
        )

    rows = [
        {
            "set": cache_set["setIndex"],
            "way": line["way"],
            "valid": line["valid"],
            "tag": line["tag"] if line["valid"] else "-",
            "block": line["block"] if line["valid"] else "-",
            "frequency": line["frequency"],
            "lastUsed": line["lastUsed"],
        }
        for cache_set in sets
        for line in cache_set["lines"]
    ]
    mapping_text = "直接映射" if mapping == "direct" else "全相联" if mapping == "fully" else f"{associativity} 路组相联"
    return {
        "mapping": mapping,
        "replacement": replacement,
        "addressBits": address_bits,
        "lines": lines,
        "blockSize": block_size,
        "associativity": associativity,
        "setCount": set_count,
        "offsetBits": offset_bits,
        "indexBits": index_bits,
        "tagBits": tag_bits,
        "accesses": accesses,
        "events": events,
        "rows": rows,
        "hits": hits,
        "misses": misses,
        "hitRate": hits / len(accesses),
        "explanation": f"{mapping_text}，替换算法 {replacement.upper()}，命中 {hits} 次，未命中 {misses} 次。",
    }


def choose_page_victim(frames: list[dict[str, Any]], policy: str, current_index: int, references: list[int]) -> dict[str, Any]:
    if policy == "fifo":
        return min(frames, key=lambda frame: frame["loadedAt"])
    if policy == "lfu":
        return min(frames, key=lambda frame: (frame["frequency"], frame["lastUsed"]))
    if policy == "opt":
        def future_score(frame: dict[str, Any]) -> int:
            try:
                return references[current_index + 1 :].index(frame["page"])
            except ValueError:
                return 10**9

        return max(frames, key=future_score)
    return min(frames, key=lambda frame: frame["lastUsed"])


def parse_segment_table(text: Any) -> list[dict[str, int]]:
    rows = []
    for line in str(text or "").splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        segment, base, limit = [parse_integer(item) for item in re.split(r"[\s,;:]+", stripped)[:3]]
        rows.append({"segment": segment, "base": base, "limit": limit})
    return rows


def parse_segment_page_table(text: Any) -> list[dict[str, int]]:
    rows = []
    for line in str(text or "").splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        segment, page, frame = [parse_integer(item) for item in re.split(r"[\s,;:]+", stripped)[:3]]
        rows.append({"segment": segment, "page": page, "frame": frame})
    return rows


def simulate_page_replacement(references_value: Any, frame_count_value: Any, policy_value: str = "lru") -> dict[str, Any]:
    references = parse_address_list(references_value)
    frame_count = parse_integer(frame_count_value)
    policy = policy_value or "lru"
    if policy not in {"lru", "fifo", "lfu", "opt"}:
        raise ValueError("页面置换算法仅支持 lru、fifo、lfu、opt")
    if not references:
        raise ValueError("请输入页面访问序列")
    if frame_count <= 0 or frame_count > 16:
        raise ValueError("物理页框数建议在 1 到 16 之间")

    frames = [
        {"frame": frame, "page": None, "loadedAt": 0, "lastUsed": 0, "frequency": 0}
        for frame in range(frame_count)
    ]
    events = []
    faults = 0

    for index, page in enumerate(references):
        clock = index + 1
        hit = next((frame for frame in frames if frame["page"] == page), None)
        if hit is not None:
            hit["lastUsed"] = clock
            hit["frequency"] += 1
            events.append(
                {
                    "index": index,
                    "page": page,
                    "hit": True,
                    "frame": hit["frame"],
                    "snapshot": [frame["page"] for frame in frames],
                    "action": f"页 {page} 命中页框 {hit['frame']}。",
                }
            )
            continue

        faults += 1
        empty = next((frame for frame in frames if frame["page"] is None), None)
        target = empty or choose_page_victim(frames, policy, index, references)
        evicted = target["page"]
        target.update({"page": page, "loadedAt": clock, "lastUsed": clock, "frequency": 1})
        events.append(
            {
                "index": index,
                "page": page,
                "hit": False,
                "frame": target["frame"],
                "evicted": evicted,
                "snapshot": [frame["page"] for frame in frames],
                "action": (
                    f"缺页：页 {page} 装入空页框 {target['frame']}。"
                    if evicted is None
                    else f"缺页：按 {policy.upper()} 置换页 {evicted}，装入页 {page}。"
                ),
            }
        )

    return {
        "references": references,
        "frameCount": frame_count,
        "policy": policy,
        "events": events,
        "faults": faults,
        "hits": len(references) - faults,
        "faultRate": faults / len(references),
        "frames": [{"frame": frame["frame"], "page": frame["page"]} for frame in frames],
    }


def simulate_virtual_memory(params: dict[str, Any]) -> dict[str, Any]:
    mode = params.get("mode", "paging")
    page_size = parse_integer(params.get("pageSize", params.get("page_size", 1024)))
    if not is_power_of_two(page_size):
        raise ValueError("页大小必须是 2 的幂")

    if mode == "segmentation":
        segment, offset = [parse_integer(item) for item in re.split(r"[:\s,]+", str(params.get("logicalAddress", "0:0")))[:2]]
        table = parse_segment_table(params.get("segmentTable", params.get("segment_table")))
        entry = next((item for item in table if item["segment"] == segment), None)
        if entry is None:
            raise ValueError(f"段 {segment} 不在段表中")
        valid = 0 <= offset < entry["limit"]
        physical_address = entry["base"] + offset if valid else None
        return {
            "mode": mode,
            "logicalAddress": f"{segment}:{offset}",
            "table": table,
            "valid": valid,
            "physicalAddress": physical_address,
            "explanation": (
                f"段 {segment} 基址 {entry['base']} + 段内偏移 {offset} = 物理地址 {physical_address}。"
                if valid
                else f"段内偏移 {offset} 超出段长 {entry['limit']}，发生越界。"
            ),
        }

    if mode == "segmented-paging":
        segment, page, offset = [
            parse_integer(item) for item in re.split(r"[:\s,]+", str(params.get("logicalAddress", "0:0:0")))[:3]
        ]
        table = parse_segment_page_table(params.get("segmentPageTable", params.get("segment_page_table")))
        entry = next((item for item in table if item["segment"] == segment and item["page"] == page), None)
        if entry is None:
            raise ValueError(f"段 {segment} 的页 {page} 不在段页表中")
        if offset < 0 or offset >= page_size:
            raise ValueError(f"页内偏移必须在 0 到 {page_size - 1} 之间")
        physical_address = entry["frame"] * page_size + offset
        return {
            "mode": mode,
            "logicalAddress": f"{segment}:{page}:{offset}",
            "table": table,
            "physicalAddress": physical_address,
            "explanation": (
                f"先查段 {segment} 的页表，再由页 {page} → 页框 {entry['frame']}，"
                f"物理地址 = {entry['frame']} × {page_size} + {offset} = {physical_address}。"
            ),
        }

    logical_address = parse_integer(params.get("logicalAddress", params.get("logical_address", 0)))
    page = logical_address // page_size
    offset = logical_address % page_size
    replacement = simulate_page_replacement(params.get("references"), params.get("frames"), params.get("replacement", "lru"))
    resident = next((frame for frame in replacement["frames"] if frame["page"] == page), None)
    return {
        "mode": "paging",
        "logicalAddress": logical_address,
        "page": page,
        "offset": offset,
        "pageSize": page_size,
        "physicalAddress": resident["frame"] * page_size + offset if resident else None,
        "residentFrame": resident["frame"] if resident else None,
        "replacement": replacement,
        "explanation": (
            f"逻辑地址 {logical_address} 拆为页号 {page}、页内偏移 {offset}；"
            f"页 {page} 当前在页框 {resident['frame']}，物理地址为 {resident['frame'] * page_size + offset}。"
            if resident
            else f"逻辑地址 {logical_address} 对应页 {page}，该页当前不在物理页框中，会触发缺页。"
        ),
    }


def clean_assembly_lines(program: str) -> list[str]:
    lines = []
    for raw in str(program or "").splitlines():
        line = re.sub(r"//.*$", "", raw)
        line = re.sub(r";.*$", "", line).strip()
        if line:
            lines.append(line)
    return lines


def tokenize_instruction(line: str) -> list[str]:
    return [token for token in re.sub(r"[,()]", " ", line).strip().split() if token]


def is_register(token: str) -> bool:
    return bool(re.match(r"^x([0-9]|[12][0-9]|3[01])$", token, re.I)) or bool(
        re.match(r"^r([0-9]|1[0-5])$", token, re.I)
    )


def normalize_register_name(name: str) -> str:
    text = str(name or "").strip()
    if text.lower().startswith("x"):
        return text.lower()
    if text.lower().startswith("r"):
        return text.upper()
    return text


def parse_immediate(token: str) -> int:
    return parse_integer(str(token or "").replace("#", "", 1))


def create_registers() -> dict[str, int]:
    registers = {f"x{index}": 0 for index in range(32)}
    registers.update({f"R{index}": 0 for index in range(16)})
    return registers


def read_register(registers: dict[str, int], name: str) -> int:
    return registers.get(normalize_register_name(name), 0)


def write_register(registers: dict[str, int], name: str, value: int) -> None:
    key = normalize_register_name(name)
    if key == "x0":
        registers["x0"] = 0
        return
    registers[key] = value


def instruction_meta(line: str) -> dict[str, Any]:
    tokens = tokenize_instruction(line)
    op = normalize(tokens[0]) if tokens else ""
    args = tokens[1:]
    reads: list[str] = []
    writes: list[str] = []
    inst_type = "unknown"

    if op in {"add", "sub"} and len(args) >= 3:
        inst_type = "R"
        writes.append(normalize_register_name(args[0]))
        if is_register(args[1]):
            reads.append(normalize_register_name(args[1]))
        if is_register(args[2]):
            reads.append(normalize_register_name(args[2]))
    elif op == "addi" and len(args) >= 3:
        inst_type = "I"
        writes.append(normalize_register_name(args[0]))
        if is_register(args[1]):
            reads.append(normalize_register_name(args[1]))
    elif op == "lw" and len(args) >= 3:
        inst_type = "I/load"
        writes.append(normalize_register_name(args[0]))
        if is_register(args[2]):
            reads.append(normalize_register_name(args[2]))
    elif op == "sw" and len(args) >= 3:
        inst_type = "S/store"
        if is_register(args[0]):
            reads.append(normalize_register_name(args[0]))
        if is_register(args[2]):
            reads.append(normalize_register_name(args[2]))
    elif op == "mov" and len(args) >= 2:
        inst_type = "pseudo"
        writes.append(normalize_register_name(args[0]))
        if is_register(args[1]):
            reads.append(normalize_register_name(args[1]))
    elif op == "li" and len(args) >= 2:
        inst_type = "pseudo"
        writes.append(normalize_register_name(args[0]))

    return {
        "raw": line,
        "op": op,
        "args": args,
        "type": inst_type,
        "reads": sorted(set(reads)),
        "writes": sorted({name for name in writes if name != "x0"}),
    }


def parse_assembly(program: str) -> list[dict[str, Any]]:
    instructions = []
    for index, line in enumerate(clean_assembly_lines(program)):
        meta = instruction_meta(line)
        instructions.append(
            {
                "index": index,
                "address": index * 4,
                "raw": line,
                "op": meta["op"],
                "type": meta["type"],
                "reads": meta["reads"],
                "writes": meta["writes"],
                "args": meta["args"],
                "supported": meta["type"] != "unknown",
            }
        )
    return instructions


def execute_assembly(program: str) -> dict[str, Any]:
    instructions = parse_assembly(program)
    registers = create_registers()
    memory: dict[int, int] = {}
    steps = []
    pc = 0

    for instruction in instructions:
        before_registers = registers.copy()
        before_memory = memory.copy()
        op = instruction["op"]
        args = instruction["args"]
        step = {
            "index": instruction["index"],
            "pcBefore": pc,
            "pcAfter": pc + 4,
            "raw": instruction["raw"],
            "op": op,
            "type": instruction["type"],
            "reads": instruction["reads"],
            "writes": instruction["writes"],
            "registerDiff": {},
            "memoryDiff": {},
            "explanation": "",
            "error": None,
        }

        try:
            if not instruction["supported"]:
                raise ValueError(f"暂不支持指令：{instruction['raw']}")

            if op == "mov":
                dest, source = args[0], args[1]
                value = read_register(registers, source) if is_register(source) else parse_immediate(source)
                write_register(registers, dest, value)
                source_text = normalize_register_name(source) if is_register(source) else "立即数"
                step["explanation"] = f"{normalize_register_name(dest)} 写入 {source_text} {value}。"
            elif op == "li":
                dest, imm = args[0], parse_immediate(args[1])
                write_register(registers, dest, imm)
                step["explanation"] = f"{normalize_register_name(dest)} 写入立即数 {imm}。"
            elif op in {"add", "sub"}:
                dest, left_reg, right_reg = args[0], args[1], args[2]
                left = read_register(registers, left_reg)
                right = read_register(registers, right_reg)
                value = left + right if op == "add" else left - right
                write_register(registers, dest, value)
                symbol = "+" if op == "add" else "-"
                step["explanation"] = (
                    f"{normalize_register_name(dest)} = {normalize_register_name(left_reg)} {symbol} "
                    f"{normalize_register_name(right_reg)} = {value}。"
                )
            elif op == "addi":
                dest, left_reg, imm_token = args[0], args[1], args[2]
                left = read_register(registers, left_reg)
                imm = parse_immediate(imm_token)
                value = left + imm
                write_register(registers, dest, value)
                step["explanation"] = f"{normalize_register_name(dest)} = {normalize_register_name(left_reg)} + {imm} = {value}。"
            elif op == "lw":
                dest, offset_token, base_reg = args[0], args[1], args[2]
                offset = parse_immediate(offset_token)
                address = read_register(registers, base_reg) + offset
                value = memory.get(address, 0)
                write_register(registers, dest, value)
                step["explanation"] = (
                    f"有效地址 = {normalize_register_name(base_reg)} + {offset} = {address}，"
                    f"从内存读取 {value} 写入 {normalize_register_name(dest)}。"
                )
            elif op == "sw":
                source_reg, offset_token, base_reg = args[0], args[1], args[2]
                offset = parse_immediate(offset_token)
                address = read_register(registers, base_reg) + offset
                value = read_register(registers, source_reg)
                memory[address] = value
                step["explanation"] = (
                    f"有效地址 = {normalize_register_name(base_reg)} + {offset} = {address}，"
                    f"把 {normalize_register_name(source_reg)} 的值 {value} 写入内存。"
                )
        except Exception as error:  # Keep execution trace educational instead of aborting the whole program.
            step["error"] = str(error)
            step["explanation"] = str(error)

        for name, value in registers.items():
            if value != before_registers.get(name):
                step["registerDiff"][name] = {"before": before_registers.get(name, 0), "after": value}
        for address, value in memory.items():
            if value != before_memory.get(address):
                step["memoryDiff"][str(address)] = {"before": before_memory.get(address, 0), "after": value}

        registers["x0"] = 0
        pc += 4
        steps.append(step)

    return {
        "instructions": instructions,
        "steps": steps,
        "finalRegisters": registers,
        "finalMemory": {str(address): value for address, value in memory.items()},
    }


def has_intersection(left: list[str], right: list[str]) -> bool:
    left_set = set(left)
    return any(item in left_set for item in right)


def simulate_pipeline(program: str, options: dict[str, Any] | None = None) -> dict[str, Any]:
    forwarding = True if options is None else options.get("forwarding", True) is not False
    instructions = [item for item in parse_assembly(program) if item["raw"]]
    rows = []
    hazards = []
    global_delay = 0

    for index, instruction in enumerate(instructions):
        stall = 0
        if index > 0:
            previous = instruction_meta(instructions[index - 1]["raw"])
            current = instruction_meta(instruction["raw"])
            raw_conflict = has_intersection(previous["writes"], current["reads"])
            if raw_conflict and previous["op"] == "lw":
                stall = 1
                hazards.append(
                    {
                        "type": "load-use",
                        "instruction": instruction["raw"],
                        "dependsOn": instructions[index - 1]["raw"],
                        "cycles": 1,
                        "description": "后一条指令在 EX 阶段需要 load 指令的数据，需要插入 1 个暂停周期。",
                    }
                )
            elif raw_conflict and not forwarding:
                stall = 2
                hazards.append(
                    {
                        "type": "RAW",
                        "instruction": instruction["raw"],
                        "dependsOn": instructions[index - 1]["raw"],
                        "cycles": 2,
                        "description": "未开启转发时，需要等待前一条指令写回结果。",
                    }
                )
            elif raw_conflict:
                hazards.append(
                    {
                        "type": "RAW-forwarded",
                        "instruction": instruction["raw"],
                        "dependsOn": instructions[index - 1]["raw"],
                        "cycles": 0,
                        "description": "存在 RAW 相关，但可以通过转发解决，不插入暂停。",
                    }
                )

        start = index + global_delay
        cells: list[str] = [""] * (start + 5 + stall)
        cells[start] = "IF"
        cells[start + 1] = "ID"
        for wait in range(stall):
            cells[start + 2 + wait] = "STALL"
        cells[start + 2 + stall] = "EX"
        cells[start + 3 + stall] = "MEM"
        cells[start + 4 + stall] = "WB"
        rows.append({"raw": instruction["raw"], "cells": cells, "stall": stall})
        global_delay += stall

    cycle_count = max((len(row["cells"]) for row in rows), default=0)
    timeline = [
        {
            "instruction": row["raw"],
            "cells": row["cells"] + [""] * (cycle_count - len(row["cells"])),
            "stall": row["stall"],
        }
        for row in rows
    ]

    return {
        "stages": PIPELINE_STAGES,
        "cycleCount": cycle_count,
        "timeline": timeline,
        "hazards": hazards,
        "forwarding": forwarding,
    }


def assembly_snapshot(program: str, cursor: int) -> dict[str, Any]:
    execution = execute_assembly(program)
    registers = create_registers()
    memory: dict[str, int] = {}
    changed: list[str] = []
    max_cursor = len(execution["steps"]) - 1
    safe_cursor = max(-1, min(cursor, max_cursor))

    for step in execution["steps"][: safe_cursor + 1]:
        for name, diff in step["registerDiff"].items():
            registers[name] = diff["after"]
        for address, diff in step["memoryDiff"].items():
            memory[address] = diff["after"]

    if safe_cursor >= 0 and execution["steps"]:
        changed = sorted(execution["steps"][safe_cursor]["registerDiff"].keys())
    registers["x0"] = 0

    return {
        "cursor": safe_cursor,
        "totalSteps": len(execution["steps"]),
        "activeStep": execution["steps"][safe_cursor] if safe_cursor >= 0 and execution["steps"] else None,
        "registers": registers,
        "memory": memory,
        "changedRegisters": changed,
        "execution": execution,
    }


def diagnose_practice(question_id: str, answer: str) -> dict[str, Any]:
    question = next((item for item in DIAGNOSTIC_QUESTIONS if item["id"] == question_id), DIAGNOSTIC_QUESTIONS[0])
    normalized_answer = normalize(answer)
    expected = normalize(question["expected"])
    correct = expected in normalized_answer

    return {
        "question": deepcopy(question),
        "correct": correct,
        "score": 1 if correct else 0.4,
        "firstError": "无关键错误" if correct else "答案没有命中本题的核心规则",
        "feedback": "判断正确。可以继续挑战同知识点的变式题。" if correct else question["hint"],
        "recommendation": question["recommendation"],
    }


def dispatch_agent(payload: dict[str, Any]) -> dict[str, Any]:
    """A small deterministic router for the first backend iteration."""
    message = str(payload.get("message") or payload.get("question") or "")
    lowered = normalize(message)

    if any(keyword in lowered for keyword in ["ieee", "754", "浮点"]):
        return {
            "intent": "float_help",
            "answer": answer_question(message, "data", payload.get("mode", "standard")),
            "tool": "simulate_ieee754_operation",
        }
    if any(keyword in lowered for keyword in ["虚存", "虚拟存储", "页表", "段表", "段页", "页面置换"]):
        return {
            "intent": "virtual_memory_help",
            "answer": answer_question(message, "memory", payload.get("mode", "standard")),
            "tool": "simulate_virtual_memory",
        }
    if any(keyword in lowered for keyword in ["定点", "乘法", "除法", "multiply", "divide"]):
        return {
            "intent": "fixed_point_help",
            "answer": answer_question(message, "alu", payload.get("mode", "standard")),
            "tool": "simulate_fixed_point_operation",
        }
    if any(keyword in lowered for keyword in ["cache", "缓存", "地址划分", "直接映射", "组相联", "全相联", "lru", "fifo", "lfu"]):
        return {
            "intent": "cache_help",
            "answer": answer_question(message, "memory", payload.get("mode", "standard")),
            "tool": "simulate_cache_address",
        }
    if any(keyword in lowered for keyword in ["流水线", "pipeline", "冒险", "raw"]):
        return {
            "intent": "pipeline_help",
            "answer": answer_question(message, "cpu", payload.get("mode", "standard")),
            "tool": "simulate_pipeline",
        }
    if any(keyword in lowered for keyword in ["汇编", "risc-v", "addi", "lw", "sw", "mov"]):
        return {
            "intent": "assembly_help",
            "answer": answer_question(message, "isa", payload.get("mode", "standard")),
            "tool": "execute_assembly",
        }
    if any(keyword in lowered for keyword in ["补码", "two", "complement", "溢出"]):
        return {
            "intent": "twos_complement_help",
            "answer": answer_question(message, "data", payload.get("mode", "standard")),
            "tool": "simulate_twos_complement_add",
        }

    return {
        "intent": "qa",
        "answer": answer_question(message, payload.get("chapterId", "all"), payload.get("mode", "standard")),
        "tool": None,
    }
