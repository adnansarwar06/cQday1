import React, { useState } from "react";
import { ChevronUp, ChevronDown, CheckCircle, Clock, AlertCircle } from "lucide-react";

interface CollapsibleStepProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  status?: "pending" | "running" | "completed" | "error";
  icon?: React.ReactNode;
  stepNumber?: number;
}

const CollapsibleStep: React.FC<CollapsibleStepProps> = ({
  title,
  children,
  defaultOpen = false,
  status = "completed",
  icon,
  stepNumber,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const getStatusIcon = () => {
    switch (status) {
      case "running":
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />;
    }
  };

  const getStatusColors = () => {
    switch (status) {
      case "running":
        return "border-blue-200 bg-blue-50 hover:bg-blue-100";
      case "completed":
        return "border-green-200 bg-green-50 hover:bg-green-100";
      case "error":
        return "border-red-200 bg-red-50 hover:bg-red-100";
      default:
        return "border-gray-200 bg-gray-50 hover:bg-gray-100";
    }
  };

  return (
    <div className={`border rounded-lg mb-3 overflow-hidden transition-all duration-200 ${getStatusColors()}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200"
      >
        <div className="flex items-center space-x-3">
          {stepNumber && (
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white border-2 border-current text-xs font-semibold">
              {stepNumber}
            </div>
          )}
          {getStatusIcon()}
          {icon && <div className="text-lg">{icon}</div>}
          <h4 className="font-semibold text-left text-gray-800">{title}</h4>
        </div>
        <div className="flex items-center space-x-2">
          {status === "running" && (
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
            </div>
          )}
          <div className="transition-transform duration-200">
            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </button>
      <div className={`transition-all duration-300 ease-in-out ${
        isOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
      } overflow-hidden`}>
        <div className="p-4 pt-0 border-t border-gray-200/50">
          <div className="bg-white rounded-lg p-3 shadow-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollapsibleStep; 