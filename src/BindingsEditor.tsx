import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { ConfigFileEditor } from "./components/ConfigFileEditor";

interface Binding {
  key: string;
  description: string;
  command: string;
}

export function BindingsEditor() {
  const [newBinding, setNewBinding] = useState<Binding>({
    key: "",
    description: "",
    command: ""
  });

  return (
    <ConfigFileEditor
      title="Hyprland Bindings Editor"
      filePath="~/.config/hypr/bindings.conf"
      language="bash"
    >
      {(addContent) => (
        <div>
          <h3 className="text-md font-medium mb-4">Add New Binding</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label htmlFor="key">Key</Label>
              <Input
                id="key"
                placeholder="e.g., P, F1, comma"
                value={newBinding.key}
                onChange={(e) => setNewBinding({...newBinding, key: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="e.g., Terminal, Browser"
                value={newBinding.description}
                onChange={(e) => setNewBinding({...newBinding, description: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="command">Command</Label>
              <Input
                id="command"
                placeholder="e.g., uwsm app -- alacritty"
                value={newBinding.command}
                onChange={(e) => setNewBinding({...newBinding, command: e.target.value})}
              />
            </div>
          </div>
          <Button 
            onClick={() => {
              if (!newBinding.key || !newBinding.description || !newBinding.command) {
                alert("Please fill in all fields for the new binding");
                return;
              }

              const bindingLine = `bindd = SUPER, ${newBinding.key}, ${newBinding.description}, exec, ${newBinding.command}`;
              
              // Reset form
              setNewBinding({
                key: "",
                description: "",
                command: ""
              });
              
              // Add to editor content
              addContent(bindingLine);
            }} 
            className="w-full"
          >
            Add Binding
          </Button>
        </div>
      )}
    </ConfigFileEditor>
  );
}
