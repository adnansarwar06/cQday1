import pytest
from agents import route_request, AgentRequest
from unittest.mock import patch, MagicMock, AsyncMock


@pytest.mark.asyncio
async def test_agent_handles_nonexistent_tool_request():
    """
    Demonstrates how the agent handles a situation where the LLM tries
    to call a tool that is not registered.

    Scenario: The LLM hallucinates a tool name based on the user's prompt.
    Expected Behavior: The agent should recognize that the tool does not exist
    and return a helpful error message to the user, rather than crashing.
    """
    print("\n--- Running Demo: Agent Handling Non-Existent Tool ---")

    request = AgentRequest(
        user_prompt="Can you please schedule a meeting for me for tomorrow?"
    )

    # We mock the LLM's response to simulate it calling a fake tool.
    mock_response = (
        '{"tool_name": "schedule_meeting", "tool_input": {"time": "tomorrow"}}'
    )

    async def mock_stream(*args, **kwargs):
        yield mock_response

    with patch("agents.get_openai_completion", new=mock_stream):
        print(f'User Prompt: "{request.user_prompt}"')
        print(f"Mocked LLM Response: {mock_response}")

        response_generator = route_request(request)
        response = "".join([chunk async for chunk in response_generator])

        print(f'Agent Final Response: "{response}"')

        assert "unknown tool" in response

    print("--- Demo Finished: Non-Existent Tool Handled Gracefully ---")


@pytest.mark.asyncio
async def test_agent_handles_invalid_tool_input():
    """
    Demonstrates how the agent handles a situation where the LLM provides
    invalid or incomplete input for a registered tool.

    Scenario: The user asks for a web search but provides an ambiguous query
    that results in the LLM generating invalid input for the `web_search` tool.
    Expected Behavior: The agent should fail to validate the input against the
    tool's schema and return a helpful error message.
    """
    print("\n--- Running Demo: Agent Handling Invalid Tool Input ---")

    request = AgentRequest(user_prompt="Search for stuff.")

    # We mock the LLM's response to simulate it providing bad input.
    # The `web_search` tool expects a `query` field, not `search_term`.
    mock_response = (
        '{"tool_name": "web_search", "tool_input": {"search_term": "stuff"}}'
    )

    async def mock_stream(*args, **kwargs):
        yield mock_response

    with patch("agents.get_openai_completion", new=mock_stream):
        print(f'User Prompt: "{request.user_prompt}"')
        print(f"Mocked LLM Response: {mock_response}")

        response_generator = route_request(request)
        response = "".join([chunk async for chunk in response_generator])

        print(f'Agent Final Response: "{response}"')

        # The agent's response should clearly state that the input was invalid.
        assert "input was invalid" in response.lower()

    print("--- Demo Finished: Invalid Tool Input Handled Gracefully ---")
