"""
This module implements the agent orchestration logic.
"""
import logging
from typing import Dict, Any, List, Optional, Callable, Awaitable, Type
from pydantic import BaseModel, Field
import json

from llm import get_openai_response_non_stream
from web_search import WebSearchRequest, web_search
from case_studies import CaseStudyRequest, case_studies_search
from tools import Tool, TOOL_REGISTRY

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def format_tool_result(tool_name: str, result: Any) -> str:
    """Format tool results into user-friendly responses."""
    
    if tool_name == "web_search":
        # Format web search results nicely
        if hasattr(result, 'results') and result.results:
            formatted_results = []
            formatted_results.append(f"🔍 **Web Search Results:**\n")
            
            for i, search_result in enumerate(result.results[:8], 1):  # Limit to top 8 results
                title = search_result.title
                url = search_result.url
                summary = search_result.summary
                
                formatted_results.append(f"**{i}. {title}**")
                formatted_results.append(f"   🔗 {url}")
                if summary:
                    # Clean up summary and limit length
                    clean_summary = summary.replace('<strong>', '').replace('</strong>', '').strip()
                    if len(clean_summary) > 200:
                        clean_summary = clean_summary[:200] + "..."
                    formatted_results.append(f"   📝 {clean_summary}")
                formatted_results.append("")  # Empty line between results
            
            return "\n".join(formatted_results)
        else:
            return "🔍 **Web Search Results:** No results found."
    
    elif tool_name == "case_studies_search":
        # Format case study results similarly
        if hasattr(result, 'results') and result.results:
            formatted_results = []
            formatted_results.append(f"📚 **Case Study Results:**\n")
            
            for i, search_result in enumerate(result.results[:6], 1):  # Limit to top 6 results
                title = search_result.title
                url = search_result.url
                summary = search_result.summary
                
                formatted_results.append(f"**{i}. {title}**")
                formatted_results.append(f"   🔗 {url}")
                if summary:
                    clean_summary = summary.replace('<strong>', '').replace('</strong>', '').strip()
                    if len(clean_summary) > 200:
                        clean_summary = clean_summary[:200] + "..."
                    formatted_results.append(f"   📝 {clean_summary}")
                formatted_results.append("")
            
            return "\n".join(formatted_results)
        else:
            return "📚 **Case Study Results:** No relevant case studies found."
    
    elif tool_name == "list_files":
        # Format file listing results
        if hasattr(result, 'files') and result.files:
            formatted_results = []
            formatted_results.append(f"📁 **Files in '{result.directory}':**\n")
            
            for i, filename in enumerate(result.files, 1):
                formatted_results.append(f"   {i}. {filename}")
            
            formatted_results.append(f"\n**Total files:** {result.total_count}")
            return "\n".join(formatted_results)
        else:
            return f"📁 **Files in '{result.directory}':** No files found."
    
    elif tool_name == "read_file":
        # Format file content results
        if hasattr(result, 'content'):
            formatted_results = []
            formatted_results.append(f"📄 **Content of '{result.filepath}':**\n")
            formatted_results.append("```")
            formatted_results.append(result.content)
            formatted_results.append("```")
            formatted_results.append(f"\n**File size:** {result.size_bytes} bytes")
            return "\n".join(formatted_results)
        else:
            return f"📄 **Error reading file '{result.filepath}'**"
    
    elif tool_name in ["create_file", "edit_file"]:
        # Format file operation results
        if hasattr(result, 'success'):
            icon = "✅" if result.success else "❌"
            operation_name = "Created" if tool_name == "create_file" else "Edited"
            
            formatted_results = []
            formatted_results.append(f"{icon} **File {operation_name}:**\n")
            formatted_results.append(f"   📄 **File:** {result.filepath}")
            formatted_results.append(f"   📝 **Status:** {result.message}")
            
            if result.success and result.size_bytes is not None:
                formatted_results.append(f"   📊 **Size:** {result.size_bytes} bytes")
            
            return "\n".join(formatted_results)
        else:
            return f"❌ **File operation failed:** {str(result)}"
    
    else:
        # For unknown tools, fall back to string representation
        return str(result)


AGENT_SYSTEM_PROMPT = """
You are a helpful assistant with access to a variety of tools. Your role is to analyze user requests and decide the best course of action.

You can either respond directly to the user or use one of the available tools.

You have access to the following tools:
{tools}

To use a tool, respond with a JSON object with two keys: "tool_name" and "tool_input".
- "tool_name" must be one of the available tool names.
- "tool_input" must be a JSON object that conforms to the schema for that tool.

If you believe you can answer the user's request without using a tool, then respond with your answer in plain text.

User request: {user_prompt}
"""

class AgentRequest(BaseModel):
    """Request model for the /agent endpoint."""
    user_prompt: str

async def route_request(request: AgentRequest, tools: Optional[Dict[str, Tool]] = None):
    """
    Routes the user's request to the appropriate tool or to the default LLM chat.
    
    Args:
        request: The user's request object.
        tools: An optional dictionary of tools to use. If None, uses the global TOOL_REGISTRY.
    """
    
    # If a specific toolset isn't provided, default to the global registry
    if tools is None:
        tools = TOOL_REGISTRY
        
    tool_definitions = ""
    if tools:
        for tool_name, tool in tools.items():
            tool_definitions += f"- {tool_name}: {tool.description}\n"
            
    # If no tools are available, the agent will default to chat mode.
    prompt = AGENT_SYSTEM_PROMPT.format(
        tools=tool_definitions,
        user_prompt=request.user_prompt
    )

    logger.info("Routing agent request...")
    llm_response = await get_openai_response_non_stream(prompt)
    logger.info(f"LLM response for routing: {llm_response}")

    try:
        # Try to parse the response as a JSON object for tool invocation
        tool_call = json.loads(llm_response)
        tool_name = tool_call.get("tool_name")
        tool_input = tool_call.get("tool_input")

        if tool_name in tools:
            logger.info(f"Invoking tool: {tool_name} with input: {tool_input}")
            tool = tools[tool_name]
            
            # Validate and instantiate the request model
            if tool.request_model:
                try:
                    # Create an instance of the request model from the input
                    # The request object is the single argument to the coroutine
                    request_instance = tool.request_model(**tool_input)
                except Exception as e:
                    logger.error(f"Tool input validation failed: {e}")
                    # Respond to the user with a helpful error message.
                    # In a real-world scenario, you might want to retry or have the LLM correct the input.
                    return f"I tried to use the '{tool_name}' tool, but the input was invalid. Here is the error: {e}"
                
                # Execute the tool's coroutine
                result = await tool.coroutine(request_instance)
            else:
                # This would be for tools that don't require any input arguments.
                result = await tool.coroutine()

            # Format the tool result nicely for the user
            return format_tool_result(tool_name, result)
        else:
            logger.warning(f"LLM tried to call an unknown tool: {tool_name}")
            return "An internal error occurred: received a request for an unknown tool."

    except json.JSONDecodeError:
        # If it's not a JSON object, it's a direct response from the LLM
        logger.info("No tool invocation found, returning direct LLM response.")
        return llm_response
    except Exception as e:
        logger.error(f"An unexpected error occurred during agent routing: {e}")
        return "An unexpected error occurred while processing your request." 