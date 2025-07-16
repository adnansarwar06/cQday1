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
You MUST use a structured "Thought, Action, Observation" reasoning process to solve complex problems step by step.

Here are the tools you have access to:
{tools}

IMPORTANT INSTRUCTIONS:
1. **Always start with Thought**: Analyze what you need to do next. Think step by step.
2. **Use Actions when needed**: If you need information or to perform a task, use a tool by responding with ONLY a JSON block in ```json markdown tags. The JSON must have "tool_name" and "tool_input" keys.
3. **Continue reasoning**: After each observation, think about what to do next. Don't stop until you have a complete answer.
4. **Only give final answer when truly complete**: Only provide a final answer when you have all the information needed to fully address the user's request.

**FILE OPERATION GUIDELINES:**
- To save content to the knowledge base, ALWAYS use: "knowledge_base/sample_document.txt" with append=true
- To create new files, use: "output/filename.txt" format  
- NEVER create new files when you should append to knowledge_base/sample_document.txt
- When saving research results, case studies, or information for future reference, use knowledge_base/sample_document.txt

You MUST continue the thought-action-observation cycle until you can provide a comprehensive answer.

Here is your work history (Scratchpad):
{scratchpad}

User's Request: {user_prompt}

Begin with your first Thought:
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
        
        # Collect the full response first, then clean and stream
        llm_response_buffer = []
        
        async for chunk in llm_stream:
            llm_response_buffer.append(chunk)
        
        llm_response = "".join(llm_response_buffer)
        
        # Remove JSON blocks completely from the thought before displaying to user
        thought_without_json = re.sub(r"```json\n.*?\n```", "", llm_response, flags=re.DOTALL)
        thought_without_json = thought_without_json.strip()
        
        # Clean and stream the thought without JSON blocks
        if thought_without_json:
            clean_thought = thought_without_json.replace('\\n', '\n').replace('\\r', '\r').replace('\\t', '\t')
            yield {"type": "thought_chunk", "content": clean_thought}
        
        # Update scratchpad with the full thought
        full_thought = f"Thought: {llm_response}"
        self.scratchpad.append(full_thought)
        logger.info(f"Full thought: {full_thought}")

        # 2. ACTION - Parse JSON but completely hide it from the user
        action_match = re.search(r"```json\n(.*?)\n```", llm_response, re.DOTALL)

        if not action_match:
            # No action found - check if this is truly a final answer or if we need to continue
            cleaned_response = llm_response.replace("Thought:", "").strip()
            
            # Only treat as final answer if:
            # 1. The response is substantial (more than 50 characters)
            # 2. We have attempted at least one action in our scratchpad
            # 3. The response doesn't look like it's incomplete or asking for more info
            has_previous_actions = any("Action:" in step or "Observation:" in step for step in self.scratchpad)
            is_substantial = len(cleaned_response) > 50
            looks_complete = not any(phrase in cleaned_response.lower() for phrase in [
                "let me", "i need to", "i should", "first i", "i'll search", "i'll check"
            ])
            
            if has_previous_actions and is_substantial and looks_complete:
                # Remove any JSON-like patterns that might have leaked through
                final_answer = cleaned_response.replace('{', '').replace('}', '')
                # Convert \n to actual newlines
                final_answer = final_answer.replace('\\n', '\n').replace('\\r', '\n').replace('\\t', '\t')
                yield {"type": "final_answer", "content": final_answer}
                return
            else:
                # Continue reasoning - the agent needs to take more actions
                if not has_previous_actions:
                    yield {"type": "thought_chunk", "content": "\n\nI need to gather more information to answer this properly. Let me take action.\n\n"}
                return

        action_json_str = action_match.group(1).strip()
        
        try:
            tool_call = json.loads(action_json_str)
            tool_name = tool_call.get("tool_name")
            tool_input = tool_call.get("tool_input", {})
            
            # Show a human-friendly action message
            action_message = self._format_action_message(tool_name, tool_input)
            yield {"type": "action_start", "content": f"\n\n{action_message}\n\n"}

            if tool_name in self.tools:
                # 3. OBSERVATION - Execute tool and format result nicely
                tool = self.tools[tool_name]
                
                if tool.request_model:
                    request_instance = tool.request_model(**tool_input)
                    result = await tool.coroutine(request_instance)
                else:
                    result = await tool.coroutine()
                
                # Format the observation in a human-readable way
                formatted_observation = self._format_observation(tool_name, result)
                observation = f"Observation: {str(result)}"
                self.scratchpad.append(observation)
                yield {"type": "observation", "content": formatted_observation}
            else:
                error_message = f"I tried to use a tool called '{tool_name}', but it's not available. Let me try a different approach."
                self.scratchpad.append(f"Error: Tool '{tool_name}' not found.")
                yield {"type": "error", "content": f"\n\n{error_message}\n\n"}
        
        except json.JSONDecodeError as e:
            error_message = "I had trouble parsing my action. Let me think about this differently."
            self.scratchpad.append(f"Error: Could not parse action JSON. Details: {e}")
            yield {"type": "error", "content": f"\n\n{error_message}\n\n"}
        except Exception as e:
            error_message = f"Something unexpected happened while I was working on your request. Let me try again."
            self.scratchpad.append(f"Error: An unexpected error occurred. Details: {e}")
            yield {"type": "error", "content": f"\n\n{error_message}\n\n"}

    def _format_action_message(self, tool_name: str, tool_input: dict) -> str:
        """Format the action message in a human-readable way."""
        if tool_name == "case_studies_search":
            return "🔍 Let me search for case studies that match your needs..."
        elif tool_name == "web_search":
            return "🌐 I'll search the web for relevant information..."
        elif tool_name == "create_file":
            filename = tool_input.get("filepath", "a file")
            return f"📝 I'll create the file '{filename}' for you..."
        elif tool_name == "edit_file":
            filename = tool_input.get("filepath", "the file")
            append_mode = tool_input.get("append", False)
            action_type = "append to" if append_mode else "update"
            return f"✏️ I'll {action_type} '{filename}' with the new content..."
        elif tool_name == "read_file":
            filename = tool_input.get("filepath", "the file")
            return f"📖 Let me read '{filename}' to see what's there..."
        elif tool_name == "list_files":
            directory = tool_input.get("directory_path", "the directory")
            return f"📁 I'll check what files are in '{directory}'..."
        else:
            return f"⚙️ I'm using the {tool_name} tool to help with your request..."

    def _format_observation(self, tool_name: str, result) -> str:
        """Format the observation in a human-readable way."""
        if tool_name == "case_studies_search":
            return self._format_case_study_results(result)
        elif tool_name == "web_search":
            return self._format_web_search_results(result)
        elif tool_name in ["create_file", "edit_file"]:
            return self._format_file_operation_result(result)
        elif tool_name == "read_file":
            return self._format_file_content(result)
        elif tool_name == "list_files":
            return self._format_file_list(result)
        else:
            # Clean any remaining JSON-like formatting from generic results
            clean_result = str(result)
            clean_result = clean_result.replace('{', '').replace('}', '').replace('"', '')
            # Convert \n to actual newlines
            clean_result = clean_result.replace('\\n', '\n').replace('\\r', '\n').replace('\\t', ' ')
            # Clean up multiple newlines and spaces
            lines = [line.strip() for line in clean_result.split('\n') if line.strip()]
            clean_result = '\n'.join(lines)
            return f"\n\nI've completed the {tool_name} operation. Here's what I found:\n\n{clean_result}\n\n"

    def _format_case_study_results(self, result) -> str:
        """Format case study search results in a human-friendly way."""
        if hasattr(result, 'results') and result.results:
            formatted = "\n\n✅ **Found some great case studies!**\n\n"
            for i, study in enumerate(result.results[:3], 1):  # Show top 3
                # Clean the title
                clean_title = str(study.title).replace('{', '').replace('}', '').replace('\\n', ' ').replace('\n', ' ')
                formatted += f"**{i}. {clean_title}**\n"
                
                if study.url:
                    clean_url = str(study.url).replace('{', '').replace('}', '')
                    formatted += f"🔗 {clean_url}\n"
                    
                if study.summary:
                    # Comprehensive cleaning of summary
                    clean_summary = str(study.summary)
                    clean_summary = clean_summary.replace('<strong>', '**').replace('</strong>', '**')
                    clean_summary = clean_summary.replace('<b>', '**').replace('</b>', '**')
                    clean_summary = clean_summary.replace('<em>', '*').replace('</em>', '*')
                    clean_summary = clean_summary.replace('<i>', '*').replace('</i>', '*')
                    clean_summary = clean_summary.replace('{', '').replace('}', '')
                    # Convert \n to actual newlines, but clean up excessive spacing
                    clean_summary = clean_summary.replace('\\n', '\n').replace('\\r', '\n').replace('\\t', ' ')
                    # Clean up multiple newlines and spaces
                    lines = [line.strip() for line in clean_summary.split('\n') if line.strip()]
                    clean_summary = '\n'.join(lines)
                    formatted += f"📄 {clean_summary}\n\n"
            return formatted
        else:
            return "\n\n❌ I couldn't find any case studies matching your criteria. Let me try a different approach.\n\n"

    def _format_web_search_results(self, result) -> str:
        """Format web search results in a human-friendly way."""
        if hasattr(result, 'results') and result.results:
            formatted = "\n\n✅ **Here's what I found:**\n\n"
            for i, item in enumerate(result.results[:3], 1):  # Show top 3
                # Clean the title
                clean_title = str(item.title).replace('{', '').replace('}', '').replace('\\n', ' ').replace('\n', ' ')
                formatted += f"**{i}. {clean_title}**\n"
                
                if item.url:
                    clean_url = str(item.url).replace('{', '').replace('}', '')
                    formatted += f"🔗 {clean_url}\n"
                    
                if item.summary:
                    # Comprehensive cleaning of summary
                    clean_summary = str(item.summary)
                    clean_summary = clean_summary.replace('<strong>', '**').replace('</strong>', '**')
                    clean_summary = clean_summary.replace('<b>', '**').replace('</b>', '**')
                    clean_summary = clean_summary.replace('<em>', '*').replace('</em>', '*')
                    clean_summary = clean_summary.replace('<i>', '*').replace('</i>', '*')
                    clean_summary = clean_summary.replace('{', '').replace('}', '')
                    # Convert \n to actual newlines, but clean up excessive spacing
                    clean_summary = clean_summary.replace('\\n', '\n').replace('\\r', '\n').replace('\\t', ' ')
                    # Clean up multiple newlines and spaces
                    lines = [line.strip() for line in clean_summary.split('\n') if line.strip()]
                    clean_summary = '\n'.join(lines)
                    formatted += f"📄 {clean_summary}\n\n"
            return formatted
        else:
            return "\n\n❌ I couldn't find relevant information. Let me try a different search approach.\n\n"

    def _format_file_operation_result(self, result) -> str:
        """Format file operation results."""
        if hasattr(result, 'success') and result.success:
            filepath = str(result.filepath).replace('{', '').replace('}', '')
            message = str(result.message).replace('{', '').replace('}', '')
            return f"\n\n✅ **File operation completed successfully!**\n📁 {filepath}\n💾 {message}\n\n"
        else:
            clean_result = str(result).replace('{', '').replace('}', '')
            return f"\n\n❌ **There was an issue with the file operation:**\n{clean_result}\n\n"

    def _format_file_content(self, result) -> str:
        """Format file content results."""
        if hasattr(result, 'content'):
            content = str(result.content).replace('{', '').replace('}', '')
            # Convert \n to actual newlines for file content
            content = content.replace('\\n', '\n').replace('\\r', '\n').replace('\\t', '\t')
            content_preview = content[:300] + "..." if len(content) > 300 else content
            return f"\n\n📖 **File content:**\n```\n{content_preview}\n```\n\n"
        else:
            clean_result = str(result).replace('{', '').replace('}', '')
            clean_result = clean_result.replace('\\n', '\n').replace('\\r', '\n').replace('\\t', ' ')
            return f"\n\n❌ **Couldn't read the file:**\n{clean_result}\n\n"

    def _format_file_list(self, result) -> str:
        """Format file list results."""
        if hasattr(result, 'files') and result.files:
            files_list = '\n'.join(f"• {filename}" for filename in result.files[:10])
            directory = str(result.directory).replace('{', '').replace('}', '')
            total_text = f"\n(Showing {min(10, len(result.files))} of {result.total_count} files)" if result.total_count > 10 else ""
            return f"\n\n📁 **Files in {directory}:**\n{files_list}{total_text}\n\n"
        else:
            directory = str(result.directory).replace('{', '').replace('}', '')
            return f"\n\n📁 **No files found in {directory}**\n\n"

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
            
            # Only break if we found a final answer
            if final_answer_found:
                break
                
            # Continue to next step if we completed an action/observation cycle
            
        else:
            yield {"type": "final_answer", "content": "I've reached my maximum number of reasoning steps. Let me provide you with what I've found so far."}


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