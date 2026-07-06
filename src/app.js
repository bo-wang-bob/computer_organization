(function () {
  "use strict";

  const core = window.CompOrgCore;
  const state = {
    assembly: {
      execution: null,
      cursor: -1,
      registers: null,
      memory: {},
    },
    datapath: {
      result: null,
      cursor: 0,
      timer: null,
    },
    cache: {
      result: null,
      cursor: 0,
      timer: null,
    },
    pipeline: {
      result: null,
      cursor: 0,
      timer: null,
    },
    vm: {
      result: null,
      cursor: 0,
      timer: null,
    },
    memory: {
      cells: {},
      steps: [],
      cursor: 0,
      timer: null,
      lastConfig: null,
    },
    expansion: {
      result: null,
      cursor: 0,
    },
    hardwire: {
      result: null,
      cursor: 0,
      timer: null,
    },
    control: {
      result: null,
      cursor: 0,
    },
    bus: {
      result: null,
      cursor: 0,
      timer: null,
    },
    arbitration: {
      result: null,
      cursor: 0,
      timer: null,
      roundPointer: 0,
    },
    keyboard: {
      result: null,
      cursor: 0,
      timer: null,
      capture: false,
      running: false,
      selected: null,
      pending: null,
      lastSource: "尚未按键",
      layout: null,
    },
    extended: {},
  };

  const DEFAULT_KEYBOARD_LAYOUT_TEXT = `1 2 3 4 5 6
7 8 9 0 A B
C D E F G H
I J K L M N
O P Q R S T
U V W X Y Z`;
  const DEFAULT_KEYBOARD_DEBOUNCE_MS = 10;
  const KEYBOARD_SCAN_INTERVAL_MS = 420;
  const DEFAULT_CACHE_CONFIG = Object.freeze({
    accesses: "0x25 0x26 0x08 0x04 0x25 0x0B 0x34 0x25",
    addressBits: 6,
    lines: 4,
    blockSize: 4,
    associativity: 2,
  });
  const DEFAULT_VM_CONFIG = Object.freeze({
    pageSize: 1024,
    frames: 3,
    pagingFallbackPage: 2,
    segmentLogicalAddress: "0:512",
    segmentedPagingLogicalAddress: "0:1:128",
    segmentTable: "0 4096 1024\n1 8192 2048",
    segmentPageTable: "0 0 2\n0 1 5\n1 0 7",
  });
  const DEFAULT_MEMORY_CONFIG = Object.freeze({
    addressBits: 8,
    columnBits: 4,
    dataBits: 8,
  });

  const RECOMMENDED_FEATURES = [
    {
      title: "知识问答",
      desc: "围绕计组概念生成分层解释",
      section: "qa",
    },
    {
      title: "补码与浮点推演",
      desc: "观察定点补码和 IEEE 754 运算过程",
      section: "simulation",
      simPanel: "twos-sim",
    },
    {
      title: "缓存映射仿真",
      desc: "拆解 Tag / Index / Offset 与命中过程",
      section: "simulation",
      simPanel: "cache-sim",
    },
    {
      title: "虚存页面置换",
      desc: "跟踪地址转换、缺页和页面替换",
      section: "simulation",
      simPanel: "virtual-sim",
    },
    {
      title: "存储读写过程",
      desc: "逐步查看地址、数据和控制信号流动",
      section: "simulation",
      simPanel: "memory-access-sim",
    },
    {
      title: "存储器容量扩展",
      desc: "生成位扩展、字扩展和片选关系",
      section: "simulation",
      simPanel: "memory-expansion-sim",
    },
    {
      title: "五级流水线",
      desc: "查看 IF / ID / EX / MEM / WB 周期表",
      section: "simulation",
      simPanel: "pipeline-sim",
    },
    {
      title: "CPU 数据通路",
      desc: "动态观察数据通路与控制信号",
      section: "simulation",
      simPanel: "datapath-sim",
    },
    {
      title: "汇编逐步解释",
      desc: "按步骤执行指令并高亮寄存器变化",
      section: "simulation",
      simPanel: "assembly-sim",
    },
    {
      title: "硬布线控制器",
      desc: "自定义指令并逐拍观察控制信号形成",
      section: "simulation",
      simPanel: "hardwire-sim",
    },
    {
      title: "总线事务仿真",
      desc: "配置读写或中断过程，观察三类总线协作",
      section: "simulation",
      simPanel: "bus-transaction-sim",
    },
    {
      title: "键盘矩阵扫描",
      desc: "读取真实键盘按键并演示扫描、防抖流程",
      section: "simulation",
      simPanel: "keyboard-sim",
    },
  ];

  const SIMULATION_FEATURES = [
    {
      id: "twos-sim",
      title: "补码与浮点推演",
      desc: "自定义定点数、位数与 IEEE 754 运算，查看每一步二进制变化。",
      category: "数值表示",
    },
    {
      id: "cache-sim",
      title: "缓存仿真",
      desc: "输入地址序列，逐步观察直接映射中的定位、命中和装入。",
      category: "存储系统",
    },
    {
      id: "virtual-sim",
      title: "虚存仿真",
      desc: "选择映射方式、页面置换算法和访问序列，演示地址转换与页面置换。",
      category: "存储系统",
    },
    {
      id: "memory-access-sim",
      title: "存储读写",
      desc: "设置地址、数据和读写方向，控制每一步总线与存储单元状态。",
      category: "存储系统",
    },
    {
      id: "memory-expansion-sim",
      title: "存储扩展",
      desc: "输入芯片规格和目标容量，生成位扩展、字扩展和片选关系。",
      category: "存储系统",
    },
    {
      id: "pipeline-sim",
      title: "五级流水线",
      desc: "自定义指令序列，查看 IF / ID / EX / MEM / WB 周期推进。",
      category: "CPU",
    },
    {
      id: "datapath-sim",
      title: "CPU 数据通路",
      desc: "运行指令并逐步观察数据通路、控制信号、寄存器和内存变化。",
      category: "CPU",
    },
    {
      id: "assembly-sim",
      title: "汇编解释",
      desc: "输入汇编片段，按步骤执行并高亮寄存器、内存和日志。",
      category: "CPU",
    },
    {
      id: "hardwire-sim",
      title: "硬布线控制",
      desc: "自定义指令场景，逐拍观察硬布线控制信号的形成过程。",
      category: "控制器",
    },
    {
      id: "control-expression-sim",
      title: "时序表达式",
      desc: "输入控制信号触发表，推导机器周期、节拍和指令条件表达式。",
      category: "控制器",
    },
    {
      id: "bus-transaction-sim",
      title: "总线事务",
      desc: "配置读写或中断事务，观察地址总线、数据总线和控制总线协作。",
      category: "总线",
    },
    {
      id: "bus-arbitration-sim",
      title: "总线仲裁",
      desc: "设置主设备、请求和仲裁方式，比较链式、计数器和独立请求过程。",
      category: "总线",
    },
    {
      id: "keyboard-sim",
      title: "键盘矩阵扫描",
      desc: "使用数字加字母键盘图，支持读取真实键盘按键并演示防抖。",
      category: "接口",
    },
  ];

  const EXTENDED_SIMULATION_FEATURES = [
    {
      id: "architecture-flow-sim",
      title: "冯诺依曼信息流",
      desc: "观察五大部件、存储程序和软件层次如何支撑一条程序运行。",
      category: "系统概述",
    },
    {
      id: "history-timeline-sim",
      title: "计算机发展时间轴",
      desc: "对比电子管、晶体管、集成电路和 VLSI 阶段的性能、功耗与应用变化。",
      category: "系统概述",
    },
    {
      id: "performance-metrics-sim",
      title: "性能指标计算",
      desc: "用指令条数、CPI、主频和浮点操作数推导 CPU 时间、MIPS 与吞吐率。",
      category: "系统概述",
    },
    {
      id: "number-format-sim",
      title: "机器数表示转换",
      desc: "在原码、反码、补码、移码和定点范围之间联动观察编码结果。",
      category: "数值表示",
    },
    {
      id: "alu-carry-sim",
      title: "ALU 与进位链",
      desc: "逐位观察全加器、进位传播、CLA 条件和 OF/CF/Z 标志位生成。",
      category: "运算器",
    },
    {
      id: "fixed-multiply-sim",
      title: "定点乘法算法",
      desc: "演示移位加法、原码一位乘和 Booth 思想下的部分积生成。",
      category: "运算器",
    },
    {
      id: "fixed-division-sim",
      title: "定点除法算法",
      desc: "对比恢复余数法和不恢复余数法中的余数试减、商位生成与校正。",
      category: "运算器",
    },
    {
      id: "float-process-sim",
      title: "浮点表示与加减",
      desc: "拆解 IEEE 754 字段，并演示对阶、尾数加减、规格化和舍入。",
      category: "运算器",
    },
    {
      id: "memory-hierarchy-sim",
      title: "存储层次与主存结构",
      desc: "演示 Cache、主存、辅存的速度容量成本权衡和 MAR/MDR 读写协作。",
      category: "存储系统",
    },
    {
      id: "memory-cell-sim",
      title: "SRAM / DRAM 单元",
      desc: "对比 SRAM 保持、DRAM 行列选通、读破坏和周期刷新过程。",
      category: "存储系统",
    },
    {
      id: "cache-write-sim",
      title: "Cache 写策略",
      desc: "演示写直达、写回、写分配、非写分配和 dirty bit 的状态变化。",
      category: "存储系统",
    },
    {
      id: "cache-locality-sim",
      title: "Cache 局部性",
      desc: "用顺序、循环、步长和随机访问模式观察时间局部性、空间局部性和命中率。",
      category: "存储系统",
    },
    {
      id: "tlb-access-sim",
      title: "TLB 与缺页流程",
      desc: "串联 TLB 查询、页表访问、缺页异常、页面调入和重新访存。",
      category: "存储系统",
    },
    {
      id: "instruction-format-sim",
      title: "指令格式拆解",
      desc: "拆解操作码、寄存器号、立即数和地址码，比较 RISC/CISC 字段组织。",
      category: "指令系统",
    },
    {
      id: "instruction-class-sim",
      title: "指令类型与数据流",
      desc: "把数据传送、算术逻辑、移位、转移和 I/O 指令映射到执行动作。",
      category: "指令系统",
    },
    {
      id: "addressing-mode-sim",
      title: "寻址方式 EA 计算",
      desc: "选择立即、直接、间接、寄存器、变址、基址或相对寻址并计算有效地址。",
      category: "指令系统",
    },
    {
      id: "cpu-cycle-sim",
      title: "指令周期",
      desc: "展开取指、间址、执行和中断周期，观察 PC、IR、MAR、MDR 的变化。",
      category: "CPU",
    },
    {
      id: "control-mode-sim",
      title: "控制方式对比",
      desc: "比较同步、异步、联合、硬布线和微程序控制方式的时序组织。",
      category: "控制器",
    },
    {
      id: "microinstruction-format-sim",
      title: "微指令格式设计",
      desc: "比较水平型、垂直型和混合编码的字段划分、互斥约束与控制字宽度。",
      category: "控制器",
    },
    {
      id: "microprogram-sim",
      title: "微程序控制",
      desc: "用控制存储器、微地址和微指令字段逐拍执行一条机器指令。",
      category: "控制器",
    },
    {
      id: "bus-structure-sim",
      title: "总线结构对比",
      desc: "比较单总线、双总线、三总线结构中的争用、并行度和事务路径。",
      category: "总线",
    },
    {
      id: "display-device-sim",
      title: "显示设备扫描",
      desc: "从字符码或帧缓冲出发，演示显存、扫描时序和显示输出。",
      category: "外围设备",
    },
    {
      id: "disk-access-sim",
      title: "磁盘访问过程",
      desc: "按柱面、磁道、扇区估算寻道、旋转延迟和传输时间。",
      category: "外围设备",
    },
    {
      id: "raid-ssd-sim",
      title: "RAID / SSD 原理",
      desc: "演示 RAID0/1/5 条带化、镜像、校验恢复和 SSD 页块擦写。",
      category: "外围设备",
    },
    {
      id: "io-overview-sim",
      title: "I/O 系统总览",
      desc: "演示编址、选址、串并行传送、同步/异步联络和连接方式。",
      category: "输入输出",
    },
    {
      id: "polling-io-sim",
      title: "程序查询方式",
      desc: "观察 CPU 轮询状态寄存器、忙等和数据寄存器读取过程。",
      category: "输入输出",
    },
    {
      id: "interrupt-io-sim",
      title: "程序中断方式",
      desc: "演示中断请求、响应、现场保护、中断向量、ISR 和嵌套优先级。",
      category: "输入输出",
    },
    {
      id: "dma-transfer-sim",
      title: "DMA 传送",
      desc: "配置传送方式，观察 DMA 控制器、总线请求、周期窃取和结束中断。",
      category: "输入输出",
    },
    {
      id: "channel-io-sim",
      title: "通道方式",
      desc: "演示 CPU 启动通道、通道程序执行、设备控制器协同和结束中断。",
      category: "输入输出",
    },
    {
      id: "pipeline-performance-sim",
      title: "流水线性能",
      desc: "用时空图、瓶颈段、吞吐率、加速比和效率分析流水线收益。",
      category: "流水线",
    },
  ];

  SIMULATION_FEATURES.push(...EXTENDED_SIMULATION_FEATURES);

  const SIMULATION_CATALOG_ORDER = [
    ["architecture-flow-sim", "第1章 计算机系统概述", "冯诺依曼信息流"],
    ["assembly-sim", "第1章 计算机系统概述", "汇编解释"],
    ["history-timeline-sim", "第1章 计算机系统概述", "计算机发展时间轴"],
    ["performance-metrics-sim", "第1章 计算机系统概述", "性能指标计算"],
    ["twos-sim", "第2章 运算方法和运算器", "补码与浮点推演"],
    ["number-format-sim", "第2章 运算方法和运算器", "机器数表示转换"],
    ["alu-carry-sim", "第2章 运算方法和运算器", "ALU 与进位链"],
    ["fixed-multiply-sim", "第2章 运算方法和运算器", "定点乘法算法"],
    ["fixed-division-sim", "第2章 运算方法和运算器", "定点除法算法"],
    ["float-process-sim", "第2章 运算方法和运算器", "浮点表示与加减"],
    ["memory-access-sim", "第3章 存储系统", "存储读写"],
    ["memory-expansion-sim", "第3章 存储系统", "存储扩展"],
    ["memory-hierarchy-sim", "第3章 存储系统", "存储层次与主存结构"],
    ["memory-cell-sim", "第3章 存储系统", "SRAM / DRAM 单元"],
    ["cache-sim", "第3章 存储系统", "缓存仿真"],
    ["cache-write-sim", "第3章 存储系统", "Cache 写策略"],
    ["cache-locality-sim", "第3章 存储系统", "Cache 局部性"],
    ["virtual-sim", "第3章 存储系统", "虚存仿真"],
    ["tlb-access-sim", "第3章 存储系统", "TLB 与缺页流程"],
    ["instruction-format-sim", "第4章 指令系统", "指令格式拆解"],
    ["instruction-class-sim", "第4章 指令系统", "指令类型与数据流"],
    ["addressing-mode-sim", "第4章 指令系统", "寻址方式 EA 计算"],
    ["datapath-sim", "第5章 中央处理器", "CPU 数据通路"],
    ["cpu-cycle-sim", "第5章 中央处理器", "指令周期"],
    ["hardwire-sim", "第5章 中央处理器", "硬布线控制"],
    ["control-expression-sim", "第5章 中央处理器", "时序表达式"],
    ["control-mode-sim", "第5章 中央处理器", "控制方式对比"],
    ["microinstruction-format-sim", "第5章 中央处理器", "微指令格式设计"],
    ["microprogram-sim", "第5章 中央处理器", "微程序控制"],
    ["bus-transaction-sim", "第6章 总线系统", "总线事务"],
    ["bus-structure-sim", "第6章 总线系统", "总线结构对比"],
    ["bus-arbitration-sim", "第6章 总线系统", "总线仲裁"],
    ["display-device-sim", "第7章 外围设备", "显示设备扫描"],
    ["disk-access-sim", "第7章 外围设备", "磁盘访问过程"],
    ["raid-ssd-sim", "第7章 外围设备", "RAID / SSD 原理"],
    ["keyboard-sim", "第8章 输入输出系统", "键盘矩阵扫描"],
    ["io-overview-sim", "第8章 输入输出系统", "I/O 系统总览"],
    ["polling-io-sim", "第8章 输入输出系统", "程序查询方式"],
    ["interrupt-io-sim", "第8章 输入输出系统", "程序中断方式"],
    ["dma-transfer-sim", "第8章 输入输出系统", "DMA 传送"],
    ["channel-io-sim", "第8章 输入输出系统", "通道方式"],
    ["pipeline-sim", "第9章 流水处理器", "五级流水线"],
    ["pipeline-performance-sim", "第9章 流水处理器", "流水线性能"],
  ];

  const simulationCatalogMeta = new Map(
    SIMULATION_CATALOG_ORDER.map(([id, chapter, title], index) => [id, { chapter, title, index }])
  );

  SIMULATION_FEATURES.sort((left, right) => {
    const leftOrder = simulationCatalogMeta.get(left.id)?.index ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = simulationCatalogMeta.get(right.id)?.index ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder;
  });

  SIMULATION_FEATURES.forEach((feature) => {
    const meta = simulationCatalogMeta.get(feature.id);
    if (!meta) return;
    feature.category = meta.chapter;
    feature.title = meta.title;
  });

  const EXTENDED_SIMULATION_DEFS = {
    "architecture-flow-sim": {
      title: "冯诺依曼信息流与软件执行层次",
      eyebrow: "Architecture Flow",
      subtitle: "从高级语言、存储程序到五大部件协作，观察一段程序如何被机器执行。",
      inputs: [
        {
          name: "program",
          label: "程序片段",
          type: "select",
          value: "add",
          options: [
            ["add", "C = A + B"],
            ["load", "从内存取数再计算"],
            ["io", "输入设备到输出设备"],
          ],
        },
      ],
    },
    "history-timeline-sim": {
      title: "计算机发展交互时间轴",
      eyebrow: "Computer History",
      subtitle: "拖动阶段，比较器件、体积、功耗、速度、编程方式和应用范围的变化。",
      inputs: [
        {
          name: "stage",
          label: "发展阶段",
          type: "select",
          value: "vlsi",
          options: [
            ["tube", "第一代：电子管"],
            ["transistor", "第二代：晶体管"],
            ["ic", "第三代：集成电路"],
            ["vlsi", "第四代：VLSI / ULSI"],
          ],
        },
      ],
    },
    "performance-metrics-sim": {
      title: "计算机性能指标计算器",
      eyebrow: "Performance Metrics",
      subtitle: "输入指令条数、CPI 和主频，推导 CPU 时间、MIPS、吞吐率和方案对比。",
      inputs: [
        { name: "instructions", label: "指令条数", type: "number", value: "200000000" },
        { name: "cpi", label: "平均 CPI", type: "number", value: "1.8", step: "0.1" },
        { name: "clockGhz", label: "主频 GHz", type: "number", value: "2.5", step: "0.1" },
        { name: "flopsPerInst", label: "每指令浮点操作", type: "number", value: "0.25", step: "0.05" },
      ],
    },
    "number-format-sim": {
      title: "机器数表示转换器",
      eyebrow: "Number Encoding",
      subtitle: "联动观察真值在原码、反码、补码、移码和定点范围中的表示。",
      inputs: [
        { name: "value", label: "真值", type: "number", value: "-13" },
        {
          name: "bits",
          label: "位数",
          type: "select",
          value: "8",
          options: [
            ["4", "4 位"],
            ["8", "8 位"],
            ["16", "16 位"],
          ],
        },
      ],
    },
    "alu-carry-sim": {
      title: "ALU 与进位链仿真",
      eyebrow: "ALU / Carry",
      subtitle: "逐位跟踪全加器、串行进位、先行进位条件和标志位生成。",
      inputs: [
        { name: "a", label: "A", type: "number", value: "45" },
        { name: "b", label: "B", type: "number", value: "27" },
        {
          name: "op",
          label: "运算",
          type: "select",
          value: "add",
          options: [
            ["add", "A + B"],
            ["sub", "A - B"],
            ["and", "A AND B"],
            ["or", "A OR B"],
          ],
        },
        {
          name: "bits",
          label: "位数",
          type: "select",
          value: "8",
          options: [
            ["4", "4 位"],
            ["8", "8 位"],
            ["16", "16 位"],
          ],
        },
      ],
    },
    "fixed-multiply-sim": {
      title: "定点乘法算法演示",
      eyebrow: "Fixed-point Multiply",
      subtitle: "用部分积、移位累加和 Booth 判别展示定点乘法的核心过程。",
      inputs: [
        { name: "multiplicand", label: "被乘数 X", type: "number", value: "-7" },
        { name: "multiplier", label: "乘数 Y", type: "number", value: "6" },
        {
          name: "method",
          label: "算法",
          type: "select",
          value: "booth",
          options: [
            ["shift-add", "无符号移位加法"],
            ["sign-magnitude", "原码一位乘"],
            ["booth", "Booth 补码乘法"],
          ],
        },
        {
          name: "bits",
          label: "位数",
          type: "select",
          value: "8",
          options: [
            ["4", "4 位"],
            ["8", "8 位"],
            ["16", "16 位"],
          ],
        },
      ],
    },
    "fixed-division-sim": {
      title: "定点除法算法演示",
      eyebrow: "Fixed-point Division",
      subtitle: "展示恢复余数法和不恢复余数法中的左移、试减、商位生成和余数校正。",
      inputs: [
        { name: "dividend", label: "被除数 X", type: "number", value: "45" },
        { name: "divisor", label: "除数 Y", type: "number", value: "6" },
        {
          name: "method",
          label: "算法",
          type: "select",
          value: "restoring",
          options: [
            ["restoring", "恢复余数法"],
            ["non-restoring", "不恢复余数法"],
          ],
        },
        {
          name: "bits",
          label: "位数",
          type: "select",
          value: "8",
          options: [
            ["4", "4 位"],
            ["8", "8 位"],
            ["16", "16 位"],
          ],
        },
      ],
    },
    "float-process-sim": {
      title: "IEEE 754 表示与浮点加减",
      eyebrow: "Floating Point",
      subtitle: "从符号、阶码、尾数字段出发，演示对阶、尾数运算、规格化和舍入。",
      inputs: [
        { name: "a", label: "操作数 A", type: "number", value: "12.75", step: "0.25" },
        { name: "b", label: "操作数 B", type: "number", value: "-3.5", step: "0.25" },
        {
          name: "operation",
          label: "运算",
          type: "select",
          value: "add",
          options: [
            ["add", "A + B"],
            ["sub", "A - B"],
            ["repr", "只拆解表示"],
          ],
        },
      ],
    },
    "memory-hierarchy-sim": {
      title: "存储层次与主存结构",
      eyebrow: "Memory Hierarchy",
      subtitle: "比较 Cache、主存、辅存的速度容量成本权衡，并观察 MAR/MDR 读写路径。",
      inputs: [
        { name: "workingSetMb", label: "工作集 MB", type: "number", value: "64" },
        { name: "cacheKb", label: "Cache KB", type: "number", value: "256" },
        { name: "locality", label: "局部性 %", type: "number", value: "85" },
        {
          name: "operation",
          label: "操作",
          type: "select",
          value: "read",
          options: [
            ["read", "读主存"],
            ["write", "写主存"],
          ],
        },
      ],
    },
    "memory-cell-sim": {
      title: "SRAM / DRAM 单元读写",
      eyebrow: "SRAM / DRAM",
      subtitle: "对比静态保持、动态电容存储、行列地址选通和刷新。",
      inputs: [
        {
          name: "kind",
          label: "存储单元",
          type: "select",
          value: "dram",
          options: [
            ["sram", "SRAM 六管单元"],
            ["dram", "DRAM 一管一容"],
          ],
        },
        {
          name: "operation",
          label: "操作",
          type: "select",
          value: "read",
          options: [
            ["read", "读"],
            ["write", "写"],
            ["refresh", "刷新"],
          ],
        },
        { name: "row", label: "行地址", type: "number", value: "5" },
        { name: "col", label: "列地址", type: "number", value: "3" },
      ],
    },
    "cache-write-sim": {
      title: "Cache 写策略仿真",
      eyebrow: "Cache Write Policy",
      subtitle: "演示写命中/写未命中时写直达、写回、写分配和非写分配的状态差异。",
      inputs: [
        {
          name: "policy",
          label: "写策略",
          type: "select",
          value: "write-back",
          options: [
            ["write-through", "写直达"],
            ["write-back", "写回"],
          ],
        },
        {
          name: "missPolicy",
          label: "写未命中",
          type: "select",
          value: "write-allocate",
          options: [
            ["write-allocate", "写分配"],
            ["no-write-allocate", "非写分配"],
          ],
        },
        {
          name: "hit",
          label: "访问结果",
          type: "select",
          value: "miss",
          options: [
            ["hit", "写命中"],
            ["miss", "写未命中"],
          ],
        },
        { name: "address", label: "地址", type: "text", value: "0x2A" },
      ],
    },
    "cache-locality-sim": {
      title: "Cache 局部性与命中率",
      eyebrow: "Cache Locality",
      subtitle: "切换访问模式，观察时间局部性、空间局部性如何改变 Cache 命中率。",
      inputs: [
        {
          name: "pattern",
          label: "访问模式",
          type: "select",
          value: "loop",
          options: [
            ["sequential", "顺序访问"],
            ["loop", "小循环重复访问"],
            ["stride", "大步长访问"],
            ["random", "离散随机访问"],
          ],
        },
        { name: "accesses", label: "访问次数", type: "number", value: "16" },
        { name: "blockBytes", label: "块大小 B", type: "number", value: "16" },
        { name: "cacheLines", label: "Cache 行数", type: "number", value: "4" },
      ],
    },
    "tlb-access-sim": {
      title: "TLB 与缺页访问流程",
      eyebrow: "TLB / Page Fault",
      subtitle: "从虚拟地址出发，串联 TLB、页表、缺页异常、页面调入和重新访存。",
      inputs: [
        { name: "virtualAddress", label: "虚拟地址", type: "number", value: "2052" },
        { name: "pageSize", label: "页大小 B", type: "number", value: "1024" },
        {
          name: "tlb",
          label: "TLB",
          type: "select",
          value: "miss",
          options: [
            ["hit", "TLB 命中"],
            ["miss", "TLB 未命中"],
          ],
        },
        {
          name: "present",
          label: "页表状态",
          type: "select",
          value: "fault",
          options: [
            ["present", "页在内存"],
            ["fault", "缺页"],
          ],
        },
      ],
    },
    "instruction-format-sim": {
      title: "指令格式与机器码字段拆解",
      eyebrow: "Instruction Format",
      subtitle: "拆解操作码、寄存器号、立即数和地址码，观察 RISC/CISC 组织差异。",
      inputs: [
        {
          name: "format",
          label: "格式",
          type: "select",
          value: "r",
          options: [
            ["r", "R 型：寄存器-寄存器"],
            ["i", "I 型：立即数/访存"],
            ["s", "S 型：存储"],
            ["b", "B 型：条件转移"],
            ["cisc", "CISC 可变长指令"],
          ],
        },
        { name: "opcode", label: "操作码", type: "text", value: "ADD" },
      ],
    },
    "instruction-class-sim": {
      title: "指令类型与数据流",
      eyebrow: "Instruction Classes",
      subtitle: "把指令类型映射到寄存器、ALU、存储器、PC 和 I/O 接口的动作。",
      inputs: [
        {
          name: "kind",
          label: "指令类型",
          type: "select",
          value: "transfer",
          options: [
            ["transfer", "数据传送"],
            ["alu", "算术逻辑"],
            ["shift", "移位"],
            ["branch", "转移"],
            ["io", "输入输出"],
          ],
        },
      ],
    },
    "addressing-mode-sim": {
      title: "寻址方式有效地址计算",
      eyebrow: "Effective Address",
      subtitle: "选择寻址方式，观察形式地址、寄存器、变址/基址和 PC 如何形成 EA。",
      inputs: [
        {
          name: "mode",
          label: "寻址方式",
          type: "select",
          value: "indexed",
          options: [
            ["immediate", "立即寻址"],
            ["direct", "直接寻址"],
            ["indirect", "间接寻址"],
            ["register", "寄存器寻址"],
            ["reg-indirect", "寄存器间接"],
            ["indexed", "变址寻址"],
            ["base", "基址寻址"],
            ["relative", "相对寻址"],
          ],
        },
        { name: "address", label: "形式地址 A", type: "number", value: "120" },
        { name: "register", label: "寄存器 R", type: "number", value: "40" },
        { name: "pc", label: "PC", type: "number", value: "1000" },
      ],
    },
    "cpu-cycle-sim": {
      title: "指令周期与寄存器变化",
      eyebrow: "Instruction Cycle",
      subtitle: "展开取指、间址、执行、中断周期，并跟踪 PC/IR/MAR/MDR/PSW。",
      inputs: [
        {
          name: "instruction",
          label: "指令",
          type: "select",
          value: "load",
          options: [
            ["add", "ADD R1,R2"],
            ["load", "LOAD R1,[A]"],
            ["store", "STORE R1,[A]"],
            ["jump", "JMP A"],
          ],
        },
        {
          name: "indirect",
          label: "间址",
          type: "select",
          value: "no",
          options: [
            ["no", "无间址"],
            ["yes", "需要间址"],
          ],
        },
        {
          name: "interrupt",
          label: "周期末中断",
          type: "select",
          value: "yes",
          options: [
            ["no", "无中断"],
            ["yes", "有中断请求"],
          ],
        },
      ],
    },
    "control-mode-sim": {
      title: "控制方式对比",
      eyebrow: "Control Modes",
      subtitle: "比较同步、异步、联合、硬布线和微程序控制的速度、弹性和实现复杂度。",
      inputs: [
        {
          name: "mode",
          label: "控制方式",
          type: "select",
          value: "combined",
          options: [
            ["sync", "同步控制"],
            ["async", "异步控制"],
            ["combined", "联合控制"],
            ["hardwired", "硬布线控制"],
            ["microprogram", "微程序控制"],
          ],
        },
      ],
    },
    "microinstruction-format-sim": {
      title: "微指令格式与字段编码",
      eyebrow: "Microinstruction Format",
      subtitle: "调整格式和控制信号数量，比较水平型、垂直型和混合型微指令的控制字组织。",
      inputs: [
        {
          name: "format",
          label: "格式",
          type: "select",
          value: "horizontal",
          options: [
            ["horizontal", "水平型 / 直接控制"],
            ["vertical", "垂直型 / 编码控制"],
            ["hybrid", "混合型 / 字段编码"],
          ],
        },
        { name: "signals", label: "控制信号数", type: "number", value: "18" },
        { name: "groups", label: "互斥字段组数", type: "number", value: "4" },
        {
          name: "next",
          label: "下地址形成",
          type: "select",
          value: "conditional",
          options: [
            ["sequential", "顺序 +1"],
            ["conditional", "条件转移"],
            ["mapped", "操作码映射"],
          ],
        },
      ],
    },
    "microprogram-sim": {
      title: "微程序控制器与微指令格式",
      eyebrow: "Microprogram Control",
      subtitle: "在控制存储器中逐条执行微指令，观察控制字段和下一微地址形成。",
      inputs: [
        {
          name: "instruction",
          label: "机器指令",
          type: "select",
          value: "load",
          options: [
            ["load", "LOAD R1,[A]"],
            ["add", "ADD R1,R2"],
            ["store", "STORE R1,[A]"],
          ],
        },
        {
          name: "format",
          label: "微指令格式",
          type: "select",
          value: "horizontal",
          options: [
            ["horizontal", "水平型 / 直接表示"],
            ["vertical", "垂直型 / 编码表示"],
          ],
        },
      ],
    },
    "bus-structure-sim": {
      title: "总线结构与事务路径",
      eyebrow: "Bus Structure",
      subtitle: "比较单总线、双总线和三总线结构中同一事务的并行度与争用。",
      inputs: [
        {
          name: "structure",
          label: "总线结构",
          type: "select",
          value: "single",
          options: [
            ["single", "单总线"],
            ["dual", "双总线"],
            ["triple", "三总线"],
          ],
        },
        {
          name: "transaction",
          label: "事务",
          type: "select",
          value: "memory-read",
          options: [
            ["memory-read", "CPU 读主存"],
            ["io-read", "CPU 读 I/O"],
            ["dma", "DMA 传送"],
          ],
        },
      ],
    },
    "display-device-sim": {
      title: "显示设备扫描与显存",
      eyebrow: "Display Device",
      subtitle: "从字符码或像素帧缓冲出发，观察显存、扫描时序和屏幕输出。",
      inputs: [
        {
          name: "mode",
          label: "显示方式",
          type: "select",
          value: "graphic",
          options: [
            ["char", "字符显示"],
            ["graphic", "图形显示"],
            ["oled", "OLED 像素自发光"],
          ],
        },
        { name: "width", label: "宽度 px", type: "number", value: "800" },
        { name: "height", label: "高度 px", type: "number", value: "600" },
        {
          name: "depth",
          label: "色深",
          type: "select",
          value: "24",
          options: [
            ["1", "单色 1 bit"],
            ["8", "8 bit"],
            ["24", "24 bit"],
            ["32", "32 bit"],
          ],
        },
      ],
    },
    "disk-access-sim": {
      title: "磁盘访问时间估算",
      eyebrow: "Disk Access",
      subtitle: "根据柱面、扇区、转速和传输量估算寻道、旋转延迟和传输时间。",
      inputs: [
        { name: "currentCylinder", label: "当前柱面", type: "number", value: "20" },
        { name: "targetCylinder", label: "目标柱面", type: "number", value: "135" },
        { name: "rpm", label: "转速 RPM", type: "number", value: "7200" },
        { name: "transferKb", label: "传输 KB", type: "number", value: "64" },
      ],
    },
    "raid-ssd-sim": {
      title: "RAID 与 SSD 工作原理",
      eyebrow: "RAID / SSD",
      subtitle: "演示条带化、镜像、奇偶校验恢复，以及 SSD 页写入和块擦除。",
      inputs: [
        {
          name: "mode",
          label: "模式",
          type: "select",
          value: "raid5",
          options: [
            ["raid0", "RAID0 条带化"],
            ["raid1", "RAID1 镜像"],
            ["raid5", "RAID5 校验"],
            ["ssd", "SSD 页/块擦写"],
          ],
        },
      ],
    },
    "io-overview-sim": {
      title: "I/O 系统联系方式总览",
      eyebrow: "I/O Overview",
      subtitle: "把编址、选址、串并行传送、同步/异步联络和连接方式串成一次数据交换。",
      inputs: [
        {
          name: "addressing",
          label: "编址方式",
          type: "select",
          value: "isolated",
          options: [
            ["unified", "统一编址"],
            ["isolated", "独立编址"],
          ],
        },
        {
          name: "transfer",
          label: "传送方式",
          type: "select",
          value: "serial",
          options: [
            ["serial", "串行"],
            ["parallel", "并行"],
          ],
        },
        {
          name: "handshake",
          label: "联络方式",
          type: "select",
          value: "async",
          options: [
            ["immediate", "立即响应"],
            ["sync", "同步时标"],
            ["async", "异步应答"],
          ],
        },
      ],
    },
    "polling-io-sim": {
      title: "程序查询方式",
      eyebrow: "Programmed I/O",
      subtitle: "观察 CPU 如何反复读取状态寄存器，并在设备就绪后搬运数据。",
      inputs: [
        { name: "readyAfter", label: "设备第几次轮询就绪", type: "number", value: "4" },
        { name: "pollCost", label: "每次轮询周期", type: "number", value: "80" },
        { name: "transferCost", label: "传送周期", type: "number", value: "120" },
      ],
    },
    "interrupt-io-sim": {
      title: "程序中断方式",
      eyebrow: "Interrupt I/O",
      subtitle: "演示中断请求、响应、现场保护、中断向量、ISR、嵌套和返回。",
      inputs: [
        {
          name: "priority",
          label: "请求源",
          type: "select",
          value: "keyboard",
          options: [
            ["keyboard", "键盘中断"],
            ["timer", "定时器中断"],
            ["disk", "磁盘中断"],
          ],
        },
        {
          name: "nested",
          label: "嵌套",
          type: "select",
          value: "yes",
          options: [
            ["no", "不允许嵌套"],
            ["yes", "允许高优先级嵌套"],
          ],
        },
      ],
    },
    "dma-transfer-sim": {
      title: "DMA 传送过程",
      eyebrow: "DMA Transfer",
      subtitle: "观察 CPU 预处理、DMA 控制器接管总线、搬运数据和结束中断。",
      inputs: [
        { name: "bytes", label: "传送字节数", type: "number", value: "4096" },
        { name: "wordBytes", label: "字节/总线周期", type: "number", value: "4" },
        {
          name: "mode",
          label: "传送方式",
          type: "select",
          value: "cycle-steal",
          options: [
            ["cycle-steal", "周期窃取"],
            ["burst", "突发传送"],
            ["transparent", "透明 DMA"],
          ],
        },
      ],
    },
    "channel-io-sim": {
      title: "通道方式",
      eyebrow: "I/O Channel",
      subtitle: "演示 CPU 启动通道后，通道程序独立管理外设传送并最终中断通知。",
      inputs: [
        {
          name: "program",
          label: "通道程序",
          type: "select",
          value: "read-block",
          options: [
            ["read-block", "读磁盘块到主存"],
            ["print", "打印缓冲区"],
            ["network", "网卡接收数据"],
          ],
        },
      ],
    },
    "pipeline-performance-sim": {
      title: "流水线性能与时空图",
      eyebrow: "Pipeline Performance",
      subtitle: "由阶段延迟和指令条数推导吞吐率、加速比、效率和瓶颈段。",
      inputs: [
        { name: "instructions", label: "指令条数", type: "number", value: "8" },
        { name: "ifDelay", label: "IF ns", type: "number", value: "2" },
        { name: "idDelay", label: "ID ns", type: "number", value: "1" },
        { name: "exDelay", label: "EX ns", type: "number", value: "3" },
        { name: "memDelay", label: "MEM ns", type: "number", value: "2" },
        { name: "wbDelay", label: "WB ns", type: "number", value: "1" },
      ],
    },
  };

  function $(selector) {
    return document.querySelector(selector);
  }

  function $all(selector) {
    return Array.from(document.querySelectorAll(selector));
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function cleanMarkdownArtifacts(value) {
    return String(value || "").replace(/@@CODE_?\d+@@/g, "").replace(/\s+([，。；：、,.!?])/g, "$1");
  }

  function renderInlineText(value) {
    return escapeHtml(value || "")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/__([^_]+)__/g, "<strong>$1</strong>")
      .replace(/(^|[^\*])\*([^*]+)\*/g, "$1<em>$2</em>")
      .replace(/(^|[^_])_([^_]+)_/g, "$1<em>$2</em>")
      .replace(/\$([^$\n]+)\$/g, "<code>$1</code>");
  }

  function renderInlineMarkdown(value) {
    return cleanMarkdownArtifacts(value)
      .split(/(`[^`]+`)/g)
      .map((segment) => {
        if (segment.startsWith("`") && segment.endsWith("`")) {
          return `<code>${escapeHtml(segment.slice(1, -1))}</code>`;
        }
        return renderInlineText(segment);
      })
      .join("");
  }

  function splitMarkdownCells(line) {
    return line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());
  }

  function renderMarkdown(value) {
    const lines = String(value || "").replace(/\r\n/g, "\n").split("\n");
    const html = [];
    const paragraph = [];
    let listType = "";
    let inCode = false;
    let codeLines = [];

    function flushParagraph() {
      if (!paragraph.length) return;
      html.push(`<p>${renderInlineMarkdown(paragraph.join(" "))}</p>`);
      paragraph.length = 0;
    }

    function closeList() {
      if (!listType) return;
      html.push(`</${listType}>`);
      listType = "";
    }

    function openList(nextType) {
      flushParagraph();
      if (listType === nextType) return;
      closeList();
      html.push(`<${nextType}>`);
      listType = nextType;
    }

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const trimmed = line.trim();

      if (trimmed.startsWith("```")) {
        flushParagraph();
        closeList();
        if (inCode) {
          html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
          codeLines = [];
          inCode = false;
        } else {
          inCode = true;
        }
        continue;
      }

      if (inCode) {
        codeLines.push(line);
        continue;
      }

      if (!trimmed) {
        flushParagraph();
        closeList();
        continue;
      }

      if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
        flushParagraph();
        closeList();
        html.push("<hr>");
        continue;
      }

      if (trimmed.startsWith(">")) {
        flushParagraph();
        closeList();
        html.push(`<blockquote>${renderInlineMarkdown(trimmed.replace(/^>\s?/, ""))}</blockquote>`);
        continue;
      }

      const nextLine = lines[index + 1] || "";
      const isTableStart = /^\|?.+\|.+\|?$/.test(trimmed) && /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(nextLine.trim());
      if (isTableStart) {
        flushParagraph();
        closeList();
        const headers = splitMarkdownCells(trimmed);
        const rows = [];
        index += 2;
        while (index < lines.length && /^\|?.+\|.+\|?$/.test(lines[index].trim())) {
          rows.push(splitMarkdownCells(lines[index]));
          index += 1;
        }
        index -= 1;
        html.push(`
          <div class="table-wrap markdown-table">
            <table>
              <thead><tr>${headers.map((cell) => `<th>${renderInlineMarkdown(cell)}</th>`).join("")}</tr></thead>
              <tbody>
                ${rows
                  .map((row) => `<tr>${row.map((cell) => `<td>${renderInlineMarkdown(cell)}</td>`).join("")}</tr>`)
                  .join("")}
              </tbody>
            </table>
          </div>
        `);
        continue;
      }

      const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed);
      if (heading) {
        flushParagraph();
        closeList();
        const level = Math.min(6, heading[1].length + 1);
        html.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
        continue;
      }

      const ordered = /^\d+\.\s+(.+)$/.exec(trimmed);
      if (ordered) {
        openList("ol");
        html.push(`<li>${renderInlineMarkdown(ordered[1])}</li>`);
        continue;
      }

      const unordered = /^[-*]\s+(.+)$/.exec(trimmed);
      if (unordered) {
        openList("ul");
        html.push(`<li>${renderInlineMarkdown(unordered[1])}</li>`);
        continue;
      }

      closeList();
      paragraph.push(trimmed);
    }

    if (inCode) {
      html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
    }
    flushParagraph();
    closeList();
    return html.join("");
  }

  function setSection(sectionId) {
    if (sectionId !== "simulation") {
      stopCacheAuto();
      stopVirtualMemoryAuto();
      stopKeyboardSimulation({ clearSelection: false });
    }
    $all(".page-section").forEach((section) => {
      section.classList.toggle("active", section.id === sectionId);
    });
    $all(".nav-item").forEach((button) => {
      button.classList.toggle("active", button.dataset.section === sectionId);
    });
    if (sectionId === "simulation") {
      showSimulationCatalog();
    }
  }

  function setSidebarCollapsed(collapsed) {
    document.body.classList.toggle("sidebar-collapsed", collapsed);
    const toggle = $("#sidebarToggle");
    if (toggle) {
      toggle.setAttribute("aria-expanded", String(!collapsed));
      toggle.setAttribute("aria-label", collapsed ? "展开导航" : "收起导航");
      toggle.title = collapsed ? "展开导航" : "收起导航";
    }
  }

  function toggleSidebar() {
    setSidebarCollapsed(!document.body.classList.contains("sidebar-collapsed"));
  }

  function ensureSimulationParamTitle(panel) {
    let title = Array.from(panel.children).find((child) => child.classList?.contains("panel-title"));
    if (!title) {
      title = document.createElement("div");
      title.className = "panel-title compact";
      title.innerHTML = `<h3>场景参数</h3><span>可收起以放大演示区</span>`;
      panel.insertBefore(title, panel.firstChild);
    }
    title.classList.add("sim-param-title");
    return title;
  }

  function findSimulationControlStart(panel) {
    return Array.from(panel.children).find((child) =>
      child.matches?.(".primary-button, .button-row, .datapath-controls, [data-extended-run]")
    );
  }

  function insertSimulationParamToggle(panel, controlStart) {
    if (panel.querySelector(".sim-param-toggle")) return;
    const toggle = document.createElement("button");
    toggle.className = "secondary-button sim-param-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "true");
    toggle.textContent = "收起参数";
    const nextControl = controlStart.nextElementSibling;
    if (controlStart.classList.contains("button-row") || controlStart.classList.contains("datapath-controls")) {
      controlStart.appendChild(toggle);
    } else if (nextControl?.classList.contains("button-row") || nextControl?.classList.contains("datapath-controls")) {
      nextControl.appendChild(toggle);
    } else {
      controlStart.insertAdjacentElement("afterend", toggle);
    }
  }

  function prepareSimulationParameterPanels() {
    const panels = [
      ...$all("#simulation .sim-panel > .two-column > .panel:first-child"),
      ...$all("#simulation .sim-panel > .assembly-layout > .panel:first-child"),
      ...$all("#simulation .sim-panel > .datapath-layout > .panel:first-child"),
    ];
    panels.forEach((panel) => {
      if (panel.classList.contains("sim-control-panel")) return;
      const controlStart = findSimulationControlStart(panel);
      if (!controlStart) return;
      const title = ensureSimulationParamTitle(panel);
      const movable = [];
      let node = title.nextSibling;
      while (node && node !== controlStart) {
        const next = node.nextSibling;
        if (node.nodeType !== Node.TEXT_NODE || node.textContent.trim()) {
          movable.push(node);
        }
        node = next;
      }
      panel.classList.add("sim-control-panel");
      if (!movable.length) return;
      const body = document.createElement("div");
      body.className = "sim-param-body";
      title.insertAdjacentElement("afterend", body);
      movable.forEach((item) => body.appendChild(item));
      insertSimulationParamToggle(panel, controlStart);
    });
  }

  function setSimulationParamsCollapsed(panel, collapsed) {
    if (!panel) return;
    panel.classList.toggle("params-collapsed", collapsed);
    panel.parentElement?.classList.toggle("sim-params-collapsed", collapsed);
    const toggle = panel.querySelector(".sim-param-toggle");
    if (toggle) {
      toggle.setAttribute("aria-expanded", String(!collapsed));
      toggle.textContent = collapsed ? "展开参数" : "收起参数";
    }
  }

  function toggleSimulationParams(button) {
    const panel = button.closest(".sim-control-panel");
    setSimulationParamsCollapsed(panel, !panel?.classList.contains("params-collapsed"));
  }

  function setSimulationPanel(panelId) {
    if (panelId !== "cache-sim") {
      stopCacheAuto();
    }
    if (panelId !== "virtual-sim") {
      stopVirtualMemoryAuto();
    }
    if (panelId !== "keyboard-sim") {
      stopKeyboardSimulation({ clearSelection: false });
    }
    const target = panelId ? document.getElementById(panelId) : null;
    if (!target || !target.classList.contains("sim-panel")) {
      showSimulationCatalog();
      return;
    }
    const catalog = $("#simulationCatalog");
    if (catalog) catalog.classList.remove("active");
    $all(".sim-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.id === panelId);
    });
    $all(".sim-tab").forEach((button) => {
      button.classList.toggle("active", button.dataset.simPanel === panelId);
    });
    $(".main-content")?.scrollTo({ top: 0, behavior: "auto" });
    if (panelId === "keyboard-sim") {
      updateKeyboardRunButton();
      renderKeyboardSimulation();
    }
  }

  function showSimulationCatalog() {
    stopCacheAuto();
    stopVirtualMemoryAuto();
    stopKeyboardSimulation({ clearSelection: false });
    const catalog = $("#simulationCatalog");
    if (catalog) catalog.classList.add("active");
    $all(".sim-panel").forEach((panel) => {
      panel.classList.remove("active");
    });
    $all(".sim-tab").forEach((button) => {
      button.classList.remove("active");
    });
  }

  function renderRecommendedFeatures() {
    const container = $("#recommendedFeatures");
    if (!container) return;
    const shuffled = [...RECOMMENDED_FEATURES];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
    }
    container.innerHTML = shuffled
      .slice(0, 3)
      .map((feature) => `
        <button
          class="action-button recommended-feature"
          data-section="${escapeHtml(feature.section)}"
          ${feature.simPanel ? `data-sim-panel="${escapeHtml(feature.simPanel)}"` : ""}
        >
          <strong>${escapeHtml(feature.title)}</strong>
          <span>${escapeHtml(feature.desc)}</span>
        </button>
      `)
      .join("");
  }

  function renderSimulationCatalog() {
    const simulation = $("#simulation");
    const tabBar = $(".sim-tabs");
    if (!simulation || !tabBar) return;
    let catalog = $("#simulationCatalog");
    if (!catalog) {
      tabBar.insertAdjacentHTML("afterend", `<div id="simulationCatalog" class="simulation-catalog" aria-label="仿真功能总览"></div>`);
      catalog = $("#simulationCatalog");
    }
    const groupLookup = new Map();
    const groups = [];
    SIMULATION_FEATURES.forEach((feature) => {
      const chapter = feature.category || "其他";
      if (!groupLookup.has(chapter)) {
        const group = { chapter, features: [] };
        groupLookup.set(chapter, group);
        groups.push(group);
      }
      groupLookup.get(chapter).features.push(feature);
    });

    catalog.innerHTML = groups
      .map(
        (group, index) => `
          <section class="simulation-chapter-group" aria-label="${escapeHtml(group.chapter)}">
            <div class="simulation-chapter-divider">
              <span>${escapeHtml(group.chapter)}</span>
            </div>
            <div class="simulation-chapter-grid">
              ${group.features
                .map(
                  (feature) => `
                    <button class="simulation-card" data-sim-card="${escapeHtml(feature.id)}">
                      <span>${escapeHtml(feature.category)}</span>
                      <strong>${escapeHtml(feature.title)}</strong>
                      <em>${escapeHtml(feature.desc)}</em>
                    </button>
                  `
                )
                .join("")}
            </div>
          </section>
        `
      )
      .join("");
  }

  function installImportedSimulationPanels() {
    const tabBar = $(".sim-tabs");
    const simulation = $("#simulation");
    if (!tabBar || !simulation) return;
    if ($("#hardwire-sim")) {
      renderSimulationCatalog();
      return;
    }

    const newTabs = [
      ["hardwire-sim", "硬布线控制"],
      ["control-expression-sim", "时序表达式"],
      ["bus-transaction-sim", "总线事务"],
      ["bus-arbitration-sim", "总线仲裁"],
      ["keyboard-sim", "键盘扫描"],
    ];
    tabBar.insertAdjacentHTML(
      "beforeend",
      newTabs
        .map(([panel, label]) => `<button class="sim-tab" data-sim-panel="${panel}">${label}</button>`)
        .join("")
    );

    simulation.insertAdjacentHTML(
      "beforeend",
      `
        <div id="hardwire-sim" class="sim-panel">
          <div class="section-subheading">
            <p class="eyebrow">Hardwired Controller</p>
            <h3>硬布线控制器控制信号形成仿真</h3>
            <div class="concept-note">
              <strong>先看懂这几个词：</strong>
              <span>硬布线控制器用固定逻辑电路产生控制信号，不靠微程序存储器；Im 表示指令译码结果，Bj 表示节拍/状态条件，Tk 表示时钟节拍；微命令就是“让某个寄存器装入、让 ALU 运算、让内存读写”这类具体控制动作。</span>
            </div>
          </div>
          <div class="two-column">
            <div class="panel">
              <div class="panel-title compact">
                <h3>自定义指令场景</h3>
                <span>按节拍观察 Im、Bj、Tk 如何生成微命令</span>
              </div>
              <div class="form-grid">
                <label>
                  <span class="field-label">指令</span>
                  <select id="hardwireOp">
                    <option value="ADD" selected>ADD：Rdest ← Rdest + Rsrc</option>
                    <option value="SUB">SUB：Rdest ← Rdest - Rsrc</option>
                    <option value="MOV">MOV：Rdest ← Rsrc</option>
                    <option value="LOAD">LOAD：Rdest ← M[address]</option>
                  </select>
                </label>
                <label>
                  <span class="field-label">PC 初值</span>
                  <input id="hardwirePC" value="100" />
                </label>
                <label>
                  <span class="field-label">目的寄存器</span>
                  <input id="hardwireDest" value="R1" />
                </label>
                <label>
                  <span class="field-label">源寄存器</span>
                  <input id="hardwireSource" value="R2" />
                </label>
                <label>
                  <span class="field-label">目的寄存器初值</span>
                  <input id="hardwireDestValue" value="5" />
                </label>
                <label>
                  <span class="field-label">源寄存器 / 主存值</span>
                  <input id="hardwireSourceValue" value="3" />
                </label>
                <label>
                  <span class="field-label">访存地址</span>
                  <input id="hardwireAddress" value="0x40" />
                </label>
                <label>
                  <span class="field-label">标志位位宽</span>
                  <input id="hardwireBits" type="number" min="2" max="16" value="8" />
                </label>
              </div>
              <button id="hardwireRun" class="primary-button">生成控制流程</button>
              <div class="button-row">
                <button id="hardwirePrev" class="secondary-button">上一步</button>
                <button id="hardwireNext" class="secondary-button">下一步</button>
                <button id="hardwireAuto" class="secondary-button">自动演示</button>
                <button id="hardwireReset" class="secondary-button">重置</button>
              </div>
            </div>
            <div class="panel result-panel">
              <div class="panel-title">
                <h3>节拍、状态与控制信号</h3>
                <span id="hardwireStepCounter">等待生成</span>
              </div>
              <div id="hardwireResult"></div>
            </div>
          </div>
        </div>

        <div id="control-expression-sim" class="sim-panel">
          <div class="section-subheading">
            <p class="eyebrow">Timing & Control</p>
            <h3>控制信号逻辑表达式推导仿真</h3>
          </div>
          <div class="two-column">
            <div class="panel">
              <div class="panel-title compact">
                <h3>自定义触发条件</h3>
                <span>每行：信号 | 机器周期 | 节拍 | 指令 | 说明</span>
              </div>
              <label class="field-label" for="controlTerms">触发表</label>
              <textarea id="controlTerms" rows="12">RD(I) | M1 | - | ALL | 指令存储器在取指周期持续读
RD(D) | M3 | - | LAD | LAD 在 M3 读取数据存储器
WE(D) | M3 | T3 | STO | STO 在 M3T3 写数据存储器
LDPC | M1 | T4 | ALL | 顺序取指后把 PC+1 写回 PC
LDPC | M2 | T4 | JMP | JMP 在 M2T4 把目标地址写入 PC
LDIR | M1 | T3 | ALL | 指令总线内容打入 IR
LDAR | M2 | T4 | LAD | LAD 把形式地址送入 AR
LDAR | M2 | T4 | STO | STO 把目的地址送入 AR
LDDR | M2 | T3 | MOV+ADD | MOV 或 ADD 的执行结果进入 DR
LDDR | M3 | T3 | LAD | LAD 读出的数据进入 DR
PC+1 | M1 | T3 | ALL | 取指阶段 PC 加 1
LDRy | M2 | T4 | ADD | ADD 结果写回 Ry</textarea>
              <div class="form-grid">
                <label>
                  <span class="field-label">查看信号</span>
                  <select id="controlSignalSelect"></select>
                </label>
                <label>
                  <span class="field-label">默认节拍数</span>
                  <input id="controlTicks" type="number" min="2" max="8" value="4" />
                </label>
              </div>
              <button id="controlRun" class="primary-button">推导表达式</button>
              <div class="button-row">
                <button id="controlPrev" class="secondary-button">上一步</button>
                <button id="controlNext" class="secondary-button">下一步</button>
                <button id="controlAll" class="secondary-button">显示完整式</button>
                <button id="controlReset" class="secondary-button">重置</button>
              </div>
            </div>
            <div class="panel result-panel">
              <div class="panel-title">
                <h3>表达式推导过程</h3>
                <span id="controlStepCounter">等待推导</span>
              </div>
              <div id="controlExpressionResult"></div>
            </div>
          </div>
        </div>

        <div id="bus-transaction-sim" class="sim-panel">
          <div class="section-subheading">
            <p class="eyebrow">Bus Transaction</p>
            <h3>总线基本事务交互仿真</h3>
            <div class="concept-note">
              <strong>先看懂这几个词：</strong>
              <span>一次总线事务就是主设备借用总线完成一次读、写或中断响应；地址总线说明访问哪里，数据总线搬运数据，控制总线说明读/写/中断等动作。MREQ 常表示存储器请求，IORQ 常表示 I/O 请求，RD/WR 分别是读/写控制。</span>
            </div>
          </div>
          <div class="two-column">
            <div class="panel">
              <div class="panel-title compact">
                <h3>自定义总线事务</h3>
                <span>配置目标、地址、数据与控制命令</span>
              </div>
              <div class="form-grid">
                <label>
                  <span class="field-label">事务类型</span>
                  <select id="busOperation">
                    <option value="read-memory" selected>CPU 读取主存</option>
                    <option value="write-memory">CPU 写入主存</option>
                    <option value="read-io">CPU 读取 I/O 端口</option>
                    <option value="interrupt">I/O 发出中断</option>
                  </select>
                </label>
                <label>
                  <span class="field-label">地址 / 端口</span>
                  <input id="busAddress" value="0x2A" />
                </label>
                <label>
                  <span class="field-label">数据</span>
                  <input id="busData" value="10110110" />
                </label>
                <label>
                  <span class="field-label">I/O 设备名</span>
                  <input id="busDeviceName" value="键盘接口" />
                </label>
              </div>
              <button id="busRun" class="primary-button">生成事务</button>
              <div class="button-row">
                <button id="busPrev" class="secondary-button">上一步</button>
                <button id="busNext" class="secondary-button">下一步</button>
                <button id="busAuto" class="secondary-button">自动演示</button>
                <button id="busReset" class="secondary-button">重置</button>
              </div>
            </div>
            <div class="panel result-panel">
              <div class="panel-title">
                <h3>地址 / 数据 / 控制总线</h3>
                <span id="busStepCounter">等待生成</span>
              </div>
              <div id="busTransactionResult"></div>
            </div>
          </div>
        </div>

        <div id="bus-arbitration-sim" class="sim-panel">
          <div class="section-subheading">
            <p class="eyebrow">Bus Arbitration</p>
            <h3>总线仲裁方式交互仿真</h3>
            <div class="concept-note">
              <strong>先看懂这几个词：</strong>
              <span>总线仲裁负责在多个主设备同时请求时选出唯一总线主人。BR 是 Bus Request，表示设备请求总线；BG 是 Bus Grant，表示仲裁器授权使用总线；链式查询按物理顺序传递 BG，独立请求会分别比较各设备请求，分布式仲裁则由设备之间共同竞争。</span>
            </div>
          </div>
          <div class="two-column">
            <div class="panel">
              <div class="panel-title compact">
                <h3>自定义主设备与请求</h3>
                <span>每行设备：名称,优先级,仲裁号</span>
              </div>
              <label class="field-label" for="arbDevices">主设备列表</label>
              <textarea id="arbDevices" rows="5">CPU,4,1010
DMA,3,1100
网卡,2,0111
硬盘,1,1001</textarea>
              <div class="form-grid">
                <label>
                  <span class="field-label">仲裁方式</span>
                  <select id="arbMode">
                    <option value="chain" selected>链式查询</option>
                    <option value="counter">计数器定时查询</option>
                    <option value="parallel">独立请求</option>
                    <option value="distributed">分布式仲裁</option>
                  </select>
                </label>
                <label>
                  <span class="field-label">当前请求设备</span>
                  <input id="arbRequests" value="DMA,网卡,硬盘" />
                </label>
                <label>
                  <span class="field-label">计数器起点</span>
                  <input id="arbCounterStart" type="number" min="0" value="0" />
                </label>
                <label>
                  <span class="field-label">独立请求规则</span>
                  <select id="arbPriorityRule">
                    <option value="priority" selected>按优先级</option>
                    <option value="round">循环优先</option>
                  </select>
                </label>
              </div>
              <button id="arbRun" class="primary-button">开始仲裁</button>
              <div class="button-row">
                <button id="arbPrev" class="secondary-button">上一步</button>
                <button id="arbNext" class="secondary-button">下一步</button>
                <button id="arbAuto" class="secondary-button">自动演示</button>
                <button id="arbReset" class="secondary-button">重置</button>
              </div>
            </div>
            <div class="panel result-panel">
              <div class="panel-title">
                <h3>请求、授权与总线占用</h3>
                <span id="arbStepCounter">等待仲裁</span>
              </div>
              <div id="busArbitrationResult"></div>
            </div>
          </div>
        </div>

        <div id="keyboard-sim" class="sim-panel">
          <div class="section-subheading">
            <p class="eyebrow">Keyboard Matrix</p>
            <h3>矩阵键盘扫描、编码与防抖仿真</h3>
          </div>
          <div class="two-column">
            <div class="panel">
              <div class="panel-title compact">
                <h3>键盘矩阵持续扫描</h3>
                <span>启动后按实体键盘，只有扫描到按键所在行时才显示结果</span>
              </div>
              <button id="keyboardRun" class="primary-button">启动仿真</button>
              <div id="keyboardCaptureStatus" class="empty-state">仿真未启动。</div>
            </div>
            <div class="panel result-panel">
              <div class="panel-title">
                <h3>扫描矩阵与控制器读数</h3>
                <span id="keyboardStepCounter">等待扫描</span>
              </div>
              <div id="keyboardResult"></div>
            </div>
          </div>
        </div>
      `
    );
    const demoStatus = $("#demoStatus");
    if (demoStatus && demoStatus.classList.contains("empty-state")) {
      demoStatus.textContent = "当前支持：知识仿真目录中的全部功能。输入功能名、知识点或关键参数后，会自动跳转到对应仿真并填入演示参数。";
    }
    renderSimulationCatalog();
  }

  function renderExtendedInput(input, panelId) {
    const id = `${panelId}-${input.name}`;
    if (input.type === "select") {
      return `
        <label>
          <span class="field-label">${escapeHtml(input.label)}</span>
          <select id="${escapeHtml(id)}" data-extended-input="${escapeHtml(input.name)}">
            ${input.options.map(([value, label]) => `<option value="${escapeHtml(value)}" ${value === input.value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
          </select>
        </label>
      `;
    }
    if (input.type === "textarea") {
      return `
        <label>
          <span class="field-label">${escapeHtml(input.label)}</span>
          <textarea id="${escapeHtml(id)}" data-extended-input="${escapeHtml(input.name)}" rows="${input.rows || 4}">${escapeHtml(input.value || "")}</textarea>
        </label>
      `;
    }
    return `
      <label>
        <span class="field-label">${escapeHtml(input.label)}</span>
        <input
          id="${escapeHtml(id)}"
          data-extended-input="${escapeHtml(input.name)}"
          type="${escapeHtml(input.type || "text")}"
          value="${escapeHtml(input.value ?? "")}"
          ${input.step ? `step="${escapeHtml(input.step)}"` : ""}
        />
      </label>
    `;
  }

  function installExtendedSimulationPanels() {
    const simulation = $("#simulation");
    if (!simulation || $("#architecture-flow-sim")) {
      renderSimulationCatalog();
      return;
    }
    const html = Object.entries(EXTENDED_SIMULATION_DEFS).map(([panelId, config]) => `
      <div id="${escapeHtml(panelId)}" class="sim-panel extended-sim-panel">
        <div class="section-subheading">
          <p class="eyebrow">${escapeHtml(config.eyebrow)}</p>
          <h3>${escapeHtml(config.title)}</h3>
          <div class="concept-note">
            <strong>演示目标</strong>
            <span>${escapeHtml(config.subtitle)}</span>
          </div>
        </div>
        <div class="two-column">
          <div class="panel">
            <div class="panel-title compact">
              <h3>场景参数</h3>
              <span>调整参数后重新运行，观察过程与指标变化</span>
            </div>
            <div class="form-grid">
              ${config.inputs.map((input) => renderExtendedInput(input, panelId)).join("")}
            </div>
            <button class="primary-button" data-extended-run="${escapeHtml(panelId)}">运行演示</button>
            <div class="button-row">
              <button class="secondary-button" data-extended-prev="${escapeHtml(panelId)}">上一步</button>
              <button class="secondary-button" data-extended-next="${escapeHtml(panelId)}">下一步</button>
              <button class="secondary-button" data-extended-auto="${escapeHtml(panelId)}">自动演示</button>
              <button class="secondary-button" data-extended-reset="${escapeHtml(panelId)}">重置</button>
            </div>
          </div>
          <div class="panel result-panel">
            <div class="panel-title">
              <h3>${escapeHtml(config.title)}</h3>
              <span id="${escapeHtml(panelId)}-counter">等待运行</span>
            </div>
            <div id="${escapeHtml(panelId)}-result" class="extended-result"></div>
          </div>
        </div>
      </div>
    `).join("");
    simulation.insertAdjacentHTML("beforeend", html);
    renderSimulationCatalog();
  }

  function readExtendedInputs(panelId) {
    const panel = document.getElementById(panelId);
    const values = {};
    if (!panel) return values;
    panel.querySelectorAll("[data-extended-input]").forEach((input) => {
      values[input.dataset.extendedInput] = input.value;
    });
    return values;
  }

  function toNumber(value, fallback = 0) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function toPositiveInt(value, fallback = 1) {
    const parsed = Math.trunc(toNumber(value, fallback));
    return parsed > 0 ? parsed : fallback;
  }

  function binary(value, bits) {
    return formatBinary(value, bits);
  }

  function signedFromUnsignedLocal(unsigned, bits) {
    const sign = 2 ** (bits - 1);
    const mod = 2 ** bits;
    return unsigned >= sign ? unsigned - mod : unsigned;
  }

  function runExtendedSimulation(panelId) {
    stopExtendedSimulationAuto(panelId);
    try {
      const values = readExtendedInputs(panelId);
      const result = createExtendedSimulation(panelId, values);
      result.panelId = panelId;
      result.values = values;
      state.extended[panelId] = { result, cursor: 0, timer: null };
      renderExtendedSimulation(panelId);
    } catch (error) {
      state.extended[panelId] = { result: null, cursor: 0, timer: null };
      const counter = $(`#${panelId}-counter`);
      const resultEl = $(`#${panelId}-result`);
      if (counter) counter.textContent = "输入有误";
      if (resultEl) resultEl.innerHTML = `<div class="status-error">${escapeHtml(error.message)}</div>`;
    }
  }

  function stepExtendedSimulation(panelId, delta) {
    const entry = state.extended[panelId];
    if (!entry || !entry.result) {
      runExtendedSimulation(panelId);
      return;
    }
    const max = entry.result.steps.length - 1;
    entry.cursor = clamp(entry.cursor + delta, 0, max);
    renderExtendedSimulation(panelId);
    if (entry.cursor >= max) stopExtendedSimulationAuto(panelId);
  }

  function resetExtendedSimulation(panelId) {
    stopExtendedSimulationAuto(panelId);
    const entry = state.extended[panelId];
    if (entry && entry.result) {
      entry.cursor = 0;
      renderExtendedSimulation(panelId);
    } else {
      runExtendedSimulation(panelId);
    }
  }

  function stopExtendedSimulationAuto(panelId) {
    const entry = state.extended[panelId];
    if (entry && entry.timer) {
      window.clearInterval(entry.timer);
      entry.timer = null;
    }
    const button = document.querySelector(`[data-extended-auto="${panelId}"]`);
    if (button) button.textContent = "自动演示";
  }

  function toggleExtendedSimulationAuto(panelId) {
    let entry = state.extended[panelId];
    if (!entry || !entry.result) {
      runExtendedSimulation(panelId);
      entry = state.extended[panelId];
    }
    if (!entry || !entry.result) return;
    if (entry.timer) {
      stopExtendedSimulationAuto(panelId);
      return;
    }
    const button = document.querySelector(`[data-extended-auto="${panelId}"]`);
    if (button) button.textContent = "暂停演示";
    entry.timer = window.setInterval(() => {
      if (!document.getElementById(panelId)?.classList.contains("active")) {
        stopExtendedSimulationAuto(panelId);
        return;
      }
      stepExtendedSimulation(panelId, 1);
    }, 900);
  }

  function renderMetricGrid(metrics = []) {
    if (!metrics.length) return "";
    return `
      <div class="mini-state-grid extended-metrics">
        ${metrics.map((item) => `<div><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.value)}</span></div>`).join("")}
      </div>
    `;
  }

  function renderExtendedTable(table) {
    if (!table || !table.headers || !table.rows) return "";
    return `
      <div class="table-wrap">
        <table>
          <thead><tr>${table.headers.map((head) => `<th>${escapeHtml(head)}</th>`).join("")}</tr></thead>
          <tbody>
            ${table.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderNodeGrid(nodes = [], active = []) {
    if (!nodes.length) return "";
    const activeSet = new Set(active);
    return `
      <div class="extended-node-grid">
        ${nodes.map((node) => `
          <div class="extended-node ${activeSet.has(node.id) ? "active" : ""}">
            <strong>${escapeHtml(node.title)}</strong>
            <span>${escapeHtml(node.detail)}</span>
          </div>
        `).join("")}
      </div>
    `;
  }

  function compactSvgText(value, maxLength = 18) {
    const text = String(value ?? "");
    return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
  }

  function metricValue(result, label, fallback = "-") {
    return result.metrics?.find((item) => item.label === label)?.value ?? fallback;
  }

  const EXTENDED_ANIMATION_SPECS = {
    "architecture-flow-sim": {
      layout: "flow",
      token: "指令/数据",
      order: ["software", "input", "memory", "control", "alu", "output"],
      example: (values) => `示例程序：${values.program === "io" ? "输入设备到输出设备" : values.program === "load" ? "从内存取数再计算" : "C = A + B"}`,
    },
    "history-timeline-sim": {
      layout: "cycle",
      token: "代际演进",
      order: ["time", "device", "hardware", "software", "application"],
      example: (values, result) => `示例阶段：${metricValue(result, "阶段")}，观察器件到应用的变化`,
    },
    "performance-metrics-sim": {
      layout: "flow",
      token: "计算量",
      order: ["ic", "cpi", "clock", "time", "throughput"],
      example: (values) => `示例：${Number(toNumber(values.instructions, 0)).toLocaleString()} 条指令，CPI=${values.cpi}，主频 ${values.clockGhz}GHz`,
    },
    "number-format-sim": {
      layout: "stack",
      token: "编码转换",
      order: ["truth", "sign", "ones", "twos", "excess"],
      example: (values) => `示例：真值 ${values.value} 的 ${values.bits} 位机器数表示`,
    },
    "alu-carry-sim": {
      layout: "flow",
      token: "进位",
      order: ["a", "b", "adder", "cla", "flags"],
      example: (values) => `示例：A=${values.a}，B=${values.b}，执行 ${String(values.op || "add").toUpperCase()}`,
    },
    "fixed-multiply-sim": {
      layout: "flow",
      token: "部分积",
      order: ["x", "y", "recoder", "partial", "adder", "product"],
      example: (values) => `示例：${values.multiplicand} × ${values.multiplier} 的 ${values.method} 过程`,
    },
    "fixed-division-sim": {
      layout: "flow",
      token: "商位",
      order: ["dividend", "divisor", "remainder", "subtract", "quotient"],
      example: (values) => `示例：${values.dividend} ÷ ${values.divisor} 的 ${values.method} 过程`,
    },
    "float-process-sim": {
      layout: "flow",
      token: "尾数",
      order: ["a", "b", "align", "mantissa", "normalize", "result"],
      example: (values) => `示例：${values.operation === "sub" ? `${values.a} - ${values.b}` : values.operation === "repr" ? `${values.a} 的 IEEE 754 字段` : `${values.a} + ${values.b}`}`,
    },
    "memory-hierarchy-sim": {
      layout: "bus",
      token: "访存请求",
      order: ["cpu", "bus", "cache", "main", "secondary"],
      example: (values, result) => `示例：${values.operation === "write" ? "写" : "读"}请求，估计命中率 ${metricValue(result, "估计命中率")}`,
    },
    "memory-cell-sim": {
      layout: "stack",
      token: "电荷/电平",
      order: ["row", "col", "cell", "sense", "refresh"],
      example: (values) => `示例：${values.kind?.toUpperCase()} 单元，Row=${values.row}，Col=${values.col}`,
    },
    "cache-write-sim": {
      layout: "flow",
      token: "写数据",
      order: ["cpu", "tag", "cache", "dirty", "memory"],
      example: (values) => `示例：地址 ${values.address}，${values.policy} / ${values.missPolicy}`,
    },
    "cache-locality-sim": {
      layout: "flow",
      token: "地址块",
      order: ["cpu", "block", "index", "tag", "fill", "rate"],
      example: (values, result) => `示例：${values.pattern} 模式，命中率 ${metricValue(result, "命中率")}`,
    },
    "tlb-access-sim": {
      layout: "flow",
      token: "页号",
      order: ["va", "tlb", "pt", "fault", "disk", "pa"],
      example: (values, result) => `示例：VA=${values.virtualAddress}，PA=${metricValue(result, "物理地址")}`,
    },
    "instruction-format-sim": {
      layout: "stack",
      token: "字段",
      order: ["prefix", "opcode", "rd", "rs1", "rs2", "funct", "modrm", "disp", "imm", "offset"],
      example: (values) => `示例：${String(values.format || "r").toUpperCase()} 格式，opcode=${String(values.opcode || "ADD").toUpperCase()}`,
    },
    "instruction-class-sim": {
      layout: "bus",
      token: "控制信号",
      order: ["control", "reg", "alu", "shifter", "mem", "pc", "io", "bus", "flags"],
      example: (values, result) => `示例：${metricValue(result, "指令类型")} 指令的数据流`,
    },
    "addressing-mode-sim": {
      layout: "flow",
      token: "地址",
      order: ["instr", "reg", "pc", "memory", "ea", "operand"],
      example: (values, result) => `示例：${values.mode} 寻址，EA=${metricValue(result, "EA")}`,
    },
    "cpu-cycle-sim": {
      layout: "cycle",
      token: "微操作",
      order: ["pc", "mar", "memory", "mdr", "ir", "control", "alu", "psw"],
      example: (values, result) => `示例：${metricValue(result, "指令")} 的指令周期`,
    },
    "control-mode-sim": {
      layout: "flow",
      token: "控制节拍",
      order: ["clock", "decoder", "logic", "datapath"],
      example: (values, result) => `示例：${metricValue(result, "方式")} 如何生成控制信号`,
    },
    "microinstruction-format-sim": {
      layout: "stack",
      token: "字段位",
      order: ["signals", "constraint", "encode", "decoder", "next", "word"],
      example: (values, result) => `示例：${metricValue(result, "格式")}，微指令字长 ${metricValue(result, "微指令字长")}`,
    },
    "microprogram-sim": {
      layout: "cycle",
      token: "微地址",
      order: ["cm", "car", "mir", "decoder", "datapath", "next"],
      example: (values, result) => `示例：${metricValue(result, "机器指令")} 的微程序执行`,
    },
    "bus-structure-sim": {
      layout: "bus",
      token: "总线事务",
      order: ["cpu", "bus", "control", "memory", "io"],
      example: (values, result) => `示例：${metricValue(result, "结构")} 执行 ${values.transaction}`,
    },
    "display-device-sim": {
      layout: "flow",
      token: "像素/字符",
      order: ["cpu", "vram", "scan", "panel"],
      example: (values, result) => `示例：${values.width}×${values.height}，帧缓冲 ${metricValue(result, "帧缓冲")}`,
    },
    "disk-access-sim": {
      layout: "flow",
      token: "磁头/数据",
      order: ["arm", "track", "sector", "transfer"],
      example: (values, result) => `示例：柱面 ${values.currentCylinder} -> ${values.targetCylinder}，总时间 ${metricValue(result, "总时间")}`,
    },
    "raid-ssd-sim": {
      layout: "matrix",
      token: "数据块",
      order: ["stripe", "disk0", "disk1", "mirror", "parity", "rebuild", "ftl", "page", "block"],
      example: (values, result) => `示例：${metricValue(result, "模式")} 的数据组织与恢复/擦写`,
    },
    "io-overview-sim": {
      layout: "bus",
      token: "I/O 数据",
      order: ["cpu", "addr", "select", "transfer", "handshake", "device"],
      example: (values, result) => `示例：${metricValue(result, "编址")}编址，${metricValue(result, "传送")}传送`,
    },
    "polling-io-sim": {
      layout: "cycle",
      token: "轮询",
      order: ["cpu", "status", "device", "data"],
      example: (values, result) => `示例：查询 ${metricValue(result, "查询次数")} 次后就绪，忙等占比 ${metricValue(result, "忙等占比")}`,
    },
    "interrupt-io-sim": {
      layout: "flow",
      token: "IRQ",
      order: ["device", "mask", "cpu", "stack", "vector", "isr"],
      example: (values, result) => `示例：${metricValue(result, "中断源")}中断，嵌套=${metricValue(result, "嵌套")}`,
    },
    "dma-transfer-sim": {
      layout: "bus",
      token: "数据块",
      order: ["cpu", "dma", "bus", "memory", "device", "irq"],
      example: (values, result) => `示例：${metricValue(result, "传送字节")}，${metricValue(result, "方式")} 方式`,
    },
    "channel-io-sim": {
      layout: "bus",
      token: "通道命令",
      order: ["cpu", "ccw", "channel", "controller", "memory", "irq"],
      example: (values, result) => `示例：${metricValue(result, "任务")}，CPU 只启动和响应`,
    },
    "pipeline-performance-sim": {
      layout: "pipeline",
      token: "指令",
      order: ["IF", "ID", "EX", "MEM", "WB"],
      example: (values, result) => `示例：${values.instructions} 条指令，加速比 ${metricValue(result, "加速比")}`,
    },
  };

  function buildExtendedAnimationScene(panelId, result) {
    const spec = EXTENDED_ANIMATION_SPECS[panelId] || {};
    const nodeMap = new Map((result.nodes || []).map((node) => [node.id, node]));
    const orderedIds = [];
    (spec.order || []).forEach((id) => {
      if (nodeMap.has(id) && !orderedIds.includes(id)) orderedIds.push(id);
    });
    (result.nodes || []).forEach((node) => {
      if (!orderedIds.includes(node.id)) orderedIds.push(node.id);
    });
    const actors = orderedIds.map((id) => {
      const node = nodeMap.get(id) || { id, title: id, detail: "" };
      return { id, title: node.title, detail: node.detail };
    });
    return {
      layout: spec.layout || "flow",
      token: spec.token || "信号",
      example: typeof spec.example === "function" ? spec.example(result.values || {}, result) : spec.example || "示例：按当前参数执行一步完整过程",
      actors,
      registers: (result.metrics || []).slice(0, 4),
    };
  }

  function layoutExtendedActors(actors, layout) {
    const width = 720;
    const height = layout === "pipeline" ? 230 : layout === "cycle" ? 300 : 280;
    const boxWidth = layout === "pipeline" ? 96 : 112;
    const boxHeight = 56;
    const positions = new Map();
    const count = Math.max(1, actors.length);

    actors.forEach((actor, index) => {
      let x = 40;
      let y = 70;
      if (layout === "cycle") {
        const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count;
        x = 360 + Math.cos(angle) * 230 - boxWidth / 2;
        y = 150 + Math.sin(angle) * 92 - boxHeight / 2;
      } else if (layout === "bus") {
        const columns = Math.min(4, count);
        const col = index % columns;
        const row = Math.floor(index / columns);
        x = 45 + col * 165;
        y = row % 2 === 0 ? 42 : 182;
      } else if (layout === "stack") {
        const columns = Math.min(3, count);
        const col = index % columns;
        const row = Math.floor(index / columns);
        x = 80 + col * 205;
        y = 38 + row * 92;
      } else {
        const columns = layout === "pipeline" ? count : Math.min(4, count);
        const col = index % columns;
        const row = Math.floor(index / columns);
        const colWidth = (width - 100) / Math.max(1, columns - 1);
        x = 50 + col * colWidth - (layout === "pipeline" ? 0 : boxWidth / 2);
        y = layout === "pipeline" ? 84 : 48 + row * 104;
      }
      positions.set(actor.id, { x, y, width: boxWidth, height: boxHeight, cx: x + boxWidth / 2, cy: y + boxHeight / 2 });
    });

    return { width, height, positions };
  }

  function isActiveStep(step, ...ids) {
    const active = new Set(step.active || []);
    return ids.some((id) => active.has(id));
  }

  function rowValue(result, rowIndex, colIndex, fallback = "-") {
    return result.table?.rows?.[rowIndex]?.[colIndex] ?? fallback;
  }

  function renderStatePills(items = []) {
    if (!items.length) return "";
    return `
      <div class="domain-pills">
        ${items.map((item) => `
          <span class="${item.active ? "active" : ""}">
            <strong>${escapeHtml(item.label)}</strong>
            ${escapeHtml(item.value)}
          </span>
        `).join("")}
      </div>
    `;
  }

  function renderBitStrip(label, bits, options = -1) {
    const config = typeof options === "number" ? { activeIndex: options } : (options || {});
    const activeIndex = config.activeIndex ?? -1;
    const bitClass = typeof config.bitClass === "function" ? config.bitClass : () => "";
    const rowClass = ["bit-strip", config.activeRow ? "active-row" : ""].filter(Boolean).join(" ");
    return `
      <div class="${rowClass}">
        <strong>${escapeHtml(label)}</strong>
        <div>
          ${String(bits).split("").map((bit, index) => {
            const classes = [index === activeIndex ? "active" : "", bitClass(bit, index)].filter(Boolean).join(" ");
            return `<span class="${classes}">${escapeHtml(bit)}</span>`;
          }).join("")}
        </div>
      </div>
    `;
  }

  function renderDomainFrame(kind, title, detail, body, registers = []) {
    return `
      <div class="extended-animation domain-animation ${escapeHtml(kind)}">
        <div class="animation-heading">
          <strong>${escapeHtml(title)}</strong>
          <span>${escapeHtml(detail)}</span>
        </div>
        <div class="domain-stage">
          ${body}
        </div>
        ${registers.length ? `<div class="animation-registers">${registers.map((item) => `<span><strong>${escapeHtml(item.label)}</strong>${escapeHtml(item.value)}</span>`).join("")}</div>` : ""}
      </div>
    `;
  }

  function renderMachineBlocks(items = []) {
    return `
      <div class="machine-blocks">
        ${items.map((item) => `
          <div class="machine-block ${item.active ? "active" : ""}">
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.detail)}</span>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderArchitectureDomain(result, step, index) {
    const values = result.values || {};
    const program = values.program === "io" ? "IN R1; OUT R1" : values.program === "load" ? "LOAD R1,[A]; ADD R2,R1" : "LOAD A; LOAD B; ADD; STORE C";
    const body = `
      <svg class="arch-svg" viewBox="0 0 720 260" role="img" aria-label="冯诺依曼结构执行实例">
        <rect class="device-box ${isActiveStep(step, "software") ? "active" : ""}" x="30" y="30" width="130" height="70" rx="8"></rect>
        <text x="50" y="58">高级语言/软件</text>
        <text x="50" y="82">${escapeHtml(compactSvgText(program, 18))}</text>
        <rect class="memory-bank ${isActiveStep(step, "memory") ? "active" : ""}" x="210" y="22" width="150" height="142" rx="8"></rect>
        ${["00 LOAD A", "01 LOAD B", "02 ADD", "03 STORE C"].map((line, i) => `<rect class="memory-slot ${index === i + 1 ? "active" : ""}" x="225" y="${42 + i * 27}" width="120" height="20" rx="4"></rect><text x="236" y="${57 + i * 27}">${line}</text>`).join("")}
        <rect class="cpu-shell ${isActiveStep(step, "control", "alu") ? "active" : ""}" x="430" y="28" width="210" height="138" rx="10"></rect>
        <text x="455" y="55">CPU</text>
        <rect class="register-cell ${isActiveStep(step, "control") ? "active" : ""}" x="455" y="72" width="70" height="34" rx="6"></rect>
        <text x="472" y="94">PC/IR</text>
        <rect class="register-cell ${isActiveStep(step, "alu") ? "active" : ""}" x="545" y="72" width="70" height="34" rx="6"></rect>
        <text x="567" y="94">ALU</text>
        <path class="data-path active" d="M160 65 C185 65 185 92 210 92" />
        <path class="data-path ${index >= 2 ? "active" : ""}" d="M360 92 C392 92 398 92 430 92" />
        <path class="data-path ${index >= 4 ? "active" : ""}" d="M535 166 C535 210 210 210 210 130" />
        <circle class="moving-packet" r="7"><animateMotion dur="1.3s" repeatCount="indefinite" path="M160 65 C185 65 185 92 210 92 C392 92 398 92 430 92" /></circle>
      </svg>
      ${renderStatePills([
        { label: "程序", value: program, active: true },
        { label: "当前拍", value: step.title, active: true },
        { label: "PC", value: `0${Math.min(index, 3)}`, active: isActiveStep(step, "control") },
        { label: "IR", value: index >= 2 ? "ADD" : "LOAD", active: isActiveStep(step, "memory") },
      ])}
    `;
    return renderDomainFrame("arch-domain", "存储程序执行动画", "指令从内存进入 CPU，数据经 ALU 加工后写回。", body, result.metrics);
  }

  function renderHistoryDomain(result, step, index) {
    const stages = [
      ["电子管", "tube", "机房级"],
      ["晶体管", "transistor", "可靠性提升"],
      ["集成电路", "ic", "小型化"],
      ["VLSI", "chip", "微处理器"],
    ];
    const body = `
      <div class="history-simulator">
        ${stages.map((stage, i) => `
          <div class="history-era ${i <= index ? "active" : ""}">
            <div class="era-icon ${stage[1]}"></div>
            <strong>${stage[0]}</strong>
            <span>${stage[2]}</span>
          </div>
        `).join("")}
      </div>
      <div class="metric-bars">
        <span style="--bar:${Math.min(95, 25 + index * 18)}%"><strong>速度</strong></span>
        <span style="--bar:${Math.max(18, 80 - index * 14)}%"><strong>体积</strong></span>
        <span style="--bar:${Math.max(20, 78 - index * 11)}%"><strong>功耗</strong></span>
      </div>
    `;
    return renderDomainFrame("history-domain", "计算机代际演进动画", `当前观察：${metricValue(result, "阶段")}`, body, result.metrics);
  }

  function renderPerformanceDomain(result, step, index) {
    const cycles = metricValue(result, "总周期");
    const body = `
      <div class="formula-machine">
        ${["指令条数", "CPI", "周期数", "主频", "CPU 时间", "MIPS"].map((label, i) => `
          <div class="formula-station ${i <= index ? "active" : ""}">
            <strong>${label}</strong>
            <span>${i === 2 ? cycles : i === 4 ? metricValue(result, "CPU 时间") : i === 5 ? metricValue(result, "MIPS") : "输入"}</span>
          </div>
        `).join("")}
      </div>
      <div class="animated-counter">
        <div><strong>总周期</strong><span>${escapeHtml(cycles)}</span></div>
        <div><strong>吞吐率</strong><span>${escapeHtml(metricValue(result, "MIPS"))} MIPS</span></div>
      </div>
    `;
    return renderDomainFrame("performance-domain", "性能指标计算器动画", "输入参数逐级进入公式计算单元。", body, result.metrics);
  }

  function renderNumberFormatDomain(result, step, index) {
    const rows = result.table?.rows || [];
    const rowIds = ["sign", "ones", "twos", "excess"];
    const activeSet = new Set(step.active || []);
    const value = Math.trunc(toNumber(result.values?.value, 0));
    const rowValue = (id) => result.nodes?.find((node) => node.id === id)?.detail || "";
    const signCode = rowValue("sign") || rows[0]?.[1] || "";
    const onesCode = rowValue("ones") || rows[1]?.[1] || "";
    const twosCode = rowValue("twos") || rows[2]?.[1] || "";
    const excessCode = rowValue("excess") || rows[3]?.[1] || "";
    const bitCount = Math.max(signCode.length, twosCode.length, excessCode.length, 1);
    const bias = 2 ** (bitCount - 1);
    const isNegative = value < 0;
    const activeRow = (rowIndex) => {
      const id = rowIds[rowIndex];
      return index === 0 ? rowIndex === 0 : activeSet.has(id);
    };
    const bitClassFor = (rowIndex) => (bit, bitIndex) => {
      const id = rowIds[rowIndex];
      const classes = [];
      if (bitIndex === 0) classes.push("sign-bit");
      if (!activeRow(rowIndex)) return classes.join(" ");
      if (id === "sign") classes.push(bitIndex === 0 ? "active" : "value-bit");
      if (id === "ones" && isNegative && bitIndex > 0) classes.push("active");
      if (id === "twos" && isNegative) classes.push(bitIndex === bitCount - 1 ? "carry-bit active" : "value-bit");
      if (id === "excess") classes.push(bitIndex === 0 ? "active" : "value-bit");
      return classes.join(" ");
    };
    const operations = [
      {
        label: "符号位 + 绝对值",
        detail: `${value} -> ${signCode}`,
        active: index <= 1,
        done: index > 1,
      },
      {
        label: "数值位取反",
        detail: isNegative ? `${signCode} -> ${onesCode}` : "正数不变",
        active: index === 2,
        done: index > 2,
      },
      {
        label: "反码 + 1",
        detail: isNegative ? `${onesCode} + 1 -> ${twosCode}` : "正数不变",
        active: index === 3,
        done: index > 3,
      },
      {
        label: "偏置 / 移码",
        detail: `${value} + ${bias} -> ${excessCode}`,
        active: index === 4,
        done: false,
      },
    ];
    const body = `
      <div class="encoding-board">
        ${rows.map(([label, bits], rowIndex) => renderBitStrip(label, bits, {
          activeRow: activeRow(rowIndex),
          bitClass: bitClassFor(rowIndex),
        })).join("")}
      </div>
      <div class="sign-magnitude-widget number-transform-steps">
        ${operations.map((item) => `
          <span class="${item.active ? "active" : item.done ? "done" : ""}">
            <strong>${escapeHtml(item.label)}</strong>
            <em>${escapeHtml(item.detail)}</em>
          </span>
        `).join("")}
      </div>
    `;
    return renderDomainFrame("number-domain", "机器数编码动画", "同一真值在不同机器数表示间逐步转换。", body, result.metrics);
  }

  function renderAluDomain(result, step, index) {
    const trace = result.aluTrace || (result.table?.rows || []).map((row) => ({
      bit: row[0],
      ai: row[1],
      bi: row[2],
      cin: row[3],
      si: row[4],
      cout: row[5],
    }));
    const traceIndex = typeof step.traceIndex === "number"
      ? step.traceIndex
      : Math.min(Math.max(index - 2, -1), trace.length);
    const body = `
      <div class="alu-array">
        ${trace.map((row, i) => `
          <div class="full-adder-cell ${i === traceIndex ? "active" : i < traceIndex ? "done" : ""}">
            <strong>${escapeHtml(row.bit)}</strong>
            <span>A=${escapeHtml(row.ai)} B=${escapeHtml(row.bi)}</span>
            <em>Cin ${escapeHtml(row.cin)} -> S ${escapeHtml(row.si)}</em>
            <small>Cout ${escapeHtml(row.cout)}</small>
          </div>
        `).join("")}
      </div>
      <div class="flag-register">
        ${result.metrics.map((item) => `<span><strong>${escapeHtml(item.label)}</strong>${escapeHtml(item.value)}</span>`).join("")}
      </div>
    `;
    return renderDomainFrame("alu-domain", "ALU 全加器阵列动画", "进位从低位向高位传播，标志位同步更新。", body, result.metrics);
  }

  function renderMultiplyDomain(result, step, index) {
    const trace = result.multiplyTrace || [];
    const traceIndex = typeof step.traceIndex === "number"
      ? step.traceIndex
      : Math.min(Math.max(index - 1, -1), trace.length - 1);
    const activeTrace = traceIndex >= 0 ? trace[traceIndex] : null;
    const isBooth = result.multiplyMode === "booth";
    const currentA = activeTrace?.afterShiftA || result.initialA || "-";
    const currentQ = activeTrace?.afterShiftQ || result.initialQ || "-";
    const currentJudge = activeTrace?.pair || (isBooth ? "Q0Q-1=--" : "Y位=--");
    const currentAction = activeTrace?.action || "等待装入";
    const currentProduct = activeTrace?.productRegister || result.productRegister || metricValue(result, "结果");
    const body = `
      <div class="multiply-registers">
        <div class="multiply-register-card active">
          <strong>M 被乘数</strong>
          <span>${escapeHtml(result.multiplicandRegister || "-")}</span>
          <em>${escapeHtml(result.multiplicandDecimal || "")}</em>
        </div>
        <div class="multiply-register-card ${activeTrace ? "active" : ""}">
          <strong>${isBooth ? "A 累加器" : "ACC 累加器"}</strong>
          <span>${escapeHtml(currentA)}</span>
          <em>${activeTrace?.afterOpA ? `运算后 ${escapeHtml(activeTrace.afterOpA)}` : "等待本轮运算"}</em>
        </div>
        <div class="multiply-register-card ${activeTrace ? "active" : ""}">
          <strong>Q 乘数寄存器</strong>
          <span>${escapeHtml(currentQ)}</span>
          <em>${isBooth ? `Q-1=${escapeHtml(activeTrace?.afterQMinus1 ?? result.initialQMinus1 ?? "0")}` : "逐位查看乘数"}</em>
        </div>
        <div class="multiply-register-card ${activeTrace ? "active" : ""}">
          <strong>${isBooth ? "Booth 判别" : "乘数位判别"}</strong>
          <span>${escapeHtml(currentJudge)}</span>
          <em>${escapeHtml(currentAction)}</em>
        </div>
        <div class="multiply-register-card ${traceIndex >= 0 ? "active" : ""}">
          <strong>本轮动作</strong>
          <span>${escapeHtml(currentAction)}</span>
          <em>${escapeHtml(activeTrace?.shiftDetail || "按步骤推进查看变化")}</em>
        </div>
        <div class="multiply-register-card ${traceIndex >= trace.length - 1 ? "active" : ""}">
          <strong>乘积寄存器</strong>
          <span>${escapeHtml(currentProduct)}</span>
          <em>${escapeHtml(activeTrace?.productDecimal || result.productDecimal || "")}</em>
        </div>
      </div>
      <div class="multiply-trace">
        ${trace.map((row, i) => `
          <span class="${i === traceIndex ? "active" : i < traceIndex ? "done" : ""}">
            <strong>${escapeHtml(row.round)}</strong>
            <em>${escapeHtml(`${row.pair} / ${row.action}`)}</em>
          </span>
        `).join("")}
      </div>
    `;
    return renderDomainFrame("multiply-domain", "定点乘法寄存器动画", "Booth/移位加法每一步都会改变判别位、部分积和乘积寄存器。", body, result.metrics);
  }

  function renderDivisionDomain(result, step, index) {
    const trace = result.divisionTrace || [];
    const traceIndex = typeof step.traceIndex === "number"
      ? step.traceIndex
      : Math.min(Math.max(index - 1, -1), trace.length - 1);
    const activeTrace = traceIndex >= 0 ? trace[traceIndex] : null;
    const currentR = activeTrace?.afterR ?? result.initialR ?? "0";
    const currentQ = activeTrace?.quotientRegister || result.initialQ || binary(0, result.divisionBits || 8);
    const currentBit = activeTrace ? `${activeTrace.bit} = ${activeTrace.incomingBit}` : "等待装入";
    const currentOperation = activeTrace?.operation || "等待试算";
    const currentDecision = activeTrace?.decision || "按高位到低位逐轮生成商位";
    const body = `
      <div class="division-register-grid">
        <div class="divider-register ${activeTrace ? "active" : ""}">
          <strong>R 余数寄存器</strong>
          <span>${escapeHtml(String(currentR))}</span>
          <em>${escapeHtml(activeTrace?.shiftDetail || "初值为 0")}</em>
        </div>
        <div class="divider-register active">
          <strong>M 除数</strong>
          <span>${escapeHtml(result.divisorRegister || metricValue(result, "除数") || "M")}</span>
          <em>${escapeHtml(result.divisorDecimal || "")}</em>
        </div>
        <div class="divider-register ${activeTrace ? "active" : ""}">
          <strong>Q 商寄存器</strong>
          <span>${escapeHtml(currentQ)}</span>
          <em>${escapeHtml(activeTrace?.quotientDetail || "逐位写入商位")}</em>
        </div>
        <div class="divider-register ${activeTrace ? "active" : ""}">
          <strong>引入被除数位</strong>
          <span>${escapeHtml(currentBit)}</span>
          <em>${escapeHtml(activeTrace?.round || "")}</em>
        </div>
        <div class="divider-register ${activeTrace ? "active" : ""}">
          <strong>本轮试算</strong>
          <span>${escapeHtml(currentOperation)}</span>
          <em>${escapeHtml(activeTrace?.trialDetail || "")}</em>
        </div>
        <div class="divider-register ${traceIndex >= trace.length - 1 ? "active" : ""}">
          <strong>判别 / 校正</strong>
          <span>${escapeHtml(currentDecision)}</span>
          <em>${escapeHtml(activeTrace?.correction || "")}</em>
        </div>
      </div>
      <div class="division-tape">${trace.map((item, i) => `<span class="${i === traceIndex ? "active" : i < traceIndex ? "done" : ""}"><strong>${escapeHtml(item.bit)}</strong><em>${escapeHtml(item.qbit === "-" ? item.decision : `商位 ${item.qbit}`)}</em></span>`).join("")}</div>
    `;
    return renderDomainFrame("division-domain", "定点除法试减动画", "余数左移、试减除数、生成商位，必要时恢复或校正余数。", body, result.metrics);
  }

  function renderFloatDomain(result, step, index) {
    const rows = result.table?.rows || [];
    const trace = result.floatTrace || {};
    const activeSet = new Set(step.active || []);
    const activeClass = (id) => activeSet.has(id) ? "active" : "";
    const field = (name) => trace.fields?.[name] || {};
    const activeRow = step.activeRow || trace.activeRow || "";
    const body = `
      <div class="float-field-grid">
        ${["a", "b", "result"].map((name) => {
          const item = field(name);
          return `
          <div class="float-operand-card ${activeClass(name)}">
            <strong>${escapeHtml(item.label || name.toUpperCase())}</strong>
            <span>S ${escapeHtml(String(item.sign ?? "-"))}</span>
            <span>E ${escapeHtml(item.exponentBits || "-")}</span>
            <span>M ${escapeHtml(compactSvgText(item.fractionBits || "-", 18))}</span>
            <em>${escapeHtml(item.valueText || "")}</em>
          </div>
          `;
        }).join("")}
      </div>
      <div class="float-pipeline">
        <div class="float-stage-card ${activeClass("align")}">
          <strong>对阶</strong>
          <span>${escapeHtml(trace.align?.title || "比较阶码")}</span>
          <em>${escapeHtml(trace.align?.detail || "")}</em>
        </div>
        <div class="float-stage-card ${activeClass("mantissa")}">
          <strong>尾数运算</strong>
          <span>${escapeHtml(trace.mantissa?.title || "等待运算")}</span>
          <em>${escapeHtml(trace.mantissa?.detail || "")}</em>
        </div>
        <div class="float-stage-card ${activeClass("normalize")}">
          <strong>规格化 / 舍入</strong>
          <span>${escapeHtml(trace.normalize?.title || "等待规格化")}</span>
          <em>${escapeHtml(trace.normalize?.detail || "")}</em>
        </div>
        <div class="float-stage-card ${activeClass("result")}">
          <strong>写回</strong>
          <span>${escapeHtml(trace.writeback?.title || "结果字段")}</span>
          <em>${escapeHtml(trace.writeback?.detail || "")}</em>
        </div>
      </div>
      <div class="float-operation-board">
        <span class="${activeClass("align")}"><strong>大阶尾数</strong>${escapeHtml(trace.align?.large || "-")}</span>
        <span class="${activeClass("align")}"><strong>小阶右移</strong>${escapeHtml(trace.align?.small || "-")}</span>
        <span class="${activeClass("mantissa")}"><strong>运算式</strong>${escapeHtml(trace.mantissa?.expression || "-")}</span>
        <span class="${activeClass("normalize")}"><strong>结果尾数</strong>${escapeHtml(trace.normalize?.mantissa || "-")}</span>
      </div>
      <div class="float-word">
        ${rows.map((row) => `
          <div class="float-field-row ${row[0] === activeRow ? "active" : ""}">
            <strong>${escapeHtml(row[0])}</strong>
            <span>${escapeHtml(compactSvgText(row[1], 16))}</span>
            <span>${escapeHtml(compactSvgText(row[2], 16))}</span>
            <span>${escapeHtml(compactSvgText(row[3], 16))}</span>
          </div>
        `).join("")}
      </div>
    `;
    return renderDomainFrame("float-domain", "IEEE 754 字段与对阶动画", "符号、阶码、尾数被拆开，对阶后进行尾数加减和规格化。", body, result.metrics);
  }

  function renderMemoryHierarchyDomain(result, step, index) {
    const body = `
      <div class="memory-pyramid">
        ${["CPU", "Cache", "主存", "辅存"].map((label, i) => `
          <div class="pyramid-tier ${i <= index ? "active" : ""}" style="--w:${55 + i * 12}%">
            <strong>${label}</strong>
            <span>${i === 1 ? metricValue(result, "估计命中率") : i === 2 ? "MAR/MDR" : i === 3 ? "容量最大" : "请求源"}</span>
          </div>
        `).join("")}
      </div>
    `;
    return renderDomainFrame("memory-hierarchy-domain", "存储层次访问动画", "请求先查 Cache，未命中再访问主存/辅存，平均访问时间随命中率变化。", body, result.metrics);
  }

  function renderMemoryCellDomain(result, step, index) {
    const isDram = result.metrics?.some((item) => item.value === "1T1C");
    const nodeDetail = (id) => result.nodes?.find((node) => node.id === id)?.detail || "";
    const active = (id) => isActiveStep(step, id) ? "active" : "";
    const rowDetail = nodeDetail("row") || "Row";
    const colDetail = nodeDetail("col") || "Col";
    const operation = metricValue(result, "当前操作", "读");
    const body = isDram
      ? `
        <div class="memory-cell-stage dram-cell">
          <div class="mem-cell-lane">
            <div class="mem-cell-card ${active("row")}">
              <strong>RAS 行译码</strong>
              <span>${escapeHtml(rowDetail)}</span>
            </div>
            <div class="mem-cell-card ${active("col")}">
              <strong>CAS 列译码</strong>
              <span>${escapeHtml(colDetail)}</span>
            </div>
          </div>
          <div class="dram-array-panel ${active("cell")}">
            <div class="dram-array-title">DRAM 存储阵列</div>
            <div class="dram-row-line ${active("row")}">选中行</div>
            <div class="dram-cell-grid">
              ${Array.from({ length: 16 }, (_, cellIndex) => `<span class="${cellIndex === 9 ? "selected" : ""}"></span>`).join("")}
            </div>
            <div class="dram-col-line ${active("col")}">选中列</div>
            <div class="dram-capacitor-symbol ${active("cell")}"><i></i><span>1T1C 电容单元</span></div>
          </div>
          <div class="mem-cell-lane">
            <div class="mem-cell-card ${active("sense")}">
              <strong>${operation === "写" ? "写驱动器" : "读出放大器"}</strong>
              <span>${operation === "写" ? "改变电容电荷" : "放大位线电荷差"}</span>
            </div>
            <div class="mem-cell-card ${active("refresh")}">
              <strong>刷新回写</strong>
              <span>恢复行缓冲内容</span>
            </div>
          </div>
        </div>
      `
      : `
        <div class="memory-cell-stage sram-cell">
          <div class="mem-cell-lane">
            <div class="mem-cell-card ${active("row")}">
              <strong>字线 WL</strong>
              <span>${escapeHtml(rowDetail)}</span>
            </div>
            <div class="mem-cell-card ${active("col")}">
              <strong>列选择</strong>
              <span>${escapeHtml(colDetail)}</span>
            </div>
          </div>
          <div class="sram-core-panel ${active("cell")}">
            <div class="sram-word-line ${active("row")}">WL 打开</div>
            <div class="sram-bitline-pair ${active("col")}">
              <span>BL</span>
              <span>BL̅</span>
            </div>
            <div class="sram-latch-core ${active("cell")}">
              <span>Q</span>
              <i></i>
              <span>Q̅</span>
            </div>
            <div class="sram-cell-note">6T 交叉耦合锁存</div>
          </div>
          <div class="mem-cell-lane">
            <div class="mem-cell-card ${active("sense")}">
              <strong>${operation === "写" ? "写驱动器" : "读出放大器"}</strong>
              <span>${operation === "写" ? "强制 Q/Q̅ 状态" : "比较 BL / BL̅ 电平"}</span>
            </div>
            <div class="mem-cell-card ${active("cell")}">
              <strong>静态保持</strong>
              <span>供电存在即可保持</span>
            </div>
          </div>
        </div>
      `;
    return renderDomainFrame("memory-cell-domain", isDram ? "DRAM 行列选通动画" : "SRAM 锁存单元动画", isDram ? "电容经 RAS/CAS 选通读出，读后需要恢复刷新。" : "交叉耦合锁存器通过字线和互补位线读写。", body, result.metrics);
  }

  function renderCacheWriteDomain(result, step, index) {
    const body = `
      <div class="cache-write-stage">
        <div class="cpu-write ${index >= 0 ? "active" : ""}">CPU<br>写请求</div>
        <div class="cache-line ${isActiveStep(step, "cache", "dirty") ? "active" : ""}">
          <span>V=1</span><span>Tag</span><span>Data</span><span class="${isActiveStep(step, "dirty") ? "dirty active" : "dirty"}">D</span>
        </div>
        <div class="main-memory ${isActiveStep(step, "memory") ? "active" : ""}">主存块</div>
      </div>
    `;
    return renderDomainFrame("cache-write-domain", "Cache 写策略状态动画", "写命中/未命中会改变 Cache 行、dirty bit 和主存同步状态。", body, result.metrics);
  }

  function renderCacheLocalityDomain(result, step, index) {
    const rows = result.table?.rows || [];
    const body = `
      <div class="cache-locality-stage">
        <div class="address-stream">
          ${rows.slice(0, 12).map((row, i) => `<span class="${i === index ? "active" : row[5] === "命中" ? "hit" : "miss"}">${escapeHtml(row[1])}</span>`).join("")}
        </div>
        <div class="cache-lines">
          ${[0, 1, 2, 3].map((line) => `<div class="${index >= line ? "active" : ""}"><strong>Line ${line}</strong><span>Tag 比较</span></div>`).join("")}
        </div>
        <div class="hit-rate-gauge" style="--rate:${parseFloat(metricValue(result, "命中率", "0")) || 0}%"><strong>${escapeHtml(metricValue(result, "命中率"))}</strong></div>
      </div>
    `;
    return renderDomainFrame("cache-locality-domain", "Cache 局部性访问动画", "地址流逐个映射到 Cache 行，命中/未命中实时影响命中率。", body, result.metrics);
  }

  function renderTlbDomain(result, step, index) {
    const nodeDetail = (id) => result.nodes?.find((node) => node.id === id)?.detail || "";
    const active = (...ids) => ids.some((id) => isActiveStep(step, id)) ? "active" : "";
    const page = metricValue(result, "页号");
    const offset = metricValue(result, "页内偏移");
    const frame = metricValue(result, "页框号");
    const physical = metricValue(result, "物理地址");
    const body = `
      <div class="tlb-flow-stage">
        <div class="tlb-address-card ${active("va")}">
          <strong>虚拟地址拆分</strong>
          <span>VPN = ${escapeHtml(page)}</span>
          <span>Offset = ${escapeHtml(offset)}</span>
        </div>
        <div class="tlb-lookup-row">
          <div class="tlb-flow-card ${active("tlb")}">
            <strong>TLB 快表</strong>
            <span>${escapeHtml(nodeDetail("tlb"))}</span>
          </div>
          <div class="tlb-flow-card ${active("pt")}">
            <strong>页表查询</strong>
            <span>${escapeHtml(nodeDetail("pt"))}</span>
          </div>
          <div class="tlb-flow-card ${active("fault", "disk")}">
            <strong>缺页 / 辅存</strong>
            <span>${escapeHtml(nodeDetail("fault"))}</span>
            <em>${escapeHtml(nodeDetail("disk"))}</em>
          </div>
        </div>
        <div class="tlb-compose-row ${active("pa")}">
          <div class="tlb-compose-card">
            <strong>页框号</strong>
            <span>${escapeHtml(frame)}</span>
          </div>
          <div class="tlb-compose-op">× 页大小 +</div>
          <div class="tlb-compose-card">
            <strong>页内偏移</strong>
            <span>${escapeHtml(offset)}</span>
          </div>
          <div class="tlb-compose-card result">
            <strong>物理地址</strong>
            <span>${escapeHtml(physical)}</span>
          </div>
        </div>
      </div>
    `;
    return renderDomainFrame("tlb-domain", "TLB 与缺页访问动画", "虚拟地址拆分后查询 TLB/页表，缺页时调页并重新形成物理地址。", body, result.metrics);
  }

  function renderInstructionFormatDomain(result, step, index) {
    const rows = result.table?.rows || [];
    const body = `
      <div class="instruction-word">
        ${rows.map((row, i) => `<div class="instruction-field ${i <= index ? "active" : ""}" style="--grow:${Math.max(1, row[1].length / 4)}"><strong>${escapeHtml(row[0])}</strong><span>${escapeHtml(compactSvgText(row[1], 14))}</span></div>`).join("")}
      </div>
      <div class="decoder-window ${index >= 1 ? "active" : ""}">译码器读取 opcode 后定位寄存器、立即数或地址字段</div>
    `;
    return renderDomainFrame("instruction-format-domain", "机器指令字段拆解动画", "指令字按格式被切分，字段逐个进入译码器。", body, result.metrics);
  }

  function renderInstructionClassDomain(result, step, index) {
    const active = (...ids) => (isActiveStep(step, ...ids) ? "active" : "");
    const pathActive = index >= 1 ? "active" : "";
    const writeActive = index >= 2 ? "active" : "";
    const node = (id, title, detail, extra = "") => `
      <div class="instruction-flow-node ${extra} ${active(id)}">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(detail)}</span>
      </div>
    `;
    const body = `
      <div class="instruction-flow-map">
        <div class="instruction-flow-top">
          ${node("control", "控制器", "译码 opcode，发出部件选通信号", "control")}
          <div class="instruction-kind-chip">
            <strong>${escapeHtml(metricValue(result, "指令类型"))}</strong>
            <span>当前激活：${escapeHtml(metricValue(result, "主要部件"))}</span>
          </div>
        </div>
        <div class="instruction-control-bus ${pathActive}">
          <span>控制信号</span>
          <i></i><i></i><i></i><i></i>
        </div>
        <div class="instruction-flow-grid">
          <div class="instruction-flow-group source">
            <em>取指 / 源操作数</em>
            ${node("pc", "PC", "顺序取指或转移目标")}
            ${node("reg", "寄存器组", "读源操作数，也接收写回")}
          </div>
          <div class="instruction-flow-link ${pathActive}">地址 / 数据</div>
          <div class="instruction-flow-group execute">
            <em>执行与访问部件</em>
            <div class="instruction-execute-grid">
              ${node("alu", "ALU", "算术逻辑或地址计算")}
              ${node("shifter", "移位器", "逻辑 / 算术移位")}
              ${node("mem", "存储器", "load / store 数据访问")}
              ${node("io", "I/O 接口", "端口与状态寄存器访问")}
            </div>
          </div>
          <div class="instruction-flow-link ${writeActive}">结果 / 状态</div>
          <div class="instruction-flow-group commit">
            <em>写回 / 更新</em>
            ${node("reg", "写回寄存器", "保存执行结果")}
            ${node("flags", "标志位", "更新 Z / C / V / N")}
          </div>
        </div>
        <div class="instruction-main-bus ${active("bus", "reg", "mem", "io")}">
          <strong>主数据总线</strong>
          <span>在寄存器、存储器和 I/O 之间传送地址与数据</span>
        </div>
      </div>
    `;
    return renderDomainFrame("instruction-class-domain", "指令类型数据通路动画", "不同类型指令激活不同的数据通路部件和控制信号。", body, result.metrics);
  }

  function renderAddressingDomain(result, step, index) {
    const flow = result.addressingFlow || {};
    const active = (...ids) => (isActiveStep(step, ...ids) ? "active" : "");
    const sourceClass = (id) => `${flow.sources?.includes(id) ? "participates" : "idle"} ${active(id)}`;
    const source = (id, title, value, detail) => `
      <div class="ea-flow-card ${sourceClass(id)}">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(String(value ?? "-"))}</span>
        <em>${escapeHtml(detail)}</em>
      </div>
    `;
    const body = `
      <div class="ea-flow-map">
        <div class="ea-mode-card ${active("mode", "instr")}">
          <strong>${escapeHtml(flow.modeLabel || "寻址方式")}</strong>
          <span>${escapeHtml(flow.modeHint || "根据寻址方式选择参与计算的地址来源。")}</span>
        </div>
        <div class="ea-flow-grid">
          <div class="ea-source-group">
            <em>地址来源</em>
            ${source("instr", "指令地址字段 A", flow.a ?? metricValue(result, "A"), "形式地址 / 位移量")}
            ${source("reg", "寄存器 R / X / BR", flow.r ?? "-", "基址、变址或寄存器内容")}
            ${source("pc", "PC", flow.pc ?? "-", "相对寻址的基准地址")}
            ${source("memory", "主存 M[A]", flow.memA ?? "-", "间接寻址先读出的地址")}
          </div>
          <div class="ea-flow-arrow ${index >= 1 ? "active" : ""}">选择来源</div>
          <div class="ea-calc-panel ${active("calc", "ea")}">
            <strong>EA 形成器</strong>
            <span>${escapeHtml(flow.formula || result.formula || "-")}</span>
            <em>${escapeHtml(flow.calcDetail || "把参与来源送入地址加法器或地址选择器。")}</em>
          </div>
          <div class="ea-flow-arrow ${index >= 2 ? "active" : ""}">形成结果</div>
          <div class="ea-result-group">
            <em>输出</em>
            <div class="ea-flow-card result ${active("ea")}">
              <strong>有效地址 EA</strong>
              <span>${escapeHtml(metricValue(result, "EA"))}</span>
              <em>${escapeHtml(flow.eaDetail || "供访存阶段使用")}</em>
            </div>
            <div class="ea-flow-card operand ${active("operand")}">
              <strong>操作数位置</strong>
              <span>${escapeHtml(flow.operand || "-")}</span>
              <em>${escapeHtml(flow.operandDetail || "最终用于执行阶段")}</em>
            </div>
          </div>
        </div>
      </div>
    `;
    return renderDomainFrame("addressing-domain", "有效地址计算动画", "根据寻址方式选择 A、寄存器、PC 或主存内容形成操作数地址。", body, result.metrics);
  }

  function renderCpuCycleDomain(result, step, index) {
    const regs = ["PC", "MAR", "MDR", "IR", "ALU", "PSW"];
    const body = `
      <div class="cpu-cycle-stage">
        <div class="clock-dial"><span>T${index}</span></div>
        ${regs.map((reg) => `<div class="cycle-register ${isActiveStep(step, reg.toLowerCase()) ? "active" : ""}"><strong>${reg}</strong><span>${reg === "IR" ? metricValue(result, "指令") : step.title}</span></div>`).join("")}
        <div class="cycle-memory ${isActiveStep(step, "memory") ? "active" : ""}">主存</div>
      </div>
    `;
    return renderDomainFrame("cpu-cycle-domain", "指令周期寄存器动画", "PC、MAR、MDR、IR 等寄存器随取指、执行和中断周期逐拍变化。", body, result.metrics);
  }

  function renderControlModeDomain(result, step, index) {
    const flow = result.controlFlow || {};
    const active = (...ids) => (isActiveStep(step, ...ids) ? "active" : "");
    const pathActive = index >= 1 ? "active" : "";
    const signalActive = index >= 2 ? "active" : "";
    const actionActive = index >= 3 ? "active" : "";
    const node = (id, title, value, detail, extra = "") => `
      <div class="control-flow-card ${extra} ${active(id)}">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(value)}</span>
        <em>${escapeHtml(detail)}</em>
      </div>
    `;
    const body = `
      <div class="control-flow-map">
        <div class="control-mode-summary ${active("clock")}">
          <strong>${escapeHtml(metricValue(result, "方式"))}</strong>
          <span>${escapeHtml(flow.summary || "选择控制方式后，观察控制信号如何按节拍驱动数据通路。")}</span>
        </div>
        <div class="control-flow-grid">
          <div class="control-flow-group timing">
            <em>节拍来源</em>
            <div class="control-wave-card ${active("clock")}">
              <div class="control-wave-header">
                <strong>${escapeHtml(flow.timingLabel || "时钟/握手")}</strong>
                <span>${escapeHtml(flow.timingValue || result.formula || "-")}</span>
              </div>
              <div class="control-waveform ${flow.timingKind || "clock"}">
                <i></i><i></i><i></i><i></i>
              </div>
              <p>${escapeHtml(flow.timingDetail || "节拍决定控制信号何时有效。")}</p>
            </div>
          </div>
          <div class="control-flow-link ${pathActive}">状态输入</div>
          <div class="control-flow-group decode">
            <em>译码与条件</em>
            ${node("decoder", "指令译码", flow.decoderValue || "opcode / flags", flow.decoderDetail || "操作码、条件标志和机器周期共同参与控制。")}
          </div>
          <div class="control-flow-link ${signalActive}">生成信号</div>
          <div class="control-flow-group generate">
            <em>控制信号形成</em>
            ${node("logic", flow.generatorTitle || "控制器", flow.generatorValue || "控制信号", flow.generatorDetail || "形成寄存器装入、ALU、访存等微操作信号。")}
          </div>
          <div class="control-flow-link ${actionActive}">驱动</div>
          <div class="control-flow-group datapath">
            <em>数据通路</em>
            ${node("datapath", "微操作执行", flow.datapathValue || "寄存器 / ALU / 主存", flow.datapathDetail || "数据通路部件按控制信号完成动作。")}
          </div>
        </div>
        <div class="control-feature-row">
          <span class="${flow.implementation === "hardwired" ? "active" : ""}"><strong>硬布线逻辑</strong><em>组合逻辑直接产生控制信号</em></span>
          <span class="${flow.implementation === "microprogram" ? "active" : ""}"><strong>控制存储器</strong><em>微指令序列解释机器指令</em></span>
          <span class="${flow.timingKind === "clock" || flow.timingKind === "hybrid" ? "active" : ""}"><strong>同步节拍</strong><em>固定机器周期推进</em></span>
          <span class="${flow.timingKind === "handshake" || flow.timingKind === "hybrid" ? "active" : ""}"><strong>异步握手</strong><em>请求/应答决定下一步</em></span>
        </div>
        <div class="control-phase-row">
          ${(flow.phases || ["选择方式", "译码状态", "产生信号", "驱动通路"]).map((phase, i) => `<span class="${i === index ? "active" : i < index ? "done" : ""}">${escapeHtml(phase)}</span>`).join("")}
        </div>
      </div>
    `;
    return renderDomainFrame("control-mode-domain", "控制方式时序动画", "同步、异步、联合、硬布线或微程序控制以不同节拍驱动数据通路。", body, result.metrics);
  }

  function renderMicroinstructionFormatDomain(result, step, index) {
    const rows = result.table?.rows || [];
    const body = `
      <div class="micro-word">
        ${rows.map((row, i) => `<div class="micro-field ${i <= index ? "active" : ""}"><strong>${escapeHtml(row[0])}</strong><span>${escapeHtml(row[1])}</span><em>${escapeHtml(row[2])}</em></div>`).join("")}
      </div>
      <div class="micro-decoder ${index >= 2 ? "active" : ""}">
        <span>互斥字段译码</span>
        <span>控制信号展开</span>
        <span>下地址选择</span>
      </div>
    `;
    return renderDomainFrame("micro-format-domain", "微指令字字段动画", "控制字段、下地址字段和判别字段被分段编码并驱动微命令。", body, result.metrics);
  }

  function renderMicroprogramDomain(result, step, index) {
    const rows = result.table?.rows || [];
    const current = rows[Math.min(index, rows.length - 1)] || [];
    const [addr = "00", control = "-", next = "00", detail = ""] = current;
    const commands = String(control)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const body = `
      <div class="microprogram-stage">
        <div class="microprogram-store">
          <div class="microprogram-store-title">控制存储器 CM</div>
          ${rows.map((row, i) => `
            <div class="microprogram-store-row ${i === index ? "active" : ""}">
              <strong>µ${escapeHtml(row[0])}</strong>
              <span>${escapeHtml(compactSvgText(row[1], 22))}</span>
              <em>Next ${escapeHtml(row[2])}</em>
            </div>
          `).join("")}
        </div>
        <div class="microprogram-execution">
          <div class="microprogram-flow-row">
            <div class="microprogram-register active">
              <strong>CAR 微地址寄存器</strong>
              <span>µ${escapeHtml(addr)}</span>
              <em>用当前微地址选中控制存储器一行</em>
            </div>
            <div class="microprogram-arrow active">取微指令</div>
            <div class="microprogram-register active">
              <strong>MIR 微指令寄存器</strong>
              <span>${escapeHtml(compactSvgText(control, 28))}</span>
              <em>保存本拍读出的控制字段</em>
            </div>
            <div class="microprogram-arrow active">译码</div>
            <div class="microprogram-register active">
              <strong>字段译码器</strong>
              <span>${escapeHtml(metricValue(result, "格式"))}</span>
              <em>把控制字段展开为微命令</em>
            </div>
          </div>
          <div class="microprogram-command-row">
            <div class="microprogram-field-card active">
              <strong>控制字段</strong>
              <span>${escapeHtml(compactSvgText(control, 34))}</span>
              <em>${escapeHtml(detail)}</em>
            </div>
            <div class="microprogram-command-list active">
              <strong>本拍发出的微命令</strong>
              <div>
                ${commands.map((command) => `<span>${escapeHtml(command)}</span>`).join("")}
              </div>
            </div>
            <div class="microprogram-field-card active">
              <strong>下一微地址字段</strong>
              <span>µ${escapeHtml(addr)} → µ${escapeHtml(next)}</span>
              <em>顺序、条件或入口映射决定下一条微指令</em>
            </div>
          </div>
          <div class="microprogram-datapath-row">
            <div class="microprogram-datapath active">
              <strong>数据通路执行</strong>
              <span>${escapeHtml(detail || "执行当前微操作")}</span>
            </div>
            <div class="microprogram-next active">
              <strong>下一拍 CAR</strong>
              <span>µ${escapeHtml(next)}</span>
            </div>
          </div>
        </div>
      </div>
    `;
    return renderDomainFrame("microprogram-domain", "微程序控制存储器动画", "微地址取出微指令，MIR 译码后产生微命令并形成下一微地址。", body, result.metrics);
  }

  function renderBusStructureDomain(result, step, index) {
    const structure = metricValue(result, "结构");
    const lanes = structure === "三总线" ? ["地址总线", "数据总线", "控制总线"] : structure === "双总线" ? ["CPU-主存总线", "I/O 总线"] : ["系统总线"];
    const body = `
      <div class="bus-structure-stage">
        <div class="bus-device ${index >= 0 ? "active" : ""}">CPU</div>
        <div class="bus-lanes">
          ${lanes.map((lane, i) => `<span class="${i <= index ? "active" : ""}">${escapeHtml(lane)}</span>`).join("")}
        </div>
        <div class="bus-device ${isActiveStep(step, "memory") ? "active" : ""}">主存</div>
        <div class="bus-device ${isActiveStep(step, "io") ? "active" : ""}">I/O</div>
      </div>
    `;
    return renderDomainFrame("bus-domain", "总线结构事务动画", "地址、控制和数据在不同总线结构中分时或分路传输。", body, result.metrics);
  }

  function renderDisplayDomain(result, step, index) {
    const pixels = Array.from({ length: 64 }, (_, i) => i);
    const scan = Math.min(7, index * 2);
    const body = `
      <div class="display-stage">
        <div class="frame-buffer">
          ${pixels.map((pixel) => `<span class="${Math.floor(pixel / 8) <= scan ? "lit" : ""}"></span>`).join("")}
        </div>
        <div class="scanline" style="--scan:${scan * 12.5}%"></div>
        <div class="display-panel ${index >= 3 ? "active" : ""}">屏幕输出</div>
      </div>
    `;
    return renderDomainFrame("display-domain", "显示扫描动画", "帧缓冲按行被扫描控制器读出，逐行刷新到显示面板。", body, result.metrics);
  }

  function renderDiskDomain(result, step, index) {
    const seekPercent = Math.min(78, 16 + index * 18);
    const seek = metricValue(result, "寻道");
    const rotation = metricValue(result, "旋转延迟");
    const transfer = metricValue(result, "传输");
    const total = metricValue(result, "总时间");
    const activeSeek = isActiveStep(step, "arm", "track");
    const activeRotation = isActiveStep(step, "sector");
    const activeTransfer = isActiveStep(step, "transfer");
    const body = `
      <div class="disk-workbench">
        <div class="disk-stage disk-stage-compact">
          <div class="disk-platter ${index >= 1 ? "spinning" : ""}">
            <span class="track t1"></span>
            <span class="track t2"></span>
            <span class="track t3"></span>
            <span class="sector ${activeRotation ? "active" : ""}"></span>
          </div>
          <div class="disk-arm ${activeSeek ? "active" : ""}" style="--seek:${seekPercent}deg">
            <span></span>
          </div>
          <div class="disk-buffer ${activeTransfer ? "active" : ""}">
            <strong>数据缓冲区</strong>
            <span>${activeTransfer || index >= 3 ? transfer : "等待传输"}</span>
          </div>
        </div>
        <div class="disk-estimate-panel">
          <h4>访问时间估算</h4>
          <div class="estimate-row ${activeSeek ? "active" : ""}">
            <strong>寻道时间</strong>
            <span>${escapeHtml(seek)}</span>
            <em>磁头从当前柱面移动到目标柱面</em>
          </div>
          <div class="estimate-row ${activeRotation ? "active" : ""}">
            <strong>平均旋转延迟</strong>
            <span>${escapeHtml(rotation)}</span>
            <em>等待目标扇区旋转到磁头下方</em>
          </div>
          <div class="estimate-row ${activeTransfer ? "active" : ""}">
            <strong>数据传输时间</strong>
            <span>${escapeHtml(transfer)}</span>
            <em>把数据块读入缓冲区</em>
          </div>
          <div class="estimate-total ${index >= 3 ? "active" : ""}">
            <strong>总访问时间</strong>
            <span>${escapeHtml(total)}</span>
          </div>
        </div>
      </div>
      <div class="disk-progress-line">
        ${["寻道", "旋转等待", "传输", "合计"].map((label, itemIndex) => `<span class="${itemIndex === index ? "active" : itemIndex < index ? "done" : ""}"><i>${itemIndex + 1}</i>${label}</span>`).join("")}
      </div>
    `;
    return renderDomainFrame("disk-domain", "磁盘盘片与磁臂动画", "磁臂移动到目标柱面，盘片旋转等待扇区，再把数据传入缓冲区。", body, result.metrics);
  }

  function renderRaidSsdDomain(result, step, index) {
    const flow = result.raidSsdFlow || {};
    const mode = flow.modeLabel || metricValue(result, "模式");
    const ssd = flow.kind === "ssd" || mode === "SSD";
    const active = (...ids) => (ids.some((id) => isActiveStep(step, id)) ? "active" : "");
    const body = ssd
      ? `
        <div class="ssd-flow-stage">
          <div class="ssd-host-card ${active("ftl")}">
            <strong>主机写入</strong>
            <span>${escapeHtml(flow.hostWrite || "LPN 7 写入数据 A'")}</span>
            <em>主机只看到逻辑页地址</em>
          </div>
          <div class="ssd-flow-arrow ${index >= 1 ? "active" : ""}">FTL 映射</div>
          <div class="ssd-ftl-panel ${active("ftl", "page")}">
            <strong>FTL 映射表</strong>
            ${(flow.ftlRows || []).map((row) => `
              <div class="${row.active ? "active" : ""}">
                <span>${escapeHtml(row.logical)}</span>
                <span>${escapeHtml(row.physical)}</span>
                <em>${escapeHtml(row.state)}</em>
              </div>
            `).join("")}
          </div>
          <div class="ssd-flash-panel ${active("page", "block")}">
            <strong>闪存块 / 页</strong>
            <div class="ssd-block-grid">
              ${(flow.blocks || []).map((block) => `
                <div class="ssd-block-card ${block.active ? "active" : ""}">
                  <b>${escapeHtml(block.name)}</b>
                  ${block.pages.map((page) => `<span class="${escapeHtml(page.state)}">${escapeHtml(page.label)}</span>`).join("")}
                </div>
              `).join("")}
            </div>
          </div>
          <div class="ssd-gc-panel ${active("block")}">
            <strong>垃圾回收 / 块擦除</strong>
            <span>${escapeHtml(flow.gc || "迁移仍有效页，整块擦除后重新变为空闲块。")}</span>
          </div>
        </div>
      `
      : `
        <div class="raid-flow-stage">
          <div class="raid-host-row">
            <strong>主机连续数据</strong>
            ${(flow.hostBlocks || ["D0", "D1", "D2", "D3"]).map((block, blockIndex) => `<span class="${blockIndex <= index ? "active" : ""}">${escapeHtml(block)}</span>`).join("")}
          </div>
          <div class="raid-disk-row">
            ${(flow.disks || []).map((disk) => `
              <div class="raid-disk-card ${disk.failed && index >= 3 ? "failed" : ""} ${disk.active ? "active" : ""}">
                <strong>${escapeHtml(disk.name)}</strong>
                ${disk.blocks.map((block) => `<span class="${escapeHtml(block.type)} ${block.active ? "active" : ""}">${escapeHtml(block.label)}</span>`).join("")}
              </div>
            `).join("")}
          </div>
          <div class="raid-explain-row">
            <div class="raid-rule-card ${active("stripe")}">
              <strong>条带写入</strong>
              <span>${escapeHtml(flow.stripeRule || "连续数据块按条带分散到多块磁盘。")}</span>
            </div>
            <div class="raid-rule-card ${active("mirror", "parity")}">
              <strong>冗余信息</strong>
              <span>${escapeHtml(flow.redundancy || "镜像或校验块用于故障恢复。")}</span>
            </div>
            <div class="raid-rule-card ${active("rebuild")}">
              <strong>故障恢复</strong>
              <span>${escapeHtml(flow.rebuild || "单盘故障时由冗余信息恢复缺失块。")}</span>
            </div>
          </div>
        </div>
      `;
    return renderDomainFrame("raid-domain", ssd ? "SSD 页块擦写动画" : "RAID 条带/冗余动画", ssd ? "页写入、块擦除、FTL 映射和磨损均衡逐步变化。" : "数据条带写入成员盘，镜像或校验信息支持恢复。", body, result.metrics);
  }

  function renderIoOverviewDomain(result, step, index) {
    const timeline = ["选择编址", "设备选址", "数据传送", "联络完成"];
    const body = `
      <div class="io-overview-stage">
        <div class="io-overview-flow">
          <div class="io-overview-node io-cpu ${isActiveStep(step, "cpu") ? "active" : ""}">
            <strong>CPU</strong>
            <span>发起 I/O 请求</span>
          </div>
          <div class="io-overview-link ${index === 0 ? "active" : ""}"><span>选择空间</span></div>
          <div class="io-overview-node io-address ${isActiveStep(step, "addr", "select") ? "active" : ""}">
            <strong>地址/端口译码</strong>
            <span>选中接口</span>
          </div>
          <div class="io-overview-link ${index === 1 ? "active" : ""}"><span>设备响应</span></div>
          <div class="io-overview-node io-wire ${isActiveStep(step, "transfer") ? "active" : ""}">
            <strong>传送线路</strong>
            <div class="io-wire-lanes"><span></span><span></span><span></span><span></span></div>
          </div>
          <div class="io-overview-link ${index === 2 ? "active" : ""}"><span>传数据</span></div>
          <div class="io-overview-node handshake-box ${isActiveStep(step, "handshake") ? "active" : ""}">
            <strong>Ready / ACK</strong>
            <span>速度匹配</span>
          </div>
          <div class="io-overview-link ${index === 3 ? "active" : ""}"><span>完成</span></div>
          <div class="io-overview-node io-device ${isActiveStep(step, "device") ? "active" : ""}">
            <strong>外设</strong>
            <span>数据源/目的</span>
          </div>
        </div>
        <div class="io-overview-timeline">
          ${timeline.map((label, itemIndex) => `<span class="${itemIndex === index ? "active" : itemIndex < index ? "done" : ""}"><i>${itemIndex + 1}</i>${label}</span>`).join("")}
        </div>
      </div>
    `;
    return renderDomainFrame("io-overview-domain", "I/O 编址与联络动画", "CPU 通过地址译码选中设备，再按串/并行和联络方式传送数据。", body, result.metrics);
  }

  function renderPollingDomain(result, step, index) {
    const count = Number.parseInt(metricValue(result, "查询次数", "1"), 10) || 1;
    const shownPolls = Math.min(count, 8);
    const ready = index + 1 >= count;
    const timeline = ["查询状态", "Ready 判定", "继续轮询", "搬运数据"];
    const timelineActiveIndex = isActiveStep(step, "data") ? 3 : ready ? 1 : index === 0 ? 0 : 2;
    const body = `
      <div class="polling-stage">
        <div class="polling-flow">
          <div class="polling-node poll-cpu active">
            <strong>CPU</strong>
            <span>查询状态位</span>
          </div>
          <div class="polling-link ${!ready ? "active" : ""}"><span>读状态</span></div>
          <div class="polling-node poll-loop ${index < count ? "active" : ""}">
            <strong>查询循环</strong>
            <div class="poll-dots">${Array.from({ length: shownPolls }, (_, i) => `<span class="${i <= index ? "active" : ""}">${i + 1}</span>`).join("")}</div>
          </div>
          <div class="polling-link ${isActiveStep(step, "status", "device") ? "active" : ""}"><span>检测</span></div>
          <div class="polling-node status-register ${isActiveStep(step, "status", "device") ? "active" : ""}">
            <strong>状态寄存器</strong>
            <span>Ready=${ready ? "1" : "0"}</span>
          </div>
          <div class="polling-link ${isActiveStep(step, "data") ? "active" : ""}"><span>${ready ? "就绪" : "忙等"}</span></div>
          <div class="polling-node data-register ${isActiveStep(step, "data") ? "active" : ""}">
            <strong>数据寄存器</strong>
            <span>${ready ? "搬运数据" : "等待就绪"}</span>
          </div>
        </div>
        <div class="polling-return ${!ready ? "active" : ""}">
          <span>Ready=0</span>
          <i></i>
          <b>CPU 返回循环继续查询</b>
        </div>
        <div class="polling-timeline">
          ${timeline.map((label, itemIndex) => {
            return `<span class="${itemIndex === timelineActiveIndex ? "active" : itemIndex < timelineActiveIndex ? "done" : ""}"><i>${itemIndex + 1}</i>${label}</span>`;
          }).join("")}
        </div>
      </div>
    `;
    return renderDomainFrame("polling-domain", "程序查询忙等动画", "CPU 一次次读取状态寄存器，直到 Ready=1 才搬运数据。", body, result.metrics);
  }

  function renderInterruptDomain(result, step, index) {
    const timeline = ["IRQ 请求", "判优屏蔽", "CPU 响应", "保存现场", "取向量", "执行 ISR"];
    const body = `
      <div class="interrupt-stage">
        <div class="interrupt-flow">
          <div class="interrupt-node irq-device ${isActiveStep(step, "device") ? "active" : ""}">
            <strong>外设 IRQ</strong>
            <span>请求服务</span>
          </div>
          <div class="interrupt-link ${index === 0 ? "active" : ""}"><span>IRQ=1</span></div>
          <div class="interrupt-node interrupt-mask ${isActiveStep(step, "mask") ? "active" : ""}">
            <strong>判优/屏蔽</strong>
            <span>允许响应</span>
          </div>
          <div class="interrupt-link ${index === 1 ? "active" : ""}"><span>通过</span></div>
          <div class="interrupt-node irq-cpu ${isActiveStep(step, "cpu") ? "active" : ""}">
            <strong>CPU</strong>
            <span>完成当前指令</span>
          </div>
          <div class="interrupt-link ${index === 2 || index === 3 ? "active" : ""}"><span>响应</span></div>
          <div class="interrupt-node stack-frame ${isActiveStep(step, "stack") ? "active" : ""}">
            <strong>保存现场</strong>
            <div class="stack-fields"><span>PC</span><span>PSW</span><span>REG</span></div>
          </div>
          <div class="interrupt-link ${index === 4 ? "active" : ""}"><span>查入口</span></div>
          <div class="interrupt-node vector-table ${isActiveStep(step, "vector") ? "active" : ""}">
            <strong>向量表</strong>
            <span>ISR 地址</span>
          </div>
          <div class="interrupt-link ${index === 5 ? "active" : ""}"><span>跳转</span></div>
          <div class="interrupt-node isr-box ${isActiveStep(step, "isr") ? "active" : ""}">
            <strong>ISR</strong>
            <span>处理并返回</span>
          </div>
        </div>
        <div class="interrupt-return ${index >= 5 ? "active" : ""}">
          <span>恢复现场</span>
          <i></i>
          <b>返回断点继续执行</b>
        </div>
        <div class="interrupt-timeline">
          ${timeline.map((label, itemIndex) => `<span class="${itemIndex === index ? "active" : itemIndex < index ? "done" : ""}"><i>${itemIndex + 1}</i>${label}</span>`).join("")}
        </div>
      </div>
    `;
    return renderDomainFrame("interrupt-domain", "中断响应动画", "外设发 IRQ，CPU 保存现场、取向量并跳转到中断服务程序。", body, result.metrics);
  }

  function renderDmaDomain(result, step, index) {
    const timeline = ["预处理", "请求总线", "数据传送", "更新计数", "结束中断"];
    const body = `
      <div class="dma-stage">
        <div class="dma-flow">
          <div class="dma-node dma-cpu ${index === 0 || isActiveStep(step, "cpu") ? "active" : ""}">
            <strong>CPU</strong>
            <span>初始化参数</span>
          </div>
          <div class="dma-link ${index === 0 ? "active" : ""}"><span>设置地址/计数</span></div>
          <div class="dma-node dma-controller ${isActiveStep(step, "dma") ? "active" : ""}">
            <strong>DMA 控制器</strong>
            <span>地址/计数</span>
          </div>
          <div class="dma-link ${index === 1 ? "active" : ""}"><span>请求总线</span></div>
          <div class="dma-node dma-bus ${isActiveStep(step, "bus") ? "active" : ""}">
            <strong>系统总线</strong>
            <span>接管传送</span>
          </div>
          <div class="dma-link ${index === 2 || index === 3 ? "active" : ""}"><span>搬运数据</span></div>
          <div class="dma-transfer-pair">
            <div class="dma-node dma-device ${isActiveStep(step, "device") ? "active" : ""}">
              <strong>I/O 设备</strong>
              <span>数据源/目的</span>
            </div>
            <div class="dma-data-link ${isActiveStep(step, "bus", "memory", "device") ? "active" : ""}">数据块</div>
            <div class="dma-node dma-memory ${isActiveStep(step, "memory") ? "active" : ""}">
              <strong>主存缓冲区</strong>
              <span>读写数据</span>
            </div>
          </div>
        </div>
        <div class="dma-irq-return ${isActiveStep(step, "irq") ? "active" : ""}">
          <span>结束中断</span>
          <i></i>
          <b>释放总线并通知 CPU</b>
        </div>
        <div class="dma-timeline">
          ${timeline.map((label, itemIndex) => `<span class="${itemIndex === index ? "active" : itemIndex < index ? "done" : ""}"><i>${itemIndex + 1}</i>${label}</span>`).join("")}
        </div>
      </div>
    `;
    return renderDomainFrame("dma-domain", "DMA 块传送动画", "CPU 初始化后，DMA 控制器接管总线在设备和主存间搬运数据块。", body, result.metrics);
  }

  function renderChannelDomain(result, step, index) {
    const timeline = ["准备程序", "启动通道", "读取 CCW", "设备传送", "结束中断"];
    const body = `
      <div class="channel-stage">
        <div class="channel-flow">
          <div class="channel-node channel-cpu ${isActiveStep(step, "cpu") ? "active" : ""}">
            <strong>CPU</strong>
            <span>启动 I/O</span>
          </div>
          <div class="channel-link ${index === 0 || index === 1 ? "active" : ""}">
            <span>准备并启动</span>
          </div>
          <div class="channel-node ccw-list ${isActiveStep(step, "ccw") ? "active" : ""}">
            <strong>通道程序</strong>
            <div class="ccw-fields"><span>READ</span><span>ADDR</span><span>COUNT</span><span>DEV</span></div>
          </div>
          <div class="channel-link ${index === 2 ? "active" : ""}">
            <span>取 CCW</span>
          </div>
          <div class="channel-node channel-processor ${isActiveStep(step, "channel") ? "active" : ""}">
            <strong>通道处理器</strong>
            <span>译码与调度</span>
          </div>
          <div class="channel-link ${index === 3 ? "active" : ""}">
            <span>控制传送</span>
          </div>
          <div class="channel-transfer-pair">
            <div class="channel-node device-controller ${isActiveStep(step, "controller") ? "active" : ""}">
              <strong>设备控制器</strong>
              <span>驱动外设</span>
            </div>
            <div class="channel-data-link ${isActiveStep(step, "controller", "memory") ? "active" : ""}">数据块</div>
            <div class="channel-node channel-memory ${isActiveStep(step, "memory") ? "active" : ""}">
              <strong>主存缓冲区</strong>
              <span>读写数据</span>
            </div>
          </div>
        </div>
        <div class="channel-irq-return ${isActiveStep(step, "irq") ? "active" : ""}">
          <span>结束中断</span>
          <i></i>
          <b>通知 CPU 检查状态字</b>
        </div>
        <div class="channel-timeline">
          ${timeline.map((label, itemIndex) => `<span class="${itemIndex === index ? "active" : itemIndex < index ? "done" : ""}"><i>${itemIndex + 1}</i>${label}</span>`).join("")}
        </div>
      </div>
    `;
    return renderDomainFrame("channel-domain", "通道程序执行动画", "CPU 启动通道后，通道读取通道指令并独立协调控制器和主存。", body, result.metrics);
  }

  function renderPipelineDomain(result, step, index) {
    const stages = ["IF", "ID", "EX", "MEM", "WB"];
    const rows = result.table?.rows || [];
    const body = `
      <div class="pipeline-grid">
        <div class="pipeline-head"></div>
        ${Array.from({ length: 10 }, (_, i) => `<div class="pipeline-head">C${i + 1}</div>`).join("")}
        ${rows.slice(0, 6).map((row, r) => `
          <div class="pipeline-inst">I${r + 1}</div>
          ${Array.from({ length: 10 }, (_, c) => {
            const stage = stages[c - r];
            return `<div class="pipeline-cell ${stage ? "filled" : ""} ${stage && c <= index + r + 1 ? "active" : ""}">${stage || ""}</div>`;
          }).join("")}
        `).join("")}
      </div>
      <div class="pipeline-metrics">瓶颈段决定时钟，填满后理想情况下每周期完成一条指令。</div>
    `;
    return renderDomainFrame("pipeline-domain", "流水线时空图动画", "点击下一步可观察指令在 IF/ID/EX/MEM/WB 各段推进。", body, result.metrics);
  }

  function renderExtendedAnimation(panelId, result, step, index) {
    switch (panelId) {
      case "architecture-flow-sim":
        return renderArchitectureDomain(result, step, index);
      case "history-timeline-sim":
        return renderHistoryDomain(result, step, index);
      case "performance-metrics-sim":
        return renderPerformanceDomain(result, step, index);
      case "number-format-sim":
        return renderNumberFormatDomain(result, step, index);
      case "alu-carry-sim":
        return renderAluDomain(result, step, index);
      case "fixed-multiply-sim":
        return renderMultiplyDomain(result, step, index);
      case "fixed-division-sim":
        return renderDivisionDomain(result, step, index);
      case "float-process-sim":
        return renderFloatDomain(result, step, index);
      case "memory-hierarchy-sim":
        return renderMemoryHierarchyDomain(result, step, index);
      case "memory-cell-sim":
        return renderMemoryCellDomain(result, step, index);
      case "cache-write-sim":
        return renderCacheWriteDomain(result, step, index);
      case "cache-locality-sim":
        return renderCacheLocalityDomain(result, step, index);
      case "tlb-access-sim":
        return renderTlbDomain(result, step, index);
      case "instruction-format-sim":
        return renderInstructionFormatDomain(result, step, index);
      case "instruction-class-sim":
        return renderInstructionClassDomain(result, step, index);
      case "addressing-mode-sim":
        return renderAddressingDomain(result, step, index);
      case "cpu-cycle-sim":
        return renderCpuCycleDomain(result, step, index);
      case "control-mode-sim":
        return renderControlModeDomain(result, step, index);
      case "microinstruction-format-sim":
        return renderMicroinstructionFormatDomain(result, step, index);
      case "microprogram-sim":
        return renderMicroprogramDomain(result, step, index);
      case "bus-structure-sim":
        return renderBusStructureDomain(result, step, index);
      case "display-device-sim":
        return renderDisplayDomain(result, step, index);
      case "disk-access-sim":
        return renderDiskDomain(result, step, index);
      case "raid-ssd-sim":
        return renderRaidSsdDomain(result, step, index);
      case "io-overview-sim":
        return renderIoOverviewDomain(result, step, index);
      case "polling-io-sim":
        return renderPollingDomain(result, step, index);
      case "interrupt-io-sim":
        return renderInterruptDomain(result, step, index);
      case "dma-transfer-sim":
        return renderDmaDomain(result, step, index);
      case "channel-io-sim":
        return renderChannelDomain(result, step, index);
      case "pipeline-performance-sim":
        return renderPipelineDomain(result, step, index);
      default:
        return "";
    }
  }

  function renderExtendedSimulation(panelId) {
    const entry = state.extended[panelId];
    const resultEl = $(`#${panelId}-result`);
    const counter = $(`#${panelId}-counter`);
    if (!resultEl) return;
    if (!entry || !entry.result) {
      resultEl.innerHTML = `<div class="empty-state">点击“运行演示”后查看该知识点的交互过程。</div>`;
      if (counter) counter.textContent = "等待运行";
      return;
    }
    const result = entry.result;
    const index = clamp(entry.cursor, 0, result.steps.length - 1);
    const step = result.steps[index];
    const sideHtml = [
      panelId === "architecture-flow-sim" ? "" : renderMetricGrid(result.metrics),
      renderExtendedTable(result.table),
      result.notes?.length ? `<div class="signal-board compact">${result.notes.map((note) => `<div class="signal-chip"><strong>${escapeHtml(note.title)}</strong><span>${escapeHtml(note.detail)}</span></div>`).join("")}</div>` : "",
    ].join("");
    if (counter) counter.textContent = `第 ${index + 1} / ${result.steps.length} 步`;
    resultEl.innerHTML = `
      <div class="memory-stage-card focus-card">
        <span>当前步骤</span>
        <h4>${escapeHtml(step.title)}</h4>
        <p>${escapeHtml(step.detail)}</p>
      </div>
      <div class="extended-sim-grid">
        ${renderLearningStepper(result.steps.map((item) => ({ title: item.title, detail: item.detail })), index, "extended-stepper")}
        <div class="extended-board">
          ${renderExtendedAnimation(panelId, result, step, index)}
          ${renderNodeGrid(result.nodes, step.active || [])}
          ${result.formula ? `<div class="control-equation"><strong>公式 / 规则</strong><span>${escapeHtml(result.formula)}</span><code>${escapeHtml(step.formula || result.formula)}</code></div>` : ""}
          ${result.diagram ? `<div class="extended-diagram">${result.diagram}</div>` : ""}
        </div>
        ${sideHtml ? `<div class="extended-side">${sideHtml}</div>` : ""}
      </div>
    `;
  }

  function bindExtendedSimulationEvents() {
    $all("[data-extended-run]").forEach((button) => {
      button.addEventListener("click", () => runExtendedSimulation(button.dataset.extendedRun));
    });
    $all("[data-extended-prev]").forEach((button) => {
      button.addEventListener("click", () => stepExtendedSimulation(button.dataset.extendedPrev, -1));
    });
    $all("[data-extended-next]").forEach((button) => {
      button.addEventListener("click", () => stepExtendedSimulation(button.dataset.extendedNext, 1));
    });
    $all("[data-extended-auto]").forEach((button) => {
      button.addEventListener("click", () => toggleExtendedSimulationAuto(button.dataset.extendedAuto));
    });
    $all("[data-extended-reset]").forEach((button) => {
      button.addEventListener("click", () => resetExtendedSimulation(button.dataset.extendedReset));
    });
  }

  function createExtendedSimulation(panelId, values) {
    switch (panelId) {
      case "architecture-flow-sim":
        return simulateArchitectureFlow(values);
      case "history-timeline-sim":
        return simulateHistoryTimeline(values);
      case "performance-metrics-sim":
        return simulatePerformanceMetrics(values);
      case "number-format-sim":
        return simulateNumberFormat(values);
      case "alu-carry-sim":
        return simulateAluCarry(values);
      case "fixed-multiply-sim":
        return simulateFixedMultiply(values);
      case "fixed-division-sim":
        return simulateFixedDivision(values);
      case "float-process-sim":
        return simulateFloatProcess(values);
      case "memory-hierarchy-sim":
        return simulateMemoryHierarchy(values);
      case "memory-cell-sim":
        return simulateMemoryCell(values);
      case "cache-write-sim":
        return simulateCacheWritePolicy(values);
      case "cache-locality-sim":
        return simulateCacheLocality(values);
      case "tlb-access-sim":
        return simulateTlbAccess(values);
      case "instruction-format-sim":
        return simulateInstructionFormat(values);
      case "instruction-class-sim":
        return simulateInstructionClass(values);
      case "addressing-mode-sim":
        return simulateAddressingMode(values);
      case "cpu-cycle-sim":
        return simulateCpuCycle(values);
      case "control-mode-sim":
        return simulateControlMode(values);
      case "microinstruction-format-sim":
        return simulateMicroinstructionFormat(values);
      case "microprogram-sim":
        return simulateMicroprogram(values);
      case "bus-structure-sim":
        return simulateBusStructure(values);
      case "display-device-sim":
        return simulateDisplayDevice(values);
      case "disk-access-sim":
        return simulateDiskAccess(values);
      case "raid-ssd-sim":
        return simulateRaidSsd(values);
      case "io-overview-sim":
        return simulateIoOverview(values);
      case "polling-io-sim":
        return simulatePollingIo(values);
      case "interrupt-io-sim":
        return simulateInterruptIo(values);
      case "dma-transfer-sim":
        return simulateDmaTransfer(values);
      case "channel-io-sim":
        return simulateChannelIo(values);
      case "pipeline-performance-sim":
        return simulatePipelinePerformance(values);
      default:
        throw new Error("未知的扩展仿真");
    }
  }

  function extendedResult({ steps, nodes, metrics = [], table = null, notes = [], formula = "", diagram = "", ...rest }) {
    return { steps, nodes, metrics, table, notes, formula, diagram, ...rest };
  }

  function simulateArchitectureFlow(values) {
    const programLabel = {
      add: "C = A + B",
      load: "从内存取数再计算",
      io: "输入设备到输出设备",
    }[values.program] || "C = A + B";
    return extendedResult({
      formula: "存储程序：程序和数据同存在存储器中，CPU 按 PC 指示顺序取指并执行",
      nodes: [
        { id: "input", title: "输入设备", detail: "输入程序、数据或外设状态" },
        { id: "memory", title: "存储器", detail: "保存程序和数据" },
        { id: "control", title: "控制器", detail: "取指、译码、发控制信号" },
        { id: "alu", title: "运算器", detail: "执行算术逻辑运算" },
        { id: "output", title: "输出设备", detail: "输出结果或状态" },
        { id: "software", title: "软件层次", detail: "编译、汇编、装载后形成机器指令" },
      ],
      steps: [
        { title: "高级语言描述任务", detail: `${programLabel} 先由程序员或应用软件表达。`, active: ["software", "input"] },
        { title: "编译/汇编形成机器指令", detail: "高级语言经编译、汇编、链接和装载，变成存储器中的二进制指令序列。", active: ["software", "memory"] },
        { title: "PC 指向下一条指令", detail: "控制器把 PC 的内容送往地址通路，准备从存储器取出指令。", active: ["control", "memory"] },
        { title: "取指并译码", detail: "存储器返回指令字，IR 保存当前指令，控制器解释操作码和地址字段。", active: ["control", "memory"] },
        { title: "执行数据加工或访存", detail: "运算器完成加减逻辑操作，必要时通过总线读写存储器或 I/O 接口。", active: values.program === "io" ? ["control", "input", "output"] : ["control", "alu", "memory"] },
        { title: "保存结果并推进 PC", detail: "结果写回寄存器、存储器或输出设备，PC 更新后进入下一条指令。", active: ["control", "memory", "output"] },
      ],
      metrics: [
        { label: "程序", value: programLabel },
        { label: "核心思想", value: "存储程序" },
        { label: "执行粒度", value: "指令序列" },
      ],
    });
  }

  function simulateHistoryTimeline(values) {
    const data = {
      tube: ["电子管", "1946-1957", "机房级体积、功耗高、可靠性低", "手动接线/机器语言", "科学计算"],
      transistor: ["晶体管", "1958-1964", "体积和功耗显著下降，稳定性提升", "汇编和早期高级语言", "商业数据处理"],
      ic: ["集成电路", "1965-1970", "集成化、标准化，成本下降", "操作系统和通用软件生态", "通用计算机"],
      vlsi: ["VLSI / ULSI", "1971 至今", "微处理器、数十亿晶体管、移动和 AI 算力", "高级语言、并行框架、AI 软件栈", "个人计算、云和智能设备"],
    };
    const current = data[values.stage] || data.vlsi;
    return extendedResult({
      formula: "摩尔定律估算：晶体管数约每 18-24 个月翻倍",
      nodes: [
        { id: "device", title: "核心器件", detail: current[0] },
        { id: "time", title: "时间区间", detail: current[1] },
        { id: "hardware", title: "硬件特征", detail: current[2] },
        { id: "software", title: "编程方式", detail: current[3] },
        { id: "application", title: "应用范围", detail: current[4] },
      ],
      steps: [
        { title: "定位历史阶段", detail: `${current[1]} 的核心器件是 ${current[0]}。`, active: ["device", "time"] },
        { title: "观察硬件代际变化", detail: current[2], active: ["hardware"] },
        { title: "观察软件生态变化", detail: current[3], active: ["software"] },
        { title: "观察应用边界扩大", detail: current[4], active: ["application"] },
        { title: "归纳演变趋势", detail: "从专用科学计算设备，演变为通用、低功耗、可编程的信息处理平台。", active: ["device", "hardware", "application"] },
      ],
      metrics: [
        { label: "阶段", value: current[0] },
        { label: "区间", value: current[1] },
        { label: "趋势", value: "更小/更快/更省电" },
      ],
      table: {
        headers: ["阶段", "核心器件", "代表变化"],
        rows: Object.values(data).map((item) => [item[1], item[0], item[2]]),
      },
    });
  }

  function simulatePerformanceMetrics(values) {
    const instructions = Math.max(1, toNumber(values.instructions, 1));
    const cpi = Math.max(0.01, toNumber(values.cpi, 1));
    const clockGhz = Math.max(0.001, toNumber(values.clockGhz, 1));
    const flopsPerInst = Math.max(0, toNumber(values.flopsPerInst, 0));
    const cycles = instructions * cpi;
    const seconds = cycles / (clockGhz * 1_000_000_000);
    const mips = (clockGhz * 1000) / cpi;
    const mflops = (instructions * flopsPerInst / seconds) / 1_000_000;
    return extendedResult({
      formula: "CPU 时间 = 指令条数 × CPI / 主频；MIPS = 主频(MHz) / CPI",
      nodes: [
        { id: "ic", title: "指令条数", detail: instructions.toLocaleString() },
        { id: "cpi", title: "CPI", detail: String(cpi) },
        { id: "clock", title: "主频", detail: `${clockGhz} GHz` },
        { id: "time", title: "CPU 时间", detail: `${seconds.toFixed(6)} s` },
        { id: "throughput", title: "吞吐率", detail: `${mips.toFixed(2)} MIPS` },
      ],
      steps: [
        { title: "确定指令条数", detail: `程序需要执行 ${instructions.toLocaleString()} 条机器指令。`, active: ["ic"] },
        { title: "折算总时钟周期", detail: `总周期数 = ${instructions.toLocaleString()} × ${cpi} = ${cycles.toLocaleString()}。`, active: ["ic", "cpi"], formula: `${instructions} × ${cpi}` },
        { title: "用主频换算 CPU 时间", detail: `主频 ${clockGhz} GHz，每秒 ${clockGhz * 1000}M 个周期。`, active: ["clock", "time"], formula: `${cycles} / (${clockGhz} × 10^9)` },
        { title: "计算 MIPS", detail: `MIPS = 主频(MHz) / CPI = ${(clockGhz * 1000).toFixed(1)} / ${cpi}。`, active: ["throughput"], formula: `${(clockGhz * 1000).toFixed(1)} / ${cpi}` },
        { title: "估算 MFLOPS", detail: `若每条指令平均贡献 ${flopsPerInst} 次浮点操作，约为 ${mflops.toFixed(2)} MFLOPS。`, active: ["throughput"] },
      ],
      metrics: [
        { label: "总周期", value: cycles.toLocaleString() },
        { label: "CPU 时间", value: `${seconds.toFixed(6)} s` },
        { label: "MIPS", value: mips.toFixed(2) },
        { label: "MFLOPS", value: mflops.toFixed(2) },
      ],
    });
  }

  function simulateNumberFormat(values) {
    const bits = toPositiveInt(values.bits, 8);
    const value = Math.trunc(toNumber(values.value, 0));
    const signBit = value < 0 ? 1 : 0;
    const magnitudeLimit = 2 ** (bits - 1) - 1;
    const clippedMagnitude = Math.min(Math.abs(value), magnitudeLimit);
    const magnitude = clippedMagnitude.toString(2).padStart(bits - 1, "0");
    const signMagnitude = `${signBit}${magnitude}`;
    const ones = value < 0
      ? signMagnitude.split("").map((bit, index) => index === 0 ? bit : bit === "0" ? "1" : "0").join("")
      : signMagnitude;
    const twosUnsigned = ((value % (2 ** bits)) + (2 ** bits)) % (2 ** bits);
    const bias = 2 ** (bits - 1);
    const excess = ((value + bias) % (2 ** bits) + (2 ** bits)) % (2 ** bits);
    return extendedResult({
      formula: `补码按模 ${2 ** bits} 表示；移码 = 真值 + ${bias}`,
      nodes: [
        { id: "truth", title: "真值", detail: String(value) },
        { id: "sign", title: "原码", detail: signMagnitude },
        { id: "ones", title: "反码", detail: ones },
        { id: "twos", title: "补码", detail: binary(twosUnsigned, bits) },
        { id: "excess", title: "移码", detail: binary(excess, bits) },
      ],
      steps: [
        { title: "确定符号和绝对值", detail: `符号位为 ${signBit}，数值位使用 ${magnitude}。`, active: ["truth", "sign"] },
        { title: "得到原码", detail: `原码为符号位加绝对值：${signMagnitude}。`, active: ["sign"] },
        { title: "得到反码", detail: value < 0 ? `负数反码为符号位不变、数值位取反：${ones}。` : "正数反码与原码相同。", active: ["ones"] },
        { title: "得到补码", detail: value < 0 ? `负数补码为反码加 1，结果 ${binary(twosUnsigned, bits)}。` : "正数补码与原码相同。", active: ["twos"] },
        { title: "得到移码", detail: `移码用于偏置表示：${value} + ${bias} = ${value + bias}。`, active: ["excess"] },
      ],
      metrics: [
        { label: "位数", value: `${bits} bit` },
        { label: "补码范围", value: `${-(2 ** (bits - 1))} ~ ${2 ** (bits - 1) - 1}` },
        { label: "补码解释", value: String(signedFromUnsignedLocal(twosUnsigned, bits)) },
      ],
      table: {
        headers: ["表示", "编码"],
        rows: [
          ["原码", signMagnitude],
          ["反码", ones],
          ["补码", binary(twosUnsigned, bits)],
          ["移码", binary(excess, bits)],
        ],
      },
    });
  }

  function simulateAluCarry(values) {
    const bits = toPositiveInt(values.bits, 8);
    const mask = 2 ** bits - 1;
    const a = Math.trunc(toNumber(values.a, 0)) & mask;
    const bRaw = Math.trunc(toNumber(values.b, 0)) & mask;
    const op = values.op || "add";
    const b = op === "sub" ? ((~bRaw + 1) & mask) : bRaw;
    let raw = 0;
    if (op === "and") raw = a & bRaw;
    else if (op === "or") raw = a | bRaw;
    else raw = a + b;
    const result = raw & mask;
    const carryOut = raw > mask ? 1 : 0;
    const signedA = signedFromUnsignedLocal(a, bits);
    const signedB = signedFromUnsignedLocal(op === "sub" ? b : bRaw, bits);
    const signedResult = signedFromUnsignedLocal(result, bits);
    const overflow = op === "add" || op === "sub"
      ? ((signedA >= 0 && signedB >= 0 && signedResult < 0) || (signedA < 0 && signedB < 0 && signedResult >= 0))
      : false;
    const traceRows = [];
    let carry = op === "sub" ? 1 : 0;
    for (let pos = 0; pos < bits; pos += 1) {
      const ai = (a >> pos) & 1;
      const bi = op === "sub" ? ((~bRaw >> pos) & 1) : (bRaw >> pos) & 1;
      const sum = op === "add" || op === "sub" ? ai + bi + carry : op === "and" ? ai & bi : ai | bi;
      const nextCarry = op === "add" || op === "sub" ? (sum >= 2 ? 1 : 0) : 0;
      traceRows.push({
        bit: `b${pos}`,
        ai: String(ai),
        bi: String(bi),
        cin: String(carry),
        si: String(sum & 1),
        cout: String(nextCarry),
      });
      carry = nextCarry;
    }
    const rows = traceRows
      .slice()
      .reverse()
      .map((row) => [row.bit, row.ai, row.bi, row.cin, row.si, row.cout]);
    const aluSteps = [
      { title: "装入操作数", detail: `A=${binary(a, bits)}，B=${binary(bRaw, bits)}。`, active: ["a", "b"], traceIndex: -1 },
      { title: "选择 ALU 功能", detail: op === "sub" ? "减法先把 B 取反加 1，再进入加法器。" : `当前执行 ${op.toUpperCase()}。`, active: ["adder"], traceIndex: -1 },
      ...traceRows.map((row, bitIndex) => ({
        title: `处理 ${row.bit}`,
        detail: op === "add" || op === "sub"
          ? `${row.bit}: ${row.ai} + ${row.bi} + Cin ${row.cin} 得到 S=${row.si}，Cout=${row.cout}。`
          : `${row.bit}: A=${row.ai}，B=${row.bi}，执行 ${op.toUpperCase()} 得到 S=${row.si}。`,
        active: ["adder", "cla"],
        traceIndex: bitIndex,
      })),
      { title: "写入标志位", detail: `结果 ${signedResult}，Z=${result === 0 ? 1 : 0}，C=${carryOut}，V=${overflow ? 1 : 0}。`, active: ["flags"], traceIndex: traceRows.length },
    ];
    return extendedResult({
      formula: op === "sub" ? "A - B = A + (~B + 1)" : op === "add" ? "Si = Ai xor Bi xor Ci；Ci+1 = Gi + Pi·Ci" : "逻辑运算不产生算术进位",
      nodes: [
        { id: "a", title: "操作数 A", detail: binary(a, bits) },
        { id: "b", title: "操作数 B", detail: binary(bRaw, bits) },
        { id: "adder", title: "全加器阵列", detail: "逐位生成 S 和 C" },
        { id: "cla", title: "CLA", detail: "用 G/P 加速进位" },
        { id: "flags", title: "标志位", detail: `Z=${result === 0 ? 1 : 0}, C=${carryOut}, V=${overflow ? 1 : 0}` },
      ],
      steps: aluSteps,
      metrics: [
        { label: "结果", value: binary(result, bits) },
        { label: "有符号值", value: String(signedResult) },
        { label: "CF", value: String(carryOut) },
        { label: "OF", value: overflow ? "1" : "0" },
      ],
      table: { headers: ["位", "Ai", "Bi", "Cin", "Si", "Cout"], rows },
      aluTrace: traceRows,
    });
  }

  function simulateFixedMultiply(values) {
    const bits = toPositiveInt(values.bits, 8);
    const productBits = bits * 2;
    const widthValue = (width) => 2 ** width;
    const wrapInt = (value, width) => ((value % widthValue(width)) + widthValue(width)) % widthValue(width);
    const bitAt = (value, pos) => Math.floor(value / (2 ** pos)) % 2;
    const method = values.method || "booth";
    const xInput = Math.trunc(toNumber(values.multiplicand, 0));
    const yInput = Math.trunc(toNumber(values.multiplier, 0));
    const xUnsigned = wrapInt(xInput, bits);
    const yUnsigned = wrapInt(yInput, bits);
    const xSigned = signedFromUnsignedLocal(xUnsigned, bits);
    const ySigned = signedFromUnsignedLocal(yUnsigned, bits);
    const trace = [];
    const rows = [];

    const methodLabel = {
      "shift-add": "无符号移位加法",
      "sign-magnitude": "原码一位乘",
      booth: "Booth 补码乘法",
    }[method] || "Booth 补码乘法";

    let product = 0;
    let productUnsigned = 0;
    const initialA = binary(0, bits);
    const initialQ = binary(method === "sign-magnitude" ? Math.abs(ySigned) : yUnsigned, bits);
    const multiplicandRegister = method === "shift-add" ? binary(xUnsigned, bits) : binary(xUnsigned, bits);
    const multiplicandDecimal = method === "shift-add" ? String(xUnsigned) : String(xSigned);

    if (method === "booth") {
      let aReg = 0;
      let qReg = yUnsigned;
      let qMinus1 = 0;

      for (let pos = 0; pos < bits; pos += 1) {
        const beforeA = aReg;
        const beforeQ = qReg;
        const beforeQMinus1 = qMinus1;
        const q0 = bitAt(qReg, 0);
        const pair = `Q0Q-1=${q0}${qMinus1}`;
        const signedA = signedFromUnsignedLocal(aReg, bits);
        let afterOp = aReg;
        let action = "保持 A";

        if (q0 === 0 && qMinus1 === 1) {
          afterOp = wrapInt(signedA + xSigned, bits);
          action = "A = A + M";
        } else if (q0 === 1 && qMinus1 === 0) {
          afterOp = wrapInt(signedA - xSigned, bits);
          action = "A = A - M";
        }

        const sign = bitAt(afterOp, bits - 1);
        const combined = afterOp * widthValue(bits + 1) + qReg * 2 + qMinus1;
        const shifted = Math.floor(combined / 2) + sign * widthValue(productBits);
        const nextA = Math.floor(shifted / widthValue(bits + 1)) % widthValue(bits);
        const nextQ = Math.floor(shifted / 2) % widthValue(bits);
        const nextQMinus1 = shifted % 2;
        const productRegisterUnsigned = nextA * widthValue(bits) + nextQ;
        const item = {
          round: `第 ${pos + 1} 轮`,
          pair,
          action,
          beforeA: binary(beforeA, bits),
          afterOpA: binary(afterOp, bits),
          afterShiftA: binary(nextA, bits),
          beforeQ: binary(beforeQ, bits),
          afterShiftQ: binary(nextQ, bits),
          beforeQMinus1: String(beforeQMinus1),
          afterQMinus1: String(nextQMinus1),
          shiftDetail: `算术右移后 A=${binary(nextA, bits)}，Q=${binary(nextQ, bits)}，Q-1=${nextQMinus1}`,
          productRegister: `${binary(nextA, bits)} ${binary(nextQ, bits)}`,
          productDecimal: String(signedFromUnsignedLocal(productRegisterUnsigned, productBits)),
        };
        trace.push(item);
        rows.push([
          item.round,
          item.pair,
          item.action,
          `${item.beforeA} -> ${item.afterOpA} -> ${item.afterShiftA}`,
          `${item.beforeQ} -> ${item.afterShiftQ}，Q-1 ${beforeQMinus1}->${nextQMinus1}`,
          item.productRegister,
        ]);
        aReg = nextA;
        qReg = nextQ;
        qMinus1 = nextQMinus1;
      }

      productUnsigned = wrapInt(aReg * widthValue(bits) + qReg, productBits);
      product = signedFromUnsignedLocal(productUnsigned, productBits);
    } else {
      const signedMode = method === "sign-magnitude";
      const multiplicandMagnitude = signedMode ? Math.abs(xSigned) : xUnsigned;
      const multiplierMagnitude = signedMode ? Math.abs(ySigned) : yUnsigned;
      const resultSign = signedMode && xSigned * ySigned < 0 ? -1 : 1;
      let accumulator = 0;

      for (let pos = 0; pos < bits; pos += 1) {
        const beforeAccumulator = accumulator;
        const bit = bitAt(multiplierMagnitude, pos);
        const partial = bit ? multiplicandMagnitude * (2 ** pos) : 0;
        accumulator += partial;
        const signedValue = signedMode ? resultSign * accumulator : accumulator;
        const productRegisterUnsigned = wrapInt(signedValue, productBits);
        const item = {
          round: `第 ${pos + 1} 位`,
          pair: `Y${pos}=${bit}`,
          action: bit ? `加 ${multiplicandMagnitude}×2^${pos}` : "不加部分积",
          beforeA: String(beforeAccumulator),
          afterOpA: String(accumulator),
          afterShiftA: String(accumulator),
          beforeQ: binary(Math.floor(multiplierMagnitude / (2 ** pos)), bits),
          afterShiftQ: binary(Math.floor(multiplierMagnitude / (2 ** (pos + 1))), bits),
          beforeQMinus1: "-",
          afterQMinus1: "-",
          shiftDetail: bit ? `本轮部分积 ${partial}` : "本轮部分积为 0",
          productRegister: binary(productRegisterUnsigned, productBits),
          productDecimal: String(signedValue),
        };
        trace.push(item);
        rows.push([
          item.round,
          item.pair,
          item.action,
          `${beforeAccumulator} + ${partial} = ${accumulator}`,
          String(partial),
          item.productRegister,
        ]);
      }

      product = signedMode ? resultSign * accumulator : accumulator;
      productUnsigned = wrapInt(product, productBits);
    }

    const steps = [
      {
        title: "装入操作数",
        detail: `M=${multiplicandRegister}，Q=${initialQ}，A 清零，按 ${bits} 位解释。`,
        active: ["x", "y"],
        traceIndex: -1,
      },
      ...trace.map((item, i) => ({
        title: `${item.round}：${item.action}`,
        detail: method === "booth"
          ? `${item.pair}，${item.action}，随后对 A/Q/Q-1 做算术右移。`
          : `${item.pair}，${item.action}，累加器由 ${item.beforeA} 更新为 ${item.afterOpA}。`,
        active: ["recoder", "partial", "adder"],
        traceIndex: i,
      })),
      {
        title: "得到双倍位宽乘积",
        detail: `结果按 ${productBits} 位保存为 ${binary(productUnsigned, productBits)}，十进制解释为 ${product}。`,
        active: ["product"],
        traceIndex: trace.length - 1,
      },
    ];

    return extendedResult({
      formula: method === "booth"
        ? "Booth 判别：Q0Q-1=01 加被乘数，10 减被乘数，00/11 保持"
        : "乘法 = 按乘数位选择部分积，再按位权左移累加",
      nodes: [
        { id: "x", title: "被乘数 X", detail: method === "shift-add" ? binary(xUnsigned, bits) : `${xSigned} (${binary(xUnsigned, bits)})` },
        { id: "y", title: "乘数 Y", detail: method === "shift-add" ? binary(yUnsigned, bits) : `${ySigned} (${binary(yUnsigned, bits)})` },
        { id: "recoder", title: "乘数判别", detail: methodLabel },
        { id: "partial", title: "部分积", detail: "选择、取反或保持" },
        { id: "adder", title: "累加器", detail: "移位累加" },
        { id: "product", title: "乘积", detail: `${product} (${binary(productUnsigned, productBits)})` },
      ],
      steps,
      metrics: [
        { label: "算法", value: methodLabel },
        { label: "结果", value: String(product) },
        { label: "结果位宽", value: `${productBits} bit` },
      ],
      table: { headers: ["轮次", "判别位", "动作", "A / 累加器", "Q / 部分积", "乘积寄存器"], rows },
      multiplyMode: method,
      multiplyTrace: trace,
      initialA,
      initialQ,
      initialQMinus1: "0",
      multiplicandRegister,
      multiplicandDecimal,
      productRegister: binary(productUnsigned, productBits),
      productDecimal: String(product),
    });
  }

  function simulateFixedDivision(values) {
    const bits = toPositiveInt(values.bits, 8);
    const method = values.method || "restoring";
    const dividendInput = Math.trunc(toNumber(values.dividend, 0));
    const divisorInput = Math.trunc(toNumber(values.divisor, 1));
    if (divisorInput === 0) {
      throw new Error("除数不能为 0");
    }
    const widthValue = (width) => 2 ** width;
    const bitAt = (value, pos) => Math.floor(value / (2 ** pos)) % 2;
    const dividendMagnitude = Math.abs(dividendInput) % widthValue(bits);
    const divisorMagnitude = Math.max(1, Math.abs(divisorInput) % widthValue(bits));
    const quotientSign = Math.sign(dividendInput || 1) * Math.sign(divisorInput || 1);
    let remainder = 0;
    let quotientMagnitude = 0;
    const rows = [];
    const trace = [];
    const methodLabel = method === "non-restoring" ? "不恢复余数法" : "恢复余数法";

    for (let pos = bits - 1; pos >= 0; pos -= 1) {
      const incomingBit = bitAt(dividendMagnitude, pos);
      const beforeR = remainder;
      const shiftedR = remainder * 2 + incomingBit;
      let trial = 0;
      let afterR = 0;
      let qbit = 0;
      let operation = "";
      let decision = "";
      let correction = "";

      if (method === "restoring") {
        trial = shiftedR - divisorMagnitude;
        operation = `${shiftedR} - ${divisorMagnitude} = ${trial}`;
        if (trial >= 0) {
          afterR = trial;
          qbit = 1;
          decision = "够减，商 1";
          correction = "保留试减后的余数";
        } else {
          afterR = shiftedR;
          qbit = 0;
          decision = "不够减，商 0";
          correction = `恢复余数为 ${afterR}`;
        }
      } else {
        const subtract = shiftedR >= 0;
        trial = subtract ? shiftedR - divisorMagnitude : shiftedR + divisorMagnitude;
        operation = `${shiftedR} ${subtract ? "-" : "+"} ${divisorMagnitude} = ${trial}`;
        afterR = trial;
        qbit = trial >= 0 ? 1 : 0;
        decision = trial >= 0 ? "余数非负，商 1" : "余数为负，商 0";
        correction = trial >= 0 ? "下一轮继续试减除数" : "下一轮左移后改加除数";
      }

      if (qbit === 1) quotientMagnitude += 2 ** pos;
      const item = {
        round: `处理 b${pos}`,
        bit: `b${pos}`,
        incomingBit: String(incomingBit),
        beforeR: String(beforeR),
        shiftedR: String(shiftedR),
        operation,
        trialDetail: `R: ${beforeR} 左移引入 ${incomingBit} -> ${shiftedR}`,
        qbit: String(qbit),
        afterR: String(afterR),
        quotientRegister: binary(quotientMagnitude, bits),
        quotientDetail: `Q${pos}=${qbit}`,
        decision,
        correction,
        shiftDetail: `R <- ${beforeR}×2 + ${incomingBit} = ${shiftedR}`,
      };
      trace.push(item);
      rows.push([item.round, item.shiftDetail, item.operation, item.qbit, item.afterR, item.quotientRegister]);
      remainder = afterR;
    }

    if (method === "non-restoring" && remainder < 0) {
      const beforeR = remainder;
      remainder += divisorMagnitude;
      const item = {
        round: "末尾校正",
        bit: "校正",
        incomingBit: "-",
        beforeR: String(beforeR),
        shiftedR: String(beforeR),
        operation: `${beforeR} + ${divisorMagnitude} = ${remainder}`,
        trialDetail: "不恢复余数法结束时余数为负",
        qbit: "-",
        afterR: String(remainder),
        quotientRegister: binary(quotientMagnitude, bits),
        quotientDetail: "商不再改变",
        decision: "负余数加回除数",
        correction: "得到最终非负余数",
        shiftDetail: "末尾校正",
      };
      trace.push(item);
      rows.push([item.round, item.shiftDetail, item.operation, item.qbit, item.afterR, item.quotientRegister]);
    }

    const quotient = quotientSign < 0 ? -quotientMagnitude : quotientMagnitude;
    const finalRemainder = dividendInput < 0 ? -remainder : remainder;
    const quotientBits = Math.abs(quotient).toString(2).padStart(bits, "0").slice(-bits);
    const steps = [
      {
        title: "装入被除数和除数",
        detail: `被除数幅值 ${dividendMagnitude}，除数幅值 ${divisorMagnitude}，R 清零，Q 等待写入。`,
        active: ["dividend", "divisor"],
        traceIndex: -1,
      },
      ...trace.map((item, traceIndex) => ({
        title: item.qbit === "-" ? "校正最终余数" : `${item.round}：写商 ${item.qbit}`,
        detail: `${item.shiftDetail}；${item.operation}；${item.decision}。`,
        active: item.qbit === "-" ? ["remainder", "subtract"] : ["dividend", "remainder", "subtract", "quotient"],
        traceIndex,
      })),
      {
        title: "完成符号修正",
        detail: `商为 ${quotient}，余数为 ${finalRemainder}。`,
        active: ["quotient", "remainder"],
        traceIndex: trace.length - 1,
      },
    ];

    return extendedResult({
      formula: method === "non-restoring"
        ? "不恢复余数：余数为正下轮减除数，余数为负下轮加除数，末尾必要时校正"
        : "恢复余数：每轮试减除数，若余数为负则恢复并商 0，否则商 1",
      nodes: [
        { id: "dividend", title: "被除数", detail: `${dividendInput} (${binary(dividendMagnitude, bits)})` },
        { id: "divisor", title: "除数", detail: `${divisorInput} (${binary(divisorMagnitude, bits)})` },
        { id: "remainder", title: "余数寄存器", detail: String(finalRemainder) },
        { id: "subtract", title: "试减/校正", detail: methodLabel },
        { id: "quotient", title: "商寄存器", detail: `${quotient} (${quotientBits})` },
      ],
      steps,
      metrics: [
        { label: "算法", value: methodLabel },
        { label: "商", value: String(quotient) },
        { label: "余数", value: String(finalRemainder) },
      ],
      table: { headers: ["轮次", "左移引入", "试算", "商位", "余数", "Q"], rows },
      divisionTrace: trace,
      divisionBits: bits,
      initialR: "0",
      initialQ: binary(0, bits),
      divisorRegister: String(divisorMagnitude),
      divisorDecimal: divisorInput < 0 ? `原除数 ${divisorInput}` : "",
    });
  }

  function simulateFloatProcess(values) {
    const a = toNumber(values.a, 0);
    const b = toNumber(values.b, 0);
    const operation = values.operation || "add";
    const effectiveB = operation === "sub" ? -b : b;
    const result = operation === "repr" ? a : a + effectiveB;
    const fieldOf = (value) => {
      const buffer = new ArrayBuffer(4);
      const view = new DataView(buffer);
      view.setFloat32(0, value);
      const raw = view.getUint32(0);
      const sign = raw >>> 31;
      const exponentRaw = (raw >>> 23) & 0xff;
      const fraction = raw & 0x7fffff;
      const category = exponentRaw === 0xff
        ? fraction === 0 ? "无穷大" : "NaN"
        : exponentRaw === 0
          ? fraction === 0 ? "零" : "非规格化"
          : "规格化";
      return {
        raw,
        sign,
        exponentRaw,
        exponentValue: exponentRaw === 0 ? -126 : exponentRaw - 127,
        fraction,
        category,
      };
    };
    const fa = fieldOf(a);
    const fb = fieldOf(effectiveB);
    const fr = fieldOf(result);
    const expDiff = Math.abs(fa.exponentValue - fb.exponentValue);
    const opLabel = operation === "repr" ? "字段拆解" : operation === "sub" ? "A - B" : "A + B";
    const resultBits = `${fr.sign} ${binary(fr.exponentRaw, 8)} ${binary(fr.fraction, 23)}`;
    const fieldView = (label, value, field) => ({
      label,
      sign: field.sign,
      exponentBits: binary(field.exponentRaw, 8),
      fractionBits: binary(field.fraction, 23),
      valueText: `${Number.isFinite(value) ? Number(value).toPrecision(8) : String(value)} / ${field.category}`,
    });
    const significandOf = (field) => {
      if (field.exponentRaw === 0xff) return 0;
      return field.exponentRaw === 0 ? field.fraction : 2 ** 23 + field.fraction;
    };
    const mantissaText = (field) => {
      if (field.exponentRaw === 0xff) return field.fraction === 0 ? "Infinity" : "NaN";
      return `${field.exponentRaw === 0 ? "0" : "1"}.${binary(field.fraction, 23)}`;
    };
    const shiftRightText = (value, shift) => {
      if (shift <= 0) return binary(value, 24);
      if (shift > 30) return "0".repeat(24);
      return binary(Math.floor(value / (2 ** shift)), 24);
    };
    const operands = [
      { label: "A", value: a, field: fa, sig: significandOf(fa) },
      { label: operation === "sub" ? "-B" : "B", value: effectiveB, field: fb, sig: significandOf(fb) },
    ];
    const finiteOperands = operands.every((item) => item.field.exponentRaw !== 0xff);
    const large = operands[0].field.exponentValue >= operands[1].field.exponentValue ? operands[0] : operands[1];
    const small = large === operands[0] ? operands[1] : operands[0];
    const alignedSmall = finiteOperands ? (expDiff > 30 ? 0 : Math.floor(small.sig / (2 ** expDiff))) : 0;
    const largeSigned = large.field.sign ? -large.sig : large.sig;
    const smallSigned = small.field.sign ? -alignedSmall : alignedSmall;
    const rawMantissa = operation === "repr" ? operands[0].sig : largeSigned + smallSigned;
    const mantissaVerb = operation === "repr"
      ? "只拆解字段，不执行尾数运算"
      : fa.sign === fb.sign
        ? "同号尾数相加"
        : "异号尾数相减，结果取绝对值较大一方符号";
    const floatTrace = {
      fields: {
        a: fieldView("A", a, fa),
        b: fieldView(operation === "sub" ? "有效 B = -B" : "B", effectiveB, fb),
        result: fieldView("Result", result, fr),
      },
      align: {
        title: `阶差 ${expDiff}`,
        detail: operation === "repr" ? "只观察 A 的 IEEE 754 字段。" : `${small.label} 的尾数右移 ${expDiff} 位，对齐到 ${large.label} 的阶码 ${large.field.exponentValue}。`,
        large: `${large.label}: ${mantissaText(large.field)} × 2^${large.field.exponentValue}`,
        small: operation === "repr" ? "-" : `${small.label}: ${binary(small.sig, 24)} >> ${expDiff} = ${shiftRightText(small.sig, expDiff)}`,
      },
      mantissa: {
        title: mantissaVerb,
        detail: operation === "repr" ? mantissaText(fa) : `带符号尾数计算结果为 ${rawMantissa}。`,
        expression: operation === "repr" ? `${mantissaText(fa)} × 2^${fa.exponentValue}` : `${largeSigned} ${smallSigned >= 0 ? "+" : "-"} ${Math.abs(smallSigned)} = ${rawMantissa}`,
      },
      normalize: {
        title: fr.category,
        detail: `结果阶码 ${binary(fr.exponentRaw, 8)}，尾数字段 ${binary(fr.fraction, 23)}。`,
        mantissa: `${mantissaText(fr)} × 2^${fr.exponentValue}`,
      },
      writeback: {
        title: resultBits,
        detail: `约等于 ${Number.isFinite(result) ? result.toPrecision(8) : String(result)}`,
      },
    };

    return extendedResult({
      formula: "IEEE 754 单精度 = 符号位 S + 8 位阶码 E(偏置 127) + 23 位尾数字段 M",
      nodes: [
        { id: "a", title: "操作数 A", detail: `${a} -> S=${fa.sign}, E=${binary(fa.exponentRaw, 8)}` },
        { id: "b", title: "操作数 B", detail: `${effectiveB} -> S=${fb.sign}, E=${binary(fb.exponentRaw, 8)}` },
        { id: "align", title: "对阶", detail: `阶差 ${expDiff}` },
        { id: "mantissa", title: "尾数运算", detail: operation === "repr" ? "不执行加减" : "小阶尾数右移后加/减" },
        { id: "normalize", title: "规格化/舍入", detail: fr.category },
        { id: "result", title: "结果字段", detail: resultBits },
      ],
      steps: [
        { title: "拆解 IEEE 754 字段", detail: `A 和有效 B 都拆成符号位、偏置阶码和尾数字段。`, active: ["a", "b"], activeRow: "符号 S" },
        { title: "比较阶码并对阶", detail: floatTrace.align.detail, active: ["align"], activeRow: "阶码 E" },
        { title: "执行尾数加减", detail: operation === "repr" ? "当前只观察表示，不进入尾数加减。" : `${opLabel}：${mantissaVerb}。`, active: ["mantissa"], activeRow: "尾数字段 M" },
        { title: "规格化和舍入", detail: `结果归一化为 ${fr.category} 数，阶码字段 ${binary(fr.exponentRaw, 8)}。`, active: ["normalize"], activeRow: "类别" },
        { title: "写回结果", detail: `结果约为 ${Number.isFinite(result) ? result.toPrecision(8) : String(result)}，字段为 ${resultBits}。`, active: ["result"], activeRow: "结果字段" },
      ],
      metrics: [
        { label: "操作", value: opLabel },
        { label: "阶差", value: String(expDiff) },
        { label: "结果", value: Number.isFinite(result) ? result.toPrecision(8) : String(result) },
      ],
      table: {
        headers: ["字段", "A", "B/有效 B", "结果"],
        rows: [
          ["符号 S", String(fa.sign), String(fb.sign), String(fr.sign)],
          ["阶码 E", binary(fa.exponentRaw, 8), binary(fb.exponentRaw, 8), binary(fr.exponentRaw, 8)],
          ["尾数字段 M", binary(fa.fraction, 23), binary(fb.fraction, 23), binary(fr.fraction, 23)],
          ["类别", fa.category, fb.category, fr.category],
          ["结果字段", "", "", resultBits],
        ],
      },
      floatTrace,
    });
  }

  function simulateMemoryHierarchy(values) {
    const workingSetMb = Math.max(1, toNumber(values.workingSetMb, 64));
    const cacheKb = Math.max(1, toNumber(values.cacheKb, 256));
    const locality = clamp(toNumber(values.locality, 85), 0, 100);
    const operation = values.operation || "read";
    const capacityFit = Math.min(1, cacheKb / (workingSetMb * 1024));
    const hitRate = Math.min(0.99, Math.max(0.05, locality / 100 * (0.55 + capacityFit * 0.45)));
    const avgLatency = hitRate * 1 + (1 - hitRate) * 80;
    return extendedResult({
      formula: "平均访问时间 = 命中率 × Cache 延迟 + 未命中率 × 主存延迟",
      nodes: [
        { id: "cpu", title: "CPU", detail: "发出读写请求" },
        { id: "cache", title: "Cache", detail: `${(hitRate * 100).toFixed(1)}% 命中估计` },
        { id: "main", title: "主存", detail: "MAR/MDR/译码/读写电路" },
        { id: "secondary", title: "辅存", detail: "容量大、速度慢、位价低" },
        { id: "bus", title: "总线", detail: "地址、数据、控制信号" },
      ],
      steps: [
        { title: "CPU 发出访问", detail: `CPU 通过地址总线给出 ${operation === "read" ? "读" : "写"} 请求。`, active: ["cpu", "bus"] },
        { title: "先查 Cache", detail: `工作集 ${workingSetMb}MB，Cache ${cacheKb}KB，估计命中率 ${(hitRate * 100).toFixed(1)}%。`, active: ["cache"] },
        { title: "未命中时访问主存", detail: "MAR 保存地址，译码器选中存储单元，MDR 暂存传输数据。", active: ["main", "bus"] },
        { title: "主存不足时依赖辅存", detail: "主存-辅存层次通过页面调入或文件 I/O 扩展容量。", active: ["main", "secondary"] },
        { title: "形成层次权衡", detail: `估算平均访问时间约 ${avgLatency.toFixed(2)} ns。`, active: ["cache", "main", "secondary"] },
      ],
      metrics: [
        { label: "估计命中率", value: `${(hitRate * 100).toFixed(1)}%` },
        { label: "平均访问时间", value: `${avgLatency.toFixed(2)} ns` },
        { label: "层次主线", value: "快/小/贵 -> 慢/大/廉" },
      ],
      table: {
        headers: ["层次", "速度", "容量", "典型作用"],
        rows: [
          ["Cache", "最快", "最小", "缓解 CPU-主存速度差"],
          ["主存", "中等", "中等", "直接支撑程序运行"],
          ["辅存", "最慢", "最大", "保存长期数据"],
        ],
      },
    });
  }

  function simulateMemoryCell(values) {
    const kind = values.kind || "dram";
    const operation = values.operation || "read";
    const row = Math.trunc(toNumber(values.row, 0));
    const col = Math.trunc(toNumber(values.col, 0));
    const isDram = kind === "dram";
    return extendedResult({
      formula: isDram ? "DRAM 先行选通 RAS，再列选通 CAS；读出后通常需要回写刷新" : "SRAM 由交叉耦合反相器保持状态，字线打开后通过位线读写",
      nodes: [
        { id: "cell", title: isDram ? "电容单元" : "六管单元", detail: isDram ? "电荷表示 0/1" : "锁存器保持 0/1" },
        { id: "row", title: "字线 / 行选", detail: `Row ${row}` },
        { id: "col", title: "位线 / 列选", detail: `Col ${col}` },
        { id: "sense", title: "读出放大器", detail: isDram ? "放大微弱电荷差" : "检测互补位线" },
        { id: "refresh", title: "刷新", detail: isDram ? "周期性恢复电荷" : "不需要刷新" },
      ],
      steps: isDram
        ? [
            { title: "行地址送入", detail: `RAS 有效，选中第 ${row} 行，把整行送入行缓冲。`, active: ["row", "cell"] },
            { title: "列地址选中", detail: `CAS 有效，选择第 ${col} 列的数据。`, active: ["col"] },
            { title: operation === "write" ? "写入电容" : "读出并放大", detail: operation === "write" ? "写驱动器改变电容电荷。" : "读出会扰动电荷，读放大器判断 0/1。", active: ["sense", "cell"] },
            { title: "恢复/刷新", detail: "DRAM 读操作具有破坏性，需要把行缓冲内容写回并周期刷新。", active: ["refresh", "cell"] },
          ]
        : [
            { title: "字线打开", detail: `选中 SRAM 第 ${row} 行，单元与互补位线连通。`, active: ["row", "cell"] },
            { title: operation === "write" ? "写驱动覆盖锁存状态" : "位线感知状态", detail: operation === "write" ? "写驱动器强制 Q/Qbar 到目标值。" : "读出放大器比较两条位线的电平差。", active: ["col", "sense"] },
            { title: "状态保持", detail: "只要供电存在，交叉耦合反相器会持续保持该状态。", active: ["cell"] },
          ],
      metrics: [
        { label: "单元类型", value: isDram ? "1T1C" : "6T SRAM" },
        { label: "是否刷新", value: isDram ? "需要" : "不需要" },
        { label: "当前操作", value: operation === "write" ? "写" : operation === "refresh" ? "刷新" : "读" },
      ],
      notes: [
        { title: "SRAM", detail: "速度快、面积大，常用于 Cache" },
        { title: "DRAM", detail: "密度高、成本低，常用于主存" },
      ],
    });
  }

  function simulateCacheWritePolicy(values) {
    const policy = values.policy || "write-back";
    const missPolicy = values.missPolicy || "write-allocate";
    const hit = values.hit === "hit";
    const address = values.address || "0x2A";
    const writeBack = policy === "write-back";
    const allocate = missPolicy === "write-allocate";
    const steps = [
      { title: "CPU 发出写请求", detail: `地址 ${address} 上的数据准备写入。`, active: ["cpu", "tag"] },
      { title: "比较 Valid 与 Tag", detail: hit ? "Tag 匹配且有效位为 1，写命中。" : "Tag 不匹配或有效位为 0，写未命中。", active: ["tag", "cache"] },
    ];
    if (hit) {
      steps.push(writeBack
        ? { title: "更新 Cache 并置 dirty", detail: "写回策略先只改 Cache 行，同时 dirty bit 置 1。", active: ["cache", "dirty"] }
        : { title: "同时写 Cache 与主存", detail: "写直达策略立即把数据写到主存，主存保持最新。", active: ["cache", "memory"] });
    } else if (allocate) {
      steps.push({ title: "调入主存块", detail: "写分配策略先把目标块调入 Cache，再执行写操作。", active: ["memory", "cache"] });
      steps.push(writeBack
        ? { title: "写入并置 dirty", detail: "调入后写 Cache，dirty bit 表示主存尚未同步。", active: ["cache", "dirty"] }
        : { title: "写入并同步主存", detail: "调入后写 Cache，同时写直达到主存。", active: ["cache", "memory"] });
    } else {
      steps.push({ title: "绕过 Cache 写主存", detail: "非写分配策略不装入 Cache，直接把写请求送到主存。", active: ["memory"] });
    }
    steps.push({ title: "后续替换时处理", detail: writeBack ? "若 dirty=1，替换前必须写回主存。" : "写直达下主存已更新，替换时无需写回。", active: ["dirty", "memory"] });
    return extendedResult({
      formula: "写回依赖 dirty bit；写直达保持主存实时一致",
      nodes: [
        { id: "cpu", title: "CPU", detail: "写请求源" },
        { id: "tag", title: "Tag/Valid", detail: hit ? "命中" : "未命中" },
        { id: "cache", title: "Cache 行", detail: allocate || hit ? "可能被更新" : "不分配" },
        { id: "dirty", title: "Dirty bit", detail: writeBack ? "记录主存是否过期" : "通常不需要" },
        { id: "memory", title: "主存", detail: writeBack ? "延迟更新" : "立即更新" },
      ],
      steps,
      metrics: [
        { label: "写策略", value: writeBack ? "写回" : "写直达" },
        { label: "未命中策略", value: allocate ? "写分配" : "非写分配" },
        { label: "访问结果", value: hit ? "命中" : "未命中" },
      ],
    });
  }

  function simulateCacheLocality(values) {
    const pattern = values.pattern || "loop";
    const accesses = Math.max(1, Math.min(64, Math.trunc(toNumber(values.accesses, 16))));
    const blockBytes = Math.max(1, Math.trunc(toNumber(values.blockBytes, 16)));
    const cacheLines = Math.max(1, Math.min(16, Math.trunc(toNumber(values.cacheLines, 4))));
    const addresses = Array.from({ length: accesses }, (_, index) => {
      if (pattern === "sequential") return index * 4;
      if (pattern === "loop") return (index % 8) * 4;
      if (pattern === "stride") return index * blockBytes * cacheLines;
      return ((index * 37 + 11) % (cacheLines * blockBytes * 6)) * 4;
    });
    const tags = Array(cacheLines).fill(null);
    let hits = 0;
    let misses = 0;
    const rows = [];

    addresses.forEach((address, index) => {
      const block = Math.floor(address / blockBytes);
      const line = block % cacheLines;
      const tag = Math.floor(block / cacheLines);
      const hit = tags[line] === tag;
      if (hit) hits += 1;
      else {
        misses += 1;
        tags[line] = tag;
      }
      if (rows.length < 16) {
        rows.push([`A${index + 1}`, String(address), String(block), String(line), String(tag), hit ? "命中" : "未命中"]);
      }
    });

    const hitRate = hits / accesses;
    const patternLabel = {
      sequential: "顺序访问",
      loop: "小循环重复访问",
      stride: "大步长冲突访问",
      random: "离散随机访问",
    }[pattern] || "小循环重复访问";
    const localityLabel = pattern === "loop"
      ? "时间局部性强"
      : pattern === "sequential"
        ? "空间局部性强"
        : pattern === "stride"
          ? "冲突未命中明显"
          : "局部性弱";

    return extendedResult({
      formula: "Cache 命中率 = 命中次数 / 访问次数；块内连续地址体现空间局部性，重复访问体现时间局部性",
      nodes: [
        { id: "cpu", title: "CPU 访存序列", detail: patternLabel },
        { id: "block", title: "主存块", detail: `${blockBytes} B / 块` },
        { id: "index", title: "Cache 行索引", detail: `${cacheLines} 行直接映射` },
        { id: "tag", title: "Tag 比较", detail: "判断是否命中" },
        { id: "fill", title: "块装入", detail: "未命中时替换该行" },
        { id: "rate", title: "命中率", detail: `${(hitRate * 100).toFixed(1)}%` },
      ],
      steps: [
        { title: "产生访存序列", detail: `当前模式是 ${patternLabel}，共 ${accesses} 次访问。`, active: ["cpu"] },
        { title: "按块大小切分地址", detail: `地址先除以 ${blockBytes} 得到主存块号。`, active: ["block"] },
        { title: "映射到 Cache 行", detail: `块号 mod ${cacheLines} 得到行索引，Tag 保存高位块号。`, active: ["index", "tag"] },
        { title: "命中或装入", detail: "Tag 匹配则命中，否则从主存装入块并覆盖原行。", active: ["tag", "fill"] },
        { title: "归纳局部性影响", detail: `${localityLabel}，最终命中率为 ${(hitRate * 100).toFixed(1)}%。`, active: ["rate"] },
      ],
      metrics: [
        { label: "命中", value: String(hits) },
        { label: "未命中", value: String(misses) },
        { label: "命中率", value: `${(hitRate * 100).toFixed(1)}%` },
        { label: "局部性", value: localityLabel },
      ],
      table: { headers: ["访问", "地址", "块号", "行号", "Tag", "结果"], rows },
      notes: [
      ],
    });
  }

  function simulateTlbAccess(values) {
    const pageSize = Math.max(1, toNumber(values.pageSize, 1024));
    const virtualAddress = Math.max(0, Math.trunc(toNumber(values.virtualAddress, 0)));
    const page = Math.floor(virtualAddress / pageSize);
    const offset = virtualAddress % pageSize;
    const tlbHit = values.tlb === "hit";
    const present = values.present === "present";
    const frame = (page * 3 + 1) % 16;
    const physical = frame * pageSize + offset;
    const steps = [
      { title: "拆分虚拟地址", detail: `虚拟地址 ${virtualAddress} = 页号 ${page} + 页内偏移 ${offset}。`, active: ["va"] },
      { title: "查询 TLB", detail: tlbHit ? `TLB 命中，直接得到页框 ${frame}。` : "TLB 未命中，需要访问页表。", active: ["tlb"] },
    ];
    if (!tlbHit) {
      steps.push({ title: "访问页表", detail: present ? `页表项有效，页 ${page} 在页框 ${frame}。` : `页 ${page} 不在内存，产生缺页异常。`, active: ["pt"] });
      if (!present) {
        steps.push({ title: "缺页异常处理", detail: "操作系统选择牺牲页，把所需页面从辅存调入主存。", active: ["fault", "disk"] });
        steps.push({ title: "更新页表和 TLB", detail: `页表项改为有效，TLB 填入页 ${page} -> 页框 ${frame}。`, active: ["pt", "tlb"] });
      }
    }
    steps.push({ title: "形成物理地址", detail: `物理地址 = ${frame} × ${pageSize} + ${offset} = ${physical}。`, active: ["pa"] });
    return extendedResult({
      formula: "物理地址 = 页框号 × 页大小 + 页内偏移",
      nodes: [
        { id: "va", title: "虚拟地址", detail: `VPN=${page}, offset=${offset}` },
        { id: "tlb", title: "TLB", detail: tlbHit ? "命中" : "未命中" },
        { id: "pt", title: "页表", detail: present ? "有效" : "可能缺页" },
        { id: "fault", title: "缺页异常", detail: present ? "不触发" : "调页并重启" },
        { id: "disk", title: "辅存", detail: "页面后备存储" },
        { id: "pa", title: "物理地址", detail: String(physical) },
      ],
      steps,
      metrics: [
        { label: "页号", value: String(page) },
        { label: "页内偏移", value: String(offset) },
        { label: "页框号", value: String(frame) },
        { label: "物理地址", value: String(physical) },
      ],
    });
  }

  function simulateInstructionFormat(values) {
    const format = values.format || "r";
    const opcode = String(values.opcode || "ADD").toUpperCase();
    const fields = {
      r: [["opcode", opcode], ["rd", "x3"], ["rs1", "x1"], ["rs2", "x2"], ["funct", "000"]],
      i: [["opcode", opcode], ["rd", "x3"], ["rs1", "x1"], ["imm", "12 位立即数"]],
      s: [["opcode", opcode], ["rs1", "x1"], ["rs2", "x3"], ["imm", "拆分存储位移"]],
      b: [["opcode", opcode], ["rs1", "x1"], ["rs2", "x2"], ["offset", "分散编码的转移位移"]],
      cisc: [["prefix", "可选"], ["opcode", opcode], ["modrm", "寻址方式"], ["disp", "可变位移"], ["imm", "可变立即数"]],
    }[format];
    return extendedResult({
      formula: format === "cisc" ? "CISC 常采用可变长度字段" : "RISC 常采用固定长度字段，便于流水线译码",
      nodes: fields.map(([id, value]) => ({ id, title: id, detail: value })),
      steps: [
        { title: "读取指令字", detail: format === "cisc" ? "指令长度需要边取边判定。" : "固定长度指令一次取出，字段位置稳定。", active: [fields[0][0]] },
        { title: "译码操作码", detail: `操作码字段识别为 ${opcode}。`, active: ["opcode"] },
        { title: "读取操作数字段", detail: "寄存器号、地址码或立即数字段决定源操作数和目的位置。", active: fields.slice(1).map(([id]) => id) },
        { title: "生成控制信号", detail: "控制器根据格式和操作码选择 ALU、访存或转移路径。", active: fields.map(([id]) => id) },
      ],
      metrics: [
        { label: "格式", value: format.toUpperCase() },
        { label: "操作码", value: opcode },
        { label: "字段数", value: String(fields.length) },
      ],
      table: { headers: ["字段", "含义"], rows: fields },
    });
  }

  function simulateInstructionClass(values) {
    const kind = values.kind || "transfer";
    const map = {
      transfer: ["数据传送", "寄存器/存储器之间搬运数据", ["reg", "mem", "bus"]],
      alu: ["算术逻辑", "读取源寄存器，经 ALU 计算后写回目的寄存器", ["reg", "alu", "flags"]],
      shift: ["移位", "操作数进入移位器，结果写回并更新标志", ["reg", "shifter", "flags"]],
      branch: ["转移", "比较条件并选择 PC+4 或目标地址", ["pc", "alu", "control"]],
      io: ["输入输出", "CPU 通过 I/O 指令或端口访问接口寄存器", ["io", "bus", "control"]],
    };
    const current = map[kind] || map.transfer;
    return extendedResult({
      formula: "指令类型决定数据通路中被激活的部件和控制信号",
      nodes: [
        { id: "reg", title: "寄存器组", detail: "读源/写回目的" },
        { id: "alu", title: "ALU", detail: "算术逻辑或地址计算" },
        { id: "shifter", title: "移位器", detail: "逻辑/算术移位" },
        { id: "mem", title: "存储器", detail: "load/store 数据" },
        { id: "pc", title: "PC", detail: "顺序或转移更新" },
        { id: "io", title: "I/O 接口", detail: "端口和状态寄存器" },
        { id: "bus", title: "总线", detail: "传送地址和数据" },
        { id: "control", title: "控制器", detail: "产生控制信号" },
        { id: "flags", title: "标志位", detail: "Z/C/V/N" },
      ],
      steps: [
        { title: "识别指令类型", detail: `当前类型：${current[0]}。`, active: ["control"] },
        { title: "选择数据通路", detail: current[1], active: current[2] },
        { title: "执行并写回", detail: "执行部件完成动作，结果写回或 PC/接口状态更新。", active: current[2] },
      ],
      metrics: [
        { label: "指令类型", value: current[0] },
        { label: "主要部件", value: current[2].join(", ") },
      ],
    });
  }

  function simulateAddressingMode(values) {
    const mode = values.mode || "indexed";
    const a = Math.trunc(toNumber(values.address, 0));
    const r = Math.trunc(toNumber(values.register, 0));
    const pc = Math.trunc(toNumber(values.pc, 0));
    const memA = a + 256;
    let ea = a;
    let formula = "EA = A";
    let operand = "";
    const modeMeta = {
      immediate: ["立即寻址", "A 字段本身就是操作数，不形成有效地址。"],
      direct: ["直接寻址", "A 字段直接作为有效地址。"],
      indirect: ["间接寻址", "先访问 M[A]，取出的内容才是有效地址。"],
      register: ["寄存器寻址", "操作数在寄存器中，不访问主存形成 EA。"],
      "reg-indirect": ["寄存器间接", "寄存器内容作为有效地址。"],
      indexed: ["变址寻址", "形式地址 A 与变址寄存器 X 相加形成 EA。"],
      base: ["基址寻址", "基址寄存器 BR 与位移 A 相加形成 EA。"],
      relative: ["相对寻址", "PC 与位移 A 相加形成 EA。"],
    };
    let sources = ["instr"];
    let noEa = false;
    if (mode === "immediate") {
      operand = `#${a}`;
      formula = "操作数 = A，不访问存储器取操作数";
      noEa = true;
    } else if (mode === "indirect") {
      ea = memA;
      formula = "EA = M[A]";
      sources = ["instr", "memory"];
    } else if (mode === "register") {
      operand = `R=${r}`;
      formula = "操作数在寄存器中，无 EA";
      sources = ["reg"];
      noEa = true;
    } else if (mode === "reg-indirect") {
      ea = r;
      formula = "EA = R";
      sources = ["reg"];
    } else if (mode === "indexed") {
      ea = a + r;
      formula = "EA = A + X";
      sources = ["instr", "reg"];
    } else if (mode === "base") {
      ea = r + a;
      formula = "EA = BR + A";
      sources = ["instr", "reg"];
    } else if (mode === "relative") {
      ea = pc + a;
      formula = "EA = PC + A";
      sources = ["instr", "pc"];
    }
    if (!operand) {
      operand = `M[${ea}]`;
    }
    const modeLabel = modeMeta[mode]?.[0] || mode;
    const modeHint = modeMeta[mode]?.[1] || "根据寻址方式选择参与计算的地址来源。";
    const hasRegisterLike = sources.includes("reg");
    const hasPc = sources.includes("pc");
    const hasMemory = sources.includes("memory");
    const sourceLabelMap = {
      instr: "A",
      reg: "R/X/BR",
      pc: "PC",
      memory: "M[A]",
    };
    const sourceNames = sources.map((id) => sourceLabelMap[id] || id).join(", ");
    const eaText = noEa ? "-" : String(ea);
    const calcDetail = noEa
      ? "该寻址方式绕过 EA 加法器，直接得到操作数。"
      : `参与来源：${sourceNames}，计算结果为 ${ea}。`;
    const operandDetail = noEa ? "直接送入执行部件" : "按 EA 访问主存取得操作数";
    const addressingFlow = {
      mode,
      modeLabel,
      modeHint,
      formula,
      sources,
      a,
      r,
      pc,
      memA,
      ea: eaText,
      operand,
      noEa,
      calcDetail,
      eaDetail: noEa ? "无需形成 EA" : "地址计算完成",
      operandDetail,
    };
    return extendedResult({
      formula,
      nodes: [
        { id: "instr", title: "指令地址字段 A", detail: String(a) },
        { id: "reg", title: "寄存器 R/X/BR", detail: String(r) },
        { id: "pc", title: "PC", detail: String(pc) },
        { id: "memory", title: "主存", detail: `M[A]=${memA}` },
        { id: "ea", title: "有效地址 EA", detail: noEa ? "不需要" : String(ea) },
        { id: "operand", title: "操作数", detail: operand },
      ],
      steps: [
        { title: "读出寻址方式字段", detail: `当前采用 ${modeLabel}。`, active: ["mode", "instr"] },
        {
          title: "选择参与计算的来源",
          detail: hasRegisterLike || hasPc || hasMemory
            ? `选中 ${sourceNames} 作为地址来源。`
            : "只使用指令中的 A 字段。",
          active: sources,
        },
        {
          title: noEa ? "绕过 EA 形成器" : "计算有效地址",
          detail: noEa ? `${formula}。` : `${formula}，得到 ${ea}。`,
          active: noEa ? ["operand", ...sources] : ["calc", "ea", ...sources],
        },
        { title: "取得操作数", detail: `最终操作数位置：${operand}。`, active: ["operand"] },
      ],
      metrics: [
        { label: "A", value: String(a) },
        { label: "R/PC", value: `${r} / ${pc}` },
        { label: "EA", value: eaText },
      ],
      addressingFlow,
    });
  }

  function simulateCpuCycle(values) {
    const instruction = values.instruction || "load";
    const indirect = values.indirect === "yes";
    const interrupt = values.interrupt === "yes";
    const names = { add: "ADD R1,R2", load: "LOAD R1,[A]", store: "STORE R1,[A]", jump: "JMP A" };
    const steps = [
      { title: "取指周期 T0", detail: "PCout 与 MARin 有效，MAR 获得下一条指令地址。", active: ["pc", "mar"] },
      { title: "取指周期 T1", detail: "主存读，MDR 接收指令字，PC 准备加 1。", active: ["memory", "mdr", "pc"] },
      { title: "取指周期 T2", detail: "MDRout 与 IRin 有效，当前指令进入 IR。", active: ["mdr", "ir"] },
      { title: "译码", detail: `控制器译码得到 ${names[instruction]}。`, active: ["ir", "control"] },
    ];
    if (indirect) {
      steps.push({ title: "间址周期", detail: "形式地址先访问主存，取得真正有效地址。", active: ["mar", "memory", "mdr"] });
    }
    steps.push({ title: "执行周期", detail: instruction === "add" ? "寄存器送 ALU，结果写回。" : instruction === "jump" ? "目标地址写入 PC。" : instruction === "store" ? "源寄存器数据写入主存。" : "有效地址访问主存，数据写回寄存器。", active: instruction === "jump" ? ["pc", "control"] : ["alu", "memory", "control"] });
    if (interrupt) {
      steps.push({ title: "中断周期", detail: "保存断点和 PSW，转入中断服务程序入口。", active: ["pc", "psw", "control"] });
    }
    return extendedResult({
      formula: "指令周期 = 取指周期 + 可选间址周期 + 执行周期 + 可选中断周期",
      nodes: [
        { id: "pc", title: "PC", detail: "下一条指令地址/断点" },
        { id: "mar", title: "MAR", detail: "当前访存地址" },
        { id: "mdr", title: "MDR", detail: "访存数据缓冲" },
        { id: "ir", title: "IR", detail: "当前指令" },
        { id: "control", title: "控制器", detail: "节拍和控制信号" },
        { id: "alu", title: "ALU", detail: "运算/地址计算" },
        { id: "memory", title: "主存", detail: "指令和数据" },
        { id: "psw", title: "PSW", detail: "状态与中断信息" },
      ],
      steps,
      metrics: [
        { label: "指令", value: names[instruction] },
        { label: "间址", value: indirect ? "是" : "否" },
        { label: "中断周期", value: interrupt ? "有" : "无" },
      ],
    });
  }

  function simulateControlMode(values) {
    const mode = values.mode || "combined";
    const info = {
      sync: ["同步控制", "所有部件按统一时钟节拍推进，设计简单但慢部件会拖住全局。", "固定节拍"],
      async: ["异步控制", "部件完成后用应答信号推进下一步，适应速度差异但控制复杂。", "请求/应答"],
      combined: ["联合控制", "公共阶段用同步控制，速度差异大的阶段用异步应答。", "同步 + 异步"],
      hardwired: ["硬布线控制", "用组合逻辑直接由指令、状态和节拍生成控制信号，速度快但修改困难。", "C=f(Im,Bj,Tk)"],
      microprogram: ["微程序控制", "控制信号存放在控制存储器中，通过微指令序列解释机器指令。", "控制存储器"],
    }[mode];
    const flowProfiles = {
      sync: {
        timingKind: "clock",
        implementation: "timing",
        timingLabel: "统一 CLK",
        timingValue: "T0 / T1 / T2 / T3",
        timingDetail: "各部件在固定节拍边沿接收控制信号。",
        generatorTitle: "节拍发生器 + 控制逻辑",
        generatorValue: "固定时序控制",
        generatorDetail: "每个机器周期内按预定节拍发出微操作信号。",
        summary: "同步控制用统一时钟安排所有微操作，结构规整但弹性较低。",
      },
      async: {
        timingKind: "handshake",
        implementation: "timing",
        timingLabel: "请求 / 应答",
        timingValue: "REQ -> ACK",
        timingDetail: "前一部件完成并返回 ACK 后，下一步才开始。",
        generatorTitle: "握手控制器",
        generatorValue: "完成信号触发",
        generatorDetail: "控制器等待各部件完成信号，按实际耗时推进。",
        summary: "异步控制用握手信号适配不同部件速度，结构更灵活但更复杂。",
      },
      combined: {
        timingKind: "hybrid",
        implementation: "timing",
        timingLabel: "CLK + ACK",
        timingValue: "同步段 / 异步段",
        timingDetail: "公共阶段按时钟推进，慢速或变长阶段等待应答。",
        generatorTitle: "联合控制器",
        generatorValue: "同步节拍 + 异步许可",
        generatorDetail: "稳定阶段保持固定节拍，速度差异大的阶段改用握手。",
        summary: "联合控制把同步的规整和异步的弹性结合起来。",
      },
      hardwired: {
        timingKind: "clock",
        implementation: "hardwired",
        timingLabel: "机器周期节拍",
        timingValue: "Im / Bj / Tk",
        timingDetail: "操作码、状态条件和节拍共同作为组合逻辑输入。",
        generatorTitle: "硬布线控制逻辑",
        generatorValue: "C = f(Im, Bj, Tk)",
        generatorDetail: "门电路直接生成控制信号，速度快但修改成本高。",
        summary: "硬布线控制把控制规律固化为组合逻辑，适合追求速度的控制器。",
      },
      microprogram: {
        timingKind: "clock",
        implementation: "microprogram",
        timingLabel: "微地址节拍",
        timingValue: "CMAR -> CMDR",
        timingDetail: "微地址逐拍读取控制存储器中的微指令。",
        generatorTitle: "微程序控制器",
        generatorValue: "微指令控制字段",
        generatorDetail: "微指令字段展开成微命令，便于修改和扩展。",
        summary: "微程序控制把控制信号编码到控制存储器，灵活性高但速度通常低于硬布线。",
      },
    };
    const flow = flowProfiles[mode] || flowProfiles.combined;
    const controlFlow = {
      ...flow,
      mode,
      phases: ["选择方式", "译码状态", "产生信号", "驱动通路"],
      decoderValue: mode === "microprogram" ? "IR -> 微程序入口" : "opcode + flags",
      decoderDetail: mode === "hardwired"
        ? "译码输出 Im、条件 Bj 和节拍 Tk 送入组合逻辑。"
        : mode === "microprogram"
          ? "机器指令译码后映射到控制存储器入口地址。"
          : "操作码、状态标志、机器周期和节拍共同参与控制。",
      datapathValue: "寄存器装入 / ALU / 访存",
      datapathDetail: "寄存器装入、ALU 运算、访存读写等微操作被依次触发。",
    };
    return extendedResult({
      formula: info[2],
      nodes: [
        { id: "clock", title: "时钟/握手", detail: info[2] },
        { id: "decoder", title: "译码", detail: "识别当前指令" },
        { id: "logic", title: "控制信号形成", detail: info[1] },
        { id: "datapath", title: "数据通路", detail: "执行微操作" },
      ],
      steps: [
        { title: "选择控制方式", detail: `当前方式：${info[0]}。`, active: ["clock"] },
        { title: "获取指令和状态", detail: "操作码、条件标志、机器周期和节拍共同参与控制。", active: ["decoder"] },
        { title: "产生控制信号", detail: info[1], active: ["logic"] },
        { title: "驱动数据通路", detail: "寄存器装入、ALU 运算、访存读写等微操作被依次触发。", active: ["datapath"] },
      ],
      metrics: [
        { label: "方式", value: info[0] },
        { label: "速度", value: mode === "hardwired" ? "高" : mode === "microprogram" ? "中" : "视场景而定" },
        { label: "可修改性", value: mode === "microprogram" ? "高" : mode === "hardwired" ? "低" : "中" },
      ],
      controlFlow,
    });
  }

  function simulateMicroinstructionFormat(values) {
    const format = values.format || "horizontal";
    const signals = Math.max(1, Math.min(64, Math.trunc(toNumber(values.signals, 18))));
    const groups = Math.max(1, Math.min(signals, Math.trunc(toNumber(values.groups, 4))));
    const nextMode = values.next || "conditional";
    const nextBits = nextMode === "sequential" ? 1 : nextMode === "mapped" ? 8 : 4;
    const opBits = 8;
    const directBits = signals;
    const verticalBits = ceilLog2(signals) || 1;
    const groupSize = Math.ceil(signals / groups);
    const hybridControlBits = groups * Math.max(1, ceilLog2(groupSize + 1));
    const controlBits = format === "vertical" ? verticalBits : format === "hybrid" ? hybridControlBits : directBits;
    const wordBits = controlBits + nextBits + opBits;
    const formatLabel = {
      horizontal: "水平型 / 直接表示",
      vertical: "垂直型 / 编码表示",
      hybrid: "混合型 / 字段编码",
    }[format] || "水平型 / 直接表示";
    const nextLabel = {
      sequential: "顺序 +1",
      conditional: "条件转移",
      mapped: "操作码映射",
    }[nextMode] || "条件转移";
    const rows = [
      ["控制字段", `${controlBits} bit`, format === "horizontal" ? "每个控制信号占 1 位，可并行发出" : format === "vertical" ? "编码后经译码器还原控制信号" : "互斥信号分组编码，组间可并行"],
      ["下地址字段", `${nextBits} bit`, nextLabel],
      ["操作/判别字段", `${opBits} bit`, "保存条件选择、操作码映射或分支判别"],
      ["微指令字长", `${wordBits} bit`, "控制字段 + 下地址字段 + 操作/判别字段"],
    ];

    return extendedResult({
      formula: "微指令字长 = 控制字段位数 + 下地址字段位数 + 判别/映射字段位数",
      nodes: [
        { id: "signals", title: "控制信号集合", detail: `${signals} 个候选信号` },
        { id: "encode", title: "字段编码", detail: formatLabel },
        { id: "constraint", title: "互斥约束", detail: `${groups} 个互斥组` },
        { id: "next", title: "下地址形成", detail: nextLabel },
        { id: "decoder", title: "微命令译码", detail: format === "horizontal" ? "无需集中译码" : "需要字段译码器" },
        { id: "word", title: "微指令字", detail: `${wordBits} bit` },
      ],
      steps: [
        { title: "列出微命令", detail: `本例有 ${signals} 个控制信号需要被微指令字段表达。`, active: ["signals"] },
        { title: "选择格式", detail: `${formatLabel} 决定控制字段是直接置位还是编码译码。`, active: ["encode"] },
        { title: "处理互斥关系", detail: format === "hybrid" ? `按 ${groups} 个互斥组编码，组内只允许一个微命令有效。` : "互斥信号需要由设计者或译码器避免同时冲突。", active: ["constraint"] },
        { title: "形成下一微地址", detail: `下地址字段采用 ${nextLabel}，额外需要 ${nextBits} 位。`, active: ["next"] },
        { title: "估算微指令字长", detail: `控制字段 ${controlBits} 位 + 下地址 ${nextBits} 位 + 判别 ${opBits} 位 = ${wordBits} 位。`, active: ["word", "decoder"] },
      ],
      metrics: [
        { label: "格式", value: formatLabel },
        { label: "控制字段", value: `${controlBits} bit` },
        { label: "微指令字长", value: `${wordBits} bit` },
      ],
      table: { headers: ["字段", "宽度", "作用"], rows },
    });
  }

  function simulateMicroprogram(values) {
    const instruction = values.instruction || "load";
    const format = values.format || "horizontal";
    const micro = {
      load: [
        ["00", "PCout, MARin", "01", "取指地址送 MAR"],
        ["01", "MemRead, MDRin, PC+1", "02", "读指令并更新 PC"],
        ["02", "MDRout, IRin", "10", "装入 IR"],
        ["10", "AddrOut, MARin", "11", "形成有效地址"],
        ["11", "MemRead, MDRin", "12", "读取数据"],
        ["12", "MDRout, R1in", "00", "写回寄存器"],
      ],
      add: [
        ["00", "PCout, MARin", "01", "取指"],
        ["01", "MemRead, IRin, PC+1", "20", "译码"],
        ["20", "R1out, Ain", "21", "源 1 进入 A"],
        ["21", "R2out, ALU_ADD, R1in", "00", "相加写回"],
      ],
      store: [
        ["00", "PCout, MARin", "01", "取指"],
        ["01", "MemRead, IRin, PC+1", "30", "译码"],
        ["30", "AddrOut, MARin", "31", "形成写地址"],
        ["31", "R1out, MDRin", "32", "数据进 MDR"],
        ["32", "MemWrite", "00", "写主存"],
      ],
    }[instruction];
    return extendedResult({
      formula: format === "horizontal" ? "水平型微指令：一个控制位直接对应一个或一组微命令" : "垂直型微指令：用编码字段再译码产生微命令",
      nodes: [
        { id: "cm", title: "控制存储器", detail: "保存微程序" },
        { id: "car", title: "微地址寄存器", detail: "当前微地址" },
        { id: "mir", title: "微指令寄存器", detail: "当前控制字段" },
        { id: "decoder", title: "字段译码", detail: format === "horizontal" ? "直接控制" : "编码后译码" },
        { id: "datapath", title: "数据通路", detail: "执行微操作" },
        { id: "next", title: "下一微地址", detail: "顺序或条件转移" },
      ],
      steps: micro.map(([addr, control, next, detail]) => ({
        title: `µ${addr}: ${control}`,
        detail: `${detail}；下一微地址 ${next}。`,
        active: ["cm", "car", "mir", "decoder", "datapath", "next"],
        formula: `CAR=${addr}; MIR=${control}; Next=${next}`,
      })),
      metrics: [
        { label: "机器指令", value: instruction.toUpperCase() },
        { label: "微指令数", value: String(micro.length) },
        { label: "格式", value: format === "horizontal" ? "水平型" : "垂直型" },
      ],
      table: {
        headers: ["微地址", "控制字段", "下一微地址", "说明"],
        rows: micro,
      },
    });
  }

  function simulateBusStructure(values) {
    const structure = values.structure || "single";
    const transaction = values.transaction || "memory-read";
    const lanes = {
      single: ["系统总线"],
      dual: ["CPU-主存总线", "I/O 总线"],
      triple: ["地址总线", "数据总线", "控制总线"],
    }[structure];
    return extendedResult({
      formula: structure === "single" ? "单总线结构简单但同一时刻只能服务有限传输" : structure === "dual" ? "双总线分离主存与 I/O 路径，降低部分争用" : "三类总线按地址、数据、控制分工协作",
      nodes: [
        { id: "cpu", title: "CPU", detail: "总线主设备" },
        { id: "memory", title: "主存", detail: "数据/指令存储" },
        { id: "io", title: "I/O 接口", detail: "外设连接" },
        { id: "bus", title: lanes.join(" / "), detail: transaction },
        { id: "control", title: "控制信号", detail: "读写、应答、仲裁" },
      ],
      steps: [
        { title: "申请总线", detail: "主设备获得总线使用权，其他设备暂时等待。", active: ["cpu", "bus"] },
        { title: "发送地址", detail: "地址信息选择主存单元或 I/O 端口。", active: ["cpu", "bus", transaction === "io-read" ? "io" : "memory"] },
        { title: "发送控制信号", detail: "读/写、I/O 或存储器访问类型由控制线说明。", active: ["control", "bus"] },
        { title: "传输数据", detail: structure === "single" ? "地址、控制和数据在同一系统总线组织下分时协作。" : "分离路径可以提高并行度并减少争用。", active: ["bus", "memory", "io"] },
      ],
      metrics: [
        { label: "结构", value: structure === "single" ? "单总线" : structure === "dual" ? "双总线" : "三总线" },
        { label: "事务", value: transaction },
        { label: "争用程度", value: structure === "single" ? "高" : structure === "dual" ? "中" : "低" },
      ],
      table: { headers: ["总线", "作用"], rows: lanes.map((lane) => [lane, lane.includes("地址") ? "选择目标" : lane.includes("数据") ? "传送数据" : lane.includes("控制") ? "说明动作" : "承载一次事务路径"]) },
    });
  }

  function simulateDisplayDevice(values) {
    const mode = values.mode || "graphic";
    const width = Math.max(1, toNumber(values.width, 800));
    const height = Math.max(1, toNumber(values.height, 600));
    const depth = Math.max(1, toNumber(values.depth, 24));
    const frameBytes = Math.ceil(width * height * depth / 8);
    return extendedResult({
      formula: "帧缓冲容量 = 宽 × 高 × 色深 / 8",
      nodes: [
        { id: "cpu", title: "CPU/GPU", detail: "写字符码或像素" },
        { id: "vram", title: "显存/帧缓冲", detail: `${(frameBytes / 1024).toFixed(1)} KB` },
        { id: "scan", title: "扫描控制", detail: "按行列刷新屏幕" },
        { id: "panel", title: "显示面板", detail: mode === "oled" ? "像素自发光" : mode === "char" ? "字符发生器" : "像素矩阵" },
      ],
      steps: [
        { title: "生成显示数据", detail: mode === "char" ? "CPU 写入字符码和属性。" : "图形模式写入每个像素的颜色值。", active: ["cpu"] },
        { title: "写入显存", detail: `分辨率 ${width}×${height}，色深 ${depth} bit，需要约 ${(frameBytes / 1024).toFixed(1)} KB。`, active: ["vram"] },
        { title: "扫描输出", detail: "显示控制器按行读取帧缓冲，生成行同步和列扫描。", active: ["scan", "vram"] },
        { title: "形成图像", detail: mode === "oled" ? "OLED 像素自发光，黑色像素可关闭。" : "面板根据扫描数据点亮对应像素或字符。", active: ["panel"] },
      ],
      metrics: [
        { label: "模式", value: mode },
        { label: "帧缓冲", value: `${(frameBytes / 1024).toFixed(1)} KB` },
        { label: "像素数", value: `${(width * height).toLocaleString()}` },
      ],
    });
  }

  function simulateDiskAccess(values) {
    const current = Math.trunc(toNumber(values.currentCylinder, 0));
    const target = Math.trunc(toNumber(values.targetCylinder, 0));
    const rpm = Math.max(1, toNumber(values.rpm, 7200));
    const transferKb = Math.max(1, toNumber(values.transferKb, 64));
    const seek = Math.abs(target - current) * 0.08 + 1.5;
    const rotation = 60_000 / rpm / 2;
    const transfer = transferKb / 150_000 * 1000;
    const total = seek + rotation + transfer;
    return extendedResult({
      formula: "磁盘访问时间 = 寻道时间 + 平均旋转延迟 + 数据传输时间",
      nodes: [
        { id: "arm", title: "磁臂移动", detail: `${current} -> ${target}` },
        { id: "track", title: "磁道/柱面", detail: `柱面 ${target}` },
        { id: "sector", title: "扇区等待", detail: `${rotation.toFixed(2)} ms` },
        { id: "transfer", title: "数据传输", detail: `${transferKb} KB` },
      ],
      steps: [
        { title: "寻道", detail: `磁头从柱面 ${current} 移动到 ${target}，估算 ${seek.toFixed(2)} ms。`, active: ["arm", "track"] },
        { title: "等待目标扇区旋转到位", detail: `转速 ${rpm} RPM，平均旋转延迟约 ${rotation.toFixed(2)} ms。`, active: ["sector"] },
        { title: "传输数据", detail: `传输 ${transferKb}KB，估算 ${transfer.toFixed(3)} ms。`, active: ["transfer"] },
        { title: "得到总访问时间", detail: `总时间约 ${total.toFixed(2)} ms。`, active: ["arm", "sector", "transfer"] },
      ],
      metrics: [
        { label: "寻道", value: `${seek.toFixed(2)} ms` },
        { label: "旋转延迟", value: `${rotation.toFixed(2)} ms` },
        { label: "传输", value: `${transfer.toFixed(3)} ms` },
        { label: "总时间", value: `${total.toFixed(2)} ms` },
      ],
    });
  }

  function simulateRaidSsd(values) {
    const mode = values.mode || "raid5";
    const data = {
      raid0: ["RAID0", "数据按条带分散到多个磁盘，并行读写提升吞吐率，但无冗余。", ["stripe", "disk0", "disk1"]],
      raid1: ["RAID1", "同一数据写入两个磁盘，读可并行，单盘故障仍可恢复。", ["mirror", "disk0", "disk1"]],
      raid5: ["RAID5", "数据和奇偶校验分布在多盘，任一单盘故障可由异或恢复。", ["stripe", "parity", "rebuild"]],
      ssd: ["SSD", "以页为读写单位、块为擦除单位，通过 FTL 和磨损均衡管理闪存。", ["page", "block", "ftl"]],
    }[mode];
    const raidFlows = {
      raid0: {
        kind: "raid",
        modeLabel: "RAID0",
        hostBlocks: ["D0", "D1", "D2", "D3", "D4", "D5"],
        stripeRule: "条带 0：D0/D1/D2 分别写入 Disk 0/1/2；条带 1 继续轮转。",
        redundancy: "无镜像、无校验，所有磁盘容量都用于数据。",
        rebuild: "任一成员盘故障会丢失所在条带，无法由阵列恢复。",
        disks: [
          { name: "Disk 0", active: true, blocks: [{ label: "D0", type: "data", active: true }, { label: "D3", type: "data", active: true }] },
          { name: "Disk 1", active: true, blocks: [{ label: "D1", type: "data", active: true }, { label: "D4", type: "data", active: true }] },
          { name: "Disk 2", active: true, failed: true, blocks: [{ label: "D2", type: "data", active: true }, { label: "D5", type: "data", active: true }] },
          { name: "Disk 3", active: false, blocks: [{ label: "空闲", type: "empty" }, { label: "未用", type: "empty" }] },
        ],
      },
      raid1: {
        kind: "raid",
        modeLabel: "RAID1",
        hostBlocks: ["D0", "D1", "D2", "D3"],
        stripeRule: "主盘写入数据块，镜像盘同步写入同一份数据。",
        redundancy: "Disk 1 保存 Disk 0 的完整镜像，读请求可从任一盘返回。",
        rebuild: "Disk 0 故障时，Disk 1 的镜像块可直接提供数据并复制到新盘。",
        disks: [
          { name: "Disk 0", active: true, failed: true, blocks: [{ label: "D0", type: "data", active: true }, { label: "D1", type: "data", active: true }] },
          { name: "Disk 1", active: true, blocks: [{ label: "D0 副本", type: "mirror", active: true }, { label: "D1 副本", type: "mirror", active: true }] },
          { name: "Disk 2", active: false, blocks: [{ label: "备用盘", type: "empty" }, { label: "等待重建", type: "empty" }] },
          { name: "Disk 3", active: false, blocks: [{ label: "未用", type: "empty" }, { label: "未用", type: "empty" }] },
        ],
      },
      raid5: {
        kind: "raid",
        modeLabel: "RAID5",
        hostBlocks: ["D0", "D1", "D2", "D3", "D4", "D5"],
        stripeRule: "每个条带包含多个数据块和一个校验块，校验块轮流分布在不同磁盘。",
        redundancy: "P0 = D0 xor D1 xor D2；缺失任一块都可由剩余数据和 P0 异或恢复。",
        rebuild: "示例：Disk 2 故障，D2 = P0 xor D0 xor D1，在新盘中重建。",
        disks: [
          { name: "Disk 0", active: true, blocks: [{ label: "D0", type: "data", active: true }, { label: "D3", type: "data" }] },
          { name: "Disk 1", active: true, blocks: [{ label: "D1", type: "data", active: true }, { label: "P1", type: "parity" }] },
          { name: "Disk 2", active: true, failed: true, blocks: [{ label: "D2", type: "data lost", active: true }, { label: "D4", type: "data" }] },
          { name: "Disk 3", active: true, blocks: [{ label: "P0", type: "parity", active: true }, { label: "D5", type: "data" }] },
        ],
      },
    };
    const ssdFlow = {
      kind: "ssd",
      modeLabel: "SSD",
      hostWrite: "LPN 7 写入新数据 A'",
      ftlRows: [
        { logical: "LPN 7", physical: "Block 1 / Page 2", state: "新映射", active: true },
        { logical: "旧 LPN 7", physical: "Block 0 / Page 1", state: "标记失效" },
        { logical: "LPN 8", physical: "Block 0 / Page 2", state: "仍有效" },
      ],
      blocks: [
        {
          name: "Block 0",
          active: true,
          pages: [
            { label: "P0 有效", state: "valid" },
            { label: "P1 旧页", state: "invalid" },
            { label: "P2 有效", state: "valid" },
            { label: "P3 空闲", state: "free" },
          ],
        },
        {
          name: "Block 1",
          active: true,
          pages: [
            { label: "P0 空闲", state: "free" },
            { label: "P1 空闲", state: "free" },
            { label: "P2 新写入", state: "written" },
            { label: "P3 空闲", state: "free" },
          ],
        },
        {
          name: "Block 2",
          active: false,
          pages: [
            { label: "P0 擦后", state: "erased" },
            { label: "P1 擦后", state: "erased" },
            { label: "P2 擦后", state: "erased" },
            { label: "P3 擦后", state: "erased" },
          ],
        },
      ],
      gc: "旧页不能原地覆盖；有效页搬迁后，整块擦除再作为空闲块使用。",
    };
    const raidSsdFlow = mode === "ssd" ? ssdFlow : raidFlows[mode];
    return extendedResult({
      formula: mode === "raid5" ? "Parity = D0 xor D1 xor D2" : mode === "ssd" ? "写前擦除：页写入、块擦除、FTL 映射" : "并行磁盘组织提高性能或可靠性",
      nodes: [
        { id: "stripe", title: "条带", detail: "连续数据分散写入" },
        { id: "mirror", title: "镜像", detail: "数据双份保存" },
        { id: "parity", title: "校验", detail: "异或恢复缺失块" },
        { id: "rebuild", title: "重建", detail: "故障盘恢复" },
        { id: "page", title: "页", detail: "SSD 读写单位" },
        { id: "block", title: "块", detail: "SSD 擦除单位" },
        { id: "ftl", title: "FTL", detail: "逻辑-物理映射" },
        { id: "disk0", title: "磁盘 0", detail: "成员盘" },
        { id: "disk1", title: "磁盘 1", detail: "成员盘" },
      ],
      steps: mode === "ssd"
        ? [
            { title: "主机发出逻辑写", detail: "SSD 控制器收到逻辑页地址和数据。", active: ["ftl"] },
            { title: "FTL 找空闲物理页", detail: "新数据写入空闲页，旧页标记失效。", active: ["page", "ftl"] },
            { title: "垃圾回收与块擦除", detail: "把仍有效的页搬走后擦除整个块。", active: ["block"] },
            { title: "磨损均衡", detail: "控制器分散擦写次数，延长闪存寿命。", active: ["ftl", "block"] },
          ]
        : [
            { title: "分配数据块", detail: data[1], active: data[2] },
            { title: "并行写入成员盘", detail: mode === "raid1" ? "两个磁盘写入相同数据。" : "不同条带写到不同磁盘。", active: ["disk0", "disk1"] },
            { title: "处理冗余", detail: mode === "raid0" ? "RAID0 不保存冗余。" : mode === "raid1" ? "镜像盘提供冗余。" : "写入分布式奇偶校验。", active: ["mirror", "parity"] },
            { title: "故障处理", detail: mode === "raid0" ? "任一成员盘故障都会丢失条带。" : "可用冗余信息恢复单盘故障。", active: ["rebuild"] },
          ],
      metrics: [
        { label: "模式", value: data[0] },
        { label: "性能", value: mode === "raid0" ? "高" : mode === "raid1" ? "读高/写中" : mode === "raid5" ? "读高/写有校验开销" : "随机读快" },
        { label: "可靠性", value: mode === "raid0" ? "低" : mode === "ssd" ? "依赖磨损管理" : "可容忍单盘故障" },
      ],
      raidSsdFlow,
    });
  }

  function simulateIoOverview(values) {
    const addressing = values.addressing || "isolated";
    const transfer = values.transfer || "serial";
    const handshake = values.handshake || "async";
    return extendedResult({
      formula: addressing === "unified" ? "统一编址：I/O 端口占用主存地址空间，用 load/store 访问" : "独立编址：I/O 有独立端口空间，使用专门 I/O 指令",
      nodes: [
        { id: "cpu", title: "CPU", detail: "发起 I/O 请求" },
        { id: "addr", title: "编址", detail: addressing === "unified" ? "统一编址" : "独立编址" },
        { id: "select", title: "设备选址", detail: "接口译码选中设备" },
        { id: "transfer", title: "传送", detail: transfer === "serial" ? "串行逐位" : "并行多位" },
        { id: "handshake", title: "联络", detail: handshake === "async" ? "Ready/ACK" : handshake === "sync" ? "同步时标" : "立即响应" },
        { id: "device", title: "I/O 设备", detail: "数据源或目的地" },
      ],
      steps: [
        { title: "选择 I/O 地址空间", detail: addressing === "unified" ? "CPU 用普通访存指令访问设备寄存器。" : "CPU 用专门 I/O 指令访问端口。", active: ["cpu", "addr"] },
        { title: "设备选址", detail: "设备选择电路根据端口号或地址译码决定是否响应。", active: ["select", "device"] },
        { title: "组织数据传送", detail: transfer === "serial" ? "串行传送线路少但每次只传一位。" : "并行传送线路多但一次可传多位。", active: ["transfer"] },
        { title: "完成联络", detail: handshake === "async" ? "异步应答用 Ready/ACK 协调速度差异。" : handshake === "sync" ? "同步方式按统一时标传输。" : "设备足够快时可立即响应。", active: ["handshake", "device"] },
      ],
      metrics: [
        { label: "编址", value: addressing === "unified" ? "统一" : "独立" },
        { label: "传送", value: transfer === "serial" ? "串行" : "并行" },
        { label: "联络", value: handshake },
      ],
    });
  }

  function simulatePollingIo(values) {
    const readyAfter = Math.max(1, Math.trunc(toNumber(values.readyAfter, 4)));
    const pollCost = Math.max(1, toNumber(values.pollCost, 80));
    const transferCost = Math.max(1, toNumber(values.transferCost, 120));
    const waitCycles = readyAfter * pollCost;
    const total = waitCycles + transferCost;
    const wasted = ((waitCycles / total) * 100).toFixed(1);
    const steps = [];
    for (let index = 1; index <= Math.min(readyAfter, 6); index += 1) {
      steps.push({
        title: `第 ${index} 次查询状态位`,
        detail: index === readyAfter ? "状态寄存器 Ready=1，设备已经就绪。" : "Ready=0，CPU 继续忙等轮询。",
        active: index === readyAfter ? ["status", "device"] : ["cpu", "status"],
      });
    }
    steps.push({ title: "读取/写入数据寄存器", detail: "CPU 开始搬运数据，查询方式下整个等待过程占用 CPU。", active: ["data", "cpu"] });
    return extendedResult({
      formula: "程序查询总开销 = 轮询次数 × 每次查询开销 + 数据传送开销",
      nodes: [
        { id: "cpu", title: "CPU", detail: "执行查询循环" },
        { id: "status", title: "状态寄存器", detail: "Ready/Busy" },
        { id: "data", title: "数据寄存器", detail: "传送数据" },
        { id: "device", title: "外设", detail: "慢速准备数据" },
      ],
      steps,
      metrics: [
        { label: "查询次数", value: String(readyAfter) },
        { label: "总周期", value: String(total) },
        { label: "忙等占比", value: `${wasted}%` },
      ],
    });
  }

  function simulateInterruptIo(values) {
    const source = values.priority || "keyboard";
    const nested = values.nested === "yes";
    const labels = { keyboard: "键盘", timer: "定时器", disk: "磁盘" };
    return extendedResult({
      formula: "中断方式：外设主动请求，CPU 响应后保存现场并转入 ISR",
      nodes: [
        { id: "device", title: labels[source], detail: "发出 IRQ" },
        { id: "cpu", title: "CPU", detail: "检测并响应" },
        { id: "mask", title: "中断屏蔽", detail: "允许/禁止响应" },
        { id: "stack", title: "现场保护", detail: "保存 PC/PSW/寄存器" },
        { id: "vector", title: "中断向量", detail: "定位 ISR 入口" },
        { id: "isr", title: "ISR", detail: "服务程序" },
      ],
      steps: [
        { title: "外设发出中断请求", detail: `${labels[source]} 完成事件后置 IRQ=1。`, active: ["device"] },
        { title: "CPU 判优与屏蔽检查", detail: nested ? "允许高优先级中断嵌套，低优先级继续等待。" : "当前服务期间屏蔽新的同级中断。", active: ["cpu", "mask"] },
        { title: "中断响应", detail: "CPU 完成当前指令后发出中断响应信号。", active: ["cpu"] },
        { title: "保存现场", detail: "断点 PC、PSW 和必要寄存器压栈。", active: ["stack"] },
        { title: "取中断向量", detail: "根据中断源查向量表，装入 ISR 入口地址。", active: ["vector"] },
        { title: "执行并返回", detail: "ISR 处理设备，恢复现场后返回断点继续执行。", active: ["isr", "stack"] },
      ],
      metrics: [
        { label: "中断源", value: labels[source] },
        { label: "嵌套", value: nested ? "允许" : "不允许" },
        { label: "CPU 等待", value: "低于查询方式" },
      ],
    });
  }

  function simulateDmaTransfer(values) {
    const bytes = Math.max(1, toNumber(values.bytes, 4096));
    const wordBytes = Math.max(1, toNumber(values.wordBytes, 4));
    const mode = values.mode || "cycle-steal";
    const cycles = Math.ceil(bytes / wordBytes);
    return extendedResult({
      formula: "DMA 传送周期数 = 字节数 / 每周期传送字节数",
      nodes: [
        { id: "cpu", title: "CPU", detail: "初始化 DMA" },
        { id: "dma", title: "DMA 控制器", detail: "地址计数/字数计数" },
        { id: "bus", title: "系统总线", detail: mode === "burst" ? "成块占用" : mode === "cycle-steal" ? "周期窃取" : "空闲时使用" },
        { id: "memory", title: "主存", detail: "数据缓冲区" },
        { id: "device", title: "I/O 设备", detail: "数据源/目的" },
        { id: "irq", title: "结束中断", detail: "通知 CPU" },
      ],
      steps: [
        { title: "CPU 预处理", detail: "CPU 设置主存首地址、传送字数、方向和设备号。", active: ["cpu", "dma"] },
        { title: "DMA 请求总线", detail: "DMA 控制器向 CPU/仲裁器申请总线控制权。", active: ["dma", "bus"] },
        { title: "执行数据传送", detail: `按 ${mode} 方式传送 ${bytes}B，约 ${cycles} 个总线周期。`, active: ["bus", "memory", "device"] },
        { title: "更新地址与计数", detail: "每传一个字，地址递增、计数递减，直到计数为 0。", active: ["dma", "memory"] },
        { title: "结束中断", detail: "DMA 释放总线并中断 CPU，报告传送完成。", active: ["irq", "cpu"] },
      ],
      metrics: [
        { label: "传送字节", value: `${bytes} B` },
        { label: "总线周期", value: String(cycles) },
        { label: "方式", value: mode },
      ],
    });
  }

  function simulateChannelIo(values) {
    const program = values.program || "read-block";
    const label = {
      "read-block": "读磁盘块到主存",
      print: "打印缓冲区",
      network: "网卡接收数据",
    }[program];
    return extendedResult({
      formula: "通道方式：CPU 启动通道，通道执行通道程序并管理设备传送",
      nodes: [
        { id: "cpu", title: "CPU", detail: "只负责启动和响应结束" },
        { id: "channel", title: "通道", detail: "执行通道指令" },
        { id: "ccw", title: "通道程序", detail: "命令、地址、字数" },
        { id: "controller", title: "设备控制器", detail: "控制具体外设" },
        { id: "memory", title: "主存", detail: "数据缓冲区" },
        { id: "irq", title: "结束中断", detail: "报告完成" },
      ],
      steps: [
        { title: "CPU 准备通道程序", detail: `通道程序描述任务：${label}。`, active: ["cpu", "ccw"] },
        { title: "CPU 启动通道", detail: "CPU 发出启动 I/O 指令后，可回到用户程序或调度其他任务。", active: ["cpu", "channel"] },
        { title: "通道取通道指令", detail: "通道读取命令码、主存地址、传送字数和设备号。", active: ["channel", "ccw"] },
        { title: "控制器执行传送", detail: "通道协调设备控制器和主存完成数据交换。", active: ["controller", "memory", "channel"] },
        { title: "中断报告完成", detail: "传送结束后通道向 CPU 发出中断，CPU 检查状态字。", active: ["irq", "cpu"] },
      ],
      metrics: [
        { label: "任务", value: label },
        { label: "CPU 负担", value: "低" },
        { label: "适合场景", value: "多外设/大批量 I/O" },
      ],
    });
  }

  function simulatePipelinePerformance(values) {
    const n = Math.max(1, Math.trunc(toNumber(values.instructions, 8)));
    const delays = [
      ["IF", Math.max(0.1, toNumber(values.ifDelay, 2))],
      ["ID", Math.max(0.1, toNumber(values.idDelay, 1))],
      ["EX", Math.max(0.1, toNumber(values.exDelay, 3))],
      ["MEM", Math.max(0.1, toNumber(values.memDelay, 2))],
      ["WB", Math.max(0.1, toNumber(values.wbDelay, 1))],
    ];
    const single = n * delays.reduce((sum, [, value]) => sum + value, 0);
    const clock = Math.max(...delays.map(([, value]) => value));
    const pipe = (n + delays.length - 1) * clock;
    const speedup = single / pipe;
    const efficiency = speedup / delays.length;
    const bottleneck = delays.find(([, value]) => value === clock)[0];
    const rows = [];
    for (let inst = 1; inst <= Math.min(n, 8); inst += 1) {
      rows.push([`I${inst}`, ...delays.map(([stage], index) => `C${inst + index}:${stage}`)]);
    }
    return extendedResult({
      formula: "流水线时间 = (指令数 + 段数 - 1) × 流水线时钟；时钟由最慢段决定",
      nodes: delays.map(([stage, delay]) => ({ id: stage, title: stage, detail: `${delay} ns` })),
      steps: [
        { title: "确定各段延迟", detail: delays.map(([s, d]) => `${s}=${d}ns`).join("，"), active: delays.map(([s]) => s) },
        { title: "找瓶颈段", detail: `最慢段是 ${bottleneck}，流水线时钟取 ${clock}ns。`, active: [bottleneck] },
        { title: "填充流水线", detail: "前 5 个周期逐步填满 IF/ID/EX/MEM/WB。", active: ["IF", "ID", "EX"] },
        { title: "稳定输出", detail: "理想情况下流水线填满后每个周期完成一条指令。", active: ["MEM", "WB"] },
        { title: "计算加速比和效率", detail: `单周期总时间 ${single.toFixed(2)}ns，流水线总时间 ${pipe.toFixed(2)}ns。`, active: delays.map(([s]) => s) },
      ],
      metrics: [
        { label: "单周期时间", value: `${single.toFixed(2)} ns` },
        { label: "流水线时间", value: `${pipe.toFixed(2)} ns` },
        { label: "加速比", value: speedup.toFixed(2) },
        { label: "效率", value: `${(efficiency * 100).toFixed(1)}%` },
      ],
      table: { headers: ["指令", "IF", "ID", "EX", "MEM", "WB"], rows },
    });
  }

  function renderKnowledgeAnswer(result) {
    const fallback = result.usedFallback ? `<div class="status-warn">已使用本地规则兜底：${escapeHtml(result.llmError || "未调用大模型")}</div>` : "";
    const toolSummary = summarizeToolContext(result.context);
    $("#qaMatched").textContent = `${result.agent.name} · ${result.model}`;
    $("#qaAnswer").innerHTML = `
      ${fallback}
      <div class="answer-section llm-answer">
        <h4>回答</h4>
        <div class="markdown-body">${renderMarkdown(result.answer)}</div>
      </div>
      ${
        toolSummary
          ? `<div class="status-good">${escapeHtml(toolSummary)}</div>`
          : `<div class="status-warn">本次由知识检索和 DeepSeek 智能体共同生成回答。</div>`
      }
    `;
  }

  async function runQuestionAnswer() {
    $("#qaMatched").textContent = "生成中";
    $("#qaAnswer").innerHTML = `<div class="empty-state">DeepSeek 知识问答智能体正在组织回答...</div>`;
    try {
      const result = await apiPost("/api/agent/chat", {
        agentId: "qa",
        chapterId: "all",
        mode: "standard",
        message: $("#qaQuestion").value,
        useLLM: true,
      });
      renderKnowledgeAnswer(result);
    } catch (error) {
      $("#qaMatched").textContent = "调用失败";
      $("#qaAnswer").innerHTML = `<div class="status-error">${escapeHtml(error.message)}</div>`;
    }
  }

  function formatAddress(value) {
    return `0x${Number(value).toString(16).toUpperCase()}`;
  }

  function formatAddressPadded(value, bits) {
    const width = Math.max(1, Math.ceil(bits / 4));
    return `0x${Number(value).toString(16).toUpperCase().padStart(width, "0")}`;
  }

  function renderBinarySplit(value, bits, segments) {
    const binary = (Number(value) >>> 0).toString(2).padStart(bits, "0").slice(-bits);
    let start = 0;
    const parts = segments
      .filter((segment) => segment.bits > 0)
      .map((segment) => {
        const slice = binary.slice(start, start + segment.bits);
        start += segment.bits;
        return `<span class="bit-seg ${segment.className}" title="${escapeHtml(segment.label)}">${slice}</span>`;
      })
      .join("");
    return `<span class="bit-split">${parts}</span>`;
  }

  function renderBitLegend(segments) {
    return `
      <span class="bit-legend">
        ${segments
          .filter((segment) => segment.bits > 0)
          .map((segment) => `<span><i class="bit-dot ${segment.className}"></i>${escapeHtml(segment.label)} ${segment.bits} 位</span>`)
          .join("")}
      </span>
    `;
  }

  function parseMemoryInteger(value, label) {
    const text = String(value || "").trim();
    if (!text) throw new Error(`${label}不能为空`);
    let result;
    if (/^[-+]?0x[0-9a-f]+$/i.test(text)) {
      result = Number.parseInt(text, 16);
    } else if (/^[-+]?0b[01]+$/i.test(text)) {
      const sign = text.startsWith("-") ? -1 : 1;
      result = sign * Number.parseInt(text.replace(/^[-+]?0b/i, ""), 2);
    } else if (/^[-+]?\d+$/.test(text)) {
      result = Number.parseInt(text, 10);
    } else {
      throw new Error(`${label}必须是十进制、0x 十六进制或 0b 二进制整数`);
    }
    if (!Number.isInteger(result)) throw new Error(`${label}必须是整数`);
    return result;
  }

  function parsePositiveInteger(value, label, maxValue = 1_000_000) {
    const result = parseMemoryInteger(value, label);
    if (result <= 0 || result > maxValue) {
      throw new Error(`${label}必须在 1 到 ${maxValue} 之间`);
    }
    return result;
  }

  function ceilDivide(left, right) {
    return Math.ceil(left / right);
  }

  function ceilLog2(value) {
    return value <= 1 ? 0 : Math.ceil(Math.log2(value));
  }

  function formatBinary(value, bits) {
    return (value >>> 0).toString(2).padStart(bits, "0").slice(-bits);
  }

  function formatMemoryValue(value, bits) {
    const hexWidth = Math.max(1, Math.ceil(bits / 4));
    return `0x${value.toString(16).toUpperCase().padStart(hexWidth, "0")}`;
  }

  function getMemoryConfig() {
    const { addressBits, columnBits, dataBits } = DEFAULT_MEMORY_CONFIG;
    if (columnBits >= addressBits) {
      throw new Error("列地址位数必须小于地址位数，才能同时形成字线和列线");
    }
    const operation = $("#memoryOperation").value;
    const address = parseMemoryInteger($("#memoryAddress").value, "地址");
    const maxAddress = 2 ** addressBits - 1;
    if (address < 0 || address > maxAddress) {
      throw new Error(`地址必须在 0 到 ${maxAddress} 之间`);
    }
    const mask = 2 ** dataBits - 1;
    const rawData = operation === "write" ? parseMemoryInteger($("#memoryData").value, "写入数据") : 0;
    if (operation === "write" && (rawData < 0 || rawData > mask)) {
      throw new Error(`写入数据必须在 0 到 ${mask} 之间`);
    }
    const data = rawData;
    const rowBits = addressBits - columnBits;
    const columnMask = 2 ** columnBits - 1;
    const wordLine = Math.floor(address / (2 ** columnBits));
    const columnLine = address & columnMask;
    return {
      operation,
      addressBits,
      columnBits,
      rowBits,
      dataBits,
      address,
      data,
      maxAddress,
      mask,
      wordLine,
      columnLine,
    };
  }

  function createMemorySteps(config, oldValue, resultValue) {
    const addressLabel = `${formatMemoryValue(config.address, config.addressBits)} (${formatBinary(config.address, config.addressBits)})`;
    const rowLines = formatAddressLineSlice(config.addressBits - 1, config.columnBits);
    const columnLines = formatAddressLineSlice(config.columnBits - 1, 0);
    const rowLabel = `${rowLines} = ${formatBinary(config.wordLine, config.rowBits)} -> 字线 WL${config.wordLine}`;
    const columnLabel = `${columnLines} = ${formatBinary(config.columnLine, config.columnBits)} -> 列线 CL${config.columnLine}`;
    const writeLabel = formatMemoryValue(config.data, config.dataBits);
    const readLabel = formatMemoryValue(resultValue, config.dataBits);
    if (config.operation === "write") {
      return [
        {
          phase: "address",
          title: "1. 地址送入 MAR",
          detail: `CPU 把地址 ${addressLabel} 放到地址总线，MAR 锁存该地址。`,
          active: ["cpu", "address", "mar"],
        },
        {
          phase: "decode",
          title: "2. 地址译码",
          detail: `地址高 ${config.rowBits} 位译码为 ${rowLabel}，低 ${config.columnBits} 位选择为 ${columnLabel}。`,
          active: ["address", "decoder", "cell"],
        },
        {
          phase: "data",
          title: "3. 数据进入 MDR",
          detail: `写入数据 ${writeLabel} 进入数据寄存器，写使能 WE 置为有效。`,
          active: ["cpu", "data", "mdr", "control"],
        },
        {
          phase: "cell",
          title: "4. 写入选中单元",
          detail: `选中地址原值 ${formatMemoryValue(oldValue, config.dataBits)} 被 ${writeLabel} 覆盖。`,
          active: ["decoder", "cell", "data", "control"],
        },
        {
          phase: "complete",
          title: "5. 写操作完成",
          detail: `地址 ${formatMemoryValue(config.address, config.addressBits)} 当前保存 ${writeLabel}。`,
          active: ["cell"],
        },
      ];
    }
    return [
      {
        phase: "address",
        title: "1. 地址送入 MAR",
        detail: `CPU 把地址 ${addressLabel} 放到地址总线，准备读取该单元。`,
        active: ["cpu", "address", "mar"],
      },
      {
        phase: "decode",
        title: "2. 地址译码",
        detail: `地址高 ${config.rowBits} 位译码为 ${rowLabel}，低 ${config.columnBits} 位选择为 ${columnLabel}，读控制信号打开输出通路。`,
        active: ["address", "decoder", "cell", "control"],
      },
      {
        phase: "sense",
        title: "3. 读出存储单元",
        detail: `被选中单元的内容 ${readLabel} 进入读出放大与数据通路。`,
        active: ["cell", "data"],
      },
      {
        phase: "data",
        title: "4. 数据进入 MDR",
        detail: `数据总线把 ${readLabel} 送入 MDR，再返回 CPU。`,
        active: ["data", "mdr", "cpu"],
      },
      {
        phase: "complete",
        title: "5. 读操作完成",
        detail: `读取结果为 ${readLabel}，二进制为 ${formatBinary(resultValue, config.dataBits)}。`,
        active: ["cpu", "cell"],
      },
    ];
  }

  function stopMemoryAuto() {
    if (state.memory.timer) {
      clearInterval(state.memory.timer);
      state.memory.timer = null;
    }
    const button = $("#memoryAuto");
    if (button) button.textContent = "自动演示";
  }

  function renderMemoryCellGrid(config, selectedStep) {
    const start = Math.floor(config.address / 16) * 16;
    const count = Math.min(16, config.maxAddress - start + 1);
    return Array.from({ length: count }, (_, index) => {
      const address = start + index;
      const showOldValue = address === config.address
        && config.operation === "write"
        && config.oldValue !== undefined
        && selectedStep
        && !["cell", "complete"].includes(selectedStep.phase);
      const value = showOldValue ? config.oldValue : state.memory.cells[address] ?? 0;
      const classes = ["memory-cell", address === config.address ? "selected" : ""].filter(Boolean).join(" ");
      return `
        <div class="${classes}">
          <strong>${formatMemoryValue(address, config.addressBits)}</strong>
          <span>${formatMemoryValue(value, config.dataBits)}</span>
        </div>
      `;
    }).join("");
  }

  function renderMemoryGlossary() {
    const terms = [
      ["MAR", "Memory Address Register，存储器地址寄存器，用来暂存本次访问的地址。"],
      ["MDR", "Memory Data Register，存储器数据寄存器，用来暂存写入或读出的数据。"],
      ["地址译码器", "把地址位翻译成具体被选中的字线和列线。"],
      ["字线 WL", "由行地址选中的一整行存储单元，同一时刻通常只激活一条。"],
      ["列线 CL", "由列地址选中的列或列组，用来确定这一行中的具体数据位/字。"],
      ["CS / WE", "CS 表示片选信号，WE 表示写使能；WE=0 通常表示写入，WE=1 通常表示读取。"],
    ];
    return `
      <div class="memory-glossary">
        <h4>术语说明</h4>
        <dl>
          ${terms.map(([term, desc]) => `<div><dt>${term}</dt><dd>${desc}</dd></div>`).join("")}
        </dl>
      </div>
    `;
  }

  function renderMemorySignalSummary(config, step) {
    const isWrite = config.operation === "write";
    const weText = isWrite ? "WE=0，写使能有效" : "WE=1，写使能关闭";
    const readText = isWrite ? "存储阵列接收数据总线的值" : "存储阵列把选中单元送到数据总线";
    return `
      <div class="signal-explain-grid">
        <div>
          <strong>CS 片选</strong>
          <span>CS=0，本片存储器被选中参与本次访问。</span>
        </div>
        <div>
          <strong>WE 写使能</strong>
          <span>${weText}；这里沿用常见低有效写使能表示。</span>
        </div>
        <div>
          <strong>当前通路</strong>
          <span>${step.phase === "address" ? "地址通路正在工作" : step.phase === "decode" ? "译码器正在选择字线和列线" : readText}。</span>
        </div>
      </div>
    `;
  }

  function renderMemoryAccess() {
    const config = state.memory.lastConfig;
    if (!config || !state.memory.steps.length) {
      $("#memoryStepCounter").textContent = "等待执行";
      $("#memoryAccessResult").innerHTML = `<div class="empty-state">输入地址和数据后，点击“执行读写过程”。</div>`;
      return;
    }
    const step = state.memory.steps[state.memory.cursor];
    const isActive = (name) => step.active.includes(name) ? "active" : "";
    const phaseOrder = state.memory.steps.map((item) => item.phase);
    const reached = (phase) => {
      const index = phaseOrder.indexOf(phase);
      return index !== -1 && index <= state.memory.cursor;
    };
    const oldValue = config.oldValue ?? state.memory.cells[config.address] ?? 0;
    const resultValue = config.resultValue ?? state.memory.cells[config.address] ?? 0;
    const storedValue = config.operation === "write" && !["cell", "complete"].includes(step.phase) ? oldValue : resultValue;
    const dataBusValue = config.operation === "write" ? config.data : resultValue;
    const isWrite = config.operation === "write";
    const decoderReady = reached("decode");
    const dataBusReady = isWrite ? reached("data") : reached("sense");
    const mdrReady = reached("data");
    const controlReady = isWrite ? reached("data") : reached("decode");
    const pending = `<em class="value-pending">—</em>`;
    const rowBinary = formatBinary(config.wordLine, config.rowBits);
    const columnBinary = formatBinary(config.columnLine, config.columnBits);
    const rowLines = formatAddressLineSlice(config.addressBits - 1, config.columnBits);
    const columnLines = formatAddressLineSlice(config.columnBits - 1, 0);
    const stepRail = state.memory.steps.map((item) => ({
      title: item.title.replace(/^\d+\.\s*/, ""),
      detail: item.detail,
      status: item.phase,
    }));
    $("#memoryStepCounter").textContent = `第 ${state.memory.cursor + 1} / ${state.memory.steps.length} 步`;
    $("#memoryAccessResult").innerHTML = `
      <div class="memory-stage-card focus-card">
        <span>当前看这里</span>
        <h4>${escapeHtml(step.title)}</h4>
        <p>${escapeHtml(step.detail)}</p>
      </div>
      <div class="memory-teaching-grid">
        <div>
          ${renderLearningStepper(stepRail, state.memory.cursor, "memory-stepper")}
        </div>
        <div>
          <div class="memory-line-summary">
            <div>
              <strong>完整地址 A${config.addressBits - 1}~A0</strong>
              <span>${renderBinarySplit(config.address, config.addressBits, [
                { bits: config.rowBits, className: "seg-index", label: "行地址（选字线）" },
                { bits: config.columnBits, className: "seg-offset", label: "列地址（选列线）" },
              ])}</span>
              ${renderBitLegend([
                { bits: config.rowBits, className: "seg-index", label: "行地址" },
                { bits: config.columnBits, className: "seg-offset", label: "列地址" },
              ])}
            </div>
            <div>
              <strong>字线 WL${config.wordLine}</strong>
              <span>${rowLines} = <span class="bit-seg seg-index">${rowBinary}</span>，十进制 ${config.wordLine}</span>
            </div>
            <div>
              <strong>列线 CL${config.columnLine}</strong>
              <span>${columnLines} = <span class="bit-seg seg-offset">${columnBinary}</span>，十进制 ${config.columnLine}</span>
            </div>
          </div>
          <div class="memory-machine">
            <div class="memory-node ${isActive("cpu")}">
              <strong>CPU</strong>
              <span>${config.operation === "write" ? "发起写入" : "发起读取"}</span>
            </div>
            <div class="memory-bus ${isActive("address")}"><strong>地址总线</strong><span>${renderBinarySplit(config.address, config.addressBits, [
              { bits: config.rowBits, className: "seg-index", label: "行地址（选字线）" },
              { bits: config.columnBits, className: "seg-offset", label: "列地址（选列线）" },
            ])}</span></div>
            <div class="memory-node ${isActive("mar")}">
              <strong>MAR</strong>
              <span>${formatMemoryValue(config.address, config.addressBits)}</span>
            </div>
            <div class="memory-node ${isActive("decoder")}">
              <strong>地址译码器</strong>
              <span>${decoderReady ? `WL${config.wordLine} / CL${config.columnLine}` : pending}</span>
            </div>
            <div class="memory-node ${isActive("cell")}">
              <strong>存储阵列</strong>
              <span>${formatMemoryValue(config.address, config.addressBits)} = ${formatMemoryValue(storedValue, config.dataBits)}</span>
            </div>
            <div class="memory-node ${isActive("mdr")}">
              <strong>MDR</strong>
              <span>${mdrReady ? formatMemoryValue(dataBusValue, config.dataBits) : pending}</span>
            </div>
            <div class="memory-bus ${isActive("data")}"><strong>数据总线</strong><span>${dataBusReady ? formatBinary(dataBusValue, config.dataBits) : pending}</span></div>
            <div class="memory-node ${isActive("control")}">
              <strong>控制信号</strong>
              <span>${controlReady ? (isWrite ? "CS=0 / WE=0" : "CS=0 / WE=1") : pending}</span>
            </div>
          </div>
        </div>
        ${renderMemorySignalSummary(config, step)}
      </div>
      <div class="cache-fields">
        <div class="cache-field"><strong>当前地址</strong><span>${formatMemoryValue(config.address, config.addressBits)}</span></div>
        <div class="cache-field"><strong>当前数据</strong><span>${formatMemoryValue(storedValue, config.dataBits)}</span></div>
        <div class="cache-field"><strong>操作模式</strong><span>${config.operation === "write" ? "写入" : "读取"}</span></div>
      </div>
      <div class="memory-cell-grid">${renderMemoryCellGrid(config, step)}</div>
      ${renderMemoryGlossary()}
    `;
  }

  function updateMemoryInputHints() {
    const operation = $("#memoryOperation")?.value || "write";
    const dataInput = $("#memoryData");
    const dataHint = $("#memoryDataHint");
    if (!dataInput) return;
    const isRead = operation === "read";
    dataInput.disabled = isRead;
    dataInput.placeholder = isRead ? "读取时不需要填写" : "0~255，例如 0x5C";
    dataInput.title = isRead
      ? "读取操作不使用写入数据"
      : "写入数据范围 0 到 255，支持十进制、0x 十六进制或 0b 二进制";
    if (dataHint) {
      dataHint.textContent = isRead
        ? "读取操作不使用写入数据，只显示该地址当前保存的值。"
        : "范围：0~255，支持十进制、0x 十六进制或 0b 二进制。";
    }
  }

  function runMemoryAccess() {
    try {
      updateMemoryInputHints();
      stopMemoryAuto();
      const config = getMemoryConfig();
      const oldValue = state.memory.cells[config.address] ?? 0;
      const resultValue = config.operation === "write" ? config.data : oldValue;
      if (config.operation === "write") {
        state.memory.cells[config.address] = config.data;
      }
      state.memory.lastConfig = { ...config, oldValue, resultValue };
      state.memory.steps = createMemorySteps(config, oldValue, resultValue);
      state.memory.cursor = 0;
      renderMemoryAccess();
    } catch (error) {
      $("#memoryStepCounter").textContent = "输入有误";
      $("#memoryAccessResult").innerHTML = `<div class="status-error">${escapeHtml(error.message)}</div>`;
    }
  }

  function stepMemoryAccess(delta) {
    if (!state.memory.steps.length) {
      runMemoryAccess();
      return;
    }
    stopMemoryAuto();
    state.memory.cursor = Math.max(0, Math.min(state.memory.steps.length - 1, state.memory.cursor + delta));
    renderMemoryAccess();
  }

  function toggleMemoryAuto() {
    if (!state.memory.steps.length) {
      runMemoryAccess();
    }
    if (state.memory.timer) {
      stopMemoryAuto();
      return;
    }
    $("#memoryAuto").textContent = "暂停";
    state.memory.timer = setInterval(() => {
      if (state.memory.cursor >= state.memory.steps.length - 1) {
        stopMemoryAuto();
        return;
      }
      state.memory.cursor += 1;
      renderMemoryAccess();
    }, 1200);
  }

  function clearMemoryAccess() {
    stopMemoryAuto();
    state.memory.cells = {};
    state.memory.steps = [];
    state.memory.cursor = 0;
    state.memory.lastConfig = null;
    renderMemoryAccess();
  }

  function renderExpansionChips(result) {
    const visibleCount = Math.min(result.chipCount, 24);
    const chips = Array.from({ length: visibleCount }, (_, index) => {
      const wordGroup = Math.floor(index / result.bitGroups);
      const bitGroup = index % result.bitGroups;
      const dataStart = bitGroup * result.chipBits;
      const dataEnd = Math.min((bitGroup + 1) * result.chipBits - 1, result.realizedBits - 1);
      const addressStart = wordGroup * result.chipWords;
      const addressEnd = Math.min((wordGroup + 1) * result.chipWords - 1, result.realizedWords - 1);
      const label = result.bitGroups > 1 && result.wordGroups > 1
        ? `字组 ${wordGroup}：${addressStart}~${addressEnd}，D${dataStart}~D${dataEnd}`
        : result.bitGroups > 1
          ? `D${dataStart}~D${dataEnd}`
          : `地址 ${addressStart}~${addressEnd}`;
      return `
        <div class="expansion-chip">
          <strong>芯片 ${index + 1}</strong>
          <span>${result.chipWords} × ${result.chipBits}</span>
          <em>${label}</em>
        </div>
      `;
    }).join("");
    const omitted = result.chipCount > visibleCount ? `<div class="expansion-chip muted">还有 ${result.chipCount - visibleCount} 片...</div>` : "";
    return `${chips}${omitted}`;
  }

  function getExpansionModeName(mode) {
    if (mode === "bit") return "位扩展法";
    if (mode === "word") return "字扩展法";
    return "字位同时扩展";
  }

  function formatAddressLineRange(count) {
    return count <= 0 ? "无片内地址线" : `A0~A${count - 1}`;
  }

  function formatAddressLineSlice(high, low) {
    return high === low ? `A${high}` : `A${high}~A${low}`;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function renderLearningStepper(steps, currentIndex, className = "") {
    return `
      <div class="learning-stepper ${className}">
        ${steps.map((step, index) => `
          <div class="learning-step ${index === currentIndex ? "active" : ""} ${step.status || ""}">
            <span>${index + 1}</span>
            <div>
              <strong>${escapeHtml(step.title)}</strong>
              <small>${escapeHtml(step.detail)}</small>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function simulateMemoryExpansion() {
    const mode = $("#expansionMode").value;
    const chipWords = parsePositiveInteger($("#chipWords").value, "单片字数");
    const chipBits = parsePositiveInteger($("#chipBits").value, "单片位宽", 1024);
    const targetWords = parsePositiveInteger($("#targetWords").value, "目标字数");
    const targetBits = parsePositiveInteger($("#targetBits").value, "目标位宽", 1024);
    const bitGroups = mode === "word" ? 1 : ceilDivide(targetBits, chipBits);
    const wordGroups = mode === "bit" ? 1 : ceilDivide(targetWords, chipWords);
    const chipCount = bitGroups * wordGroups;
    const realizedWords = wordGroups * chipWords;
    const realizedBits = bitGroups * chipBits;
    const warnings = [];
    if (mode === "bit" && targetWords !== chipWords) {
      warnings.push("单纯位扩展只能扩展位宽；目标字数不同，需要选择字位同时扩展或再叠加字扩展。");
    }
    if (mode === "word" && targetBits !== chipBits) {
      warnings.push("单纯字扩展只能扩展字数；目标位宽不同，需要选择字位同时扩展或再叠加位扩展。");
    }
    if (mode === "both" && (realizedWords !== targetWords || realizedBits !== targetBits)) {
      warnings.push("目标规格不能被单片规格整除时，实际容量会向上补齐。");
    }
    return {
      mode,
      chipWords,
      chipBits,
      targetWords,
      targetBits,
      bitGroups,
      wordGroups,
      chipCount,
      realizedWords,
      realizedBits,
      addressLines: ceilLog2(chipWords),
      selectLines: wordGroups > 1 ? ceilLog2(wordGroups) : 0,
      warning: warnings.join(" "),
    };
  }

  function getExpansionSteps(result) {
    return [
      {
        title: "确认单片规格",
        detail: `每片芯片容量为 ${result.chipWords} 字 × ${result.chipBits} 位，需要 ${result.addressLines} 条片内地址线。`,
        status: "spec",
      },
      {
        title: "对齐目标容量",
        detail: `目标为 ${result.targetWords} 字 × ${result.targetBits} 位，最终实现 ${result.realizedWords} 字 × ${result.realizedBits} 位。`,
        status: "target",
      },
      {
        title: "计算位扩展",
        detail: result.bitGroups > 1
          ? `位宽方向需要 ${result.bitGroups} 片并联，每片承担一段数据线。`
          : "位宽方向不需要并联，单片位宽已经覆盖目标位宽。",
        status: "bit",
      },
      {
        title: "计算字扩展",
        detail: result.wordGroups > 1
          ? `字数方向需要 ${result.wordGroups} 组，同一时刻由片选译码器只选中其中一组。`
          : "字数方向不需要分组，所有芯片共享同一组片选。",
        status: "word",
      },
      {
        title: "连接地址线与片选",
        detail: `${formatAddressLineRange(result.addressLines)} 接到每片芯片内部地址端${result.selectLines ? `，高位地址经译码形成 ${result.wordGroups} 路片选` : "，不需要额外片选译码"}。`,
        status: "select",
      },
      {
        title: "拼接数据总线",
        detail: result.bitGroups > 1
          ? `${result.bitGroups} 片的输出并成 ${result.realizedBits} 位数据总线，构成一个完整存储字。`
          : `每片直接连接 ${result.realizedBits} 位数据总线。`,
        status: "data",
      },
    ];
  }

  function renderMemoryExpansion(result) {
    const modeName = getExpansionModeName(result.mode);
    const steps = getExpansionSteps(result);
    const currentIndex = clamp(state.expansion.cursor, 0, steps.length - 1);
    const currentStep = steps[currentIndex];
    const counter = $("#expansionStepCounter");
    if (counter) counter.textContent = `第 ${currentIndex + 1} / ${steps.length} 步`;
    $("#memoryExpansionResult").innerHTML = `
      ${result.warning ? `<div class="status-warn">${escapeHtml(result.warning)}</div>` : `<div class="status-good">${modeName}结构已生成。</div>`}
      <div class="memory-stage-card focus-card">
        <span>当前看这里</span>
        <h4>${escapeHtml(currentStep.title)}</h4>
        <p>${escapeHtml(currentStep.detail)}</p>
      </div>
      <div class="cache-fields">
        <div class="cache-field"><strong>芯片数量</strong><span>${result.chipCount} 片</span></div>
        <div class="cache-field"><strong>实现容量</strong><span>${result.realizedWords} × ${result.realizedBits} 位</span></div>
        <div class="cache-field"><strong>扩展分解</strong><span>位扩展 ${result.bitGroups} 片并联 / 字扩展 ${result.wordGroups} 组</span></div>
      </div>
      <div class="expansion-teaching-grid">
        ${renderLearningStepper(steps, currentIndex, "expansion-stepper")}
        <div class="expansion-diagram ${result.mode}-mode">
          <div class="expansion-source">CPU<br><span>地址线 / 数据线 / 控制线</span></div>
          <div class="expansion-bus ${["spec", "target", "select"].includes(currentStep.status) ? "active" : ""}">
            <strong>${formatAddressLineRange(result.addressLines)} 接入片内地址</strong>
            <span>${result.selectLines ? `${result.selectLines} 条高位地址线用于片选译码` : "所有芯片共享同一组片内地址线"}</span>
          </div>
          <div class="expansion-bus ${currentStep.status === "word" || currentStep.status === "select" ? "active" : ""}">
            <strong>片选译码</strong>
            <span>${result.wordGroups > 1 ? `产生 ${result.wordGroups} 路片选信号，每次只选中一组` : "无需字扩展片选译码"}</span>
          </div>
          <div class="expansion-bus ${currentStep.status === "bit" || currentStep.status === "data" ? "active" : ""}">
            <strong>数据总线拼接</strong>
            <span>${result.bitGroups > 1 ? `${result.bitGroups} 片并联组成 ${result.realizedBits} 位` : `单片提供 ${result.realizedBits} 位数据`}</span>
          </div>
          <div class="expansion-chip-grid">${renderExpansionChips(result)}</div>
        </div>
      </div>
    `;
  }

  function runMemoryExpansion() {
    try {
      const result = simulateMemoryExpansion();
      state.expansion.result = result;
      state.expansion.cursor = 0;
      renderMemoryExpansion(result);
    } catch (error) {
      state.expansion.result = null;
      const counter = $("#expansionStepCounter");
      if (counter) counter.textContent = "输入有误";
      $("#memoryExpansionResult").innerHTML = `<div class="status-error">${escapeHtml(error.message)}</div>`;
    }
  }

  function stepMemoryExpansion(delta) {
    if (!state.expansion.result) {
      runMemoryExpansion();
      return;
    }
    const steps = getExpansionSteps(state.expansion.result);
    state.expansion.cursor = clamp(state.expansion.cursor + delta, 0, steps.length - 1);
    renderMemoryExpansion(state.expansion.result);
  }

  function renderTwosComplement(result) {
    const status = result.overflow ? "status-error" : "status-good";
    if (result.operation === "multiply") {
      $("#twosResult").innerHTML = `
        <div class="binary-line">
          <div class="binary-row"><strong>x</strong><div class="binary-value">${result.xBinary} (${result.x})</div></div>
          <div class="binary-row"><strong>y</strong><div class="binary-value">${result.yBinary} (${result.y})</div></div>
          <div class="binary-row"><strong>product</strong><div class="binary-value">${result.productBinary} (${result.raw})</div></div>
          <div class="binary-row"><strong>low ${result.bits}</strong><div class="binary-value">${result.truncatedBinary} (${result.result})</div></div>
        </div>
        <div class="${status}">${escapeHtml(result.explanation)}</div>
        <div class="status-good">${escapeHtml(result.signExplanation)}</div>
        <div class="table-wrap" style="margin-top: 12px;">
          <table>
            <thead>
              <tr><th>乘数位</th><th>位值</th><th>部分积</th><th>${result.productBits} 位二进制</th></tr>
            </thead>
            <tbody>
              ${result.partials
                .map(
                  (step) => `
                    <tr>
                      <td class="bit-cell">${step.position}</td>
                      <td class="bit-cell">${step.multiplierBit}</td>
                      <td>${step.partialValue}</td>
                      <td><code>${step.partialBinary}</code></td>
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `;
      return;
    }

    if (result.operation === "divide") {
      $("#twosResult").innerHTML = `
        <div class="binary-line">
          <div class="binary-row"><strong>x</strong><div class="binary-value">${result.xBinary} (${result.x})</div></div>
          <div class="binary-row"><strong>y</strong><div class="binary-value">${result.yBinary} (${result.y})</div></div>
          <div class="binary-row"><strong>quotient</strong><div class="binary-value">${result.quotientBinary} (${result.quotient})</div></div>
          <div class="binary-row"><strong>remainder</strong><div class="binary-value">${result.remainderBinary} (${result.remainder})</div></div>
        </div>
        <div class="${status}">${escapeHtml(result.explanation)}</div>
        <div class="table-wrap" style="margin-top: 12px;">
          <table>
            <thead>
              <tr><th>处理位</th><th>商位</th><th>本步余数</th></tr>
            </thead>
            <tbody>
              ${result.steps
                .map(
                  (step) => `
                    <tr>
                      <td class="bit-cell">${step.position}</td>
                      <td class="bit-cell">${step.quotientBit}</td>
                      <td>${step.shiftedRemainder}</td>
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `;
      return;
    }

    $("#twosResult").innerHTML = `
      <div class="binary-line">
        <div class="binary-row">
          <strong>x</strong>
          <div class="binary-value">${result.xBinary} (${result.x})</div>
        </div>
        <div class="binary-row">
          <strong>y</strong>
          <div class="binary-value">${result.yBinary} (${result.y})</div>
        </div>
        <div class="binary-row">
          <strong>sum</strong>
          <div class="binary-value">${result.sumBinary} (${result.result})</div>
        </div>
      </div>
      <div class="${status}">${escapeHtml(result.explanation)}</div>
      <div class="table-wrap" style="margin-top: 12px;">
        <table>
          <thead>
            <tr>
              <th>位</th>
              <th>x</th>
              <th>y</th>
              <th>进位输入</th>
              <th>结果位</th>
              <th>进位输出</th>
            </tr>
          </thead>
          <tbody>
            ${result.steps
              .map(
                (step) => `
                  <tr>
                    <td class="bit-cell">${step.position}</td>
                    <td class="bit-cell">${step.xBit}</td>
                    <td class="bit-cell">${step.yBit}</td>
                    <td class="bit-cell">${step.carryIn}</td>
                    <td class="bit-cell">${step.sumBit}</td>
                    <td class="bit-cell">${step.carryOut}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function runTwosComplement() {
    try {
      const result = core.simulateFixedPointOperation({
        operation: $("#fixedOperation").value,
        x: $("#twosX").value,
        y: $("#twosY").value,
        bits: $("#twosBits").value,
      });
      renderTwosComplement(result);
    } catch (error) {
      $("#twosResult").innerHTML = `<div class="status-error">${escapeHtml(error.message)}</div>`;
    }
  }

  function renderFloatOperand(label, operand) {
    return `
      <tr>
        <td>${escapeHtml(label)}</td>
        <td>${operand.value}</td>
        <td class="bit-cell">${operand.sign}</td>
        <td><code>${operand.binary.slice(1, 9)}</code><br><span>${operand.exponentRaw} / E=${operand.exponent}</span></td>
        <td><code>${operand.fractionBinary}</code></td>
        <td>${escapeHtml(operand.category)}</td>
      </tr>
    `;
  }

  function renderFloatResult(result) {
    $("#floatResult").innerHTML = `
      <div class="status-good">${escapeHtml(result.explanation)}</div>
      <div class="binary-line">
        <div class="binary-row">
          <strong>result</strong>
          <div class="binary-value">${result.result.binary} (${result.resultValue})</div>
        </div>
      </div>
      <div class="table-wrap" style="margin-top: 12px;">
        <table>
          <thead>
            <tr><th>对象</th><th>十进制值</th><th>符号</th><th>阶码</th><th>尾数字段</th><th>类型</th></tr>
          </thead>
          <tbody>
            ${renderFloatOperand("a", result.left)}
            ${renderFloatOperand(result.operation === "subtract" ? "-b" : "b", result.effectiveRight)}
            ${renderFloatOperand("result", result.result)}
          </tbody>
        </table>
      </div>
      <div class="answer-section">
        <h4>规格化过程</h4>
        <ol>${result.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
      </div>
    `;
  }

  function runFloat() {
    try {
      const result = core.simulateIeee754Operation($("#floatA").value, $("#floatB").value, $("#floatOperation").value);
      renderFloatResult(result);
    } catch (error) {
      $("#floatResult").innerHTML = `<div class="status-error">${escapeHtml(error.message)}</div>`;
    }
  }

  function getCacheMappingName(result) {
    if (result.mapping === "direct") return "直接映射";
    if (result.mapping === "fully") return "全相联映射";
    return `${result.associativity} 路组相联映射`;
  }

  function renderBitFields(fields) {
    return `
      <div class="bit-field-row">
        ${fields
          .filter((field) => field.bits > 0)
          .map((field) => `
            <div class="bit-field ${field.className || ""}">
              <strong>${escapeHtml(field.label)}</strong>
              ${field.binary ? `<code class="bit-seg ${field.className || ""}">${field.binary}</code>` : ""}
              <span>${field.bits} 位</span>
              <small>${escapeHtml(field.hint)}</small>
            </div>
          `)
          .join("")}
      </div>
    `;
  }

  function groupCacheRows(rows) {
    return rows.reduce((groups, row) => {
      if (!groups.has(row.set)) groups.set(row.set, []);
      groups.get(row.set).push(row);
      return groups;
    }, new Map());
  }

  function renderCacheSetGrid(result, selectedEvent = null) {
    const rows = selectedEvent && selectedEvent.snapshotRows ? selectedEvent.snapshotRows : result.rows;
    const groups = groupCacheRows(rows);
    return `
      <div class="cache-set-grid">
        ${Array.from(groups.entries())
          .map(([setIndex, rows]) => `
            <div class="cache-set-box ${selectedEvent && Number(setIndex) === selectedEvent.setIndex ? "active" : ""}">
              <strong>${result.mapping === "direct" ? `行 ${setIndex}` : `组 ${setIndex}`}</strong>
              <div>
                ${rows
                  .map((row) => {
                    const prefix = result.mapping === "direct" ? "" : `Way ${row.way} · `;
                    const content = row.valid
                      ? `${prefix}V=1 · Tag=${escapeHtml(row.tag)} · 主存块 ${escapeHtml(row.block)}`
                      : `${prefix}空行（V=0）`;
                    return `
                    <span class="${[row.valid ? "filled" : "", selectedEvent && row.set === selectedEvent.setIndex && row.way === selectedEvent.way ? "current" : ""].filter(Boolean).join(" ")}">
                      ${content}
                    </span>
                  `;
                  })
                  .join("")}
              </div>
            </div>
          `)
          .join("")}
      </div>
    `;
  }

  function cacheBitSegments(result) {
    return [
      { bits: result.tagBits, className: "seg-tag", label: "Tag" },
      { bits: result.indexBits, className: "seg-index", label: "行号 Index" },
      { bits: result.offsetBits, className: "seg-offset", label: "块内偏移 Offset" },
    ];
  }

  function renderCacheStructureDiagram(result, selectedEvent = null) {
    const addressBinary = selectedEvent ? formatBinary(selectedEvent.address, result.addressBits) : "";
    const tagBinary = addressBinary.slice(0, result.tagBits);
    const indexBinary = addressBinary.slice(result.tagBits, result.tagBits + result.indexBits);
    const offsetBinary = addressBinary.slice(result.tagBits + result.indexBits);
    const segments = cacheBitSegments(result);
    const fields = [
      { label: "Tag", bits: result.tagBits, className: "seg-tag", binary: tagBinary, hint: selectedEvent ? `Tag=${selectedEvent.tag}，与该行保存的 Tag 比较` : "与缓存行中保存的标记比较" },
      { label: "Line Index", bits: result.indexBits, className: "seg-index", binary: indexBinary, hint: selectedEvent ? `行号=${selectedEvent.setIndex}，定位唯一缓存行` : "定位唯一缓存行" },
      { label: "Block Offset", bits: result.offsetBits, className: "seg-offset", binary: offsetBinary, hint: selectedEvent ? `偏移=${selectedEvent.offset}，块内第 ${selectedEvent.offset} 字节` : "定位块内字节" },
    ];
    const placement = selectedEvent
      ? `主存块 ${selectedEvent.blockNumber} mod ${result.lines} = Cache 行 ${selectedEvent.setIndex}。`
      : "Index 只指向唯一 Cache 行，主存块只能放在这一行。";
    const accessSummary = selectedEvent
      ? `访问 ${selectedEvent.accessIndex + 1}：${formatAddressPadded(selectedEvent.address, result.addressBits)}，${selectedEvent.hit ? "命中" : "未命中"}。${selectedEvent.action}`
      : "运行后可逐次查看每个地址如何定位到唯一 Cache 行。";
    return `
      <div class="mapping-diagram">
        <div class="diagram-title">
          <strong>直接映射结构图</strong>
          <span>主存块号 mod Cache 行数 = Cache 行号</span>
        </div>
        ${selectedEvent ? `
          <div class="binary-split-bar">
            <strong>${formatAddressPadded(selectedEvent.address, result.addressBits)} =</strong>
            ${renderBinarySplit(selectedEvent.address, result.addressBits, segments)}
            ${renderBitLegend(segments)}
          </div>
        ` : ""}
        <div class="diagram-flow">
          <div class="diagram-node source-node">
            <strong>CPU 地址</strong>
            <span>${selectedEvent ? formatAddressPadded(selectedEvent.address, result.addressBits) : `${result.addressBits} 位地址`}</span>
          </div>
          <div class="diagram-arrow">→</div>
          <div class="diagram-node field-node">
            <strong>地址字段拆分</strong>
            ${renderBitFields(fields)}
          </div>
          <div class="diagram-arrow">→</div>
          <div class="diagram-node">
            <strong>${selectedEvent ? `Cache 行 ${selectedEvent.setIndex}` : "定位唯一 Cache 行"}</strong>
            <span>${escapeHtml(placement)}</span>
          </div>
          <div class="diagram-arrow">→</div>
          <div class="diagram-node">
            <strong>Tag 比较</strong>
            ${selectedEvent ? renderTagCompare(result, selectedEvent) : `<span>只比较被选中行的 Tag。</span>`}
          </div>
        </div>
        <div class="diagram-callout">${escapeHtml(accessSummary)}</div>
        ${result.mapping === "direct" ? renderCacheLineTable(result, selectedEvent) : renderCacheSetGrid(result, selectedEvent)}
        ${result.mapping === "direct" ? renderCacheBlockMap(result, selectedEvent) : ""}
      </div>
    `;
  }

  function cacheBlockRange(result, block) {
    const start = block * result.blockSize;
    return `${formatAddressPadded(start, result.addressBits)}~${formatAddressPadded(start + result.blockSize - 1, result.addressBits)}`;
  }

  function renderTagCompare(result, selectedEvent) {
    const prevRows = selectedEvent.accessIndex > 0 ? result.events[selectedEvent.accessIndex - 1].snapshotRows : null;
    const prevRow = prevRows
      ? prevRows.find((row) => row.set === selectedEvent.setIndex && row.way === selectedEvent.way)
      : null;
    const addressTag = `<code class="bit-seg seg-tag">${formatBinary(selectedEvent.tag, result.tagBits)}</code>`;
    if (!prevRow || !prevRow.valid) {
      return `
        <div class="tag-compare">
          <span>行内：<em class="value-pending">V=0 空行</em></span>
          <span class="cmp-op">vs</span>
          <span>地址 Tag ${addressTag}</span>
        </div>
        <small class="cmp-conclusion miss">该行还没有数据，无需比较 ⇒ 未命中（冷未命中），直接装入。</small>
      `;
    }
    const storedTag = `<code class="bit-seg seg-tag">${formatBinary(Number(prevRow.tag), result.tagBits)}</code>`;
    const equal = Number(prevRow.tag) === Number(selectedEvent.tag);
    return `
      <div class="tag-compare">
        <span>行内 Tag ${storedTag}</span>
        <span class="cmp-op ${equal ? "eq" : "neq"}">${equal ? "=" : "≠"}</span>
        <span>地址 Tag ${addressTag}</span>
      </div>
      <small class="cmp-conclusion ${equal ? "hit" : "miss"}">${equal
        ? `Tag 相等且 V=1 ⇒ 命中，行内保存的就是主存块 ${selectedEvent.blockNumber}。`
        : `Tag 不相等 ⇒ 未命中（冲突：行内目前是主存块 ${escapeHtml(prevRow.block)}，将被换出）。`}</small>
    `;
  }

  function renderCacheLineTable(result, selectedEvent) {
    const rows = selectedEvent && selectedEvent.snapshotRows ? selectedEvent.snapshotRows : result.rows;
    return `
      <div class="cache-line-table table-wrap">
        <table>
          <thead>
            <tr><th>Cache 行</th><th>有效位 V</th><th>Tag</th><th>保存的主存块</th><th>对应主存地址</th></tr>
          </thead>
          <tbody>
            ${rows.map((row) => {
              const isCurrent = selectedEvent && row.set === selectedEvent.setIndex;
              return `
                <tr class="${isCurrent ? "current" : ""}">
                  <th>行 ${row.set}${isCurrent ? " ←" : ""}</th>
                  <td>${row.valid ? 1 : 0}</td>
                  <td>${row.valid ? `<code class="bit-seg seg-tag">${formatBinary(Number(row.tag), result.tagBits)}</code>` : "—"}</td>
                  <td>${row.valid ? `块 ${row.block}` : "空"}</td>
                  <td>${row.valid ? cacheBlockRange(result, Number(row.block)) : "—"}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderCacheBlockMap(result, selectedEvent) {
    const totalBlocks = (2 ** result.addressBits) / result.blockSize;
    if (!selectedEvent || totalBlocks > 32) return "";
    const rows = selectedEvent.snapshotRows || result.rows;
    const residentBlocks = new Set(rows.filter((row) => row.valid).map((row) => Number(row.block)));
    const columns = result.lines;
    const header = Array.from({ length: columns }, (_, line) =>
      `<div class="block-map-head ${line === selectedEvent.setIndex ? "current-col" : ""}">行 ${line}</div>`).join("");
    const cells = [];
    for (let row = 0; row < totalBlocks / columns; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const block = row * columns + column;
        const classes = [
          "block-map-cell",
          column === selectedEvent.setIndex ? "current-col" : "",
          block === selectedEvent.blockNumber ? "current" : "",
          residentBlocks.has(block) ? "resident" : "",
        ].filter(Boolean).join(" ");
        cells.push(`
          <div class="${classes}">
            <strong>块 ${block}</strong>
            <span>${cacheBlockRange(result, block)}</span>
          </div>
        `);
      }
    }
    return `
      <div class="block-map">
        <div class="diagram-title">
          <strong>主存块 → Cache 行 对应地图</strong>
          <span>块号 mod ${columns} 相同的块在同一列，只能挤同一行 —— 这就是冲突的来源</span>
        </div>
        <div class="block-map-grid" style="grid-template-columns: repeat(${columns}, minmax(0, 1fr));">
          ${header}
          ${cells.join("")}
        </div>
        <div class="block-map-legend">
          <span><i class="block-dot current"></i>当前访问的块</span>
          <span><i class="block-dot resident"></i>已在 Cache 中</span>
          <span><i class="block-dot current-col"></i>与本次访问同列（同一 Cache 行）</span>
        </div>
      </div>
    `;
  }

  function renderCacheProcessSteps(result, selectedEvent) {
    const locateText = (event) => {
      if (result.mapping === "direct") return `Index=${event.setIndex}，只检查 Cache 行 ${event.setIndex}。`;
      if (result.mapping === "fully") return "全相联没有 Index，需要在所有有效行中查找相同 Tag。";
      return `Set Index=${event.setIndex}，只在第 ${event.setIndex} 组的 ${result.associativity} 路中查找。`;
    };
    const compareText = (event) => event.hit
      ? `找到 Tag=${event.tag} 的有效项，访问命中。`
      : `没有找到 Tag=${event.tag} 的有效项，访问未命中。`;
    const accessRail = result.events.map((event) => ({
      title: `${formatAddress(event.address)} · ${event.hit ? "命中" : "未命中"}`,
      detail: `块 ${event.blockNumber}，Tag=${event.tag}，${event.hit ? `命中第 ${event.setIndex} 组第 ${event.way} 路` : event.evicted ? `替换第 ${event.setIndex} 组第 ${event.way} 路` : `装入第 ${event.setIndex} 组第 ${event.way} 路`}`,
      status: event.hit ? "hit" : "miss",
    }));
    return `
      <div class="teaching-split">
        ${renderLearningStepper(accessRail, selectedEvent.accessIndex, "cache-access-rail")}
        <div class="process-card ${selectedEvent.hit ? "hit" : "miss"}">
          <div class="process-card-head">
            <strong>访问 ${selectedEvent.accessIndex + 1}：${formatAddress(selectedEvent.address)}</strong>
            <span>${selectedEvent.hit ? "命中" : "未命中"}</span>
          </div>
          <ol>
            <li>地址拆分：主存块号 ${selectedEvent.blockNumber}，Tag=${selectedEvent.tag}，Offset=${selectedEvent.offset}。</li>
            <li>定位候选：${escapeHtml(locateText(selectedEvent))}</li>
            <li>Tag 比较：${escapeHtml(compareText(selectedEvent))}</li>
            <li>状态更新：${escapeHtml(selectedEvent.action)}</li>
          </ol>
        </div>
      </div>
    `;
  }

  function renderCache(result) {
    const selectedEvent = result.events[clamp(state.cache.cursor, 0, result.events.length - 1)];
    const counter = $("#cacheStepCounter");
    if (counter) counter.textContent = `访问 ${selectedEvent.accessIndex + 1} / ${result.events.length}`;
    const seen = result.events.slice(0, selectedEvent.accessIndex + 1);
    const hitsSoFar = seen.filter((event) => event.hit).length;
    const missesSoFar = seen.length - hitsSoFar;
    $("#cacheResult").innerHTML = `
      <div class="${selectedEvent.hit ? "status-good" : "status-warn"}">
        当前地址 ${formatAddressPadded(selectedEvent.address, result.addressBits)}：${selectedEvent.hit ? "命中" : "未命中"}，主存块 ${selectedEvent.blockNumber} → Cache 行 ${selectedEvent.setIndex}。
      </div>
      <div class="sim-stats">
        <span class="stat">进度 ${seen.length} / ${result.events.length}</span>
        <span class="stat hit">已命中 ${hitsSoFar}</span>
        <span class="stat miss">已缺失 ${missesSoFar}</span>
        <span class="stat">当前命中率 ${seen.length ? Math.round((hitsSoFar / seen.length) * 100) : 0}%</span>
        <span class="stat total">全序列命中率 ${Math.round(result.hitRate * 100)}%（命中 ${result.hits} / 未命中 ${result.misses}）</span>
      </div>
      ${renderCacheStructureDiagram(result, selectedEvent)}
    `;
  }

  function renderCacheConfigNote() {
    const container = $("#cacheConfigNote");
    if (!container) return;
    const { addressBits, lines, blockSize } = DEFAULT_CACHE_CONFIG;
    const totalBytes = 2 ** addressBits;
    const blockCount = totalBytes / blockSize;
    const offsetBits = Math.log2(blockSize);
    const indexBits = Math.log2(lines);
    const tagBits = addressBits - offsetBits - indexBits;
    container.innerHTML = `
      <strong>本仿真的默认配置（固定）</strong>
      <ul>
        <li>主存：${addressBits} 位地址，共 ${totalBytes} B（0x00~${formatAddressPadded(totalBytes - 1, addressBits)}），按每块 ${blockSize} B 分成 ${blockCount} 个主存块（块号 0~${blockCount - 1}）。</li>
        <li>Cache：${lines} 行，每行存 1 个块（${blockSize} B），直接映射：主存块号 mod ${lines} = Cache 行号。</li>
        <li>地址拆分：Tag ${tagBits} 位 + 行号 ${indexBits} 位 + 块内偏移 ${offsetBits} 位——块大小定偏移位数，行数定行号位数，剩下的都是 Tag。</li>
      </ul>
    `;
  }

  function renderVmConfigNote() {
    const container = $("#vmConfigNote");
    if (!container) return;
    const frames = Number($("#vmFrames")?.value || 3);
    const pageSize = Number($("#vmPageSize")?.value || 1024);
    const policy = $("#vmReplacement")?.value || "lru";
    const policyText = {
      lru: "LRU：内存满时，换出最久没被访问过的页",
      fifo: "FIFO：内存满时，换出最早装入内存的页",
      lfu: "LFU：内存满时，换出被使用次数最少的页",
      opt: "OPT（理论最优）：换出将来最晚才会用到的页",
    }[policy] || policy.toUpperCase();
    container.innerHTML = `
      <strong>本仿真的默认配置</strong>
      <ul>
        <li>物理内存：${frames} 个页框，同一时刻最多容纳 ${frames} 页；页大小 ${pageSize} B。</li>
        <li>上面输入的序列是“页号”访问序列：0 1 2… 表示程序依次访问这些页。</li>
        <li>置换算法 ${policyText}。</li>
      </ul>
    `;
  }

  function runCache() {
    stopCacheAuto();
    try {
      const result = core.simulateCacheSystem({
        accesses: $("#cacheAccesses").value || DEFAULT_CACHE_CONFIG.accesses,
        addressBits: DEFAULT_CACHE_CONFIG.addressBits,
        lines: DEFAULT_CACHE_CONFIG.lines,
        blockSize: DEFAULT_CACHE_CONFIG.blockSize,
        mapping: "direct",
        associativity: DEFAULT_CACHE_CONFIG.associativity,
        replacement: "lru",
      });
      state.cache.result = result;
      state.cache.cursor = 0;
      renderCache(result);
    } catch (error) {
      state.cache.result = null;
      const counter = $("#cacheStepCounter");
      if (counter) counter.textContent = "输入有误";
      $("#cacheResult").innerHTML = `<div class="status-error">${escapeHtml(error.message)}</div>`;
    }
  }

  function stepCache(delta) {
    if (!state.cache.result) {
      runCache();
      return;
    }
    state.cache.cursor = clamp(state.cache.cursor + delta, 0, state.cache.result.events.length - 1);
    renderCache(state.cache.result);
    if (state.cache.cursor >= state.cache.result.events.length - 1) stopCacheAuto();
  }

  function resetCache() {
    stopCacheAuto();
    if (!state.cache.result) {
      runCache();
      return;
    }
    state.cache.cursor = 0;
    renderCache(state.cache.result);
  }

  function stopCacheAuto() {
    stopStepTimer("cache", "#cacheAuto", "一键演示");
  }

  function toggleCacheAuto() {
    if (state.cache.timer) {
      stopCacheAuto();
      return;
    }
    runCache();
    if (!state.cache.result || state.cache.result.events.length <= 1) return;
    toggleStepTimer(
      "cache",
      "#cacheAuto",
      "一键演示",
      "暂停演示",
      () => stepCache(1),
      () => !state.cache.result || state.cache.cursor >= state.cache.result.events.length - 1
    );
    window.setTimeout(() => {
      if (state.cache.timer) stepCache(1);
    }, 250);
  }

  function getVmModeName(mode) {
    if (mode === "segmentation") return "段表映射";
    if (mode === "segmented-paging") return "段页式映射";
    return "页表映射";
  }

  function renderFrameSnapshot(snapshot) {
    return snapshot.map((page) => (page === null ? "-" : page)).join(" / ");
  }

  function describeFrameBadge(meta, policy, event, references) {
    if (meta.page === null) return "";
    if (policy === "fifo") return `装入于第 ${meta.loadedAt} 次访问`;
    if (policy === "lfu") return `已使用 ${meta.frequency} 次`;
    if (policy === "opt") {
      const nextUse = references.slice(event.index + 1).indexOf(meta.page);
      return nextUse === -1 ? "以后不再使用" : `下次使用：第 ${event.index + 1 + nextUse + 1} 次访问`;
    }
    return `上次使用：第 ${meta.lastUsed} 次访问`;
  }

  function renderFrameGrid(snapshot, activeFrame = null, options = null) {
    return `
      <div class="frame-grid">
        ${snapshot.map((page, frame) => {
          const meta = options && options.frameMeta ? options.frameMeta[frame] : null;
          const badge = meta ? describeFrameBadge(meta, options.policy, options.event, options.references) : "";
          return `
          <div class="frame-cell ${frame === activeFrame ? "current" : ""} ${page === null ? "empty" : "filled"}">
            <strong>页框 ${frame}</strong>
            <span>${page === null ? "空" : `页 ${page}`}</span>
            ${badge ? `<small class="frame-badge">${escapeHtml(badge)}</small>` : ""}
          </div>
        `;
        }).join("")}
      </div>
    `;
  }

  function renderVirtualStructureDiagram(result, selectedEvent = null) {
    if (result.mode === "segmentation") {
      const [segment, offset] = String(result.logicalAddress).split(":");
      return `
        <div class="mapping-diagram vm-diagram">
          <div class="diagram-title">
            <strong>段表映射结构图</strong>
            <span>逻辑地址由段号和段内偏移组成，先查段表，再做越界检查。</span>
          </div>
          <div class="diagram-flow">
            <div class="diagram-node source-node"><strong>逻辑地址</strong><span>段号 ${escapeHtml(segment)} / 偏移 ${escapeHtml(offset)}</span></div>
            <div class="diagram-arrow">→</div>
            <div class="diagram-node"><strong>段表</strong><span>查找段号对应的基址与段长</span></div>
            <div class="diagram-arrow">→</div>
            <div class="diagram-node"><strong>界限检查</strong><span>偏移必须小于段长</span></div>
            <div class="diagram-arrow">→</div>
            <div class="diagram-node ${result.valid ? "success" : "danger"}"><strong>${result.valid ? "物理地址" : "地址越界"}</strong><span>${result.valid ? result.physicalAddress : "触发保护异常"}</span></div>
          </div>
        </div>
      `;
    }

    if (result.mode === "segmented-paging") {
      const [segment, page, offset] = String(result.logicalAddress).split(":");
      return `
        <div class="mapping-diagram vm-diagram">
          <div class="diagram-title">
            <strong>段页式映射结构图</strong>
            <span>先用段号定位页表，再用页号查页框，最后拼接页内偏移。</span>
          </div>
          <div class="diagram-flow">
            <div class="diagram-node source-node"><strong>逻辑地址</strong><span>段 ${escapeHtml(segment)} / 页 ${escapeHtml(page)} / 偏移 ${escapeHtml(offset)}</span></div>
            <div class="diagram-arrow">→</div>
            <div class="diagram-node"><strong>段表</strong><span>选择段 ${escapeHtml(segment)} 的页表</span></div>
            <div class="diagram-arrow">→</div>
            <div class="diagram-node"><strong>页表</strong><span>页 ${escapeHtml(page)} → 页框</span></div>
            <div class="diagram-arrow">→</div>
            <div class="diagram-node success"><strong>物理地址</strong><span>${result.physicalAddress}</span></div>
          </div>
        </div>
      `;
    }

    return `
      <div class="mapping-diagram vm-diagram">
        <div class="diagram-title">
          <strong>页表映射结构图</strong>
          <span>页面访问先查页框；命中则直接访问，缺页则按置换算法装入页框。</span>
        </div>
        <div class="diagram-flow">
          <div class="diagram-node source-node"><strong>访问页</strong><span>页 ${selectedEvent ? selectedEvent.page : result.page}</span></div>
          <div class="diagram-arrow">→</div>
          <div class="diagram-node field-node">
            <strong>地址拆分</strong>
            ${(() => {
              const currentPage = selectedEvent ? selectedEvent.page : result.page;
              const maxPage = Math.max(result.page, ...result.replacement.references);
              const pageBits = Math.max(1, Math.ceil(Math.log2(maxPage + 1)));
              return renderBitFields([
                { label: "Page Number", bits: pageBits, className: "seg-tag", binary: formatBinary(currentPage, pageBits), hint: `页号 ${currentPage}（本例页号统一用 ${pageBits} 位表示）` },
                { label: "Page Offset", bits: Math.log2(result.pageSize), className: "seg-offset", hint: `页大小 ${result.pageSize}B` },
              ]);
            })()}
          </div>
          <div class="diagram-arrow">→</div>
          <div class="diagram-node"><strong>页表 / 页框</strong><span>${selectedEvent ? `页 ${selectedEvent.page} → 页框 ${selectedEvent.frame}` : result.residentFrame === null ? "页不在内存，触发缺页" : `页 ${result.page} → 页框 ${result.residentFrame}`}</span></div>
          <div class="diagram-arrow">→</div>
          <div class="diagram-node ${selectedEvent ? selectedEvent.hit ? "success" : "danger" : result.physicalAddress === null ? "danger" : "success"}"><strong>${selectedEvent ? selectedEvent.hit ? "命中" : "缺页" : result.physicalAddress === null ? "缺页" : "物理地址"}</strong><span>${selectedEvent ? selectedEvent.hit ? "直接访问" : selectedEvent.evicted === null ? "装入空页框" : `替换页 ${selectedEvent.evicted}` : result.physicalAddress === null ? "需要页面置换" : result.physicalAddress}</span></div>
        </div>
        <div class="diagram-callout">${selectedEvent ? `当前访问 ${selectedEvent.index + 1}：页 ${selectedEvent.page}，${selectedEvent.hit ? `命中页框 ${selectedEvent.frame}` : `缺页，装入页框 ${selectedEvent.frame}${selectedEvent.evicted === null ? "" : `，替换页 ${selectedEvent.evicted}`}`}。` : "页面访问序列会逐步改变物理页框中的页面。"}</div>
        ${selectedEvent && selectedEvent.victimReason ? `<div class="victim-reason">为什么换它？${escapeHtml(selectedEvent.victimReason)}</div>` : ""}
        ${renderFrameGrid(
          selectedEvent ? selectedEvent.snapshot : result.replacement.frames.map((frame) => frame.page),
          selectedEvent ? selectedEvent.frame : result.residentFrame,
          selectedEvent && selectedEvent.frameMeta
            ? { frameMeta: selectedEvent.frameMeta, policy: result.replacement.policy, event: selectedEvent, references: result.replacement.references }
            : null
        )}
      </div>
    `;
  }

  function renderVirtualProcessSteps(result, selectedEvent = null) {
    if (result.mode === "segmentation") {
      const [segment, offset] = String(result.logicalAddress).split(":");
      const entry = result.table.find((row) => String(row.segment) === String(segment));
      return `
        <div class="process-timeline">
          <div class="process-card ${result.valid ? "hit" : "miss"}">
            <div class="process-card-head"><strong>段表地址转换</strong><span>${result.valid ? "合法" : "越界"}</span></div>
            <ol>
              <li>拆分逻辑地址：段号 ${escapeHtml(segment)}，段内偏移 ${escapeHtml(offset)}。</li>
              <li>查段表：段 ${escapeHtml(segment)} 的基址为 ${entry ? entry.base : "-"}，段长为 ${entry ? entry.limit : "-"}。</li>
              <li>界限检查：${result.valid ? `偏移 ${escapeHtml(offset)} < 段长 ${entry.limit}，访问合法。` : `偏移 ${escapeHtml(offset)} 超出段长，访问越界。`}</li>
              <li>${escapeHtml(result.explanation)}</li>
            </ol>
          </div>
        </div>
      `;
    }

    if (result.mode === "segmented-paging") {
      const [segment, page, offset] = String(result.logicalAddress).split(":");
      const entry = result.table.find((row) => String(row.segment) === String(segment) && String(row.page) === String(page));
      return `
        <div class="process-timeline">
          <div class="process-card hit">
            <div class="process-card-head"><strong>段页式地址转换</strong><span>命中映射项</span></div>
            <ol>
              <li>拆分逻辑地址：段号 ${escapeHtml(segment)}，页号 ${escapeHtml(page)}，页内偏移 ${escapeHtml(offset)}。</li>
              <li>查段表：先定位段 ${escapeHtml(segment)} 对应的页表。</li>
              <li>查页表：页 ${escapeHtml(page)} 映射到页框 ${entry ? entry.frame : "-"}。</li>
              <li>${escapeHtml(result.explanation)}</li>
            </ol>
          </div>
        </div>
      `;
    }

    const replacementSteps = result.replacement.events.map((event) => ({
      title: `页 ${event.page} · ${event.hit ? "命中" : "缺页"}`,
      detail: event.hit ? `已在页框 ${event.frame}` : event.evicted === null ? `装入空页框 ${event.frame}` : `替换页 ${event.evicted}`,
      status: event.hit ? "hit" : "miss",
    }));
    const event = selectedEvent || result.replacement.events[0];
    return `
      <div class="process-timeline">
        <div class="process-card ${result.physicalAddress === null ? "miss" : "hit"}">
          <div class="process-card-head"><strong>当前逻辑地址转换</strong><span>${result.physicalAddress === null ? "缺页" : "可转换"}</span></div>
          <ol>
            <li>拆分逻辑地址：页号 ${result.page}，页内偏移 ${result.offset}，页大小 ${result.pageSize}B。</li>
            <li>${result.residentFrame === null ? `页 ${result.page} 当前不在物理页框中。` : `页 ${result.page} 当前在页框 ${result.residentFrame}。`}</li>
            <li>${escapeHtml(result.explanation)}</li>
          </ol>
        </div>
        <div class="teaching-split">
          ${renderLearningStepper(replacementSteps, event.index, "vm-access-rail")}
          <div class="process-card ${event.hit ? "hit" : "miss"}">
            <div class="process-card-head"><strong>页面访问 ${event.index + 1}：页 ${event.page}</strong><span>${event.hit ? "命中" : "缺页"}</span></div>
            <ol>
              <li>查页框：当前页框快照为 <code>${renderFrameSnapshot(event.snapshot)}</code>。</li>
              <li>${event.hit ? `页 ${event.page} 已在页框 ${event.frame}。` : `页 ${event.page} 不在内存，需要装入页框 ${event.frame}。`}</li>
              <li>状态更新：${escapeHtml(event.action)}</li>
            </ol>
          </div>
        </div>
      </div>
    `;
  }

  function renderVmReplacementTable(replacement, cursor) {
    const events = replacement.events;
    const cellClass = (index, extra = "") =>
      [index === cursor ? "current" : "", index > cursor ? "future" : "", extra].filter(Boolean).join(" ");
    const header = events
      .map((event, index) => `<th class="${cellClass(index)}">页 ${event.page}</th>`)
      .join("");
    const frameRows = Array.from({ length: replacement.frameCount }, (_, frame) => {
      const cells = events
        .map((event, index) => {
          const page = event.snapshot[frame];
          const changed = !event.hit && event.frame === frame ? "changed" : "";
          return `<td class="${cellClass(index, changed)}">${page === null ? "·" : page}</td>`;
        })
        .join("");
      return `<tr><th>页框 ${frame}</th>${cells}</tr>`;
    }).join("");
    const resultRow = events
      .map((event, index) => `<td class="${cellClass(index, event.hit ? "hit" : "miss")}">${event.hit ? "√" : "×"}</td>`)
      .join("");
    return `
      <div class="vm-summary-table">
        <div class="diagram-title">
          <strong>置换过程总表</strong>
          <span>每一列是一次访问后的页框内容；× 表示缺页，√ 表示命中</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>访问序列</th>${header}</tr></thead>
            <tbody>
              ${frameRows}
              <tr class="vm-result-row"><th>缺页?</th>${resultRow}</tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderVirtualMemory(result) {
    if (result.mode === "segmentation") {
      const counter = $("#vmStepCounter");
      if (counter) counter.textContent = "1 / 1";
      $("#vmResult").innerHTML = `
        <div class="${result.valid ? "status-good" : "status-error"}">${escapeHtml(result.explanation)}</div>
        ${renderVirtualStructureDiagram(result)}
      `;
      return;
    }

    if (result.mode === "segmented-paging") {
      const counter = $("#vmStepCounter");
      if (counter) counter.textContent = "1 / 1";
      $("#vmResult").innerHTML = `
        <div class="status-good">${escapeHtml(result.explanation)}</div>
        ${renderVirtualStructureDiagram(result)}
      `;
      return;
    }

    const replacement = result.replacement;
    const selectedEvent = replacement.events[clamp(state.vm.cursor, 0, replacement.events.length - 1)];
    const counter = $("#vmStepCounter");
    if (counter) counter.textContent = `页面访问 ${selectedEvent.index + 1} / ${replacement.events.length}`;
    const seen = replacement.events.slice(0, selectedEvent.index + 1);
    const faultsSoFar = seen.filter((event) => !event.hit).length;
    $("#vmResult").innerHTML = `
      <div class="${selectedEvent.hit ? "status-good" : "status-warn"}">
        当前访问页 ${selectedEvent.page}：${selectedEvent.hit ? `命中页框 ${selectedEvent.frame}` : `缺页，装入页框 ${selectedEvent.frame}${selectedEvent.evicted === null ? "" : `，替换页 ${selectedEvent.evicted}`}`}。
      </div>
      <div class="sim-stats">
        <span class="stat">进度 ${seen.length} / ${replacement.events.length}</span>
        <span class="stat hit">已命中 ${seen.length - faultsSoFar}</span>
        <span class="stat miss">已缺页 ${faultsSoFar}</span>
        <span class="stat">当前缺页率 ${seen.length ? Math.round((faultsSoFar / seen.length) * 100) : 0}%</span>
        <span class="stat total">全序列缺页率 ${Math.round(replacement.faultRate * 100)}%（缺页 ${replacement.faults} / 命中 ${replacement.hits}）</span>
      </div>
      ${renderVirtualStructureDiagram(result, selectedEvent)}
      ${renderVmReplacementTable(replacement, selectedEvent.index)}
    `;
  }

  function parseVmReferencePages(value) {
    const tokens = String(value || "").match(/[-+]?0x[0-9a-f]+|[-+]?0b[01]+|[-+]?\d+/gi) || [];
    return tokens
      .map((token) => {
        if (/^[-+]?0x/i.test(token)) {
          return Number.parseInt(token, 16);
        }
        if (/^[-+]?0b/i.test(token)) {
          const sign = token.startsWith("-") ? -1 : 1;
          return sign * Number.parseInt(token.replace(/^[-+]?0b/i, ""), 2);
        }
        return Number.parseInt(token, 10);
      })
      .filter((page) => Number.isInteger(page) && page >= 0);
  }

  function getDefaultVmLogicalAddress(mode, references) {
    if (mode === "segmentation") {
      return DEFAULT_VM_CONFIG.segmentLogicalAddress;
    }
    if (mode === "segmented-paging") {
      return DEFAULT_VM_CONFIG.segmentedPagingLogicalAddress;
    }
    const pages = parseVmReferencePages(references);
    const page = pages.length ? pages[pages.length - 1] : DEFAULT_VM_CONFIG.pagingFallbackPage;
    return page * DEFAULT_VM_CONFIG.pageSize;
  }

  function runVirtualMemory() {
    stopVirtualMemoryAuto();
    try {
      const mode = $("#vmMode").value;
      const references = $("#vmReferences").value;
      const result = core.simulateVirtualMemory({
        mode,
        logicalAddress: getDefaultVmLogicalAddress(mode, references),
        pageSize: DEFAULT_VM_CONFIG.pageSize,
        frames: DEFAULT_VM_CONFIG.frames,
        replacement: $("#vmReplacement").value,
        references,
        segmentTable: DEFAULT_VM_CONFIG.segmentTable,
        segmentPageTable: DEFAULT_VM_CONFIG.segmentPageTable,
      });
      state.vm.result = result;
      state.vm.cursor = 0;
      renderVirtualMemory(result);
    } catch (error) {
      state.vm.result = null;
      const counter = $("#vmStepCounter");
      if (counter) counter.textContent = "输入有误";
      $("#vmResult").innerHTML = `<div class="status-error">${escapeHtml(error.message)}</div>`;
    }
  }

  function stepVirtualMemory(delta) {
    if (!state.vm.result) {
      runVirtualMemory();
      return;
    }
    if (state.vm.result.mode !== "paging") {
      renderVirtualMemory(state.vm.result);
      return;
    }
    state.vm.cursor = clamp(state.vm.cursor + delta, 0, state.vm.result.replacement.events.length - 1);
    renderVirtualMemory(state.vm.result);
    if (state.vm.cursor >= state.vm.result.replacement.events.length - 1) stopVirtualMemoryAuto();
  }

  function resetVirtualMemory() {
    stopVirtualMemoryAuto();
    if (!state.vm.result) {
      runVirtualMemory();
      return;
    }
    state.vm.cursor = 0;
    renderVirtualMemory(state.vm.result);
  }

  function stopVirtualMemoryAuto() {
    stopStepTimer("vm", "#vmAuto", "一键演示");
  }

  function toggleVirtualMemoryAuto() {
    if (state.vm.timer) {
      stopVirtualMemoryAuto();
      return;
    }
    runVirtualMemory();
    if (!state.vm.result || state.vm.result.mode !== "paging" || state.vm.result.replacement.events.length <= 1) return;
    toggleStepTimer(
      "vm",
      "#vmAuto",
      "一键演示",
      "暂停演示",
      () => stepVirtualMemory(1),
      () => !state.vm.result || state.vm.result.mode !== "paging" || state.vm.cursor >= state.vm.result.replacement.events.length - 1
    );
    window.setTimeout(() => {
      if (state.vm.timer) stepVirtualMemory(1);
    }, 250);
  }

  function renderDatapathDiagram(frame) {
    const activeNodes = new Set(frame ? frame.activeNodes : []);
    const activeEdges = new Set(frame ? frame.activeEdges : []);
    const nodeClass = (id) => `datapath-node ${activeNodes.has(id) ? "active" : ""}`;
    const edgeClass = (id, variant = "") => `datapath-edge ${variant} ${activeEdges.has(id) ? "active" : ""}`;
    const values = frame ? frame.values : {};
    const activeMarker = (id) => (activeEdges.has(id) ? "url(#datapathArrowActive)" : "url(#datapathArrow)");
    const edge = (id, d, label, x, y, variant = "") => `
      <path class="${edgeClass(id, variant)}" d="${d}" marker-end="${activeMarker(id)}"></path>
      ${activeEdges.has(id) && label ? `<text class="datapath-edge-label" x="${x}" y="${y}">${label}</text>` : ""}
    `;
    const valueChip = (text, x, y) => text ? `<text class="datapath-value-chip" x="${x}" y="${y}">${escapeHtml(text)}</text>` : "";
    const stageIndex = { IF: 0, ID: 1, EX: 2, MEM: 3, WB: 4 }[frame ? frame.stage : ""] ?? -1;
    const registerText = [values.rs1 && `${values.rs1}=${values.rs1Value}`, values.rs2 && `${values.rs2}=${values.rs2Value}`].filter(Boolean).join(" / ");
    const memoryText = stageIndex >= 3 && values.memoryData !== undefined
      ? `读出 ${values.memoryData}`
      : stageIndex >= 3 && values.memoryWriteData !== undefined
        ? `写入 ${values.memoryWriteData}`
        : "";
    const writeBackText = stageIndex >= 4 && values.writeBackRegister ? `${values.writeBackRegister} <- ${values.writeBackValue}` : "";
    return `
      <svg class="datapath-svg" viewBox="0 0 1440 590" role="img" aria-label="CPU 数据通路">
        <defs>
          <marker id="datapathArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path class="datapath-arrow" d="M 0 0 L 10 5 L 0 10 z"></path>
          </marker>
          <marker id="datapathArrowActive" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
            <path class="datapath-arrow active" d="M 0 0 L 10 5 L 0 10 z"></path>
          </marker>
        </defs>

        <rect class="datapath-stage-band" x="18" y="18" width="270" height="540"></rect>
        <rect class="datapath-stage-band" x="308" y="18" width="330" height="540"></rect>
        <rect class="datapath-stage-band" x="658" y="18" width="290" height="540"></rect>
        <rect class="datapath-stage-band" x="968" y="18" width="240" height="540"></rect>
        <rect class="datapath-stage-band" x="1228" y="18" width="194" height="540"></rect>
        <text class="datapath-stage-title" x="153" y="44">IF 取指</text>
        <text class="datapath-stage-title" x="473" y="44">ID 译码</text>
        <text class="datapath-stage-title" x="803" y="44">EX 执行</text>
        <text class="datapath-stage-title" x="1088" y="44">MEM 访存</text>
        <text class="datapath-stage-title" x="1325" y="44">WB 写回</text>

        ${edge("pc-imem", "M156 172 L175 172", "PC地址", 166, 158)}
        ${edge("pc-pcadd", "M110 206 L110 328", "PC", 123, 268)}
        ${edge("pcadd-pc", "M164 358 C240 424 40 424 64 172", "PC+4", 126, 410)}
        ${edge("imem-control", "M283 140 L431 98", "操作码", 356, 105, "control")}
        ${edge("imem-regfile", "M283 188 L365 188 L365 236 L383 236", "rs/rd", 356, 204)}
        ${edge("imem-immgen", "M283 210 L353 210 L353 382 L383 382", "立即数字段", 348, 292)}
        ${edge("control-regfile", "M460 132 L460 194", "读写控制", 476, 165, "control")}
        ${edge("control-dmem", "M525 100 C780 90 1010 130 1087 194", "访存控制", 825, 98, "control")}
        ${edge("regfile-alu-a", "M527 230 L790 230", "A", 655, 216)}
        ${edge("regfile-alu-b", "M527 270 L790 270", "B", 655, 293)}
        ${edge("immgen-alumux", "M527 382 L698 382", "Imm", 612, 368)}
        ${edge("alumux-alu-b", "M768 388 L798 294", "ALUSrc", 778, 340)}
        ${edge("alu-dmem", "M890 260 L1033 260", "地址/结果", 960, 246)}
        ${edge("regfile-dmem", "M527 294 C700 510 1045 492 1087 314", "写数据", 820, 500)}
        ${edge("alu-wbmux", "M866 320 C980 430 1260 420 1290 358", "ALU结果", 1080, 421)}
        ${edge("dmem-wbmux", "M1087 314 L1290 334", "读出数据", 1184, 314)}
        ${edge("wbmux-regfile", "M1360 350 C1440 540 440 540 451 298", "写回", 900, 540)}

        <g class="${nodeClass("pc")}" transform="translate(64 142)">
          <rect width="92" height="64"></rect>
          <text x="46" y="27">PC</text>
          <text class="datapath-node-subtitle" x="46" y="47">程序计数器</text>
        </g>
        <g class="${nodeClass("pcAdd")}" transform="translate(68 328)">
          <rect width="96" height="60"></rect>
          <text x="48" y="25">PC + 4</text>
          <text class="datapath-node-subtitle" x="48" y="45">下一条</text>
        </g>
        <g class="${nodeClass("imem")}" transform="translate(175 128)">
          <rect width="108" height="104"></rect>
          <text x="54" y="38">Instruction</text>
          <text x="54" y="61">Memory</text>
          <text class="datapath-node-subtitle" x="54" y="82">取出指令</text>
        </g>
        <g class="${nodeClass("control")}" transform="translate(395 68)">
          <rect width="130" height="64"></rect>
          <text x="65" y="27">Control</text>
          <text x="65" y="46">Unit</text>
        </g>
        <g class="${nodeClass("regfile")}" transform="translate(383 194)">
          <rect width="144" height="108"></rect>
          <text x="72" y="43">Register</text>
          <text x="72" y="66">File</text>
          <text class="datapath-node-subtitle" x="72" y="87">读寄存器</text>
        </g>
        <g class="${nodeClass("immgen")}" transform="translate(383 358)">
          <rect width="144" height="60"></rect>
          <text x="72" y="26">ImmGen</text>
          <text class="datapath-node-subtitle" x="72" y="46">立即数扩展</text>
        </g>
        <g class="${nodeClass("aluMux")}" transform="translate(698 340)">
          <polygon points="0,0 70,20 70,76 0,96"></polygon>
          <text x="35" y="43">MUX</text>
          <text class="datapath-node-subtitle" x="35" y="63">ALUSrc</text>
        </g>
        <g class="${nodeClass("alu")}" transform="translate(790 198)">
          <polygon points="0,0 100,34 100,104 0,138 22,88 22,50"></polygon>
          <text x="55" y="63">ALU</text>
          <text class="datapath-node-subtitle" x="55" y="86">运算/地址</text>
        </g>
        <g class="${nodeClass("dmem")}" transform="translate(1033 194)">
          <rect width="108" height="128"></rect>
          <text x="54" y="50">Data</text>
          <text x="54" y="73">Memory</text>
          <text class="datapath-node-subtitle" x="54" y="96">读/写数据</text>
        </g>
        <g class="${nodeClass("wbMux")}" transform="translate(1290 302)">
          <polygon points="0,0 70,20 70,80 0,100"></polygon>
          <text x="35" y="44">WB</text>
          <text x="35" y="63">MUX</text>
        </g>

        ${valueChip(stageIndex >= 0 && values.pc !== undefined ? `PC=${values.pc}` : "", 110, 126)}
        ${valueChip(stageIndex >= 0 && values.instruction ? values.instruction : "", 229, 114)}
        ${valueChip(stageIndex >= 1 ? registerText : "", 455, 332)}
        ${valueChip(stageIndex >= 1 && values.imm !== undefined ? `imm=${values.imm}` : "", 455, 442)}
        ${valueChip(stageIndex >= 2 && values.aluResult !== undefined ? `ALU=${values.aluResult}` : "", 840, 182)}
        ${valueChip(memoryText, 1087, 350)}
        ${valueChip(writeBackText, 1325, 430)}
      </svg>
    `;
  }

  const DATAPATH_SIGNAL_INFO = {
    RegWrite: {
      label: "寄存器写使能",
      base: "控制寄存器堆的写端口。",
      valueText: (value) => String(value) === "1"
        ? "当前为 1：WB 阶段会把运算结果或内存读出值写入目标寄存器 rd。"
        : "当前为 0：本条指令不会改写寄存器堆。",
    },
    ALUSrc: {
      label: "ALU 第二操作数选择",
      base: "控制 ALU 的 B 输入来自寄存器还是立即数。",
      valueText: (value) => String(value) === "1"
        ? "当前为 1：ALU B 端选择立即数或访存偏移量。"
        : "当前为 0：ALU B 端选择寄存器 rs2 的读出值。",
    },
    MemRead: {
      label: "数据存储器读使能",
      base: "控制 MEM 阶段是否从数据存储器读数据。",
      valueText: (value) => String(value) === "1"
        ? "当前为 1：执行 load 类访存读操作。"
        : "当前为 0：本阶段不读取数据存储器。",
    },
    MemWrite: {
      label: "数据存储器写使能",
      base: "控制 MEM 阶段是否向数据存储器写数据。",
      valueText: (value) => String(value) === "1"
        ? "当前为 1：执行 store 类访存写操作。"
        : "当前为 0：本阶段不写数据存储器。",
    },
    MemToReg: {
      label: "写回数据来源选择",
      base: "控制 WB 阶段写回寄存器的数据来自哪里。",
      valueText: (value) => {
        if (String(value) === "1") return "当前为 1：写回数据选择内存读出值，典型对应 lw。";
        if (String(value) === "X") return "当前为 X：store 指令不写回寄存器，所以该选择无关。";
        return "当前为 0：写回数据选择 ALU 结果。";
      },
    },
    Branch: {
      label: "分支控制",
      base: "控制下一条 PC 是否可能由分支目标地址决定。",
      valueText: (value) => String(value) === "1"
        ? "当前为 1：需要结合比较结果决定是否改变 PC。"
        : "当前为 0：PC 按顺序流向 PC+4。",
    },
    ALUOp: {
      label: "ALU 运算类型",
      base: "告诉 ALU 当前应该执行哪一种运算。",
      valueText: (value) => value === "-"
        ? "当前无特定 ALU 运算。"
        : `当前执行 ${value}，用于算术结果、地址计算或数据传递。`,
    },
  };

  function renderDatapathSignals(signals) {
    return `
      <div class="datapath-signal-list">
        ${Object.entries(signals)
          .map(([name, value]) => {
            const info = DATAPATH_SIGNAL_INFO[name] || {
              label: "控制信号",
              base: "控制 CPU 数据通路中的某个选择或写使能。",
              valueText: () => `当前值为 ${value}。`,
            };
            return `
              <div class="datapath-signal-card">
                <div class="datapath-signal-head">
                  <div>
                    <strong>${escapeHtml(name)}</strong>
                    <span>${escapeHtml(info.label)}</span>
                  </div>
                  <code>${escapeHtml(value)}</code>
                </div>
                <p>${escapeHtml(info.base)}${escapeHtml(info.valueText(value))}</p>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderDatapathValues(frame) {
    const values = frame.values;
    const stageIndex = { IF: 0, ID: 1, EX: 2, MEM: 3, WB: 4 }[frame.stage] ?? 0;
    const labels = {
      pc: "PC",
      pcNext: "PC + 4",
      instruction: "Instruction",
      op: "Opcode",
      rs1: "rs1",
      rs1Value: "rs1 value",
      rs2: "rs2",
      rs2Value: "rs2 value",
      rd: "rd",
      imm: "Immediate",
      aluInputA: "ALU A",
      aluInputB: "ALU B",
      aluResult: "ALU Result",
      memoryAddress: "Memory Address",
      memoryData: "Memory Read Data",
      memoryWriteData: "Memory Write Data",
      writeBackRegister: "Write Register",
      writeBackValue: "Write Value",
    };
    const keysByStage = [
      ["pc", "pcNext", "instruction"],
      ["pc", "pcNext", "instruction", "op", "rs1", "rs1Value", "rs2", "rs2Value", "rd", "imm"],
      ["pc", "pcNext", "instruction", "op", "rs1", "rs1Value", "rs2", "rs2Value", "rd", "imm", "aluInputA", "aluInputB", "aluResult"],
      ["pc", "pcNext", "instruction", "op", "memoryAddress", "memoryData", "memoryWriteData", "aluResult"],
      ["pc", "pcNext", "instruction", "op", "writeBackRegister", "writeBackValue"],
    ];
    const rows = keysByStage[stageIndex]
      .filter((key) => values[key] !== undefined && values[key] !== null)
      .map((key) => `<tr><th>${labels[key]}</th><td><code>${escapeHtml(values[key])}</code></td></tr>`)
      .join("");
    return `<div class="table-wrap"><table><tbody>${rows}</tbody></table></div>`;
  }

  function renderDatapathInstructionList(result, frame) {
    return result.instructions
      .map((instruction) => {
        const className = instruction.index === frame.instructionIndex ? "datapath-instruction active" : "datapath-instruction";
        const badge = instruction.changedRegisters.length
          ? instruction.changedRegisters.map(escapeHtml).join(", ")
          : instruction.changedMemory.length
            ? `M[${instruction.changedMemory.map(escapeHtml).join(", ")}]`
            : "-";
        return `
          <div class="${className}">
            <code>${instruction.address}: ${escapeHtml(instruction.raw)}</code>
            <span>${badge}</span>
          </div>
        `;
      })
      .join("");
  }

  function renderDatapathState(frame) {
    const baseRegisters = Array.from({ length: 8 }, (_, index) => `x${index}`);
    const extra = frame.values.writeBackRegister && !baseRegisters.includes(frame.values.writeBackRegister) ? [frame.values.writeBackRegister] : [];
    const visibleRegisters = [...baseRegisters, ...extra];
    $("#datapathRegisterView").innerHTML = visibleRegisters
      .map((name) => {
        const className = frame.changedRegisters.includes(name) ? "register-cell changed" : "register-cell";
        return `
          <div class="${className}">
            <strong>${escapeHtml(name)}</strong>
            <span>${escapeHtml(frame.registers[name] || 0)}</span>
          </div>
        `;
      })
      .join("");

    const entries = Object.entries(frame.memory);
    $("#datapathMemoryView").innerHTML = entries.length
      ? entries
          .map(([address, value]) => {
            const className = frame.changedMemory.map(String).includes(String(address)) ? "memory-item changed" : "memory-item";
            return `<div class="${className}"><span>M[${escapeHtml(address)}]</span><strong>${escapeHtml(value)}</strong></div>`;
          })
          .join("")
      : `<div class="empty-state">暂无内存写入。</div>`;
  }

  function renderDatapath() {
    const result = state.datapath.result;
    if (!result || !result.frames.length) {
      $("#datapathStepCounter").textContent = "等待执行";
      $("#datapathDiagram").innerHTML = renderDatapathDiagram(null);
      $("#datapathInstructionList").innerHTML = `<div class="empty-state">点击解析执行后查看指令列表。</div>`;
      $("#datapathControlSignals").innerHTML = `<div class="empty-state">暂无控制信号。</div>`;
      $("#datapathValues").innerHTML = `<div class="empty-state">暂无数据值。</div>`;
      $("#datapathExplanation").innerHTML = `<div class="empty-state">暂无阶段解释。</div>`;
      $("#datapathRegisterView").innerHTML = "";
      $("#datapathMemoryView").innerHTML = "";
      return;
    }

    const frame = result.frames[state.datapath.cursor];
    $("#datapathStepCounter").textContent = `指令 ${frame.instructionIndex + 1}/${frame.instructionCount} · ${frame.stage} ${frame.stageName} · ${state.datapath.cursor + 1}/${result.frames.length}`;
    $("#datapathDiagram").innerHTML = renderDatapathDiagram(frame);
    $("#datapathInstructionList").innerHTML = renderDatapathInstructionList(result, frame);
    $("#datapathControlSignals").innerHTML = renderDatapathSignals(frame.controlSignals);
    $("#datapathValues").innerHTML = renderDatapathValues(frame);
    $("#datapathExplanation").innerHTML = `<div class="${frame.error ? "status-error" : "status-good"}">${escapeHtml(frame.explanation)}</div>`;
    renderDatapathState(frame);
  }

  function stopDatapathAuto() {
    if (state.datapath.timer) {
      window.clearInterval(state.datapath.timer);
      state.datapath.timer = null;
    }
    const button = $("#datapathAuto");
    if (button) button.textContent = "自动演示";
  }

  function runDatapath() {
    stopDatapathAuto();
    try {
      const result = core.simulateDatapath($("#datapathCode").value);
      state.datapath.result = result;
      state.datapath.cursor = 0;
      renderDatapath();
    } catch (error) {
      $("#datapathExplanation").innerHTML = `<div class="status-error">${escapeHtml(error.message)}</div>`;
    }
  }

  function stepDatapath(delta) {
    if (!state.datapath.result) {
      runDatapath();
      return;
    }
    const max = state.datapath.result.frames.length - 1;
    state.datapath.cursor = Math.max(0, Math.min(max, state.datapath.cursor + delta));
    renderDatapath();
    if (state.datapath.cursor === max) stopDatapathAuto();
  }

  function resetDatapath() {
    stopDatapathAuto();
    state.datapath.cursor = 0;
    renderDatapath();
  }

  function toggleDatapathAuto() {
    if (state.datapath.timer) {
      stopDatapathAuto();
      return;
    }
    if (!state.datapath.result) runDatapath();
    $("#datapathAuto").textContent = "暂停演示";
    state.datapath.timer = window.setInterval(() => {
      stepDatapath(1);
    }, 900);
  }

  function renderPipeline(result) {
    if (!result.timeline.length) {
      $("#pipelineResult").innerHTML = `<div class="empty-state">请输入至少一条指令。</div>`;
      return;
    }

    const cursor = clamp(state.pipeline.cursor, 0, result.cycleCount - 1);
    const counter = $("#pipelineStepCounter");
    if (counter) counter.textContent = `周期 C${cursor + 1} / C${result.cycleCount}`;
    const header = Array.from({ length: result.cycleCount }, (_, index) =>
      `<th class="${index === cursor ? "current-cycle" : index > cursor ? "pending" : ""}">C${index + 1}</th>`).join("");
    const body = result.timeline
      .map((row) => {
        return `
          <tr>
            <td><code>${escapeHtml(row.instruction)}</code></td>
            ${row.cells
              .map((cell, index) => {
                if (index > cursor) {
                  return `<td class="stage-cell pending"></td>`;
                }
                const className = [
                  cell === "STALL" ? "stage-cell stall" : cell ? "stage-cell filled" : "stage-cell",
                  index === cursor ? "current-cycle" : "",
                ].filter(Boolean).join(" ");
                return `<td class="${className}">${escapeHtml(cell)}</td>`;
              })
              .join("")}
          </tr>
        `;
      })
      .join("");
    const hazards = result.hazards.length
      ? result.hazards
          .map((hazard) => `<div class="status-warn">${escapeHtml(hazard.type)}（${escapeHtml(hazard.dependsOn)} → ${escapeHtml(hazard.instruction)}）：${escapeHtml(hazard.description)}</div>`)
          .join("")
      : `<div class="status-good">未发现需要停顿的相邻 RAW 冒险。</div>`;

    const instructionCount = result.timeline.length;
    const stallCount = result.timeline.reduce((sum, row) => sum + row.stall, 0);
    const idealCycles = instructionCount + 4;
    const other = core.simulatePipeline($("#pipelineCode").value, { forwarding: !result.forwarding });
    const compareText = result.forwarding
      ? `关闭转发则需要 ${other.cycleCount} 周期`
      : `开启转发可减少到 ${other.cycleCount} 周期`;

    $("#pipelineResult").innerHTML = `
      <div class="sim-stats">
        <span class="stat">指令 ${instructionCount} 条</span>
        <span class="stat">实际 ${result.cycleCount} 周期</span>
        <span class="stat ${stallCount ? "miss" : "hit"}">停顿 ${stallCount} 个</span>
        <span class="stat">无冒险理想 ${idealCycles} 周期</span>
        <span class="stat total">${compareText}</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>指令</th>
              ${header}
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      <div style="display: grid; gap: 8px; margin-top: 12px;">${hazards}</div>
    `;
  }

  function runPipeline() {
    stopPipelineAuto();
    const result = core.simulatePipeline($("#pipelineCode").value, {
      forwarding: $("#pipelineForwarding").checked,
    });
    state.pipeline.result = result;
    state.pipeline.cursor = 0;
    renderPipeline(result);
  }

  function stepPipeline(delta) {
    if (!state.pipeline.result) {
      runPipeline();
      return;
    }
    stopPipelineAuto();
    state.pipeline.cursor = clamp(state.pipeline.cursor + delta, 0, state.pipeline.result.cycleCount - 1);
    renderPipeline(state.pipeline.result);
  }

  function stopPipelineAuto() {
    stopStepTimer("pipeline", "#pipelineAuto", "自动演示");
  }

  function togglePipelineAuto() {
    if (state.pipeline.timer) {
      stopPipelineAuto();
      return;
    }
    if (!state.pipeline.result) {
      runPipeline();
    }
    const result = state.pipeline.result;
    if (!result || result.cycleCount <= 1) return;
    if (state.pipeline.cursor >= result.cycleCount - 1) {
      state.pipeline.cursor = 0;
      renderPipeline(result);
    }
    toggleStepTimer(
      "pipeline",
      "#pipelineAuto",
      "自动演示",
      "暂停",
      () => {
        state.pipeline.cursor = clamp(state.pipeline.cursor + 1, 0, result.cycleCount - 1);
        renderPipeline(result);
      },
      () => !state.pipeline.result || state.pipeline.cursor >= state.pipeline.result.cycleCount - 1
    );
  }

  function computeAssemblySnapshot(cursor) {
    const registers = {};
    for (let index = 0; index < 32; index += 1) registers[`x${index}`] = 0;
    for (let index = 0; index < 16; index += 1) registers[`R${index}`] = 0;
    const memory = {};
    const changed = new Set();

    if (!state.assembly.execution) {
      return { registers, memory, changed };
    }

    state.assembly.execution.steps.slice(0, cursor + 1).forEach((step) => {
      Object.entries(step.registerDiff).forEach(([name, diff]) => {
        registers[name] = diff.after;
      });
      Object.entries(step.memoryDiff).forEach(([address, diff]) => {
        memory[address] = diff.after;
      });
    });

    const activeStep = state.assembly.execution.steps[cursor];
    if (activeStep) {
      Object.keys(activeStep.registerDiff).forEach((name) => changed.add(name));
    }
    registers.x0 = 0;
    return { registers, memory, changed };
  }

  function renderAssembly() {
    const execution = state.assembly.execution;
    const cursor = state.assembly.cursor;
    const snapshot = computeAssemblySnapshot(cursor);
    const steps = execution ? execution.steps : [];
    $("#assemblyCursor").textContent = steps.length
      ? cursor < 0
        ? `未开始（共 ${steps.length} 步）`
        : `第 ${cursor + 1} / ${steps.length} 步`
      : "未执行";

    $("#assemblyLog").innerHTML = steps.length
      ? cursor < 0
        ? `<div class="empty-state">已加载 ${steps.length} 条指令，点击“下一步”开始逐条执行。</div>`
        : steps
          .slice(0, cursor + 1)
          .map((step, index) => {
            const className = ["log-item", index === cursor ? "active" : "", step.error ? "error" : ""].filter(Boolean).join(" ");
            const diffs = Object.entries(step.registerDiff)
              .map(([name, diff]) => `${name}: ${diff.before} -> ${diff.after}`)
              .join("，");
            const memoryDiffs = Object.entries(step.memoryDiff)
              .map(([address, diff]) => `M[${address}]: ${diff.before} -> ${diff.after}`)
              .join("，");
            return `
              <div class="${className}">
                <code>PC ${step.pcBefore}: ${escapeHtml(step.raw)}</code>
                <div>${escapeHtml(step.explanation)}</div>
                ${diffs ? `<div>寄存器：${escapeHtml(diffs)}</div>` : ""}
                ${memoryDiffs ? `<div>内存：${escapeHtml(memoryDiffs)}</div>` : ""}
              </div>
            `;
          })
          .join("")
      : `<div class="empty-state">点击“解析执行”后查看逐步解释。</div>`;

    const visibleRegisters = [
      ...Array.from({ length: 8 }, (_, index) => `x${index}`),
      ...Array.from({ length: 8 }, (_, index) => `R${index}`),
    ];
    $("#registerView").innerHTML = visibleRegisters
      .map((name) => {
        const className = snapshot.changed.has(name) ? "register-cell changed" : "register-cell";
        return `
          <div class="${className}">
            <strong>${name}</strong>
            <span>${snapshot.registers[name] || 0}</span>
          </div>
        `;
      })
      .join("");

    const memoryEntries = Object.entries(snapshot.memory);
    $("#memoryView").innerHTML = memoryEntries.length
      ? memoryEntries
          .map(([address, value]) => `<div class="memory-item"><span>M[${escapeHtml(address)}]</span><strong>${escapeHtml(value)}</strong></div>`)
          .join("")
      : `<div class="empty-state">暂无内存写入。</div>`;
  }

  function loadAssembly() {
    state.assembly.execution = core.executeAssembly($("#assemblyCode").value);
    state.assembly.cursor = -1;
    renderAssembly();
  }

  function stepAssembly(delta) {
    const execution = state.assembly.execution;
    if (!execution) {
      loadAssembly();
      return;
    }
    const next = state.assembly.cursor + delta;
    state.assembly.cursor = Math.max(-1, Math.min(execution.steps.length - 1, next));
    renderAssembly();
  }

  function resetAssembly() {
    state.assembly.cursor = -1;
    renderAssembly();
  }

  function stopStepTimer(stateKey, buttonSelector, idleText) {
    const item = state[stateKey];
    if (item && item.timer) {
      window.clearInterval(item.timer);
      item.timer = null;
    }
    const button = $(buttonSelector);
    if (button) button.textContent = idleText;
  }

  function toggleStepTimer(stateKey, buttonSelector, idleText, activeText, stepForward, isDone) {
    const item = state[stateKey];
    if (!item) return;
    if (item.timer) {
      stopStepTimer(stateKey, buttonSelector, idleText);
      return;
    }
    const button = $(buttonSelector);
    if (button) button.textContent = activeText;
    item.timer = window.setInterval(() => {
      if (isDone()) {
        stopStepTimer(stateKey, buttonSelector, idleText);
        return;
      }
      stepForward();
    }, 900);
  }

  function normalizeRegisterLabel(value, fallback) {
    const text = String(value || fallback).trim().toUpperCase();
    if (!/^[RX][0-9A-Z]+$/.test(text)) {
      throw new Error("寄存器名建议使用 R1、R2、X1 这类格式");
    }
    return text;
  }

  function readHardwireConfig() {
    const op = $("#hardwireOp").value;
    const pc = parseMemoryInteger($("#hardwirePC").value, "PC 初值");
    const dest = normalizeRegisterLabel($("#hardwireDest").value, "R1");
    const source = normalizeRegisterLabel($("#hardwireSource").value, "R2");
    const destValue = parseMemoryInteger($("#hardwireDestValue").value, "目的寄存器初值");
    const sourceValue = parseMemoryInteger($("#hardwireSourceValue").value, "源寄存器 / 主存值");
    const address = parseMemoryInteger($("#hardwireAddress").value, "访存地址");
    const bits = parsePositiveInteger($("#hardwireBits").value, "标志位位宽", 16);
    if (bits < 2) throw new Error("标志位位宽至少为 2");

    let rawResult = sourceValue;
    if (op === "ADD") rawResult = destValue + sourceValue;
    if (op === "SUB") rawResult = destValue - sourceValue;
    if (op === "MOV") rawResult = sourceValue;
    const unsignedMask = 2 ** bits - 1;
    const unsignedResult = rawResult & unsignedMask;
    const signLimit = 2 ** (bits - 1);
    const signedResult = unsignedResult >= signLimit ? unsignedResult - 2 ** bits : unsignedResult;
    const overflow = rawResult < -signLimit || rawResult > signLimit - 1;
    const carry = op === "ADD" ? destValue + sourceValue > unsignedMask : op === "SUB" ? destValue < sourceValue : false;
    const instruction = op === "LOAD" ? `${op} ${dest}, [${formatAddress(address)}]` : `${op} ${dest}, ${source}`;
    return {
      op,
      pc,
      dest,
      source,
      destValue,
      sourceValue,
      address,
      bits,
      instruction,
      rawResult,
      resultValue: signedResult,
      resultBinary: formatBinary(unsignedResult, bits),
      flags: {
        Z: signedResult === 0 ? 1 : 0,
        C: carry ? 1 : 0,
        V: overflow ? 1 : 0,
      },
    };
  }

  function hardwireState(config, patch = {}) {
    return {
      PC: String(config.pc),
      MAR: "—",
      MDR: "—",
      IR: "—",
      [config.dest]: String(config.destValue),
      [config.source]: config.op === "LOAD" ? String(config.sourceValue) : String(config.sourceValue),
      ALU: "—",
      Z: "—",
      C: "—",
      V: "—",
      ...patch,
    };
  }

  function createHardwireSteps(config) {
    const isLoad = config.op === "LOAD";
    const operationText = {
      ADD: `${config.destValue} + ${config.sourceValue}`,
      SUB: `${config.destValue} - ${config.sourceValue}`,
      MOV: `${config.source} 的值 ${config.sourceValue}`,
      LOAD: `M[${formatAddress(config.address)}] 的值 ${config.sourceValue}`,
    }[config.op];
    const imName = `Im_${config.op}`;
    return [
      {
        title: "准备：装入初始状态",
        detail: `主存 ${config.pc} 处存放指令 ${config.instruction}，目标是让 ${config.dest} 得到 ${operationText}。`,
        active: ["clock"],
        signals: ["ClockEnable"],
        inputs: "尚未译码，等待 T0。",
        formula: "C = f(Im, Bj, Mi, Tk)",
        state: hardwireState(config),
      },
      {
        title: "T0：PC 输出到 MAR",
        detail: `时序 T0 有效，控制器产生 PCout 与 MARin，取指地址 ${config.pc} 被送入 MAR。`,
        active: ["timing", "logic", "datapath", "memory"],
        signals: ["PCout", "MARin"],
        inputs: "Tk=T0，Im 尚未知，状态反馈暂不参与。",
        formula: "PCout = T0；MARin = T0",
        state: hardwireState(config, { MAR: String(config.pc) }),
      },
      {
        title: "T1：读取指令",
        detail: `控制信号 MemRead 与 MDRin 有效，主存把 ${config.instruction} 送入 MDR，PC 准备顺序加 1。`,
        active: ["timing", "logic", "memory", "datapath"],
        signals: ["MemRead", "MDRin", "PC+1"],
        inputs: "Tk=T1，取指周期 M1 有效。",
        formula: "MemRead = M1；MDRin = T1",
        state: hardwireState(config, { MAR: String(config.pc), MDR: config.instruction, PC: String(config.pc + 1) }),
      },
      {
        title: "T2：MDR 装入 IR",
        detail: "MDRout 与 IRin 有效，当前指令被锁存在 IR 中，后续可由操作码译码器识别。",
        active: ["timing", "logic", "ir", "datapath"],
        signals: ["MDRout", "IRin"],
        inputs: "Tk=T2，IR 准备接收指令字。",
        formula: "IRin = T2",
        state: hardwireState(config, { PC: String(config.pc + 1), MAR: String(config.pc), MDR: config.instruction, IR: config.instruction }),
      },
      {
        title: `T3：译码得到 ${imName}=1`,
        detail: `操作码译码器识别出 ${config.op} 指令，向控制信号形成部件输出 ${imName}=1。`,
        active: ["timing", "ir", "decoder", "logic"],
        signals: ["Decode", imName],
        inputs: `Im=${imName}=1；Bj 暂不参与；Tk=T3。`,
        formula: `${imName} = Decoder(IR.opcode)`,
        state: hardwireState(config, { PC: String(config.pc + 1), MAR: String(config.pc), MDR: config.instruction, IR: config.instruction }),
      },
      {
        title: isLoad ? "T4：形成有效地址" : "T4：选通操作数",
        detail: isLoad
          ? `控制器选通地址字段，把 ${formatAddress(config.address)} 送入地址通路，为读取数据做准备。`
          : `${config.dest} 与 ${config.source} 被选通到内部总线，操作数 ${config.destValue} 和 ${config.sourceValue} 进入执行部件。`,
        active: ["timing", "decoder", "logic", "datapath", isLoad ? "memory" : "alu"],
        signals: isLoad ? ["AddressOut", "MARin", "RD(D)"] : [`${config.dest}out`, `${config.source}out`, "Ain", "Bin"],
        inputs: `Im=${imName}=1；Tk=T4。`,
        formula: isLoad ? `RD(D) = ${imName} · T4` : `OperandSelect = ${imName} · T4`,
        state: hardwireState(config, {
          PC: String(config.pc + 1),
          MAR: isLoad ? formatAddress(config.address) : String(config.pc),
          MDR: config.instruction,
          IR: config.instruction,
          ALU: isLoad ? "地址就绪" : `A=${config.destValue}, B=${config.sourceValue}`,
        }),
      },
      {
        title: isLoad ? "T5：数据存储器返回数据" : "T5：执行部件产生结果与标志",
        detail: isLoad
          ? `数据存储器把 ${formatAddress(config.address)} 中的数据 ${config.sourceValue} 返回到 MDR。`
          : `执行 ${operationText}，得到 ${config.rawResult}；按 ${config.bits} 位机器结果为 ${config.resultValue}，标志 Z=${config.flags.Z}、C=${config.flags.C}、V=${config.flags.V}。`,
        active: ["timing", "decoder", "logic", "alu", "flags", isLoad ? "memory" : "datapath"],
        signals: isLoad ? ["MemRead", "MDRin"] : [`ALU_${config.op}`, "FlagWrite"],
        inputs: `Im=${imName}=1；Tk=T5；Bj 将由执行部件反馈。`,
        formula: isLoad ? `MDRin = ${imName} · T5` : `ALU_${config.op} = ${imName} · T5`,
        state: hardwireState(config, {
          PC: String(config.pc + 1),
          MAR: isLoad ? formatAddress(config.address) : String(config.pc),
          MDR: isLoad ? String(config.sourceValue) : config.instruction,
          IR: config.instruction,
          ALU: isLoad ? "—" : `${config.rawResult} → ${config.resultBinary}`,
          Z: String(config.flags.Z),
          C: String(config.flags.C),
          V: String(config.flags.V),
        }),
      },
      {
        title: `T6：结果写回 ${config.dest}`,
        detail: `${config.dest}in 有效，${config.op} 的结果 ${config.resultValue} 写回 ${config.dest}，本条指令执行完成。`,
        active: ["timing", "decoder", "logic", "datapath", "flags"],
        signals: [`${config.dest}in`, "CycleEnd"],
        inputs: `Im=${imName}=1；Tk=T6；写回控制信号有效。`,
        formula: `${config.dest}in = ${imName} · T6`,
        state: hardwireState(config, {
          PC: String(config.pc + 1),
          MAR: isLoad ? formatAddress(config.address) : String(config.pc),
          MDR: isLoad ? String(config.sourceValue) : config.instruction,
          IR: config.instruction,
          [config.dest]: String(config.resultValue),
          ALU: isLoad ? "—" : `${config.rawResult} → ${config.resultBinary}`,
          Z: String(config.flags.Z),
          C: String(config.flags.C),
          V: String(config.flags.V),
        }),
      },
    ];
  }

  function runHardwireSimulation() {
    stopStepTimer("hardwire", "#hardwireAuto", "自动演示");
    try {
      const config = readHardwireConfig();
      state.hardwire.result = {
        config,
        steps: createHardwireSteps(config),
      };
      state.hardwire.cursor = 0;
      renderHardwireSimulation();
    } catch (error) {
      state.hardwire.result = null;
      $("#hardwireStepCounter").textContent = "输入有误";
      $("#hardwireResult").innerHTML = `<div class="status-error">${escapeHtml(error.message)}</div>`;
    }
  }

  function renderHardwireSimulation() {
    const result = state.hardwire.result;
    if (!result) {
      $("#hardwireResult").innerHTML = `<div class="empty-state">点击“生成控制流程”后查看硬布线控制器逐拍过程。</div>`;
      return;
    }
    const steps = result.steps;
    const index = clamp(state.hardwire.cursor, 0, steps.length - 1);
    const step = steps[index];
    $("#hardwireStepCounter").textContent = `第 ${index + 1} / ${steps.length} 步`;
    const modules = [
      ["clock", "主振/启停", "提供基础时钟"],
      ["timing", "时序发生器", "产生 T0、T1..."],
      ["ir", "IR", "保存当前指令"],
      ["decoder", "操作码译码器", "输出 Im"],
      ["flags", "状态反馈", "Z / C / V"],
      ["logic", "控制信号形成", "C=f(Im,Bj,Tk)"],
      ["datapath", "寄存器/总线", "内部数据传送"],
      ["alu", "ALU", "运算并产生标志"],
      ["memory", "主存/接口", "指令或数据读写"],
    ];
    const signalList = Array.from(new Set(steps.flatMap((item) => item.signals))).sort();
    $("#hardwireResult").innerHTML = `
      <div class="memory-stage-card focus-card">
        <span>当前看这里</span>
        <h4>${escapeHtml(step.title)}</h4>
        <p>${escapeHtml(step.detail)}</p>
      </div>
      <div class="hardware-sim-grid">
        ${renderLearningStepper(steps.map((item) => ({ title: item.title, detail: item.formula })), index, "hardware-stepper")}
        <div class="hardware-board">
          <div class="hardware-module-grid">
            ${modules
              .map(([id, title, detail]) => `
                <div class="hardware-module ${step.active.includes(id) ? "active" : ""} ${id === "logic" ? "core" : ""}">
                  <strong>${escapeHtml(title)}</strong>
                  <span>${escapeHtml(detail)}</span>
                </div>
              `)
              .join("")}
          </div>
          <div class="control-equation">
            <strong>输入条件</strong>
            <span>${escapeHtml(step.inputs)}</span>
            <code>${escapeHtml(step.formula)}</code>
          </div>
        </div>
        <div class="hardware-side">
          <div class="mini-state-grid">
            ${Object.entries(step.state)
              .map(([name, value]) => `<div><strong>${escapeHtml(name)}</strong><span>${escapeHtml(value)}</span></div>`)
              .join("")}
          </div>
          <div class="signal-board compact">
            ${signalList
              .map((signal) => `
                <div class="signal-chip ${step.signals.includes(signal) ? "active" : ""}">
                  <strong>${escapeHtml(signal)}</strong>
                  <span>${step.signals.includes(signal) ? "有效" : "无效"}</span>
                </div>
              `)
              .join("")}
          </div>
        </div>
      </div>
    `;
  }

  function stepHardwireSimulation(delta) {
    if (!state.hardwire.result) {
      runHardwireSimulation();
      return;
    }
    const max = state.hardwire.result.steps.length - 1;
    state.hardwire.cursor = clamp(state.hardwire.cursor + delta, 0, max);
    renderHardwireSimulation();
    if (state.hardwire.cursor === max) stopStepTimer("hardwire", "#hardwireAuto", "自动演示");
  }

  function resetHardwireSimulation() {
    stopStepTimer("hardwire", "#hardwireAuto", "自动演示");
    state.hardwire.cursor = 0;
    renderHardwireSimulation();
  }

  function toggleHardwireAuto() {
    if (!state.hardwire.result) runHardwireSimulation();
    toggleStepTimer(
      "hardwire",
      "#hardwireAuto",
      "自动演示",
      "暂停演示",
      () => stepHardwireSimulation(1),
      () => !state.hardwire.result || state.hardwire.cursor >= state.hardwire.result.steps.length - 1
    );
  }

  function parseControlTerms() {
    const lines = String($("#controlTerms").value || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
    if (!lines.length) throw new Error("触发表不能为空");
    const bySignal = new Map();
    lines.forEach((line, index) => {
      const parts = line.split("|").map((part) => part.trim());
      if (parts.length < 5) {
        throw new Error(`第 ${index + 1} 行格式应为：信号 | 机器周期 | 节拍 | 指令 | 说明`);
      }
      const [name, machine, tick, op, reason] = parts;
      if (!name || !machine || !op) throw new Error(`第 ${index + 1} 行缺少信号、机器周期或指令条件`);
      const normalizedTick = tick === "-" ? "" : tick;
      const opExpr = op === "ALL" ? "" : op.includes("+") ? `(${op})` : op;
      const expr = [machine, normalizedTick, opExpr].filter(Boolean).join("·") || "1";
      const term = {
        name,
        machine,
        tick: normalizedTick,
        op,
        reason,
        expr,
        type: normalizedTick ? "脉冲/装载信号" : "电位信号",
      };
      if (!bySignal.has(name)) bySignal.set(name, []);
      bySignal.get(name).push(term);
    });
    return bySignal;
  }

  function updateControlSignalOptions(bySignal, preferred) {
    const select = $("#controlSignalSelect");
    if (!select) return "";
    const names = Array.from(bySignal.keys());
    const current = preferred || select.value || names[0] || "";
    select.innerHTML = names.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
    select.value = names.includes(current) ? current : names[0] || "";
    return select.value;
  }

  function runControlExpressionSimulation(preferredSignal) {
    try {
      const bySignal = parseControlTerms();
      const selected = updateControlSignalOptions(bySignal, preferredSignal);
      const terms = bySignal.get(selected) || [];
      const formula = terms.map((term) => term.expr).join(" + ");
      const steps = [
        {
          title: "定位控制信号",
          detail: `当前推导 ${selected}。先从触发表中找出它出现的所有微操作位置。`,
          terms: [],
        },
        ...terms.map((term, index) => ({
          title: `触发项 ${index + 1}：${term.expr}`,
          detail: term.reason,
          term,
          terms: terms.slice(0, index + 1),
        })),
        {
          title: `得到完整表达式：${selected} = ${formula || "0"}`,
          detail: "同一触发场景内的机器周期、节拍和指令条件相与；同一信号的多个来源相或。",
          terms,
          final: true,
        },
      ];
      state.control.result = {
        selected,
        bySignal,
        terms,
        formula,
        steps,
        tickCount: parsePositiveInteger($("#controlTicks").value, "默认节拍数", 8),
      };
      state.control.cursor = 0;
      renderControlExpressionSimulation();
    } catch (error) {
      state.control.result = null;
      $("#controlStepCounter").textContent = "输入有误";
      $("#controlExpressionResult").innerHTML = `<div class="status-error">${escapeHtml(error.message)}</div>`;
    }
  }

  function renderControlExpressionSimulation() {
    const result = state.control.result;
    if (!result) {
      $("#controlExpressionResult").innerHTML = `<div class="empty-state">点击“推导表达式”后查看控制信号条件如何逐项合成。</div>`;
      return;
    }
    const steps = result.steps;
    const index = clamp(state.control.cursor, 0, steps.length - 1);
    const step = steps[index];
    $("#controlStepCounter").textContent = `第 ${index + 1} / ${steps.length} 步`;
    const machines = Array.from(new Set(Array.from(result.bySignal.values()).flat().map((term) => term.machine))).sort();
    const ticks = Array.from({ length: result.tickCount }, (_, itemIndex) => `T${itemIndex + 1}`);
    const activeTerms = step.terms || [];
    const activeCells = new Set(activeTerms.filter((term) => term.tick).map((term) => `${term.machine}-${term.tick}`));
    const activeMachines = new Set(activeTerms.filter((term) => !term.tick).map((term) => term.machine));
    const selectedTerm = step.term || activeTerms[activeTerms.length - 1];
    const expression = activeTerms.length
      ? activeTerms.map((term) => term.expr).join(" + ")
      : "等待选择触发项";

    $("#controlExpressionResult").innerHTML = `
      <div class="memory-stage-card focus-card">
        <span>当前看这里</span>
        <h4>${escapeHtml(step.title)}</h4>
        <p>${escapeHtml(step.detail)}</p>
      </div>
      <div class="control-expression-grid">
        ${renderLearningStepper(steps.map((item) => ({ title: item.title, detail: item.final ? result.formula : item.detail })), index, "control-stepper")}
        <div class="formula-workbench">
          <div class="formula-display-line">
            <span>${escapeHtml(result.selected)}</span>
            <strong>=</strong>
            <code>${escapeHtml(expression)}</code>
          </div>
          <div class="condition-matrix">
            <div class="matrix-head">M/T</div>
            ${ticks.map((tick) => `<div class="matrix-head">${escapeHtml(tick)}</div>`).join("")}
            ${machines
              .map((machine) => `
                <div class="matrix-head machine">${escapeHtml(machine)}</div>
                ${ticks
                  .map((tick) => {
                    const active = activeCells.has(`${machine}-${tick}`);
                    const level = activeMachines.has(machine);
                    return `<div class="matrix-cell ${active ? "active" : ""} ${level ? "level" : ""}">${level ? "全周期" : active ? "触发" : ""}</div>`;
                  })
                  .join("")}
              `)
              .join("")}
          </div>
          <div class="signal-board compact">
            ${result.terms
              .map((term) => `
                <div class="signal-chip ${activeTerms.includes(term) ? "active" : ""}">
                  <strong>${escapeHtml(term.expr)}</strong>
                  <span>${escapeHtml(term.op)} · ${escapeHtml(term.type)}</span>
                </div>
              `)
              .join("")}
          </div>
        </div>
        <div class="control-side">
          <div class="memory-stage-card">
            <h4>信号类型</h4>
            <p>${escapeHtml(selectedTerm ? selectedTerm.type : "尚未选择触发项")}</p>
          </div>
          <div class="memory-stage-card">
            <h4>触发原因</h4>
            <p>${escapeHtml(selectedTerm ? selectedTerm.reason : "先读取触发表，再逐项合成表达式。")}</p>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>信号</th><th>表达式</th></tr></thead>
              <tbody>
                ${Array.from(result.bySignal.entries())
                  .map(([name, terms]) => `
                    <tr class="${name === result.selected ? "current-row" : ""}">
                      <td>${escapeHtml(name)}</td>
                      <td><code>${escapeHtml(terms.map((term) => term.expr).join(" + "))}</code></td>
                    </tr>
                  `)
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  function stepControlExpression(delta) {
    if (!state.control.result) {
      runControlExpressionSimulation();
      return;
    }
    state.control.cursor = clamp(state.control.cursor + delta, 0, state.control.result.steps.length - 1);
    renderControlExpressionSimulation();
  }

  function showFullControlExpression() {
    if (!state.control.result) runControlExpressionSimulation();
    if (!state.control.result) return;
    state.control.cursor = state.control.result.steps.length - 1;
    renderControlExpressionSimulation();
  }

  function readBusTransactionConfig() {
    const operation = $("#busOperation").value;
    const address = String($("#busAddress").value || "").trim() || "0x00";
    const data = String($("#busData").value || "").trim() || "00000000";
    const deviceName = String($("#busDeviceName").value || "").trim() || "I/O 设备";
    return { operation, address, data, deviceName };
  }

  function createBusTransactionSteps(config) {
    const targetName = config.operation.includes("io") || config.operation === "interrupt" ? config.deviceName : "主存";
    const common = {
      addressToTarget: {
        lane: "address",
        from: "CPU",
        to: targetName,
        title: `CPU 给出${config.operation.includes("io") ? "端口" : "主存"}地址`,
        detail: `地址总线携带 ${config.address}，用于选择本次访问目标。`,
        payload: config.address,
      },
      readControl: {
        lane: "control",
        from: "CPU",
        to: targetName,
        title: "CPU 发出读控制命令",
        detail: "控制总线说明当前事务是读取，目标设备应驱动数据总线返回数据。",
        payload: config.operation.includes("io") ? "I/O READ" : "READ",
      },
      writeControl: {
        lane: "control",
        from: "CPU",
        to: targetName,
        title: "CPU 发出写控制命令",
        detail: "控制总线通知目标锁存数据总线上的值并完成写入。",
        payload: "WRITE",
      },
    };
    if (config.operation === "write-memory") {
      return [
        common.addressToTarget,
        {
          lane: "data",
          from: "CPU",
          to: "主存",
          title: "CPU 放置待写数据",
          detail: `数据总线携带 ${config.data}，方向为 CPU 到主存。`,
          payload: config.data,
        },
        common.writeControl,
        {
          lane: "complete",
          from: "主存",
          to: "CPU",
          title: "写入完成",
          detail: `主存单元 ${config.address} 已保存 ${config.data}。`,
          payload: "ACK",
        },
      ];
    }
    if (config.operation === "read-io") {
      return [
        common.addressToTarget,
        common.readControl,
        {
          lane: "data",
          from: config.deviceName,
          to: "CPU",
          title: "I/O 设备返回数据",
          detail: `${config.deviceName} 把 ${config.data} 放到数据总线上送回 CPU。`,
          payload: config.data,
        },
      ];
    }
    if (config.operation === "interrupt") {
      return [
        {
          lane: "control",
          from: config.deviceName,
          to: "CPU",
          title: "I/O 发出中断请求",
          detail: `${config.deviceName} 通过控制线 IRQ 请求 CPU 服务。`,
          payload: "IRQ",
        },
        {
          lane: "control",
          from: "CPU",
          to: config.deviceName,
          title: "CPU 返回中断响应",
          detail: "CPU 确认中断并准备读取中断向量或设备状态。",
          payload: "INTA",
        },
        {
          lane: "data",
          from: config.deviceName,
          to: "CPU",
          title: "设备提供中断信息",
          detail: `数据总线携带中断向量 / 状态值 ${config.data}。`,
          payload: config.data,
        },
      ];
    }
    return [
      common.addressToTarget,
      common.readControl,
      {
        lane: "data",
        from: "主存",
        to: "CPU",
        title: "主存返回数据",
        detail: `数据总线携带 ${config.data}，方向为主存到 CPU。`,
        payload: config.data,
      },
    ];
  }

  function runBusTransaction() {
    stopStepTimer("bus", "#busAuto", "自动演示");
    try {
      const config = readBusTransactionConfig();
      state.bus.result = {
        config,
        steps: createBusTransactionSteps(config),
      };
      state.bus.cursor = 0;
      renderBusTransaction();
    } catch (error) {
      state.bus.result = null;
      $("#busStepCounter").textContent = "输入有误";
      $("#busTransactionResult").innerHTML = `<div class="status-error">${escapeHtml(error.message)}</div>`;
    }
  }

  function renderBusTransaction() {
    const result = state.bus.result;
    if (!result) {
      $("#busTransactionResult").innerHTML = `<div class="empty-state">点击“生成事务”后逐步观察地址、数据、控制三类总线。</div>`;
      return;
    }
    const steps = result.steps;
    const index = clamp(state.bus.cursor, 0, steps.length - 1);
    const step = steps[index];
    $("#busStepCounter").textContent = `第 ${index + 1} / ${steps.length} 步`;
    const lanes = [
      ["address", "地址总线", "CPU → 目标", "去哪里"],
      ["data", "数据总线", "双向", "传什么"],
      ["control", "控制总线", "按信号而定", "怎么做"],
    ];
    const nodes = ["CPU", "主存", result.config.deviceName];
    $("#busTransactionResult").innerHTML = `
      <div class="memory-stage-card focus-card">
        <span>当前看这里</span>
        <h4>${escapeHtml(step.title)}</h4>
        <p>${escapeHtml(step.detail)}</p>
      </div>
      <div class="bus-lab-grid">
        ${renderLearningStepper(steps.map((item) => ({ title: item.title, detail: `${item.from} → ${item.to}` })), index, "bus-stepper")}
        <div class="bus-canvas">
          <div class="bus-node-row">
            ${nodes
              .map((node) => `
                <div class="bus-node ${step.from === node || step.to === node ? "active" : ""}">
                  <strong>${escapeHtml(node)}</strong>
                  <span>${node === "CPU" ? "发起/响应事务" : node === "主存" ? "存放指令和数据" : "外设或接口"}</span>
                </div>
              `)
              .join("")}
          </div>
          <div class="bus-lane-stack">
            ${lanes
              .map(([id, name, direction, question]) => `
                <div class="bus-lane-card ${id} ${step.lane === id ? "active" : ""}">
                  <strong>${escapeHtml(name)}</strong>
                  <span>${escapeHtml(question)} · ${escapeHtml(direction)}</span>
                  ${step.lane === id ? `<code>${escapeHtml(step.payload)}</code>` : ""}
                </div>
              `)
              .join("")}
          </div>
          <div class="bus-packet ${step.lane}">
            <span>${escapeHtml(step.from)}</span>
            <strong>${escapeHtml(step.payload)}</strong>
            <span>${escapeHtml(step.to)}</span>
          </div>
        </div>
        <div class="signal-board compact">
          ${steps
            .map((item, itemIndex) => `
              <div class="signal-chip ${itemIndex === index ? "active" : itemIndex < index ? "done" : ""}">
                <strong>${escapeHtml(item.lane === "complete" ? "ACK" : item.lane.toUpperCase())}</strong>
                <span>${escapeHtml(item.payload)}</span>
              </div>
            `)
            .join("")}
        </div>
      </div>
    `;
  }

  function stepBusTransaction(delta) {
    if (!state.bus.result) {
      runBusTransaction();
      return;
    }
    const max = state.bus.result.steps.length - 1;
    state.bus.cursor = clamp(state.bus.cursor + delta, 0, max);
    renderBusTransaction();
    if (state.bus.cursor === max) stopStepTimer("bus", "#busAuto", "自动演示");
  }

  function resetBusTransaction() {
    stopStepTimer("bus", "#busAuto", "自动演示");
    state.bus.cursor = 0;
    renderBusTransaction();
  }

  function toggleBusAuto() {
    if (!state.bus.result) runBusTransaction();
    toggleStepTimer(
      "bus",
      "#busAuto",
      "自动演示",
      "暂停演示",
      () => stepBusTransaction(1),
      () => !state.bus.result || state.bus.cursor >= state.bus.result.steps.length - 1
    );
  }

  function parseArbitrationDevices() {
    const lines = String($("#arbDevices").value || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) throw new Error("主设备列表不能为空");
    const devices = lines.map((line, index) => {
      const parts = line.split(",").map((part) => part.trim());
      if (parts.length < 3) throw new Error(`第 ${index + 1} 行应为：名称,优先级,仲裁号`);
      const priority = Number.parseInt(parts[1], 10);
      if (!Number.isInteger(priority)) throw new Error(`第 ${index + 1} 行优先级必须是整数`);
      if (!/^[01]+$/.test(parts[2])) throw new Error(`第 ${index + 1} 行仲裁号必须是二进制串`);
      return {
        id: parts[0],
        name: parts[0],
        priority,
        code: parts[2],
        order: index,
      };
    });
    const names = new Set(devices.map((device) => device.name));
    if (names.size !== devices.length) throw new Error("主设备名称不能重复");
    return devices;
  }

  function parseArbitrationRequests(devices) {
    const names = String($("#arbRequests").value || "")
      .split(/[,\s，、]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    const known = new Set(devices.map((device) => device.name));
    const requests = names.filter((name) => known.has(name));
    if (!requests.length) {
      return devices.slice(0, Math.min(2, devices.length)).map((device) => device.name);
    }
    return Array.from(new Set(requests));
  }

  function createArbitrationSteps(config) {
    const requested = new Set(config.requests);
    const devices = config.devices;
    const requestText = config.requests.join("、");
    const steps = [
      {
        title: "设备提出总线请求",
        detail: `${requestText} 正在请求共享总线。仲裁器必须保证同一时刻只有一个主设备获得授权。`,
        active: config.requests,
        probed: [],
        eliminated: [],
        winner: "",
      },
    ];

    const byPriority = [...devices]
      .filter((device) => requested.has(device.name))
      .sort((left, right) => right.priority - left.priority || left.order - right.order);

    if (config.mode === "chain") {
      steps.push({
        title: "中央仲裁器发出 BG",
        detail: "授权信号从链首设备开始逐级传递，未请求者继续向后传。",
        active: config.requests,
        probed: [],
        eliminated: [],
        winner: "",
      });
      let winner = "";
      const probed = [];
      for (const device of devices) {
        probed.push(device.name);
        if (requested.has(device.name)) {
          winner = device.name;
          steps.push({
            title: `BG 到达 ${device.name} 并停止`,
            detail: `${device.name} 正在请求总线，因此截断授权并成为本轮获胜者。后面的请求设备必须等待下一轮。`,
            active: config.requests,
            probed: [...probed],
            eliminated: devices.slice(device.order + 1).filter((item) => requested.has(item.name)).map((item) => item.name),
            winner,
          });
          break;
        }
        steps.push({
          title: `${device.name} 未请求，继续传递`,
          detail: `${device.name} 没有请求总线，BG 沿链路传给下一个设备。`,
          active: config.requests,
          probed: [...probed],
          eliminated: [],
          winner: "",
        });
      }
      return steps;
    }

    if (config.mode === "counter") {
      const start = clamp(config.counterStart, 0, devices.length - 1);
      steps.push({
        title: `计数器从地址 ${start} 开始查询`,
        detail: "仲裁器逐个广播设备编号，匹配到正在请求的设备时停止计数。",
        active: config.requests,
        probed: [],
        eliminated: [],
        winner: "",
        counter: start,
      });
      const probed = [];
      for (let offset = 0; offset < devices.length; offset += 1) {
        const index = (start + offset) % devices.length;
        const device = devices[index];
        probed.push(device.name);
        if (requested.has(device.name)) {
          steps.push({
            title: `查询命中 ${device.name}`,
            detail: `广播地址 ${index} 与 ${device.name} 匹配，且该设备正在请求总线，因此获得授权。`,
            active: config.requests,
            probed: [...probed],
            eliminated: config.requests.filter((name) => name !== device.name),
            winner: device.name,
            counter: index,
          });
          break;
        }
        steps.push({
          title: `地址 ${index}：${device.name} 未请求`,
          detail: "本地址没有命中请求设备，计数器继续向后扫描。",
          active: config.requests,
          probed: [...probed],
          eliminated: [],
          winner: "",
          counter: index,
        });
      }
      return steps;
    }

    if (config.mode === "parallel") {
      const ordered = config.priorityRule === "round"
        ? [...byPriority].sort((left, right) => {
            const leftDistance = (left.order - state.arbitration.roundPointer + devices.length) % devices.length;
            const rightDistance = (right.order - state.arbitration.roundPointer + devices.length) % devices.length;
            return leftDistance - rightDistance;
          })
        : byPriority;
      const winner = ordered[0] ? ordered[0].name : "";
      steps.push({
        title: "独立请求线并行进入仲裁器",
        detail: "每个设备拥有独立 REQ 线，仲裁器一次性看到全部请求。",
        active: config.requests,
        probed: config.requests,
        eliminated: [],
        winner: "",
      });
      steps.push({
        title: `${winner} 获得独立授权线 GNT`,
        detail: config.priorityRule === "round"
          ? "循环优先从上次获胜者之后开始扫描，减少长期饥饿。"
          : "固定优先级编码器选择优先级最高的请求设备。",
        active: config.requests,
        probed: config.requests,
        eliminated: config.requests.filter((name) => name !== winner),
        winner,
      });
      return steps;
    }

    const maxBits = Math.max(...devices.map((device) => device.code.length));
    let alive = devices.filter((device) => requested.has(device.name));
    steps.push({
      title: "请求者同时送出仲裁号",
      detail: "没有中央仲裁器，设备从高位到低位比较仲裁号。某位为 0 而总线上存在 1 的设备退出。",
      active: config.requests,
      probed: alive.map((device) => device.name),
      eliminated: [],
      winner: "",
      bit: -1,
    });
    for (let bit = 0; bit < maxBits && alive.length > 1; bit += 1) {
      const hasOne = alive.some((device) => device.code.padStart(maxBits, "0")[bit] === "1");
      const before = alive;
      if (hasOne) alive = alive.filter((device) => device.code.padStart(maxBits, "0")[bit] === "1");
      const eliminated = before.filter((device) => !alive.includes(device)).map((device) => device.name);
      steps.push({
        title: `比较第 ${bit + 1} 位：${hasOne ? "总线上存在 1" : "全部为 0"}`,
        detail: eliminated.length
          ? `${eliminated.join("、")} 在该位为 0，退出竞争；剩余 ${alive.map((device) => device.name).join("、")}。`
          : "本位没有淘汰设备，继续比较下一位。",
        active: config.requests,
        probed: alive.map((device) => device.name),
        eliminated,
        winner: alive.length === 1 ? alive[0].name : "",
        bit,
      });
    }
    if (alive[0]) {
      steps.push({
        title: `${alive[0].name} 获得总线`,
        detail: `${alive[0].name} 的仲裁号 ${alive[0].code} 在请求者中最高，因此保留竞争资格并获得总线。`,
        active: config.requests,
        probed: [alive[0].name],
        eliminated: config.requests.filter((name) => name !== alive[0].name),
        winner: alive[0].name,
        bit: maxBits - 1,
      });
    }
    return steps;
  }

  function runBusArbitration() {
    stopStepTimer("arbitration", "#arbAuto", "自动演示");
    try {
      const devices = parseArbitrationDevices();
      const config = {
        devices,
        requests: parseArbitrationRequests(devices),
        mode: $("#arbMode").value,
        counterStart: Number.parseInt($("#arbCounterStart").value || "0", 10) || 0,
        priorityRule: $("#arbPriorityRule").value,
      };
      state.arbitration.result = {
        config,
        steps: createArbitrationSteps(config),
      };
      state.arbitration.cursor = 0;
      renderBusArbitration();
    } catch (error) {
      state.arbitration.result = null;
      $("#arbStepCounter").textContent = "输入有误";
      $("#busArbitrationResult").innerHTML = `<div class="status-error">${escapeHtml(error.message)}</div>`;
    }
  }

  function renderBusArbitration() {
    const result = state.arbitration.result;
    if (!result) {
      $("#busArbitrationResult").innerHTML = `<div class="empty-state">点击“开始仲裁”后查看不同仲裁方式如何选出唯一总线主人。</div>`;
      return;
    }
    const steps = result.steps;
    const index = clamp(state.arbitration.cursor, 0, steps.length - 1);
    const step = steps[index];
    const config = result.config;
    const modeName = {
      chain: "链式查询",
      counter: "计数器定时查询",
      parallel: "独立请求",
      distributed: "分布式仲裁",
    }[config.mode];
    $("#arbStepCounter").textContent = `第 ${index + 1} / ${steps.length} 步`;
    $("#busArbitrationResult").innerHTML = `
      <div class="memory-stage-card focus-card">
        <span>${escapeHtml(modeName)}</span>
        <h4>${escapeHtml(step.title)}</h4>
        <p>${escapeHtml(step.detail)}</p>
      </div>
      <div class="arb-lab-grid">
        ${renderLearningStepper(steps.map((item) => ({ title: item.title, detail: item.winner ? `获胜：${item.winner}` : item.detail })), index, "arb-stepper")}
        <div class="arb-board ${escapeHtml(config.mode)}">
          <div class="arb-device-grid">
            ${config.devices
              .map((device) => {
                const requested = config.requests.includes(device.name);
                const probed = step.probed.includes(device.name);
                const winner = step.winner === device.name;
                const eliminated = step.eliminated.includes(device.name);
                return `
                  <div class="arb-device ${requested ? "requesting" : ""} ${probed ? "probing" : ""} ${winner ? "winner" : ""} ${eliminated ? "eliminated" : ""}">
                    <strong>${escapeHtml(device.name)}</strong>
                    <span>优先级 ${device.priority} · CN ${escapeHtml(device.code)}</span>
                  </div>
                `;
              })
              .join("")}
          </div>
          <div class="arbiter-box">
            <strong>${config.mode === "distributed" ? "仲裁总线" : "总线仲裁器"}</strong>
            <span>${step.counter !== undefined ? `当前查询地址 ${step.counter}` : step.bit !== undefined && step.bit >= 0 ? `比较位 ${step.bit + 1}` : "等待请求"}</span>
          </div>
          <div class="bus-owner-box ${step.winner ? "active" : ""}">
            <strong>共享系统总线</strong>
            <span>${step.winner ? `已授权：${escapeHtml(step.winner)}` : "尚未授权"}</span>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>设备</th><th>请求</th><th>状态</th></tr></thead>
            <tbody>
              ${config.devices
                .map((device) => {
                  const status = step.winner === device.name
                    ? "获胜"
                    : step.eliminated.includes(device.name)
                      ? "等待下一轮"
                      : step.probed.includes(device.name)
                        ? "正在比较"
                        : config.requests.includes(device.name)
                          ? "请求中"
                          : "未请求";
                  return `<tr><td>${escapeHtml(device.name)}</td><td>${config.requests.includes(device.name) ? "是" : "否"}</td><td>${escapeHtml(status)}</td></tr>`;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function stepBusArbitration(delta) {
    if (!state.arbitration.result) {
      runBusArbitration();
      return;
    }
    const max = state.arbitration.result.steps.length - 1;
    state.arbitration.cursor = clamp(state.arbitration.cursor + delta, 0, max);
    renderBusArbitration();
    if (state.arbitration.cursor === max) {
      const finalStep = state.arbitration.result.steps[max];
      const winnerIndex = state.arbitration.result.config.devices.findIndex((device) => device.name === finalStep.winner);
      if (winnerIndex >= 0) state.arbitration.roundPointer = (winnerIndex + 1) % state.arbitration.result.config.devices.length;
      stopStepTimer("arbitration", "#arbAuto", "自动演示");
    }
  }

  function resetBusArbitration() {
    stopStepTimer("arbitration", "#arbAuto", "自动演示");
    state.arbitration.cursor = 0;
    renderBusArbitration();
  }

  function toggleBusArbitrationAuto() {
    if (!state.arbitration.result) runBusArbitration();
    toggleStepTimer(
      "arbitration",
      "#arbAuto",
      "自动演示",
      "暂停演示",
      () => stepBusArbitration(1),
      () => !state.arbitration.result || state.arbitration.cursor >= state.arbitration.result.steps.length - 1
    );
  }

  function parseKeyboardLayout(value = DEFAULT_KEYBOARD_LAYOUT_TEXT) {
    const rows = String(value || DEFAULT_KEYBOARD_LAYOUT_TEXT)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const tokens = line.split(/\s+/).filter(Boolean);
        return tokens.length === 1 && !/^space$/i.test(tokens[0]) && Array.from(tokens[0]).length >= 3 ? Array.from(tokens[0]) : tokens;
      });
    const colCount = rows[0]?.length || 0;
    if (rows.length < 2 || colCount < 2 || rows.some((row) => row.length !== colCount)) {
      throw new Error("键盘布局至少需要 2 行 2 列，且每行键数一致；可用空格分隔，也可写成 123456");
    }
    if (rows.length > 8 || colCount > 8) {
      throw new Error("为了保持页面紧凑，键盘布局最多支持 8 行 8 列");
    }
    const normalizedKeys = rows.flat().map((key) => normalizeKeyboardKey(key));
    if (new Set(normalizedKeys).size !== normalizedKeys.length) {
      throw new Error("键盘布局中不能出现重复键值");
    }
    return rows.map((row) => row.map((key) => normalizeKeyboardKey(key)));
  }

  function normalizeKeyboardKey(value) {
    const text = String(value || "").trim();
    if (text === "Space") return "SPACE";
    if (text.length === 1) return text.toUpperCase();
    return text.toUpperCase();
  }

  function findKeyboardKey(layout, key) {
    const normalized = normalizeKeyboardKey(key);
    for (let row = 0; row < layout.length; row += 1) {
      for (let col = 0; col < layout[row].length; col += 1) {
        if (normalizeKeyboardKey(layout[row][col]) === normalized) {
          return { row, col, key: layout[row][col] };
        }
      }
    }
    return null;
  }

  function keyboardLineBits(activeIndex, lineCount) {
    return Array.from({ length: lineCount }, (_, index) => (index === activeIndex ? "0" : "1")).join("");
  }

  function keyboardIndexCode(value, count) {
    const width = Math.max(1, Math.ceil(Math.log2(Math.max(1, count))));
    return value.toString(2).padStart(width, "0");
  }

  function keyboardColumnBits(col, width = 4) {
    return keyboardLineBits(col, width);
  }

  function createKeyboardSteps(layout, selected, debounceMs) {
    const rowCount = layout.length;
    const colCount = layout[0].length;
    const steps = [
      {
        title: `已选择按键 ${selected.key}`,
        detail: `按键 ${selected.key} 位于 R${selected.row} 与 C${selected.col} 的交叉点。下一步开始逐行扫描。`,
        phase: "ready",
        row: null,
        col: null,
      },
    ];
    for (let row = 0; row < rowCount; row += 1) {
      const hit = row === selected.row;
      steps.push({
        title: hit ? `扫描 R${row}：检测到 C${selected.col}` : `扫描 R${row}：本行无按键闭合`,
        detail: hit
          ? `R${row} 输出有效电平时，按键 ${selected.key} 将 R${row} 与 C${selected.col} 接通，列输入变为 ${keyboardColumnBits(selected.col, colCount)}。`
          : `${colCount} 条列线保持 ${keyboardLineBits(null, colCount)}，说明被按下的键不在这一行。`,
        phase: "scan",
        row,
        col: hit ? selected.col : null,
      });
    }
    steps.push(
      {
        title: "定位完成：行列唯一确定按键",
        detail: `有效位置为 R${selected.row} × C${selected.col}，查表得到字符 ${selected.key}。`,
        phase: "locate",
        row: selected.row,
        col: selected.col,
      },
      {
        title: "原始触点可能抖动",
        detail: `控制器读到位置编码 ${keyboardIndexCode(selected.row, rowCount)} ${keyboardIndexCode(selected.col, colCount)}，但机械触点可能在几毫秒内反复通断。`,
        phase: "bounce",
        row: selected.row,
        col: selected.col,
      },
      {
        title: `防抖确认：上报 ${selected.key}`,
        detail: `等待约 ${debounceMs} ms 后再次读取，状态仍稳定，因此只上报一次有效按键 ${selected.key}。`,
        phase: "confirm",
        row: selected.row,
        col: selected.col,
      }
    );
    return steps;
  }

  function updateKeyboardRunButton() {
    const button = $("#keyboardRun");
    if (button) button.textContent = state.keyboard.running ? "关闭仿真" : "启动仿真";
  }

  function confirmKeyboardPendingAtCurrentRow() {
    const pending = state.keyboard.pending;
    if (!state.keyboard.running || !pending) return;
    if (pending.row !== state.keyboard.cursor) return;
    state.keyboard.selected = { ...pending };
    state.keyboard.pending = null;
    state.keyboard.lastSource = state.keyboard.selected.source;
  }

  function runKeyboardSimulation(source = "启动仿真") {
    startKeyboardSimulation(source);
  }

  function startKeyboardSimulation(source = "启动仿真") {
    try {
      const layout = parseKeyboardLayout();
      if (state.keyboard.timer) window.clearInterval(state.keyboard.timer);
      state.keyboard.layout = layout;
      state.keyboard.result = {
        layout,
        debounceMs: DEFAULT_KEYBOARD_DEBOUNCE_MS,
      };
      state.keyboard.running = true;
      state.keyboard.capture = true;
      state.keyboard.lastSource = source;
      state.keyboard.cursor = 0;
      state.keyboard.selected = null;
      state.keyboard.pending = null;
      updateKeyboardRunButton();
      const button = $("#keyboardRun");
      if (button) button.blur();
      renderKeyboardSimulation();
      state.keyboard.timer = window.setInterval(() => {
        if (!$("#keyboard-sim.active")) {
          stopKeyboardSimulation({ render: false, clearSelection: false });
          return;
        }
        const rowCount = state.keyboard.layout?.length || 1;
        state.keyboard.cursor = (state.keyboard.cursor + 1) % rowCount;
        confirmKeyboardPendingAtCurrentRow();
        renderKeyboardSimulation();
      }, KEYBOARD_SCAN_INTERVAL_MS);
    } catch (error) {
      state.keyboard.result = null;
      state.keyboard.running = false;
      state.keyboard.capture = false;
      updateKeyboardRunButton();
      $("#keyboardStepCounter").textContent = "启动失败";
      $("#keyboardResult").innerHTML = `<div class="status-error">${escapeHtml(error.message)}</div>`;
    }
  }

  function stopKeyboardSimulation(options = {}) {
    const { render = true, clearSelection = false } = options;
    if (state.keyboard.timer) {
      window.clearInterval(state.keyboard.timer);
      state.keyboard.timer = null;
    }
    state.keyboard.running = false;
    state.keyboard.capture = false;
    state.keyboard.pending = null;
    if (clearSelection) {
      state.keyboard.selected = null;
      state.keyboard.lastSource = "尚未按键";
    }
    updateKeyboardRunButton();
    if (render) renderKeyboardSimulation();
  }

  function toggleKeyboardSimulation() {
    if (state.keyboard.running) {
      stopKeyboardSimulation();
      return;
    }
    startKeyboardSimulation();
  }

  function renderKeyboardMatrix(layout, selected, step) {
    const row = step.row;
    const col = step.col;
    const found = ["locate", "confirm"].includes(step.phase);
    const bouncing = step.phase === "bounce";
    const rowCount = layout.length;
    const colCount = layout[0].length;
    return `
      <div class="keyboard-matrix-wrap" style="--keyboard-rows: ${rowCount}; --keyboard-cols: ${colCount};">
        <div class="keyboard-row-labels">
          ${layout.map((_, rowIndex) => `<div class="${rowIndex === row ? "active" : ""}">R${rowIndex}</div>`).join("")}
        </div>
        <div class="keyboard-grid">
          ${layout
            .flatMap((layoutRow, rowIndex) =>
              layoutRow.map((key, colIndex) => {
                const match = Boolean(selected && rowIndex === selected.row && colIndex === selected.col);
                const active = rowIndex === row;
                const detected = colIndex === col;
                return `
                  <div class="matrix-key ${match ? "pressed" : ""} ${match && found ? "found" : ""} ${match && bouncing ? "bouncing" : ""} ${active ? "row-active" : ""} ${detected ? "col-detected" : ""}" data-keyboard-key="${escapeHtml(key)}">
                    <small>R${rowIndex}·C${colIndex}</small>
                    ${escapeHtml(key)}
                  </div>
                `;
              })
            )
            .join("")}
        </div>
        <div class="keyboard-col-labels">
          ${layout[0].map((_, colIndex) => `<div class="${colIndex === col ? "detected" : ""}">C${colIndex}</div>`).join("")}
        </div>
      </div>
    `;
  }

  function renderKeyboardSimulation() {
    const result = state.keyboard.result || {
      layout: state.keyboard.layout || parseKeyboardLayout(),
      debounceMs: DEFAULT_KEYBOARD_DEBOUNCE_MS,
    };
    const resultEl = $("#keyboardResult");
    const statusEl = $("#keyboardCaptureStatus");
    if (!resultEl) return;
    const layout = result.layout;
    const running = state.keyboard.running;
    const selected = state.keyboard.selected;
    const pending = state.keyboard.pending;
    const rowCount = layout.length;
    const colCount = layout[0].length;
    const activeRow = running ? clamp(state.keyboard.cursor, 0, rowCount - 1) : null;
    const detectedCol = running && selected && selected.row === activeRow ? selected.col : null;
    const step = {
      row: activeRow,
      col: detectedCol,
      phase: detectedCol === null ? (running ? "scan" : "ready") : "confirm",
    };
    const ascii = selected && selected.key.length === 1 ? selected.key.charCodeAt(0) : "—";
    const colRead = !running ? "—" : detectedCol === null ? keyboardLineBits(null, colCount) : keyboardColumnBits(detectedCol, colCount);
    $("#keyboardStepCounter").textContent = running ? `持续扫描 R${activeRow}` : "等待启动";
    if (statusEl) {
      statusEl.className = running ? "status-good" : "empty-state";
      statusEl.textContent = running
        ? selected
          ? `正在扫描。最近按下：${selected.key}（${selected.source}）`
          : pending
            ? "已接收到按键，等待扫描动画走到对应行后确认。"
            : "正在扫描。请按下键盘上的数字或字母。"
        : selected
          ? `仿真已关闭。最近按下：${selected.key}`
          : "仿真未启动。";
    }
    const focusTitle = running
      ? selected
        ? `检测到按键 ${selected.key}`
        : pending
          ? "等待扫描确认"
          : "正在循环扫描键盘矩阵"
      : "键盘仿真未启动";
    const focusDetail = running
      ? selected
        ? `按键 ${selected.key} 位于 R${selected.row} 与 C${selected.col}，当前扫描到该行时列输入会变为 ${keyboardColumnBits(selected.col, colCount)}。`
        : pending
          ? "控制器继续按固定频率逐行扫描，只有扫到闭合键所在行时才读出列线并显示键值。"
          : `控制器正在从 R0 到 R${rowCount - 1} 循环输出有效电平，等待用户按下数字或字母键。`
      : "点击启动仿真后，矩阵会持续扫描并读取真实键盘按键。";
    resultEl.innerHTML = `
      <div class="memory-stage-card focus-card ${running ? "active" : ""}">
        <span>${running ? "实时扫描" : "待启动"}</span>
        <h4>${escapeHtml(focusTitle)}</h4>
        <p>${escapeHtml(focusDetail)}</p>
      </div>
      <div class="keyboard-lab-grid">
        <div class="keyboard-scan-list">
          ${layout
            .map((_, rowIndex) => {
              const isActive = rowIndex === activeRow;
              const isHit = selected && rowIndex === selected.row;
              return `
                <div class="keyboard-scan-row ${isActive ? "active" : ""} ${isHit ? "hit" : ""}">
                  <strong>R${rowIndex}</strong>
                  <span>${isActive ? "正在扫描" : isHit ? "最近按键所在行" : "等待扫描"}</span>
                </div>
              `;
            })
            .join("")}
        </div>
        <div>
          ${renderKeyboardMatrix(layout, selected, step)}
          <div class="keyboard-wave ${running ? "show-raw show-clean" : ""}">
            <div class="wave-raw-line"></div>
            <div class="wave-clean-line"></div>
            <span>扫描时钟</span>
            <strong>${running ? `R${activeRow} 有效` : "未启动"}</strong>
          </div>
        </div>
        <div class="keyboard-readout">
          <div><strong>扫描状态</strong><span>${running ? (pending ? "等待确认" : "运行中") : "已停止"}</span></div>
          <div><strong>当前扫描行</strong><span>${activeRow === null ? "—" : `R${activeRow}`}</span></div>
          <div><strong>列输入</strong><span>${colRead}</span></div>
          <div><strong>最近按键</strong><span>${selected ? escapeHtml(selected.key) : pending ? "等待扫描确认" : "—"}</span></div>
          <div><strong>位置编码</strong><span>${selected ? `${keyboardIndexCode(selected.row, rowCount)} ${keyboardIndexCode(selected.col, colCount)}` : pending ? "等待扫描确认" : "—"}</span></div>
          <div><strong>字符码</strong><span>${escapeHtml(ascii)}</span></div>
        </div>
      </div>
    `;
  }

  function stepKeyboardSimulation(delta) {
    if (!state.keyboard.running) {
      startKeyboardSimulation();
      return;
    }
    const rowCount = state.keyboard.layout?.length || parseKeyboardLayout().length;
    state.keyboard.cursor = (state.keyboard.cursor + delta + rowCount) % rowCount;
    confirmKeyboardPendingAtCurrentRow();
    renderKeyboardSimulation();
  }

  function resetKeyboardSimulation() {
    stopKeyboardSimulation({ clearSelection: true });
  }

  function toggleKeyboardAuto() {
    toggleKeyboardSimulation();
  }

  function toggleKeyboardCapture() {
    toggleKeyboardSimulation();
  }

  function handlePhysicalKeyboard(event) {
    if (!state.keyboard.running || !$("#keyboard-sim.active")) return;
    const tag = event.target && event.target.tagName ? event.target.tagName.toLowerCase() : "";
    if (["input", "textarea", "select"].includes(tag) || event.target?.isContentEditable) return;
    const key = normalizeKeyboardKey(event.key === " " ? "Space" : event.key);
    const layout = state.keyboard.layout || parseKeyboardLayout();
    const found = findKeyboardKey(layout, key);
    if (!found) return;
    event.preventDefault();
    state.keyboard.pending = { ...found, source: `真实键盘 ${event.key} / ${event.code}` };
    state.keyboard.selected = null;
    state.keyboard.lastSource = "等待扫描确认";
    renderKeyboardSimulation();
  }

  async function apiPost(path, payload) {
    const response = await fetch(path, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.detail || `请求失败：${response.status}`);
    }
    return data;
  }

  function setDemoStatus(message, type = "empty") {
    const container = $("#demoStatus");
    if (!container) return;
    const className = type === "error" ? "status-error" : type === "good" ? "status-good" : type === "warn" ? "status-warn" : "empty-state";
    container.className = `demo-status ${className}`;
    container.textContent = message;
  }

  function setInputValue(selector, value) {
    const element = $(selector);
    if (element && value !== undefined && value !== null) {
      element.value = value;
    }
  }

  function applyExtendedDemoInputs(panelId, inputs) {
    const panel = document.getElementById(panelId);
    if (!panel || !EXTENDED_SIMULATION_DEFS[panelId]) return false;
    panel.querySelectorAll("[data-extended-input]").forEach((input) => {
      const key = input.dataset.extendedInput;
      if (inputs[key] !== undefined && inputs[key] !== null) {
        input.value = inputs[key];
      }
    });
    runExtendedSimulation(panelId);
    return true;
  }

  function applyDemoPlan(plan) {
    if (!plan || !plan.supported) {
      setSection("dashboard");
      setDemoStatus(
        plan && plan.reason
          ? plan.reason
          : "暂不支持该功能仿真。当前可演示：补码/定点、IEEE 754、Cache、虚拟存储、存储读写、存储扩展、流水线、CPU 数据通路、汇编解释、硬布线控制、时序表达式、总线事务、总线仲裁、键盘扫描。",
        "error"
      );
      return;
    }

    const inputs = plan.inputs || {};
    setSection("simulation");
    setSimulationPanel(plan.targetPanel);

    try {
      if (plan.targetPanel === "pipeline-sim") {
        setInputValue("#pipelineCode", inputs.program);
        const forwarding = $("#pipelineForwarding");
        if (forwarding) forwarding.checked = inputs.forwarding !== false;
        runPipeline();
      } else if (plan.targetPanel === "datapath-sim") {
        setInputValue("#datapathCode", inputs.program);
        runDatapath();
      } else if (plan.targetPanel === "cache-sim") {
        setInputValue("#cacheAccesses", inputs.accesses);
        setInputValue("#cacheMapping", inputs.mapping);
        setInputValue("#cacheReplacement", inputs.replacement);
        runCache();
      } else if (plan.targetPanel === "virtual-sim") {
        setInputValue("#vmMode", inputs.mode);
        setInputValue("#vmReplacement", inputs.replacement);
        setInputValue("#vmReferences", inputs.references);
        runVirtualMemory();
      } else if (plan.targetPanel === "memory-access-sim") {
        setInputValue("#memoryOperation", inputs.operation);
        setInputValue("#memoryAddress", inputs.address);
        setInputValue("#memoryData", inputs.data);
        runMemoryAccess();
      } else if (plan.targetPanel === "memory-expansion-sim") {
        setInputValue("#expansionMode", inputs.mode);
        setInputValue("#chipWords", inputs.chipWords);
        setInputValue("#chipBits", inputs.chipBits);
        setInputValue("#targetWords", inputs.targetWords);
        setInputValue("#targetBits", inputs.targetBits);
        runMemoryExpansion();
      } else if (plan.targetPanel === "hardwire-sim") {
        setInputValue("#hardwireOp", inputs.op);
        setInputValue("#hardwirePC", inputs.pc);
        setInputValue("#hardwireDest", inputs.dest);
        setInputValue("#hardwireSource", inputs.source);
        setInputValue("#hardwireDestValue", inputs.destValue);
        setInputValue("#hardwireSourceValue", inputs.sourceValue);
        setInputValue("#hardwireAddress", inputs.address);
        setInputValue("#hardwireBits", inputs.bits);
        runHardwireSimulation();
      } else if (plan.targetPanel === "control-expression-sim") {
        runControlExpressionSimulation(inputs.signal);
      } else if (plan.targetPanel === "bus-transaction-sim") {
        setInputValue("#busOperation", inputs.operation);
        setInputValue("#busAddress", inputs.address);
        setInputValue("#busData", inputs.data);
        setInputValue("#busDeviceName", inputs.deviceName);
        runBusTransaction();
      } else if (plan.targetPanel === "bus-arbitration-sim") {
        setInputValue("#arbMode", inputs.mode);
        setInputValue("#arbDevices", inputs.devices);
        setInputValue("#arbRequests", inputs.requests);
        setInputValue("#arbCounterStart", inputs.counterStart);
        setInputValue("#arbPriorityRule", inputs.priorityRule);
        runBusArbitration();
      } else if (plan.targetPanel === "keyboard-sim") {
        runKeyboardSimulation("智能演示入口");
      } else if (plan.targetPanel === "twos-sim") {
        if (inputs.demoType === "ieee754" || inputs.a !== undefined || inputs.b !== undefined) {
          setInputValue("#floatA", inputs.a);
          setInputValue("#floatB", inputs.b);
          setInputValue("#floatOperation", inputs.operation || "add");
          runFloat();
        } else {
          setInputValue("#fixedOperation", inputs.fixedOperation || inputs.operation || "add");
          setInputValue("#twosX", inputs.x);
          setInputValue("#twosY", inputs.y);
          setInputValue("#twosBits", inputs.bits || 8);
          runTwosComplement();
        }
      } else if (plan.targetPanel === "assembly-sim") {
        setInputValue("#assemblyCode", inputs.program);
        loadAssembly();
      } else if (applyExtendedDemoInputs(plan.targetPanel, inputs)) {
        // Extended simulations share a generated parameter form and a common runner.
      }
      setDemoStatus(`${plan.usedFallback ? "已使用本地规则生成" : "已使用 DeepSeek 生成"}：${plan.title || "课堂演示"}`, plan.usedFallback ? "warn" : "good");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setSection("dashboard");
      setDemoStatus(`演示计划已生成，但自动运行失败：${error.message}`, "error");
    }
  }

  async function runDemoPlanner() {
    const prompt = $("#demoPrompt").value.trim();
    if (!prompt) {
      setDemoStatus("请输入想演示的过程。", "error");
      return;
    }

    setDemoStatus("正在生成课堂演示...", "warn");
    try {
      const plan = await apiPost("/api/agent/demo-plan", {
        message: prompt,
        useLLM: true,
      });
      applyDemoPlan(plan);
    } catch (error) {
      setDemoStatus(`生成失败：${error.message}`, "error");
    }
  }

  function summarizeToolContext(context) {
    if (!context || !context.tool) {
      return "";
    }
    const toolName = context.tool;
    const result = context.toolResult || {};
    if (toolName === "simulate_twos_complement_add") {
      return `规则工具：${toolName}，结果 ${result.sumBinary || "-"} = ${result.result ?? "-"}，溢出：${result.overflow ? "是" : "否"}`;
    }
    if (toolName === "execute_assembly") {
      return `规则工具：${toolName}，执行 ${result.steps ? result.steps.length : 0} 步。`;
    }
    if (toolName === "simulate_pipeline") {
      return `规则工具：${toolName}，周期数 ${result.cycleCount || 0}，冒险数 ${result.hazards ? result.hazards.length : 0}。`;
    }
    if (toolName === "simulate_cache_address") {
      return `规则工具：${toolName}，Tag ${result.tagBinary || "0"}，Index ${result.index}，Offset ${result.offset}。`;
    }
    return `规则工具：${toolName}`;
  }

  function bindEvents() {
    const sidebarToggle = $("#sidebarToggle");
    if (sidebarToggle) {
      if (!sidebarToggle.hasAttribute("onclick")) {
        sidebarToggle.addEventListener("click", toggleSidebar);
      }
      setSidebarCollapsed(document.body.classList.contains("sidebar-collapsed"));
    }
    const simulationRoot = $("#simulation");
    if (simulationRoot) {
      simulationRoot.addEventListener("click", (event) => {
        const toggle = event.target.closest(".sim-param-toggle");
        if (toggle) {
          toggleSimulationParams(toggle);
        }
      });
    }
    $all("[data-section]").forEach((button) => {
      button.addEventListener("click", () => {
        setSection(button.dataset.section);
        if (button.dataset.simPanel) {
          setSimulationPanel(button.dataset.simPanel);
        }
      });
    });
    $all(".sim-tab").forEach((button) => {
      button.addEventListener("click", () => {
        setSection("simulation");
        setSimulationPanel(button.dataset.simPanel);
      });
    });
    $all("[data-sim-card]").forEach((button) => {
      button.addEventListener("click", () => {
        setSection("simulation");
        setSimulationPanel(button.dataset.simCard);
      });
    });
    $("#demoGenerate").addEventListener("click", runDemoPlanner);
    $all(".demo-example").forEach((button) => {
      button.addEventListener("click", () => {
        $("#demoPrompt").value = button.dataset.demoPrompt || "";
        runDemoPlanner();
      });
    });
    $("#askButton").addEventListener("click", runQuestionAnswer);
    $("#twosRun").addEventListener("click", runTwosComplement);
    $("#floatRun").addEventListener("click", runFloat);
    $("#cacheRun").addEventListener("click", runCache);
    $("#cachePrev").addEventListener("click", () => stepCache(-1));
    $("#cacheNext").addEventListener("click", () => stepCache(1));
    const cacheAuto = $("#cacheAuto");
    if (cacheAuto) cacheAuto.addEventListener("click", toggleCacheAuto);
    const cacheReset = $("#cacheReset");
    if (cacheReset) cacheReset.addEventListener("click", resetCache);
    $("#vmRun").addEventListener("click", runVirtualMemory);
    $("#vmReplacement").addEventListener("change", renderVmConfigNote);
    $("#vmPrev").addEventListener("click", () => stepVirtualMemory(-1));
    $("#vmNext").addEventListener("click", () => stepVirtualMemory(1));
    const vmAuto = $("#vmAuto");
    if (vmAuto) vmAuto.addEventListener("click", toggleVirtualMemoryAuto);
    const vmReset = $("#vmReset");
    if (vmReset) vmReset.addEventListener("click", resetVirtualMemory);
    $("#memoryOperation").addEventListener("change", updateMemoryInputHints);
    $("#memoryRun").addEventListener("click", runMemoryAccess);
    $("#memoryPrev").addEventListener("click", () => stepMemoryAccess(-1));
    $("#memoryNext").addEventListener("click", () => stepMemoryAccess(1));
    $("#memoryAuto").addEventListener("click", toggleMemoryAuto);
    $("#memoryClear").addEventListener("click", clearMemoryAccess);
    $("#expansionRun").addEventListener("click", runMemoryExpansion);
    $("#expansionPrev").addEventListener("click", () => stepMemoryExpansion(-1));
    $("#expansionNext").addEventListener("click", () => stepMemoryExpansion(1));
    $("#pipelineRun").addEventListener("click", runPipeline);
    $("#pipelinePrev").addEventListener("click", () => stepPipeline(-1));
    $("#pipelineNext").addEventListener("click", () => stepPipeline(1));
    $("#pipelineAuto").addEventListener("click", togglePipelineAuto);
    $("#datapathLoad").addEventListener("click", runDatapath);
    $("#datapathPrev").addEventListener("click", () => stepDatapath(-1));
    $("#datapathNext").addEventListener("click", () => stepDatapath(1));
    $("#datapathAuto").addEventListener("click", toggleDatapathAuto);
    $("#datapathReset").addEventListener("click", resetDatapath);
    $("#assemblyLoad").addEventListener("click", loadAssembly);
    $("#assemblyPrev").addEventListener("click", () => stepAssembly(-1));
    $("#assemblyNext").addEventListener("click", () => stepAssembly(1));
    $("#assemblyReset").addEventListener("click", resetAssembly);
    $("#hardwireRun").addEventListener("click", runHardwireSimulation);
    $("#hardwirePrev").addEventListener("click", () => stepHardwireSimulation(-1));
    $("#hardwireNext").addEventListener("click", () => stepHardwireSimulation(1));
    $("#hardwireAuto").addEventListener("click", toggleHardwireAuto);
    $("#hardwireReset").addEventListener("click", resetHardwireSimulation);
    $("#controlRun").addEventListener("click", () => runControlExpressionSimulation());
    $("#controlSignalSelect").addEventListener("change", () => runControlExpressionSimulation($("#controlSignalSelect").value));
    $("#controlPrev").addEventListener("click", () => stepControlExpression(-1));
    $("#controlNext").addEventListener("click", () => stepControlExpression(1));
    $("#controlAll").addEventListener("click", showFullControlExpression);
    $("#controlReset").addEventListener("click", () => runControlExpressionSimulation());
    $("#busRun").addEventListener("click", runBusTransaction);
    $("#busPrev").addEventListener("click", () => stepBusTransaction(-1));
    $("#busNext").addEventListener("click", () => stepBusTransaction(1));
    $("#busAuto").addEventListener("click", toggleBusAuto);
    $("#busReset").addEventListener("click", resetBusTransaction);
    $("#arbRun").addEventListener("click", runBusArbitration);
    $("#arbPrev").addEventListener("click", () => stepBusArbitration(-1));
    $("#arbNext").addEventListener("click", () => stepBusArbitration(1));
    $("#arbAuto").addEventListener("click", toggleBusArbitrationAuto);
    $("#arbReset").addEventListener("click", resetBusArbitration);
    $("#keyboardRun").addEventListener("click", toggleKeyboardSimulation);
    bindExtendedSimulationEvents();
    document.addEventListener("keydown", handlePhysicalKeyboard);
    window.addEventListener("beforeunload", () => {
      stopCacheAuto();
      stopVirtualMemoryAuto();
      stopKeyboardSimulation({ render: false, clearSelection: false });
      Object.keys(state.extended).forEach(stopExtendedSimulationAuto);
    });
  }

  function boot() {
    installImportedSimulationPanels();
    installExtendedSimulationPanels();
    prepareSimulationParameterPanels();
    renderRecommendedFeatures();
    bindEvents();
    updateMemoryInputHints();
    renderCacheConfigNote();
    renderVmConfigNote();
    runTwosComplement();
    runFloat();
    runCache();
    runVirtualMemory();
    runMemoryAccess();
    runMemoryExpansion();
    runPipeline();
    runDatapath();
    loadAssembly();
    runHardwireSimulation();
    runControlExpressionSimulation();
    runBusTransaction();
    runBusArbitration();
    renderKeyboardSimulation();
    Object.keys(EXTENDED_SIMULATION_DEFS).forEach(runExtendedSimulation);
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
