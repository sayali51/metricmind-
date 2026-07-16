"""
Owner: Person 2 (metrics)

Each business metric is defined exactly ONCE here. This is the "semantic
layer" of the project: no matter who asks a question or how, they always
get the same definition of "total sales," "profit margin," etc.
"""

import pandas as pd


def total_sales_by_region(df: pd.DataFrame, region: str) -> float:
    """Total sales for a given region."""
    return df.loc[df["Region"] == region, "Sales"].sum()


def total_sales_by_category(df: pd.DataFrame, category: str) -> float:
    """Total sales for a given product category."""
    return df.loc[df["Category"] == category, "Sales"].sum()


def high_value_orders(df: pd.DataFrame, threshold: float = 10000) -> pd.DataFrame:
    """Orders with sales >= threshold (default: 10,000)."""
    return df.loc[df["Sales"] >= threshold]


def average_profit_margin(df: pd.DataFrame) -> float:
    """
    Average profit margin across all orders, defined as Profit / Sales.
    Defined once here so every part of the app reports the same number.
    """
    df = df.loc[df["Sales"] > 0].copy()
    df["margin"] = df["Profit"] / df["Sales"]
    return round(df["margin"].mean(), 4)


def total_orders(df: pd.DataFrame) -> int:
    """Total number of orders in the dataset."""
    return len(df)


def total_profit_by_region(df: pd.DataFrame, region: str) -> float:
    """Total profit for a given region."""
    return df.loc[df["Region"] == region, "Profit"].sum()