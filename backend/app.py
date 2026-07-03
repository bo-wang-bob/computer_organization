"""FastAPI entry point for the teaching agent backend."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import agents, core


PROJECT_ROOT = Path(__file__).resolve().parents[1]


app = FastAPI(
    title="Computer Organization Teaching Agent API",
    version="0.2.0",
    description="Rule-based backend for QA retrieval, simulations, assembly tracing, and learning diagnosis.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QARequest(BaseModel):
    question: str = Field(..., min_length=1)
    chapterId: str = "all"
    mode: str = "standard"


class DispatchRequest(BaseModel):
    message: str = Field(..., min_length=1)
    chapterId: str = "all"
    mode: str = "standard"


class AgentChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    agentId: str = "auto"
    chapterId: str = "all"
    mode: str = "standard"
    useLLM: bool = True
    toolInput: dict[str, Any] = Field(default_factory=dict)


class TwosComplementRequest(BaseModel):
    x: int | str
    y: int | str
    bits: int | str = 8


class CacheRequest(BaseModel):
    address: int | str
    addressBits: int | str = 12
    lines: int | str = 16
    blockSize: int | str = 4


class PipelineRequest(BaseModel):
    program: str = Field(..., min_length=1)
    forwarding: bool = True


class AssemblyRequest(BaseModel):
    program: str = Field(..., min_length=1)


class AssemblyStepRequest(AssemblyRequest):
    cursor: int = 0


class DiagnosisRequest(BaseModel):
    questionId: str
    answer: str


def call_tool(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "computer-organization-agent", "version": app.version}


@app.get("/api/chapters")
def chapters() -> dict[str, Any]:
    return {"chapters": core.get_chapters()}


@app.get("/api/knowledge")
def knowledge() -> dict[str, Any]:
    return {"items": core.get_knowledge_base()}


@app.get("/api/agents")
def available_agents() -> dict[str, Any]:
    return {"agents": agents.list_agents()}


@app.get("/api/agent/status")
def agent_status() -> dict[str, Any]:
    return agents.llm_status()


@app.post("/api/agent/qa")
def agent_qa(request: QARequest) -> dict[str, Any]:
    return call_tool(core.answer_question, request.question, request.chapterId, request.mode)


@app.post("/api/agent/dispatch")
def agent_dispatch(request: DispatchRequest) -> dict[str, Any]:
    return call_tool(core.dispatch_agent, request.model_dump())


@app.post("/api/agent/chat")
def agent_chat(request: AgentChatRequest) -> dict[str, Any]:
    return call_tool(agents.run_agent, request.model_dump())


@app.post("/api/simulations/twos-complement")
def twos_complement(request: TwosComplementRequest) -> dict[str, Any]:
    return call_tool(core.simulate_twos_complement_add, request.x, request.y, request.bits)


@app.post("/api/simulations/cache")
def cache(request: CacheRequest) -> dict[str, Any]:
    return call_tool(core.simulate_cache_address, request.model_dump())


@app.post("/api/simulations/pipeline")
def pipeline(request: PipelineRequest) -> dict[str, Any]:
    return call_tool(core.simulate_pipeline, request.program, {"forwarding": request.forwarding})


@app.post("/api/assembly/parse")
def assembly_parse(request: AssemblyRequest) -> dict[str, Any]:
    return {"instructions": call_tool(core.parse_assembly, request.program)}


@app.post("/api/assembly/execute")
def assembly_execute(request: AssemblyRequest) -> dict[str, Any]:
    return call_tool(core.execute_assembly, request.program)


@app.post("/api/assembly/step")
def assembly_step(request: AssemblyStepRequest) -> dict[str, Any]:
    return call_tool(core.assembly_snapshot, request.program, request.cursor)


@app.post("/api/diagnosis/check")
def diagnosis(request: DiagnosisRequest) -> dict[str, Any]:
    return call_tool(core.diagnose_practice, request.questionId, request.answer)


app.mount("/", StaticFiles(directory=PROJECT_ROOT, html=True), name="frontend")
