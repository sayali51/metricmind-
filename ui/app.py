import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import streamlit as st
import pandas as pd
from data.load_data import load_raw_data, clean_data
from query_engine.query_engine import answer_question

st.set_page_config(page_title="MetricMind (Scaled)", page_icon="📊")
st.title("📊 MetricMind — Governed Metrics Chat")
st.caption("Ask a business question. Every answer comes from one governed metric definition.")

if "history" not in st.session_state:
    st.session_state.history = []


@st.cache_data
def get_data() -> pd.DataFrame:
    raw = load_raw_data()
    return clean_data(raw)


df = get_data()

with st.expander("Example questions"):
    st.write(
        "- What's total sales in South?\n"
        "- What's total profit in North?\n"
        "- What's the average profit margin?\n"
        "- How many high value orders are there?\n"
        "- How many loss-making orders are there?\n"
        "- How many total orders?"
    )

question = st.text_input("Ask a question:")

if st.button("Run Query") and question.strip():
    result = answer_question(question, df)
    st.session_state.history.append((question, result))

for q, result in reversed(st.session_state.history):
    st.markdown(f"**You:** {q}")
    st.markdown(f"**MetricMind:** {result['answer']}")
    if result.get("tool_used"):
        st.caption(f"🔍 Calculated using governed metric: `{result['tool_used']}`")
    st.divider()