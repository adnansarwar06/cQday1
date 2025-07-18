"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Bot,
  MessageSquare,
  Settings,
  ChevronDown,
  Globe,
  FileSearch,
  FolderOpen,
  FileText,
  FilePlus,
  Edit3,
  Check,
  X
} from "lucide-react";

// Available tools from the backend
const AVAILABLE_TOOLS = [
  {
    id: "web_search",
    name: "Web Search",
    description: "Search the web for up-to-date information",
    icon: Globe,
    color: "text-blue-500"
  },
  {
    id: "case_studies_search", 
    name: "Case Studies",
    description: "Search for company case studies",
    icon: FileSearch,
    color: "text-purple-500"
  },
  {
    id: "list_files",
    name: "List Files",
    description: "List files in directories",
    icon: FolderOpen,
    color: "text-orange-500"
  },
  {
    id: "read_file",
    name: "Read File",
    description: "Read file contents",
    icon: FileText,
    color: "text-green-500"
  },
  {
    id: "create_file",
    name: "Create File", 
    description: "Create new files",
    icon: FilePlus,
    color: "text-indigo-500"
  },
  {
    id: "edit_file",
    name: "Edit File",
    description: "Edit existing files",
    icon: Edit3,
    color: "text-red-500"
  }
];

interface ChatControlsProps {
  agentMode: boolean;
  onAgentModeChange: (enabled: boolean) => void;
  selectedTools: string[];
  onToolsChange: (tools: string[]) => void;
  disabled?: boolean;
}

export default function ChatControls({
  agentMode,
  onAgentModeChange,
  selectedTools,
  onToolsChange,
  disabled = false
}: ChatControlsProps) {
  const [showToolSelector, setShowToolSelector] = useState(false);

  const toggleTool = (toolId: string) => {
    if (selectedTools.includes(toolId)) {
      onToolsChange(selectedTools.filter(id => id !== toolId));
    } else {
      if (agentMode) {
        // Agent mode: allow multiple tools
        onToolsChange([...selectedTools, toolId]);
      } else {
        // Standard mode: only one tool allowed
        onToolsChange([toolId]);
      }
    }
  };

  const selectAllTools = () => {
    onToolsChange(AVAILABLE_TOOLS.map(tool => tool.id));
  };

  const clearAllTools = () => {
    onToolsChange([]);
  };

  return (
    <div className="fixed top-0 inset-x-0 z-40 border-b border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md p-4 h-20 flex items-center shadow-lg">
      <div className="w-full px-6">
        <div className="flex items-center justify-between gap-4">
          {/* Agent Mode Toggle */}
          <div className="flex items-center gap-3">
            <div className="flex items-center space-x-4">
              <Switch
                id="agent-mode"
                checked={agentMode}
                onCheckedChange={onAgentModeChange}
                disabled={disabled}
                className="data-[state=checked]:bg-blue-600"
              />
              <Label htmlFor="agent-mode" className="text-sm font-medium">
                Agent Mode
              </Label>
              <Bot className={`w-4 h-4 ${agentMode ? 'text-blue-500' : 'text-gray-400'}`} />
            </div>
          </div>

          {/* Tool Selection */}
          <div className="flex items-center gap-3 ml-8">
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowToolSelector(!showToolSelector)}
                disabled={disabled}
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                {agentMode ? `Tools (${selectedTools.length})` : `Tool (${selectedTools.length > 0 ? '1' : '0'})`}
                <ChevronDown className={`w-4 h-4 transition-transform ${showToolSelector ? 'rotate-180' : ''}`} />
              </Button>

              {showToolSelector && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium">
                          {agentMode ? 'Available Tools' : 'Select One Tool'}
                        </h3>
                        {!agentMode && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Standard mode allows one tool
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {agentMode && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={selectAllTools}
                            className="h-6 px-2 text-xs"
                          >
                            All
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearAllTools}
                          className="h-6 px-2 text-xs"
                        >
                          None
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto">
                    {AVAILABLE_TOOLS.map((tool) => {
                      const Icon = tool.icon;
                      const isSelected = selectedTools.includes(tool.id);
                      
                      return (
                        <div
                          key={tool.id}
                          className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                          onClick={() => toggleTool(tool.id)}
                        >
                          <div className={`p-1.5 rounded ${isSelected ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-700'}`}>
                            <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600 dark:text-blue-400' : tool.color}`} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {tool.name}
                              </p>
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                isSelected 
                                  ? 'bg-blue-600 border-blue-600' 
                                  : 'border-gray-300 dark:border-gray-600'
                              }`}>
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {tool.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Close tool selector when clicking outside */}
            {showToolSelector && (
              <div 
                className="fixed inset-0 z-0" 
                onClick={() => setShowToolSelector(false)}
              />
            )}
          </div>
        </div>


      </div>
    </div>
  );
} 