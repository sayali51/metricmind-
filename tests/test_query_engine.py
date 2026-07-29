import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
import requests
from unittest.mock import patch, MagicMock

from query_engine.query_engine import query_cube, answer_question


# ---------------------------------------------------------------------
# MOCKED tests — no Docker/Cube required
# ---------------------------------------------------------------------

def test_query_cube_returns_value_from_response():
    """query_cube should extract the first measure's value from Cube's response shape."""
    fake_response = MagicMock()
    fake_response.json.return_value = {"data": [{"sales.revenue": "1627572.16"}]}
    fake_response.raise_for_status.return_value = None

    with patch("query_engine.query_engine.requests.post", return_value=fake_response):
        result = query_cube(["sales.revenue"])

    assert result == "1627572.16"


def test_query_cube_with_filter():
    """query_cube should pass filters through and still parse the response correctly."""
    fake_response = MagicMock()
    fake_response.json.return_value = {"data": [{"sales.revenue": "500000.0"}]}
    fake_response.raise_for_status.return_value = None

    with patch("query_engine.query_engine.requests.post", return_value=fake_response) as mock_post:
        result = query_cube(
            ["sales.revenue"],
            [{"member": "sales.region", "operator": "equals", "values": ["South"]}],
        )

    assert result == "500000.0"
    # Confirm the filter was actually included in the outgoing request
    sent_payload = mock_post.call_args.kwargs["json"]["query"]
    assert sent_payload["filters"][0]["values"] == ["South"]

def test_query_cube_handles_empty_data():
    """If Cube returns no rows, query_cube should say so clearly rather than crashing."""
    fake_response = MagicMock()
    fake_response.json.return_value = {"data": []}
    fake_response.raise_for_status.return_value = None

    with patch("query_engine.query_engine.requests.post", return_value=fake_response):
        result = query_cube(["sales.revenue"])

    assert "No data found" in result


def test_query_cube_preserves_explicit_empty_filters():
    """An explicit empty filter list is falsy in Python, so it's correctly omitted from the payload."""
    fake_response = MagicMock()
    fake_response.json.return_value = {"data": [{"sales.revenue": "100.0"}]}
    fake_response.raise_for_status.return_value = None

    with patch("query_engine.query_engine.requests.post", return_value=fake_response) as mock_post:
        result = query_cube(["sales.revenue"], [])

    assert result == "100.0"
    sent_payload = mock_post.call_args.kwargs["json"]["query"]
    assert "filters" not in sent_payload


def test_query_cube_handles_connection_error():
    """If Cube/Docker isn't running, query_cube should return a friendly, specific message."""
    with patch(
        "query_engine.query_engine.requests.post",
        side_effect=requests.exceptions.ConnectionError("Connection refused"),
    ):
        result = query_cube(["sales.revenue"])

    assert "isn't reachable" in result or "Docker" in result


def test_answer_question_no_tool_call():
    """If the LLM doesn't pick a tool, answer_question should say so instead of erroring."""
    fake_llm_response = MagicMock()
    fake_llm_response.tool_calls = []
    fake_llm_response.content = "I'm not sure what metric that maps to."

    fake_llm = MagicMock()
    fake_llm.bind_tools.return_value.invoke.return_value = fake_llm_response

    with patch("query_engine.query_engine.ChatGroq", return_value=fake_llm):
        result = answer_question("What's the weather today?")

    assert result["tool_used"] is None
    assert "not sure" in result["answer"].lower() or result["answer"]

def test_answer_question_empty_input():
    result = answer_question("")
    assert result["tool_used"] is None
    assert "enter a question" in result["answer"].lower()


def test_answer_question_too_long():
    result = answer_question("a" * 300)
    assert result["tool_used"] is None
    assert "too long" in result["answer"].lower()
    
# ---------------------------------------------------------------------
# LIVE integration tests — require Docker + Cube + Postgres running
# and seeded (see cube/seed.sql). Run with: pytest -m live -v
# ---------------------------------------------------------------------

@pytest.mark.live
def test_live_revenue_query():
    """Hits the real running Cube instance. Skipped unless -m live is passed."""
    result = query_cube(["sales.revenue"])
    # Should be a real number, not an error string
    assert "Cube query failed" not in result
    assert float(result) > 0


@pytest.mark.live
def test_live_region_filtered_query():
    result = query_cube(
        ["sales.revenue"],
        [{"member": "sales.region", "operator": "equals", "values": ["South"]}],
    )
    assert "Cube query failed" not in result
    assert float(result) >= 0