"""
FastAPI router for File System Tools API endpoints.

This module provides dedicated HTTP endpoints for each file operation,
allowing the frontend to make direct API calls for file management.
"""

import logging
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from file_tools import (
    list_files, ListFilesRequest, FileListResponse,
    read_file, ReadFileRequest, FileContentResponse,
    create_file, CreateFileRequest, FileOperationResponse,
    edit_file, EditFileRequest,
    KNOWLEDGE_BASE_PATH, OUTPUT_PATH
)

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/file-tools", tags=["file-tools"])


# --- Configuration Endpoint ---

class DirectoryConfigResponse(BaseModel):
    """Response model for directory configuration."""
    knowledge_base_path: str
    output_path: str
    available_directories: List[str]


@router.get("/config", response_model=DirectoryConfigResponse)
async def get_directory_config():
    """
    Get the current directory configuration for the frontend.
    
    Returns:
        DirectoryConfigResponse: Available directories and their paths
    """
    try:
        return DirectoryConfigResponse(
            knowledge_base_path=KNOWLEDGE_BASE_PATH,
            output_path=OUTPUT_PATH,
            available_directories=["knowledge_base", "output"]
        )
    except Exception as e:
        logger.error(f"Error getting directory config: {e}")
        raise HTTPException(status_code=500, detail="Failed to get directory configuration")


# --- File Listing Endpoint ---

@router.post("/list", response_model=FileListResponse)
async def list_files_endpoint(request: ListFilesRequest):
    """
    List all files in the specified directory.
    
    Args:
        request: ListFilesRequest with directory to list
        
    Returns:
        FileListResponse: List of files with metadata
        
    Raises:
        HTTPException: If directory access fails or is invalid
    """
    try:
        logger.info(f"Listing files in directory: {request.directory}")
        result = await list_files(request)
        return result
    except ValueError as e:
        logger.error(f"Validation error in list_files: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error listing files: {e}")
        raise HTTPException(status_code=500, detail="Failed to list files")


# --- File Reading Endpoint ---

@router.post("/read", response_model=FileContentResponse)
async def read_file_endpoint(request: ReadFileRequest):
    """
    Read and return the contents of a file.
    
    Args:
        request: ReadFileRequest with file path to read
        
    Returns:
        FileContentResponse: File content and metadata
        
    Raises:
        HTTPException: If file reading fails or file doesn't exist
    """
    try:
        logger.info(f"Reading file: {request.filepath}")
        result = await read_file(request)
        return result
    except ValueError as e:
        logger.error(f"Validation error in read_file: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error reading file: {e}")
        raise HTTPException(status_code=500, detail="Failed to read file")


# --- File Creation Endpoint ---

@router.post("/create", response_model=FileOperationResponse)
async def create_file_endpoint(request: CreateFileRequest):
    """
    Create a new file with the specified content.
    
    Args:
        request: CreateFileRequest with file path and content
        
    Returns:
        FileOperationResponse: Creation result and metadata
        
    Raises:
        HTTPException: If file creation fails or path is invalid
    """
    try:
        logger.info(f"Creating file: {request.filepath}")
        result = await create_file(request)
        
        if not result.success:
            raise HTTPException(status_code=400, detail=result.message)
        
        return result
    except ValueError as e:
        logger.error(f"Validation error in create_file: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        logger.error(f"Error creating file: {e}")
        raise HTTPException(status_code=500, detail="Failed to create file")


# --- File Editing Endpoint ---

@router.post("/edit", response_model=FileOperationResponse)
async def edit_file_endpoint(request: EditFileRequest):
    """
    Edit an existing file by replacing or appending content.
    
    Args:
        request: EditFileRequest with file path, content, and append flag
        
    Returns:
        FileOperationResponse: Edit result and metadata
        
    Raises:
        HTTPException: If file editing fails or path is invalid
    """
    try:
        logger.info(f"Editing file: {request.filepath} (append: {request.append})")
        result = await edit_file(request)
        
        if not result.success:
            raise HTTPException(status_code=400, detail=result.message)
        
        return result
    except ValueError as e:
        logger.error(f"Validation error in edit_file: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        logger.error(f"Error editing file: {e}")
        raise HTTPException(status_code=500, detail="Failed to edit file")


# --- Batch Operations Endpoint ---

class BatchListRequest(BaseModel):
    """Request model for listing files in multiple directories."""
    directories: List[str]


class BatchListResponse(BaseModel):
    """Response model for batch file listing."""
    results: Dict[str, FileListResponse]
    success_count: int
    error_count: int
    errors: Dict[str, str]


@router.post("/batch/list", response_model=BatchListResponse)
async def batch_list_files_endpoint(request: BatchListRequest):
    """
    List files in multiple directories at once.
    
    Args:
        request: BatchListRequest with list of directories
        
    Returns:
        BatchListResponse: Results for each directory with success/error counts
    """
    results = {}
    errors = {}
    success_count = 0
    error_count = 0
    
    for directory in request.directories:
        try:
            list_request = ListFilesRequest(directory=directory)
            result = await list_files(list_request)
            results[directory] = result
            success_count += 1
            logger.info(f"Successfully listed files in: {directory}")
        except Exception as e:
            errors[directory] = str(e)
            error_count += 1
            logger.error(f"Error listing files in {directory}: {e}")
    
    return BatchListResponse(
        results=results,
        success_count=success_count,
        error_count=error_count,
        errors=errors
    )


# --- Health Check Endpoint ---

class HealthCheckResponse(BaseModel):
    """Response model for health check."""
    status: str
    directories_accessible: Dict[str, bool]
    message: str


@router.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """
    Check the health of the file tools service.
    
    Returns:
        HealthCheckResponse: Service status and directory accessibility
    """
    try:
        directories_accessible = {}
        
        # Test access to both directories
        for name, path in [("knowledge_base", KNOWLEDGE_BASE_PATH), ("output", OUTPUT_PATH)]:
            try:
                test_request = ListFilesRequest(directory=name)
                await list_files(test_request)
                directories_accessible[name] = True
            except Exception as e:
                directories_accessible[name] = False
                logger.warning(f"Health check failed for {name}: {e}")
        
        all_accessible = all(directories_accessible.values())
        status = "healthy" if all_accessible else "degraded"
        message = "All systems operational" if all_accessible else "Some directories are not accessible"
        
        return HealthCheckResponse(
            status=status,
            directories_accessible=directories_accessible,
            message=message
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail="Health check failed") 