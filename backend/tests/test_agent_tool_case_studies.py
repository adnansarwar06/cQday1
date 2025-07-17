import pytest
from agents import route_request, AgentRequest


@pytest.mark.asyncio
async def test_agent_uses_case_studies_tool():
    """
    Demonstrates the agent's ability to use the case_studies_search tool
    when the user's prompt explicitly asks for case studies about a company.

    Scenario: The user asks for case studies about a specific company.
    Expected Behavior: The agent should identify the company name, invoke the
    `case_studies_search` tool, and return the relevant search results.
    """
    print("\n--- Running Demo: Agent Using Case Studies Tool ---")

    # This prompt is designed to trigger the case studies tool.
    request = AgentRequest(
        user_prompt="Can you find me case studies on how Netflix uses AWS?"
    )

    print(f'User Prompt: "{request.user_prompt}"')

    # The agent should route this to the case_studies_search tool.
    response = await route_request(request)

    print(f"Agent Response (Tool Output): {response}")

    # Assert that the response is a tool call artifact.
    assert isinstance(response, str)
    assert response.strip().startswith("results=[")

    print("--- Demo Finished: Case Studies Tool Invocation Confirmed ---")
