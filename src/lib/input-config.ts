// Input-specific config handler using the robust parser
import { HyprlandConfigParser, type ParsedConfig, type ParsedBlock } from './hyprland-parser';
import { ConfigBackupManager } from './config-backup';

export interface InputSettings {
  kb_layout?: { value: string; enabled: boolean };
  kb_options?: { value: string; enabled: boolean };
  repeat_rate?: { value: number; enabled: boolean };
  repeat_delay?: { value: number; enabled: boolean };
  sensitivity?: { value: number; enabled: boolean };
  touchpad?: {
    natural_scroll?: { value: boolean; enabled: boolean };
    clickfinger_behavior?: { value: boolean; enabled: boolean };
    scroll_factor?: { value: number; enabled: boolean };
  };
}

export class InputConfigManager {
  private config: ParsedConfig;
  private originalContent: string;
  private backupManager: ConfigBackupManager;
  private filePath: string;

  constructor(configContent: string, filePath: string = '~/.config/hypr/input.conf') {
    this.originalContent = configContent;
    this.filePath = filePath;
    this.config = HyprlandConfigParser.parse(configContent);
    this.backupManager = new ConfigBackupManager();
    
    // Create initial backup
    this.backupManager.createBackup(filePath, configContent);
    
    // Initialize property states
    this.initializePropertyStates();
  }

  private initializePropertyStates(): void {
    const inputBlock = HyprlandConfigParser.findBlock(this.config, 'input');
    if (!inputBlock) return;

    // Initialize top-level properties
    const properties = ['kb_layout', 'kb_options', 'repeat_rate', 'repeat_delay', 'sensitivity'];
    for (const key of properties) {
      const result = HyprlandConfigParser.findPropertyOrCommented(inputBlock, key);
      const value = result.property?.value || result.commented?.value;
      const enabled = !!result.property;
      
      if (value !== undefined) {
        this.backupManager.setPropertyState(this.filePath, key, value, enabled);
      }
    }

    // Initialize touchpad properties
    const touchpadBlock = this.findNestedBlock(inputBlock, 'touchpad');
    if (touchpadBlock) {
      const touchpadProps = ['natural_scroll', 'clickfinger_behavior', 'scroll_factor'];
      for (const key of touchpadProps) {
        const result = HyprlandConfigParser.findPropertyOrCommented(touchpadBlock, key);
        const value = result.property?.value || result.commented?.value;
        const enabled = !!result.property;
        
        if (value !== undefined) {
          this.backupManager.setPropertyState(this.filePath, `touchpad.${key}`, value, enabled);
        }
      }
    }
  }

  getSettings(): InputSettings {
    const inputBlock = HyprlandConfigParser.findBlock(this.config, 'input');
    if (!inputBlock) return {};

    const settings: InputSettings = {};
    
    // Parse top-level input properties
    const properties = [
      { key: 'kb_layout', type: 'string' },
      { key: 'kb_options', type: 'string' },
      { key: 'repeat_rate', type: 'number' },
      { key: 'repeat_delay', type: 'number' },
      { key: 'sensitivity', type: 'number' }
    ];

    for (const { key, type } of properties) {
      const result = HyprlandConfigParser.findPropertyOrCommented(inputBlock, key);
      if (result.property || result.commented) {
        const value = result.property?.value || result.commented?.value;
        const enabled = !!result.property;
        
        (settings as any)[key] = {
          value: type === 'number' ? Number(value) : String(value),
          enabled
        };
      }
    }

    // Parse touchpad block
    const touchpadBlock = this.findNestedBlock(inputBlock, 'touchpad');
    if (touchpadBlock) {
      settings.touchpad = {};
      
      const touchpadProps = [
        { key: 'natural_scroll', type: 'boolean' },
        { key: 'clickfinger_behavior', type: 'boolean' },
        { key: 'scroll_factor', type: 'number' }
      ];

      for (const { key, type } of touchpadProps) {
        const result = HyprlandConfigParser.findPropertyOrCommented(touchpadBlock, key);
        if (result.property || result.commented) {
          const value = result.property?.value || result.commented?.value;
          const enabled = !!result.property;
          
          (settings.touchpad as any)[key] = {
            value: type === 'boolean' ? Boolean(value) : (type === 'number' ? Number(value) : String(value)),
            enabled
          };
        }
      }
    }

    return settings;
  }

  updateSettings(newSettings: Partial<InputSettings>): void {
    // Ensure input block exists
    const inputBlock = HyprlandConfigParser.ensureBlock(this.config, 'input');

    // Update top-level properties
    const topLevelProps = [
      'kb_layout', 'kb_options', 'repeat_rate', 'repeat_delay', 'sensitivity'
    ] as const;

    for (const key of topLevelProps) {
      const setting = newSettings[key];
      if (setting !== undefined) {
        HyprlandConfigParser.setPropertyEnabled(inputBlock, key, setting.enabled, setting.value);
        this.backupManager.updatePropertyState(this.filePath, key, setting.value, setting.enabled);
      }
    }

    // Handle touchpad settings
    if (newSettings.touchpad) {
      let touchpadBlock = this.findNestedBlock(inputBlock, 'touchpad');
      
      if (!touchpadBlock) {
        touchpadBlock = {
          type: 'block',
          name: 'touchpad',
          properties: [],
          line: -1
        };
        inputBlock.properties.push(touchpadBlock);
      }

      const touchpadProps = [
        'natural_scroll', 'clickfinger_behavior', 'scroll_factor'
      ] as const;

      for (const key of touchpadProps) {
        const setting = (newSettings.touchpad as any)[key];
        if (setting !== undefined) {
          HyprlandConfigParser.setPropertyEnabled(touchpadBlock, key, setting.enabled, setting.value);
          this.backupManager.updatePropertyState(this.filePath, `touchpad.${key}`, setting.value, setting.enabled);
        }
      }
    }
  }

  serialize(preserveComments = true): string {
    return HyprlandConfigParser.serialize(this.config, preserveComments);
  }

  getOriginalContent(): string {
    return this.originalContent;
  }

  private findNestedBlock(parentBlock: ParsedBlock, blockName: string): ParsedBlock | null {
    for (const prop of parentBlock.properties) {
      if (prop.type === 'block' && prop.name === blockName) {
        return prop;
      }
    }
    return null;
  }

  // Utility method to validate settings
  static validateSettings(settings: Partial<InputSettings>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (settings.repeat_rate !== undefined) {
      if (settings.repeat_rate.value < 1 || settings.repeat_rate.value > 100) {
        errors.push('repeat_rate must be between 1 and 100');
      }
    }

    if (settings.repeat_delay !== undefined) {
      if (settings.repeat_delay.value < 100 || settings.repeat_delay.value > 2000) {
        errors.push('repeat_delay must be between 100 and 2000ms');
      }
    }

    if (settings.sensitivity !== undefined) {
      if (settings.sensitivity.value < -2 || settings.sensitivity.value > 2) {
        errors.push('sensitivity must be between -2 and 2');
      }
    }

    if (settings.touchpad?.scroll_factor !== undefined) {
      if (settings.touchpad.scroll_factor.value < 0.1 || settings.touchpad.scroll_factor.value > 5) {
        errors.push('scroll_factor must be between 0.1 and 5');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}