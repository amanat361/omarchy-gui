// Config backup and restore system
export interface ConfigBackup {
  filePath: string;
  originalContent: string;
  timestamp: number;
  changes: ConfigChange[];
}

export interface ConfigChange {
  property: string;
  oldValue: any;
  newValue: any;
  wasCommented: boolean;
  isCommented: boolean;
  timestamp: number;
}

export interface PropertyState {
  value: any;
  isEnabled: boolean;
  originalValue?: any;
  wasOriginallyEnabled?: boolean;
}

export class ConfigBackupManager {
  private backups = new Map<string, ConfigBackup>();
  private propertyStates = new Map<string, Map<string, PropertyState>>();
  private storageKey = 'omarchy-config-backups';

  constructor() {
    this.loadFromStorage();
  }

  // Create a backup of the original config
  createBackup(filePath: string, content: string): void {
    const backup: ConfigBackup = {
      filePath,
      originalContent: content,
      timestamp: Date.now(),
      changes: []
    };
    
    this.backups.set(filePath, backup);
    this.saveToStorage();
  }

  // Track a property change
  trackChange(filePath: string, property: string, oldValue: any, newValue: any, wasCommented: boolean, isCommented: boolean): void {
    const backup = this.backups.get(filePath);
    if (!backup) return;

    const change: ConfigChange = {
      property,
      oldValue,
      newValue,
      wasCommented,
      isCommented,
      timestamp: Date.now()
    };

    backup.changes.push(change);
    this.saveToStorage();
  }

  // Set initial property state
  setPropertyState(filePath: string, property: string, value: any, isEnabled: boolean): void {
    if (!this.propertyStates.has(filePath)) {
      this.propertyStates.set(filePath, new Map());
    }

    const fileStates = this.propertyStates.get(filePath)!;
    const existing = fileStates.get(property);

    if (!existing) {
      fileStates.set(property, {
        value,
        isEnabled,
        originalValue: value,
        wasOriginallyEnabled: isEnabled
      });
    } else {
      // Update current state but preserve original
      existing.value = value;
      existing.isEnabled = isEnabled;
    }

    this.saveToStorage();
  }

  // Update property state
  updatePropertyState(filePath: string, property: string, value: any, isEnabled: boolean): void {
    const fileStates = this.propertyStates.get(filePath);
    if (!fileStates) return;

    const state = fileStates.get(property);
    if (!state) return;

    // Track the change
    this.trackChange(filePath, property, state.value, value, !state.isEnabled, !isEnabled);

    state.value = value;
    state.isEnabled = isEnabled;
    this.saveToStorage();
  }

  // Get property state
  getPropertyState(filePath: string, property: string): PropertyState | null {
    const fileStates = this.propertyStates.get(filePath);
    return fileStates?.get(property) || null;
  }

  // Check if property has been modified from original
  isPropertyModified(filePath: string, property: string): boolean {
    const state = this.getPropertyState(filePath, property);
    if (!state) return false;

    return state.value !== state.originalValue || state.isEnabled !== state.wasOriginallyEnabled;
  }

  // Restore property to original state
  restoreProperty(filePath: string, property: string): { value: any; isEnabled: boolean } | null {
    const state = this.getPropertyState(filePath, property);
    if (!state || (!state.originalValue && state.wasOriginallyEnabled === undefined)) return null;

    return {
      value: state.originalValue,
      isEnabled: state.wasOriginallyEnabled ?? true
    };
  }

  // Restore entire file to original state
  restoreFile(filePath: string): string | null {
    const backup = this.backups.get(filePath);
    return backup?.originalContent || null;
  }

  // Get all changes for a file
  getChanges(filePath: string): ConfigChange[] {
    const backup = this.backups.get(filePath);
    return backup?.changes || [];
  }

  // Clear backup for a file
  clearBackup(filePath: string): void {
    this.backups.delete(filePath);
    this.propertyStates.delete(filePath);
    this.saveToStorage();
  }

  // Get all modified properties for a file
  getModifiedProperties(filePath: string): string[] {
    const fileStates = this.propertyStates.get(filePath);
    if (!fileStates) return [];

    const modified: string[] = [];
    for (const [property, state] of fileStates) {
      if (this.isPropertyModified(filePath, property)) {
        modified.push(property);
      }
    }
    return modified;
  }

  // Save to localStorage
  private saveToStorage(): void {
    try {
      const data = {
        backups: Array.from(this.backups.entries()),
        propertyStates: Array.from(this.propertyStates.entries()).map(([filePath, states]) => [
          filePath,
          Array.from(states.entries())
        ])
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save config backups to localStorage:', error);
    }
  }

  // Load from localStorage
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return;

      const data = JSON.parse(stored);
      
      this.backups = new Map(data.backups || []);
      
      this.propertyStates = new Map();
      if (data.propertyStates) {
        for (const [filePath, states] of data.propertyStates) {
          this.propertyStates.set(filePath, new Map(states));
        }
      }
    } catch (error) {
      console.warn('Failed to load config backups from localStorage:', error);
    }
  }

  // Utility: Get summary of changes
  getChangeSummary(filePath: string): { modified: number; enabled: number; disabled: number } {
    const fileStates = this.propertyStates.get(filePath);
    if (!fileStates) return { modified: 0, enabled: 0, disabled: 0 };

    let modified = 0;
    let enabled = 0;
    let disabled = 0;

    for (const [property, state] of fileStates) {
      if (this.isPropertyModified(filePath, property)) {
        modified++;
        
        if (state.isEnabled && !state.wasOriginallyEnabled) {
          enabled++;
        } else if (!state.isEnabled && state.wasOriginallyEnabled) {
          disabled++;
        }
      }
    }

    return { modified, enabled, disabled };
  }
}