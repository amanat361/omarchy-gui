import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, type ReactNode } from "react";
import { Highlight, themes } from "prism-react-renderer";

interface ConfigFileEditorProps {
  title: string;
  filePath: string;
  language?: string;
  children?: (addContent: (content: string) => void) => ReactNode; // Custom GUI components with addContent function
  onSave?: (content: string) => Promise<void>;
  onLoad?: (content: string) => void;
  customActions?: ReactNode; // Custom action buttons
}

export function ConfigFileEditor({ 
  title, 
  filePath, 
  language = "bash",
  children,
  onSave,
  onLoad,
  customActions
}: ConfigFileEditorProps) {
  const [originalContent, setOriginalContent] = useState("");
  const [currentContent, setCurrentContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const addContent = (content: string) => {
    setCurrentContent(prev => prev + "\n" + content);
    setIsEditing(true);
  };

  const loadFile = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/config-file?path=${encodeURIComponent(filePath)}`);
      const data = await response.json();
      
      if (data.error) {
        setError(data.message || data.error);
      } else {
        setOriginalContent(data.content);
        setCurrentContent(data.content);
        onLoad?.(data.content);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load file");
    } finally {
      setLoading(false);
    }
  };

  const saveFile = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (onSave) {
        await onSave(currentContent);
      } else {
        const response = await fetch("/api/config-file", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ path: filePath, content: currentContent }),
        });
        
        const data = await response.json();
        
        if (data.error) {
          setError(data.message || data.error);
          return;
        }
      }
      
      setSuccess("File saved successfully!");
      setOriginalContent(currentContent);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save file");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = originalContent !== currentContent;

  useEffect(() => {
    loadFile();
  }, [filePath]);

  return (
    <div className="h-1/2 flex flex-col">
      <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex gap-2">
          {hasChanges && (
            <Button 
              variant="outline" 
              onClick={() => {
                setCurrentContent(originalContent);
                setIsEditing(false);
              }}
            >
              Reset Changes
            </Button>
          )}
          <Button 
            variant="outline"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? "Preview" : "Edit"}
          </Button>
          <Button 
            onClick={saveFile} 
            disabled={!hasChanges || saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {error && (
          <div className="text-red-500 p-4 border-b border-red-200 bg-red-50">
            Error: {error}
          </div>
        )}
        
        {success && (
          <div className="text-green-500 p-4 border-b border-green-200 bg-green-50">
            {success}
          </div>
        )}

        {/* Custom GUI Components */}
        {children && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            {children(addContent)}
          </div>
        )}

        {/* Custom Action Buttons */}
        {customActions && (
          <div className="p-4 border-b border-gray-200 bg-blue-50">
            {customActions}
          </div>
        )}

        {/* File Content Editor/Viewer */}
        <div className="flex-1 flex flex-col p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {filePath}
            </span>
            {hasChanges && (
              <span className="text-sm text-amber-600">
                ⚠️ Unsaved changes
              </span>
            )}
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : isEditing ? (
            <Textarea
              value={currentContent}
              onChange={(e) => setCurrentContent(e.target.value)}
              className="flex-1 font-mono text-sm resize-none"
              placeholder="Loading file..."
            />
          ) : (
            <div className="flex-1 overflow-auto border rounded-lg">
              <Highlight
                theme={themes.github}
                code={currentContent}
                language={language}
              >
                {({ className, style, tokens, getLineProps, getTokenProps }) => (
                  <pre className={className} style={style}>
                    {tokens.map((line, i) => (
                      <div key={i} {...getLineProps({ line })}>
                        <span className="text-gray-500 text-xs mr-4 select-none">
                          {String(i + 1).padStart(3, ' ')}
                        </span>
                        {line.map((token, key) => (
                          <span key={key} {...getTokenProps({ token })} />
                        ))}
                      </div>
                    ))}
                  </pre>
                )}
              </Highlight>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
