"use client";

import React, { useState } from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { Thread } from "@assistant-ui/react-ui";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings, Bot, User, Sparkles, Zap, ChevronUp, ChevronDown, Trash2 } from "lucide-react";

const availableTools = [
  { name: "web_search", label: "Web Search", icon: "🔍", description: "Search the web for real-time information" },
  { name: "case_studies_search", label: "Case Studies", icon: "📚", description: "Access relevant case studies and examples" },
  { name: "list_files", label: "List Files", icon: "📁", description: "List files in directories" },
  { name: "read_file", label: "Read File", icon: "📄", description: "Read and display file contents" },
  { name: "create_file", label: "Create File", icon: "✏️", description: "Create new files with content" },
  { name: "edit_file", label: "Edit File", icon: "📝", description: "Edit existing file contents" },
];

const Assistant = () => {
  const [mode, setMode] = useState<'standard' | 'agent'>('standard');
  const [enabledTools, setEnabledTools] = useState<string[]>([]);
  const [isToolsOpen, setIsToolsOpen] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_ASSISTANT_API_URL || 'http://127.0.0.1:8000/v2/assistant';
  const runtime = useChatRuntime({
    api: apiUrl,
    body: {
      mode,
      enabled_tools: enabledTools,
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="h-screen bg-white flex flex-col">
        {/* Header */}
                <header className="flex-shrink-0 border-b border-blue-200 px-6 py-4 bg-blue-50">
          <div className="flex flex-col items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI Assistant</h1>
            </div>
            
            {/* Header Controls */}
            <div className="flex items-center gap-4">
              <Button
                onClick={() => setMode(mode === "standard" ? "agent" : "standard")}
                variant={mode === "agent" ? "default" : "outline"}
                className="flex items-center gap-2 h-9 px-4 font-medium min-w-[120px]"
              >
                {mode === "standard" ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span>{mode === "standard" ? "Standard" : "Agent"}</span>
              </Button>
              
              <Button
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear the conversation?')) {
                    window.location.reload();
                  }
                }}
                variant="outline"
                className="flex items-center gap-2 h-9 px-4 font-medium text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <Trash2 className="h-4 w-4" />
                <span>Clear</span>
              </Button>
              
              <div className="relative">
                <Button
                  variant="outline"
                  onClick={() => setIsToolsOpen(!isToolsOpen)}
                  className="flex items-center gap-2 h-9 px-4 font-medium min-w-[120px] text-gray-700 hover:text-gray-900"
                >
                  <Settings className="h-4 w-4" />
                  <span>Tools ({enabledTools.length})</span>
                </Button>
                
                {/* Tools Dropdown - Positioned between buttons */}
                {isToolsOpen && (
                  <div className="absolute top-full right-full transform translate-x-1/2 mt-2 z-50">
                    <div className="w-80 p-4 bg-white rounded-lg border border-gray-300 shadow-2xl ring-1 ring-black ring-opacity-5">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <Zap className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-medium text-gray-900">Tools</span>
                      </div>
                      
                      <div className="space-y-2">
                        {availableTools.map((tool) => {
                          const isSelected = enabledTools.includes(tool.name);
                          return (
                            <div
                              key={tool.name}
                              onClick={() =>
                                setEnabledTools(
                                  isSelected
                                    ? enabledTools.filter((t) => t !== tool.name)
                                    : [...enabledTools, tool.name],
                                )
                              }
                              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                isSelected 
                                  ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100' 
                                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              <Button
                                variant={isSelected ? "default" : "outline"}
                                className={`h-16 w-16 p-0 flex-shrink-0 shadow-md ${
                                  isSelected ? 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600' : 'border-gray-300 hover:border-gray-400'
                                }`}
                              >
                                <span className="text-2xl">{tool.icon}</span>
                              </Button>
                              <div className="flex-1 min-w-0">
                                <div className={`text-sm font-semibold truncate ${
                                  isSelected ? 'text-emerald-900' : 'text-gray-900'
                                }`}>{tool.label}</div>
                                <div className={`text-xs truncate ${
                                  isSelected ? 'text-emerald-700' : 'text-gray-600'
                                }`}>{tool.description}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <main className="flex-1 min-h-0 bg-gray-50 overflow-hidden">
          <div className="h-full max-w-4xl mx-auto p-4">
            <div className="h-full bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto">
                <Thread />
              </div>
            </div>
          </div>
        </main>
      </div>
    </AssistantRuntimeProvider>
  );
};

export default Assistant; 