from pathlib import Path
import sqlite3
import pandas as pd

BASE_DIR = Path(__file__).parent

csv_path = BASE_DIR / "data" / "palmbridge_raw_data.csv"
db_path = BASE_DIR / "sales.db"

df = pd.read_csv(csv_path)

conn = sqlite3.connect(db_path)

df.to_sql(
    "sales",
    conn,
    if_exists="replace",
    index=False
)

conn.close()

print("Database created!")