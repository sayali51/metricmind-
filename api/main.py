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
from query_engine.dashboard_data import (
    get_kpi_summary,
    get_revenue_by_region,
    get_revenue_by_category,
    get_monthly_revenue_trend,
)

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
        "http://172.19.16.1:3002",
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


class ChartPoint(BaseModel):
    label: str
    value: float


class DashboardResponse(BaseModel):
    kpis: dict
    revenue_by_region: list[ChartPoint]
    revenue_by_category: list[ChartPoint]
    monthly_revenue_trend: list[ChartPoint]
    error: str | None = None


@app.get("/api/health")
def health():
    return {"status": "ok"}


def _df_to_points(df, label_col: str, value_col: str) -> list[dict]:
    """Convert a dashboard_data DataFrame (indexed by label_col) into
    [{label, value}, ...] JSON points the frontend chart components expect."""
    if df is None or df.empty:
        return []
    return [
        {"label": str(idx), "value": float(row[value_col])}
        for idx, row in df.iterrows()
    ]


@app.get("/api/dashboard", response_model=DashboardResponse)
def dashboard():
    """Aggregated data for the dashboard view: top KPI cards + three charts.
    Always returns 200 — if Cube.dev is unreachable, `error` is set and every
    other field comes back empty so the frontend can render a clear message
    instead of a broken page.
    """
    try:
        kpis = get_kpi_summary()
        region_df = get_revenue_by_region()
        category_df = get_revenue_by_category()
        trend_df = get_monthly_revenue_trend()

        return DashboardResponse(
            kpis=kpis,
            revenue_by_region=_df_to_points(region_df, "Region", "Revenue"),
            revenue_by_category=_df_to_points(category_df, "Category", "Revenue"),
            monthly_revenue_trend=_df_to_points(trend_df, "Month", "Revenue"),
        )
    except Exception as e:
        return DashboardResponse(
            kpis={},
            revenue_by_region=[],
            revenue_by_category=[],
            monthly_revenue_trend=[],
            error=f"Couldn't load dashboard data — is Cube.dev running? ({e})",
        )


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