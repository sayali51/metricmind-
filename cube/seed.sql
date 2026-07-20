-- MetricMind: Postgres seed script for the Cube.dev semantic layer
-- Run this after `docker-compose up` and before querying Cube.
--
-- Usage:
--   1. docker cp data/raw_sales.csv cube-postgres-1:/raw_sales.csv
--   2. docker exec -i cube-postgres-1 psql -U cube -d sales < cube/seed.sql
--
-- Column names are lowercase, unquoted, to match Postgres conventions
-- and cube/model/cubes/orders.yml (backtick-quoted names are MySQL
-- syntax and will fail against Postgres).

DROP TABLE IF EXISTS sales;

CREATE TABLE sales (
    order_id TEXT,
    order_date DATE,
    ship_date DATE,
    customer_segment TEXT,
    region TEXT,
    state TEXT,
    category TEXT,
    sub_category TEXT,
    quantity INTEGER,
    sales NUMERIC,
    discount NUMERIC,
    discounted_sales NUMERIC,
    shipping_cost NUMERIC,
    profit NUMERIC
);

COPY sales FROM '/raw_sales.csv' DELIMITER ',' CSV HEADER;

-- Sanity check: should print 500
SELECT COUNT(*) FROM sales;