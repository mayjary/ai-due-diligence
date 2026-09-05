"""Minimal FastAPI application for health and due-diligence queries."""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

import retrieve
from dd_copilot.pipeline import CopilotPipeline
from dd_copilot.schemas import CopilotAnswer

app = FastAPI(title="AI Due Diligence Copilot")
_pipeline = None

class AskRequest(BaseModel):
    question: str
    company: str | None = None

def _get_pipeline():
    global _pipeline
    if _pipeline is None:
        _pipeline = CopilotPipeline(vector_store=retrieve.get_vector_store())
    return _pipeline

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/ask", response_model=CopilotAnswer)
def ask(request: AskRequest):
    try:
        return _get_pipeline().ask(request.question, request.company)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Copilot query failed") from exc
