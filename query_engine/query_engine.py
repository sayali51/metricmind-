"""
Owner: Person 3 (query engine)

This plays the role of the "agentic orchestrator" in the original spec —
but instead of an LLM writing raw SQL, it does simple, transparent keyword
matching to decide which governed metric function to call.
"""

import pandas as pd
from metrics.metrics import (
    total_sales_by_region,
    total_sales_by_category,
    high_value_orders,
    average_profit_margin,
    total_orders,
)

REGIONS = ["South", "North", "East", "West"]
CATEGORIES = ["Electronics", "Furniture", "Office Supplies"]


def answer_question(question: str, df: pd.DataFrame) -> str:
    q = question.lower()

    for region in REGIONS:
        if region.lower() in q and "sales" in q:
            total = total_sales_by_region(df, region)
            return f"Total sales in {region}: {total:,.0f}"

    for category in CATEGORIES:
        if category.lower() in q and "sales" in q:
            total = total_sales_by_category(df, category)
            return f"Total sales for {category}: {total:,.0f}"

    if "margin" in q:
        margin = average_profit_margin(df)
        return f"Average profit margin: {margin:.2%}"

    if "high value" in q or "high-value" in q:
        orders = high_value_orders(df)
        return f"{len(orders)} high-value orders (Sales >= 10,000)."

    if "how many orders" in q or "total orders" in q:
        return f"Total orders: {total_orders(df)}"

    return (
        "I don't have a governed metric for that question yet. "
        "Try asking about sales by region/category, profit margin, "
        "or high-value orders."
    )