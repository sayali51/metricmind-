import json
import pandas as pd
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.tools import tool

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


def build_tools(df: pd.DataFrame):
    @tool
    def tool_total_sales_by_region(region: str) -> str:
        """Get total (pre-discount) sales for a region. Input: region name (North, South, East, West, Central)."""
        return str(total_sales_by_region(df, region.strip().title()))

    @tool
    def tool_total_sales_by_category(category: str) -> str:
        """Get total sales for a category. Input: category name (Office Supplies, Technology, Furniture)."""
        return str(total_sales_by_category(df, category.strip().title()))

    @tool
    def tool_total_discounted_sales_by_region(region: str) -> str:
        """Get total sales AFTER discount for a region. Input: region name."""
        return str(total_discounted_sales_by_region(df, region.strip().title()))

    @tool
    def tool_total_profit_by_region(region: str) -> str:
        """Get total profit for a region. Input: region name."""
        return str(total_profit_by_region(df, region.strip().title()))

    @tool
    def tool_average_profit_margin() -> str:
        """Get the average profit margin across all orders."""
        return str(average_profit_margin(df))

    @tool
    def tool_high_value_orders_count() -> str:
        """Get the count of high-value orders (sales >= 3,000)."""
        return str(len(high_value_orders(df)))

    @tool
    def tool_total_orders() -> str:
        """Get the total number of orders."""
        return str(total_orders(df))

    @tool
    def tool_total_sales_by_segment(segment: str) -> str:
        """Get total sales for a customer segment. Input: segment name (Consumer, Corporate, Home Office)."""
        return str(total_sales_by_segment(df, segment.strip().title()))

    @tool
    def tool_loss_making_orders_count() -> str:
        """Get the count of orders that lost money (negative profit)."""
        return str(loss_making_orders_count(df))

    return [
        tool_total_sales_by_region,
        tool_total_sales_by_category,
        tool_total_discounted_sales_by_region,
        tool_total_profit_by_region,
        tool_average_profit_margin,
        tool_high_value_orders_count,
        tool_total_orders,
        tool_total_sales_by_segment,
        tool_loss_making_orders_count,
    ]


def answer_question(question: str, df: pd.DataFrame) -> dict:
    """
    Uses native LLM tool-calling (no fragile agent framework). The LLM
    picks ONE governed tool, we run it, and return the real number —
    the LLM never calculates anything itself.
    """
    tools = build_tools(df)
    tools_by_name = {t.name: t for t in tools}

    llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0)
    llm_with_tools = llm.bind_tools(tools)

    try:
        response = llm_with_tools.invoke(question)

        if not response.tool_calls:
            return {"answer": response.content or "I couldn't map that to a governed metric.", "tool_used": None}

        call = response.tool_calls[0]
        tool_name = call["name"]
        tool_args = call["args"]

        result = tools_by_name[tool_name].invoke(tool_args)

        return {"answer": f"{result}", "tool_used": tool_name}

    except Exception as e:
        return {"answer": f"Couldn't process that question. Error: {e}", "tool_used": None}