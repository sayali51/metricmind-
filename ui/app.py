import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import streamlit as st
from query_engine.query_engine import answer_question

st.set_page_config(page_title="MetricMind", page_icon="📊")
st.title("📊 MetricMind — Governed Metrics Chat")
st.caption("Ask a business question. Every answer comes from Cube.dev's governed semantic layer.")

if "history" not in st.session_state:
    st.session_state.history = []

with st.expander("Example questions"):
    st.write(
        "- What's total sales in South?\n"
        "- What's total profit in North?\n"
        "- How many high value orders are there?\n"
        "- How many loss-making orders are there?\n"
        "- How many discounted orders are there?\n"
        "- How many total orders?"
    )

question = st.text_input("Ask a question:")

if st.button("Run Query") and question.strip():
    result = answer_question(question)
    st.session_state.history.append((question, result))

for q, result in reversed(st.session_state.history):
    st.markdown(f"**You:** {q}")
    st.markdown(f"**MetricMind:** {result['answer']}")
    if result.get("tool_used"):
        st.caption(f"🔍 Calculated using Cube.dev metric: `{result['tool_used']}`")
    st.divider()