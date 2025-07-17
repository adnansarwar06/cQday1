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
4. **WHEN YOU HAVE ALL NEEDED INFORMATION**: Once you have gathered sufficient information to fully answer the user's request, provide your final answer directly WITHOUT using any JSON blocks or tool calls. Just write your comprehensive response as plain text.

**HOW TO FINISH:**
- When you have enough information to answer the user's question completely, simply provide your final answer in plain text
- Do NOT include any JSON blocks in your final response
- Do NOT say "I need to" or "Let me" in your final answer - just provide the complete answer directly

**FILE OPERATION GUIDELINES:**
- To save content to the knowledge base, ALWAYS use: "knowledge_base/sample_document.txt" with append=true
- To create new files, use: "output/filename.txt" format  
- NEVER create new files when you should append to knowledge_base/sample_document.txt
- When saving research results, case studies, or information for future reference, use knowledge_base/sample_document.txt

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
        
        # Signal that thinking has started
        yield {"type": "thought_start", "content": ""}
        
        # Stream the response in real-time and also collect it
        llm_response_buffer = []
        current_chunk_buffer = ""
        in_json_block = False
        
        async for chunk in llm_stream:
            llm_response_buffer.append(chunk)
            current_chunk_buffer += chunk
            
            # Check if we're entering or exiting a JSON block
            if "```json" in current_chunk_buffer and not in_json_block:
                # Stream everything before the JSON block
                parts = current_chunk_buffer.split("```json", 1)
                if parts[0].strip():
                    yield {"type": "thought_chunk", "content": parts[0]}
                in_json_block = True
                current_chunk_buffer = parts[1] if len(parts) > 1 else ""
            elif "```" in current_chunk_buffer and in_json_block:
                # We're closing the JSON block, don't stream this content
                parts = current_chunk_buffer.split("```", 1)
                in_json_block = False
                current_chunk_buffer = parts[1] if len(parts) > 1 else ""
            elif not in_json_block:
                # Stream non-JSON content immediately, but filter out any remaining JSON patterns
                if not ('"tool_name"' in chunk or '"tool_input"' in chunk or chunk.strip().startswith('{')):
                    yield {"type": "thought_chunk", "content": chunk}
                current_chunk_buffer = ""
        
        # Stream any remaining non-JSON content
        if current_chunk_buffer and not in_json_block:
            # Filter out any JSON patterns from remaining content
            if not ('"tool_name"' in current_chunk_buffer or '"tool_input"' in current_chunk_buffer or 
                   current_chunk_buffer.strip().startswith('{')):
                yield {"type": "thought_chunk", "content": current_chunk_buffer}
        
        llm_response = "".join(llm_response_buffer)
        
        # Remove JSON blocks completely from the thought for scratchpad
        thought_without_json = re.sub(r"```json\n.*?\n```", "", llm_response, flags=re.DOTALL)
        thought_without_json = thought_without_json.strip()
        
        # Signal that thinking is complete (this will help frontend know to clean up)
        yield {"type": "thought_complete", "content": ""}
        
        # Update scratchpad with the full thought
        full_thought = f"Thought: {llm_response}"
        self.scratchpad.append(full_thought)
        logger.info(f"Full thought: {full_thought}")

        # 2. ACTION - Parse JSON but completely hide it from the user
        action_match = re.search(r"```json\n(.*?)\n```", llm_response, re.DOTALL)

        if not action_match:
            # No action found - check if this is truly a final answer or if we need to continue
            cleaned_response = llm_response.replace("Thought:", "").strip()
            
            # Check if this looks like a final answer
            has_previous_actions = any("Action:" in step or "Observation:" in step for step in self.scratchpad)
            is_substantial = len(cleaned_response) > 30  # Lowered threshold
            
            # More comprehensive completion indicators
            incomplete_phrases = [
                "let me", "i need to", "i should", "first i", "i'll search", "i'll check",
                "i will", "let's", "now i", "next i", "i must", "i have to"
            ]
            looks_incomplete = any(phrase in cleaned_response.lower() for phrase in incomplete_phrases)
            
            # Additional indicators that suggest completion
            completion_indicators = [
                "based on", "in summary", "therefore", "in conclusion", "the answer is",
                "here's what", "according to", "the results show", "the information shows"
            ]
            looks_complete = any(indicator in cleaned_response.lower() for indicator in completion_indicators)
            
            # Treat as final answer if:
            # 1. We have previous actions AND response is substantial AND doesn't look incomplete
            # 2. OR if it explicitly looks complete (regardless of previous actions)
            if (has_previous_actions and is_substantial and not looks_incomplete) or looks_complete:
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
            yield {"type": "action_start", "content": action_message}

            if tool_name in self.tools:
                # 3. OBSERVATION - Execute tool and provide streaming updates
                tool = self.tools[tool_name]
                
                # Provide initial progress update
                if tool_name == "web_search":
                    query = tool_input.get("query", "")
                    yield {"type": "action_progress", "content": f"Searching for: '{query}'...\n"}
                elif tool_name == "case_studies_search":
                    query = tool_input.get("user_prompt", "")
                    yield {"type": "action_progress", "content": f"Finding case studies for: '{query}'...\n"}
                
                # Add a small delay to show the initial progress
                import asyncio
                await asyncio.sleep(0.5)
                
                if tool.request_model:
                    request_instance = tool.request_model(**tool_input)
                    result = await tool.coroutine(request_instance)
                else:
                    result = await tool.coroutine()
                
                # Provide detailed progress for web search with streaming simulation
                if tool_name == "web_search" and hasattr(result, 'results'):
                    yield {"type": "action_progress", "content": f"✅ Found {len(result.results)} search results\n"}
                    await asyncio.sleep(0.3)
                    yield {"type": "action_progress", "content": f"🔄 Processing and scraping websites...\n"}
                    await asyncio.sleep(0.3)
                    
                    # Stream each result one by one with delays
                    for i, search_result in enumerate(result.results[:5], 1):
                        url = search_result.url
                        title = search_result.title[:60] + "..." if len(search_result.title) > 60 else search_result.title
                        # Show scraping progress for each site
                        yield {"type": "action_progress", "content": f"🔄 Scraping [{i}/{min(5, len(result.results))}]: {title[:40]}...\n"}
                        await asyncio.sleep(0.6)  # Simulate scraping time
                        yield {"type": "action_progress", "content": f"• [{i}] {title}\n   📍 {url}\n"}
                        await asyncio.sleep(0.3)  # Small delay between results
                    
                    # Show completion
                    yield {"type": "action_progress", "content": f"✅ Completed scraping {min(5, len(result.results))} websites\n"}
                    await asyncio.sleep(0.3)
                
                # Provide detailed progress for case studies search
                elif tool_name == "case_studies_search" and hasattr(result, 'results'):
                    yield {"type": "action_progress", "content": f"✅ Found {len(result.results)} case studies\n"}
                    await asyncio.sleep(0.3)
                    yield {"type": "action_progress", "content": f"🔄 Processing case studies...\n"}
                    await asyncio.sleep(0.3)
                    
                    # Stream each case study one by one
                    for i, study in enumerate(result.results[:3], 1):
                        title = study.title[:50] + "..." if len(study.title) > 50 else study.title
                        yield {"type": "action_progress", "content": f"📚 Analyzing [{i}/{min(3, len(result.results))}]: {title}\n"}
                        await asyncio.sleep(0.5)
                        yield {"type": "action_progress", "content": f"• [{i}] {study.title}\n   📍 {study.url}\n"}
                        await asyncio.sleep(0.3)
                    
                    yield {"type": "action_progress", "content": f"✅ Completed analyzing {min(3, len(result.results))} case studies\n"}
                    await asyncio.sleep(0.3)
                
                # Signal that observation/analysis is starting
                yield {"type": "observation_start", "content": ""}
                
                # Format the final observation
                formatted_observation = self._format_observation(tool_name, result)
                observation = f"Observation: {str(result)}"
                self.scratchpad.append(observation)
                
                # Stream the observation content
                yield {"type": "observation_chunk", "content": formatted_observation}
                
                # Signal observation is complete
                yield {"type": "observation_complete", "content": ""}
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
            prompt = tool_input.get("user_prompt", "your request")
            return f"🔍 Searching for case studies related to: '{prompt}'"
        elif tool_name == "web_search":
            query = tool_input.get("query", "relevant information")
            return f"🌐 Performing web search for: '{query}'"
        elif tool_name == "create_file":
            filename = tool_input.get("filepath", "a file")
            return f"📝 Creating file: '{filename}'"
        elif tool_name == "edit_file":
            filename = tool_input.get("filepath", "the file")
            append_mode = tool_input.get("append", False)
            action_type = "append to" if append_mode else "update"
            return f"✏️ {action_type.title()} file: '{filename}'"
        elif tool_name == "read_file":
            filename = tool_input.get("filepath", "the file")
            return f"📖 Reading file: '{filename}'"
        elif tool_name == "list_files":
            directory = tool_input.get("directory", "the directory")
            # Show the actual directory being listed with descriptive name
            directory_display = directory
            if directory == "knowledge_base":
                directory_display = "knowledge_base/ (Knowledge Base)"
            elif directory == "output":
                directory_display = "output/ (Output Directory)"
            return f"📁 Listing files in: {directory_display}"
        else:
            return f"⚙️ Using {tool_name} tool"

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
            filepath = str(result.filepath).replace('{', '').replace('}', '') if hasattr(result, 'filepath') else 'file'
            size_info = f" ({result.size_bytes} bytes)" if hasattr(result, 'size_bytes') else ""
            
            # Show full content with scrollable UI (frontend will handle scrolling)
            return f"\n\n📖 **File content:**{size_info}\n```\n{content}\n```\n\n"
        else:
            clean_result = str(result).replace('{', '').replace('}', '')
            clean_result = clean_result.replace('\\n', '\n').replace('\\r', '\n').replace('\\t', ' ')
            return f"\n\n❌ **Couldn't read the file:**\n{clean_result}\n\n"

    def _format_file_list(self, result) -> str:
        """Format file list results."""
        if hasattr(result, 'files') and result.files:
            files_list = '\n'.join(f"• {filename}" for filename in result.files[:20])  # Show more files
            directory = str(result.directory).replace('{', '').replace('}', '')
            
            # Show more descriptive directory names
            if directory == "knowledge_base":
                directory_display = "knowledge_base/ (Knowledge Base)"
            elif directory == "output":
                directory_display = "output/ (Output Directory)"
            else:
                directory_display = directory
                
            total_text = f"\n\n(Showing {min(20, len(result.files))} of {result.total_count} files)" if result.total_count > 20 else f"\n\n(Total: {result.total_count} files)"
            return f"\n\n📁 **Files in '{directory_display}':**\n{files_list}{total_text}\n\n"
        else:
            directory = str(result.directory).replace('{', '').replace('}', '')
            if directory == "knowledge_base":
                directory_display = "knowledge_base/ (Knowledge Base)"
            elif directory == "output":
                directory_display = "output/ (Output Directory)"
            else:
                directory_display = directory
            return f"\n\n📁 **No files found in '{directory_display}'**\n\n"

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
                    logger.info("Final answer found - stopping agent execution")
                    break
            
            # Only break if we found a final answer
            if final_answer_found:
                logger.info("Breaking out of main loop - agent completed")
                break
                
            # Continue to next step if we completed an action/observation cycle
            
        else:
            logger.info("Maximum steps reached - providing fallback final answer")
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