import pytest
import json
from agent_react import run_react_agent, ReActAgentRequest


@pytest.mark.asyncio
async def test_react_agent_multi_step_reasoning():
    """
    Demonstrates the ReAct agent's ability to perform multi-step reasoning
    by chaining tool calls to answer a complex query.

    Scenario: The user asks a question that requires two steps:
    1. First, find out what company develops a specific product (using web search).
    2. Then, find case studies about that company (using case studies search).

    Expected Behavior: The agent should first use the web_search tool, then use
    the information from that result to inform its second action with the
    case_studies_search tool, and finally provide a synthesized answer.
    The final output should include the full execution trace.
    """
    print("\n--- Running Demo: ReAct Agent with Multi-Step Reasoning ---")

    # This prompt requires chaining two different tools.
    request = ReActAgentRequest(
        user_prompt="I want to find case studies about the company that makes the Snowflake Data Cloud.",
        max_steps=5,
    )

    print(f'User Prompt: "{request.user_prompt}"')

    response = await run_react_agent(request)

    print("\n--- Agent's Full Execution Trace ---")
    for i, step in enumerate(response["trace"]):
        print(f"\n[Trace Step {i+1}: {step['step_type']}]")
        if "tool_name" in step:
            print(f"Tool: {step['tool_name']}")
            print(f"Input: {json.dumps(step['tool_input'], indent=2)}")
        else:
            print(f"Output:\n{step['output']}")

    print("\n--- Agent's Final Answer ---")
    print(response["final_answer"])

    # Assert that the trace contains the key steps we expect
    trace_str = json.dumps(response["trace"])
    assert "web_search" in trace_str
    assert "case_studies_search" in trace_str

    # Assert that the final answer is reasonable
    assert "Snowflake" in response["final_answer"]

    print("\n--- Demo Finished: Multi-Step Reasoning Confirmed ---")
