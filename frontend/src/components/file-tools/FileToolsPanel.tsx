/**
 * FileToolsPanel component - Main interface for file system operations.
 * 
 * This component provides a comprehensive interface for all file operations:
 * - Directory selection and file listing
 * - File content viewing and editing
 * - File creation with validation
 * - Error handling and loading states
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  FolderOpen, 
  X, 
  Plus, 
  RefreshCw, 
  FileText,
  Settings,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

import { DirectorySelector } from './DirectorySelector';
import { FileList } from './FileList';
import { FileContentViewer } from './FileContentViewer';
import { CreateFileForm } from './CreateFileForm';
import { useFileTools, useFileToolsHealth } from '@/hooks/useFileToolsApi';
import { FileToolsPanelProps } from '@/types/file-tools';

/**
 * Main FileToolsPanel component providing the complete file management interface.
 */
export const FileToolsPanel: React.FC<FileToolsPanelProps> = ({
  isOpen,
  onClose,
  className = '',
}) => {
  const {
    state,
    listFiles,
    readFile,
    createFile,
    editFile,
    refreshCurrentDirectory,
    clearSelection,
    setCurrentDirectory,
    selectFile,
  } = useFileTools();

  const { health } = useFileToolsHealth();

  const [activeTab, setActiveTab] = useState<'browse' | 'create'>('browse');
  const [isEditing, setIsEditing] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  /**
   * Handle directory selection change.
   */
  const handleDirectoryChange = async (directory: string) => {
    try {
      setCurrentDirectory(directory);
      await listFiles(directory);
    } catch (error) {
      console.error('Failed to list files:', error);
    }
  };

  /**
   * Handle file selection and reading.
   */
  const handleFileSelect = async (file: any) => {
    try {
      selectFile(file);
      await readFile(file.path);
    } catch (error) {
      console.error('Failed to read file:', error);
    }
  };

  /**
   * Handle file content saving.
   */
  const handleSaveContent = async (content: string, append: boolean = false) => {
    if (state.selectedFile) {
      try {
        await editFile(state.selectedFile.path, content, append);
        setIsEditing(false);
      } catch (error) {
        console.error('Failed to save file:', error);
      }
    }
  };

  /**
   * Handle new file creation.
   */
  const handleCreateFile = async (filepath: string, content: string) => {
    try {
      await createFile(filepath, content);
      setShowCreateForm(false);
      setActiveTab('browse');
      
      // Refresh the current directory if we created a file there
      const directory = filepath.split('/')[0];
      if (state.currentDirectory === directory) {
        await refreshCurrentDirectory();
      }
    } catch (error) {
      console.error('Failed to create file:', error);
    }
  };

  /**
   * Toggle editing mode.
   */
  const handleToggleEdit = () => {
    setIsEditing(!isEditing);
  };

  /**
   * Handle refresh all data.
   */
  const handleRefreshAll = async () => {
    try {
      if (state.currentDirectory) {
        await refreshCurrentDirectory();
      }
    } catch (error) {
      console.error('Failed to refresh:', error);
    }
  };

  /**
   * Get health status indicator.
   */
  const getHealthIndicator = () => {
    if (!health) return null;
    
    const isHealthy = health.status === 'healthy';
    const Icon = isHealthy ? CheckCircle : AlertTriangle;
    const color = isHealthy ? 'text-green-600' : 'text-yellow-600';
    
    return (
      <div className={`flex items-center space-x-1 text-xs ${color}`}>
        <Icon className="h-3 w-3" />
        <span>{health.status}</span>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* Custom full-screen overlay */}
      <div 
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Custom dialog content */}
      <div className={`fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] w-[95vw] h-[90vh] max-w-none bg-white border shadow-2xl rounded-lg flex flex-col overflow-hidden ${className}`}>
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-2">
              <FolderOpen className="h-5 w-5" />
              <span>File System Tools</span>
              {getHealthIndicator()}
            </DialogTitle>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshAll}
                disabled={state.loading.files || state.loading.directories}
                className="h-8 w-8 p-0"
                aria-label="Refresh all"
              >
                <RefreshCw className={`h-4 w-4 ${
                  (state.loading.files || state.loading.directories) ? 'animate-spin' : ''
                }`} />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
                aria-label="Close panel"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex-shrink-0 border-b">
          <div className="flex space-x-1 p-1">
            <Button
              variant={activeTab === 'browse' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('browse')}
              className="flex items-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>Browse Files</span>
            </Button>
            
            <Button
              variant={activeTab === 'create' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('create')}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Create File</span>
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'browse' ? (
            <div className="h-full flex">
              {/* Left Panel - Directory and File Browser */}
              <div className="w-1/3 border-r flex flex-col space-y-4 p-4 overflow-y-auto">
                {/* Directory Selection */}
                <DirectorySelector
                  directories={state.directories}
                  selectedDirectory={state.currentDirectory}
                  loading={state.loading.directories}
                  error={state.errors.directories}
                  onDirectoryChange={handleDirectoryChange}
                  onRefresh={handleRefreshAll}
                />

                {/* File List */}
                <FileList
                  directory={state.currentDirectory}
                  files={state.files}
                  selectedFile={state.selectedFile}
                  loading={state.loading.files}
                  error={state.errors.files}
                  onFileSelect={handleFileSelect}
                  onRefresh={refreshCurrentDirectory}
                />
              </div>

              {/* Right Panel - File Content Viewer */}
              <div className="w-2/3 flex flex-col p-4 overflow-hidden">
                <FileContentViewer
                  file={state.selectedFile}
                  content={state.fileContent}
                  loading={state.loading.fileContent}
                  error={state.errors.fileContent}
                  editable={state.selectedFile?.path?.startsWith('output/') || false}
                  isEditing={isEditing}
                  saving={state.loading.editing}
                  onSave={handleSaveContent}
                  onToggleEdit={handleToggleEdit}
                  className="flex-1 overflow-hidden"
                />
              </div>
            </div>
          ) : (
            /* Create File Tab */
            <div className="h-full p-4 overflow-y-auto">
              <CreateFileForm
                directories={state.directories}
                currentDirectory={state.currentDirectory}
                loading={state.loading.creating}
                error={state.errors.creating}
                onFileCreate={handleCreateFile}
                onCancel={() => setActiveTab('browse')}
              />
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="flex-shrink-0 border-t bg-muted/50 px-4 py-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center space-x-4">
              {state.currentDirectory && (
                <span>
                  <strong>Directory:</strong> {state.currentDirectory}
                </span>
              )}
              {state.files.length > 0 && (
                <span>
                  <strong>Files:</strong> {state.files.length}
                </span>
              )}
              {state.selectedFile && (
                <span>
                  <strong>Selected:</strong> {state.selectedFile.name}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {(state.loading.files || state.loading.fileContent || state.loading.creating || state.loading.editing) && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <span>Working...</span>
                </div>
              )}
              {getHealthIndicator()}
            </div>
          </div>
                 </div>
       </div>
     </Dialog>
   );
 }; 