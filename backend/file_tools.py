"""
File System Tools module for the agent backend.

This module provides file system operations as agent tools, allowing the agent
to interact with the local file system in a controlled manner. All file operations
are restricted to configured directories for security.

For future expansion, new file operations can be added by:
1. Creating a new Pydantic request model
2. Implementing the async function with proper error handling
3. Registering the tool in tools.py using the register_tool() function

Environment Variables Required:
- FILE_TOOLS_KNOWLEDGE_BASE_PATH: Directory for file operations (read/write/list)
- FILE_TOOLS_OUTPUT_PATH: Directory for file operations (read/write/list)
"""

import os
import logging
from typing import List, Optional
from pathlib import Path
from pydantic import BaseModel, Field, validator
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

# --- Configuration ---

KNOWLEDGE_BASE_PATH = os.getenv("FILE_TOOLS_KNOWLEDGE_BASE_PATH", "./knowledge_base")
OUTPUT_PATH = os.getenv("FILE_TOOLS_OUTPUT_PATH", "./output")


# Ensure directories exist at startup
def ensure_directories():
    """Create required directories if they don't exist."""
    for path_str in [KNOWLEDGE_BASE_PATH, OUTPUT_PATH]:
        path = Path(path_str)
        if not path.exists():
            path.mkdir(parents=True, exist_ok=True)
            logger.info(f"Created directory: {path.absolute()}")
        else:
            logger.info(f"Directory exists: {path.absolute()}")


# Initialize directories
ensure_directories()

# --- Pydantic Request Models ---


class ListFilesRequest(BaseModel):
    """Request model for listing files in a directory."""

    directory: str = Field(
        ...,
        description="Directory path to list files from. Use 'knowledge_base' or 'output' for configured directories, or a relative path within them.",
    )

    @validator("directory")
    def validate_directory(cls, v):
        """Ensure directory path is safe and within allowed bounds."""
        if v in ["knowledge_base", "output"]:
            return v
        # For other paths, ensure they don't contain dangerous patterns
        if ".." in v or os.path.isabs(v):
            raise ValueError(
                "Directory path must be relative and cannot contain '..' for security"
            )
        return v


class ReadFileRequest(BaseModel):
    """Request model for reading a file."""

    filepath: str = Field(
        ...,
        description="Path to the file to read. Use 'knowledge_base/filename' or 'output/filename' format.",
    )

    @validator("filepath")
    def validate_filepath(cls, v):
        """Ensure file path is safe and within allowed bounds."""
        if ".." in v or os.path.isabs(v):
            raise ValueError(
                "File path must be relative and cannot contain '..' for security"
            )
        return v


class CreateFileRequest(BaseModel):
    """Request model for creating a new file."""

    filepath: str = Field(
        ...,
        description="Path where the new file should be created. Use 'output/filename' format.",
    )
    content: str = Field(..., description="Content to write to the new file.")

    @validator("filepath")
    def validate_filepath(cls, v):
        """Ensure file path is safe and within allowed bounds."""
        if ".." in v or os.path.isabs(v):
            raise ValueError(
                "File path must be relative and cannot contain '..' for security"
            )
        if not v.startswith("output/"):
            raise ValueError("New files can only be created in the 'output' directory")
        return v


class EditFileRequest(BaseModel):
    """Request model for editing an existing file."""

    filepath: str = Field(
        ..., description="Path to the file to edit. Use 'knowledge_base/filename' to edit knowledge base files or 'output/filename' for output files."
    )
    content: str = Field(
        ..., description="New content to write to the file (replaces existing content)."
    )
    append: bool = Field(
        False,
        description="If True, append content to the file instead of replacing it.",
    )

    @validator("filepath")
    def validate_filepath(cls, v):
        """Ensure file path is safe and within allowed bounds."""
        if ".." in v or os.path.isabs(v):
            raise ValueError(
                "File path must be relative and cannot contain '..' for security"
            )
        return v


# --- Response Models ---


class FileListResponse(BaseModel):
    """Response model for file listing operations."""

    directory: str
    files: List[str]
    total_count: int


class FileContentResponse(BaseModel):
    """Response model for file reading operations."""

    filepath: str
    content: str
    size_bytes: int


class FileOperationResponse(BaseModel):
    """Response model for file creation/editing operations."""

    filepath: str
    operation: str
    success: bool
    message: str
    size_bytes: Optional[int] = None


# --- Helper Functions ---


def resolve_path(path_input: str) -> Path:
    """
    Resolve a path input to an absolute Path object.

    Args:
        path_input: Input path string (e.g., 'knowledge_base', 'output/file.txt')

    Returns:
        Resolved absolute Path object

    Raises:
        ValueError: If path is invalid or outside allowed directories
    """
    if path_input == "knowledge_base":
        return Path(KNOWLEDGE_BASE_PATH).resolve()
    elif path_input == "output":
        return Path(OUTPUT_PATH).resolve()
    elif path_input.startswith("knowledge_base/"):
        relative_path = path_input[len("knowledge_base/") :]
        return (Path(KNOWLEDGE_BASE_PATH) / relative_path).resolve()
    elif path_input.startswith("output/"):
        relative_path = path_input[len("output/") :]
        return (Path(OUTPUT_PATH) / relative_path).resolve()
    else:
        # Try as relative to knowledge base first
        kb_path = (Path(KNOWLEDGE_BASE_PATH) / path_input).resolve()
        if kb_path.exists():
            return kb_path
        # Then try as relative to output
        output_path = (Path(OUTPUT_PATH) / path_input).resolve()
        return output_path


def validate_path_safety(resolved_path: Path, operation: str) -> bool:
    """
    Validate that a resolved path is safe for the given operation.

    Args:
        resolved_path: The resolved absolute path
        operation: The operation type ('read', 'write', 'list')

    Returns:
        True if path is safe, False otherwise
    """
    kb_root = Path(KNOWLEDGE_BASE_PATH).resolve()
    output_root = Path(OUTPUT_PATH).resolve()

    try:
        # Check if path is within allowed directories
        if operation in ["read", "list", "write"]:
            # Reading/listing/writing allowed in both directories
            is_in_kb = kb_root in resolved_path.parents or resolved_path == kb_root
            is_in_output = (
                output_root in resolved_path.parents or resolved_path == output_root
            )
            return is_in_kb or is_in_output
        else:
            return False
    except (OSError, ValueError):
        return False


# --- Tool Functions ---


async def list_files(request: ListFilesRequest) -> FileListResponse:
    """
    List all files in the specified directory.

    Args:
        request: ListFilesRequest containing the directory to list

    Returns:
        FileListResponse with the list of files and metadata

    Raises:
        ValueError: If directory path is invalid or inaccessible
        OSError: If there's an error accessing the directory
    """
    try:
        resolved_path = resolve_path(request.directory)

        if not validate_path_safety(resolved_path, "list"):
            raise ValueError(
                f"Access denied: Directory '{request.directory}' is outside allowed paths"
            )

        if not resolved_path.exists():
            raise ValueError(f"Directory not found: '{request.directory}'")

        if not resolved_path.is_dir():
            raise ValueError(f"Path is not a directory: '{request.directory}'")

        # List all files (not directories) in the directory
        files = []
        for item in resolved_path.iterdir():
            if item.is_file():
                files.append(item.name)

        files.sort()  # Sort alphabetically for consistent output

        logger.info(f"Listed {len(files)} files from directory: {resolved_path}")

        return FileListResponse(
            directory=request.directory, files=files, total_count=len(files)
        )

    except Exception as e:
        logger.error(f"Error listing files in '{request.directory}': {e}")
        raise ValueError(f"Failed to list files: {e}")


async def read_file(request: ReadFileRequest) -> FileContentResponse:
    """
    Read and return the contents of a file.

    Args:
        request: ReadFileRequest containing the file path to read

    Returns:
        FileContentResponse with the file content and metadata

    Raises:
        ValueError: If file path is invalid or inaccessible
        OSError: If there's an error reading the file
    """
    try:
        resolved_path = resolve_path(request.filepath)

        if not validate_path_safety(resolved_path, "read"):
            raise ValueError(
                f"Access denied: File '{request.filepath}' is outside allowed paths"
            )

        if not resolved_path.exists():
            raise ValueError(f"File not found: '{request.filepath}'")

        if not resolved_path.is_file():
            raise ValueError(f"Path is not a file: '{request.filepath}'")

        # Read file content
        with open(resolved_path, "r", encoding="utf-8") as f:
            content = f.read()

        size_bytes = resolved_path.stat().st_size

        logger.info(f"Read file: {resolved_path} ({size_bytes} bytes)")

        return FileContentResponse(
            filepath=request.filepath, content=content, size_bytes=size_bytes
        )

    except UnicodeDecodeError:
        logger.error(f"Failed to decode file as UTF-8: {request.filepath}")
        raise ValueError(
            f"File '{request.filepath}' is not a valid text file (UTF-8 encoding required)"
        )
    except Exception as e:
        logger.error(f"Error reading file '{request.filepath}': {e}")
        raise ValueError(f"Failed to read file: {e}")


async def create_file(request: CreateFileRequest) -> FileOperationResponse:
    """
    Create a new file with the given content.

    Args:
        request: CreateFileRequest containing the file path and content

    Returns:
        FileOperationResponse with operation result and metadata

    Raises:
        ValueError: If file path is invalid or file already exists
        OSError: If there's an error creating the file
    """
    try:
        resolved_path = resolve_path(request.filepath)

        if not validate_path_safety(resolved_path, "write"):
            raise ValueError(
                f"Access denied: Cannot create file '{request.filepath}' outside output directory"
            )

        if resolved_path.exists():
            raise ValueError(
                f"File already exists: '{request.filepath}'. Use edit_file to modify existing files."
            )

        # Ensure parent directory exists
        resolved_path.parent.mkdir(parents=True, exist_ok=True)

        # Create and write file
        with open(resolved_path, "w", encoding="utf-8") as f:
            f.write(request.content)

        size_bytes = resolved_path.stat().st_size

        logger.info(f"Created file: {resolved_path} ({size_bytes} bytes)")

        return FileOperationResponse(
            filepath=request.filepath,
            operation="create",
            success=True,
            message=f"File '{request.filepath}' created successfully",
            size_bytes=size_bytes,
        )

    except Exception as e:
        logger.error(f"Error creating file '{request.filepath}': {e}")
        return FileOperationResponse(
            filepath=request.filepath,
            operation="create",
            success=False,
            message=f"Failed to create file: {e}",
        )


async def edit_file(request: EditFileRequest) -> FileOperationResponse:
    """
    Edit an existing file by replacing or appending content.

    Args:
        request: EditFileRequest containing the file path, content, and append flag

    Returns:
        FileOperationResponse with operation result and metadata

    Raises:
        ValueError: If file path is invalid
        OSError: If there's an error writing to the file
    """
    try:
        resolved_path = resolve_path(request.filepath)

        if not validate_path_safety(resolved_path, "write"):
            raise ValueError(
                f"Access denied: Cannot edit file '{request.filepath}' outside allowed directories"
            )

        # For edit operations, we allow editing files in both knowledge_base and output
        # but need to check write permissions
        kb_root = Path(KNOWLEDGE_BASE_PATH).resolve()
        output_root = Path(OUTPUT_PATH).resolve()

        is_in_kb = kb_root in resolved_path.parents or resolved_path == kb_root
        is_in_output = (
            output_root in resolved_path.parents or resolved_path == output_root
        )

        if not (is_in_kb or is_in_output):
            raise ValueError(
                f"File '{request.filepath}' is outside allowed directories"
            )

        # Ensure parent directory exists
        resolved_path.parent.mkdir(parents=True, exist_ok=True)

        # Write or append to file
        mode = "a" if request.append else "w"
        operation_type = "append" if request.append else "replace"

        with open(resolved_path, mode, encoding="utf-8") as f:
            f.write(request.content)

        size_bytes = resolved_path.stat().st_size

        logger.info(
            f"Edited file ({operation_type}): {resolved_path} ({size_bytes} bytes)"
        )

        return FileOperationResponse(
            filepath=request.filepath,
            operation=f"edit_{operation_type}",
            success=True,
            message=f"File '{request.filepath}' edited successfully ({operation_type})",
            size_bytes=size_bytes,
        )

    except Exception as e:
        logger.error(f"Error editing file '{request.filepath}': {e}")
        return FileOperationResponse(
            filepath=request.filepath,
            operation="edit",
            success=False,
            message=f"Failed to edit file: {e}",
        )
