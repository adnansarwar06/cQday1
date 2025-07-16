/**
 * FileContentViewer component for reading and displaying file contents.
 * 
 * This component can display file contents in read-only mode or provide
 * editing capabilities with save functionality.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  FileText, 
  Edit, 
  Save, 
  X, 
  AlertCircle, 
  Loader2, 
  Eye,
  Download,
  Copy,
  Check
} from 'lucide-react';
import { FileItem } from '@/types/file-tools';

export interface FileContentViewerProps {
  /** File being displayed */
  file: FileItem | null;
  /** Content of the file */
  content: string | null;
  /** Whether content is being loaded */
  loading: boolean;
  /** Error message if content loading failed */
  error: string | null;
  /** Whether the content can be edited */
  editable?: boolean;
  /** Whether editing is currently enabled */
  isEditing?: boolean;
  /** Whether save operation is in progress */
  saving?: boolean;
  /** Callback when content is saved */
  onSave?: (content: string, append: boolean) => void;
  /** Callback when editing mode is toggled */
  onToggleEdit?: () => void;
  /** Callback when file should be downloaded */
  onDownload?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * FileContentViewer component for displaying and editing file contents.
 */
export const FileContentViewer: React.FC<FileContentViewerProps> = ({
  file,
  content,
  loading,
  error,
  editable = false,
  isEditing = false,
  saving = false,
  onSave,
  onToggleEdit,
  onDownload,
  className = '',
}) => {
  const [editedContent, setEditedContent] = useState(content || '');
  const [copied, setCopied] = useState(false);

  // Update edited content when content changes
  useEffect(() => {
    if (content !== null) {
      setEditedContent(content);
    }
  }, [content]);

  /**
   * Handle saving the edited content.
   */
  const handleSave = (append: boolean = false) => {
    if (onSave && editedContent !== null) {
      onSave(editedContent, append);
    }
  };

  /**
   * Handle canceling edit mode.
   */
  const handleCancelEdit = () => {
    setEditedContent(content || '');
    if (onToggleEdit) {
      onToggleEdit();
    }
  };

  /**
   * Copy content to clipboard.
   */
  const handleCopy = async () => {
    if (content) {
      try {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
      }
    }
  };

  /**
   * Format file size for display.
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

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          <FileText className="inline-block w-4 h-4 mr-1" />
          {file ? `Content of ${file.name}` : 'File Content'}
          {file?.size && (
            <span className="ml-2 text-xs text-muted-foreground">
              ({formatFileSize(file.size)})
            </span>
          )}
        </Label>
        
        <div className="flex items-center space-x-1">
          {content && !isEditing && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-8 w-8 p-0"
                aria-label="Copy content"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              
              {onDownload && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDownload}
                  className="h-8 w-8 p-0"
                  aria-label="Download file"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
          
          {editable && onToggleEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleEdit}
              disabled={loading}
              className="h-8 w-8 p-0"
              aria-label={isEditing ? "Cancel editing" : "Edit file"}
            >
              {isEditing ? (
                <X className="h-4 w-4" />
              ) : (
                <Edit className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground border rounded-md">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading file content...
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <div>
            <strong>Error loading content:</strong> {error}
          </div>
        </div>
      )}

      {/* No File Selected */}
      {!file && !loading && (
        <div className="text-center py-12 text-muted-foreground border rounded-md">
          <Eye className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Select a file to view its content</p>
        </div>
      )}

      {/* File Selected but No Content */}
      {file && !content && !loading && !error && (
        <div className="text-center py-12 text-muted-foreground border rounded-md">
          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Click a file to read its content</p>
        </div>
      )}

      {/* Content Display/Edit */}
      {content !== null && !loading && (
        <div className="space-y-2">
          {isEditing ? (
            // Edit Mode
            <>
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
                placeholder="File content..."
                disabled={saving}
              />
              
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Lines: {editedContent.split('\n').length} | 
                  Characters: {editedContent.length}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={saving}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSave(true)}
                    disabled={saving || editedContent === content}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-1" />
                    )}
                    Append
                  </Button>
                  
                  <Button
                    size="sm"
                    onClick={() => handleSave(false)}
                    disabled={saving || editedContent === content}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-1" />
                    )}
                    Save
                  </Button>
                </div>
              </div>
            </>
          ) : (
            // View Mode
            <>
              <div className="border rounded-md">
                <pre className="p-4 text-sm font-mono whitespace-pre-wrap max-h-[400px] overflow-auto">
                  {content}
                </pre>
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div>
                  Lines: {content.split('\n').length} | 
                  Characters: {content.length}
                </div>
                
                {copied && (
                  <div className="text-green-600">
                    Copied to clipboard!
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}; 