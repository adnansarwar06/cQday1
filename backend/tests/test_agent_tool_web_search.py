import pytest
from agents import route_request, AgentRequest

@pytest.mark.asyncio
async def test_agent_uses_web_search_tool():
    """
    Demonstrates the agent's ability to use the web_search tool when
    the user's prompt requires up-to-date information.
    
    Scenario: The user asks a question about a recent event that the LLM
    would not know from its training data.
    Expected Behavior: The agent should identify that a web search is needed,
    invoke the `web_search` tool, and return the search results.
    """
    print("\n--- Running Demo: Agent Using Web Search Tool ---")
    
    # This prompt is designed to require a web search for recent information.
    request = AgentRequest(user_prompt="What are the latest developments in AI model releases from the past week?")
    
    print(f"User Prompt: \"{request.user_prompt}\"")
    
    # The agent should route this to the web_search tool.
    response = await route_request(request)
    
    print(f"Agent Response (Tool Output): {response}")
    
    # Assert that the response is a tool call artifact.
    # A successful tool call will return a stringified list of search results.
    assert isinstance(response, str)
    assert response.strip().startswith("results=[")
    
    print("--- Demo Finished: Web Search Tool Invocation Confirmed ---") 