"""
This module implements a ReAct-style (Reasoning and Acting) agent.

The agent uses a scratchpad to maintain a trace of its thoughts, actions, 
and observations, allowing it to perform multi-step reasoning to answer
complex user queries.
"""

import logging
import json
import re
from typing import Dict, Any, List, Optional, Callable, Awaitable, Type, AsyncGenerator
from pydantic import BaseModel, Field

from llm import get_openai_completion
from tools import Tool, TOOL_REGISTRY

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# --- Core ReAct Prompt Template ---

REACT_SYSTEM_PROMPT = """
You are a helpful and intelligent assistant that can use tools to answer questions.
To solve the user's request, you will use a "Thought, Action, Observation" loop.

Here are the tools you have access to:
{tools}

**Thought**: First, think about what you need to do. Analyze the user's request and the previous steps. Formulate a plan.
**Action**: If you decide to use a tool, you MUST respond with only a JSON block enclosed in markdown ```json tags.
The JSON object must have two keys: "tool_name" and "tool_input". Do not add any text before or after the JSON block.

If you have the final answer, do not output an Action. Instead, just provide the answer directly after your thought process.

Here is the history of your work so far (the "Scratchpad"):
{scratchpad}

User's Request: {user_prompt}
"""

# --- Agent Executor ---

class ReActAgentRequest(BaseModel):
    user_prompt: str
    max_steps: int = 20

class ReActAgentExecutor:
    """
    Orchestrates the ReAct reasoning loop.
    """
    def __init__(self, tools: Dict[str, Tool], max_steps: int = 20):
        self.tools = tools
        self.max_steps = max_steps
        self.scratchpad: List[str] = []

    def _get_tool_definitions(self) -> str:
        """Formats the tool descriptions for the LLM prompt."""
        return "\n".join([f"- {name}: {tool.description}" for name, tool in self.tools.items()])

    async def _execute_step(self, user_prompt: str) -> AsyncGenerator[Dict[str, Any], None]:
        """Performs a single Thought-Action-Observation step with real-time streaming."""
        
        # 1. THOUGHT - Stream in real-time
        prompt = REACT_SYSTEM_PROMPT.format(
            tools=self._get_tool_definitions(),
            scratchpad="\n".join(self.scratchpad),
            user_prompt=user_prompt
        )
        
        llm_stream = get_openai_completion([{"role": "user", "content": prompt}])
        
        # Start the thought with a prefix
        yield {"type": "thought_start", "content": "**Thought:** "}
        
        # Stream the thought process in real-time while buffering for action detection
        llm_response_buffer = []
        async for chunk in llm_stream:
            llm_response_buffer.append(chunk)
            # Stream each chunk immediately to the frontend
            yield {"type": "thought_chunk", "content": chunk}
        
        # Add a newline after the thought is complete
        yield {"type": "thought_chunk", "content": "\n\n"}
        
        llm_response = "".join(llm_response_buffer)
        
        # Update scratchpad with the full thought
        full_thought = f"Thought: {llm_response}"
        self.scratchpad.append(full_thought)
        logger.info(f"Full thought: {full_thought}")

        # 2. ACTION
        action_match = re.search(r"```json\n(.*?)\n```", llm_response, re.DOTALL)

        if not action_match:
            # No action found, assume this is the final answer
            final_answer = llm_response.replace("Thought:", "").strip()
            yield {"type": "final_answer", "content": final_answer}
            return

        action_json_str = action_match.group(1).strip()
        
        try:
            tool_call = json.loads(action_json_str)
            tool_name = tool_call.get("tool_name")
            tool_input = tool_call.get("tool_input", {})
            
            # Show action being executed
            yield {"type": "action_start", "content": f"**Action:** Using `{tool_name}` tool\n\n"}

            if tool_name in self.tools:
                # 3. OBSERVATION
                tool = self.tools[tool_name]
                
                if tool.request_model:
                    request_instance = tool.request_model(**tool_input)
                    result = await tool.coroutine(request_instance)
                else:
                    result = await tool.coroutine()
                
                observation = f"Observation: {str(result)}"
                self.scratchpad.append(observation)
                yield {"type": "observation", "content": f"**Observation:** {str(result)}\n\n"}
            else:
                error_message = f"Error: Tool '{tool_name}' not found."
                self.scratchpad.append(error_message)
                yield {"type": "error", "content": f"**Error:** {error_message}\n\n"}
        
        except json.JSONDecodeError as e:
            error_message = f"Error: Could not parse action JSON. Details: {e}"
            self.scratchpad.append(error_message)
            yield {"type": "error", "content": f"**Error:** {error_message}\n\n"}
        except Exception as e:
            error_message = f"Error: An unexpected error occurred. Details: {e}"
            self.scratchpad.append(error_message)
            yield {"type": "error", "content": f"**Error:** {error_message}\n\n"}

    async def run(self, user_prompt: str) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Runs the ReAct agent loop, yielding each step as it occurs.
        """
        for i in range(self.max_steps):
            logger.info(f"--- ReAct Step {i+1}/{self.max_steps} ---")
            step_generator = self._execute_step(user_prompt)
            final_answer_found = False
            async for step in step_generator:
                yield step
                if step.get("type") == "final_answer":
                    final_answer_found = True
                    break
            
            if final_answer_found:
                break
        else:
            yield {"type": "final_answer", "content": "Agent stopped after reaching max steps."}


async def run_react_agent_streaming(request: ReActAgentRequest, tools: Optional[Dict[str, Tool]] = None) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Entrypoint for running the ReAct agent with streaming.
    
    Args:
        request: The user's request object.
        tools: An optional dictionary of tools to use. If None, uses the global TOOL_REGISTRY.
        
    Yields:
        A dictionary representing each step of the ReAct agent's execution.
    """
    
    # If a specific toolset isn't provided, default to the global registry
    if tools is None:
        tools = TOOL_REGISTRY
        
    executor = ReActAgentExecutor(tools=tools, max_steps=request.max_steps)
    async for step in executor.run(request.user_prompt):
        yield step 