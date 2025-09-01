// Simple regex-based input config handler
export interface SimpleInputSettings {
  sensitivity?: { value: number; enabled: boolean };
  natural_scroll?: { value: boolean; enabled: boolean };
  scroll_factor?: { value: number; enabled: boolean };
  repeat_rate?: { value: number; enabled: boolean };
  repeat_delay?: { value: number; enabled: boolean };
}

export class SimpleInputConfigManager {
  private originalContent: string;
  private currentContent: string;
  private filePath: string;

  constructor(configContent: string, filePath: string = '~/.config/hypr/input.conf') {
    this.originalContent = configContent;
    this.currentContent = configContent;
    this.filePath = filePath;
    
    // Store original in localStorage as backup
    localStorage.setItem(`omarchy-backup-${filePath}`, configContent);
  }

  getSettings(): SimpleInputSettings {
    const settings: SimpleInputSettings = {};
    
    // Parse all properties in a single pass for efficiency
    const lines = this.currentContent.split('\n');
    let inTouchpadBlock = false;
    
    // Pre-compile regexes for better performance
    const propertyRegex = /^\s*(\w+)\s*=\s*(.+?)(?:\s*#.*)?$/;
    const commentedPropertyRegex = /^\s*#\s*(\w+)\s*=\s*(.+?)(?:\s*#.*)?$/;
    const touchpadStartRegex = /^\s*touchpad\s*\{/;
    const blockEndRegex = /^\s*\}/;
    
    for (const line of lines) {
      // Check for touchpad block boundaries
      if (touchpadStartRegex.test(line)) {
        inTouchpadBlock = true;
        continue;
      }
      if (inTouchpadBlock && blockEndRegex.test(line)) {
        inTouchpadBlock = false;
        continue;
      }
      
      // Check for commented properties
      const commentedMatch = line.match(commentedPropertyRegex);
      if (commentedMatch) {
        const [, key, value] = commentedMatch;
        if (key && value !== undefined) {
          this.setSettingValue(settings, key, value.trim(), false, inTouchpadBlock);
        }
        continue;
      }
      
      // Check for active properties
      const activeMatch = line.match(propertyRegex);
      if (activeMatch) {
        const [, key, value] = activeMatch;
        if (key && value !== undefined) {
          this.setSettingValue(settings, key, value.trim(), true, inTouchpadBlock);
        }
      }
    }

    return settings;
  }
  
  private setSettingValue(settings: SimpleInputSettings, key: string, value: string, enabled: boolean, inTouchpadBlock: boolean): void {
    if (inTouchpadBlock) {
      if (key === 'natural_scroll') {
        settings.natural_scroll = { value: value === 'true', enabled };
      } else if (key === 'scroll_factor') {
        settings.scroll_factor = { value: parseFloat(value), enabled };
      }
    } else {
      if (key === 'sensitivity') {
        settings.sensitivity = { value: parseFloat(value), enabled };
      } else if (key === 'repeat_rate') {
        settings.repeat_rate = { value: parseInt(value), enabled };
      } else if (key === 'repeat_delay') {
        settings.repeat_delay = { value: parseInt(value), enabled };
      }
    }
  }

  updateSetting(key: keyof SimpleInputSettings, value: any, enabled: boolean): void {
    if (key === 'natural_scroll' || key === 'scroll_factor') {
      this.updateTouchpadProperty(key, value, enabled);
    } else {
      this.updateProperty(key, value, enabled);
    }
  }

  private findProperty(key: string): { value: string; isCommented: boolean; line: number } | null {
    const lines = this.currentContent.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for commented property: # key = value
      const commentedMatch = line.match(new RegExp(`^\\s*#\\s*${key}\\s*=\\s*(.+?)(?:\\s*#.*)?$`));
      if (commentedMatch && commentedMatch[1]) {
        return {
          value: commentedMatch[1].trim(),
          isCommented: true,
          line: i
        };
      }
      
      // Check for active property: key = value
      const activeMatch = line.match(new RegExp(`^\\s*${key}\\s*=\\s*(.+?)(?:\\s*#.*)?$`));
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

  private findTouchpadProperty(key: string): { value: string; isCommented: boolean; line: number } | null {
    const lines = this.currentContent.split('\n');
    let inTouchpadBlock = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if we're entering touchpad block
      if (line.match(/^\s*touchpad\s*\{/)) {
        inTouchpadBlock = true;
        continue;
      }
      
      // Check if we're leaving touchpad block
      if (inTouchpadBlock && line.match(/^\s*\}/)) {
        inTouchpadBlock = false;
        continue;
      }
      
      if (inTouchpadBlock) {
        // Check for commented property: # key = value
        const commentedMatch = line.match(new RegExp(`^\\s*#\\s*${key}\\s*=\\s*(.+?)(?:\\s*#.*)?$`));
        if (commentedMatch && commentedMatch[1]) {
          return {
            value: commentedMatch[1].trim(),
            isCommented: true,
            line: i
          };
        }
        
        // Check for active property: key = value
        const activeMatch = line.match(new RegExp(`^\\s*${key}\\s*=\\s*(.+?)(?:\\s*#.*)?$`));
        if (activeMatch && activeMatch[1]) {
          return {
            value: activeMatch[1].trim(),
            isCommented: false,
            line: i
          };
        }
      }
    }
    
    return null;
  }

  private updateProperty(key: string, value: any, enabled: boolean): void {
    const existing = this.findProperty(key);
    
    if (existing) {
      this.updateExistingProperty(existing, key, value, enabled);
    } else {
      this.addNewProperty(key, value, enabled);
    }
  }

  private updateTouchpadProperty(key: string, value: any, enabled: boolean): void {
    const existing = this.findTouchpadProperty(key);
    
    if (existing) {
      this.updateExistingProperty(existing, key, value, enabled);
    } else {
      this.addNewTouchpadProperty(key, value, enabled);
    }
  }

  private updateExistingProperty(existing: { line: number; isCommented: boolean }, key: string, value: any, enabled: boolean): void {
    const lines = this.currentContent.split('\n');
    const line = lines[existing.line];
    
    if (!line) return;
    
    if (enabled) {
      // Uncomment and update value
      const newLine = line.replace(/^\s*#\s*/, '  ').replace(/=\s*[^#]*/, `= ${value}`);
      lines[existing.line] = newLine;
    } else {
      // Comment out
      if (!existing.isCommented) {
        lines[existing.line] = '  # ' + line.trim();
      }
    }
    
    this.currentContent = lines.join('\n');
  }

  private addNewProperty(key: string, value: any, enabled: boolean): void {
    // Find input block and add property
    const lines = this.currentContent.split('\n');
    let inputBlockEnd = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i]?.match(/^input\s*\{/)) {
        // Find the end of input block
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j]?.match(/^\}/)) {
            inputBlockEnd = j;
            break;
          }
        }
        break;
      }
    }
    
    if (inputBlockEnd !== -1) {
      const prefix = enabled ? '  ' : '  # ';
      const newLine = `${prefix}${key} = ${value}`;
      lines.splice(inputBlockEnd, 0, newLine);
      this.currentContent = lines.join('\n');
    }
  }

  private addNewTouchpadProperty(key: string, value: any, enabled: boolean): void {
    // Find touchpad block and add property
    const lines = this.currentContent.split('\n');
    let touchpadBlockEnd = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i]?.match(/^\s*touchpad\s*\{/)) {
        // Find the end of touchpad block
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j]?.match(/^\s*\}/)) {
            touchpadBlockEnd = j;
            break;
          }
        }
        break;
      }
    }
    
    if (touchpadBlockEnd !== -1) {
      const prefix = enabled ? '    ' : '    # ';
      const newLine = `${prefix}${key} = ${value}`;
      lines.splice(touchpadBlockEnd, 0, newLine);
      this.currentContent = lines.join('\n');
    }
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
  static validateSettings(settings: Partial<SimpleInputSettings>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (settings.sensitivity && (settings.sensitivity.value < -2 || settings.sensitivity.value > 2)) {
      errors.push('Sensitivity must be between -2 and 2');
    }

    if (settings.scroll_factor && (settings.scroll_factor.value < 0.1 || settings.scroll_factor.value > 5)) {
      errors.push('Scroll factor must be between 0.1 and 5');
    }

    if (settings.repeat_rate && (settings.repeat_rate.value < 1 || settings.repeat_rate.value > 100)) {
      errors.push('Repeat rate must be between 1 and 100');
    }

    if (settings.repeat_delay && (settings.repeat_delay.value < 100 || settings.repeat_delay.value > 2000)) {
      errors.push('Repeat delay must be between 100 and 2000');
    }

    return { valid: errors.length === 0, errors };
  }
}