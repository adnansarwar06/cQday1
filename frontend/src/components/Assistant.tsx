"use client";

import React, { useState, useEffect, useRef } from "react";
import { AssistantRuntimeProvider, useMessage } from "@assistant-ui/react";
import { Thread, AssistantMessage as BaseAssistantMessage, UserMessage as BaseUserMessage } from "@assistant-ui/react-ui";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import AgentTrace from "./AgentTrace";
import MarkdownRenderer from "./MarkdownRenderer";
import { config, isDemoMode, getApiUrl } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ChatControls from "./ChatControls";
import { 
  Bot,
  User as UserIcon,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Sparkles,
  Send,
  Settings,
  CheckCircle
} from "lucide-react";

// Format final answer content for better readability
const formatFinalAnswer = (content: string): string => {
  if (!content) return '';
  
  let formatted = content;
  
  // Clean up multiple spaces
  formatted = formatted.replace(/\s+/g, ' ').trim();
  
  // Split by existing double newlines to preserve intentional breaks
  const existingParagraphs = formatted.split(/\n\s*\n/);
  
  const processedParagraphs = existingParagraphs.map(paragraph => {
    let p = paragraph.trim();
    if (!p) return '';
    
    // Break before major sections and conclusions
    p = p.replace(/(\w\.)\s+(In summary|To summarize|In conclusion|Overall|Key takeaways|The main points|Important note|Additionally|Furthermore|Moreover|However|Therefore|As a result)/gi, '$1\n\n$2');
    
    // Break before recommendations and next steps
    p = p.replace(/(\w\.)\s+(I recommend|My recommendation|Next steps|You should|Consider|To get started|For best results|Keep in mind)/gi, '$1\n\n$2');
    
    // Break before lists and examples
    p = p.replace(/(\w\.)\s+(Here are|Here's a list|For example|Examples include|Some options|The following|These include)/gi, '$1\n\n$2');
    
    // Break before numbered or lettered points - improved detection
    p = p.replace(/(\w\.)\s+([1-9]\.|[a-z]\)|[A-Z]\.)\s+/g, '$1\n\n$2 ');
    
    // Break before bullet points
    p = p.replace(/(\w\.)\s+([-•*])\s+/g, '$1\n\n$2 ');
    
    // Handle specific patterns safely to avoid infinite loops
    p = p.replace(/(findings:)\s+(\d+\.\s+Files)/gi, '$1\n\n$2');
    p = p.replace(/(results:)\s+(\d+\.\s+[A-Z])/gi, '$1\n\n$2');
    
    // Break after questions when followed by answers
    p = p.replace(/(\?)\s+([A-Z][^?]*)/g, '$1\n\n$2');
    
    // Add more paragraph breaks for longer content
    // Break after longer sentences (more than 100 characters) when followed by new concepts
    p = p.replace(/([^.]{100,}\.)\s+([A-Z][^.]*)/g, '$1\n\n$2');
    
    // Break before explanation connectors
    p = p.replace(/(\w+)\s+(This means|This indicates|This suggests|For instance|For example|Specifically|In other words|That is|Namely)/gi, '$1\n\n$2');
    
    // Break before benefit/feature explanations
    p = p.replace(/(\w\.)\s+(Benefits include|Features include|This includes|Key benefits|Main features|Primary advantages)/gi, '$1\n\n$2');
    
    // Break before comparison or contrast
    p = p.replace(/(\w\.)\s+(On the other hand|In contrast|Alternatively|Meanwhile|Compared to|Unlike)/gi, '$1\n\n$2');
    
    // Clean up multiple newlines
    p = p.replace(/\n{3,}/g, '\n\n');
    
    return p.trim();
  });
  
  return processedParagraphs
    .filter(p => p.length > 0)
    .join('\n\n')
    .trim();
};

// Demo Mode Component (works without API)
const DemoMode = ({ 
  agentMode, 
  setAgentMode, 
  selectedTools, 
  setSelectedTools 
}: {
  agentMode: boolean;
  setAgentMode: (value: boolean) => void;
  selectedTools: string[];
  setSelectedTools: (value: string[]) => void;
}) => {
  const [messages, setMessages] = useState<Array<{id: string, role: 'user' | 'assistant', content: string}>>([]);
  const [input, setInput] = useState("");

  const suggestions = [
    "Help me build a React component",
    "Explain quantum computing",
    "Write a Python script for data analysis", 
    "Design a modern user interface"
  ];

  const handleSend = (message: string) => {
    if (!message.trim()) return;
    
    const userMessage = { id: Date.now().toString(), role: 'user' as const, content: message };
    setMessages(prev => [...prev, userMessage]);
    setInput("");

    // Simulate assistant response
    setTimeout(() => {
      const responses = [
        "I'd be happy to help you with that! Let me break this down step by step...",
        "That's a great question! Here's what I can tell you about that topic...",
        "I can definitely help you with that. Let me provide a detailed explanation...",
        "Excellent choice! Let me walk you through the process..."
      ];
      const assistantMessage = { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant' as const, 
        content: responses[Math.floor(Math.random() * responses.length)]
      };
      setMessages(prev => [...prev, assistantMessage]);
    }, 1000);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      <ChatControls
        agentMode={agentMode}
        onAgentModeChange={setAgentMode}
        selectedTools={selectedTools}
        onToolsChange={setSelectedTools}
        disabled={true}
      />
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
        {messages.length === 0 ? (
                     // Welcome Screen
           <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-surface min-h-full">
             <div className="text-center mb-12">
               <div className="relative w-24 h-24 mb-8 mx-auto">
                 <div className="absolute inset-0 bg-gradient-primary rounded-full shadow-2xl animate-bounce-subtle"></div>
                 <div className="relative w-full h-full bg-gradient-primary rounded-full flex items-center justify-center text-white shadow-glow">
                   <Sparkles className="w-10 h-10 animate-pulse" />
                 </div>
               </div>
               <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent mb-6">
                 How can I help you today?
               </h1>
               <p className="text-xl text-gray-600 dark:text-gray-400 max-w-lg mx-auto text-center leading-relaxed">
                 I&apos;m your AI assistant powered by advanced reasoning. Ask me anything or choose from the suggestions below.
               </p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
               {suggestions.map((suggestion, index) => (
                 <button
                   key={index}
                   onClick={() => handleSend(suggestion)}
                   className="group relative p-6 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800 cursor-pointer transition-all duration-300 hover-lift hover:border-blue-300 dark:hover:border-blue-500 text-left shadow-soft hover:shadow-glow"
                   style={{
                     background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
                   }}
                 >
                   <div className="relative z-10">
                     <p className="text-gray-800 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-gray-100 font-medium leading-relaxed">
                       {suggestion}
                     </p>
                   </div>
                   <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                 </button>
               ))}
             </div>
           </div>
        ) : (
          // Messages
          <div className="space-y-0">
            {messages.map((message) => (
              <div key={message.id}>
                {message.role === 'user' ? (
                  // User Message
                  <div className="flex items-start gap-4 justify-end max-w-4xl mx-auto px-4 py-6 animate-fade-in">
                    <div className="flex flex-col items-end max-w-2xl">
                      <div className="bg-blue-600 text-white rounded-2xl px-4 py-3 shadow-sm">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                          {message.content}
                        </p>
                      </div>
                    </div>
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  </div>
                ) : (
                  // Assistant Message
                  <div className="bg-gray-50 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-700/50 animate-fade-in">
                    <div className="flex items-start gap-4 max-w-4xl mx-auto px-4 py-6 group">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="flex-1 space-y-4">
                                                 <div className="prose prose-slate dark:prose-invert max-w-none">
                           <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed text-sm">
                             {message.content}
                           </div>
                         </div>

                        {/* Message Actions */}
                        <div className="flex items-center gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                            <Copy className="w-4 h-4 mr-1" />
                            Copy
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                            <ThumbsUp className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                            <ThumbsDown className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Retry
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

             {/* Input Area */}
       <div className="border-t border-gray-200/50 dark:border-gray-700/50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl p-6 animate-slide-up">
         <form 
           onSubmit={(e) => {
             e.preventDefault();
             handleSend(input);
           }} 
           className="max-w-4xl mx-auto"
         >
           <div className="relative flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-2xl border border-gray-200/80 dark:border-gray-600/80 focus-within:border-blue-400 dark:focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all duration-300 shadow-soft hover:shadow-glow">
             <Input
               value={input}
               onChange={(e) => setInput(e.target.value)}
               placeholder="Message AI Assistant..."
               className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 text-base resize-none font-medium"
               style={{ outline: 'none', boxShadow: 'none' }}
             />
             
             <Button
               type="submit"
               disabled={!input.trim()}
               className="relative px-4 py-2 bg-gradient-primary text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 hover:shadow-glow focus:scale-105 focus:shadow-glow"
             >
               <Send className="w-5 h-5" />
             </Button>
           </div>
           
           <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-4 font-medium">
             AI can make mistakes. Consider checking important information.
           </p>
         </form>
       </div>
    </div>
  );
};

// Custom User Message Component
const CustomUserMessage = () => {
  const message = useMessage();
  
  return (
    <div className="flex items-start gap-4 justify-end max-w-4xl mx-auto px-4 py-6 animate-fade-in">
      <div className="flex flex-col items-end max-w-2xl">
        <div className="bg-blue-600 text-white rounded-2xl px-4 py-3 shadow-sm">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {typeof message.content === 'string' ? message.content : 
             Array.isArray(message.content) ? message.content.map((part: any) => part.text || part).join('') :
             'Message content'}
          </p>
        </div>
      </div>
      <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
        <UserIcon className="w-4 h-4" />
      </div>
    </div>
  );
};

// Custom Assistant Message Component
const CustomAssistantMessage = () => {
  const message = useMessage();
  const [streamingSteps, setStreamingSteps] = useState<any[]>([]);
  const [streamingFinalAnswer, setStreamingFinalAnswer] = useState('');
  const lastContentLength = useRef(0);
  
  // Parse agent reasoning from message content
  const parseAgentReasoning = (content: string) => {
    if (!content) return { agentSteps: [], finalAnswer: '' };
    
    const lines = content.split('\n');
    const agentSteps: any[] = [];
    let finalAnswer = '';
    let currentStep: any = null;
    let inAgentSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('Thought:')) {
        inAgentSection = true;
        if (currentStep) agentSteps.push(currentStep);
        currentStep = { 
          type: 'thought', 
          content: line.replace('Thought:', '').trim() 
        };
      } else if (line.startsWith('Action:')) {
        inAgentSection = true;
        
        // Parse action details
        const actionText = line.replace('Action:', '').trim();
        
        // Enhanced duplicate check: skip if this looks like raw JSON or duplicate
        const lastStep = agentSteps[agentSteps.length - 1];
        
        // More comprehensive JSON filtering
        const looksLikeJson = (text: string): boolean => {
          const cleanText = text.trim();
          
          // Check for various JSON patterns
          const jsonPatterns = [
            /^\s*[\{\[]/,                           // Starts with { or [
            /[\}\]]\s*$/,                           // Ends with } or ]
            /"[^"]*":\s*"[^"]*"/,                   // Key-value pairs with quotes
            /"[^"]*":\s*[\{\[\]]/,                  // Property with object/array value
            /```json/i,                             // JSON code blocks
            /"tool_name"/,                          // Tool name property
            /"tool_input"/,                         // Tool input property
            /"query"/,                              // Query property
            /\{\s*"[^"]*":/,                        // Object with quoted property
            /"\w+":\s*"/,                           // Any quoted property
            /"[^"]*",\s*"[^"]*":/                   // Multiple properties
          ];
          
          return jsonPatterns.some(pattern => pattern.test(cleanText));
        };
        
        // Skip if this looks like raw JSON or contains JSON patterns
        if (looksLikeJson(actionText)) {
          continue; // Skip JSON content
        }
        
        // Skip exact duplicates
        if (lastStep && lastStep.type === 'action' && lastStep.content.trim() === actionText.trim()) {
          continue; // Skip exact duplicates
        }
        
        // Skip if the previous action was for the same tool (based on content similarity)
        if (lastStep && lastStep.type === 'action') {
          const lastContent = lastStep.content.toLowerCase();
          const currentContent = actionText.toLowerCase();
          if ((lastContent.includes('web search') && currentContent.includes('web search')) ||
              (lastContent.includes('case stud') && currentContent.includes('case stud'))) {
            continue; // Skip duplicate tool actions
          }
        }
        
        if (currentStep) agentSteps.push(currentStep);
        
        let tool_name = '';
        let tool_input = '';
        
        // Look for tool name and input patterns based on action messages
        const lowerAction = actionText.toLowerCase();
        if (lowerAction.includes('search the web') || lowerAction.includes('web search') || lowerAction.includes('🌐')) {
          tool_name = 'web_search';
        } else if (lowerAction.includes('case studies') || lowerAction.includes('case study') || lowerAction.includes('🔍')) {
          tool_name = 'case_studies_search';
        } else if (lowerAction.includes('create') && lowerAction.includes('file') || lowerAction.includes('📝')) {
          tool_name = 'create_file';
        } else if (lowerAction.includes('edit') && lowerAction.includes('file') || lowerAction.includes('✏️')) {
          tool_name = 'edit_file';
        } else if (lowerAction.includes('read') && lowerAction.includes('file') || lowerAction.includes('📖')) {
          tool_name = 'read_file';
        } else if (lowerAction.includes('list') && lowerAction.includes('file') || lowerAction.includes('📁')) {
          tool_name = 'list_files';
        }
        
        currentStep = { 
          type: 'action', 
          content: actionText,
          tool_name,
          tool_input,
          progressContent: '' // Track streaming progress updates
        };
      } else if (line.startsWith('Observation:')) {
        inAgentSection = true;
        if (currentStep) agentSteps.push(currentStep);
        currentStep = { 
          type: 'observation', 
          content: line.replace('Observation:', '').trim() 
        };
      } else if (line.startsWith('**Here\'s what I found:**') || 
                 line.startsWith('Here&apos;s what I found:') ||
                 line.startsWith('Based on')) {
        // This might be the start of the final answer
        if (currentStep) {
          agentSteps.push(currentStep);
          currentStep = null;
        }
        inAgentSection = false;
        finalAnswer += line + '\n';
      } else if (currentStep && line) {
        // If this is an action step and the line looks like progress, add to progressContent
        if (currentStep.type === 'action' && (
          line.includes('Searching for:') || 
          line.includes('Found') || 
          line.includes('Scraping') || 
          line.includes('•') ||
          line.includes('processing websites') ||
          line.includes('✅') ||
          line.includes('🔄') ||
          line.includes('📍') ||
          line.startsWith('[') || // For numbered results like [1], [2]
          line.includes('Performing web search for:')
        )) {
          currentStep.progressContent += line + '\n';
        } else {
          currentStep.content += ' ' + line;
        }
      } else if (!inAgentSection && line) {
        finalAnswer += line + '\n';
      }
    }
    
    if (currentStep) agentSteps.push(currentStep);
    
    // Helper function for comprehensive JSON detection (reusing the same logic)
    const looksLikeJson = (text: string): boolean => {
      const cleanText = text.trim();
      
      // Check for various JSON patterns
      const jsonPatterns = [
        /^\s*[\{\[]/,                           // Starts with { or [
        /[\}\]]\s*$/,                           // Ends with } or ]
        /"[^"]*":\s*"[^"]*"/,                   // Key-value pairs with quotes
        /"[^"]*":\s*[\{\[\]]/,                  // Property with object/array value
        /```json/i,                             // JSON code blocks
        /"tool_name"/,                          // Tool name property
        /"tool_input"/,                         // Tool input property
        /"query"/,                              // Query property
        /\{\s*"[^"]*":/,                        // Object with quoted property
        /"\w+":\s*"/,                           // Any quoted property
        /"[^"]*",\s*"[^"]*":/                   // Multiple properties
      ];
      
      return jsonPatterns.some(pattern => pattern.test(cleanText));
    };

    // Filter out any remaining JSON-containing steps
    const cleanedSteps = agentSteps.filter(step => {
      if (!step.content.trim()) return false;
      
      // Remove any steps that still contain JSON patterns
      if (looksLikeJson(step.content)) {
        return false;
      }
      
      return true;
    });

    return { 
      agentSteps: cleanedSteps, 
      finalAnswer: finalAnswer.trim() 
    };
  };

  const messageContent = typeof message.content === 'string' ? message.content : 
                        Array.isArray(message.content) ? message.content.map((part: any) => part.text || part).join('') :
                        '';

    // Update streaming parsing when content changes
  useEffect(() => {
    if (messageContent.length > lastContentLength.current) {
      const { agentSteps, finalAnswer } = parseAgentReasoning(messageContent);
      
      // Check if we have incomplete content that might be a new step starting
      const lines = messageContent.split('\n');
      const lastLine = lines[lines.length - 1]?.trim();
      const lastFewLines = lines.slice(-5).join('\n');
      
      // Simple check: if content just added "Thought: " with little/no content after
      const newContent = messageContent.slice(lastContentLength.current);
      const justStartedThinking = newContent.includes('Thought: ') && 
                                  messageContent.endsWith('Thought: ');
      
      // Look for patterns that indicate a new step is starting but incomplete
      const hasIncompleteThought = 
        justStartedThinking ||
        // Check if we have "Thought: " with very little content
        (() => {
          const lastThoughtMatch = messageContent.match(/Thought: (.*)$/);
          if (lastThoughtMatch) {
            const thoughtContent = lastThoughtMatch[1].trim();
            return thoughtContent.length < 10; // Very short content suggests still streaming
          }
          return false;
        })();
      
             // Check for starting action
       const justStartedAction = newContent.includes('Action: ') && 
                                (messageContent.endsWith('Action: ') || 
                                 (() => {
                                   const lastActionMatch = messageContent.match(/Action: (.*)$/);
                                   return lastActionMatch && lastActionMatch[1].trim().length < 10;
                                 })());

       const hasIncompleteAction = justStartedAction ||
         lastFewLines.includes('Action:') && 
         lines.some((line, idx) => {
           const isActionLine = line.trim() === 'Action:';
           const nextLine = lines[idx + 1];
           return isActionLine && (!nextLine || nextLine.trim() === '');
         });

       // Check for starting observation
       const justStartedObservation = newContent.includes('Observation: ') && 
                                     messageContent.endsWith('Observation: ');
       
       const hasIncompleteObservation = 
         justStartedObservation ||
         // Check if we have "Observation: " with very little content
         (() => {
           const lastObservationMatch = messageContent.match(/Observation: (.*)$/);
           if (lastObservationMatch) {
             const observationContent = lastObservationMatch[1].trim();
             return observationContent.length < 20; // Very short content suggests still streaming
           }
           return false;
         })();
      
              if (hasIncompleteThought) {
          const incompleteStep = {
            type: 'thought',
            content: '',
            isStreaming: true
          };
          setStreamingSteps([...agentSteps, incompleteStep]);
        } else if (hasIncompleteAction) {
          const incompleteStep = {
            type: 'action',
            content: '',
            isStreaming: true,
            tool_name: '',
            progressContent: ''
          };
          setStreamingSteps([...agentSteps, incompleteStep]);
        } else if (hasIncompleteObservation) {
          const incompleteStep = {
            type: 'observation',
            content: '',
            isStreaming: true
          };
          setStreamingSteps([...agentSteps, incompleteStep]);
        } else {
          // Mark the last step as streaming if it looks incomplete, but preserve existing streaming state
          const updatedSteps = [...agentSteps];
          if (updatedSteps.length > 0) {
            const lastStep = updatedSteps[updatedSteps.length - 1];
            const previousStep = streamingSteps.find(s => 
              s.type === lastStep.type && 
              Math.abs(streamingSteps.indexOf(s) - (updatedSteps.length - 1)) <= 1
            );
            
            // If the last step looks like it's still being written
            if (lastStep.type === 'thought' || lastStep.type === 'observation') {
              const content = lastStep.content.trim();
              
              // Don't mark as streaming if there's already a final answer (agent is done)
              if (finalAnswer.trim().length > 0) {
                lastStep.isStreaming = false;
              } else {
                // Once a step was streaming, keep it streaming until we have clear completion
                const wasStreaming = previousStep?.isStreaming;
                const hasNewContent = messageContent.length > lastContentLength.current;
                const looksIncomplete = content.length < 50 || 
                                      (!content.endsWith('.') && !content.endsWith('!') && !content.endsWith('?'));
                
                // Keep streaming if it was already streaming OR if it looks incomplete and new content is arriving
                if (wasStreaming || (looksIncomplete && hasNewContent)) {
                  lastStep.isStreaming = true;
                } else {
                  lastStep.isStreaming = false;
                }
              }
            }
          }
          setStreamingSteps(updatedSteps);
        }
      
      setStreamingFinalAnswer(finalAnswer);
      lastContentLength.current = messageContent.length;
    }
  }, [messageContent, streamingSteps]);
  
  // Use streaming steps if available, otherwise fall back to static parsing
  const { agentSteps, finalAnswer } = streamingSteps.length > 0 || streamingFinalAnswer 
    ? { agentSteps: streamingSteps, finalAnswer: streamingFinalAnswer }
    : parseAgentReasoning(messageContent);
  const hasAgentSteps = agentSteps.length > 0;

  return (
    <div className="bg-gray-50 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-700/50 animate-fade-in">
      <div className="flex items-start gap-4 max-w-4xl mx-auto px-4 py-6 group">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
          <Bot className="w-4 h-4" />
        </div>
        <div className="flex-1 space-y-4">
          {/* Agent Reasoning Steps */}
          {hasAgentSteps && (
            <AgentTrace trace={agentSteps} hasFinalAnswer={!!finalAnswer} />
          )}
          
          {/* Final Answer Content */}
          {finalAnswer && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800 max-h-96 overflow-y-auto">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <h4 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Final Answer</h4>
              </div>
              <MarkdownRenderer content={formatFinalAnswer(finalAnswer)} className="text-gray-900 dark:text-gray-100" />
            </div>
          )}
          
          {/* Fallback: Show original content if no agent steps detected */}
          {!hasAgentSteps && !finalAnswer && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto">
              <MarkdownRenderer 
                content={formatFinalAnswer(messageContent || 'Assistant response')} 
                className="text-gray-900 dark:text-gray-100" 
              />
            </div>
          )}

          {/* Message Actions */}
          <div className="flex items-center gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" className="h-8 px-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <Copy className="w-4 h-4 mr-1" />
              Copy
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <ThumbsUp className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <ThumbsDown className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <RotateCcw className="w-4 h-4 mr-1" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Welcome Screen Component  
const WelcomeScreen = () => {
  const suggestions = [
    "Help me build a React component",
    "Explain quantum computing", 
    "Write a Python script for data analysis",
    "Design a modern user interface"
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-surface min-h-full">
      <div className="text-center mb-12">
        <div className="relative w-24 h-24 mb-8 mx-auto">
          <div className="absolute inset-0 bg-gradient-primary rounded-full shadow-2xl animate-bounce-subtle"></div>
          <div className="relative w-full h-full bg-gradient-primary rounded-full flex items-center justify-center text-white shadow-glow">
            <Sparkles className="w-10 h-10 animate-pulse" />
          </div>
        </div>
        <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent mb-6">
          How can I help you today?
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-lg mx-auto text-center leading-relaxed">
          I&apos;m your AI assistant powered by advanced reasoning. Ask me anything or choose from the suggestions below.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className="group relative p-6 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800 cursor-pointer transition-all duration-300 hover-lift hover:border-blue-300 dark:hover:border-blue-500 text-left shadow-soft hover:shadow-glow"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
            }}
          >
            <div className="relative z-10">
              <p className="text-gray-800 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-gray-100 font-medium leading-relaxed">
                {suggestion}
              </p>
            </div>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Modern Assistant component with enhanced styling
 */
function AssistantContent() {
  const [showDemo, setShowDemo] = useState(false);
  const [agentMode, setAgentMode] = useState(false);
  const [selectedTools, setSelectedTools] = useState<string[]>(["web_search"]);

  const runtime = useChatRuntime({
    api: getApiUrl(config.api.endpoints.chat),
    body: {
      mode: agentMode ? "agent" : "standard",
      enabled_tools: agentMode ? selectedTools : []
    },
    onResponse: (response) => {
      console.log('API Response:', response);
    },
    onError: (error) => {
      console.log('API Error:', error);
    }
  });

  if (isDemoMode() || showDemo) {
    return (
      <div className="h-full flex flex-col">
        {/* Demo Header */}
        {isDemoMode() && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 p-3">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                <span className="text-sm text-yellow-800 dark:text-yellow-200">
                  Demo Mode - Configure API URL in config.ts to connect to your backend
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDemo(!showDemo)}
                className="text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300"
              >
                {showDemo ? 'Show Error' : 'Try Demo'}
              </Button>
            </div>
          </div>
        )}
        
        {showDemo || isDemoMode() ? (
          <DemoMode 
            agentMode={agentMode}
            setAgentMode={setAgentMode}
            selectedTools={selectedTools}
            setSelectedTools={setSelectedTools}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20">
            <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-red-200 dark:border-red-800 max-w-md mx-4">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 text-2xl font-bold mb-4 mx-auto">
                !
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Configuration Error
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                API URL is not configured. Please update the baseUrl in src/lib/config.ts to connect to the backend API.
              </p>
              <Button onClick={() => setShowDemo(true)} className="w-full">
                Try Demo Mode
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  console.log('Runtime config:', {
    mode: agentMode ? "agent" : "standard",
    enabled_tools: agentMode ? selectedTools : [],
    agentMode,
    selectedTools
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="h-full flex flex-col bg-white dark:bg-gray-900">
        <ChatControls
          agentMode={agentMode}
          onAgentModeChange={setAgentMode}
          selectedTools={selectedTools}
          onToolsChange={setSelectedTools}
        />
        <div className="flex-1 min-h-0 flex flex-col">
          <Thread 
            components={{
              UserMessage: CustomUserMessage,
              AssistantMessage: CustomAssistantMessage,
              ThreadWelcome: WelcomeScreen,
            }}
          />
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
}

export default AssistantContent; 