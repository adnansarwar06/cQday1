import logging
from typing import Dict, Any, List, Optional, AsyncGenerator
from pydantic import BaseModel

from tools import TOOL_REGISTRY, Tool
from agents import AgentRequest, route_request as standard_agent
from agent_react import ReActAgentRequest, run_react_agent_streaming

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Pydantic Models ---


class AssistantRequest(BaseModel):
    messages: List[Dict[str, Any]]
    mode: str = "standard"  # "standard" or "agent"
    enabled_tools: Optional[List[str]] = None


# --- Orchestrator ---


async def run_assistant_streaming(
    request: AssistantRequest,
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Orchestrates the agent execution based on the request mode.

    This function acts as a router, directing the user's request to either
    the standard agent or the ReAct agent. It also handles tool filtering.
    """
    logger.info(f"Orchestrator received request with mode: {request.mode}")

    # Filter tools based on what's enabled in the frontend
    if request.enabled_tools is not None:
        active_tools = {
            name: TOOL_REGISTRY[name]
            for name in request.enabled_tools
            if name in TOOL_REGISTRY
        }
    else:
        active_tools = TOOL_REGISTRY

    # Extract the last user message
    last_user_message = next(
        (msg for msg in reversed(request.messages) if msg["role"] == "user"), None
    )
    if not last_user_message:
        yield {"type": "error", "content": "No user message found."}
        return

    user_prompt = last_user_message["content"]
    if not isinstance(user_prompt, str):
        # Handle cases where content is a list of parts (e.g., from Vercel AI SDK)
        if isinstance(user_prompt, list) and user_prompt and "text" in user_prompt[0]:
            user_prompt = user_prompt[0]["text"]
        else:
            yield {"type": "error", "content": "Invalid message content format."}
            return

    # Route to the appropriate agent based on the mode
    if request.mode == "agent":
        logger.info("Routing to ReAct Agent")
        react_request = ReActAgentRequest(user_prompt=user_prompt)
        async for step in run_react_agent_streaming(react_request, tools=active_tools):
            if step.get("type") == "thought_start":
                # Signal start of thinking
                yield {"type": "content", "content": "Thought: "}
            elif step.get("type") == "thought_chunk":
                # Stream thought content in real-time
                yield {"type": "content", "content": step["content"]}
            elif step.get("type") == "thought_complete":
                # Add spacing after thought completion
                yield {"type": "content", "content": "\n\n"}
            elif step.get("type") == "action_start":
                # Format as action for frontend parsing, but filter out any JSON content
                action_content = step["content"]
                # Only yield if this doesn't look like JSON content
                if not (
                    '"tool_name"' in action_content
                    or '"tool_input"' in action_content
                    or "```json" in action_content
                    or action_content.strip().startswith("{")
                ):
                    yield {
                        "type": "content",
                        "content": f"Action: {action_content}\n\n",
                    }
            elif step.get("type") == "action_progress":
                # Stream progress updates directly WITHOUT "Action:" prefix (these will be appended to action content)
                yield {"type": "content", "content": step["content"]}
            elif step.get("type") == "observation_start":
                # Signal start of observation analysis
                yield {"type": "content", "content": "Observation: "}
            elif step.get("type") == "observation_chunk":
                # Stream observation content in real-time
                yield {"type": "content", "content": step["content"]}
            elif step.get("type") == "observation_complete":
                # Add spacing after observation completion
                yield {"type": "content", "content": "\n\n"}
            elif step.get("type") == "error":
                # Format as error
                yield {"type": "content", "content": f"Error: {step['content']}\n\n"}
            elif step.get("type") == "final_answer":
                yield {
                    "type": "content",
                    "content": f"\n\n**Here's what I found:**\n\n{step['content']}",
                }
    else:
        logger.info("Routing to Standard Agent")
        agent_request = AgentRequest(user_prompt=user_prompt)
        async for chunk in standard_agent(agent_request, tools=active_tools):
            yield {"type": "content", "content": chunk}
