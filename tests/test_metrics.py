import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
import pytest
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


@pytest.fixture
def sample_df():
    return pd.DataFrame(
        {
            "Region": ["North", "North", "South", "West"],
            "Category": ["Office Supplies", "Technology", "Furniture", "Technology"],
            "Customer Segment": ["Consumer", "Corporate", "Consumer", "Home Office"],
            "Sales": [6560.67, 2308.30, 1500.00, 4000.00],
            "Discounted Sales": [5904.60, 1962.06, 1350.00, 3600.00],
            "Profit": [825.27, -241.29, 300.00, 500.00],
        }
    )


def test_total_sales_by_region(sample_df):
    assert total_sales_by_region(sample_df, "North") == pytest.approx(8868.97)


def test_total_sales_by_category(sample_df):
    assert total_sales_by_category(sample_df, "Technology") == pytest.approx(6308.30)


def test_total_discounted_sales_by_region(sample_df):
    assert total_discounted_sales_by_region(sample_df, "North") == pytest.approx(7866.66)


def test_total_profit_by_region(sample_df):
    assert total_profit_by_region(sample_df, "North") == pytest.approx(584.0, abs=0.5)


def test_high_value_orders(sample_df):
    result = high_value_orders(sample_df, threshold=3000)
    assert len(result) == 2


def test_average_profit_margin(sample_df):
    margin = average_profit_margin(sample_df)
    assert -1 < margin < 1


def test_total_orders(sample_df):
    assert total_orders(sample_df) == 4


def test_total_sales_by_segment(sample_df):
    assert total_sales_by_segment(sample_df, "Consumer") == pytest.approx(8060.67)


def test_loss_making_orders_count(sample_df):
    assert loss_making_orders_count(sample_df) == 1