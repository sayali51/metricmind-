"""
Owner: UI/Dashboard

Fetches structured data from Cube.dev for the dashboard view — separate
from query_engine.py's chat tools, since dashboard queries always run
(not chosen by an LLM) and often need grouped/multi-row results rather
than a single number.

Each function returns a pandas DataFrame, ready to hand to a Streamlit
chart.
"""

import os
import requests
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

CUBE_API_URL = os.getenv("CUBE_API_URL", "http://localhost:4000/cubejs-api/v1/load")
CUBE_API_TOKEN = os.getenv("CUBE_API_TOKEN", "")


def _run_cube_query(payload: dict) -> list[dict]:
    headers = {}
    if CUBE_API_TOKEN:
        headers["Authorization"] = CUBE_API_TOKEN
    response = requests.post(
        CUBE_API_URL, json={"query": payload}, headers=headers, timeout=15
    )
    response.raise_for_status()
    return response.json()["data"]


def get_kpi_summary() -> dict:
    """Single-row summary for the top KPI cards: revenue, profit, orders, margin-relevant figures."""
    data = _run_cube_query({
        "measures": [
            "sales.revenue",
            "sales.profit",
            "sales.orders",
            "sales.high_value_orders",
            "sales.loss_orders",
        ]
    })
    if not data:
        return {}
    row = data[0]
    return {
        "revenue": float(row.get("sales.revenue", 0)),
        "profit": float(row.get("sales.profit", 0)),
        "orders": int(float(row.get("sales.orders", 0))),
        "high_value_orders": int(float(row.get("sales.high_value_orders", 0))),
        "loss_orders": int(float(row.get("sales.loss_orders", 0))),
    }


def get_revenue_by_region() -> pd.DataFrame:
    """Revenue grouped by region, for a bar chart."""
    data = _run_cube_query({
        "measures": ["sales.revenue"],
        "dimensions": ["sales.region"],
        "order": {"sales.revenue": "desc"},
    })
    df = pd.DataFrame(data)
    if df.empty:
        return df
    df = df.rename(columns={"sales.region": "Region", "sales.revenue": "Revenue"})
    df["Revenue"] = df["Revenue"].astype(float)
    return df.set_index("Region")


def get_revenue_by_category() -> pd.DataFrame:
    """Revenue grouped by category, for a bar chart."""
    data = _run_cube_query({
        "measures": ["sales.revenue"],
        "dimensions": ["sales.category"],
        "order": {"sales.revenue": "desc"},
    })
    df = pd.DataFrame(data)
    if df.empty:
        return df
    df = df.rename(columns={"sales.category": "Category", "sales.revenue": "Revenue"})
    df["Revenue"] = df["Revenue"].astype(float)
    return df.set_index("Category")


def get_monthly_revenue_trend() -> pd.DataFrame:
    """Revenue over time by month, for a line chart."""
    data = _run_cube_query({
        "measures": ["sales.revenue"],
        "timeDimensions": [{"dimension": "sales.order_date", "granularity": "month"}],
        "order": {"sales.order_date": "asc"},
    })
    df = pd.DataFrame(data)
    if df.empty:
        return df
    date_col = [c for c in df.columns if "order_date" in c][0]
    df = df.rename(columns={date_col: "Month", "sales.revenue": "Revenue"})
    df["Month"] = pd.to_datetime(df["Month"]).dt.strftime("%b %Y")
    df["Revenue"] = df["Revenue"].astype(float)
    return df.set_index("Month")

def get_kpi_summary() -> dict:
    data = _run_cube_query({
        "measures": [
            "sales.revenue",
            "sales.profit",
            "sales.orders",
            "sales.high_value_orders",
            "sales.loss_orders",
            "sales.profit_margin",
        ]
    })
    if not data:
        return {}
    row = data[0]
    return {
        "revenue": float(row.get("sales.revenue", 0)),
        "profit": float(row.get("sales.profit", 0)),
        "orders": int(float(row.get("sales.orders", 0))),
        "high_value_orders": int(float(row.get("sales.high_value_orders", 0))),
        "loss_orders": int(float(row.get("sales.loss_orders", 0))),
        "profit_margin": float(row.get("sales.profit_margin", 0)),
    }