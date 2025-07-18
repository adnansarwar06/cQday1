import React, { Component, ErrorInfo } from "react";
import { Brain, Zap, Eye, AlertTriangle, Code, Search, FileText, Globe, CheckCircle, Clock, Loader } from "lucide-react";
import CollapsibleStep from "./CollapsibleStep";
import MarkdownRenderer from "./MarkdownRenderer";

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

// Error boundary component for individual steps (class-based to avoid setState during render)
class StepErrorBoundary extends Component<{ children: React.ReactNode; stepType: string; stepIndex: number }, { hasError: boolean; error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { stepType, stepIndex } = this.props;
    console.error(`Error in ${stepType} step ${stepIndex}:`, error, errorInfo);
  }

  render() {
    const { hasError, error } = this.state;
    const { children, stepType } = this.props;

    if (hasError) {
      return (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">Step Rendering Error</span>
          </div>
          <p className="text-sm text-red-700 dark:text-red-300">
            Failed to render {stepType} step. Error: {error?.message || 'Unknown error'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-2 text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2 py-1 rounded hover:bg-red-200 dark:hover:bg-red-800"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}

// Safe content renderer with multiple fallback levels
const SafeContentRenderer: React.FC<{ 
  content: string; 
  formatter?: (content: string) => string;
  className?: string;
  fallbackMessage?: string;
}> = ({ 
  content, 
  formatter,
  className = "text-gray-800 dark:text-gray-200",
  fallbackMessage = "Content unavailable"
}) => {
  try {
    if (!content || content.trim().length === 0) {
      return (
        <div className={`text-gray-500 dark:text-gray-400 italic ${className}`}>
          {fallbackMessage}
        </div>
      );
    }

    // Try formatted content with markdown first
    if (formatter) {
      try {
        const formattedContent = formatter(content);
        return <MarkdownRenderer content={formattedContent} className={className} />;
      } catch (formatterError) {
        console.warn('Formatter error, falling back to raw markdown:', formatterError);
        // Fallback to raw markdown without formatting
        return <MarkdownRenderer content={content} className={className} />;
      }
    }

    // Default to markdown renderer
    return <MarkdownRenderer content={content} className={className} />;
  } catch (markdownError) {
    console.warn('Markdown rendering error, falling back to plain text:', markdownError);
    // Final fallback to plain text
    return (
      <div className={`prose prose-sm max-w-none ${className}`}>
        <div className="whitespace-pre-wrap leading-relaxed">
          {content}
        </div>
      </div>
    );
  }
};

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case "running":
        return <Loader className="w-3 h-3 text-blue-500 animate-spin" />;
      case "error":
        return <AlertTriangle className="w-3 h-3 text-red-500" />;
      default:
        return <Clock className="w-3 h-3 text-gray-400" />;
    }
  };

  const formatObservationContent = (content: string): string => {
    if (!content) return '';
    
    let formatted = content;
    
    // Remove emojis and replace with better indicators
    formatted = formatted.replace(/🔍|📍|🌐|📊|📈|💡|⚡|🚀|🎯|🔧|🛠️|📝|📚|📊|🔎|🔍/g, '');
    formatted = formatted.replace(/✅/g, '✓');
    formatted = formatted.replace(/🔄/g, '→');
    formatted = formatted.replace(/📍/g, '•');
    
    // Clean up multiple spaces first
    formatted = formatted.replace(/\s+/g, ' ').trim();
    
    // Handle "Here's what I found" patterns
    formatted = formatted.replace(/(Here\'s what I found:|Found some great case studies!|Key findings:|Summary:|Results:)/gi, '$1\n\n');
    
    // Handle numbered items better - both standalone numbers and list items
    // Put standalone numbers like "2." and "3." on new lines
    formatted = formatted.replace(/(revenues\.)\s+([23]\.)/g, '$1\n\n$2');
    formatted = formatted.replace(/(source\.)\s+([23]\.)/g, '$1\n\n$2');
    formatted = formatted.replace(/(visitor\.)\s+([23]\.)/g, '$1\n\n$2');
    
    // Handle specific numbered list patterns safely
    formatted = formatted.replace(/(findings:)\s+(\d+\.\s+Files)/gi, '$1\n\n$2');
    formatted = formatted.replace(/(performed)\s+(\d+\.\s+Files)/gi, '$1\n\n$2');
    
    // Handle URLs - separate them from preceding and following text
    formatted = formatted.replace(/([A-Za-z])\s+(https?:\/\/[^\s]+)/g, '$1\n\n$2');
    
    // Break after sentences that end with period when followed by capital letters
    // But not if it's already been formatted
    if (!formatted.includes('\n\n\n')) {
      formatted = formatted.replace(/(\w\.)\s+([A-Z][a-z])/g, '$1\n\n$2');
    }
    
    // Clean up multiple newlines
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    
    // Split into paragraphs and clean up
    const paragraphs = formatted.split(/\n\n+/);
    const cleanParagraphs = paragraphs
      .map(p => p.trim())
      .filter(p => p.length > 0);
    
    return cleanParagraphs.join('\n\n');
  };

  const formatProgressContent = (content: string): string => {
    if (!content) return '';
    
    let formatted = content;
    
    // Remove emojis and replace with text indicators
    formatted = formatted.replace(/🔍|📍|🌐|📊|📈|💡|⚡|🚀|🎯|🔧|🛠️|📝|📚|📊|🔎/g, '');
    formatted = formatted.replace(/✅/g, '[DONE]');
    formatted = formatted.replace(/🔄/g, '[PROCESSING]');
    formatted = formatted.replace(/📍/g, '[INFO]');
    
    // Split into lines and process each
    const lines = formatted.split('\n');
    const processedLines = lines.map(line => {
      let l = line.trim();
      if (!l) return '';
      
      // Handle status indicators
      l = l.replace(/\[DONE\]/g, '✓');
      l = l.replace(/\[PROCESSING\]/g, '→');
      l = l.replace(/\[INFO\]/g, '•');
      
      // Handle step indicators like "Step 1/5:" - ensure they start new lines
      l = l.replace(/(.+?)\s+(Step \d+\/\d+:)/g, '$1\n\n**$2**');
      
      // Handle numbered items like [1/5], [2/5], etc. - ensure they start new lines
      l = l.replace(/(.+?)\[(\d+)\/(\d+)\]:\s*(.+)/g, '$1\n\n**Step $2/$3:** $4');
      
      // Handle "Searching for:", "Found", "Processing", etc.
      l = l.replace(/^(Searching for:|Found \d+|Processing and|Scraping)(.*)$/gi, '**$1**$2');
      
      // Handle bullet points
      if (l.startsWith('•') || l.startsWith('-') || l.startsWith('*')) {
        l = l.replace(/^[•\-\*]\s*/, '- ');
      }
      
      return l;
    });
    
    // Join lines and clean up formatting
    let result = processedLines.filter(l => l.length > 0).join('\n');
    
    // Clean up multiple newlines but preserve paragraph structure
    result = result.replace(/\n{3,}/g, '\n\n');
    
    // Ensure step indicators are properly formatted
    result = result.replace(/([^\n])\n\n\*\*Step/g, '$1\n\n**Step');
    
    return result.trim();
  };

  const formatThoughtContent = (content: string): string => {
    if (!content) return '';
    
    let formatted = content;
    
    // Remove emojis
    formatted = formatted.replace(/🤔|💭|🧠|💡|⚡|🔍|📝|📊|🎯/g, '');
    
    // Clean up multiple spaces
    formatted = formatted.replace(/\s+/g, ' ').trim();
    
    // Simple, safe paragraph breaks - only break after clear sentence endings
    formatted = formatted.replace(/(\w\.)\s+(I need to|Let me|I should|However|Therefore|In conclusion)/gi, '$1\n\n$2');
    formatted = formatted.replace(/(\w\.)\s+(The user|The task|The solution)/gi, '$1\n\n$2');
    
    // Add paragraph breaks for long sentences (character limit approach)
    // Break after sentences that are longer than 200 characters
    formatted = formatted.replace(/([^.]{200,}\.)\s+([A-Z])/g, '$1\n\n$2');
    
    // Clean up multiple newlines
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    
    return formatted.trim();
  };

  const formatActionContent = (content: string): string => {
    if (!content) return '';
    
    let formatted = content;
    
    // Remove emojis
    formatted = formatted.replace(/🔧|🛠️|⚡|🚀|🎯|📝|🌐|🔍|📊/g, '');
    
    // Split by existing double newlines
    const paragraphs = formatted.split(/\n\s*\n/);
    
    const processedParagraphs = paragraphs.map(paragraph => {
      let p = paragraph.trim();
      if (!p) return '';
      
      // Clean up multiple spaces
      p = p.replace(/\s+/g, ' ');
      
      // Only break before action phrases if they start a new sentence
      p = p.replace(/(\w\.)\s+((?:I will|I'll|Going to|Planning to|Performing|Executing)[^.]*)/gi, '$1\n\n$2');
      
      // Clean up multiple newlines
      p = p.replace(/\n{3,}/g, '\n\n');
      
      return p.trim();
    });
    
    return processedParagraphs
      .filter(p => p.length > 0)
      .join('\n\n')
      .trim();
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
          <StepErrorBoundary key={`thought-boundary-${index}`} stepType="thought" stepIndex={index}>
            <CollapsibleStep 
              key={index} 
              title={
                <div className="flex items-center gap-2">
                  <span>{thoughtTitle}</span>
                  {getStatusIcon(status)}
                </div>
              }
              defaultOpen={isLastStep || status === "running"}
              status={status}
              icon={<Brain className="w-4 h-4" />}
              stepNumber={stepNumber}
            >
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800 max-h-96 overflow-y-auto">
                {status === "running" && (!step.content || step.content.trim().length === 0) ? (
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-medium">Processing thoughts...</span>
                  </div>
                ) : (
                  <SafeContentRenderer 
                    content={step.content || ''} 
                    formatter={formatThoughtContent}
                    className="text-gray-800 dark:text-gray-200"
                    fallbackMessage="Thinking in progress..."
                  />
                )}
              </div>
            </CollapsibleStep>
          </StepErrorBoundary>
        );
      case "action":
        // Try to extract tool name from content if not provided
        let detectedToolName = step.tool_name;
        if (!detectedToolName && step.content) {
          const content = step.content.toLowerCase();
          if (content.includes('web') || content.includes('search the web')) {
            detectedToolName = 'web_search';
          } else if (content.includes('case stud')) {
            detectedToolName = 'case_studies_search';
          } else if (content.includes('create') && content.includes('file')) {
            detectedToolName = 'create_file';
          } else if (content.includes('edit') && content.includes('file')) {
            detectedToolName = 'edit_file';
          } else if (content.includes('read') && content.includes('file')) {
            detectedToolName = 'read_file';
          } else if (content.includes('list') && content.includes('file')) {
            detectedToolName = 'list_files';
          }
        }
        
        const toolDisplayName = detectedToolName?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || "Tool";
        const actionTitle = status === "running" ? `Using ${toolDisplayName}...` : `Used ${toolDisplayName}`;
        
        return (
          <StepErrorBoundary key={`action-boundary-${index}`} stepType="action" stepIndex={index}>
            <CollapsibleStep 
              key={index} 
              title={
                <div className="flex items-center gap-2">
                  <span>{actionTitle}</span>
                  {getStatusIcon(status)}
                </div>
              }
              defaultOpen={status === "running"}
              status={status}
              icon={getToolIcon(detectedToolName)}
              stepNumber={stepNumber}
            >
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <Zap className="w-4 h-4 text-orange-500" />
                  <span className="font-medium">Tool: {toolDisplayName}</span>
                </div>
                
                {step.content && (
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800 max-h-96 overflow-y-auto">
                    <SafeContentRenderer 
                      content={step.content} 
                      formatter={formatActionContent}
                      className="text-gray-800 dark:text-gray-200"
                      fallbackMessage="Action in progress..."
                    />
                  </div>
                )}
                
                {!step.content && status === "running" && (
                  <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-medium">Preparing tool execution...</span>
                  </div>
                )}
                
                {step.progressContent && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800 max-h-64 overflow-y-auto">
                    <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-2">
                      <Loader className="w-3 h-3 animate-spin" />
                      Live Progress
                    </div>
                    <SafeContentRenderer 
                      content={step.progressContent} 
                      formatter={formatProgressContent}
                      className="text-sm text-gray-800 dark:text-gray-200 font-mono"
                      fallbackMessage="Processing..."
                    />
                  </div>
                )}
                
                {step.tool_input && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                      <Code className="w-3 h-3" />
                      Parameters
                    </div>
                    <pre className="text-sm text-gray-800 dark:text-gray-200 overflow-x-auto bg-white dark:bg-gray-900 p-2 rounded border">
                      {typeof step.tool_input === 'string' ? step.tool_input : JSON.stringify(step.tool_input, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </CollapsibleStep>
          </StepErrorBoundary>
        );
      case "observation":
        const observationTitle = status === "running" ? "Analyzing results..." : "Results";
        return (
          <StepErrorBoundary key={`observation-boundary-${index}`} stepType="observation" stepIndex={index}>
            <CollapsibleStep 
              key={index} 
              title={
                <div className="flex items-center gap-2">
                  <span>{observationTitle}</span>
                  {getStatusIcon(status)}
                </div>
              }
              defaultOpen={isLastStep || status === "running"}
              status={status}
              icon={<Eye className="w-4 h-4" />}
              stepNumber={stepNumber}
            >
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <Eye className="w-4 h-4 text-green-500" />
                  <span className="font-medium">Tool Response</span>
                </div>
                
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 overflow-hidden">
                  <div className="p-4 max-h-96 overflow-y-auto">
                    {status === "running" && (!step.content || step.content.trim().length === 0) ? (
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <Loader className="w-4 h-4 animate-spin" />
                        <span className="text-sm font-medium">Processing tool results...</span>
                      </div>
                    ) : (
                      <SafeContentRenderer 
                        content={step.content || ''} 
                        formatter={formatObservationContent}
                        className="text-gray-800 dark:text-gray-200"
                        fallbackMessage="Results pending..."
                      />
                    )}
                  </div>
                </div>
              </div>
            </CollapsibleStep>
          </StepErrorBoundary>
        );
      case "error":
        return (
          <StepErrorBoundary key={`error-boundary-${index}`} stepType="error" stepIndex={index}>
            <CollapsibleStep 
              key={index} 
              title={
                <div className="flex items-center gap-2">
                  <span>Error Occurred</span>
                  {getStatusIcon("error")}
                </div>
              }
              defaultOpen={false}
              status="error"
              icon={<AlertTriangle className="w-4 h-4" />}
              stepNumber={stepNumber}
            >
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium">Error Details</span>
                </div>
                
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <SafeContentRenderer 
                    content={step.content || 'An error occurred'} 
                    className="text-red-800 dark:text-red-200"
                    fallbackMessage="Error details unavailable"
                  />
                </div>
              </div>
            </CollapsibleStep>
          </StepErrorBoundary>
        );
      default:
        return null;
    }
  };

  return (
    <div className="mt-6 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Agent Reasoning</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Step-by-step thought process</p>
          </div>
          <div className="flex-1"></div>
          <div className="flex items-center space-x-2">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
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