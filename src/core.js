(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CompOrgCore = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PIPELINE_STAGES = ["IF", "ID", "EX", "MEM", "WB"];
  const DEFAULT_CACHE_CONFIG = Object.freeze({
    addressBits: 6,
    lines: 4,
    blockSize: 4,
    associativity: 2,
  });
  const DATAPATH_STAGES = [
    { id: "IF", name: "取指" },
    { id: "ID", name: "译码" },
    { id: "EX", name: "执行" },
    { id: "MEM", name: "访存" },
    { id: "WB", name: "写回" },
  ];

  const chapters = [
    {
      id: "data",
      title: "数据表示",
      description: "原码、反码、补码、浮点数与溢出判断。",
      progress: 72,
    },
    {
      id: "alu",
      title: "运算器",
      description: "ALU、定点加减法、乘除法与标志位。",
      progress: 58,
    },
    {
      id: "isa",
      title: "指令系统",
      description: "指令格式、寻址方式与汇编语义。",
      progress: 64,
    },
    {
      id: "cpu",
      title: "CPU 与流水线",
      description: "数据通路、控制信号、冒险与转发。",
      progress: 46,
    },
    {
      id: "memory",
      title: "存储系统",
      description: "Cache 映射、地址划分、命中率与虚拟存储。",
      progress: 52,
    },
  ];

  const knowledgeBase = [
    {
      id: "twos_complement",
      chapterId: "data",
      title: "补码为什么能统一加减法",
      keywords: ["补码", "减法", "加法", "负数", "溢出", "two"],
      summary: "补码把负数表示成模意义下的等价正数，因此减法可以转化为加上另一个数的补码。",
      explanation:
        "在 n 位机器中，所有结果都按 2^n 取模。-x 的补码等价于 2^n - x，所以 a - b 可以写成 a + (2^n - b)。硬件只需要一个加法器，超出 n 位的进位会被丢弃。",
      example:
        "8 位下，+5 是 00000101，-3 是 11111101。二者相加得到 00000010，即十进制 +2。",
      commonMistakes: ["把最高位进位当成有符号溢出", "忘记结果仍然要截断到固定位数"],
      checkQuestion: "如果 8 位补码中 127 + 1 的结果是什么？为什么发生溢出？",
      followups: ["演示补码加法", "讲溢出判断", "出一道补码题"],
    },
    {
      id: "ieee754_float",
      chapterId: "data",
      title: "IEEE 754 浮点数加减法",
      keywords: ["IEEE", "754", "浮点", "单精度", "阶码", "尾数", "对阶", "规格化"],
      summary: "IEEE 754 加减法先拆分符号、阶码和尾数，再对阶、尾数运算、规格化并舍入。",
      explanation:
        "浮点加减不能直接把 32 位编码相加，而要先比较阶码，把阶码较小的尾数右移到同一阶，再按符号做尾数加减。结果需要规格化，最后按目标精度舍入。",
      example: "1.5 + (-0.25) 的单精度结果是 1.25，对应编码 00111111101000000000000000000000。",
      commonMistakes: ["把浮点编码当整数直接相加", "忘记减法可以转为加上相反数", "忽略舍入误差"],
      checkQuestion: "为什么浮点加法前通常需要对阶？",
      followups: ["运行 IEEE 754 仿真", "讲对阶过程", "解释规格化"],
    },
    {
      id: "cache_mapping",
      chapterId: "memory",
      title: "Cache 映射与替换",
      keywords: ["cache", "Cache", "缓存", "直接映射", "组相联", "全相联", "替换", "LRU", "FIFO", "LFU", "地址", "命中", "tag", "index"],
      summary: "Cache 映射决定主存块能放到哪些行，替换算法决定冲突时换出哪一行。",
      explanation:
        "块内偏移由块大小决定；直接映射只有一个候选行，组相联映射在某一组内选择一路，全相联可放入任意行。发生冲突时，可用 LRU、FIFO、LFU 等策略选择牺牲行。",
      example:
        "16 行 Cache、块大小 4B 时，Offset 为 2 位，Index 为 4 位，Tag 为地址剩余高位。",
      commonMistakes: ["用主存块数计算 Index 位数", "把块内偏移和 Cache 行号混淆"],
      checkQuestion: "块大小从 4B 变为 16B 时，Offset 位数会怎样变化？",
      followups: ["运行 Cache 仿真", "比较直接映射和组相联", "出一道地址划分题"],
    },
    {
      id: "virtual_memory",
      chapterId: "memory",
      title: "虚拟存储映射与页面置换",
      keywords: ["虚存", "虚拟存储", "页表", "段表", "段页式", "页面置换", "缺页", "页框", "LRU", "OPT"],
      summary: "虚拟存储把逻辑地址转换为物理地址，并在页不在内存时通过页面置换处理缺页。",
      explanation:
        "页式存储把地址拆成页号和页内偏移，段式存储先检查段号和段内偏移，段页式先查段表再查页表。页面置换算法用于物理页框不足时选择换出的页面。",
      example: "页大小 1024B 时，逻辑地址 2052 可拆为页号 2、页内偏移 4。",
      commonMistakes: ["把页号当成页框号", "忘记段式存储需要越界检查", "混淆缺页和地址越界"],
      checkQuestion: "页式地址转换中，页内偏移为什么不参与页表查找？",
      followups: ["运行虚存仿真", "比较页表和段表", "讲页面置换算法"],
    },
    {
      id: "pipeline_hazard",
      chapterId: "cpu",
      title: "流水线数据冒险与转发",
      keywords: ["流水线", "冒险", "RAW", "转发", "暂停", "load-use", "IF", "ID", "EX"],
      summary: "流水线冒险来自指令重叠执行时的资源、数据或控制冲突，其中 RAW 是最常见的数据冒险。",
      explanation:
        "当后一条指令需要读取前一条尚未写回的结果时，会出现 RAW 数据冒险。ALU 指令之间通常可通过转发解决，但 load-use 冒险常需要插入一个停顿周期。",
      example:
        "lw x1, 0(x2) 后紧跟 add x3, x1, x4，add 在 EX 阶段需要 x1，但 lw 的数据到 MEM 后才可用，因此需要停顿。",
      commonMistakes: ["只看相邻指令而忽略读写寄存器", "认为所有数据冒险都能零停顿转发"],
      checkQuestion: "add x1, x2, x3 后接 sub x4, x1, x5，在开启转发时是否必须停顿？",
      followups: ["生成流水线表", "解释 load-use", "出一道冒险分析题"],
    },
    {
      id: "instruction_format",
      chapterId: "isa",
      title: "RISC-V 指令格式与逐步执行",
      keywords: ["RISC-V", "汇编", "指令", "寄存器", "addi", "add", "lw", "sw", "寻址"],
      summary: "汇编指令可以从读寄存器、运算、访存、写寄存器四个角度逐步解释。",
      explanation:
        "例如 addi x1, x0, 5 读取 x0 和立即数 5，在 ALU 中相加，然后把结果写回 x1。load/store 指令还需要先计算有效地址。",
      example:
        "sw x3, 0(x0) 表示把 x3 的值写入地址 x0 + 0 对应的内存位置。",
      commonMistakes: ["把 sw 的第一个寄存器当成目的寄存器", "忽略 x0 恒为 0"],
      checkQuestion: "lw x5, 8(x2) 中，哪一个寄存器被写入？有效地址如何计算？",
      followups: ["解释一段汇编", "查看寄存器变化", "讲 load/store"],
    },
    {
      id: "datapath",
      chapterId: "cpu",
      title: "单周期 CPU 数据通路",
      keywords: ["数据通路", "控制信号", "PC", "ALU", "寄存器堆", "CPU"],
      summary: "数据通路描述指令执行时数据经过哪些硬件部件，控制信号决定每个多路选择器和写使能的状态。",
      explanation:
        "一条指令通常经历取指、译码、执行、访存、写回等动作。即使在单周期 CPU 中，这些动作也在一个时钟周期内沿着数据通路组合完成。",
      example:
        "add 指令会读取两个源寄存器，经 ALU 相加，再把结果写回目的寄存器，不访问数据存储器。",
      commonMistakes: ["把指令存储器和数据存储器混为一谈", "只记控制信号表而不理解数据流向"],
      checkQuestion: "为什么 sw 指令需要写数据存储器，但不需要写寄存器堆？",
      followups: ["讲 add 数据通路", "讲 lw 数据通路", "生成控制信号表"],
    },
  ];

  const diagnosticQuestions = [
    {
      id: "overflow_8bit",
      title: "8 位补码中 127 + 1 是否溢出？",
      expected: "溢出",
      topic: "twos_complement",
      hint: "两个正数相加得到负数，说明超出 8 位补码可表示范围。",
      recommendation: "继续练习补码范围和符号位溢出判断。",
    },
    {
      id: "cache_offset",
      title: "块大小 16B 时，块内偏移需要几位？",
      expected: "4",
      topic: "cache_mapping",
      hint: "块内偏移位数等于 log2(块大小)。",
      recommendation: "继续练习 Cache 地址拆分。",
    },
    {
      id: "sw_semantics",
      title: "sw x3, 0(x0) 会写哪个寄存器？",
      expected: "不写寄存器",
      topic: "instruction_format",
      hint: "store 指令把寄存器值写入内存，不写回寄存器堆。",
      recommendation: "继续练习 load/store 指令语义。",
    },
  ];

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function parseInteger(value) {
    if (typeof value === "number") {
      return value;
    }
    const text = String(value || "").trim();
    if (/^[-+]?0x[0-9a-f]+$/i.test(text)) {
      return Number.parseInt(text, 16);
    }
    if (/^[-+]?0b[01]+$/i.test(text)) {
      const sign = text.startsWith("-") ? -1 : 1;
      return sign * Number.parseInt(text.replace(/^[-+]?0b/i, ""), 2);
    }
    return Number.parseInt(text, 10);
  }

  function isPowerOfTwo(value) {
    return Number.isInteger(value) && value > 0 && (value & (value - 1)) === 0;
  }

  function assertInteger(value, label) {
    if (!Number.isInteger(value)) {
      throw new Error(`${label} 必须是整数`);
    }
  }

  function toUnsigned(value, bits) {
    const mod = 2 ** bits;
    return ((value % mod) + mod) % mod;
  }

  function toBinaryUnsigned(value, bits) {
    const unsigned = toUnsigned(value, bits);
    return unsigned.toString(2).padStart(bits, "0").slice(-bits);
  }

  function fromUnsigned(unsigned, bits) {
    const signBit = 2 ** (bits - 1);
    const mod = 2 ** bits;
    return unsigned >= signBit ? unsigned - mod : unsigned;
  }

  function answerQuestion(question, chapterId, mode) {
    const query = normalize(question);
    const selectedChapter = chapterId && chapterId !== "all" ? chapterId : null;
    const modeName = mode || "standard";
    const scored = knowledgeBase
      .filter((item) => !selectedChapter || item.chapterId === selectedChapter)
      .map((item) => {
        const score = item.keywords.reduce((sum, keyword) => {
          return sum + (query.includes(normalize(keyword)) ? 3 : 0);
        }, 0) + (query.includes(normalize(item.title)) ? 5 : 0);
        return { item, score };
      })
      .sort((a, b) => b.score - a.score);

    const best = scored[0] && scored[0].score > 0
      ? scored[0].item
      : knowledgeBase.find((item) => item.chapterId === selectedChapter) || knowledgeBase[0];

    const modeNotes = {
      beginner: "入门视角：先抓住直觉，再看一个最小例子。",
      standard: "标准视角：按定义、规则、例题和误区组织答案。",
      exam: "考试视角：重点关注判定条件、公式和易错点。",
      lab: "实验视角：重点关注硬件状态、寄存器变化和实现边界。",
    };

    return {
      title: best.title,
      summary: best.summary,
      explanation: best.explanation,
      example: best.example,
      commonMistakes: best.commonMistakes,
      checkQuestion: best.checkQuestion,
      followups: best.followups,
      modeNote: modeNotes[modeName] || modeNotes.standard,
      knowledgePointId: best.id,
      chapterId: best.chapterId,
      matched: scored[0] ? scored[0].score > 0 : false,
    };
  }

  function simulateTwosComplementAdd(xValue, yValue, bitsValue) {
    const x = parseInteger(xValue);
    const y = parseInteger(yValue);
    const bits = parseInteger(bitsValue);

    assertInteger(x, "x");
    assertInteger(y, "y");
    assertInteger(bits, "位数");

    if (bits < 2 || bits > 24) {
      throw new Error("位数建议在 2 到 24 之间，以保证页面展示清晰");
    }

    const min = -(2 ** (bits - 1));
    const max = 2 ** (bits - 1) - 1;
    if (x < min || x > max || y < min || y > max) {
      throw new Error(`${bits} 位补码可表示范围是 ${min} 到 ${max}`);
    }

    const xUnsigned = toUnsigned(x, bits);
    const yUnsigned = toUnsigned(y, bits);
    const sumUnsigned = (xUnsigned + yUnsigned) % (2 ** bits);
    const result = fromUnsigned(sumUnsigned, bits);
    const raw = x + y;
    const overflow = raw < min || raw > max;
    const steps = [];
    let carry = 0;

    for (let pos = 0; pos < bits; pos += 1) {
      const xBit = Math.floor(xUnsigned / (2 ** pos)) % 2;
      const yBit = Math.floor(yUnsigned / (2 ** pos)) % 2;
      const total = xBit + yBit + carry;
      const sumBit = total % 2;
      const carryOut = total >= 2 ? 1 : 0;
      steps.push({
        position: pos,
        xBit,
        yBit,
        carryIn: carry,
        sumBit,
        carryOut,
      });
      carry = carryOut;
    }

    return {
      x,
      y,
      bits,
      range: { min, max },
      xBinary: toBinaryUnsigned(x, bits),
      yBinary: toBinaryUnsigned(y, bits),
      sumBinary: toBinaryUnsigned(sumUnsigned, bits),
      result,
      raw,
      overflow,
      carryOut: carry,
      steps: steps.reverse(),
      explanation: overflow
        ? `数学结果 ${raw} 超出 ${bits} 位补码范围，因此发生溢出。`
        : `结果仍在 ${bits} 位补码范围内，机器结果 ${result} 与数学结果一致。`,
    };
  }

  function assertSignedRange(value, bits, label) {
    const min = -(2 ** (bits - 1));
    const max = 2 ** (bits - 1) - 1;
    if (value < min || value > max) {
      throw new Error(`${label} 超出 ${bits} 位补码范围：${min} 到 ${max}`);
    }
    return { min, max };
  }

  function simulateFixedPointMultiply(xValue, yValue, bitsValue) {
    const x = parseInteger(xValue);
    const y = parseInteger(yValue);
    const bits = parseInteger(bitsValue);
    assertInteger(x, "x");
    assertInteger(y, "y");
    assertInteger(bits, "位数");
    if (bits < 2 || bits > 16) {
      throw new Error("乘法位数建议在 2 到 16 之间，便于展示双倍位宽乘积");
    }

    const range = assertSignedRange(x, bits, "x");
    assertSignedRange(y, bits, "y");
    const raw = x * y;
    const productBits = bits * 2;
    const lowResult = fromUnsigned(toUnsigned(raw, bits), bits);
    const overflow = raw < range.min || raw > range.max;
    const sign = raw < 0 ? -1 : 1;
    const absX = Math.abs(x);
    const absY = Math.abs(y);
    const partials = [];
    for (let pos = 0; pos < bits; pos += 1) {
      const bit = (absY >> pos) & 1;
      partials.push({
        position: pos,
        multiplierBit: bit,
        partialValue: bit ? absX << pos : 0,
        partialBinary: toBinaryUnsigned(bit ? absX << pos : 0, productBits),
      });
    }

    return {
      operation: "multiply",
      x,
      y,
      bits,
      productBits,
      raw,
      result: lowResult,
      overflow,
      xBinary: toBinaryUnsigned(x, bits),
      yBinary: toBinaryUnsigned(y, bits),
      productBinary: toBinaryUnsigned(raw, productBits),
      truncatedBinary: toBinaryUnsigned(raw, bits),
      partials,
      explanation: overflow
        ? `数学乘积 ${raw} 超出 ${bits} 位补码范围，低 ${bits} 位机器结果为 ${lowResult}。`
        : `数学乘积 ${raw} 可由 ${bits} 位补码表示，机器结果为 ${lowResult}。`,
      signExplanation: `符号由两个操作数符号异或决定：结果为${sign < 0 ? "负" : "非负"}。`,
    };
  }

  function simulateFixedPointDivide(xValue, yValue, bitsValue) {
    const x = parseInteger(xValue);
    const y = parseInteger(yValue);
    const bits = parseInteger(bitsValue);
    assertInteger(x, "x");
    assertInteger(y, "y");
    assertInteger(bits, "位数");
    if (bits < 2 || bits > 16) {
      throw new Error("除法位数建议在 2 到 16 之间，便于展示步骤");
    }
    if (y === 0) {
      throw new Error("除数不能为 0");
    }

    const range = assertSignedRange(x, bits, "x");
    assertSignedRange(y, bits, "y");
    const quotient = Math.trunc(x / y);
    const remainder = x - quotient * y;
    const overflow = quotient < range.min || quotient > range.max;
    const absDividend = Math.abs(x);
    const absDivisor = Math.abs(y);
    const steps = [];
    let current = 0;
    for (let pos = bits - 1; pos >= 0; pos -= 1) {
      current = current * 2 + ((absDividend >> pos) & 1);
      const qBit = current >= absDivisor ? 1 : 0;
      if (qBit) current -= absDivisor;
      steps.push({
        position: pos,
        shiftedRemainder: current,
        quotientBit: qBit,
      });
    }

    return {
      operation: "divide",
      x,
      y,
      bits,
      quotient,
      remainder,
      overflow,
      xBinary: toBinaryUnsigned(x, bits),
      yBinary: toBinaryUnsigned(y, bits),
      quotientBinary: toBinaryUnsigned(quotient, bits),
      remainderBinary: toBinaryUnsigned(remainder, bits),
      steps,
      explanation: overflow
        ? `商 ${quotient} 超出 ${bits} 位补码范围，发生除法溢出。`
        : `商为 ${quotient}，余数为 ${remainder}，满足 ${x} = ${quotient} × ${y} + ${remainder}。`,
    };
  }

  function simulateFixedPointOperation(params) {
    const op = params.operation || "add";
    if (op === "multiply") {
      return simulateFixedPointMultiply(params.x, params.y, params.bits);
    }
    if (op === "divide") {
      return simulateFixedPointDivide(params.x, params.y, params.bits);
    }
    return { operation: "add", ...simulateTwosComplementAdd(params.x, params.y, params.bits) };
  }

  function float32Bits(value) {
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    view.setFloat32(0, Math.fround(value), false);
    return view.getUint32(0, false);
  }

  function decodeFloat32(value) {
    const rounded = Math.fround(value);
    const bits = float32Bits(rounded);
    const sign = bits >>> 31;
    const exponentRaw = (bits >>> 23) & 0xff;
    const fraction = bits & 0x7fffff;
    const exponent = exponentRaw === 0 ? -126 : exponentRaw - 127;
    const category = exponentRaw === 0xff
      ? (fraction === 0 ? "infinity" : "nan")
      : exponentRaw === 0
        ? (fraction === 0 ? "zero" : "subnormal")
        : "normal";
    return {
      value: rounded,
      bits,
      binary: bits.toString(2).padStart(32, "0"),
      sign,
      exponentRaw,
      exponent,
      fraction,
      fractionBinary: fraction.toString(2).padStart(23, "0"),
      category,
    };
  }

  function simulateIeee754Operation(aValue, bValue, operationValue) {
    const a = Number.parseFloat(aValue);
    const b = Number.parseFloat(bValue);
    const operation = operationValue || "add";
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      throw new Error("请输入有限十进制浮点数");
    }

    const left = decodeFloat32(a);
    const right = decodeFloat32(b);
    const signedRight = operation === "subtract" ? decodeFloat32(-b) : right;
    const rawResult = operation === "subtract" ? Math.fround(Math.fround(a) - Math.fround(b)) : Math.fround(Math.fround(a) + Math.fround(b));
    const result = decodeFloat32(rawResult);
    const exponentDelta = left.exponent - signedRight.exponent;
    const alignedOperand = exponentDelta >= 0 ? "右操作数尾数右移" : "左操作数尾数右移";

    return {
      operation,
      a,
      b,
      left,
      right,
      effectiveRight: signedRight,
      result,
      resultValue: rawResult,
      steps: [
        `拆分 IEEE 754 单精度：符号位、8 位阶码、23 位尾数。`,
        `对阶：阶码差为 ${Math.abs(exponentDelta)}，${alignedOperand}。`,
        operation === "subtract" ? "减法转化为加上第二个操作数的相反数。" : "尾数按符号执行加法。",
        "规格化并按单精度舍入，得到最终 32 位结果。",
      ],
      explanation: `单精度结果为 ${rawResult}，二进制编码为 ${result.binary}。`,
    };
  }

  function simulateCacheAddress(params) {
    const address = parseInteger(params.address);
    const addressBits = parseInteger(params.addressBits ?? DEFAULT_CACHE_CONFIG.addressBits);
    const lines = parseInteger(params.lines ?? DEFAULT_CACHE_CONFIG.lines);
    const blockSize = parseInteger(params.blockSize ?? DEFAULT_CACHE_CONFIG.blockSize);

    assertInteger(address, "地址");
    assertInteger(addressBits, "地址位数");
    assertInteger(lines, "Cache 行数");
    assertInteger(blockSize, "块大小");

    if (address < 0) {
      throw new Error("地址不能为负数");
    }
    if (!isPowerOfTwo(lines)) {
      throw new Error("Cache 行数必须是 2 的幂");
    }
    if (!isPowerOfTwo(blockSize)) {
      throw new Error("块大小必须是 2 的幂");
    }
    if (addressBits < 4 || addressBits > 32) {
      throw new Error("地址位数建议在 4 到 32 之间");
    }
    if (address >= 2 ** addressBits) {
      throw new Error(`地址超出 ${addressBits} 位地址空间`);
    }

    const offsetBits = Math.log2(blockSize);
    const indexBits = Math.log2(lines);
    const tagBits = addressBits - offsetBits - indexBits;
    if (tagBits < 0) {
      throw new Error("地址位数不足，无法容纳 tag、index 和 offset");
    }

    const fullBinary = toBinaryUnsigned(address, addressBits);
    const offset = address % blockSize;
    const blockNumber = Math.floor(address / blockSize);
    const index = blockNumber % lines;
    const tag = Math.floor(blockNumber / lines);
    const tagBinary = tagBits > 0 ? fullBinary.slice(0, tagBits) : "";
    const indexBinary = indexBits > 0 ? fullBinary.slice(tagBits, tagBits + indexBits) : "";
    const offsetBinary = offsetBits > 0 ? fullBinary.slice(tagBits + indexBits) : "";
    const rows = Array.from({ length: lines }, (_, line) => ({
      line,
      active: line === index,
      valid: line === index,
      tag: line === index ? (tagBinary || "0") : "-",
      block: line === index ? blockNumber : "-",
      offset: line === index ? offset : "-",
    }));

    return {
      address,
      addressHex: `0x${address.toString(16).toUpperCase()}`,
      addressBits,
      lines,
      blockSize,
      offsetBits,
      indexBits,
      tagBits,
      fullBinary,
      offset,
      index,
      tag,
      tagBinary,
      indexBinary,
      offsetBinary,
      blockNumber,
      rows,
      explanation: `块大小 ${blockSize}B 决定 offset 为 ${offsetBits} 位，${lines} 行 Cache 决定 index 为 ${indexBits} 位，剩余 ${tagBits} 位作为 tag。`,
    };
  }

  function parseAddressList(value) {
    return String(value || "")
      .split(/[\s,;]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map(parseInteger);
  }

  function chooseCacheVictim(lines, policy, clock) {
    if (policy === "fifo") {
      return lines.reduce((best, line) => line.insertedAt < best.insertedAt ? line : best, lines[0]);
    }
    if (policy === "lfu") {
      return lines.reduce((best, line) => {
        if (line.frequency !== best.frequency) return line.frequency < best.frequency ? line : best;
        return line.lastUsed < best.lastUsed ? line : best;
      }, lines[0]);
    }
    if (policy === "random") {
      return lines[clock % lines.length];
    }
    return lines.reduce((best, line) => line.lastUsed < best.lastUsed ? line : best, lines[0]);
  }

  function snapshotCacheRows(sets) {
    return sets.flatMap((set) => set.lines.map((line) => ({
      set: set.setIndex,
      way: line.way,
      valid: line.valid,
      tag: line.valid ? line.tag : "-",
      block: line.valid ? line.block : "-",
      frequency: line.frequency,
      lastUsed: line.lastUsed,
    })));
  }

  function simulateCacheSystem(params) {
    const accesses = parseAddressList(params.accesses || params.address);
    const addressBits = parseInteger(params.addressBits ?? DEFAULT_CACHE_CONFIG.addressBits);
    const lines = parseInteger(params.lines ?? DEFAULT_CACHE_CONFIG.lines);
    const blockSize = parseInteger(params.blockSize ?? DEFAULT_CACHE_CONFIG.blockSize);
    const mapping = params.mapping || "direct";
    const replacement = params.replacement || "lru";
    const associativityInput = parseInteger(params.associativity ?? DEFAULT_CACHE_CONFIG.associativity);

    if (!accesses.length) throw new Error("请输入至少一个访问地址");
    if (!isPowerOfTwo(lines)) throw new Error("缓存行数必须是 2 的幂");
    if (!isPowerOfTwo(blockSize)) throw new Error("块大小必须是 2 的幂");
    if (addressBits < 4 || addressBits > 32) throw new Error("地址位数建议在 4 到 32 之间");

    const associativity = mapping === "direct" ? 1 : mapping === "fully" ? lines : Math.min(associativityInput, lines);
    if (!isPowerOfTwo(associativity)) throw new Error("组相联路数必须是 2 的幂");
    if (lines % associativity !== 0) throw new Error("缓存行数必须能被组相联路数整除");

    const setCount = lines / associativity;
    const offsetBits = Math.log2(blockSize);
    const indexBits = Math.log2(setCount);
    const tagBits = addressBits - offsetBits - indexBits;
    if (tagBits < 0) throw new Error("地址位数不足，无法容纳 tag、index 和 offset");

    const sets = Array.from({ length: setCount }, (_, setIndex) => ({
      setIndex,
      lines: Array.from({ length: associativity }, (_, way) => ({
        setIndex,
        way,
        valid: false,
        tag: null,
        block: null,
        lastUsed: 0,
        insertedAt: 0,
        frequency: 0,
      })),
    }));
    const events = [];
    let hits = 0;
    let misses = 0;

    accesses.forEach((address, accessIndex) => {
      if (address < 0 || address >= 2 ** addressBits) {
        throw new Error(`地址 ${address} 超出 ${addressBits} 位地址空间`);
      }
      const blockNumber = Math.floor(address / blockSize);
      const offset = address % blockSize;
      const setIndex = mapping === "fully" ? 0 : blockNumber % setCount;
      const tag = mapping === "direct" ? Math.floor(blockNumber / setCount) : mapping === "set" ? Math.floor(blockNumber / setCount) : blockNumber;
      const set = sets[setIndex];
      const hitLine = set.lines.find((line) => line.valid && line.tag === tag);
      const clock = accessIndex + 1;

      if (hitLine) {
        hits += 1;
        hitLine.lastUsed = clock;
        hitLine.frequency += 1;
        events.push({
          accessIndex,
          address,
          blockNumber,
          setIndex,
          tag,
          offset,
          hit: true,
          way: hitLine.way,
          snapshotRows: snapshotCacheRows(sets),
          action: mapping === "direct"
            ? `命中：Cache 行 ${setIndex} 中保存的正是主存块 ${blockNumber}，直接访问。`
            : `命中：第 ${setIndex} 组第 ${hitLine.way} 路。`,
        });
        return;
      }

      misses += 1;
      const emptyLine = set.lines.find((line) => !line.valid);
      const target = emptyLine || chooseCacheVictim(set.lines, replacement, clock);
      const evicted = target.valid ? { tag: target.tag, block: target.block, way: target.way } : null;
      Object.assign(target, {
        valid: true,
        tag,
        block: blockNumber,
        lastUsed: clock,
        insertedAt: clock,
        frequency: 1,
      });
      events.push({
        accessIndex,
        address,
        blockNumber,
        setIndex,
        tag,
        offset,
        hit: false,
        way: target.way,
        evicted,
        snapshotRows: snapshotCacheRows(sets),
        action: evicted
          ? mapping === "direct"
            ? `未命中：行 ${setIndex} 原有的主存块 ${evicted.block} 被主存块 ${blockNumber} 换出（直接映射只有唯一候选行，不需要替换算法）。`
            : `未命中：按 ${replacement.toUpperCase()} 替换第 ${setIndex} 组第 ${evicted.way} 路的主存块 ${evicted.block}。`
          : mapping === "direct"
            ? `未命中：Cache 行 ${setIndex} 为空，装入主存块 ${blockNumber}。`
            : `未命中：装入第 ${setIndex} 组第 ${target.way} 路空行。`,
      });
    });

    const rows = snapshotCacheRows(sets);

    return {
      mapping,
      replacement,
      addressBits,
      lines,
      blockSize,
      associativity,
      setCount,
      offsetBits,
      indexBits,
      tagBits,
      accesses,
      events,
      rows,
      hits,
      misses,
      hitRate: accesses.length ? hits / accesses.length : 0,
      explanation: `${mapping === "direct" ? "直接映射" : mapping === "fully" ? "全相联" : `${associativity} 路组相联`}，替换算法 ${replacement.toUpperCase()}，命中 ${hits} 次，未命中 ${misses} 次。`,
    };
  }

  function cleanAssemblyLines(program) {
    return String(program || "")
      .split(/\r?\n/)
      .map((line) => line.replace(/\/\/.*$/, "").replace(/;.*/, "").trim())
      .filter(Boolean);
  }

  function choosePageVictim(frames, policy, currentIndex, references) {
    if (policy === "fifo") {
      return frames.reduce((best, frame) => frame.loadedAt < best.loadedAt ? frame : best, frames[0]);
    }
    if (policy === "lfu") {
      return frames.reduce((best, frame) => {
        if (frame.frequency !== best.frequency) return frame.frequency < best.frequency ? frame : best;
        return frame.lastUsed < best.lastUsed ? frame : best;
      }, frames[0]);
    }
    if (policy === "opt") {
      return frames.reduce((best, frame) => {
        const nextUse = references.slice(currentIndex + 1).indexOf(frame.page);
        const score = nextUse === -1 ? Number.POSITIVE_INFINITY : nextUse;
        const bestNextUse = references.slice(currentIndex + 1).indexOf(best.page);
        const bestScore = bestNextUse === -1 ? Number.POSITIVE_INFINITY : bestNextUse;
        return score > bestScore ? frame : best;
      }, frames[0]);
    }
    return frames.reduce((best, frame) => frame.lastUsed < best.lastUsed ? frame : best, frames[0]);
  }

  function parseSegmentTable(text) {
    return String(text || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [segment, base, limit] = line.split(/[\s,;:]+/).map(parseInteger);
        return { segment, base, limit };
      });
  }

  function parseSegmentPageTable(text) {
    return String(text || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [segment, page, frame] = line.split(/[\s,;:]+/).map(parseInteger);
        return { segment, page, frame };
      });
  }

  function simulatePageReplacement(referencesValue, frameCountValue, policyValue) {
    const references = parseAddressList(referencesValue);
    const frameCount = parseInteger(frameCountValue);
    const policy = policyValue || "lru";
    if (!references.length) throw new Error("请输入页面访问序列");
    if (!Number.isInteger(frameCount) || frameCount <= 0 || frameCount > 16) throw new Error("物理页框数建议在 1 到 16 之间");

    const frames = Array.from({ length: frameCount }, (_, frame) => ({
      frame,
      page: null,
      loadedAt: 0,
      lastUsed: 0,
      frequency: 0,
    }));
    const events = [];
    let faults = 0;

    const snapshotFrameMeta = () => frames.map((frame) => ({
      frame: frame.frame,
      page: frame.page,
      loadedAt: frame.loadedAt,
      lastUsed: frame.lastUsed,
      frequency: frame.frequency,
    }));

    const describeVictim = (target, index) => {
      if (policy === "fifo") {
        return `按 FIFO：页 ${target.page} 在第 ${target.loadedAt} 次访问时装入，是最早进入内存的页。`;
      }
      if (policy === "lfu") {
        return `按 LFU：页 ${target.page} 只被使用过 ${target.frequency} 次，是使用次数最少的页。`;
      }
      if (policy === "opt") {
        const nextUse = references.slice(index + 1).indexOf(target.page);
        return nextUse === -1
          ? `按 OPT：页 ${target.page} 在后续序列中不再出现，将来最不需要。`
          : `按 OPT：页 ${target.page} 要到第 ${index + 1 + nextUse + 1} 次访问才再次用到，是将来最晚使用的页。`;
      }
      return `按 LRU：页 ${target.page} 上次使用是第 ${target.lastUsed} 次访问，是最久未使用的页。`;
    };

    references.forEach((page, index) => {
      const clock = index + 1;
      const hit = frames.find((frame) => frame.page === page);
      if (hit) {
        hit.lastUsed = clock;
        hit.frequency += 1;
        events.push({
          index,
          page,
          hit: true,
          frame: hit.frame,
          snapshot: frames.map((frame) => frame.page),
          frameMeta: snapshotFrameMeta(),
          action: `页 ${page} 命中页框 ${hit.frame}。`,
        });
        return;
      }

      faults += 1;
      const empty = frames.find((frame) => frame.page === null);
      const target = empty || choosePageVictim(frames, policy, index, references);
      const evicted = target.page;
      const victimReason = evicted === null ? null : describeVictim(target, index);
      Object.assign(target, {
        page,
        loadedAt: clock,
        lastUsed: clock,
        frequency: 1,
      });
      events.push({
        index,
        page,
        hit: false,
        frame: target.frame,
        evicted,
        victimReason,
        snapshot: frames.map((frame) => frame.page),
        frameMeta: snapshotFrameMeta(),
        action: evicted === null
          ? `缺页：页 ${page} 装入空页框 ${target.frame}。`
          : `缺页：按 ${policy.toUpperCase()} 置换页 ${evicted}，装入页 ${page}。`,
      });
    });

    return {
      references,
      frameCount,
      policy,
      events,
      faults,
      hits: references.length - faults,
      faultRate: faults / references.length,
      frames: frames.map((frame) => ({ frame: frame.frame, page: frame.page })),
    };
  }

  function simulateVirtualMemory(params) {
    const mode = params.mode || "paging";
    const pageSize = parseInteger(params.pageSize || 1024);
    if (!isPowerOfTwo(pageSize)) throw new Error("页大小必须是 2 的幂");

    if (mode === "segmentation") {
      const [segment, offset] = String(params.logicalAddress || "0:0").split(/[:\s,]+/).map(parseInteger);
      const table = parseSegmentTable(params.segmentTable);
      const entry = table.find((item) => item.segment === segment);
      if (!entry) throw new Error(`段 ${segment} 不在段表中`);
      const valid = offset >= 0 && offset < entry.limit;
      return {
        mode,
        logicalAddress: `${segment}:${offset}`,
        table,
        valid,
        physicalAddress: valid ? entry.base + offset : null,
        explanation: valid
          ? `段 ${segment} 基址 ${entry.base} + 段内偏移 ${offset} = 物理地址 ${entry.base + offset}。`
          : `段内偏移 ${offset} 超出段长 ${entry.limit}，发生越界。`,
      };
    }

    if (mode === "segmented-paging") {
      const [segment, page, offset] = String(params.logicalAddress || "0:0:0").split(/[:\s,]+/).map(parseInteger);
      const table = parseSegmentPageTable(params.segmentPageTable);
      const entry = table.find((item) => item.segment === segment && item.page === page);
      if (!entry) throw new Error(`段 ${segment} 的页 ${page} 不在段页表中`);
      if (offset < 0 || offset >= pageSize) throw new Error(`页内偏移必须在 0 到 ${pageSize - 1} 之间`);
      const physicalAddress = entry.frame * pageSize + offset;
      return {
        mode,
        logicalAddress: `${segment}:${page}:${offset}`,
        table,
        physicalAddress,
        explanation: `先查段 ${segment} 的页表，再由页 ${page} → 页框 ${entry.frame}，物理地址 = ${entry.frame} × ${pageSize} + ${offset} = ${physicalAddress}。`,
      };
    }

    const logicalAddress = parseInteger(params.logicalAddress || 0);
    const page = Math.floor(logicalAddress / pageSize);
    const offset = logicalAddress % pageSize;
    const replacement = simulatePageReplacement(params.references, params.frames, params.replacement || "lru");
    const resident = replacement.frames.find((frame) => frame.page === page);
    return {
      mode: "paging",
      logicalAddress,
      page,
      offset,
      pageSize,
      physicalAddress: resident ? resident.frame * pageSize + offset : null,
      residentFrame: resident ? resident.frame : null,
      replacement,
      explanation: resident
        ? `逻辑地址 ${logicalAddress} 拆为页号 ${page}、页内偏移 ${offset}；页 ${page} 当前在页框 ${resident.frame}，物理地址为 ${resident.frame * pageSize + offset}。`
        : `逻辑地址 ${logicalAddress} 对应页 ${page}，该页当前不在物理页框中，会触发缺页。`,
    };
  }

  function tokenizeInstruction(line) {
    return line
      .replace(/,/g, " ")
      .replace(/\(/g, " ")
      .replace(/\)/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  }

  function isRegister(token) {
    return /^x([0-9]|[12][0-9]|3[01])$/i.test(token) || /^r([0-9]|1[0-5])$/i.test(token);
  }

  function parseImmediate(token) {
    return parseInteger(String(token || "").replace(/^#/, ""));
  }

  function createRegisters() {
    const registers = {};
    for (let index = 0; index < 32; index += 1) {
      registers[`x${index}`] = 0;
    }
    for (let index = 0; index < 16; index += 1) {
      registers[`R${index}`] = 0;
    }
    return registers;
  }

  function readRegister(registers, name) {
    const key = normalizeRegisterName(name);
    return registers[key] || 0;
  }

  function writeRegister(registers, name, value) {
    const key = normalizeRegisterName(name);
    if (key === "x0") {
      registers.x0 = 0;
      return;
    }
    registers[key] = value;
  }

  function normalizeRegisterName(name) {
    const text = String(name || "").trim();
    if (/^x/i.test(text)) {
      return text.toLowerCase();
    }
    if (/^r/i.test(text)) {
      return text.toUpperCase();
    }
    return text;
  }

  function instructionMeta(line) {
    const tokens = tokenizeInstruction(line);
    const op = normalize(tokens[0]);
    const args = tokens.slice(1);
    const reads = [];
    const writes = [];
    let type = "unknown";

    if (["add", "sub"].includes(op) && args.length >= 3) {
      type = "R";
      writes.push(normalizeRegisterName(args[0]));
      if (isRegister(args[1])) reads.push(normalizeRegisterName(args[1]));
      if (isRegister(args[2])) reads.push(normalizeRegisterName(args[2]));
    } else if (op === "addi" && args.length >= 3) {
      type = "I";
      writes.push(normalizeRegisterName(args[0]));
      if (isRegister(args[1])) reads.push(normalizeRegisterName(args[1]));
    } else if (op === "lw" && args.length >= 3) {
      type = "I/load";
      writes.push(normalizeRegisterName(args[0]));
      if (isRegister(args[2])) reads.push(normalizeRegisterName(args[2]));
    } else if (op === "sw" && args.length >= 3) {
      type = "S/store";
      if (isRegister(args[0])) reads.push(normalizeRegisterName(args[0]));
      if (isRegister(args[2])) reads.push(normalizeRegisterName(args[2]));
    } else if (op === "mov" && args.length >= 2) {
      type = "pseudo";
      writes.push(normalizeRegisterName(args[0]));
      if (isRegister(args[1])) reads.push(normalizeRegisterName(args[1]));
    } else if (op === "li" && args.length >= 2) {
      type = "pseudo";
      writes.push(normalizeRegisterName(args[0]));
    }

    return {
      raw: line,
      op,
      args,
      type,
      reads: Array.from(new Set(reads)),
      writes: Array.from(new Set(writes.filter((name) => name !== "x0"))),
    };
  }

  function parseAssembly(program) {
    const lines = cleanAssemblyLines(program);
    return lines.map((line, index) => {
      const meta = instructionMeta(line);
      return {
        index,
        address: index * 4,
        raw: line,
        op: meta.op,
        type: meta.type,
        reads: meta.reads,
        writes: meta.writes,
        args: meta.args,
        supported: meta.type !== "unknown",
      };
    });
  }

  function executeAssembly(program) {
    const instructions = parseAssembly(program);
    const registers = createRegisters();
    const memory = {};
    const steps = [];
    let pc = 0;

    instructions.forEach((instruction) => {
      const beforeRegisters = { ...registers };
      const beforeMemory = { ...memory };
      const op = instruction.op;
      const args = instruction.args;
      const step = {
        index: instruction.index,
        pcBefore: pc,
        pcAfter: pc + 4,
        raw: instruction.raw,
        op,
        type: instruction.type,
        reads: instruction.reads,
        writes: instruction.writes,
        registerDiff: {},
        memoryDiff: {},
        explanation: "",
        error: null,
      };

      try {
        if (!instruction.supported) {
          throw new Error(`暂不支持指令：${instruction.raw}`);
        }

        if (op === "mov") {
          const dest = args[0];
          const source = args[1];
          const value = isRegister(source) ? readRegister(registers, source) : parseImmediate(source);
          writeRegister(registers, dest, value);
          step.explanation = `${normalizeRegisterName(dest)} 写入 ${isRegister(source) ? normalizeRegisterName(source) : "立即数"} ${value}。`;
        } else if (op === "li") {
          const dest = args[0];
          const value = parseImmediate(args[1]);
          writeRegister(registers, dest, value);
          step.explanation = `${normalizeRegisterName(dest)} 写入立即数 ${value}。`;
        } else if (op === "add" || op === "sub") {
          const dest = args[0];
          const left = readRegister(registers, args[1]);
          const right = readRegister(registers, args[2]);
          const value = op === "add" ? left + right : left - right;
          writeRegister(registers, dest, value);
          step.explanation = `${normalizeRegisterName(dest)} = ${normalizeRegisterName(args[1])} ${op === "add" ? "+" : "-"} ${normalizeRegisterName(args[2])} = ${value}。`;
        } else if (op === "addi") {
          const dest = args[0];
          const left = readRegister(registers, args[1]);
          const imm = parseImmediate(args[2]);
          const value = left + imm;
          writeRegister(registers, dest, value);
          step.explanation = `${normalizeRegisterName(dest)} = ${normalizeRegisterName(args[1])} + ${imm} = ${value}。`;
        } else if (op === "lw") {
          const dest = args[0];
          const offset = parseImmediate(args[1]);
          const base = readRegister(registers, args[2]);
          const address = base + offset;
          const value = memory[address] || 0;
          writeRegister(registers, dest, value);
          step.explanation = `有效地址 = ${normalizeRegisterName(args[2])} + ${offset} = ${address}，从内存读取 ${value} 写入 ${normalizeRegisterName(dest)}。`;
        } else if (op === "sw") {
          const source = args[0];
          const offset = parseImmediate(args[1]);
          const base = readRegister(registers, args[2]);
          const address = base + offset;
          const value = readRegister(registers, source);
          memory[address] = value;
          step.explanation = `有效地址 = ${normalizeRegisterName(args[2])} + ${offset} = ${address}，把 ${normalizeRegisterName(source)} 的值 ${value} 写入内存。`;
        }
      } catch (error) {
        step.error = error.message;
        step.explanation = error.message;
      }

      Object.keys(registers).forEach((name) => {
        if (registers[name] !== beforeRegisters[name]) {
          step.registerDiff[name] = {
            before: beforeRegisters[name],
            after: registers[name],
          };
        }
      });
      Object.keys(memory).forEach((address) => {
        if (memory[address] !== beforeMemory[address]) {
          step.memoryDiff[address] = {
            before: beforeMemory[address] || 0,
            after: memory[address],
          };
        }
      });

      registers.x0 = 0;
      pc += 4;
      steps.push(step);
    });

    return {
      instructions,
      steps,
      finalRegisters: registers,
      finalMemory: memory,
    };
  }

  function datapathControlSignals(instruction, values) {
    const op = instruction.op;
    const signals = {
      RegWrite: 0,
      ALUSrc: 0,
      MemRead: 0,
      MemWrite: 0,
      MemToReg: 0,
      Branch: 0,
      ALUOp: "-",
    };

    if (op === "add" || op === "sub") {
      return { ...signals, RegWrite: 1, ALUOp: op };
    }
    if (op === "addi") {
      return { ...signals, RegWrite: 1, ALUSrc: 1, ALUOp: "add" };
    }
    if (op === "lw") {
      return { ...signals, RegWrite: 1, ALUSrc: 1, MemRead: 1, MemToReg: 1, ALUOp: "add" };
    }
    if (op === "sw") {
      return { ...signals, ALUSrc: 1, MemWrite: 1, MemToReg: "X", ALUOp: "add" };
    }
    if (op === "li") {
      return { ...signals, RegWrite: 1, ALUSrc: 1, ALUOp: "pass imm" };
    }
    if (op === "mov") {
      return { ...signals, RegWrite: 1, ALUSrc: values.sourceIsRegister ? 0 : 1, ALUOp: "pass" };
    }
    return signals;
  }

  function changedKeys(before, after) {
    return Object.keys(after)
      .filter((key) => after[key] !== before[key])
      .sort();
  }

  function buildDatapathTrace(instruction, registers, memory, pc) {
    const beforeRegisters = { ...registers };
    const beforeMemory = { ...memory };
    const afterRegisters = { ...registers };
    const afterMemory = { ...memory };
    const values = {
      pc,
      pcNext: pc + 4,
      instruction: instruction.raw,
      op: instruction.op,
      type: instruction.type,
    };
    let error = null;

    try {
      if (!instruction.supported) {
        throw new Error(`暂不支持指令：${instruction.raw}`);
      }

      if (instruction.op === "add" || instruction.op === "sub") {
        const [rd, rs1, rs2] = instruction.args;
        const left = readRegister(registers, rs1);
        const right = readRegister(registers, rs2);
        const result = instruction.op === "add" ? left + right : left - right;
        values.rd = normalizeRegisterName(rd);
        values.rs1 = normalizeRegisterName(rs1);
        values.rs2 = normalizeRegisterName(rs2);
        values.rs1Value = left;
        values.rs2Value = right;
        values.aluInputA = left;
        values.aluInputB = right;
        values.aluResult = result;
        values.writeBackRegister = values.rd;
        values.writeBackValue = result;
        writeRegister(afterRegisters, rd, result);
      } else if (instruction.op === "addi") {
        const [rd, rs1, immToken] = instruction.args;
        const left = readRegister(registers, rs1);
        const imm = parseImmediate(immToken);
        const result = left + imm;
        values.rd = normalizeRegisterName(rd);
        values.rs1 = normalizeRegisterName(rs1);
        values.rs1Value = left;
        values.imm = imm;
        values.aluInputA = left;
        values.aluInputB = imm;
        values.aluResult = result;
        values.writeBackRegister = values.rd;
        values.writeBackValue = result;
        writeRegister(afterRegisters, rd, result);
      } else if (instruction.op === "lw") {
        const [rd, offsetToken, baseReg] = instruction.args;
        const base = readRegister(registers, baseReg);
        const imm = parseImmediate(offsetToken);
        const address = base + imm;
        const memoryData = memory[address] || 0;
        values.rd = normalizeRegisterName(rd);
        values.rs1 = normalizeRegisterName(baseReg);
        values.rs1Value = base;
        values.imm = imm;
        values.aluInputA = base;
        values.aluInputB = imm;
        values.aluResult = address;
        values.memoryAddress = address;
        values.memoryData = memoryData;
        values.writeBackRegister = values.rd;
        values.writeBackValue = memoryData;
        writeRegister(afterRegisters, rd, memoryData);
      } else if (instruction.op === "sw") {
        const [sourceReg, offsetToken, baseReg] = instruction.args;
        const base = readRegister(registers, baseReg);
        const imm = parseImmediate(offsetToken);
        const address = base + imm;
        const writeData = readRegister(registers, sourceReg);
        values.rs1 = normalizeRegisterName(baseReg);
        values.rs1Value = base;
        values.rs2 = normalizeRegisterName(sourceReg);
        values.rs2Value = writeData;
        values.imm = imm;
        values.aluInputA = base;
        values.aluInputB = imm;
        values.aluResult = address;
        values.memoryAddress = address;
        values.memoryWriteData = writeData;
        afterMemory[address] = writeData;
      } else if (instruction.op === "li") {
        const [rd, immToken] = instruction.args;
        const imm = parseImmediate(immToken);
        values.rd = normalizeRegisterName(rd);
        values.imm = imm;
        values.aluInputB = imm;
        values.aluResult = imm;
        values.writeBackRegister = values.rd;
        values.writeBackValue = imm;
        writeRegister(afterRegisters, rd, imm);
      } else if (instruction.op === "mov") {
        const [rd, source] = instruction.args;
        const sourceIsRegister = isRegister(source);
        const value = sourceIsRegister ? readRegister(registers, source) : parseImmediate(source);
        values.rd = normalizeRegisterName(rd);
        values.sourceIsRegister = sourceIsRegister;
        if (sourceIsRegister) {
          values.rs1 = normalizeRegisterName(source);
          values.rs1Value = value;
          values.aluInputA = value;
        } else {
          values.imm = value;
          values.aluInputB = value;
        }
        values.aluResult = value;
        values.writeBackRegister = values.rd;
        values.writeBackValue = value;
        writeRegister(afterRegisters, rd, value);
      }
    } catch (traceError) {
      error = traceError.message;
    }

    afterRegisters.x0 = 0;
    const controlSignals = datapathControlSignals(instruction, values);
    return {
      instruction,
      beforeRegisters,
      beforeMemory,
      afterRegisters,
      afterMemory,
      values,
      controlSignals,
      error,
      changedRegisters: changedKeys(beforeRegisters, afterRegisters),
      changedMemory: changedKeys(beforeMemory, afterMemory),
    };
  }

  function datapathFlow(trace, stageId) {
    const op = trace.instruction.op;
    const common = {
      IF: {
        activeNodes: ["pc", "pcAdd", "imem"],
        activeEdges: ["pc-imem", "pc-pcadd", "pcadd-pc"],
      },
      ID: {
        activeNodes: ["imem", "control", "regfile", "immgen"],
        activeEdges: ["imem-control", "imem-regfile", "imem-immgen"],
      },
    };
    if (common[stageId]) return common[stageId];

    if (stageId === "EX") {
      if (op === "add" || op === "sub" || (op === "mov" && trace.values.sourceIsRegister)) {
        return {
          activeNodes: ["regfile", "alu"],
          activeEdges: ["regfile-alu-a", "regfile-alu-b"],
        };
      }
      return {
        activeNodes: ["regfile", "immgen", "aluMux", "alu"],
        activeEdges: ["regfile-alu-a", "immgen-alumux", "alumux-alu-b"],
      };
    }

    if (stageId === "MEM") {
      if (op === "lw") {
        return {
          activeNodes: ["alu", "dmem"],
          activeEdges: ["alu-dmem"],
        };
      }
      if (op === "sw") {
        return {
          activeNodes: ["regfile", "alu", "dmem"],
          activeEdges: ["alu-dmem", "regfile-dmem"],
        };
      }
      return {
        activeNodes: ["alu"],
        activeEdges: [],
      };
    }

    if (stageId === "WB") {
      if (op === "sw") {
        return {
          activeNodes: ["control"],
          activeEdges: [],
        };
      }
      if (op === "lw") {
        return {
          activeNodes: ["dmem", "wbMux", "regfile"],
          activeEdges: ["dmem-wbmux", "wbmux-regfile"],
        };
      }
      return {
        activeNodes: ["alu", "wbMux", "regfile"],
        activeEdges: ["alu-wbmux", "wbmux-regfile"],
      };
    }

    return { activeNodes: [], activeEdges: [] };
  }

  function datapathStageExplanation(trace, stageId) {
    const v = trace.values;
    if (trace.error) {
      return trace.error;
    }
    if (stageId === "IF") {
      return `PC=${v.pc} 作为取指地址送入指令存储器，取出指令 ${v.instruction}，同时计算 PC+4=${v.pcNext}。`;
    }
    if (stageId === "ID") {
      return `控制器根据操作码 ${v.op} 产生控制信号，寄存器堆读取源操作数，立即数生成器准备偏移或常数。`;
    }
    if (stageId === "EX") {
      return `ALU 使用输入 ${v.aluInputA ?? "-"} 和 ${v.aluInputB ?? "-"} 执行 ${trace.controlSignals.ALUOp}，得到结果 ${v.aluResult ?? "-"}。`;
    }
    if (stageId === "MEM") {
      if (trace.instruction.op === "lw") {
        return `数据存储器使用地址 ${v.memoryAddress} 读取数据，读出值为 ${v.memoryData}。`;
      }
      if (trace.instruction.op === "sw") {
        return `数据存储器使用地址 ${v.memoryAddress} 写入来自 ${v.rs2} 的值 ${v.memoryWriteData}。`;
      }
      return "本条指令不访问数据存储器，MEM 阶段只让 ALU 结果继续向后传递。";
    }
    if (stageId === "WB") {
      if (trace.instruction.op === "sw") {
        return "store 指令只写数据存储器，不写回寄存器堆，因此 RegWrite=0。";
      }
      return `写回多路选择器选择 ${trace.instruction.op === "lw" ? "内存读出数据" : "ALU 结果"}，写入 ${v.writeBackRegister}=${v.writeBackValue}。`;
    }
    return "";
  }

  function buildDatapathFrame(trace, stage, stageIndex, instructionCount) {
    const flow = datapathFlow(trace, stage.id);
    const registerReady = Boolean(trace.values.writeBackRegister) && stageIndex >= 4;
    const memoryReady = Boolean(trace.changedMemory.length) && stageIndex >= 3;
    return {
      instructionIndex: trace.instruction.index,
      instructionCount,
      instruction: trace.instruction.raw,
      op: trace.instruction.op,
      stage: stage.id,
      stageName: stage.name,
      activeNodes: flow.activeNodes,
      activeEdges: flow.activeEdges,
      controlSignals: trace.controlSignals,
      values: trace.values,
      explanation: datapathStageExplanation(trace, stage.id),
      registers: registerReady ? trace.afterRegisters : trace.beforeRegisters,
      memory: memoryReady ? trace.afterMemory : trace.beforeMemory,
      changedRegisters: registerReady ? trace.changedRegisters : [],
      changedMemory: memoryReady ? trace.changedMemory : [],
      error: trace.error,
    };
  }

  function simulateDatapath(program) {
    const instructions = parseAssembly(program).filter((instruction) => instruction.raw);
    const registers = createRegisters();
    let currentRegisters = { ...registers };
    let currentMemory = {};
    let pc = 0;
    const frames = [];
    const summaries = [];

    instructions.forEach((instruction) => {
      const trace = buildDatapathTrace(instruction, currentRegisters, currentMemory, pc);
      DATAPATH_STAGES.forEach((stage, stageIndex) => {
        frames.push(buildDatapathFrame(trace, stage, stageIndex, instructions.length));
      });
      summaries.push({
        index: instruction.index,
        address: instruction.address,
        raw: instruction.raw,
        op: instruction.op,
        type: instruction.type,
        supported: instruction.supported,
        error: trace.error,
        changedRegisters: trace.changedRegisters,
        changedMemory: trace.changedMemory,
      });
      currentRegisters = { ...trace.afterRegisters };
      currentMemory = { ...trace.afterMemory };
      pc += 4;
    });

    return {
      stages: DATAPATH_STAGES,
      instructions: summaries,
      frames,
      finalRegisters: currentRegisters,
      finalMemory: currentMemory,
    };
  }

  function hasIntersection(left, right) {
    const set = new Set(left);
    return right.some((item) => set.has(item));
  }

  function simulatePipeline(program, options) {
    const forwarding = !options || options.forwarding !== false;
    const instructions = parseAssembly(program).filter((item) => item.raw);
    const rows = [];
    const hazards = [];
    let globalDelay = 0;

    instructions.forEach((instruction, index) => {
      let stall = 0;
      if (index > 0) {
        const previous = instructionMeta(instructions[index - 1].raw);
        const current = instructionMeta(instruction.raw);
        const rawConflict = hasIntersection(previous.writes, current.reads);
        if (rawConflict && previous.op === "lw") {
          stall = 1;
          hazards.push({
            type: "load-use",
            instruction: instruction.raw,
            dependsOn: instructions[index - 1].raw,
            cycles: 1,
            description: "后一条指令在 EX 阶段需要 load 指令的数据，需插入 1 个停顿周期。",
          });
        } else if (rawConflict && !forwarding) {
          stall = 2;
          hazards.push({
            type: "RAW",
            instruction: instruction.raw,
            dependsOn: instructions[index - 1].raw,
            cycles: 2,
            description: "未开启转发时，需要等待前一条指令写回结果。",
          });
        } else if (rawConflict) {
          hazards.push({
            type: "RAW-forwarded",
            instruction: instruction.raw,
            dependsOn: instructions[index - 1].raw,
            cycles: 0,
            description: "存在 RAW 相关，但可通过转发解决，不插入停顿。",
          });
        }
      }

      const start = index + globalDelay;
      const cells = [];
      cells[start] = "IF";
      cells[start + 1] = "ID";
      for (let wait = 0; wait < stall; wait += 1) {
        cells[start + 2 + wait] = "STALL";
      }
      cells[start + 2 + stall] = "EX";
      cells[start + 3 + stall] = "MEM";
      cells[start + 4 + stall] = "WB";
      rows.push({
        raw: instruction.raw,
        cells,
        stall,
      });
      globalDelay += stall;
    });

    const cycleCount = rows.reduce((max, row) => Math.max(max, row.cells.length), 0);
    const timeline = rows.map((row) => {
      const normalizedCells = Array.from({ length: cycleCount }, (_, index) => row.cells[index] || "");
      return {
        instruction: row.raw,
        cells: normalizedCells,
        stall: row.stall,
      };
    });

    return {
      stages: PIPELINE_STAGES,
      cycleCount,
      timeline,
      hazards,
      forwarding,
    };
  }

  function diagnosePractice(questionId, answer) {
    const question = diagnosticQuestions.find((item) => item.id === questionId) || diagnosticQuestions[0];
    const normalizedAnswer = normalize(answer);
    const expected = normalize(question.expected);
    const correct = normalizedAnswer.includes(expected);

    return {
      question,
      correct,
      score: correct ? 1 : 0.4,
      firstError: correct ? "无关键错误" : "答案没有命中本题的核心规则",
      feedback: correct
        ? "判断正确。可以继续挑战同知识点的变式题。"
        : question.hint,
      recommendation: question.recommendation,
    };
  }

  return {
    chapters,
    knowledgeBase,
    diagnosticQuestions,
    answerQuestion,
    simulateTwosComplementAdd,
    simulateFixedPointOperation,
    simulateFixedPointMultiply,
    simulateFixedPointDivide,
    decodeFloat32,
    simulateIeee754Operation,
    simulateCacheAddress,
    simulateCacheSystem,
    simulatePageReplacement,
    simulateVirtualMemory,
    parseAssembly,
    executeAssembly,
    simulateDatapath,
    simulatePipeline,
    diagnosePractice,
    toBinaryUnsigned,
    fromUnsigned,
  };
});
