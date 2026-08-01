import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import streamlit as st
from query_engine.query_engine import answer_question

st.set_page_config(page_title="MetricMind", page_icon="📊", layout="centered")

st.markdown(
    """
    <style>
    .main .block-container { padding-top: 2rem; max-width: 800px; }
    div[data-testid="stExpander"] { border: 1px solid #e0e0e0; border-radius: 8px; }
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
    "What's the top-selling category?",
    "Show me the monthly sales trend",
]

def set_question(q):
    st.session_state["question_input"] = q

with st.sidebar:
    st.header("📊 MetricMind")
    st.caption("Governed metrics chat, powered by Cube.dev + LangChain")
    st.subheader("Try asking:")
    for q in EXAMPLE_QUESTIONS:
        st.button(q, use_container_width=True, key=f"sidebar_{q}", on_click=set_question, args=(q,))
    st.divider()
    st.subheader("How it works")
    st.markdown(
        "1. You ask a question in plain English\n"
        "2. An LLM picks **one governed metric** — it never calculates numbers itself\n"
        "3. The metric runs against Cube.dev's semantic layer\n"
        "4. You get a consistent, auditable answer"
    )
    st.divider()
    if st.button("🗑️ Clear conversation", use_container_width=True):
        st.session_state.history = []
        st.rerun()

st.title("MetricMind — Governed Metrics Chat")
st.caption("Ask a business question. Every answer comes from one governed metric definition.")

if "history" not in st.session_state:
    st.session_state.history = []

question = st.text_input("Ask a question:", key="question_input")
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
