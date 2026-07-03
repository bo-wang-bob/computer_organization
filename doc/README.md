# 计算机组成原理网页端教学智能体

这是一个面向《计算机组成原理》课程的网页端教学智能体 MVP。当前版本包含可独立打开的前端页面，以及一套 FastAPI 后端接口，用于承载确定性规则推演、汇编执行和学习诊断。

## 已实现功能

- 章节知识问答：基于内置知识点进行本地检索和结构化回答。
- 补码推演：展示补码表示、二进制相加、逐位进位和溢出判断。
- Cache 仿真：支持直接映射 Cache 的 Tag、Index、Offset 地址划分。
- 流水线推演：生成 IF、ID、EX、MEM、WB 周期表，并提示基础 RAW/load-use 冒险。
- 汇编解释：支持 `MOV`、`ADD`、`SUB`、`li`、`addi`、`add`、`sub`、`lw`、`sw` 的逐步执行。
- 学习诊断：对典型练习答案给出错因、提示和练习建议。
- 后端 API：提供问答、仿真、汇编和诊断接口，并可托管当前前端页面。
- 大模型智能体：接入 DeepSeek V4，提供总控调度、课程问答、推演、汇编解释和学习诊断子智能体。

## 如何运行

前端静态预览可以直接用浏览器打开：

```text
index.html
```

后端服务使用 Docker 启动：

```powershell
docker compose up -d --build
```

Docker Compose 默认映射到本机 `http://127.0.0.1:8001/`。

后端测试也在 Docker 容器中运行：

```powershell
docker compose exec -T comporg-agent python -m unittest tests.test_backend_core tests.test_agents
```

启动后访问 `http://127.0.0.1:8001/`，接口文档位于 `http://127.0.0.1:8001/docs`。

如果暂时不想安装依赖，也可以使用标准库服务预览：

```bash
python -m backend.simple_server --host 127.0.0.1 --port 8000
```

## 如何测试

前端核心规则测试：

```bash
node tests/core.test.js
```

后端核心规则测试：

```bash
python -m unittest tests.test_backend_core
```

测试覆盖补码、Cache、流水线、汇编执行、学习诊断和后端路由调度核心。

## 主要文件

```text
index.html
styles.css
requirements.txt
environment.yml
src/core.js
src/app.js
tests/core.test.js
tests/test_backend_core.py
backend/
  agents.py
  config.py
  core.py
  llm.py
  app.py
  simple_server.py
scripts/
  setup_conda_env.ps1
  run_fastapi.ps1
  test_backend.ps1
doc/
  README.md
  IMPLEMENTATION_PLAN.md
  WEB_AGENT_DESIGN.md
  BACKEND_API.md
  网页端计算机组成原理教学智能体设计流程.md
```

## 后续建议

- 将内置知识点迁移到 `knowledge-base/` 目录。
- 扩展更多规则工具，让大模型继续只负责教学解释，补码、Cache、流水线、汇编执行仍由规则程序计算。
- API Key 应放在后端环境变量中，不应保存在前端或仓库配置文件中。
