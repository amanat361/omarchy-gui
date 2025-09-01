import { Button } from './button';

interface BackupInfo {
  backupCount: number;
  hasOriginal: boolean;
}

interface FileOperationsPanelProps {
  filePath: string;
  backupInfo: BackupInfo;
  onSave: () => void;
  onRevertToPrevious: () => void;
  onRevertToOriginal: () => void;
  onOpenCurrentFile: () => void;
  onOpenBackupFolder: () => void;
  saving: boolean;
  lastAction?: string;
}

export function FileOperationsPanel({
  filePath,
  backupInfo,
  onSave,
  onRevertToPrevious,
  onRevertToOriginal,
  onOpenCurrentFile,
  onOpenBackupFolder,
  saving,
  lastAction
}: FileOperationsPanelProps) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">File Operations</h3>
          <p className="text-sm text-gray-500">
            Manage your configuration file
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenCurrentFile}
            className="text-xs"
          >
            📄 View File
          </Button>
          {lastAction && (
            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
              {lastAction}
            </span>
          )}
        </div>
      </div>
      
      <div className="space-y-3">
        <Button 
          onClick={onSave} 
          disabled={saving}
          className="w-full"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
        
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline"
            onClick={onRevertToPrevious}
            disabled={saving || backupInfo.backupCount === 0}
          >
            Revert to Previous
          </Button>
          
          <Button 
            variant="outline" 
            onClick={onRevertToOriginal}
            disabled={saving || !backupInfo.hasOriginal}
          >
            Revert to Original
          </Button>
        </div>
        
        <div className="text-xs text-gray-500 text-center">
          {backupInfo.backupCount > 0 && (
            <span>
              {backupInfo.backupCount} backup{backupInfo.backupCount === 1 ? '' : 's'} available in{' '}
              <button 
                onClick={onOpenBackupFolder}
                className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
              >
                ~/.config/omarchy-gui/backups
              </button>
            </span>
          )}
          {backupInfo.backupCount === 0 && (
            <span>No backups yet - save to create first backup</span>
          )}
        </div>
        
        <div className="text-xs text-gray-600 text-center">
          <strong>File:</strong> {filePath}
        </div>
      </div>
    </div>
  );
}