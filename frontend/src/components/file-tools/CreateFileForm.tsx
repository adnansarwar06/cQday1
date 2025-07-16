/**
 * CreateFileForm component for creating new files.
 * 
 * This component provides a form interface for creating new files
 * with filename input, content area, and proper validation.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { 
  FilePlus, 
  Save, 
  X, 
  AlertCircle, 
  Loader2,
  FileText
} from 'lucide-react';
import { DirectoryItem } from '@/types/file-tools';

export interface CreateFileFormProps {
  /** Available directories for file creation */
  directories: DirectoryItem[];
  /** Currently selected directory */
  currentDirectory: string | null;
  /** Whether file creation is in progress */
  loading: boolean;
  /** Error message if file creation failed */
  error: string | null;
  /** Callback when a file is created */
  onFileCreate: (filepath: string, content: string) => void;
  /** Callback when form is canceled */
  onCancel?: () => void;
  /** Whether the form is visible */
  visible?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Validate filename input.
 */
const validateFilename = (filename: string): string | null => {
  if (!filename.trim()) {
    return 'Filename is required';
  }
  
  if (filename.length > 255) {
    return 'Filename is too long (max 255 characters)';
  }
  
  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (invalidChars.test(filename)) {
    return 'Filename contains invalid characters';
  }
  
  // Check for reserved names (Windows)
  const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i;
  if (reservedNames.test(filename)) {
    return 'Filename is reserved and cannot be used';
  }
  
  return null;
};

/**
 * Get suggested file extension based on content type.
 */
const getSuggestedExtensions = () => [
  { value: '.txt', label: 'Text File (.txt)' },
  { value: '.md', label: 'Markdown (.md)' },
  { value: '.json', label: 'JSON (.json)' },
  { value: '.csv', label: 'CSV (.csv)' },
  { value: '.log', label: 'Log File (.log)' },
  { value: '', label: 'No extension' },
];

/**
 * CreateFileForm component for creating new files.
 */
export const CreateFileForm: React.FC<CreateFileFormProps> = ({
  directories,
  currentDirectory,
  loading,
  error,
  onFileCreate,
  onCancel,
  visible = true,
  className = '',
}) => {
  const [filename, setFilename] = useState('');
  const [content, setContent] = useState('');
  const [selectedDirectory, setSelectedDirectory] = useState(currentDirectory || '');
  const [filenameError, setFilenameError] = useState<string | null>(null);

  // Filter directories to only show writable ones (output directory)
  const writableDirectories = directories.filter(dir => 
    dir.name === 'output' || dir.name.includes('output')
  );

  /**
   * Handle filename change with validation.
   */
  const handleFilenameChange = (value: string) => {
    setFilename(value);
    const error = validateFilename(value);
    setFilenameError(error);
  };

  /**
   * Add file extension to filename.
   */
  const handleAddExtension = (extension: string) => {
    if (extension && !filename.endsWith(extension)) {
      const newFilename = filename.replace(/\.[^.]*$/, '') + extension;
      setFilename(newFilename);
      setFilenameError(validateFilename(newFilename));
    }
  };

  /**
   * Handle form submission.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedFilename = filename.trim();
    const validationError = validateFilename(trimmedFilename);
    
    if (validationError) {
      setFilenameError(validationError);
      return;
    }
    
    if (!selectedDirectory) {
      setFilenameError('Please select a directory');
      return;
    }
    
    const filepath = `${selectedDirectory}/${trimmedFilename}`;
    onFileCreate(filepath, content);
  };

  /**
   * Handle form reset.
   */
  const handleReset = () => {
    setFilename('');
    setContent('');
    setFilenameError(null);
    setSelectedDirectory(currentDirectory || '');
  };

  /**
   * Handle cancel action.
   */
  const handleCancel = () => {
    handleReset();
    if (onCancel) {
      onCancel();
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Label className="text-lg font-medium">
          <FilePlus className="inline-block w-5 h-5 mr-2" />
          Create New File
        </Label>
        {onCancel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={loading}
            className="h-8 w-8 p-0"
            aria-label="Close form"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <div>
            <strong>Error creating file:</strong> {error}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Directory Selection */}
        <div className="space-y-2">
          <Label htmlFor="directory-select">Directory</Label>
          <Select
            id="directory-select"
            value={selectedDirectory}
            onChange={(e) => setSelectedDirectory(e.target.value)}
            disabled={loading}
            required
          >
            <option value="">Select a directory</option>
            {writableDirectories.map((directory) => (
              <option 
                key={directory.name} 
                value={directory.name}
                disabled={!directory.accessible}
              >
                {directory.label}
                {!directory.accessible && ' (Not accessible)'}
              </option>
            ))}
          </Select>
          <div className="text-xs text-muted-foreground">
            Files can only be created in the output directory
          </div>
        </div>

        {/* Filename Input */}
        <div className="space-y-2">
          <Label htmlFor="filename-input">Filename</Label>
          <div className="space-y-2">
            <Input
              id="filename-input"
              type="text"
              value={filename}
              onChange={(e) => handleFilenameChange(e.target.value)}
              placeholder="Enter filename (e.g., report.txt)"
              disabled={loading}
              required
              className={filenameError ? 'border-red-300' : ''}
            />
            
            {/* File Extension Suggestions */}
            <div className="flex flex-wrap gap-1">
              <span className="text-xs text-muted-foreground mr-2">Quick add:</span>
              {getSuggestedExtensions().slice(0, 4).map((ext) => (
                <Button
                  key={ext.value}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAddExtension(ext.value)}
                  disabled={loading}
                  className="h-6 px-2 text-xs"
                >
                  {ext.label}
                </Button>
              ))}
            </div>
          </div>
          
          {filenameError && (
            <div className="text-sm text-red-600">
              {filenameError}
            </div>
          )}
        </div>

        {/* Content Input */}
        <div className="space-y-2">
          <Label htmlFor="content-input">File Content</Label>
          <Textarea
            id="content-input"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter file content here..."
            disabled={loading}
            className="min-h-[200px] font-mono text-sm"
          />
          <div className="text-xs text-muted-foreground">
            Lines: {content.split('\n').length} | Characters: {content.length}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={loading}
          >
            Clear Form
          </Button>
          
          <div className="flex items-center space-x-2">
            {onCancel && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            )}
            
            <Button
              type="submit"
              disabled={loading || !!filenameError || !filename.trim() || !selectedDirectory}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create File
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Preview */}
      {filename && selectedDirectory && (
        <div className="bg-muted/50 rounded p-3 text-sm">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>
              <strong>File will be created at:</strong> {selectedDirectory}/{filename}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}; 