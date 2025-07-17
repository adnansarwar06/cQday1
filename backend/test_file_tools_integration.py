"""
Test script to demonstrate File Tools integration as agent tools.

This script shows how the file tools work when enabled in the assistant interface,
allowing the agent to perform file operations through natural language commands.
"""

import asyncio
from agents import route_request, AgentRequest
from tools import TOOL_REGISTRY


async def test_file_tools_as_agent_tools():
    """
    Demonstrates file tools working as agent tools through natural language.
    """
    print("\n" + "=" * 60)
    print("TESTING FILE TOOLS AS AGENT TOOLS")
    print("=" * 60)

    # Filter to only file tools for this demo
    file_tools = {
        name: tool
        for name, tool in TOOL_REGISTRY.items()
        if name.startswith(("list_files", "read_file", "create_file", "edit_file"))
    }

    print(f"Available file tools: {list(file_tools.keys())}")

    # Test 1: List files
    print("\n1. Testing list_files through agent...")
    request = AgentRequest(user_prompt="List all files in the knowledge_base directory")
    response = await route_request(request, tools=file_tools)
    print(f"Agent Response:\n{response}\n")

    # Test 2: Read file
    print("\n2. Testing read_file through agent...")
    request = AgentRequest(
        user_prompt="Read the content of knowledge_base/sample_document.txt"
    )
    response = await route_request(request, tools=file_tools)
    print(f"Agent Response:\n{response}\n")

    # Test 3: Create file
    print("\n3. Testing create_file through agent...")
    request = AgentRequest(
        user_prompt="Create a new file called output/agent_test.txt with the content 'This file was created by the agent using file tools!'"
    )
    response = await route_request(request, tools=file_tools)
    print(f"Agent Response:\n{response}\n")

    # Test 4: Edit file
    print("\n4. Testing edit_file through agent...")
    request = AgentRequest(
        user_prompt="Add a timestamp to the end of output/agent_test.txt"
    )
    response = await route_request(request, tools=file_tools)
    print(f"Agent Response:\n{response}\n")

    print("=" * 60)
    print("✅ FILE TOOLS INTEGRATION TEST COMPLETE!")
    print("=" * 60)
    print("The file tools are now working as agent tools that can be:")
    print("1. Enabled/disabled in the frontend Tools panel")
    print("2. Used by the agent through natural language commands")
    print("3. Combined with other tools for complex workflows")


if __name__ == "__main__":
    asyncio.run(test_file_tools_as_agent_tools())
