import pandas as pd


def total_sales_by_region(df: pd.DataFrame, region: str) -> float:
    """Total (pre-discount) sales for a given region."""
    return df.loc[df["Region"] == region, "Sales"].sum()


def total_sales_by_category(df: pd.DataFrame, category: str) -> float:
    """Total sales for a given product category."""
    return df.loc[df["Category"] == category, "Sales"].sum()


def total_discounted_sales_by_region(df: pd.DataFrame, region: str) -> float:
    """
    Total sales AFTER discount for a given region.
    Kept separate from total_sales_by_region on purpose: this is a real
    'governance' example — Sales and Discounted Sales are two different,
    both-valid numbers, and mixing them up is a common analyst mistake.
    """
    return df.loc[df["Region"] == region, "Discounted Sales"].sum()

def total_profit_by_region(df: pd.DataFrame, region: str) -> float:
    """Total profit for a given region."""
    return round(df.loc[df["Region"] == region, "Profit"].sum(), 2)


def high_value_orders(df: pd.DataFrame, threshold: float = 3000) -> pd.DataFrame:
    """Orders with sales >= threshold (default: 3,000 for this dataset's scale)."""
    return df.loc[df["Sales"] >= threshold]


def average_profit_margin(df: pd.DataFrame) -> float:
    """
    Average profit margin across all orders, defined as Profit / Sales.
    Defined once here so every part of the app reports the same number.
    """
    d = df.loc[df["Sales"] > 0].copy()
    d["margin"] = d["Profit"] / d["Sales"]
    return round(d["margin"].mean(), 4)


def total_orders(df: pd.DataFrame) -> int:
    """Total number of orders in the dataset."""
    return len(df)


def total_sales_by_segment(df: pd.DataFrame, segment: str) -> float:
    """Total sales for a given customer segment (Consumer, Corporate, Home Office)."""
    return df.loc[df["Customer Segment"] == segment, "Sales"].sum()


def loss_making_orders_count(df: pd.DataFrame) -> int:
    """Count of orders where Profit is negative."""
    return len(df.loc[df["Profit"] < 0])