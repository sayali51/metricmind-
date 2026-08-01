"""
MetricMind API — thin FastAPI wrapper around the existing LangChain agent.

This does NOT reimplement any agent logic. It imports the same
`answer_question` function that the Streamlit app used, so the governed
metrics behavior is identical — only the delivery mechanism changes
(REST/JSON over HTTP instead of a Streamlit page).

Run from the project root:
    pip install fastapi uvicorn
    uvicorn api.main:app --reload --port 8000
"""

import os
import sys

# Make the project root importable so `from query_engine.query_engine import ...` works
# regardless of which directory uvicorn is launched from.
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from query_engine.query_engine import answer_question

app = FastAPI(title="MetricMind API")

# The Next.js dev server runs on :3000 by default.
# Add your deployed frontend's origin here too once you host it.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3002",
        "http://172.19.16.1:3002"
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    question: str


class TraceStep(BaseModel):
    name: str
    args: dict
    result: str


class ChatResponse(BaseModel):
    answer: str
    tool_used: bool
    trace: list[TraceStep]


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    question = req.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="question must not be empty")

    result = answer_question(question)

    return ChatResponse(
        answer=result.get("answer", ""),
        tool_used=bool(result.get("tool_used")),
        trace=result.get("trace") or [],
    )
