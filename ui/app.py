import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import streamlit as st
from query_engine.query_engine import answer_question

st.set_page_config(
    page_title="MetricMind",
    page_icon="🧠",
    layout="centered",
)

st.markdown(
    """
    <style>
    .main .block-container {
        padding-top: 2rem;
        max-width: 800px;
    }
    div[data-testid="stExpander"] {
        border: 1px solid #e0e0e0;
        border-radius: 8px;
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
    "Why is profit low in the Central region?",
]

with st.sidebar:
    st.header(" MetricMind")
    st.caption("Governed metrics chat, powered by Cube.dev + LangChain")

    st.subheader("Try asking:")
    for q in EXAMPLE_QUESTIONS:
        if st.button(q, use_container_width=True, key=f"sidebar_{q}"):
            st.session_state["pending_question"] = q

    st.divider()
    st.subheader("How it works")
    st.markdown(
        "1. You ask a question in plain English\n"
        "2. An LLM picks a **governed metric tool** — it never calculates numbers itself\n"
        "3. For diagnostic questions, it can chain up to 4 tool calls to drill "
        "into the root cause (region → category, etc.)\n"
        "4. Every tool call runs against Cube.dev's semantic layer\n"
        "5. You get a consistent, auditable answer — with the full query trace visible"
    )

    st.divider()
    if st.button(" Clear conversation", use_container_width=True):
        st.session_state.history = []
        st.rerun()

st.title("MetricMind — Governed Metrics Chat")
st.caption("Ask a business question. Every answer comes from governed metric definitions — with full drill-down transparency.")

if "history" not in st.session_state:
    st.session_state.history = []

default_value = st.session_state.pop("pending_question", "")

question = st.text_input("Ask a question:", value=default_value)
run_clicked = st.button("Run Query", type="primary")

if run_clicked and question and question.strip():
    with st.spinner("Thinking..."):
        result = answer_question(question)
    st.session_state.history.append((question, result))

if not st.session_state.history:
    st.info("No questions yet — try one from the sidebar, or type your own above.")

for q, result in reversed(st.session_state.history):
    with st.chat_message("user"):
        st.markdown(q)

    with st.chat_message("assistant"):
        answer_text = result.get("answer", "")
        tools_used = result.get("tool_used")
        trace = result.get("trace") or []

        if answer_text.startswith("Cube.dev isn't reachable") or "Cube query failed" in answer_text:
            st.error(f"⚠️ {answer_text}")
        elif not tools_used:
            st.warning(answer_text)
        else:
            st.markdown(f"**{answer_text}**")

            if len(trace) == 1:
                st.caption(f" Calculated using governed metric: `{trace[0]['name']}`")
            else:
                st.caption(f" Drilled down using {len(trace)} governed metrics — see trace below")

            with st.expander("View query trace (API calls made)"):
                for i, step in enumerate(trace, start=1):
                    st.markdown(f"**Step {i}: `{step['name']}`**")
                    st.json({"args": step["args"], "result": step["result"]})