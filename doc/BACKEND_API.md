# 后端 API 说明

本后端为《计算机组成原理》网页端教学智能体提供规则化能力：章节问答检索、补码推演、Cache 地址划分、流水线推演、汇编逐步执行和学习诊断。

## 启动方式

推荐使用项目 Conda 环境：

```powershell
.\scripts\setup_conda_env.ps1
```

启动服务：

```powershell
.\scripts\run_fastapi.ps1
```

如果暂时没有安装 FastAPI，也可以使用无第三方依赖的本地服务入口：

```bash
python -m backend.simple_server --host 127.0.0.1 --port 8000
```

启动后访问：

```text
http://127.0.0.1:8000/
http://127.0.0.1:8000/docs
```

其中 `/docs` 由 FastAPI 提供；使用轻量服务入口时，请参考本文件中的接口清单。

当前版本不在仓库中保存 API Key。后续接入大模型时，请从环境变量读取密钥。

## 接口清单

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查 |
| GET | `/api/chapters` | 章节列表 |
| GET | `/api/knowledge` | 内置知识点 |
| POST | `/api/agent/qa` | 章节知识问答 |
| POST | `/api/agent/dispatch` | 简单意图识别与工具建议 |
| POST | `/api/simulations/twos-complement` | 补码加法推演 |
| POST | `/api/simulations/cache` | 直接映射 Cache 地址划分 |
| POST | `/api/simulations/pipeline` | 五级流水线周期表与冒险提示 |
| POST | `/api/assembly/parse` | 汇编解析 |
| POST | `/api/assembly/execute` | 汇编逐步执行 |
| POST | `/api/assembly/step` | 获取指定步骤的寄存器/内存快照 |
| POST | `/api/diagnosis/check` | 学习诊断反馈 |

## 请求示例

章节问答：

```json
{
  "question": "为什么补码可以把减法变成加法？",
  "chapterId": "all",
  "mode": "exam"
}
```

补码推演：

```json
{
  "x": 5,
  "y": -3,
  "bits": 8
}
```

Cache 地址划分：

```json
{
  "address": "0x3A7",
  "addressBits": 12,
  "lines": 16,
  "blockSize": 4
}
```

汇编执行：

```json
{
  "program": "addi x1, x0, 5\naddi x2, x0, 7\nadd x3, x1, x2\nsw x3, 0(x0)\nlw x4, 0(x0)"
}
```
