import os
import requests
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.tools import tool

load_dotenv()

CUBE_API_URL = os.getenv("CUBE_API_URL", "http://localhost:4000/cubejs-api/v1/load")
CUBE_API_TOKEN = os.getenv("CUBE_API_TOKEN", "")  # ask Hamza if auth is required


def query_cube(measures: list[str], filters: list[dict] = None) -> str:
    """Send a query to Cube.dev's REST API and return the result as a string."""
    payload = {"measures": measures}
    if filters:
        payload["filters"] = filters

    headers = {}
    if CUBE_API_TOKEN:
        headers["Authorization"] = CUBE_API_TOKEN

    try:
        response = requests.post(
            CUBE_API_URL, json={"query": payload}, headers=headers, timeout=15
        )
        response.raise_for_status()
        data = response.json()["data"]
        if not data:
            return "0"
        # Cube returns keys like "sales.revenue" — grab the first measure's value
        first_row = data[0]
        key = list(first_row.keys())[0]
        return str(first_row[key])
    except Exception as e:
        return f"Cube query failed: {e}"


def build_tools():
    @tool
    def tool_total_sales_by_region(region: str) -> str:
        """Get total revenue for a region. Input: region name (North, South, East, West, Central)."""
        return query_cube(
            ["sales.revenue"],
            [{"member": "sales.region", "operator": "equals", "values": [region.strip().title()]}],
        )

    @tool
    def tool_total_sales_by_category(category: str) -> str:
        """Get total revenue for a category. Input: category name (Office Supplies, Technology, Furniture)."""
        return query_cube(
            ["sales.revenue"],
            [{"member": "sales.category", "operator": "equals", "values": [category.strip().title()]}],
        )

    @tool
    def tool_total_discounted_sales_by_region(region: str) -> str:
        """Get total sales AFTER discount for a region. Input: region name."""
        return query_cube(
            ["sales.discounted_sales"],
            [{"member": "sales.region", "operator": "equals", "values": [region.strip().title()]}],
        )

    @tool
    def tool_total_profit_by_region(region: str) -> str:
        """Get total profit for a region. Input: region name."""
        return query_cube(
            ["sales.profit"],
            [{"member": "sales.region", "operator": "equals", "values": [region.strip().title()]}],
        )

    @tool
    def tool_average_profit_margin() -> str:
        """Get average profit across all orders (Cube doesn't have a ratio metric defined yet, so this is average profit, not margin ratio)."""
        return query_cube(["sales.average_profit"])

    @tool
    def tool_high_value_orders_count() -> str:
        """Get the count of high-value orders (sales >= 10,000)."""
        return query_cube(["sales.high_value_orders"])

    @tool
    def tool_total_orders() -> str:
        """Get the total number of orders."""
        return query_cube(["sales.orders"])

    @tool
    def tool_total_sales_by_segment(segment: str) -> str:
        """Get total revenue for a customer segment. Input: segment name (Consumer, Corporate, Home Office)."""
        return query_cube(
            ["sales.revenue"],
            [{"member": "sales.customer_segment", "operator": "equals", "values": [segment.strip().title()]}],
        )

    @tool
    def tool_loss_making_orders_count() -> str:
        """Get the count of orders that lost money (negative profit)."""
        return query_cube(["sales.loss_orders"])

    @tool
    def tool_discounted_orders_count() -> str:
        """Get the count of orders that had a discount applied."""
        return query_cube(["sales.discounted_orders"])

    @tool
    def tool_total_loss_value() -> str:
        """Get the total sales value from loss-making orders."""
        return query_cube(["sales.loss_value"])
    
    @tool
    def tool_profit_margin() -> str:
        """Get the overall profit margin as a ratio of total profit to total sales."""
        return query_cube(["sales.profit_margin"])

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
        tool_discounted_orders_count,
        tool_total_loss_value,
    ]


def answer_question(question: str, df=None) -> dict:
    if not question or not question.strip():
        return {"answer": "Please enter a question.", "tool_used": None}
    if len(question) > 200:
        return {"answer": "Question too long — please ask something shorter and more specific.", "tool_used": None}

    tools = build_tools()
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