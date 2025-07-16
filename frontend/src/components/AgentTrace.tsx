import React from "react";
import { ExternalLink, Search, FileText } from "lucide-react";

interface TraceStep {
  step_type: "Thought" | "Action" | "Observation" | "Error";
  output?: string;
  tool_name?: string;
  tool_input?: any;
}

interface AgentTraceProps {
  trace: TraceStep[];
}

interface SearchResult {
  title: string;
  url?: string;
  summary: string;
  extracted_content?: string;
}

const parseSearchResults = (output: string): SearchResult[] | null => {
  try {
    // Handle multiple possible formats:
    // 1. WebSearchResponse(results=[SearchResult(...), ...])
    // 2. results=[SearchResult(...), SearchResult(...), ...]
    // 3. Mixed content with search results embedded
    
    let resultsString = '';
    
    // First, try to extract from WebSearchResponse wrapper
    const webSearchMatch = output.match(/WebSearchResponse\(results=\[(.*?)\]\)/s);
    if (webSearchMatch) {
      resultsString = webSearchMatch[1];
    } else {
      // Try to extract from direct results format
      const directMatch = output.match(/results=\[(.*?)\]/s);
      if (directMatch) {
        resultsString = directMatch[1];
      } else {
        return null;
      }
    }
    
    if (!resultsString.trim()) return null;
    
    // Parse individual SearchResult entries with more robust regex
    const searchResultMatches = resultsString.match(/SearchResult\(([^)]+(?:\([^)]*\)[^)]*)*)\)/g);
    if (!searchResultMatches) return null;
    
    const results: SearchResult[] = [];
    
    for (const resultMatch of searchResultMatches) {
      // Extract the content inside SearchResult(...)
      const contentMatch = resultMatch.match(/SearchResult\((.*)\)/s);
      if (!contentMatch) continue;
      
      const content = contentMatch[1];
      
      // More robust field extraction to handle various quote styles and escaping
             const extractField = (fieldName: string): string | null => {
         // Try different quote patterns: 'value', "value", and handle escaped quotes
         const patterns = [
           new RegExp(`${fieldName}='([^']*(?:\\\\.[^']*)*)'`, 's'),
           new RegExp(`${fieldName}="([^"]*(?:\\\\.[^"]*)*)"`, 's'),
           new RegExp(`${fieldName}=([^,\\)]+)`, 's') // For unquoted values
         ];
         
         for (const pattern of patterns) {
           const match = content.match(pattern);
           if (match) {
             return match[1]
               .replace(/\\'/g, "'")
               .replace(/\\"/g, '"')
               .replace(/\\n/g, ' ') // Convert literal \n to spaces
               .replace(/\n/g, ' ') // Convert actual newlines to spaces
               .replace(/<[^>]*>/g, '') // Remove HTML tags
               .replace(/\s+/g, ' ') // Collapse multiple spaces
               .trim();
           }
         }
         return null;
       };
      
      const title = extractField('title');
      const url = extractField('url');
      const summary = extractField('summary');
      
      if (title) {
        results.push({
          title,
          url: url && url !== 'None' ? url : undefined,
          summary: summary || '',
        });
      }
    }
    
    return results.length > 0 ? results : null;
  } catch (error) {
    console.error('Error parsing search results:', error);
    return null;
  }
};

const isWebSearchContent = (output: string): boolean => {
  return output.includes('WebSearchResponse') || 
         output.includes('SearchResult(') ||
         (output.includes('results=[') && output.includes('title='));
};

const WebSearchResults: React.FC<{ results: SearchResult[] }> = ({ results }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-blue-600 font-medium">
        <Search className="h-4 w-4" />
        <span>Web Search Results ({results.length})</span>
      </div>
      
      <div className="space-y-3">
        {results.slice(0, 8).map((result, index) => (
          <div key={index} className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
                  {result.title}
                </h3>
                {result.url && (
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 text-blue-600 hover:text-blue-800 transition-colors"
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
              
              {result.url && (
                <div className="text-xs text-green-600 truncate">
                  {result.url}
                </div>
              )}
              
              {result.summary && (
                <p className="text-sm text-gray-700 line-clamp-3">
                  {result.summary.length > 200 
                    ? `${result.summary.substring(0, 200)}...` 
                    : result.summary
                  }
                </p>
              )}
            </div>
          </div>
        ))}
        
        {results.length > 8 && (
          <div className="text-sm text-gray-500 text-center py-2">
            ... and {results.length - 8} more results
          </div>
        )}
      </div>
    </div>
  );
};

const AgentTrace: React.FC<AgentTraceProps> = ({ trace }) => {
  if (!trace || trace.length === 0) return null;

  const getStepIcon = (stepType: string) => {
    switch (stepType) {
      case "Thought": return "🤔";
      case "Action": return "🔧";
      case "Observation": return "📝";
      case "Error": return "❌";
      default: return "📌";
    }
  };

  const getStepColor = (stepType: string) => {
    switch (stepType) {
      case "Thought": return "border-blue-200 bg-blue-50";
      case "Action": return "border-orange-200 bg-orange-50";
      case "Observation": return "border-green-200 bg-green-50";
      case "Error": return "border-red-200 bg-red-50";
      default: return "border-gray-200 bg-gray-50";
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Agent Reasoning Trace
        </h2>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {trace.map((step, index) => (
          <div key={index} className={`rounded-lg border p-4 ${getStepColor(step.step_type)}`}>
            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold flex items-center gap-2">
                <span className="text-lg">{getStepIcon(step.step_type)}</span>
                {step.step_type}
              </span>
              <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                Step {index + 1}
              </span>
            </div>
            
            {step.step_type === "Action" ? (
              <div className="space-y-3">
                <div className="bg-white rounded-md p-3 border">
                  <div className="text-sm font-medium text-gray-700 mb-1">Tool:</div>
                  <code className="text-sm text-blue-600">{step.tool_name}</code>
                </div>
                <div className="bg-white rounded-md p-3 border">
                  <div className="text-sm font-medium text-gray-700 mb-2">Input:</div>
                  <pre className="overflow-x-auto text-xs text-gray-800 whitespace-pre-wrap">
                    {JSON.stringify(step.tool_input, null, 2)}
                  </pre>
                </div>
              </div>
            ) : step.step_type === "Observation" && step.output ? (
              <div className="space-y-3">
                {(() => {
                  // Try to parse as search results first
                  const searchResults = parseSearchResults(step.output);
                  
                  if (searchResults) {
                    return <WebSearchResults results={searchResults} />;
                  } 
                  
                  // Check if it's already formatted content from the backend
                  if (step.output.includes("📚 **Case Study Results:**") || step.output.includes("🔍 **Web Search Results:**")) {
                    return (
                      <div className="prose prose-sm max-w-none">
                        <div className="whitespace-pre-wrap text-sm text-gray-700">
                          {step.output}
                        </div>
                      </div>
                    );
                  }
                  
                  // Check if it contains unformatted search results that we should hide or minimize
                  if (isWebSearchContent(step.output)) {
                    return (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                        <div className="flex items-center gap-2 text-yellow-700 mb-2">
                          <Search className="h-4 w-4" />
                          <span className="font-medium">Search Results Available</span>
                        </div>
                        <p className="text-sm text-yellow-700">
                          Search completed successfully. Results contain {(step.output.match(/SearchResult\(/g) || []).length} items.
                        </p>
                        <details className="mt-2">
                          <summary className="text-xs text-yellow-600 cursor-pointer hover:text-yellow-800">
                            View raw data
                          </summary>
                          <pre className="mt-1 text-xs text-gray-600 bg-white p-2 rounded border overflow-x-auto whitespace-pre-wrap">
                            {step.output.length > 500 ? `${step.output.substring(0, 500)}...` : step.output}
                          </pre>
                        </details>
                      </div>
                    );
                  }
                  
                  // Regular observation output
                  return (
                    <div className="bg-white rounded-md p-3 border">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{step.output}</p>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="bg-white rounded-md p-3 border">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{step.output}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AgentTrace; 