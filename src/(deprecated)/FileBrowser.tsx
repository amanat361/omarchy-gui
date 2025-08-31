import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface FileItem {
  name: string;
  isDirectory: boolean;
  permissions: string;
}

interface FileResponse {
  files: FileItem[];
  currentPath: string;
  error?: string;
  message?: string;
}

export function FileBrowser() {
  const [currentPath, setCurrentPath] = useState("~/.config");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDirectoryContents = async (path: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/files?path=${encodeURIComponent(path)}`);
      const data: FileResponse = await response.json();
      
      if (data.error) {
        setError(data.message || data.error);
      } else {
        setFiles(data.files);
        setCurrentPath(path);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectoryContents("~/.config");
  }, []);

  const handleFolderClick = (folderName: string) => {
    const newPath = `${currentPath}/${folderName}`;
    loadDirectoryContents(newPath);
  };

  const handleBackClick = () => {
    if (currentPath === "~/.config") return;
    
    const pathParts = currentPath.split("/");
    pathParts.pop();
    const newPath = pathParts.join("/");
    loadDirectoryContents(newPath);
  };

  const canGoBack = currentPath !== "~/.config";

  return (
    <div className="h-1/2 border-b border-gray-200 flex flex-col">
      <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">File Browser</h2>
          <div className="text-sm text-gray-600 font-mono">
            {currentPath}
          </div>
        </div>
        {canGoBack && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleBackClick}
          >
            ← Back
          </Button>
        )}
      </div>
      
      <div className="flex-1 overflow-auto p-4">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading...</div>
          </div>
        )}
        
        {error && (
          <div className="text-red-500 p-4 border border-red-200 rounded-lg bg-red-50">
            Error: {error}
          </div>
        )}
        
        {!loading && !error && (
          <div className="grid gap-1">
            {files.map((file, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  file.isDirectory 
                    ? "hover:bg-blue-50 hover:border-blue-200 border border-transparent" 
                    : "hover:bg-gray-50 hover:border-gray-200 border border-transparent"
                }`}
                onClick={() => file.isDirectory && handleFolderClick(file.name)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {file.isDirectory ? "📁" : "📄"}
                  </span>
                  <div className="flex-1">
                    <div className="font-medium">{file.name}</div>
                    <div className="text-xs text-gray-500 font-mono">
                      {file.permissions}
                    </div>
                  </div>
                  {file.isDirectory && (
                    <span className="text-gray-400">→</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
