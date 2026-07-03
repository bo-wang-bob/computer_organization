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

  function setSection(sectionId) {
    $all(".page-section").forEach((section) => {
      section.classList.toggle("active", section.id === sectionId);
    });
    $all(".nav-item").forEach((button) => {
      button.classList.toggle("active", button.dataset.section === sectionId);
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

    const qaChapter = $("#qaChapter");
    qaChapter.innerHTML = `
      <option value="all">全部章节</option>
      ${core.chapters
        .map((chapter) => `<option value="${chapter.id}">${escapeHtml(chapter.title)}</option>`)
        .join("")}
    `;

    const diagQuestion = $("#diagQuestion");
    diagQuestion.innerHTML = core.diagnosticQuestions
      .map((question) => `<option value="${question.id}">${escapeHtml(question.title)}</option>`)
      .join("");
  }

  function renderAnswer(result) {
    $("#qaMatched").textContent = result.matched ? "已匹配知识点" : "使用章节兜底";
    $("#qaAnswer").innerHTML = `
      <div class="answer-section">
        <h4>${escapeHtml(result.title)}</h4>
        <p>${escapeHtml(result.modeNote)}</p>
      </div>
      <div class="answer-section">
        <h4>一句话结论</h4>
        <p>${escapeHtml(result.summary)}</p>
      </div>
      <div class="answer-section">
        <h4>分层解释</h4>
        <p>${escapeHtml(result.explanation)}</p>
      </div>
      <div class="answer-section">
        <h4>例子</h4>
        <p>${escapeHtml(result.example)}</p>
      </div>
      <div class="answer-section">
        <h4>常见误区</h4>
        <div class="tag-row">
          ${result.commonMistakes.map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join("")}
        </div>
      </div>
      <div class="answer-section">
        <h4>理解检查</h4>
        <p>${escapeHtml(result.checkQuestion)}</p>
      </div>
      <div class="tag-row">
        ${result.followups.map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join("")}
      </div>
    `;
  }

  function runQuestionAnswer() {
    const result = core.answerQuestion($("#qaQuestion").value, $("#qaChapter").value, $("#qaMode").value);
    renderAnswer(result);
  }

  function renderTwosComplement(result) {
    const status = result.overflow ? "status-error" : "status-good";
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
      const result = core.simulateTwosComplementAdd($("#twosX").value, $("#twosY").value, $("#twosBits").value);
      renderTwosComplement(result);
    } catch (error) {
      $("#twosResult").innerHTML = `<div class="status-error">${escapeHtml(error.message)}</div>`;
    }
  }

  function renderCache(result) {
    $("#cacheResult").innerHTML = `
      <div class="status-good">${escapeHtml(result.explanation)}</div>
      <div class="cache-fields">
        <div class="cache-field">
          <strong>Tag (${result.tagBits} 位)</strong>
          <code>${escapeHtml(result.tagBinary || "0")}</code>
          <span>十进制 ${result.tag}</span>
        </div>
        <div class="cache-field">
          <strong>Index (${result.indexBits} 位)</strong>
          <code>${escapeHtml(result.indexBinary || "0")}</code>
          <span>第 ${result.index} 行</span>
        </div>
        <div class="cache-field">
          <strong>Offset (${result.offsetBits} 位)</strong>
          <code>${escapeHtml(result.offsetBinary || "0")}</code>
          <span>块内偏移 ${result.offset}</span>
        </div>
      </div>
      <div class="answer-section">
        <h4>完整地址</h4>
        <p>${result.addressHex} = <code>${result.fullBinary}</code>，主存块号为 ${result.blockNumber}。</p>
      </div>
      <div class="table-wrap" style="margin-top: 12px;">
        <table>
          <thead>
            <tr>
              <th>Cache 行</th>
              <th>有效位</th>
              <th>Tag</th>
              <th>主存块</th>
              <th>块内偏移</th>
            </tr>
          </thead>
          <tbody>
            ${result.rows
              .map(
                (row) => `
                  <tr class="${row.active ? "active-row" : ""}">
                    <td>${row.line}</td>
                    <td>${row.valid ? 1 : 0}</td>
                    <td>${escapeHtml(row.tag)}</td>
                    <td>${row.block}</td>
                    <td>${row.offset}</td>
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
      const result = core.simulateCacheAddress({
        address: $("#cacheAddress").value,
        addressBits: $("#cacheAddressBits").value,
        lines: $("#cacheLines").value,
        blockSize: $("#cacheBlockSize").value,
      });
      renderCache(result);
    } catch (error) {
      $("#cacheResult").innerHTML = `<div class="status-error">${escapeHtml(error.message)}</div>`;
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

  function submitDiagnosis() {
    const result = core.diagnosePractice($("#diagQuestion").value, $("#diagAnswer").value);
    $("#diagResult").innerHTML = `
      <div class="${result.correct ? "status-good" : "status-warn"}">
        ${result.correct ? "回答正确" : "需要修正"}，得分 ${Math.round(result.score * 100)}。
      </div>
      <div class="answer-section" style="margin-top: 12px;">
        <h4>第一处关键反馈</h4>
        <p>${escapeHtml(result.firstError)}</p>
      </div>
      <div class="answer-section">
        <h4>提示</h4>
        <p>${escapeHtml(result.feedback)}</p>
      </div>
      <div class="answer-section">
        <h4>推荐练习</h4>
        <p>${escapeHtml(result.recommendation)}</p>
      </div>
    `;
  }

  function bindEvents() {
    $all("[data-section]").forEach((button) => {
      button.addEventListener("click", () => setSection(button.dataset.section));
    });
    $("#askButton").addEventListener("click", runQuestionAnswer);
    $("#twosRun").addEventListener("click", runTwosComplement);
    $("#cacheRun").addEventListener("click", runCache);
    $("#pipelineRun").addEventListener("click", runPipeline);
    $("#assemblyLoad").addEventListener("click", loadAssembly);
    $("#assemblyPrev").addEventListener("click", () => stepAssembly(-1));
    $("#assemblyNext").addEventListener("click", () => stepAssembly(1));
    $("#assemblyReset").addEventListener("click", resetAssembly);
    $("#diagSubmit").addEventListener("click", submitDiagnosis);
  }

  function boot() {
    renderChapters();
    bindEvents();
    runQuestionAnswer();
    runTwosComplement();
    runCache();
    runPipeline();
    loadAssembly();
    submitDiagnosis();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();

