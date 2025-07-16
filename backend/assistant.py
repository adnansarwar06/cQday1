"""
This module provides the primary entrypoint for the unified assistant.

It dynamically selects the appropriate agent (Simple or ReAct) and configures
it with the tools that the user has enabled on the frontend.
"""

import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

# Import the agent logic and the canonical tool registry
from agents import route_request as simple_agent_router, AgentRequest
from tools import TOOL_REGISTRY


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Models for AI SDK compatibility ---

class MessageContent(BaseModel):
    type: str
    text: str

class Message(BaseModel):
    role: str
    content: List[MessageContent]

class AssistantRequest(BaseModel):
    """
    The unified request model for the new /v2/assistant endpoint.
    Compatible with @assistant-ui/react-ai-sdk format.
    """
    messages: List[Message]
    mode: str = "standard"  # "standard" or "agent"
    enabled_tools: List[str] = []
    tools: Optional[Any] = None  # The AI SDK sends this but we don't use it - can be list or object

def extract_user_prompt(messages: List[Message]) -> str:
    """
    Extracts the user's prompt from the messages array.
    Takes the last user message's text content.
    """
    for message in reversed(messages):
        if message.role == "user" and message.content:
            for content in message.content:
                if content.type == "text" and content.text:
                    return content.text
    return ""

async def run_assistant_streaming(request: AssistantRequest):
    """
    Main orchestrator for the assistant with streaming support.
    
    This function receives the user's request, including the desired mode and
    the list of enabled tools. It then filters the tool registry to only include
    the enabled tools and streams the response in real-time.
    """
    from llm import get_openai_completion
    
    # Extract user prompt from messages
    user_prompt = extract_user_prompt(request.messages)
    logger.info(f"Running assistant in '{request.mode}' mode with tools: {request.enabled_tools}")
    logger.info(f"User prompt: {user_prompt}")
    
    # Filter the master tool registry to only include enabled tools.
    # This ensures the agent can only "see" and use the tools the user has allowed.
    filtered_tools = {name: tool for name, tool in TOOL_REGISTRY.items() if name in request.enabled_tools}
    
    if request.mode == "agent" and filtered_tools:
        # Stream ReAct agent reasoning steps
        logger.info("Using ReAct agent for multi-step reasoning with streaming trace.")
        from agent_react import run_react_agent, ReActAgentRequest
        
        react_request = ReActAgentRequest(user_prompt=user_prompt)
        
        # Run the agent and get the complete response
        response = await run_react_agent(react_request, tools=filtered_tools)
        
        # Stream each step from the trace with nice formatting
        for step in response.get("trace", []):
            if step["step_type"] == "Thought":
                yield {"type": "content", "content": f"🤔 **Thinking:**\n{step['output']}\n\n"}
            elif step["step_type"] == "Action":
                tool_input_str = str(step.get('tool_input', {}))
                yield {"type": "content", "content": f"🔧 **Action:** Using tool `{step['tool_name']}`\n*Input:* {tool_input_str}\n\n"}
            elif step["step_type"] == "Observation":
                yield {"type": "content", "content": f"📝 **Observation:**\n{step['output']}\n\n"}
            elif step["step_type"] == "Error":
                yield {"type": "content", "content": f"❌ **Error:**\n{step['output']}\n\n"}
        
        # Finally yield the answer
        yield {"type": "content", "content": f"✅ **Final Answer:**\n{response.get('final_answer', '')}"}
        
    else:
        # In standard mode, stream the LLM response directly
        logger.info("Using streaming LLM for standard mode.")
        
        # Convert Assistant UI messages to OpenAI format
        openai_messages = []
        for msg in request.messages:
            if msg.role == "user":
                content = ""
                for content_item in msg.content:
                    if content_item.type == "text":
                        content += content_item.text
                openai_messages.append({"role": "user", "content": content})
        
        # Stream the response chunk by chunk
        async for chunk in get_openai_completion(openai_messages):
            yield {"type": "content", "content": chunk} 