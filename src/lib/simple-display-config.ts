// Simple regex-based display config handler
export interface SimpleDisplaySettings {
  gdk_scale?: { value: string; enabled: boolean };
  monitor_primary?: { value: string; enabled: boolean };
  monitor_secondary?: { value: string; enabled: boolean };
}

export class SimpleDisplayConfigManager {
  private originalContent: string;
  private currentContent: string;
  private filePath: string;

  constructor(configContent: string, filePath: string = '~/.config/hypr/monitors.conf') {
    this.originalContent = configContent;
    this.currentContent = configContent;
    this.filePath = filePath;
    
    // Store original in localStorage as backup (browser only)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`omarchy-backup-${filePath}`, configContent);
    }
  }

  getSettings(): SimpleDisplaySettings {
    const settings: SimpleDisplaySettings = {};
    
    // Parse all properties in a single pass for efficiency
    const lines = this.currentContent.split('\n');
    
    // Pre-compile regexes for better performance
    const envRegex = /^\s*env\s*=\s*([^,]+),(.+?)(?:\s*#.*)?$/;
    const commentedEnvRegex = /^\s*#\s*env\s*=\s*([^,]+),(.+?)(?:\s*#.*)?$/;
    const monitorRegex = /^\s*monitor\s*=\s*(.+?)(?:\s*#.*)?$/;
    const commentedMonitorRegex = /^\s*#\s*monitor\s*=\s*(.+?)(?:\s*#.*)?$/;
    
    // Track which settings we've found active versions of
    const foundActiveSettings = new Set<string>();
    
    // First pass: find all active (uncommented) properties
    for (const line of lines) {
      // Check for active env properties first
      const envMatch = line.match(envRegex);
      if (envMatch) {
        const [, key, value] = envMatch;
        if (key && value !== undefined) {
          const settingKey = this.getSettingKey(key.trim());
          if (settingKey) {
            foundActiveSettings.add(settingKey);
            // Only set if value is not empty, or if we haven't set this key yet
            const trimmedValue = value.trim();
            if (trimmedValue || !settings[settingKey as keyof SimpleDisplaySettings]) {
              this.setSettingValue(settings, key.trim(), trimmedValue, true);
            }
          }
        }
        continue;
      }
      
      // Check for active monitor properties
      const monitorMatch = line.match(monitorRegex);
      if (monitorMatch) {
        const [, value] = monitorMatch;
        if (value !== undefined) {
          this.setMonitorValue(settings, value.trim(), true);
        }
      }
    }
    
    // Second pass: find commented properties only if no active version exists
    for (const line of lines) {
      // Check for commented env properties
      const commentedEnvMatch = line.match(commentedEnvRegex);
      if (commentedEnvMatch) {
        const [, key, value] = commentedEnvMatch;
        if (key && value !== undefined) {
          const settingKey = this.getSettingKey(key.trim());
          if (settingKey && !foundActiveSettings.has(settingKey)) {
            this.setSettingValue(settings, key.trim(), value.trim(), false);
          }
        }
        continue;
      }

      // Check for commented monitor properties (only if no active monitors found)
      const commentedMonitorMatch = line.match(commentedMonitorRegex);
      if (commentedMonitorMatch) {
        const [, value] = commentedMonitorMatch;
        if (value !== undefined && !settings.monitor_primary && !settings.monitor_secondary) {
          this.setMonitorValue(settings, value.trim(), false);
        }
      }
    }

    return settings;
  }
  
  private getSettingKey(envKey: string): string | null {
    if (envKey === 'GDK_SCALE') return 'gdk_scale';
    return null;
  }
  
  private setSettingValue(settings: SimpleDisplaySettings, key: string, value: string, enabled: boolean): void {
    if (key === 'GDK_SCALE') {
      settings.gdk_scale = { value, enabled };
    }
  }

  private setMonitorValue(settings: SimpleDisplaySettings, value: string, enabled: boolean): void {
    // Simple parsing - just store the first two monitor configs we find
    const parts = value.split(',');
    if (parts.length >= 1) {
      const monitor = parts[0];
      if (!settings.monitor_primary) {
        settings.monitor_primary = { value, enabled };
      } else if (!settings.monitor_secondary) {
        settings.monitor_secondary = { value, enabled };
      }
    }
  }

  updateSetting(key: keyof SimpleDisplaySettings, value: any, enabled: boolean): void {
    if (key === 'gdk_scale') {
      this.updateEnvProperty('GDK_SCALE', value, enabled);
    } else if (key === 'monitor_primary' || key === 'monitor_secondary') {
      this.updateMonitorProperty(key, value, enabled);
    }
  }

  private findEnvProperty(key: string): { value: string; isCommented: boolean; line: number } | null {
    const lines = this.currentContent.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for commented property: # env = key,value
      const commentedMatch = line?.match(new RegExp(`^\\s*#\\s*env\\s*=\\s*${key}\\s*,\\s*(.+?)(?:\\s*#.*)?$`));
      if (commentedMatch && commentedMatch[1]) {
        return {
          value: commentedMatch[1].trim(),
          isCommented: true,
          line: i
        };
      }
      
      // Check for active property: env = key,value
      const activeMatch = line?.match(new RegExp(`^\\s*env\\s*=\\s*${key}\\s*,\\s*(.+?)(?:\\s*#.*)?$`));
      if (activeMatch && activeMatch[1]) {
        return {
          value: activeMatch[1].trim(),
          isCommented: false,
          line: i
        };
      }
    }
    
    return null;
  }

  private findMonitorProperty(isSecondary: boolean): { value: string; isCommented: boolean; line: number } | null {
    const lines = this.currentContent.split('\n');
    let monitorCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for commented monitor
      const commentedMatch = line?.match(/^\s*#\s*monitor\s*=\s*(.+?)(?:\s*#.*)?$/);
      if (commentedMatch && commentedMatch[1]) {
        if (isSecondary && monitorCount === 1) {
          return {
            value: commentedMatch[1].trim(),
            isCommented: true,
            line: i
          };
        } else if (!isSecondary && monitorCount === 0) {
          return {
            value: commentedMatch[1].trim(),
            isCommented: true,
            line: i
          };
        }
        monitorCount++;
        continue;
      }
      
      // Check for active monitor
      const activeMatch = line?.match(/^\s*monitor\s*=\s*(.+?)(?:\s*#.*)?$/);
      if (activeMatch && activeMatch[1]) {
        if (isSecondary && monitorCount === 1) {
          return {
            value: activeMatch[1].trim(),
            isCommented: false,
            line: i
          };
        } else if (!isSecondary && monitorCount === 0) {
          return {
            value: activeMatch[1].trim(),
            isCommented: false,
            line: i
          };
        }
        monitorCount++;
      }
    }
    
    return null;
  }

  private updateEnvProperty(key: string, value: any, enabled: boolean): void {
    const existing = this.findEnvProperty(key);
    
    if (existing) {
      this.updateExistingEnvProperty(existing, key, value, enabled);
    } else {
      this.addNewEnvProperty(key, value, enabled);
    }
  }

  private updateMonitorProperty(monitorKey: 'monitor_primary' | 'monitor_secondary', value: any, enabled: boolean): void {
    const isSecondary = monitorKey === 'monitor_secondary';
    const existing = this.findMonitorProperty(isSecondary);
    
    if (existing) {
      this.updateExistingMonitorProperty(existing, value, enabled);
    } else {
      this.addNewMonitorProperty(value, enabled);
    }
  }

  private updateExistingEnvProperty(existing: { line: number; isCommented: boolean }, key: string, value: any, enabled: boolean): void {
    const lines = this.currentContent.split('\n');
    const line = lines[existing.line];
    
    if (!line) return;
    
    if (enabled) {
      // Uncomment and update value
      const newLine = line.replace(/^\s*#\s*/, '').replace(/=\s*[^,]*,.*/, `= ${key},${value}`);
      lines[existing.line] = newLine;
    } else {
      // Comment out
      if (!existing.isCommented) {
        lines[existing.line] = '# ' + line.trim();
      }
    }
    
    this.currentContent = lines.join('\n');
  }

  private updateExistingMonitorProperty(existing: { line: number; isCommented: boolean }, value: any, enabled: boolean): void {
    const lines = this.currentContent.split('\n');
    const line = lines[existing.line];
    
    if (!line) return;
    
    if (enabled) {
      // Uncomment and update value
      const newLine = line.replace(/^\s*#\s*/, '').replace(/=\s*.*/, `= ${value}`);
      lines[existing.line] = newLine;
    } else {
      // Comment out
      if (!existing.isCommented) {
        lines[existing.line] = '# ' + line.trim();
      }
    }
    
    this.currentContent = lines.join('\n');
  }

  private addNewEnvProperty(key: string, value: any, enabled: boolean): void {
    const lines = this.currentContent.split('\n');
    const prefix = enabled ? '' : '# ';
    const newLine = `${prefix}env = ${key},${value}`;
    
    // Add at the beginning with other env vars
    let insertIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i]?.match(/^\s*(#\s*)?env\s*=/)) {
        insertIndex = i + 1;
      } else if (insertIndex > 0) {
        break;
      }
    }
    
    lines.splice(insertIndex, 0, newLine);
    this.currentContent = lines.join('\n');
  }

  private addNewMonitorProperty(value: any, enabled: boolean): void {
    const lines = this.currentContent.split('\n');
    const prefix = enabled ? '' : '# ';
    const newLine = `${prefix}monitor=${value}`;
    
    // Add after existing monitor lines
    let insertIndex = lines.length;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i]?.match(/^\s*(#\s*)?monitor\s*=/)) {
        insertIndex = i + 1;
      }
    }
    
    lines.splice(insertIndex, 0, newLine);
    this.currentContent = lines.join('\n');
  }

  serialize(): string {
    return this.currentContent;
  }

  getOriginalContent(): string {
    return this.originalContent;
  }

  restoreOriginal(): void {
    this.currentContent = this.originalContent;
  }

  // Simple validation
  static validateSettings(settings: Partial<SimpleDisplaySettings>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (settings.gdk_scale && settings.gdk_scale.value) {
      const scale = parseFloat(settings.gdk_scale.value);
      if (isNaN(scale) || scale <= 0 || scale > 4) {
        errors.push('GDK_SCALE must be a positive number between 0 and 4');
      }
    }

    if (settings.monitor_primary && settings.monitor_primary.value) {
      if (!settings.monitor_primary.value.includes(',')) {
        errors.push('Monitor configuration must follow format: port,resolution,position,scale');
      }
    }

    if (settings.monitor_secondary && settings.monitor_secondary.value) {
      if (!settings.monitor_secondary.value.includes(',')) {
        errors.push('Monitor configuration must follow format: port,resolution,position,scale');
      }
    }

    return { valid: errors.length === 0, errors };
  }
}