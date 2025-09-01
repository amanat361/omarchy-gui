import { useEffect, useState, useMemo } from 'react';
import { Switch } from '../ui/switch';
import { Slider } from '../ui/slider';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { SimpleInputConfigManager, type SimpleInputSettings } from '../../lib/simple-input-config';
import { SimpleDisplayConfigManager, type SimpleDisplaySettings } from '../../lib/simple-display-config';
import { FileOperationsPanel } from '../ui/file-operations-panel';


interface MainContentProps {
  activeCategory: string;
}

function InputContent() {
  const [configManager, setConfigManager] = useState<SimpleInputConfigManager | null>(null);
  const [currentSettings, setCurrentSettings] = useState<SimpleInputSettings>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [backupInfo, setBackupInfo] = useState<{backupCount: number; hasOriginal: boolean}>({backupCount: 0, hasOriginal: false});
  const [lastAction, setLastAction] = useState<string>('');

  const filePath = '~/.config/hypr/input.conf';

  const fetchInputConfig = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/config-file?path=' + encodeURIComponent(filePath));
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch file');
      }
      
      const manager = new SimpleInputConfigManager(data.content, filePath);
      const settings = manager.getSettings();
      
      setConfigManager(manager);
      setCurrentSettings(settings);
      setError(''); // Clear any previous errors
      
      // Get backup info
      await fetchBackupInfo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setLoading(false);
    }
  };

  const fetchBackupInfo = async () => {
    try {
      const params = new URLSearchParams({
        action: 'list-backups',
        filePath: filePath
      });
      const response = await fetch(`/api/backup?${params}`);
      const data = await response.json();
      if (response.ok) {
        setBackupInfo(data);
      }
    } catch (err) {
      console.warn('Failed to fetch backup info:', err);
    }
  };

  useEffect(() => {
    fetchInputConfig();
  }, []);

  const updateSetting = (key: keyof SimpleInputSettings, value: any, enabled: boolean) => {
    if (!configManager) return;

    // Validate the new setting
    const testSettings = { [key]: { value, enabled } };
    const validation = SimpleInputConfigManager.validateSettings(testSettings);
    
    if (!validation.valid) {
      setError(`Invalid ${key}: ${validation.errors.join(', ')}`);
      return;
    }

    // Update the config
    configManager.updateSetting(key, value, enabled);
    
    // Update local state
    setCurrentSettings(prev => ({
      ...prev,
      [key]: { value, enabled }
    }));
    
    setError(''); // Clear any validation errors
  };

  const handleSave = async () => {
    if (!configManager) return;

    try {
      setSaving(true);
      setError('');
      
      const content = configManager.serialize();
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'save', 
          filePath, 
          content 
        })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Save failed');
      }
      
      setLastAction(`Saved at ${new Date().toLocaleTimeString()}`);
      await fetchBackupInfo();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleRevertToPrevious = async () => {
    try {
      setSaving(true);
      setError('');
      
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'revert-previous', 
          filePath 
        })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Revert failed');
      }
      
      setLastAction(`Reverted to previous save`);
      await fetchInputConfig(); // Reload file content and UI
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revert failed');
    } finally {
      setSaving(false);
    }
  };

  const handleRevertToOriginal = async () => {
    try {
      setSaving(true);
      setError('');
      
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'revert-original', 
          filePath 
        })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Revert failed');
      }
      
      setLastAction(`Reverted to original file`);
      await fetchInputConfig(); // Reload file content and UI
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revert failed');
    } finally {
      setSaving(false);
    }
  };


  const handleOpenBackupFolder = async () => {
    try {
      const response = await fetch('/api/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: '~/.config/omarchy-gui/backups' })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to open backup folder');
      }
    } catch (error) {
      console.error('Failed to open backup folder:', error);
      setError(error instanceof Error ? error.message : 'Failed to open backup folder');
    }
  };

  const handleOpenCurrentFile = async () => {
    try {
      const response = await fetch('/api/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to open file');
      }
    } catch (error) {
      console.error('Failed to open file:', error);
      setError(error instanceof Error ? error.message : 'Failed to open file');
    }
  };

  const generatePreview = () => {
    if (!configManager) return '';
    return configManager.serialize();
  };

  // Memoize diff generation to avoid recalculation on every render
  const diffPreview = useMemo(() => {
    if (!configManager) return [];
    
    const original = configManager.getOriginalContent();
    const modified = configManager.serialize();
    
    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');
    
    const diff = [];
    const maxLines = Math.max(originalLines.length, modifiedLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const originalLine = originalLines[i] || '';
      const modifiedLine = modifiedLines[i] || '';
      
      if (originalLine !== modifiedLine) {
        if (originalLine && modifiedLine) {
          // Changed line
          diff.push({ type: 'removed', content: originalLine, lineNum: i + 1 });
          diff.push({ type: 'added', content: modifiedLine, lineNum: i + 1 });
        } else if (originalLine) {
          // Removed line
          diff.push({ type: 'removed', content: originalLine, lineNum: i + 1 });
        } else {
          // Added line
          diff.push({ type: 'added', content: modifiedLine, lineNum: i + 1 });
        }
      } else {
        // Unchanged line
        diff.push({ type: 'unchanged', content: originalLine, lineNum: i + 1 });
      }
    }
    
    return diff;
  }, [configManager, currentSettings]); // Recalculate when settings change

  if (loading) {
    return (
      <div className="text-gray-400 text-center py-16">
        <div className="text-2xl mb-4">📄</div>
        <p>Loading input.conf...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center py-16">
        <div className="text-2xl mb-4">⚠️</div>
        <p className="text-lg">Error loading file</p>
        <p className="text-sm mt-2">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">{/* Changed from grid to single column */}
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
        
        <div className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-medium text-gray-800">Touchpad</h4>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <Label className="text-sm font-medium">Natural Scrolling</Label>
                      <span className={`px-2 py-1 text-xs rounded ${
                        currentSettings.natural_scroll?.enabled 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {currentSettings.natural_scroll?.enabled ? 'CUSTOM' : 'DEFAULT'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">Scroll direction follows finger movement</p>
                  </div>
                  <Switch
                    checked={currentSettings.natural_scroll?.enabled ?? false}
                    onCheckedChange={(enabled) => 
                      updateSetting('natural_scroll', currentSettings.natural_scroll?.value ?? true, enabled)
                    }
                  />
                </div>
                {currentSettings.natural_scroll?.enabled && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Value</Label>
                      <Switch
                        checked={currentSettings.natural_scroll?.value ?? false}
                        onCheckedChange={(value) => 
                          updateSetting('natural_scroll', value, true)
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <Label className="text-sm font-medium">Scroll Speed</Label>
                      <span className={`px-2 py-1 text-xs rounded ${
                        currentSettings.scroll_factor?.enabled 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {currentSettings.scroll_factor?.enabled ? 'CUSTOM' : 'DEFAULT'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">Control touchpad scroll speed</p>
                  </div>
                  <Switch
                    checked={currentSettings.scroll_factor?.enabled ?? false}
                    onCheckedChange={(enabled) => 
                      updateSetting('scroll_factor', currentSettings.scroll_factor?.value ?? 0.2, enabled)
                    }
                  />
                </div>
                {currentSettings.scroll_factor?.enabled && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm">Value</Label>
                      <span className="text-xs text-gray-500">
                        {currentSettings.scroll_factor?.value?.toFixed(1) ?? '0.2'}
                      </span>
                    </div>
                    <Slider
                      value={[currentSettings.scroll_factor?.value ?? 0.2]}
                      onValueChange={([value]) => 
                        updateSetting('scroll_factor', value, true)
                      }
                      min={0.1}
                      max={2.0}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-800">Mouse & General</h4>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <Label className="text-sm font-medium">Mouse Sensitivity</Label>
                      <span className={`px-2 py-1 text-xs rounded ${
                        currentSettings.sensitivity?.enabled 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {currentSettings.sensitivity?.enabled ? 'CUSTOM' : 'DEFAULT'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">Adjust mouse sensitivity (0 = system default)</p>
                  </div>
                  <Switch
                    checked={currentSettings.sensitivity?.enabled ?? false}
                    onCheckedChange={(enabled) => 
                      updateSetting('sensitivity', currentSettings.sensitivity?.value ?? 0.0, enabled)
                    }
                  />
                </div>
                {currentSettings.sensitivity?.enabled && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm">Value</Label>
                      <span className="text-xs text-gray-500">
                        {currentSettings.sensitivity?.value?.toFixed(2) ?? '0.00'}
                      </span>
                    </div>
                    <Slider
                      value={[currentSettings.sensitivity?.value ?? 0.0]}
                      onValueChange={([value]) => 
                        updateSetting('sensitivity', value, true)
                      }
                      min={-1.0}
                      max={1.0}
                      step={0.05}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

        <FileOperationsPanel
          filePath={filePath}
          backupInfo={backupInfo}
          onSave={handleSave}
          onRevertToPrevious={handleRevertToPrevious}
          onRevertToOriginal={handleRevertToOriginal}
          onOpenCurrentFile={handleOpenCurrentFile}
          onOpenBackupFolder={handleOpenBackupFolder}
          saving={saving}
          lastAction={lastAction}
        />
      </div>

      {/* <div className="space-y-6">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">~/.config/hypr/input.conf</h3>
            <span className="text-xs text-gray-500">{generatePreview().split('\n').length} lines</span>
          </div>
          <div className="bg-gray-900 rounded text-sm overflow-x-auto overflow-y-auto max-h-96 font-mono">
            {diffPreview.map((line, index) => (
              <div 
                key={index}
                className={`px-4 py-1 flex whitespace-nowrap ${
                  line.type === 'added' 
                    ? 'bg-green-900/50 text-green-200' 
                    : line.type === 'removed' 
                    ? 'bg-red-900/50 text-red-200' 
                    : 'text-gray-100'
                }`}
              >
                <span className={`inline-block w-8 text-gray-400 text-right mr-3 flex-shrink-0 ${
                  line.type === 'added' ? 'text-green-400' : 
                  line.type === 'removed' ? 'text-red-400' : ''
                }`}>
                  {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : line.lineNum}
                </span>
                <span className="whitespace-pre">
                  {line.content || ' '}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-yellow-600 font-medium text-sm">⚠️ Preview Only</span>
          </div>
          <p className="text-yellow-700 text-xs">
            This shows what the config would look like with your changes. Click "Save Changes" to write to the actual file.
            <br />
            <span className="text-green-600">+ Green lines</span> would be added/uncommented, <span className="text-red-600">- Red lines</span> would be removed/commented.
          </p>
        </div>
      </div> */}
    </div>
  );
}

function AboutContent() {
  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">About Omarchy GUI</h3>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
          <p className="text-gray-700">
            <strong>Omarchy GUI</strong> is a system settings interface designed specifically for Hyprland configurations 
            on Omarchy Linux. It provides a user-friendly way to modify Hyprland config files directly.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="font-medium text-gray-800 mb-3">How It Works</h4>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <p className="text-gray-600">
                <strong>Direct File Editing:</strong> All changes are written directly to your Hyprland configuration files 
                (like ~/.config/hypr/input.conf). No intermediate formats or complex transformations.
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <p className="text-gray-600">
                <strong>Automatic Backups:</strong> Before any changes, the app creates timestamped backups in 
                ~/.config/omarchy-gui/backups/ so you can always revert changes.
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
              <p className="text-gray-600">
                <strong>Live Reload:</strong> After saving changes, you can instantly reload Hyprland configuration 
                with the refresh button to see your changes take effect.
              </p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-800 mb-3">Safety Features</h4>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <ul className="space-y-2 text-sm text-yellow-800">
              <li>• <strong>Original Backup:</strong> First edit creates a .original backup of your file</li>
              <li>• <strong>Timestamped Backups:</strong> Each save creates a dated backup you can restore from</li>
              <li>• <strong>Validation:</strong> Settings are validated before being written to prevent invalid configs</li>
              <li>• <strong>Revert Options:</strong> Easy one-click revert to previous save or original file</li>
            </ul>
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-800 mb-3">File Locations</h4>
          <div className="space-y-2 font-mono text-sm bg-gray-100 p-4 rounded-lg">
            <div><strong>Config Files:</strong> ~/.config/hypr/*.conf</div>
            <div><strong>Backups:</strong> ~/.config/omarchy-gui/backups/</div>
            <div><strong>App Data:</strong> Browser localStorage for UI state</div>
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-800 mb-3">Technology</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 p-4 rounded-lg">
              <strong>Frontend:</strong><br/>
              React 19, TypeScript, TailwindCSS
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <strong>Backend:</strong><br/>
              Bun runtime, direct file I/O
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DisplayContent() {
  const [configManager, setConfigManager] = useState<SimpleDisplayConfigManager | null>(null);
  const [currentSettings, setCurrentSettings] = useState<SimpleDisplaySettings>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [backupInfo, setBackupInfo] = useState<{backupCount: number; hasOriginal: boolean}>({backupCount: 0, hasOriginal: false});
  const [lastAction, setLastAction] = useState<string>('');

  const filePath = '~/.config/hypr/monitors.conf';

  const fetchDisplayConfig = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/config-file?path=' + encodeURIComponent(filePath));
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch file');
      }
      
      const manager = new SimpleDisplayConfigManager(data.content, filePath);
      const settings = manager.getSettings();
      
      setConfigManager(manager);
      setCurrentSettings(settings);
      setError('');
      
      await fetchBackupInfo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setLoading(false);
    }
  };

  const fetchBackupInfo = async () => {
    try {
      const params = new URLSearchParams({
        action: 'list-backups',
        filePath: filePath
      });
      const response = await fetch(`/api/backup?${params}`);
      const data = await response.json();
      if (response.ok) {
        setBackupInfo(data);
      }
    } catch (err) {
      console.warn('Failed to fetch backup info:', err);
    }
  };

  const handleSave = async () => {
    if (!configManager) return;

    try {
      setSaving(true);
      setError('');
      
      const content = configManager.serialize();
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'save', 
          filePath, 
          content 
        })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Save failed');
      }
      
      setLastAction(`Saved at ${new Date().toLocaleTimeString()}`);
      await fetchBackupInfo();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleRevertToPrevious = async () => {
    try {
      setSaving(true);
      setError('');
      
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'revert-previous', 
          filePath 
        })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Revert failed');
      }
      
      setLastAction(`Reverted to previous save`);
      await fetchDisplayConfig();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revert failed');
    } finally {
      setSaving(false);
    }
  };

  const handleRevertToOriginal = async () => {
    try {
      setSaving(true);
      setError('');
      
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'revert-original', 
          filePath 
        })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Revert failed');
      }
      
      setLastAction(`Reverted to original file`);
      await fetchDisplayConfig();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revert failed');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof SimpleDisplaySettings, value: any, enabled: boolean) => {
    if (!configManager) return;

    // Validate the new setting
    const testSettings = { [key]: { value, enabled } };
    const validation = SimpleDisplayConfigManager.validateSettings(testSettings);
    
    if (!validation.valid) {
      setError(`Invalid ${key}: ${validation.errors.join(', ')}`);
      return;
    }

    // Update the config
    configManager.updateSetting(key, value, enabled);
    
    // Update local state
    setCurrentSettings(prev => ({
      ...prev,
      [key]: { value, enabled }
    }));
    
    setError(''); // Clear any validation errors
  };

  const handleOpenBackupFolder = async () => {
    try {
      const response = await fetch('/api/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: '~/.config/omarchy-gui/backups' })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to open backup folder');
      }
    } catch (error) {
      console.error('Failed to open backup folder:', error);
      setError(error instanceof Error ? error.message : 'Failed to open backup folder');
    }
  };

  const handleOpenCurrentFile = async () => {
    try {
      const response = await fetch('/api/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to open file');
      }
    } catch (error) {
      console.error('Failed to open file:', error);
      setError(error instanceof Error ? error.message : 'Failed to open file');
    }
  };

  useEffect(() => {
    fetchDisplayConfig();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-4">⏳</div>
        <p className="text-gray-600">Loading display configuration...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-4">❌</div>
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchDisplayConfig} className="bg-blue-600 hover:bg-blue-700">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
      
      {lastAction && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md">
          {lastAction}
        </div>
      )}

      {/* GDK Scale Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">GDK Scale</h3>
            <p className="text-sm text-gray-500">
              Global display scaling for applications (1.0 = 100%, 2.0 = 200%)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs font-medium rounded ${
              currentSettings.gdk_scale?.enabled 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {currentSettings.gdk_scale?.enabled ? 'CUSTOM' : 'DEFAULT'}
            </span>
            <Switch
              checked={currentSettings.gdk_scale?.enabled || false}
              onCheckedChange={(enabled) => {
                const value = enabled ? (currentSettings.gdk_scale?.value || '2') : '';
                updateSetting('gdk_scale', value, enabled);
              }}
            />
          </div>
        </div>
        
        {currentSettings.gdk_scale?.enabled && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="gdk-scale" className="text-sm font-medium text-gray-700">
                Scale Factor: {currentSettings.gdk_scale.value}
              </Label>
              <div className="mt-2">
                <input
                  id="gdk-scale"
                  type="text"
                  value={currentSettings.gdk_scale.value}
                  onChange={(e) => updateSetting('gdk_scale', e.target.value, true)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="2"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Common values: 1 (100%), 1.5 (150%), 2 (200%)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Primary Monitor Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Primary Monitor</h3>
            <p className="text-sm text-gray-500">
              Configure your main display settings
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs font-medium rounded ${
              currentSettings.monitor_primary?.enabled 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {currentSettings.monitor_primary?.enabled ? 'CUSTOM' : 'DEFAULT'}
            </span>
            <Switch
              checked={currentSettings.monitor_primary?.enabled || false}
              onCheckedChange={(enabled) => {
                const value = enabled ? (currentSettings.monitor_primary?.value || 'eDP-1,preferred,auto,auto') : '';
                updateSetting('monitor_primary', value, enabled);
              }}
            />
          </div>
        </div>
        
        {currentSettings.monitor_primary?.enabled && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="monitor-primary" className="text-sm font-medium text-gray-700">
                Monitor Configuration
              </Label>
              <div className="mt-2">
                <input
                  id="monitor-primary"
                  type="text"
                  value={currentSettings.monitor_primary.value}
                  onChange={(e) => updateSetting('monitor_primary', e.target.value, true)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  placeholder="eDP-1,preferred,auto,auto"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Format: port,resolution,position,scale (e.g., "eDP-1,1920x1080@60,0x0,1")
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Secondary Monitor Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Secondary Monitor</h3>
            <p className="text-sm text-gray-500">
              Configure your secondary display settings
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs font-medium rounded ${
              currentSettings.monitor_secondary?.enabled 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {currentSettings.monitor_secondary?.enabled ? 'CUSTOM' : 'DEFAULT'}
            </span>
            <Switch
              checked={currentSettings.monitor_secondary?.enabled || false}
              onCheckedChange={(enabled) => {
                const value = enabled ? (currentSettings.monitor_secondary?.value || 'HDMI-1,disable') : '';
                updateSetting('monitor_secondary', value, enabled);
              }}
            />
          </div>
        </div>
        
        {currentSettings.monitor_secondary?.enabled && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="monitor-secondary" className="text-sm font-medium text-gray-700">
                Monitor Configuration
              </Label>
              <div className="mt-2">
                <input
                  id="monitor-secondary"
                  type="text"
                  value={currentSettings.monitor_secondary.value}
                  onChange={(e) => updateSetting('monitor_secondary', e.target.value, true)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  placeholder="HDMI-1,disable"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Format: port,resolution,position,scale or "port,disable" to disable
              </p>
            </div>
          </div>
        )}
      </div>

      {/* File Operations */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">File Operations</h3>
            <p className="text-sm text-gray-500">
              Manage your display configuration file
            </p>
          </div>
          <div className="text-sm text-gray-600">
            <strong>File:</strong> {filePath}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700">
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button 
              onClick={handleRevertToPrevious}
              disabled={saving || backupInfo.backupCount === 0}
              variant="outline"
            >
              Revert to Previous
            </Button>
            <Button 
              onClick={handleRevertToOriginal} 
              disabled={saving || !backupInfo.hasOriginal}
              variant="outline"
            >
              Revert to Original
            </Button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              {backupInfo.backupCount > 0 && (
                <span>
                  {backupInfo.backupCount} backup{backupInfo.backupCount === 1 ? '' : 's'} available in{' '}
                  <button 
                    onClick={handleOpenBackupFolder}
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
            <div className="flex gap-2">
              <Button onClick={handleOpenCurrentFile} variant="outline" size="sm">
                📄 View File
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MainContent({ activeCategory }: MainContentProps) {
  const getCategoryTitle = (categoryId: string): string => {
    const titles: Record<string, string> = {
      display: 'Display',
      input: 'Input',
      keybinds: 'Keybinds',
      system: 'System',
      network: 'Network',
      audio: 'Audio',
      appearance: 'Appearance',
      about: 'About',
    };
    return titles[categoryId] || 'Settings';
  };

  const getCategoryDescription = (categoryId: string): string => {
    const descriptions: Record<string, string> = {
      display: 'Configure monitor settings, resolution, and display preferences',
      input: 'Adjust mouse, touchpad, and keyboard input settings',
      keybinds: 'Customize keyboard shortcuts and key bindings',
      system: 'System-wide configuration and preferences',
      network: 'Network connections and internet settings',
      audio: 'Sound output, input, and volume settings',
      appearance: 'Theme, colors, and visual customization',
      about: 'Learn how this application works and its features',
    };
    return descriptions[categoryId] || 'Configure your settings';
  };

  const renderCategoryContent = () => {
    switch (activeCategory) {
      case 'input':
        return <InputContent />;
      case 'display':
        return <DisplayContent />;
      case 'about':
        return <AboutContent />;
      default:
        return (
          <div className="text-gray-400 text-center py-16">
            <div className="text-4xl mb-4">⚙️</div>
            <p className="text-lg">Settings panel for {getCategoryTitle(activeCategory)} will be implemented here.</p>
            <p className="text-sm mt-2">This area will contain the actual configuration options.</p>
          </div>
        );
    }
  };

  const getDocsUrl = (categoryId: string): string | null => {
    const docsUrls: Record<string, string> = {
      input: 'https://wiki.hypr.land/Configuring/Variables/#input',
      display: 'https://wiki.hypr.land/Configuring/Monitors/',
      // Add more documentation URLs as pages are implemented
      // keybinds: 'https://wiki.hypr.land/Configuring/Binds/',
    };
    return docsUrls[categoryId] || null;
  };

  return (
    <div className="flex-1 h-screen bg-white flex flex-col">
      <div className="border-b border-gray-100 bg-gray-50/50 p-4 h-20 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {getCategoryTitle(activeCategory)}
            </h2>
            <p className="text-gray-600 mt-1 text-sm">
              {getCategoryDescription(activeCategory)}
            </p>
          </div>
          {getDocsUrl(activeCategory) && (
            <a 
              href={getDocsUrl(activeCategory)!}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2 rounded-md transition-colors flex items-center gap-2"
            >
              📖 View Documentation
            </a>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="max-w-4xl">
            {renderCategoryContent()}
          </div>
        </div>
      </div>
    </div>
  );
}