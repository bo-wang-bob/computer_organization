"""Dependency-free HTTP server for local backend demos.

FastAPI remains the primary production-facing entry point. This module mirrors
the same core API with Python's standard library so the backend can be tried
immediately in environments where dependencies have not been installed yet.
"""

from __future__ import annotations

import argparse
import json
import mimetypes
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse

from . import core


PROJECT_ROOT = Path(__file__).resolve().parents[1]


class TeachingAgentHandler(SimpleHTTPRequestHandler):
    server_version = "TeachingAgentHTTP/0.2"

    def end_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self) -> None:
        self.send_response(HTTPStatus.NO_CONTENT)
        self.end_headers()

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/health":
            self.write_json({"status": "ok", "service": "computer-organization-agent", "version": "0.2.0"})
            return
        if path == "/api/chapters":
            self.write_json({"chapters": core.get_chapters()})
            return
        if path == "/api/knowledge":
            self.write_json({"items": core.get_knowledge_base()})
            return
        self.serve_static(path)

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        try:
            payload = self.read_json()
            result = self.dispatch_post(path, payload)
            self.write_json(result)
        except ValueError as error:
            self.write_json({"detail": str(error)}, HTTPStatus.BAD_REQUEST)
        except KeyError:
            self.write_json({"detail": f"Unknown API path: {path}"}, HTTPStatus.NOT_FOUND)
        except Exception as error:
            self.write_json({"detail": str(error)}, HTTPStatus.INTERNAL_SERVER_ERROR)

    def dispatch_post(self, path: str, payload: dict[str, Any]) -> Any:
        routes = {
            "/api/agent/dispatch": lambda: core.dispatch_agent(payload),
            "/api/agent/qa": lambda: core.answer_question(
                payload.get("question", ""), payload.get("chapterId", "all"), payload.get("mode", "standard")
            ),
            "/api/simulations/twos-complement": lambda: core.simulate_twos_complement_add(
                payload.get("x"), payload.get("y"), payload.get("bits", 8)
            ),
            "/api/simulations/cache": lambda: core.simulate_cache_address(payload),
            "/api/simulations/pipeline": lambda: core.simulate_pipeline(
                payload.get("program", ""), {"forwarding": payload.get("forwarding", True)}
            ),
            "/api/assembly/parse": lambda: {"instructions": core.parse_assembly(payload.get("program", ""))},
            "/api/assembly/execute": lambda: core.execute_assembly(payload.get("program", "")),
            "/api/assembly/step": lambda: core.assembly_snapshot(
                payload.get("program", ""), core.parse_integer(payload.get("cursor", 0))
            ),
            "/api/diagnosis/check": lambda: core.diagnose_practice(
                payload.get("questionId", ""), payload.get("answer", "")
            ),
        }
        if path not in routes:
            raise KeyError(path)
        return routes[path]()

    def read_json(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length == 0:
            return {}
        raw = self.rfile.read(length).decode("utf-8")
        data = json.loads(raw)
        if not isinstance(data, dict):
            raise ValueError("JSON body must be an object")
        return data

    def write_json(self, payload: Any, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def serve_static(self, path: str) -> None:
        relative = "index.html" if path in {"", "/"} else unquote(path).lstrip("/")
        target = (PROJECT_ROOT / relative).resolve()
        if not str(target).startswith(str(PROJECT_ROOT.resolve())) or not target.is_file():
            self.write_json({"detail": "Not found"}, HTTPStatus.NOT_FOUND)
            return

        content_type = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        body = target.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the local teaching agent backend server.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=8000, type=int)
    args = parser.parse_args()

    httpd = ThreadingHTTPServer((args.host, args.port), TeachingAgentHandler)
    print(f"Serving teaching agent backend at http://{args.host}:{args.port}/")
    httpd.serve_forever()


if __name__ == "__main__":
    main()
