# 计组教学辅助平台

这是一个面向《计算机组成原理》课程的网页端教学辅助平台。平台以“知识点可视化展示、规则化推演、交互式仿真和教学解释”为核心定位，前端提供推荐功能入口与多类仿真实验，后端提供 FastAPI 接口，用于承载大模型知识问答、确定性规则推演和汇编执行。

## 已实现功能

- 推荐功能：首页每次刷新从已有功能中随机推荐 3 个学习入口。
- 知识问答：接入 DeepSeek V4 问答能力，结合课程知识检索生成结构化解释。
- 补码与浮点推演：展示补码表示、二进制相加、逐位进位、溢出判断和 IEEE 754 单精度拆解。
- 缓存仿真：支持直接映射缓存的 Tag、Index、Offset 地址划分。
- 虚存仿真：展示地址转换、页面置换和缺页过程。
- 存储读写：可视化 MAR、MDR、地址译码、字线/列线和读写控制过程。
- 存储扩展：根据芯片规格和目标容量生成位扩展、字扩展与片选关系。
- 流水线推演：生成 IF、ID、EX、MEM、WB 周期表，并提示基础 RAW/load-use 冒险。
- CPU 数据通路：动态展示单周期 CPU 数据通路、控制信号、阶段说明和寄存器/内存状态。
- 汇编解释：支持 `MOV`、`ADD`、`SUB`、`li`、`addi`、`add`、`sub`、`lw`、`sw` 的逐步执行。
- 后端 API：提供知识问答、仿真和汇编接口，并可托管当前前端页面。

## 如何运行

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

## 如何测试

前端核心规则测试：

```bash
node tests/core.test.js
```

后端核心规则测试：

```bash
python -m unittest tests.test_backend_core
```

测试覆盖补码、缓存、流水线、汇编执行、数据通路仿真和后端教学辅助调度核心。

## 主要文件

```text
index.html
styles.css
requirements.txt
Dockerfile
docker-compose.yml
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
doc/
  README.md
  IMPLEMENTATION_PLAN.md
  网页端计组教学辅助平台设计流程.md
```

## 后续建议

- 将内置知识点迁移到 `knowledge-base/` 目录。
- 扩展更多规则工具，让大模型继续只负责教学解释，补码、Cache、流水线、数据通路、汇编执行仍由规则程序计算。
- API Key 应放在后端环境变量中，不应保存在前端或仓库配置文件中。
