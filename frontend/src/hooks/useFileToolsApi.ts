/**
 * API handlers and React hooks for File System Tools.
 * 
 * This module provides a clean interface for making HTTP requests to the
 * file tools backend API and managing the application state.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ListFilesRequest,
  ReadFileRequest,
  CreateFileRequest,
  EditFileRequest,
  BatchListRequest,
  FileListResponse,
  FileContentResponse,
  FileOperationResponse,
  DirectoryConfigResponse,
  BatchListResponse,
  HealthCheckResponse,
  ApiError,
  FileToolsState,
  FileToolsConfig,
  DirectoryItem,
  FileItem,
  UseFileToolsReturn,
  UseFileToolsConfigReturn,
} from '@/types/file-tools';

// --- Configuration ---

/**
 * Get the API base URL from environment variables.
 */
const getApiBaseUrl = (): string => {
  const baseUrl = process.env.NEXT_PUBLIC_FILE_TOOLS_API_URL || 'http://127.0.0.1:8000';
  return `${baseUrl}/api/file-tools`;
};

// --- API Error Handling ---

/**
 * Custom error class for API errors.
 */
export class FileToolsApiError extends Error {
  public status: number;
  public detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'FileToolsApiError';
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Handle API response and throw errors for non-200 status codes.
 */
async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorDetail = `HTTP ${response.status}: ${response.statusText}`;
    
    try {
      const errorData: ApiError = await response.json();
      errorDetail = errorData.detail || errorDetail;
    } catch {
      // If we can't parse the error response, use the default message
    }
    
    throw new FileToolsApiError(response.status, errorDetail);
  }
  
  return response.json();
}

/**
 * Make a POST request to the API.
 */
async function apiPost<TRequest, TResponse>(
  endpoint: string,
  data: TRequest
): Promise<TResponse> {
  const url = `${getApiBaseUrl()}${endpoint}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  return handleApiResponse<TResponse>(response);
}

/**
 * Make a GET request to the API.
 */
async function apiGet<TResponse>(endpoint: string): Promise<TResponse> {
  const url = `${getApiBaseUrl()}${endpoint}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  return handleApiResponse<TResponse>(response);
}

// --- API Functions ---

/**
 * Get directory configuration from the backend.
 */
export async function getDirectoryConfig(): Promise<DirectoryConfigResponse> {
  return apiGet<DirectoryConfigResponse>('/config');
}

/**
 * List files in a directory.
 */
export async function listFiles(request: ListFilesRequest): Promise<FileListResponse> {
  return apiPost<ListFilesRequest, FileListResponse>('/list', request);
}

/**
 * Read the contents of a file.
 */
export async function readFile(request: ReadFileRequest): Promise<FileContentResponse> {
  return apiPost<ReadFileRequest, FileContentResponse>('/read', request);
}

/**
 * Create a new file.
 */
export async function createFile(request: CreateFileRequest): Promise<FileOperationResponse> {
  return apiPost<CreateFileRequest, FileOperationResponse>('/create', request);
}

/**
 * Edit an existing file.
 */
export async function editFile(request: EditFileRequest): Promise<FileOperationResponse> {
  return apiPost<EditFileRequest, FileOperationResponse>('/edit', request);
}

/**
 * List files in multiple directories at once.
 */
export async function batchListFiles(request: BatchListRequest): Promise<BatchListResponse> {
  return apiPost<BatchListRequest, BatchListResponse>('/batch/list', request);
}

/**
 * Check the health of the file tools service.
 */
export async function healthCheck(): Promise<HealthCheckResponse> {
  return apiGet<HealthCheckResponse>('/health');
}

// --- React Hooks ---

/**
 * Hook for managing file tools configuration.
 */
export function useFileToolsConfig(): UseFileToolsConfigReturn {
  const [config, setConfig] = useState<FileToolsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getDirectoryConfig();
      
      const directories: DirectoryItem[] = response.available_directories.map(name => ({
        name,
        label: name === 'knowledge_base' ? 'Knowledge Base' : 'Output',
        path: name === 'knowledge_base' ? response.knowledge_base_path : response.output_path,
        accessible: true,
      }));
      
      setConfig({
        apiBaseUrl: getApiBaseUrl(),
        directories,
        maxFileSize: 10 * 1024 * 1024, // 10MB default
        allowedExtensions: ['.txt', '.md', '.json', '.csv', '.log'],
      });
    } catch (err) {
      const errorMessage = err instanceof FileToolsApiError 
        ? err.detail 
        : 'Failed to load configuration';
      setError(errorMessage);
      console.error('Failed to load file tools config:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshConfig();
  }, [refreshConfig]);

  return { config, loading, error, refreshConfig };
}

/**
 * Main hook for file tools operations and state management.
 */
export function useFileTools(): UseFileToolsReturn {
  const [state, setState] = useState<FileToolsState>({
    currentDirectory: null,
    directories: [],
    files: [],
    selectedFile: null,
    fileContent: null,
    loading: {
      directories: false,
      files: false,
      fileContent: false,
      creating: false,
      editing: false,
    },
    errors: {
      directories: null,
      files: null,
      fileContent: null,
      creating: null,
      editing: null,
    },
  });

  const { config } = useFileToolsConfig();

  // Update directories when config loads
  useEffect(() => {
    if (config?.directories) {
      setState(prev => ({
        ...prev,
        directories: config.directories,
      }));
    }
  }, [config]);

  /**
   * List files in a directory.
   */
  const handleListFiles = useCallback(async (directory: string): Promise<FileListResponse> => {
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, files: true },
      errors: { ...prev.errors, files: null },
    }));

    try {
      const response = await listFiles({ directory });
      
      const files: FileItem[] = response.files.map(filename => ({
        name: filename,
        path: `${directory}/${filename}`,
      }));

      setState(prev => ({
        ...prev,
        files,
        currentDirectory: directory,
        loading: { ...prev.loading, files: false },
      }));

      return response;
    } catch (err) {
      const errorMessage = err instanceof FileToolsApiError 
        ? err.detail 
        : 'Failed to list files';
      
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, files: false },
        errors: { ...prev.errors, files: errorMessage },
      }));
      
      throw err;
    }
  }, []);

  /**
   * Read the contents of a file.
   */
  const handleReadFile = useCallback(async (filepath: string): Promise<FileContentResponse> => {
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, fileContent: true },
      errors: { ...prev.errors, fileContent: null },
    }));

    try {
      const response = await readFile({ filepath });
      
      setState(prev => ({
        ...prev,
        fileContent: response.content,
        loading: { ...prev.loading, fileContent: false },
      }));

      return response;
    } catch (err) {
      const errorMessage = err instanceof FileToolsApiError 
        ? err.detail 
        : 'Failed to read file';
      
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, fileContent: false },
        errors: { ...prev.errors, fileContent: errorMessage },
      }));
      
      throw err;
    }
  }, []);

  /**
   * Create a new file.
   */
  const handleCreateFile = useCallback(async (
    filepath: string, 
    content: string
  ): Promise<FileOperationResponse> => {
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, creating: true },
      errors: { ...prev.errors, creating: null },
    }));

    try {
      const response = await createFile({ filepath, content });
      
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, creating: false },
      }));

      // Refresh the file list if we're in the same directory
      const directory = filepath.split('/')[0];
      if (state.currentDirectory === directory) {
        await handleListFiles(directory);
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof FileToolsApiError 
        ? err.detail 
        : 'Failed to create file';
      
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, creating: false },
        errors: { ...prev.errors, creating: errorMessage },
      }));
      
      throw err;
    }
  }, [state.currentDirectory, handleListFiles]);

  /**
   * Edit an existing file.
   */
  const handleEditFile = useCallback(async (
    filepath: string, 
    content: string, 
    append = false
  ): Promise<FileOperationResponse> => {
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, editing: true },
      errors: { ...prev.errors, editing: null },
    }));

    try {
      const response = await editFile({ filepath, content, append });
      
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, editing: false },
      }));

      // Update file content if this is the currently loaded file
      if (state.selectedFile?.path === filepath) {
        setState(prev => ({
          ...prev,
          fileContent: append ? (prev.fileContent || '') + content : content,
        }));
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof FileToolsApiError 
        ? err.detail 
        : 'Failed to edit file';
      
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, editing: false },
        errors: { ...prev.errors, editing: errorMessage },
      }));
      
      throw err;
    }
  }, [state.selectedFile]);

  /**
   * Refresh the current directory.
   */
  const refreshCurrentDirectory = useCallback(async () => {
    if (state.currentDirectory) {
      await handleListFiles(state.currentDirectory);
    }
  }, [state.currentDirectory, handleListFiles]);

  /**
   * Clear the current selection.
   */
  const clearSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedFile: null,
      fileContent: null,
    }));
  }, []);

  /**
   * Set the current directory.
   */
  const setCurrentDirectory = useCallback((directory: string) => {
    setState(prev => ({
      ...prev,
      currentDirectory: directory,
      selectedFile: null,
      fileContent: null,
    }));
  }, []);

  /**
   * Select a file.
   */
  const selectFile = useCallback((file: FileItem) => {
    setState(prev => ({
      ...prev,
      selectedFile: file,
    }));
  }, []);

  return {
    state,
    listFiles: handleListFiles,
    readFile: handleReadFile,
    createFile: handleCreateFile,
    editFile: handleEditFile,
    refreshCurrentDirectory,
    clearSelection,
    setCurrentDirectory,
    selectFile,
  };
}

/**
 * Hook for checking the health of the file tools service.
 */
export function useFileToolsHealth() {
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await healthCheck();
      setHealth(response);
    } catch (err) {
      const errorMessage = err instanceof FileToolsApiError 
        ? err.detail 
        : 'Health check failed';
      setError(errorMessage);
      console.error('Health check failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return { health, loading, error, checkHealth };
} 