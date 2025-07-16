"""
Demo script for File System Tools integration with the agent.

This script demonstrates the agent's ability to:
1. List files in the knowledge_base directory
2. Read existing files
3. Create new files in the output directory
4. Edit existing files
5. Perform multi-step file operations using ReAct reasoning

Run this script with the backend server running:
    uvicorn main:app --reload

Then run this script:
    python test_file_tools_agent.py
"""

import asyncio
import json
from agents import route_request, AgentRequest
from agent_react import run_react_agent, ReActAgentRequest
from tools import TOOL_REGISTRY

# --- Demo Scenarios ---


async def demo_simple_file_operations():
    """
    Demonstrates basic file operations using the simple agent mode.
    Each operation is tested individually to show the agent's ability
    to use file system tools correctly.
    """
    print("\n" + "=" * 60)
    print("DEMO 1: SIMPLE FILE OPERATIONS")
    print("=" * 60)

    # Scenario 1: List files in knowledge_base
    print("\n1. Listing files in knowledge_base...")
    request = AgentRequest(user_prompt="List all files in the knowledge_base directory")

    # Filter tools to only include file tools for this demo
    file_tools = {name: tool for name, tool in TOOL_REGISTRY.items() if "file" in name}

    response = await route_request(request, tools=file_tools)
    print(f"Response: {response}")

    # Scenario 2: Read a specific file
    print("\n2. Reading sample_document.txt...")
    request = AgentRequest(
        user_prompt="Read the content of knowledge_base/sample_document.txt"
    )
    response = await route_request(request, tools=file_tools)
    print(f"Response: {response}")

    # Scenario 3: Create a new file
    print("\n3. Creating a new summary file...")
    request = AgentRequest(
        user_prompt="Create a new file called 'output/demo_summary.txt' with content about the file system tools capabilities"
    )
    response = await route_request(request, tools=file_tools)
    print(f"Response: {response}")

    # Scenario 4: Edit the created file
    print("\n4. Appending to the created file...")
    request = AgentRequest(
        user_prompt="Append the following text to 'output/demo_summary.txt': '\n\nDemo completed successfully at "
        + str(asyncio.get_event_loop().time())
        + "'"
    )
    response = await route_request(request, tools=file_tools)
    print(f"Response: {response}")


async def demo_react_multi_step_file_workflow():
    """
    Demonstrates the ReAct agent's ability to perform complex multi-step
    file operations that require reasoning and planning.

    Scenario: The agent needs to:
    1. Explore the knowledge_base to see what files are available
    2. Read and analyze the content
    3. Create a comprehensive analysis document in the output directory
    """
    print("\n" + "=" * 60)
    print("DEMO 2: REACT MULTI-STEP FILE WORKFLOW")
    print("=" * 60)

    request = ReActAgentRequest(
        user_prompt="""I need you to analyze all documents in the knowledge_base directory and create a comprehensive summary report. 

        Your task:
        1. First, list all files in the knowledge_base directory to see what's available
        2. Read each document you find
        3. Analyze the content and identify key information
        4. Create a new file called 'output/comprehensive_analysis.txt' that contains:
           - A summary of each document found
           - Key insights and themes
           - Recommendations based on the content
        
        Please perform this task step by step using your reasoning capabilities.""",
        max_steps=8,
    )

    # Filter to only file tools for this demo
    file_tools = {name: tool for name, tool in TOOL_REGISTRY.items() if "file" in name}

    print("Starting ReAct agent workflow...")
    response = await run_react_agent(request, tools=file_tools)

    print("\n--- ReAct Agent Execution Trace ---")
    for i, step in enumerate(response["trace"]):
        print(f"\n[Step {i+1}: {step['step_type']}]")
        if "tool_name" in step:
            print(f"Tool: {step['tool_name']}")
            print(f"Input: {json.dumps(step['tool_input'], indent=2)}")
        elif "output" in step:
            output = step["output"]
            # Truncate very long outputs for readability
            if len(output) > 300:
                output = output[:300] + "... (truncated)"
            print(f"Output: {output}")

    print(f"\n--- Final Answer ---")
    print(response["final_answer"])


async def demo_error_handling():
    """
    Demonstrates how the file tools handle various error conditions
    and edge cases gracefully.
    """
    print("\n" + "=" * 60)
    print("DEMO 3: ERROR HANDLING & EDGE CASES")
    print("=" * 60)

    file_tools = {name: tool for name, tool in TOOL_REGISTRY.items() if "file" in name}

    # Test 1: Try to read a non-existent file
    print("\n1. Testing non-existent file...")
    request = AgentRequest(user_prompt="Read the file 'knowledge_base/nonexistent.txt'")
    response = await route_request(request, tools=file_tools)
    print(f"Response: {response}")

    # Test 2: Try to create a file with invalid path
    print("\n2. Testing invalid file path...")
    request = AgentRequest(
        user_prompt="Create a file at '../outside_directory/test.txt' with some content"
    )
    response = await route_request(request, tools=file_tools)
    print(f"Response: {response}")

    # Test 3: Try to list a non-existent directory
    print("\n3. Testing non-existent directory...")
    request = AgentRequest(user_prompt="List files in the 'nonexistent_directory'")
    response = await route_request(request, tools=file_tools)
    print(f"Response: {response}")


async def demo_comprehensive_workflow():
    """
    A comprehensive demo that shows the complete file tools workflow
    with both knowledge base reading and output file creation.
    """
    print("\n" + "=" * 60)
    print("DEMO 4: COMPREHENSIVE WORKFLOW")
    print("=" * 60)

    request = ReActAgentRequest(
        user_prompt="""Please perform a complete file management workflow:

        1. List all files in both knowledge_base and output directories
        2. Read any existing documents in knowledge_base
        3. Create a detailed inventory file 'output/file_inventory.txt' that lists:
           - All files found in knowledge_base with their sizes
           - All files found in output with their sizes  
           - A timestamp of when this inventory was created
           - Summary statistics (total files, total content length, etc.)
        4. After creating the inventory, read it back to verify it was created correctly
        
        This will demonstrate the full cycle of file operations.""",
        max_steps=10,
    )

    # Use all tools including file tools
    all_tools = TOOL_REGISTRY

    response = await run_react_agent(request, tools=all_tools)

    print("\n--- Final Result ---")
    print(response["final_answer"])


async def main():
    """
    Main function to run all demo scenarios.
    """
    print("🤖 FILE SYSTEM TOOLS AGENT DEMO")
    print("This demo showcases the agent's file system capabilities")
    print(
        f"Available file tools: {[name for name in TOOL_REGISTRY.keys() if 'file' in name]}"
    )

    try:
        # Run all demo scenarios
        await demo_simple_file_operations()
        await demo_react_multi_step_file_workflow()
        await demo_error_handling()
        await demo_comprehensive_workflow()

        print("\n" + "=" * 60)
        print("✅ ALL DEMOS COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print("\nCheck the 'output' directory for files created during the demo.")
        print("You can also run individual demo functions for targeted testing.")

    except Exception as e:
        print(f"\n❌ Demo failed with error: {e}")
        print(
            "Make sure the backend server is running and all dependencies are installed."
        )


if __name__ == "__main__":
    # Run the demo
    asyncio.run(main())
