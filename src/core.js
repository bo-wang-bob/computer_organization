(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CompOrgCore = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PIPELINE_STAGES = ["IF", "ID", "EX", "MEM", "WB"];

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
      id: "cache_mapping",
      chapterId: "memory",
      title: "直接映射 Cache 的地址划分",
      keywords: ["cache", "Cache", "直接映射", "组相联", "地址", "命中", "tag", "index"],
      summary: "直接映射 Cache 将主存块唯一映射到某一行，地址通常拆为 Tag、Index 和 Offset。",
      explanation:
        "块内偏移由块大小决定，行索引由 Cache 行数决定，剩余高位是标记位。访问时先用 Index 找到 Cache 行，再比较 Tag，Tag 相同且有效位为 1 才命中。",
      example:
        "16 行 Cache、块大小 4B 时，Offset 为 2 位，Index 为 4 位，Tag 为地址剩余高位。",
      commonMistakes: ["用主存块数计算 Index 位数", "把块内偏移和 Cache 行号混淆"],
      checkQuestion: "块大小从 4B 变为 16B 时，Offset 位数会怎样变化？",
      followups: ["运行 Cache 仿真", "比较直接映射和组相联", "出一道地址划分题"],
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

  function simulateCacheAddress(params) {
    const address = parseInteger(params.address);
    const addressBits = parseInteger(params.addressBits);
    const lines = parseInteger(params.lines);
    const blockSize = parseInteger(params.blockSize);

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

  function cleanAssemblyLines(program) {
    return String(program || "")
      .split(/\r?\n/)
      .map((line) => line.replace(/\/\/.*$/, "").replace(/;.*/, "").trim())
      .filter(Boolean);
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
    simulateCacheAddress,
    parseAssembly,
    executeAssembly,
    simulatePipeline,
    diagnosePractice,
    toBinaryUnsigned,
    fromUnsigned,
  };
});

