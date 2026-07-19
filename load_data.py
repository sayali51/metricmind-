from pathlib import Path
import pandas as pd
from sqlalchemy import create_engine

BASE_DIR = Path(__file__).parent

csv_path = BASE_DIR / "data" / "palmbridge_raw_data.csv"

df = pd.read_csv(csv_path)

engine = create_engine(
    "mysql+pymysql://root:hamza786110@localhost:3306/sales"
)

df.to_sql(
    "sales",
    con=engine,
    if_exists="replace",
    index=False
)

print("Data loaded into MySQL successfully!")