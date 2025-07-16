/**
 * FileList component for displaying and selecting files from a directory.
 * 
 * This component shows a list of files with selection capabilities,
 * loading states, and error handling.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RefreshCw, File, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { FileItem } from '@/types/file-tools';

export interface FileListProps {
  /** Directory being displayed */
  directory: string | null;
  /** Files to display */
  files: FileItem[];
  /** Currently selected file */
  selectedFile: FileItem | null;
  /** Whether files are being loaded */
  loading: boolean;
  /** Error message if file loading failed */
  error: string | null;
  /** Callback when a file is selected */
  onFileSelect: (file: FileItem) => void;
  /** Callback to refresh the file list */
  onRefresh: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get appropriate icon for file type based on file extension.
 */
const getFileIcon = (filename: string) => {
  const extension = filename.toLowerCase().split('.').pop();
  
  switch (extension) {
    case 'txt':
    case 'md':
    case 'log':
      return FileText;
    default:
      return File;
  }
};

/**
 * Format file size in human-readable format.
 */
const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

/**
 * FileList component for displaying files with selection capabilities.
 */
export const FileList: React.FC<FileListProps> = ({
  directory,
  files,
  selectedFile,
  loading,
  error,
  onFileSelect,
  onRefresh,
  className = '',
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          <File className="inline-block w-4 h-4 mr-1" />
          Files {directory && `in ${directory}`}
          {files.length > 0 && (
            <span className="ml-2 text-xs text-muted-foreground">
              ({files.length} file{files.length !== 1 ? 's' : ''})
            </span>
          )}
        </Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={loading || !directory}
          className="h-8 w-8 p-0"
          aria-label="Refresh file list"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading files...
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <div>
            <strong>Error loading files:</strong> {error}
          </div>
        </div>
      )}

      {/* No Directory Selected */}
      {!directory && !loading && (
        <div className="text-center py-8 text-muted-foreground">
          <File className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Select a directory to view files</p>
        </div>
      )}

      {/* No Files Found */}
      {directory && !loading && !error && files.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <File className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No files found in {directory}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            className="mt-2"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && !loading && (
        <div className="border rounded-md divide-y max-h-96 overflow-y-auto">
          {files.map((file) => {
            const IconComponent = getFileIcon(file.name);
            const isSelected = selectedFile?.path === file.path;
            
            return (
              <button
                key={file.path}
                onClick={() => onFileSelect(file)}
                className={`w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground transition-colors ${
                  isSelected 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-background'
                }`}
                aria-pressed={isSelected}
              >
                <div className="flex items-center space-x-2">
                  <IconComponent className="h-4 w-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{file.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {file.path}
                      {file.size && (
                        <span className="ml-2">({formatFileSize(file.size)})</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Selected File Info */}
      {selectedFile && (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
          <strong>Selected:</strong> {selectedFile.name}
          <br />
          <strong>Path:</strong> {selectedFile.path}
          {selectedFile.size && (
            <>
              <br />
              <strong>Size:</strong> {formatFileSize(selectedFile.size)}
            </>
          )}
        </div>
      )}
    </div>
  );
}; 