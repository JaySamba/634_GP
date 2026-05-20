"""
Vercel serverless entry point for Musashi One GPT API.

Routes:
    GET  /api/health → { "ok": true }
    POST /api/chat   → SSE stream of text tokens
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from hr_agent.retrieval.retriever import retrieve
from hr_agent.chat.agent import (
    stream_response, chunks_to_sources,
    create_conversation, load_history, list_conversations,
)

app = FastAPI(title="Musashi One GPT API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


class ChatRequest(BaseModel):
    query: str
    history: list[dict] = []
    agent_label: str = "HR Policy Agent"


@app.get("/api/conversations")
def list_convs(user_id: str = "default"):
    return list_conversations(user_id)


@app.post("/api/conversations")
def new_conv(body: dict):
    return {"id": create_conversation(body.get("user_id", "default"), body.get("title"))}


@app.get("/api/conversations/{conv_id}/messages")
def get_messages(conv_id: str):
    return load_history(conv_id)


@app.get("/api/health")
def health():
    return {"ok": True}


@app.post("/api/chat")
def chat(req: ChatRequest):
    chunks = retrieve(req.query)

    def generate():
        sources = chunks_to_sources(chunks)
        yield f"data: {json.dumps({'sources': sources})}\n\n"
        for text in stream_response(req.history, req.query, chunks):
            yield f"data: {json.dumps({'text': text})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
