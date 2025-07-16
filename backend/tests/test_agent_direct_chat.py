import pytest
from agents import route_request, AgentRequest

@pytest.mark.asyncio
async def test_agent_handles_direct_chat_request():
    """
    Demonstrates the agent's ability to handle a direct conversational
    request without invoking any tools.
    
    Scenario: The user asks a general question that the LLM can answer 
    from its own knowledge.
    Expected Behavior: The agent should return a direct, text-based response
    from the LLM, and not attempt to call any tools.
    """
    print("\n--- Running Demo: Agent in Direct Chat Mode ---")
    
    # This prompt is a simple conversational question.
    request = AgentRequest(user_prompt="Who are you and what can you do?")
    
    print(f"User Prompt: \"{request.user_prompt}\"")
    
    # The agent should route this to the default LLM, not a tool.
    response = await route_request(request)
    
    print(f"Agent Response: \"{response}\"")
    
    # Assert that the response is a simple string and not a tool call artifact.
    # A tool call would result in a stringified list, e.g., "results=[...]"
    assert isinstance(response, str)
    assert not response.strip().startswith("results=[")
    assert "tool" not in response.lower()
    
    print("--- Demo Finished: Direct Chat Mode Confirmed ---") 