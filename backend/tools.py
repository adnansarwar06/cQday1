"""
This module defines the canonical Tool class and the master tool registry
for the entire application.
"""
import logging
from typing import Dict, Any, Callable, Awaitable, Type, Optional
from pydantic import BaseModel, ConfigDict

from web_search import web_search, WebSearchRequest
from case_studies import case_studies_search, CaseStudyRequest
from file_tools import (
    list_files, ListFilesRequest,
    read_file, ReadFileRequest,
    create_file, CreateFileRequest,
    edit_file, EditFileRequest
)

logger = logging.getLogger(__name__)

# --- Canonical Tool Definition ---

class Tool(BaseModel):
    """A single, authoritative definition of a tool that agents can use."""
    model_config = ConfigDict(arbitrary_types_allowed=True)
    name: str
    description: str
    coroutine: Callable[..., Awaitable[Any]]
    request_model: Optional[Type[BaseModel]] = None

# --- Master Tool Registry ---

TOOL_REGISTRY: Dict[str, Tool] = {}

def register_tool(tool: Tool):
    """Registers a tool in the master TOOL_REGISTRY."""
    logger.info(f"Registering tool in master registry: {tool.name}")
    TOOL_REGISTRY[tool.name] = tool

# Register all available tools here
register_tool(Tool(
    name="web_search",
    description=f"Performs a web search for up-to-date information. Input must be a JSON object with a 'query' key. Schema: {WebSearchRequest.model_json_schema()}",
    coroutine=web_search,
    request_model=WebSearchRequest
))
register_tool(Tool(
    name="case_studies_search",
    description=f"Searches for case studies about a specific company. Input must be a JSON object with a 'user_prompt' key. Schema: {CaseStudyRequest.model_json_schema()}",
    coroutine=case_studies_search,
    request_model=CaseStudyRequest
))

# Register File System Tools
register_tool(Tool(
    name="list_files",
    description=f"Lists all files in a specified directory. Use 'knowledge_base' or 'output' as directory names, or relative paths within them. Input must be a JSON object with a 'directory' key. Schema: {ListFilesRequest.model_json_schema()}",
    coroutine=list_files,
    request_model=ListFilesRequest
))

register_tool(Tool(
    name="read_file",
    description=f"Reads and returns the contents of a text file. Use format like 'knowledge_base/filename.txt' or 'output/filename.txt'. Input must be a JSON object with a 'filepath' key. Schema: {ReadFileRequest.model_json_schema()}",
    coroutine=read_file,
    request_model=ReadFileRequest
))

register_tool(Tool(
    name="create_file",
    description=f"Creates a new file with specified content in the output directory. Use format like 'output/filename.txt'. Input must be a JSON object with 'filepath' and 'content' keys. Schema: {CreateFileRequest.model_json_schema()}",
    coroutine=create_file,
    request_model=CreateFileRequest
))

register_tool(Tool(
    name="edit_file",
    description=f"Edits an existing file by replacing or appending content. Input must be a JSON object with 'filepath', 'content', and optional 'append' keys. Schema: {EditFileRequest.model_json_schema()}",
    coroutine=edit_file,
    request_model=EditFileRequest
)) 