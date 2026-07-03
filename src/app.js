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
    memory: {
      cells: {},
      steps: [],
      cursor: 0,
      timer: null,
      lastConfig: null,
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

  function renderChapters() {
    const progress = $("#chapterProgress");
    progress.innerHTML = core.chapters
      .map((chapter) => {
        return `
          <div class="progress-item">
            <div class="progress-meta">
              <strong>${escapeHtml(chapter.title)}</strong>
              <span>${chapter.progress}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width: ${chapter.progress}%"></div>
            </div>
          </div>
        `;
      })
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
      const value = state.memory.cells[address] ?? 0;
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

  function renderMemoryAccess() {
    const config = state.memory.lastConfig;
    if (!config || !state.memory.steps.length) {
      $("#memoryStepCounter").textContent = "等待执行";
      $("#memoryAccessResult").innerHTML = `<div class="empty-state">输入地址和数据后，点击“执行读写过程”。</div>`;
      return;
    }
    const step = state.memory.steps[state.memory.cursor];
    const isActive = (name) => step.active.includes(name) ? "active" : "";
    const storedValue = state.memory.cells[config.address] ?? 0;
    const dataBusValue = config.operation === "write" ? config.data : storedValue;
    const addressBinary = formatBinary(config.address, config.addressBits);
    const rowBinary = formatBinary(config.wordLine, config.rowBits);
    const columnBinary = formatBinary(config.columnLine, config.columnBits);
    const rowLines = formatAddressLineSlice(config.addressBits - 1, config.columnBits);
    const columnLines = formatAddressLineSlice(config.columnBits - 1, 0);
    $("#memoryStepCounter").textContent = `第 ${state.memory.cursor + 1} / ${state.memory.steps.length} 步`;
    $("#memoryAccessResult").innerHTML = `
      <div class="memory-stage-card">
        <h4>${escapeHtml(step.title)}</h4>
        <p>${escapeHtml(step.detail)}</p>
      </div>
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
        <div class="memory-bus ${isActive("address")}">地址总线<br>${formatBinary(config.address, config.addressBits)}</div>
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
        <div class="memory-bus ${isActive("data")}">数据总线<br>${formatBinary(dataBusValue, config.dataBits)}</div>
        <div class="memory-node ${isActive("control")}">
          <strong>控制信号</strong>
          <span>${config.operation === "write" ? "CS=0 / WE=0" : "CS=0 / WE=1"}</span>
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
      state.memory.lastConfig = config;
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
    const visibleCount = Math.min(result.chipCount, 16);
    const chips = Array.from({ length: visibleCount }, (_, index) => {
      const label = result.mode === "bit"
        ? `D${index * result.chipBits}~D${Math.min((index + 1) * result.chipBits - 1, result.realizedBits - 1)}`
        : `块 ${index}: ${index * result.chipWords}~${Math.min((index + 1) * result.chipWords - 1, result.realizedWords - 1)}`;
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

  function formatAddressLineRange(count) {
    return count <= 0 ? "无片内地址线" : `A0~A${count - 1}`;
  }

  function formatAddressLineSlice(high, low) {
    return high === low ? `A${high}` : `A${high}~A${low}`;
  }

  function simulateMemoryExpansion() {
    const mode = $("#expansionMode").value;
    const chipWords = parsePositiveInteger($("#chipWords").value, "单片字数");
    const chipBits = parsePositiveInteger($("#chipBits").value, "单片位宽", 1024);
    const targetWords = parsePositiveInteger($("#targetWords").value, "目标字数");
    const targetBits = parsePositiveInteger($("#targetBits").value, "目标位宽", 1024);
    if (mode === "bit") {
      const chipCount = ceilDivide(targetBits, chipBits);
      return {
        mode,
        chipWords,
        chipBits,
        targetWords,
        targetBits,
        chipCount,
        realizedWords: chipWords,
        realizedBits: chipCount * chipBits,
        addressLines: ceilLog2(chipWords),
        selectLines: 0,
        warning: targetWords === chipWords ? "" : "目标字数与单片字数不同，单纯位扩展只能扩展位宽；若要同时扩展字数，需要再叠加字扩展。",
      };
    }
    const chipCount = ceilDivide(targetWords, chipWords);
    return {
      mode,
      chipWords,
      chipBits,
      targetWords,
      targetBits,
      chipCount,
      realizedWords: chipCount * chipWords,
      realizedBits: chipBits,
      addressLines: ceilLog2(chipWords),
      selectLines: ceilLog2(chipCount),
      warning: targetBits === chipBits ? "" : "目标位宽与单片位宽不同，单纯字扩展只能扩展字数；若要同时扩展位宽，需要再叠加位扩展。",
    };
  }

  function renderMemoryExpansion(result) {
    const modeName = result.mode === "bit" ? "位扩展法" : "字扩展法";
    $("#memoryExpansionResult").innerHTML = `
      ${result.warning ? `<div class="status-warn">${escapeHtml(result.warning)}</div>` : `<div class="status-good">${modeName}结构已生成。</div>`}
      <div class="cache-fields">
        <div class="cache-field"><strong>芯片数量</strong><span>${result.chipCount} 片</span></div>
        <div class="cache-field"><strong>实现容量</strong><span>${result.realizedWords} × ${result.realizedBits} 位</span></div>
        <div class="cache-field"><strong>地址/片选</strong><span>${result.addressLines} 条片内地址线${result.selectLines ? `，${result.selectLines} 条片选线` : ""}</span></div>
      </div>
      <div class="expansion-diagram ${result.mode === "bit" ? "bit-mode" : "word-mode"}">
        <div class="expansion-source">CPU<br><span>${result.mode === "bit" ? "地址共用，数据分片" : "低位地址共用，高位片选"}</span></div>
        <div class="expansion-bus">
          <strong>${result.mode === "bit" ? `${formatAddressLineRange(result.addressLines)} 广播到所有芯片` : `${formatAddressLineRange(result.addressLines)} 接入片内地址`}</strong>
          <span>${result.mode === "bit" ? `数据线拼接为 ${result.realizedBits} 位` : `高位地址译码产生 ${result.chipCount} 路片选`}</span>
        </div>
        <div class="expansion-chip-grid">${renderExpansionChips(result)}</div>
      </div>
    `;
  }

  function runMemoryExpansion() {
    try {
      renderMemoryExpansion(simulateMemoryExpansion());
    } catch (error) {
      $("#memoryExpansionResult").innerHTML = `<div class="status-error">${escapeHtml(error.message)}</div>`;
    }
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

  function renderCache(result) {
    const mappingName = result.mapping === "direct" ? "直接映射" : result.mapping === "fully" ? "全相联映射" : `${result.associativity} 路组相联映射`;
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
                  <tr class="${event.hit ? "active-row" : ""}">
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
      renderCache(result);
    } catch (error) {
      $("#cacheResult").innerHTML = `<div class="status-error">${escapeHtml(error.message)}</div>`;
    }
  }

  function renderFrameSnapshot(snapshot) {
    return snapshot.map((page) => (page === null ? "-" : page)).join(" / ");
  }

  function renderVirtualMemory(result) {
    if (result.mode === "segmentation") {
      $("#vmResult").innerHTML = `
        <div class="${result.valid ? "status-good" : "status-error"}">${escapeHtml(result.explanation)}</div>
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
      $("#vmResult").innerHTML = `
        <div class="status-good">${escapeHtml(result.explanation)}</div>
        <div class="cache-fields">
          <div class="cache-field"><strong>逻辑地址</strong><span>${escapeHtml(result.logicalAddress)}</span></div>
          <div class="cache-field"><strong>物理地址</strong><span>${result.physicalAddress}</span></div>
          <div class="cache-field"><strong>映射方式</strong><span>段页式</span></div>
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
    $("#vmResult").innerHTML = `
      <div class="${result.physicalAddress === null ? "status-warn" : "status-good"}">${escapeHtml(result.explanation)}</div>
      <div class="cache-fields">
        <div class="cache-field"><strong>逻辑地址拆分</strong><span>页号 ${result.page} / 页内偏移 ${result.offset}</span></div>
        <div class="cache-field"><strong>缺页率</strong><span>${replacement.faults}/${replacement.references.length} = ${(replacement.faultRate * 100).toFixed(1)}%</span></div>
        <div class="cache-field"><strong>页面置换</strong><span>${replacement.policy.toUpperCase()}</span></div>
      </div>
      <div class="table-wrap" style="margin-top: 12px;">
        <table>
          <thead><tr><th>#</th><th>访问页</th><th>结果</th><th>页框</th><th>页框快照</th><th>动作</th></tr></thead>
          <tbody>
            ${replacement.events
              .map(
                (event) => `
                  <tr class="${event.hit ? "active-row" : ""}">
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
      renderVirtualMemory(result);
    } catch (error) {
      $("#vmResult").innerHTML = `<div class="status-error">${escapeHtml(error.message)}</div>`;
    }
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
    $("#askButton").addEventListener("click", runQuestionAnswer);
    $("#twosRun").addEventListener("click", runTwosComplement);
    $("#floatRun").addEventListener("click", runFloat);
    $("#cacheRun").addEventListener("click", runCache);
    $("#vmRun").addEventListener("click", runVirtualMemory);
    $("#memoryRun").addEventListener("click", runMemoryAccess);
    $("#memoryPrev").addEventListener("click", () => stepMemoryAccess(-1));
    $("#memoryNext").addEventListener("click", () => stepMemoryAccess(1));
    $("#memoryAuto").addEventListener("click", toggleMemoryAuto);
    $("#memoryClear").addEventListener("click", clearMemoryAccess);
    $("#expansionRun").addEventListener("click", runMemoryExpansion);
    $("#pipelineRun").addEventListener("click", runPipeline);
    $("#assemblyLoad").addEventListener("click", loadAssembly);
    $("#assemblyPrev").addEventListener("click", () => stepAssembly(-1));
    $("#assemblyNext").addEventListener("click", () => stepAssembly(1));
    $("#assemblyReset").addEventListener("click", resetAssembly);
  }

  function boot() {
    renderChapters();
    bindEvents();
    runTwosComplement();
    runFloat();
    runCache();
    runVirtualMemory();
    runMemoryAccess();
    runMemoryExpansion();
    runPipeline();
    loadAssembly();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
