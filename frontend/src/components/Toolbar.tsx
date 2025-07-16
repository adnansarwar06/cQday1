import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings } from "lucide-react";
import React from "react";

export interface Tool {
  name: string;
  label: string;
}

interface ToolbarProps {
  mode: "standard" | "agent";
  setMode: (mode: "standard" | "agent") => void;
  availableTools: Tool[];
  enabledTools: string[];
  setEnabledTools: (tools: string[]) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  mode,
  setMode,
  availableTools,
  enabledTools,
  setEnabledTools,
}) => {
  const [isModalOpen, setModalOpen] = React.useState(false);

  return (
    <header className="flex h-16 w-full items-center justify-between border-b bg-white px-4 shrink-0">
      <div className="flex items-center gap-4">
        <Label htmlFor="agent-mode" className="text-sm font-medium">
          Agent Mode
        </Label>
        <Switch
          id="agent-mode"
          checked={mode === "agent"}
          onCheckedChange={(checked) => setMode(checked ? "agent" : "standard")}
        />
      </div>

      <Dialog open={isModalOpen} onOpenChange={setModalOpen}>
        <DialogTrigger asChild>
          <Button>
            <Settings className="mr-2 h-4 w-4" />
            <span>Tools ({enabledTools.length})</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="w-full max-w-lg">
          <DialogHeader>
            <DialogTitle>Configure Tools</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {availableTools.map((tool) => (
              <div
                key={tool.name}
                className="flex items-center justify-between"
              >
                <Label htmlFor={tool.name} className="font-medium">
                  {tool.label}
                </Label>
                <Switch
                  id={tool.name}
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
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
};

export default Toolbar; 