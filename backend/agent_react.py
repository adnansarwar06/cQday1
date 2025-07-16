"""
This module implements a ReAct-style (Reasoning and Acting) agent.

The agent uses a scratchpad to maintain a trace of its thoughts, actions, 
and observations, allowing it to perform multi-step reasoning to answer
complex user queries.
"""

import logging
import json
import re
from typing import Dict, Any, List, Optional, Callable, Awaitable, Type
from pydantic import BaseModel, Field

from llm import get_openai_response_non_stream
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
        self.trace: List[Dict[str, Any]] = []

    def _get_tool_definitions(self) -> str:
        """Formats the tool descriptions for the LLM prompt."""
        return "\n".join([f"- {name}: {tool.description}" for name, tool in self.tools.items()])

    async def _execute_step(self, user_prompt: str, step_callback=None) -> str:
        """Performs a single Thought-Action-Observation step."""
        
        # 1. THOUGHT
        prompt = REACT_SYSTEM_PROMPT.format(
            tools=self._get_tool_definitions(),
            scratchpad="\n".join(self.scratchpad),
            user_prompt=user_prompt
        )
        
        llm_response = await get_openai_response_non_stream(prompt)
        logger.info(f"LLM Response:\n{llm_response}")
        self.scratchpad.append(f"Thought: {llm_response}")
        
        thought_step = {"step_type": "Thought", "output": llm_response}
        self.trace.append(thought_step)
        if step_callback:
            await step_callback(thought_step)

        # 2. ACTION
        try:
            # More robustly find the JSON block for the action using regex
            action_match = re.search(r"```json\n(.*?)\n```", llm_response, re.DOTALL)

            if action_match:
                action_json_str = action_match.group(1).strip()
                tool_call = json.loads(action_json_str)
                tool_name = tool_call.get("tool_name")
                tool_input = tool_call.get("tool_input")
                
                if tool_name in self.tools:
                    action_step = {"step_type": "Action", "tool_name": tool_name, "tool_input": tool_input}
                    self.trace.append(action_step)
                    if step_callback:
                        await step_callback(action_step)
                    
                    # 3. OBSERVATION
                    tool = self.tools[tool_name]
                    
                    if not tool.request_model:
                        # This handles tools that might not have input schemas
                        result = await tool.coroutine()
                    else:
                        request_instance = tool.request_model(**tool_input)
                        result = await tool.coroutine(request_instance)
                    
                    observation = f"Observation: {str(result)}"
                    self.scratchpad.append(observation)
                    
                    obs_step = {"step_type": "Observation", "output": str(result)}
                    self.trace.append(obs_step)
                    if step_callback:
                        await step_callback(obs_step)
                    return "" # Indicates the loop should continue
                else:
                    return f"Error: Tool '{tool_name}' not found."
            else:
                # No action found, assume this is the final answer
                final_answer = llm_response.replace("Thought:", "").strip()
                return final_answer

        except Exception as e:
            logger.error(f"Error during action parsing or execution: {e}")
            observation = f"Error: Could not parse or execute action. Details: {e}"
            self.scratchpad.append(observation)
            
            error_step = {"step_type": "Error", "output": observation}
            self.trace.append(error_step)
            if step_callback:
                await step_callback(error_step)
            return "" # Continue the loop to let the agent recover

    async def run(self, user_prompt: str, step_callback=None) -> Dict[str, Any]:
        """
        Runs the ReAct agent loop until a final answer is found or max_steps is reached.
        """
        for i in range(self.max_steps):
            logger.info(f"--- ReAct Step {i+1}/{self.max_steps} ---")
            final_answer = await self._execute_step(user_prompt, step_callback)
            if final_answer:
                logger.info(f"Final Answer Found: {final_answer}")
                return {"final_answer": final_answer, "trace": self.trace}
        
        return {"final_answer": "Agent stopped after reaching max steps.", "trace": self.trace}


async def run_react_agent(request: ReActAgentRequest, tools: Optional[Dict[str, Tool]] = None, step_callback=None):
    """
    Entrypoint for running the ReAct agent.
    
    Args:
        request: The user's request object.
        tools: An optional dictionary of tools to use. If None, uses the global TOOL_REGISTRY.
        step_callback: Optional callback function to stream intermediate steps.
    """
    
    # If a specific toolset isn't provided, default to the global registry
    if tools is None:
        tools = TOOL_REGISTRY
        
    executor = ReActAgentExecutor(tools=tools, max_steps=request.max_steps)
    return await executor.run(request.user_prompt, step_callback) 