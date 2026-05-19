"""
Musashi One GPT — HTTP API bridge between the static JS frontend and the Python RAG backend.

Endpoints:
    POST /chat   { query, history, agent_label } → SSE stream of text tokens
    GET  /health → { "ok": true }

Run (from project root):
    .venv\\Scripts\\python.exe -m uvicorn api:app --app-dir backend --port 8501 --reload
"""

import json
import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).resolve().parent))

from hr_agent.retrieval.retriever import retrieve
from hr_agent.chat.agent import stream_response, chunks_to_sources

app = FastAPI(title="Musashi One GPT API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


class ChatRequest(BaseModel):
    query: str
    history: list[dict] = []       # Claude messages format: [{role, content}, ...]
    agent_label: str = "HR Policy Agent"


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/chat")
def chat(req: ChatRequest):
    chunks = retrieve(req.query)

    def generate():
        # Send sources metadata as the first SSE event so the frontend can display citations
        sources = chunks_to_sources(chunks)
        yield f"data: {json.dumps({'sources': sources})}\n\n"

        for text in stream_response(req.history, req.query, chunks):
            yield f"data: {json.dumps({'text': text})}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
