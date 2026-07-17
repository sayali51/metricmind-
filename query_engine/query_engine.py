import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain.agents import initialize_agent, Tool, AgentType
import pandas as pd

from metrics.metrics import (
    total_sales_by_region,
    total_sales_by_category,
    total_discounted_sales_by_region,
    total_profit_by_region,
    high_value_orders,
    average_profit_margin,
    total_orders,
    total_sales_by_segment,
    loss_making_orders_count,
)

load_dotenv()


def build_agent(df: pd.DataFrame):
    """Builds a LangChain agent that can only call our governed metric tools."""

    tools = [
        Tool(
            name="total_sales_by_region",
            func=lambda region: str(total_sales_by_region(df, region.strip().title())),
            description="Get total (pre-discount) sales for a region. Input: region name (North, South, East, West, Central).",
        ),
        Tool(
            name="total_sales_by_category",
            func=lambda category: str(total_sales_by_category(df, category.strip().title())),
            description="Get total sales for a category. Input: category name (Office Supplies, Technology, Furniture).",
        ),
        Tool(
            name="total_discounted_sales_by_region",
            func=lambda region: str(total_discounted_sales_by_region(df, region.strip().title())),
            description="Get total sales AFTER discount for a region. Input: region name.",
        ),
        Tool(
            name="total_profit_by_region",
            func=lambda region: str(total_profit_by_region(df, region.strip().title())),
            description="Get total profit for a region. Input: region name.",
        ),
        Tool(
            name="average_profit_margin",
            func=lambda _: str(average_profit_margin(df)),
            description="Get the average profit margin across all orders. No input needed.",
        ),
        Tool(
            name="high_value_orders_count",
            func=lambda _: str(len(high_value_orders(df))),
            description="Get the count of high-value orders (sales >= 3,000). No input needed.",
        ),
        Tool(
            name="total_orders",
            func=lambda _: str(total_orders(df)),
            description="Get the total number of orders. No input needed.",
        ),
        Tool(
            name="total_sales_by_segment",
            func=lambda segment: str(total_sales_by_segment(df, segment.strip().title())),
            description="Get total sales for a customer segment. Input: segment name (Consumer, Corporate, Home Office).",
        ),
        Tool(
            name="loss_making_orders_count",
            func=lambda _: str(loss_making_orders_count(df)),
            description="Get the count of orders that lost money (negative profit). No input needed.",
        ),
    ]

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

    agent = initialize_agent(
        tools,
        llm,
        agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
        verbose=False,
        handle_parsing_errors=True,
    )
    return agent


def answer_question(question: str, df: pd.DataFrame) -> str:
    agent = build_agent(df)
    try:
        return agent.run(question)
    except Exception as e:
        return f"Couldn't process that question. Error: {e}"