import pandas as pd

RAW_PATH = "data/raw_sales.csv"
CLEAN_PATH = "data/clean_sales.csv"

TEXT_COLUMNS = ["Customer Segment", "Region", "State", "Category", "Sub-Category"]


def load_raw(path: str = RAW_PATH) -> pd.DataFrame:
    """Load the raw dataset from CSV."""
    return pd.read_csv(path)


def clean_text_columns(df: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    """
    Equivalent of Excel's TRIM + PROPER, combined so hidden whitespace or
    inconsistent casing doesn't create duplicate categories
    (e.g. 'Consumer' vs 'consumer' vs 'CORPORATE').
    """
    df = df.copy()
    for col in columns:
        df[col] = df[col].astype(str).str.strip().str.title()
    return df


def parse_dates(df: pd.DataFrame) -> pd.DataFrame:
    """Convert date columns to real datetime objects; invalid/missing become NaT."""
    df = df.copy()
    df["Order Date"] = pd.to_datetime(df["Order Date"], errors="coerce")
    df["Ship Date"] = pd.to_datetime(df["Ship Date"], errors="coerce")
    return df


def handle_missing_shipping_cost(df: pd.DataFrame) -> pd.DataFrame:
    """Fill missing Shipping Cost with the column median rather than dropping rows."""
    df = df.copy()
    median_cost = df["Shipping Cost"].median()
    df["Shipping Cost"] = df["Shipping Cost"].fillna(median_cost)
    return df


def remove_duplicates(df: pd.DataFrame) -> pd.DataFrame:
    """Drop exact duplicate rows."""
    return df.drop_duplicates()


def run_pipeline(raw_path: str = RAW_PATH, clean_path: str = CLEAN_PATH) -> pd.DataFrame:
    df = load_raw(raw_path)
    df = clean_text_columns(df, TEXT_COLUMNS)
    df = parse_dates(df)
    df = handle_missing_shipping_cost(df)
    df = remove_duplicates(df)
    df.to_csv(clean_path, index=False)
    print(f"Cleaned data written to {clean_path} ({len(df)} rows).")
    return df


def load_raw_data(path: str = RAW_PATH) -> pd.DataFrame:
    """Alias kept for compatibility with ui/app.py."""
    return load_raw(path)


def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """Alias kept for compatibility with ui/app.py."""
    df = clean_text_columns(df, TEXT_COLUMNS)
    df = parse_dates(df)
    df = handle_missing_shipping_cost(df)
    df = remove_duplicates(df)
    return df


if __name__ == "__main__":
    run_pipeline()