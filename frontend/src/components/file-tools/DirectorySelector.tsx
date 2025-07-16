/**
 * DirectorySelector component for selecting directories in the file tools interface.
 * 
 * This component provides a dropdown to select from available directories
 * (knowledge_base, output) with proper loading and error states.
 */

import React from 'react';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RefreshCw, Folder } from 'lucide-react';
import { DirectoryItem } from '@/types/file-tools';

export interface DirectorySelectorProps {
  /** Available directories to choose from */
  directories: DirectoryItem[];
  /** Currently selected directory */
  selectedDirectory: string | null;
  /** Whether directories are being loaded */
  loading: boolean;
  /** Error message if directory loading failed */
  error: string | null;
  /** Callback when directory selection changes */
  onDirectoryChange: (directory: string) => void;
  /** Callback to refresh directory list */
  onRefresh?: () => void;
  /** Optional label for the selector */
  label?: string;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * DirectorySelector component for choosing between available directories.
 */
export const DirectorySelector: React.FC<DirectorySelectorProps> = ({
  directories,
  selectedDirectory,
  loading,
  error,
  onDirectoryChange,
  onRefresh,
  label = 'Select Directory',
  disabled = false,
  className = '',
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <Label htmlFor="directory-select" className="text-sm font-medium">
          <Folder className="inline-block w-4 h-4 mr-1" />
          {label}
        </Label>
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="h-8 w-8 p-0"
            aria-label="Refresh directories"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>

      <Select
        id="directory-select"
        value={selectedDirectory || ''}
        onChange={(e) => onDirectoryChange(e.target.value)}
        disabled={disabled || loading || directories.length === 0}
        className="w-full"
      >
        <option value="" disabled>
          {loading ? 'Loading directories...' : 'Choose a directory'}
        </option>
        {directories.map((directory) => (
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

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          <strong>Error:</strong> {error}
        </div>
      )}

      {selectedDirectory && (
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">Path:</span>{' '}
          {directories.find(d => d.name === selectedDirectory)?.path || selectedDirectory}
        </div>
      )}
    </div>
  );
}; 