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
    catalog.innerHTML = SIMULATION_FEATURES.map(
      (feature) => `
        <button class="simulation-card" data-sim-card="${escapeHtml(feature.id)}">
          <span>${escapeHtml(feature.category)}</span>
          <strong>${escapeHtml(feature.title)}</strong>
          <em>${escapeHtml(feature.desc)}</em>
        </button>
      `
    ).join("");
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
      demoStatus.textContent = "当前支持：补码/定点、IEEE 754、Cache、虚拟存储、存储读写、存储扩展、流水线、CPU 数据通路、汇编解释、硬布线控制、时序表达式、总线事务、总线仲裁、键盘扫描。";
    }
    renderSimulationCatalog();
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
          ${renderMemorySignalSummary(config, step)}
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
    document.addEventListener("keydown", handlePhysicalKeyboard);
    window.addEventListener("beforeunload", () => {
      stopCacheAuto();
      stopVirtualMemoryAuto();
      stopKeyboardSimulation({ render: false, clearSelection: false });
    });
  }

  function boot() {
    installImportedSimulationPanels();
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
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
