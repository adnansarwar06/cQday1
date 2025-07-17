"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  MessageSquare, 
  Settings, 
  Plus, 
  History, 
  Bot, 
  User,
  Trash2,
  Edit3,
  MoreHorizontal,
  Search,
  Globe,
  FileText,
  Calculator
} from "lucide-react";
import React, { useState } from "react";

export interface Tool {
  name: string;
  label: string;
}

interface SidebarProps {
  mode: "standard" | "agent";
  setMode: (mode: "standard" | "agent") => void;
  availableTools: Tool[];
  enabledTools: string[];
  setEnabledTools: (tools: string[]) => void;
}

const toolIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  web_search: Globe,
  file_tools: FileText,
  calculator: Calculator,
};

const Sidebar: React.FC<SidebarProps> = ({
  mode,
  setMode,
  availableTools,
  enabledTools,
  setEnabledTools,
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Mock chat history
  const chatHistory = [
    { id: 1, title: "Building a React App", timestamp: "2 hours ago", preview: "How do I create a new React component?" },
    { id: 2, title: "Python Data Analysis", timestamp: "1 day ago", preview: "Help me analyze this dataset with pandas" },
    { id: 3, title: "UI Design Discussion", timestamp: "2 days ago", preview: "What are the best practices for modern UI?" },
    { id: 4, title: "API Integration", timestamp: "3 days ago", preview: "How to handle authentication in REST APIs?" },
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <Button 
          className="w-full justify-start gap-3 h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
        >
          <Plus className="h-5 w-5" />
          New Chat
        </Button>
      </div>

      {/* Mode Toggle */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Assistant Mode
          </Label>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-500" />
            <Switch
              checked={mode === "agent"}
              onCheckedChange={(checked) => setMode(checked ? "agent" : "standard")}
            />
            <Bot className="h-4 w-4 text-purple-500" />
          </div>
        </div>
        
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {mode === "agent" 
            ? "Agent mode uses advanced reasoning and tools" 
            : "Standard mode for direct responses"
          }
        </p>
      </div>

      {/* Tools Section */}
      {mode === "agent" && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Active Tools
            </Label>
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="w-full max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Configure Tools
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {availableTools.map((tool) => {
                    const IconComponent = toolIcons[tool.name] || Settings;
                    return (
                      <div
                        key={tool.name}
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-center gap-3">
                          <IconComponent className="h-5 w-5 text-blue-600" />
                          <div>
                            <Label className="font-medium text-gray-900 dark:text-gray-100">
                              {tool.label}
                            </Label>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {tool.name === "web_search" && "Search the internet for current information"}
                              {tool.name === "file_tools" && "Create, read, and manage files"}
                              {tool.name === "calculator" && "Perform mathematical calculations"}
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={enabledTools.includes(tool.name)}
                          onCheckedChange={() =>
                            setEnabledTools(
                              enabledTools.includes(tool.name)
                                ? enabledTools.filter((t) => t !== tool.name)
                                : [...enabledTools, tool.name],
                            )
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {enabledTools.map((toolName) => {
              const tool = availableTools.find(t => t.name === toolName);
              const IconComponent = toolIcons[toolName] || Settings;
              return tool ? (
                <div 
                  key={toolName}
                  className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-md text-xs font-medium"
                >
                  <IconComponent className="h-3 w-3" />
                  {tool.label}
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <History className="h-4 w-4 text-gray-500" />
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Recent Chats
            </Label>
          </div>
          
          <div className="space-y-2">
            {chatHistory.map((chat) => (
              <div
                key={chat.id}
                className="group p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {chat.title}
                      </h4>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                      {chat.preview}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {chat.timestamp}
                    </p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
            AI
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900 dark:text-gray-100">AI Assistant</p>
            <p className="text-xs">Powered by advanced reasoning</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 