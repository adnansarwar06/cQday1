import React from "react";
import { Brain, Zap, Eye, AlertTriangle, Code, Search, FileText, Globe } from "lucide-react";
import CollapsibleStep from "./CollapsibleStep";

interface TraceStep {
  step_type: "Thought" | "Action" | "Observation" | "Error";
  output?: string;
  tool_name?: string;
  tool_input?: any;
}

interface AgentTraceProps {
  trace: any[];
  hasFinalAnswer?: boolean;
}

const AgentTrace: React.FC<AgentTraceProps> = ({ trace, hasFinalAnswer = false }) => {
  if (!trace || trace.length === 0) {
    return null;
  }

  // Aggregate thought chunks into a single thought
  const aggregatedTrace = trace.reduce((acc, step) => {
    if (step.type === "thought_chunk") {
      const lastStep = acc[acc.length - 1];
      if (lastStep && lastStep.type === "thought") {
        lastStep.content += step.content;
      } else {
        acc.push({ ...step, type: "thought" });
      }
    } else {
      acc.push(step);
    }
    return acc;
  }, []);

  const getToolIcon = (toolName: string) => {
    switch (toolName?.toLowerCase()) {
      case "web_search":
        return <Globe className="w-4 h-4" />;
      case "case_studies_search":
        return <Search className="w-4 h-4" />;
      case "list_files":
      case "read_file":
      case "create_file":
      case "edit_file":
        return <FileText className="w-4 h-4" />;
      default:
        return <Code className="w-4 h-4" />;
    }
  };

  const getStepStatus = (step: any, index: number) => {
    // Determine if this is the last step being processed
    const isLastStep = index === aggregatedTrace.length - 1;
    
    switch (step.type) {
      case "thought":
        // If explicitly marked as streaming, always show as running (prevents flickering)
        if (step.isStreaming) {
          return "running";
        }
        
        // A thought is completed if:
        // 1. It's not the last step, OR  
        // 2. It's the last step AND there's a final answer section, OR
        // 3. It's the last step AND it looks substantial and complete
        if (!isLastStep) {
          return "completed";
        } else if (hasFinalAnswer) {
          return "completed"; 
        } else {
          // For last step without final answer, be more conservative about marking as complete
          const content = step.content?.trim() || '';
          const hasSubstantialContent = content.length > 50;
          const endsWithPunctuation = /[.!?]$/.test(content);
          const looksComplete = hasSubstantialContent && endsWithPunctuation;
          
          return looksComplete ? "completed" : "running";
        }
      case "action":
        // Look for ANY subsequent observation, not just the immediate next step
        const hasSubsequentObservation = aggregatedTrace.slice(index + 1).some((laterStep: any) => 
          laterStep.type === "observation"
        );
        // If there's a subsequent observation OR if there's a subsequent thought (which means this action completed), mark as completed
        const hasSubsequentThought = aggregatedTrace.slice(index + 1).some((laterStep: any) => 
          laterStep.type === "thought"
        );
        return (hasSubsequentObservation || hasSubsequentThought) ? "completed" : "running";
      case "observation":
        return "completed";
      case "error":
        return "error";
      default:
        return "pending";
    }
  };

  const isLastMeaningfulStep = (index: number) => {
    // Only the very last step in the trace should be open by default
    // And only if it's completed (not running) AND it's a thought or observation
    const isActuallyLastStep = index === aggregatedTrace.length - 1;
    const stepStatus = getStepStatus(aggregatedTrace[index], index);
    const step = aggregatedTrace[index];
    
    // Only open if it's the last step AND it's completed AND it's a meaningful final step
    return isActuallyLastStep && stepStatus === "completed" && (step.type === "thought" || step.type === "observation");
  };

  const renderStep = (step: any, index: number) => {
    const stepNumber = index + 1;
    const status = getStepStatus(step, index);
    const isLastStep = isLastMeaningfulStep(index);

    switch (step.type) {
      case "thought":
        const thoughtTitle = status === "running" ? "Thinking..." : "Thought";
        return (
          <CollapsibleStep 
            key={index} 
            title={thoughtTitle}
            defaultOpen={isLastStep || status === "running"}
            status={status}
            icon={<Brain className="w-4 h-4" />}
            stepNumber={stepNumber}
          >
            <div className="prose prose-sm max-w-none max-h-96 overflow-y-auto">
              {step.content ? (
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{step.content}</p>
              ) : status === "running" ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                  <span className="text-sm">Thinking...</span>
                </div>
              ) : (
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{step.content}</p>
              )}
            </div>
          </CollapsibleStep>
        );
      case "action":
        // Try to extract tool name from content if not provided
        let detectedToolName = step.tool_name;
        if (!detectedToolName && step.content) {
          const content = step.content.toLowerCase();
          if (content.includes('web') || content.includes('🌐')) {
            detectedToolName = 'web_search';
          } else if (content.includes('case stud') || content.includes('🔍')) {
            detectedToolName = 'case_studies_search';
          } else if (content.includes('create') && content.includes('file') || content.includes('📝')) {
            detectedToolName = 'create_file';
          } else if (content.includes('edit') && content.includes('file') || content.includes('✏️')) {
            detectedToolName = 'edit_file';
          } else if (content.includes('read') && content.includes('file') || content.includes('📖')) {
            detectedToolName = 'read_file';
          } else if (content.includes('list') && content.includes('file') || content.includes('📁')) {
            detectedToolName = 'list_files';
          }
        }
        
        const toolDisplayName = detectedToolName?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || "Tool";
        const actionTitle = status === "running" ? `Using ${toolDisplayName}...` : `Used ${toolDisplayName}`;
        
        return (
          <CollapsibleStep 
            key={index} 
            title={actionTitle}
            defaultOpen={status === "running"}
            status={status}
            icon={getToolIcon(detectedToolName)}
            stepNumber={stepNumber}
          >
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Zap className="w-4 h-4" />
                <span className="font-medium">Tool: {toolDisplayName}</span>
              </div>
              <div className="prose prose-sm max-w-none">
                {step.content ? (
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{step.content}</p>
                ) : status === "running" ? (
                  <div className="flex items-center gap-2 text-gray-500">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                    <span className="text-sm">Preparing tool...</span>
                  </div>
                ) : (
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{step.content}</p>
                )}
              </div>
              {step.progressContent && (
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="text-xs font-medium text-blue-600 mb-2 flex items-center gap-1">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                    Live Progress
                  </div>
                  <div className="text-sm text-gray-800 font-mono whitespace-pre-wrap">
                    {step.progressContent}
                  </div>
                </div>
              )}
              {step.tool_input && (
                <div className="bg-gray-50 rounded-lg p-3 border">
                  <div className="text-xs font-medium text-gray-500 mb-2">Parameters:</div>
                  <pre className="text-sm text-gray-800 overflow-x-auto">
                    {typeof step.tool_input === 'string' ? step.tool_input : JSON.stringify(step.tool_input, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </CollapsibleStep>
        );
      case "observation":
        const observationTitle = status === "running" ? "Analyzing results..." : "Observation";
        return (
          <CollapsibleStep 
            key={index} 
            title={observationTitle}
            defaultOpen={isLastStep || status === "running"}
            status={status}
            icon={<Eye className="w-4 h-4" />}
            stepNumber={stepNumber}
          >
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Eye className="w-4 h-4" />
                <span className="font-medium">Tool Response</span>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 max-h-96 overflow-y-auto">
                <div className="prose prose-sm max-w-none">
                  {step.content ? (
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{step.content}</p>
                  ) : status === "running" ? (
                    <div className="flex items-center gap-2 text-gray-500">
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                      <span className="text-sm">Analyzing tool results...</span>
                    </div>
                  ) : (
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{step.content}</p>
                  )}
                </div>
              </div>
            </div>
          </CollapsibleStep>
        );
      case "error":
        return (
          <CollapsibleStep 
            key={index} 
            title="Error Occurred"
            defaultOpen={false}
            status="error"
            icon={<AlertTriangle className="w-4 h-4" />}
            stepNumber={stepNumber}
          >
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm text-red-600">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Error Details</span>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">{step.content}</p>
              </div>
            </div>
          </CollapsibleStep>
        );
      default:
        return null;
    }
  };

  return (
    <div className="mt-6 bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg">
            <Brain className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-gray-900">Agent Reasoning</h3>
            <p className="text-sm text-gray-500">Step-by-step thought process</p>
          </div>
          <div className="flex-1"></div>
          <div className="flex items-center space-x-2">
            <div className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {aggregatedTrace.length} steps
            </div>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="p-6 space-y-1">
        {aggregatedTrace.map(renderStep)}
      </div>
    </div>
  );
};

export default AgentTrace; 