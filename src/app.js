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
    },
    vm: {
      result: null,
      cursor: 0,
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
  };

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
    $all(".page-section").forEach((section) => {
      section.classList.toggle("active", section.id === sectionId);
    });
    $all(".nav-item").forEach((button) => {
      button.classList.toggle("active", button.dataset.section === sectionId);
    });
  }

  function setSimulationPanel(panelId) {
    $all(".sim-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.id === panelId);
    });
    $all(".sim-tab").forEach((button) => {
      button.classList.toggle("active", button.dataset.simPanel === panelId);
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
    const addressBits = parsePositiveInteger($("#memoryAddressBits").value, "地址位数", 12);
    const columnBits = parsePositiveInteger($("#memoryColumnBits").value, "列地址位数", 11);
    if (columnBits >= addressBits) {
      throw new Error("列地址位数必须小于地址位数，才能同时形成字线和列线");
    }
    const dataBits = parsePositiveInteger($("#memoryDataBits").value, "数据位数", 16);
    const address = parseMemoryInteger($("#memoryAddress").value, "地址");
    const maxAddress = 2 ** addressBits - 1;
    if (address < 0 || address > maxAddress) {
      throw new Error(`地址必须在 0 到 ${maxAddress} 之间`);
    }
    const mask = 2 ** dataBits - 1;
    const data = parseMemoryInteger($("#memoryData").value, "写入数据") & mask;
    const rowBits = addressBits - columnBits;
    const columnMask = 2 ** columnBits - 1;
    const wordLine = Math.floor(address / (2 ** columnBits));
    const columnLine = address & columnMask;
    return {
      operation: $("#memoryOperation").value,
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
    const oldValue = config.oldValue ?? state.memory.cells[config.address] ?? 0;
    const resultValue = config.resultValue ?? state.memory.cells[config.address] ?? 0;
    const storedValue = config.operation === "write" && !["cell", "complete"].includes(step.phase) ? oldValue : resultValue;
    const dataBusValue = config.operation === "write" ? config.data : resultValue;
    const addressBinary = formatBinary(config.address, config.addressBits);
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
              <span>${addressBinary}</span>
            </div>
            <div>
              <strong>字线 WL${config.wordLine}</strong>
              <span>${rowLines} = ${rowBinary}，十进制 ${config.wordLine}</span>
            </div>
            <div>
              <strong>列线 CL${config.columnLine}</strong>
              <span>${columnLines} = ${columnBinary}，十进制 ${config.columnLine}</span>
            </div>
          </div>
          <div class="memory-machine">
            <div class="memory-node ${isActive("cpu")}">
              <strong>CPU</strong>
              <span>${config.operation === "write" ? "发起写入" : "发起读取"}</span>
            </div>
            <div class="memory-bus ${isActive("address")}"><strong>地址总线</strong><span>${formatBinary(config.address, config.addressBits)}</span></div>
            <div class="memory-node ${isActive("mar")}">
              <strong>MAR</strong>
              <span>${formatMemoryValue(config.address, config.addressBits)}</span>
            </div>
            <div class="memory-node ${isActive("decoder")}">
              <strong>地址译码器</strong>
              <span>WL${config.wordLine} / CL${config.columnLine}</span>
            </div>
            <div class="memory-node ${isActive("cell")}">
              <strong>存储阵列</strong>
              <span>${formatMemoryValue(config.address, config.addressBits)} = ${formatMemoryValue(storedValue, config.dataBits)}</span>
            </div>
            <div class="memory-node ${isActive("mdr")}">
              <strong>MDR</strong>
              <span>${formatMemoryValue(dataBusValue, config.dataBits)}</span>
            </div>
            <div class="memory-bus ${isActive("data")}"><strong>数据总线</strong><span>${formatBinary(dataBusValue, config.dataBits)}</span></div>
            <div class="memory-node ${isActive("control")}">
              <strong>控制信号</strong>
              <span>${config.operation === "write" ? "CS=0 / WE=0" : "CS=0 / WE=1"}</span>
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

  function runMemoryAccess() {
    try {
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
            <div class="bit-field">
              <strong>${escapeHtml(field.label)}</strong>
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
                  .map((row) => `
                    <span class="${[row.valid ? "filled" : "", selectedEvent && row.set === selectedEvent.setIndex && row.way === selectedEvent.way ? "current" : ""].filter(Boolean).join(" ")}">
                      ${result.mapping === "direct" ? "Line" : `Way ${row.way}`} · V=${row.valid ? 1 : 0} · Tag=${escapeHtml(row.tag)} · B=${escapeHtml(row.block)}
                    </span>
                  `)
                  .join("")}
              </div>
            </div>
          `)
          .join("")}
      </div>
    `;
  }

  function renderCacheStructureDiagram(result, selectedEvent = null) {
    const fields = [
      { label: "Tag", bits: result.tagBits, hint: "与缓存行中保存的标记比较" },
      { label: result.mapping === "direct" ? "Line Index" : "Set Index", bits: result.indexBits, hint: result.mapping === "fully" ? "全相联无索引" : "定位候选行/组" },
      { label: "Block Offset", bits: result.offsetBits, hint: "定位块内字节" },
    ];
    const placement = result.mapping === "direct"
      ? "Index 只指向唯一 Cache 行，主存块只能放在这一行。"
      : result.mapping === "fully"
        ? "地址中没有 Index，主存块可放入任意 Cache 行，需要所有有效行并行比较 Tag。"
        : "Index 先定位 Cache 组，主存块可放入该组内任意一路。";
    const compare = result.mapping === "direct"
      ? "只比较被选中行的 Tag。"
      : result.mapping === "fully"
        ? "并行比较所有有效行的 Tag。"
        : "并行比较目标组内各路的 Tag。";
    const accessSummary = selectedEvent
      ? `当前访问 ${selectedEvent.accessIndex + 1}：地址 ${formatAddress(selectedEvent.address)} → 主存块 ${selectedEvent.blockNumber}，Tag=${selectedEvent.tag}，${result.mapping === "fully" ? "全表比较" : `Index=${selectedEvent.setIndex}`}，Offset=${selectedEvent.offset}。`
      : "运行后可逐次查看地址拆分、候选位置和 Tag 比较。";
    return `
      <div class="mapping-diagram">
        <div class="diagram-title">
          <strong>${getCacheMappingName(result)}结构图</strong>
          <span>${escapeHtml(placement)}</span>
        </div>
        <div class="diagram-flow">
          <div class="diagram-node source-node">
            <strong>CPU 地址</strong>
            <span>${result.addressBits} 位地址</span>
          </div>
          <div class="diagram-arrow">→</div>
          <div class="diagram-node field-node">
            <strong>地址字段拆分</strong>
            ${renderBitFields(fields)}
          </div>
          <div class="diagram-arrow">→</div>
          <div class="diagram-node">
            <strong>定位候选位置</strong>
            <span>${escapeHtml(placement)}</span>
          </div>
          <div class="diagram-arrow">→</div>
          <div class="diagram-node">
            <strong>Tag 比较</strong>
            <span>${escapeHtml(compare)}</span>
          </div>
        </div>
        <div class="diagram-callout">${escapeHtml(accessSummary)}</div>
        ${renderCacheSetGrid(result, selectedEvent)}
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
    const mappingName = getCacheMappingName(result);
    const selectedEvent = result.events[clamp(state.cache.cursor, 0, result.events.length - 1)];
    const counter = $("#cacheStepCounter");
    if (counter) counter.textContent = `访问 ${selectedEvent.accessIndex + 1} / ${result.events.length}`;
    $("#cacheResult").innerHTML = `
      <div class="status-good">${escapeHtml(result.explanation)}</div>
      <div class="cache-fields">
        <div class="cache-field">
          <strong>映射</strong>
          <span>${mappingName}</span>
        </div>
        <div class="cache-field">
          <strong>命中率</strong>
          <span>${result.hits}/${result.accesses.length} = ${(result.hitRate * 100).toFixed(1)}%</span>
        </div>
        <div class="cache-field">
          <strong>字段位数</strong>
          <span>Tag ${result.tagBits} / Index ${result.indexBits} / Offset ${result.offsetBits}</span>
        </div>
      </div>
      ${renderCacheStructureDiagram(result, selectedEvent)}
      <div class="answer-section">
        <h4>逐步访问过程</h4>
        ${renderCacheProcessSteps(result, selectedEvent)}
      </div>
      <div class="table-wrap" style="margin-top: 12px;">
        <table>
          <thead>
            <tr>
              <th>#</th><th>地址</th><th>主存块</th><th>组号</th><th>Tag</th><th>Offset</th><th>结果</th><th>动作</th>
            </tr>
          </thead>
          <tbody>
            ${result.events
              .map(
                (event) => `
                  <tr class="${event.accessIndex === selectedEvent.accessIndex ? "current-row" : event.hit ? "active-row" : ""}">
                    <td>${event.accessIndex + 1}</td>
                    <td><code>${formatAddress(event.address)}</code></td>
                    <td>${event.blockNumber}</td>
                    <td>${event.setIndex}</td>
                    <td>${event.tag}</td>
                    <td>${event.offset}</td>
                    <td>${event.hit ? "命中" : "未命中"}</td>
                    <td>${escapeHtml(event.action)}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
      <div class="table-wrap" style="margin-top: 12px;">
        <table>
          <thead>
            <tr><th>组</th><th>路</th><th>有效位</th><th>Tag</th><th>主存块</th><th>访问次数</th><th>最近访问</th></tr>
          </thead>
          <tbody>
            ${result.rows
              .map(
                (row) => `
                  <tr>
                    <td>${row.set}</td>
                    <td>${row.way}</td>
                    <td>${row.valid ? 1 : 0}</td>
                    <td>${escapeHtml(row.tag)}</td>
                    <td>${escapeHtml(row.block)}</td>
                    <td>${row.frequency}</td>
                    <td>${row.lastUsed || "-"}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function runCache() {
    try {
      const result = core.simulateCacheSystem({
        accesses: $("#cacheAccesses").value,
        addressBits: $("#cacheAddressBits").value,
        lines: $("#cacheLines").value,
        blockSize: $("#cacheBlockSize").value,
        mapping: $("#cacheMapping").value,
        associativity: $("#cacheAssociativity").value,
        replacement: $("#cacheReplacement").value,
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
  }

  function getVmModeName(mode) {
    if (mode === "segmentation") return "段表映射";
    if (mode === "segmented-paging") return "段页式映射";
    return "页表映射";
  }

  function renderFrameSnapshot(snapshot) {
    return snapshot.map((page) => (page === null ? "-" : page)).join(" / ");
  }

  function renderFrameGrid(snapshot, activeFrame = null) {
    return `
      <div class="frame-grid">
        ${snapshot.map((page, frame) => `
          <div class="frame-cell ${frame === activeFrame ? "current" : ""} ${page === null ? "empty" : "filled"}">
            <strong>页框 ${frame}</strong>
            <span>${page === null ? "空" : `页 ${page}`}</span>
          </div>
        `).join("")}
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
          <span>逻辑地址拆成页号和页内偏移，页表给出页框号，再与偏移拼接成物理地址。</span>
        </div>
        <div class="diagram-flow">
          <div class="diagram-node source-node"><strong>逻辑地址</strong><span>${result.logicalAddress}</span></div>
          <div class="diagram-arrow">→</div>
          <div class="diagram-node field-node">
            <strong>地址拆分</strong>
            ${renderBitFields([
              { label: "Page Number", bits: Math.max(1, Math.ceil(Math.log2(result.page + 1 || 1))), hint: `页号 ${result.page}` },
              { label: "Page Offset", bits: Math.log2(result.pageSize), hint: `页内偏移 ${result.offset}` },
            ])}
          </div>
          <div class="diagram-arrow">→</div>
          <div class="diagram-node"><strong>页表 / TLB</strong><span>${result.residentFrame === null ? "页不在内存，触发缺页" : `页 ${result.page} → 页框 ${result.residentFrame}`}</span></div>
          <div class="diagram-arrow">→</div>
          <div class="diagram-node ${result.physicalAddress === null ? "danger" : "success"}"><strong>${result.physicalAddress === null ? "缺页" : "物理地址"}</strong><span>${result.physicalAddress === null ? "需要页面置换" : result.physicalAddress}</span></div>
        </div>
        <div class="diagram-callout">${selectedEvent ? `当前置换步骤：访问页 ${selectedEvent.page}，${selectedEvent.hit ? `页已在页框 ${selectedEvent.frame}` : `装入页框 ${selectedEvent.frame}${selectedEvent.evicted === null ? "" : `，替换页 ${selectedEvent.evicted}`}`}。` : "页面访问序列会逐步改变物理页框中的页面。"}</div>
        ${renderFrameGrid(selectedEvent ? selectedEvent.snapshot : result.replacement.frames.map((frame) => frame.page), selectedEvent ? selectedEvent.frame : result.residentFrame)}
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

  function renderVirtualMemory(result) {
    if (result.mode === "segmentation") {
      const counter = $("#vmStepCounter");
      if (counter) counter.textContent = "1 / 1";
      $("#vmResult").innerHTML = `
        <div class="${result.valid ? "status-good" : "status-error"}">${escapeHtml(result.explanation)}</div>
        ${renderVirtualStructureDiagram(result)}
        <div class="answer-section">
          <h4>逐步转换过程</h4>
          ${renderVirtualProcessSteps(result)}
        </div>
        <div class="table-wrap" style="margin-top: 12px;">
          <table>
            <thead><tr><th>段号</th><th>基址</th><th>段长</th></tr></thead>
            <tbody>
              ${result.table.map((row) => `<tr><td>${row.segment}</td><td>${row.base}</td><td>${row.limit}</td></tr>`).join("")}
            </tbody>
          </table>
        </div>
      `;
      return;
    }

    if (result.mode === "segmented-paging") {
      const counter = $("#vmStepCounter");
      if (counter) counter.textContent = "1 / 1";
      $("#vmResult").innerHTML = `
        <div class="status-good">${escapeHtml(result.explanation)}</div>
        <div class="cache-fields">
          <div class="cache-field"><strong>逻辑地址</strong><span>${escapeHtml(result.logicalAddress)}</span></div>
          <div class="cache-field"><strong>物理地址</strong><span>${result.physicalAddress}</span></div>
          <div class="cache-field"><strong>映射方式</strong><span>段页式</span></div>
        </div>
        ${renderVirtualStructureDiagram(result)}
        <div class="answer-section">
          <h4>逐步转换过程</h4>
          ${renderVirtualProcessSteps(result)}
        </div>
        <div class="table-wrap" style="margin-top: 12px;">
          <table>
            <thead><tr><th>段号</th><th>页号</th><th>页框号</th></tr></thead>
            <tbody>
              ${result.table.map((row) => `<tr><td>${row.segment}</td><td>${row.page}</td><td>${row.frame}</td></tr>`).join("")}
            </tbody>
          </table>
        </div>
      `;
      return;
    }

    const replacement = result.replacement;
    const selectedEvent = replacement.events[clamp(state.vm.cursor, 0, replacement.events.length - 1)];
    const counter = $("#vmStepCounter");
    if (counter) counter.textContent = `页面访问 ${selectedEvent.index + 1} / ${replacement.events.length}`;
    $("#vmResult").innerHTML = `
      <div class="${result.physicalAddress === null ? "status-warn" : "status-good"}">${escapeHtml(result.explanation)}</div>
      <div class="cache-fields">
        <div class="cache-field"><strong>逻辑地址拆分</strong><span>页号 ${result.page} / 页内偏移 ${result.offset}</span></div>
        <div class="cache-field"><strong>缺页率</strong><span>${replacement.faults}/${replacement.references.length} = ${(replacement.faultRate * 100).toFixed(1)}%</span></div>
        <div class="cache-field"><strong>页面置换</strong><span>${replacement.policy.toUpperCase()}</span></div>
      </div>
      ${renderVirtualStructureDiagram(result, selectedEvent)}
      <div class="answer-section">
        <h4>逐步转换与置换过程</h4>
        ${renderVirtualProcessSteps(result, selectedEvent)}
      </div>
      <div class="table-wrap" style="margin-top: 12px;">
        <table>
          <thead><tr><th>#</th><th>访问页</th><th>结果</th><th>页框</th><th>页框快照</th><th>动作</th></tr></thead>
          <tbody>
            ${replacement.events
              .map(
                (event) => `
                  <tr class="${event.index === selectedEvent.index ? "current-row" : event.hit ? "active-row" : ""}">
                    <td>${event.index + 1}</td>
                    <td>${event.page}</td>
                    <td>${event.hit ? "命中" : "缺页"}</td>
                    <td>${event.frame}</td>
                    <td><code>${renderFrameSnapshot(event.snapshot)}</code></td>
                    <td>${escapeHtml(event.action)}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function runVirtualMemory() {
    try {
      const result = core.simulateVirtualMemory({
        mode: $("#vmMode").value,
        logicalAddress: $("#vmLogicalAddress").value,
        pageSize: $("#vmPageSize").value,
        frames: $("#vmFrames").value,
        replacement: $("#vmReplacement").value,
        references: $("#vmReferences").value,
        segmentTable: $("#vmSegmentTable").value,
        segmentPageTable: $("#vmSegmentPageTable").value,
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

    const header = Array.from({ length: result.cycleCount }, (_, index) => `<th>C${index + 1}</th>`).join("");
    const body = result.timeline
      .map((row) => {
        return `
          <tr>
            <td><code>${escapeHtml(row.instruction)}</code></td>
            ${row.cells
              .map((cell) => {
                const className = cell === "STALL" ? "stage-cell stall" : cell ? "stage-cell filled" : "stage-cell";
                return `<td class="${className}">${escapeHtml(cell)}</td>`;
              })
              .join("")}
          </tr>
        `;
      })
      .join("");
    const hazards = result.hazards.length
      ? result.hazards
          .map((hazard) => `<div class="status-warn">${escapeHtml(hazard.type)}：${escapeHtml(hazard.description)}</div>`)
          .join("")
      : `<div class="status-good">未发现需要停顿的相邻 RAW 冒险。</div>`;

    $("#pipelineResult").innerHTML = `
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
    const result = core.simulatePipeline($("#pipelineCode").value, {
      forwarding: $("#pipelineForwarding").checked,
    });
    renderPipeline(result);
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
    $("#assemblyCursor").textContent = steps.length ? `第 ${Math.max(cursor + 1, 0)} / ${steps.length} 步` : "未执行";

    $("#assemblyLog").innerHTML = steps.length
      ? steps
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
    state.assembly.cursor = state.assembly.execution.steps.length ? 0 : -1;
    renderAssembly();
  }

  function stepAssembly(delta) {
    const execution = state.assembly.execution;
    if (!execution) {
      loadAssembly();
      return;
    }
    const next = state.assembly.cursor + delta;
    state.assembly.cursor = Math.max(0, Math.min(execution.steps.length - 1, next));
    renderAssembly();
  }

  function resetAssembly() {
    state.assembly.cursor = -1;
    renderAssembly();
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
          : "暂不支持该功能仿真。当前可演示：补码/定点、IEEE 754、Cache、虚拟存储、存储读写、存储扩展、流水线、CPU 数据通路、汇编解释。",
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
        setInputValue("#cacheAddressBits", inputs.addressBits);
        setInputValue("#cacheLines", inputs.lines);
        setInputValue("#cacheBlockSize", inputs.blockSize);
        setInputValue("#cacheMapping", inputs.mapping);
        setInputValue("#cacheAssociativity", inputs.associativity);
        setInputValue("#cacheReplacement", inputs.replacement);
        runCache();
      } else if (plan.targetPanel === "virtual-sim") {
        setInputValue("#vmMode", inputs.mode);
        setInputValue("#vmLogicalAddress", inputs.logicalAddress);
        setInputValue("#vmPageSize", inputs.pageSize);
        setInputValue("#vmFrames", inputs.frames);
        setInputValue("#vmReplacement", inputs.replacement);
        setInputValue("#vmReferences", inputs.references);
        setInputValue("#vmSegmentTable", inputs.segmentTable);
        setInputValue("#vmSegmentPageTable", inputs.segmentPageTable);
        runVirtualMemory();
      } else if (plan.targetPanel === "memory-access-sim") {
        setInputValue("#memoryOperation", inputs.operation);
        setInputValue("#memoryAddressBits", inputs.addressBits);
        setInputValue("#memoryColumnBits", inputs.columnBits);
        setInputValue("#memoryDataBits", inputs.dataBits);
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
    $("#vmRun").addEventListener("click", runVirtualMemory);
    $("#vmPrev").addEventListener("click", () => stepVirtualMemory(-1));
    $("#vmNext").addEventListener("click", () => stepVirtualMemory(1));
    $("#memoryRun").addEventListener("click", runMemoryAccess);
    $("#memoryPrev").addEventListener("click", () => stepMemoryAccess(-1));
    $("#memoryNext").addEventListener("click", () => stepMemoryAccess(1));
    $("#memoryAuto").addEventListener("click", toggleMemoryAuto);
    $("#memoryClear").addEventListener("click", clearMemoryAccess);
    $("#expansionRun").addEventListener("click", runMemoryExpansion);
    $("#expansionPrev").addEventListener("click", () => stepMemoryExpansion(-1));
    $("#expansionNext").addEventListener("click", () => stepMemoryExpansion(1));
    $("#pipelineRun").addEventListener("click", runPipeline);
    $("#datapathLoad").addEventListener("click", runDatapath);
    $("#datapathPrev").addEventListener("click", () => stepDatapath(-1));
    $("#datapathNext").addEventListener("click", () => stepDatapath(1));
    $("#datapathAuto").addEventListener("click", toggleDatapathAuto);
    $("#datapathReset").addEventListener("click", resetDatapath);
    $("#assemblyLoad").addEventListener("click", loadAssembly);
    $("#assemblyPrev").addEventListener("click", () => stepAssembly(-1));
    $("#assemblyNext").addEventListener("click", () => stepAssembly(1));
    $("#assemblyReset").addEventListener("click", resetAssembly);
  }

  function boot() {
    renderRecommendedFeatures();
    bindEvents();
    runTwosComplement();
    runFloat();
    runCache();
    runVirtualMemory();
    runMemoryAccess();
    runMemoryExpansion();
    runPipeline();
    runDatapath();
    loadAssembly();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
