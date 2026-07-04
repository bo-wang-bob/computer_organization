# 计组教学辅助平台当前进度

## 1. 当前状态

当前版本已经形成 Docker 运行的网页端计组教学辅助平台，并接入 DeepSeek V4 知识问答能力。平台定位是辅助《计算机组成原理》课程教学：用规则程序保证计算正确，用前端可视化展示知识过程，用大模型生成教学解释。页面保留的主要学习入口包括：

- 推荐功能：首页每次刷新从已有功能中随机推荐 3 个入口。
- 知识问答：由 DeepSeek V4 问答能力生成教学解释。
- 补码与浮点推演：由规则程序计算补码表示、逐位进位、结果、溢出和 IEEE 754 单精度过程。
- 缓存仿真：支持直接映射缓存地址的 Tag、Index、Offset 拆分。
- 虚存仿真：支持页面置换、地址转换和缺页过程展示。
- 存储读写：逐步展示地址、数据、译码、字线/列线和读写控制。
- 存储扩展：根据芯片规格和目标容量生成扩展结构。
- 流水线推演：生成 IF、ID、EX、MEM、WB 周期表，并提示基础 RAW 冒险。
- CPU 数据通路：动态展示单周期 CPU 数据通路、控制信号和阶段数据流。
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
- 教学辅助接口：`/api/agent/chat`、`/api/agents`、`/api/agent/status`。
- 规则工具接口：补码、浮点、缓存、虚存、存储读写、存储扩展、流水线、数据通路、汇编解析与执行。
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
  网页端计组教学辅助平台设计流程.md
```

## 5. 下一步建议

- 将内置知识点迁移到独立 `knowledge-base/` 目录。
- 为知识问答增加引用来源和知识点标签。
- 继续扩展缓存、流水线、数据通路等规则工具。
- 为教师端增加题库配置和课堂演示视图。
