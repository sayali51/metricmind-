import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import streamlit as st
from query_engine.query_engine import answer_question
from query_engine.dashboard_data import (
    get_kpi_summary,
    get_revenue_by_region,
    get_revenue_by_category,
    get_monthly_revenue_trend,
)

st.set_page_config(page_title="MetricMind", page_icon="📊", layout="wide")

st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');

    html, body, [class*="css"]  {
        font-family: 'Inter', sans-serif;
    }

    .main .block-container {
        padding-top: 2rem;
        padding-bottom: 3rem;
        max-width: 1150px;
    }

    /* Hero title */
    .hero-title {
        font-size: 2.6rem;
        font-weight: 800;
        background: linear-gradient(90deg, #7C5CFF 0%, #33D6FF 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 0;
    }
    .hero-sub {
        color: #9A9AB0;
        font-size: 1.02rem;
        margin-top: 4px;
        margin-bottom: 1.5rem;
    }

    /* KPI metric cards */
    div[data-testid="stMetric"] {
        background: linear-gradient(160deg, #1A1A24 0%, #15151E 100%);
        border: 1px solid #2A2A3A;
        border-radius: 14px;
        padding: 18px 20px;
        box-shadow: 0 4px 14px rgba(0,0,0,0.25);
    }
    div[data-testid="stMetric"] label {
        color: #9A9AB0 !important;
        font-weight: 600;
        font-size: 0.85rem !important;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    div[data-testid="stMetricValue"] {
        color: #F0F0F5 !important;
        font-weight: 700;
    }

    /* Section headers */
    h3 {
        color: #F0F0F5 !important;
        font-weight: 700 !important;
        border-left: 3px solid #7C5CFF;
        padding-left: 10px;
    }

    /* Sidebar buttons */
    section[data-testid="stSidebar"] button {
        background-color: #1A1A24 !important;
        border: 1px solid #2A2A3A !important;
        color: #E0E0EA !important;
        border-radius: 8px !important;
        text-align: left !important;
    }
    section[data-testid="stSidebar"] button:hover {
        border-color: #7C5CFF !important;
        color: #7C5CFF !important;
    }

    /* Primary action button */
    div.stButton > button[kind="primary"] {
        background: linear-gradient(90deg, #7C5CFF 0%, #6247D9 100%);
        border: none;
        border-radius: 8px;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(124, 92, 255, 0.3);
    }
    div.stButton > button[kind="primary"]:hover {
        box-shadow: 0 6px 18px rgba(124, 92, 255, 0.45);
    }

    /* Tabs */
    button[data-baseweb="tab"] {
        font-weight: 600;
        font-size: 1rem;
    }

    /* Expander / info boxes */
    div[data-testid="stExpander"] {
        border: 1px solid #2A2A3A;
        border-radius: 10px;
        background-color: #15151E;
    }

    /* Chat bubbles */
    div[data-testid="stChatMessage"] {
        background-color: #15151E;
        border: 1px solid #2A2A3A;
        border-radius: 12px;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

EXAMPLE_QUESTIONS = [
    "What's total sales in South?",
    "What's total profit in North?",
    "How many high value orders are there?",
    "How many loss-making orders are there?",
    "What's the overall profit margin?",
]


def set_question(q):
    st.session_state["question_input"] = q


with st.sidebar:
    st.markdown("### 📊 MetricMind")
    st.caption("Governed metrics, powered by Cube.dev + LangChain")
    st.markdown("---")
    st.markdown("**Try asking:**")
    for q in EXAMPLE_QUESTIONS:
        st.button(q, use_container_width=True, key=f"sidebar_{q}", on_click=set_question, args=(q,))
    st.markdown("---")
    with st.expander("How it works"):
        st.markdown(
            "1. You ask a question in plain English\n"
            "2. An LLM picks **one governed metric** — it never calculates numbers itself\n"
            "3. The metric runs against Cube.dev's semantic layer\n"
            "4. You get a consistent, auditable answer"
        )

st.markdown('<p class="hero-title">MetricMind</p>', unsafe_allow_html=True)
st.markdown(
    '<p class="hero-sub">Governed metrics chat, backed by a real Cube.dev semantic layer — every number is traceable, none are guessed.</p>',
    unsafe_allow_html=True,
)

tab_dashboard, tab_chat = st.tabs(["📈  Dashboard", "💬  Ask a Question"])

# --- DASHBOARD TAB ---
with tab_dashboard:
    try:
        kpis = get_kpi_summary()
    except Exception as e:
        kpis = {}
        st.error(f"⚠️ Couldn't load dashboard data — is Cube.dev running? ({e})")

    if kpis:
        col1, col2, col3, col4 = st.columns(4)
        col1.metric("Total Revenue", f"${kpis['revenue']:,.0f}")
        col2.metric("Total Profit", f"${kpis['profit']:,.0f}")
        col3.metric("Total Orders", f"{kpis['orders']:,}")
        col4.metric("High-Value Orders", f"{kpis['high_value_orders']:,}")

        st.write("")
        chart_col1, chart_col2 = st.columns(2)

        with chart_col1:
            st.markdown("### Revenue by Region")
            region_df = get_revenue_by_region()
            if not region_df.empty:
                st.bar_chart(region_df["Revenue"], color="#7C5CFF")

        with chart_col2:
            st.markdown("### Revenue by Category")
            category_df = get_revenue_by_category()
            if not category_df.empty:
                st.bar_chart(category_df["Revenue"], color="#33D6FF")

        st.markdown("### Monthly Revenue Trend")
        trend_df = get_monthly_revenue_trend()
        if not trend_df.empty:
            st.line_chart(trend_df["Revenue"], color="#7C5CFF")
        else:
            st.info("No time-series data available yet.")

# --- CHAT TAB ---
with tab_chat:
    if "history" not in st.session_state:
        st.session_state.history = []

    question = st.text_input("Ask a question:", key="question_input", placeholder="e.g. What's total profit in North?")
    run_clicked = st.button("Run Query", type="primary")

    if run_clicked and question.strip():
        with st.spinner("Thinking..."):
            result = answer_question(question)
        st.session_state.history.append((question, result))

    if st.session_state.history:
        q, result = st.session_state.history[-1]
        with st.chat_message("user"):
            st.markdown(q)
        with st.chat_message("assistant"):
            answer_text = result.get("answer", "")
            tool_used = result.get("tool_used")
            if answer_text.startswith("Cube.dev isn't reachable") or "Cube query failed" in answer_text:
                st.error(f"⚠️ {answer_text}")
            elif tool_used is None:
                st.warning(answer_text)
            else:
                st.markdown(f"**{answer_text}**")
                st.caption(f"🔍 Calculated using governed metric: `{tool_used}`")
    else:
        st.info("No questions yet — try one from the sidebar, or type your own above.")