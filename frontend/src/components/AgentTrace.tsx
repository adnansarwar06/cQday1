import React from "react";
import { ExternalLink, Search, FileText } from "lucide-react";

interface TraceStep {
  step_type: "Thought" | "Action" | "Observation" | "Error";
  output?: string;
  tool_name?: string;
  tool_input?: any;
}

interface AgentTraceProps {
  trace: any[];
}

const AgentTrace: React.FC<AgentTraceProps> = ({ trace }) => {
  if (!trace || trace.length === 0) {
    return null;
  }

  // Aggregate thought chunks into a single thought
  const aggregatedTrace = trace.reduce((acc, step) => {
    if (step.type === "thought_chunk") {
      const lastStep = acc[acc.length - 1];
      if (lastStep && lastStep.type === "thought") {
        lastStep.content += step.content;
      }
    } else {
      acc.push(step);
    }
    return acc;
  }, []);

  const renderStep = (step: any, index: number) => {
    switch (step.type) {
      case "thought":
        return (
          <div key={index} className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-800">Thought</h4>
            <p className="text-gray-600 whitespace-pre-wrap">{step.content}</p>
          </div>
        );
      case "action":
        return (
          <div key={index} className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-800">Action: {step.tool_name}</h4>
            <pre className="text-sm text-blue-600 bg-blue-100 p-2 rounded-md mt-2">
              {JSON.stringify(step.tool_input, null, 2)}
            </pre>
          </div>
        );
      case "observation":
        return (
          <div key={index} className="p-4 bg-green-50 rounded-lg">
            <h4 className="font-semibold text-green-800">Observation</h4>
            <p className="text-gray-600 whitespace-pre-wrap">{step.content}</p>
          </div>
        );
      case "error":
        return (
          <div key={index} className="p-4 bg-red-50 rounded-lg">
            <h4 className="font-semibold text-red-800">Error</h4>
            <p className="text-red-600">{step.content}</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="mt-4 p-4 border rounded-lg bg-white shadow-sm">
      <h3 className="font-bold text-lg mb-2 text-gray-900">Agent Trace</h3>
      <div className="space-y-4">
        {aggregatedTrace.map(renderStep)}
      </div>
    </div>
  );
};

export default AgentTrace; 