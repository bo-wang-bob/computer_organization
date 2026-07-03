# 网页端教学智能体当前进度

## 1. 当前状态

当前版本已经形成 Docker 运行的网页端教学工作台，并接入 DeepSeek V4 知识问答智能体。页面保留的主要学习入口包括：

- 知识问答：由 DeepSeek V4 知识问答智能体生成教学解释。
- 补码推演：由规则程序计算补码表示、逐位进位、结果和溢出。
- 缓存仿真：支持直接映射缓存地址的 Tag、Index、Offset 拆分。
- 流水线推演：生成 IF、ID、EX、MEM、WB 周期表，并提示基础 RAW 冒险。
- 汇编解释：支持简化 MOV/ADD/SUB 与 RISC-V 常用 add/addi/sub/lw/sw。

## 2. 当前运行方式

项目统一使用 Docker 环境运行：

```powershell
docker compose up -d --build
```

访问地址：

```text
http://127.0.0.1:8001/
```

## 3. 已完成的后端能力

- DeepSeek V4 配置读取：优先环境变量，其次读取本地 `configs.yaml`。
- 智能体接口：`/api/agent/chat`、`/api/agents`、`/api/agent/status`。
- 规则工具接口：补码、缓存、流水线、汇编解析与执行。
- API Key 防泄漏：`configs.yaml` 已被 Git 和 Docker 构建忽略。

## 4. 当前文件结构

```text
index.html
styles.css
Dockerfile
docker-compose.yml
requirements.txt
src/
  core.js
  app.js
backend/
  agents.py
  app.py
  config.py
  core.py
  llm.py
tests/
  core.test.js
  test_agents.py
  test_backend_core.py
doc/
  README.md
  IMPLEMENTATION_PLAN.md
  网页端计算机组成原理教学智能体设计流程.md
```

## 5. 下一步建议

- 将内置知识点迁移到独立 `knowledge-base/` 目录。
- 为知识问答增加引用来源和知识点标签。
- 继续扩展缓存、流水线、数据通路等规则工具。
- 为教师端增加题库配置和课堂演示视图。
