/**
 * TypeScript interfaces for File System Tools API.
 * 
 * This file defines all the types and interfaces used for file operations
 * between the frontend and backend API endpoints.
 */

// --- Request Interfaces ---

/**
 * Request interface for listing files in a directory.
 */
export interface ListFilesRequest {
  /** Directory path to list files from. Use 'knowledge_base' or 'output' for configured directories. */
  directory: string;
}

/**
 * Request interface for reading a file.
 */
export interface ReadFileRequest {
  /** Path to the file to read. Use 'knowledge_base/filename' or 'output/filename' format. */
  filepath: string;
}

/**
 * Request interface for creating a new file.
 */
export interface CreateFileRequest {
  /** Path where the new file should be created. Use 'output/filename' format. */
  filepath: string;
  /** Content to write to the new file. */
  content: string;
}

/**
 * Request interface for editing an existing file.
 */
export interface EditFileRequest {
  /** Path to the file to edit. */
  filepath: string;
  /** New content to write to the file. */
  content: string;
  /** If true, append content to the file instead of replacing it. */
  append?: boolean;
}

/**
 * Request interface for batch file listing.
 */
export interface BatchListRequest {
  /** List of directories to list files from. */
  directories: string[];
}

// --- Response Interfaces ---

/**
 * Response interface for file listing operations.
 */
export interface FileListResponse {
  /** Directory that was listed. */
  directory: string;
  /** Array of filenames found in the directory. */
  files: string[];
  /** Total number of files found. */
  total_count: number;
}

/**
 * Response interface for file reading operations.
 */
export interface FileContentResponse {
  /** Path of the file that was read. */
  filepath: string;
  /** Content of the file. */
  content: string;
  /** Size of the file in bytes. */
  size_bytes: number;
}

/**
 * Response interface for file creation and editing operations.
 */
export interface FileOperationResponse {
  /** Path of the file that was operated on. */
  filepath: string;
  /** Type of operation performed (create, edit_replace, edit_append). */
  operation: string;
  /** Whether the operation was successful. */
  success: boolean;
  /** Human-readable message about the operation result. */
  message: string;
  /** Size of the file in bytes after the operation (if successful). */
  size_bytes?: number;
}

/**
 * Response interface for directory configuration.
 */
export interface DirectoryConfigResponse {
  /** Path to the knowledge base directory. */
  knowledge_base_path: string;
  /** Path to the output directory. */
  output_path: string;
  /** List of available directory names. */
  available_directories: string[];
}

/**
 * Response interface for batch file listing.
 */
export interface BatchListResponse {
  /** Results for each directory requested. */
  results: Record<string, FileListResponse>;
  /** Number of successful directory listings. */
  success_count: number;
  /** Number of failed directory listings. */
  error_count: number;
  /** Error messages for failed directories. */
  errors: Record<string, string>;
}

/**
 * Response interface for health check.
 */
export interface HealthCheckResponse {
  /** Overall status of the file tools service. */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Accessibility status for each directory. */
  directories_accessible: Record<string, boolean>;
  /** Human-readable status message. */
  message: string;
}

// --- API Error Interface ---

/**
 * Standard API error response interface.
 */
export interface ApiError {
  /** Error message. */
  detail: string;
  /** HTTP status code. */
  status?: number;
}

// --- File System State Interfaces ---

/**
 * Interface representing a file in the file system.
 */
export interface FileItem {
  /** Name of the file. */
  name: string;
  /** Full path to the file. */
  path: string;
  /** Size of the file in bytes (if known). */
  size?: number;
  /** Last modified timestamp (if available). */
  lastModified?: Date;
  /** Whether this file is currently selected in the UI. */
  selected?: boolean;
}

/**
 * Interface representing a directory in the file system.
 */
export interface DirectoryItem {
  /** Name of the directory. */
  name: string;
  /** Display label for the directory. */
  label: string;
  /** Full path to the directory. */
  path: string;
  /** Whether this directory is currently selected. */
  selected?: boolean;
  /** Whether this directory is accessible. */
  accessible?: boolean;
}

/**
 * Interface for file tools application state.
 */
export interface FileToolsState {
  /** Currently selected directory. */
  currentDirectory: string | null;
  /** Available directories. */
  directories: DirectoryItem[];
  /** Files in the current directory. */
  files: FileItem[];
  /** Currently selected file. */
  selectedFile: FileItem | null;
  /** Content of the currently loaded file. */
  fileContent: string | null;
  /** Loading states for different operations. */
  loading: {
    directories: boolean;
    files: boolean;
    fileContent: boolean;
    creating: boolean;
    editing: boolean;
  };
  /** Error states for different operations. */
  errors: {
    directories: string | null;
    files: string | null;
    fileContent: string | null;
    creating: string | null;
    editing: string | null;
  };
}

// --- Configuration Interfaces ---

/**
 * Interface for file tools configuration.
 */
export interface FileToolsConfig {
  /** Base URL for the file tools API. */
  apiBaseUrl: string;
  /** Available directories configuration. */
  directories: DirectoryItem[];
  /** Maximum file size for reading/editing (in bytes). */
  maxFileSize?: number;
  /** Allowed file extensions for operations. */
  allowedExtensions?: string[];
}

// --- Hook Return Types ---

/**
 * Return type for useFileTools hook.
 */
export interface UseFileToolsReturn {
  /** Current application state. */
  state: FileToolsState;
  /** Function to list files in a directory. */
  listFiles: (directory: string) => Promise<FileListResponse>;
  /** Function to read a file. */
  readFile: (filepath: string) => Promise<FileContentResponse>;
  /** Function to create a new file. */
  createFile: (filepath: string, content: string) => Promise<FileOperationResponse>;
  /** Function to edit an existing file. */
  editFile: (filepath: string, content: string, append?: boolean) => Promise<FileOperationResponse>;
  /** Function to refresh the current directory. */
  refreshCurrentDirectory: () => Promise<void>;
  /** Function to clear the current selection. */
  clearSelection: () => void;
  /** Function to set the current directory. */
  setCurrentDirectory: (directory: string) => void;
  /** Function to select a file. */
  selectFile: (file: FileItem) => void;
}

/**
 * Return type for useFileToolsConfig hook.
 */
export interface UseFileToolsConfigReturn {
  /** Current configuration. */
  config: FileToolsConfig | null;
  /** Whether configuration is loading. */
  loading: boolean;
  /** Configuration loading error. */
  error: string | null;
  /** Function to refresh configuration. */
  refreshConfig: () => Promise<void>;
}

// --- Component Props Interfaces ---

/**
 * Props for FileListComponent.
 */
export interface FileListComponentProps {
  /** Directory to list files from. */
  directory: string;
  /** Files to display. */
  files: FileItem[];
  /** Currently selected file. */
  selectedFile: FileItem | null;
  /** Loading state. */
  loading: boolean;
  /** Error message. */
  error: string | null;
  /** Callback when a file is selected. */
  onFileSelect: (file: FileItem) => void;
  /** Callback to refresh the file list. */
  onRefresh: () => void;
}

/**
 * Props for FileContentComponent.
 */
export interface FileContentComponentProps {
  /** File being displayed. */
  file: FileItem | null;
  /** Content of the file. */
  content: string | null;
  /** Loading state. */
  loading: boolean;
  /** Error message. */
  error: string | null;
  /** Whether the content is editable. */
  editable?: boolean;
  /** Callback when content is saved. */
  onSave?: (content: string) => void;
}

/**
 * Props for CreateFileComponent.
 */
export interface CreateFileComponentProps {
  /** Available directories for file creation. */
  directories: DirectoryItem[];
  /** Currently selected directory. */
  currentDirectory: string | null;
  /** Loading state. */
  loading: boolean;
  /** Error message. */
  error: string | null;
  /** Callback when a file is created. */
  onFileCreate: (filepath: string, content: string) => void;
}

/**
 * Props for FileToolsPanel.
 */
export interface FileToolsPanelProps {
  /** Whether the panel is open. */
  isOpen: boolean;
  /** Callback to close the panel. */
  onClose: () => void;
  /** Optional CSS class name. */
  className?: string;
} 