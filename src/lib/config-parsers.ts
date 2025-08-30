export interface InputConfig {
  kb_layout?: string;
  kb_options?: string;
  repeat_rate?: number;
  repeat_delay?: number;
  sensitivity?: number;
  touchpad?: {
    natural_scroll?: boolean;
    clickfinger_behavior?: boolean;
    scroll_factor?: number;
  };
}

export class HyprlandInputParser {
  static parseInputBlock(content: string): InputConfig {
    const config: InputConfig = {};
    
    // Find the input block
    const inputMatch = content.match(/input\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/s);
    if (!inputMatch || !inputMatch[1]) return config;
    
    const inputBlock = inputMatch[1];
    
    // Parse simple key-value pairs
    const parseStringValue = (key: string): string | undefined => {
      const regex = new RegExp(`${key}\\s*=\\s*([^\\n#]+)`, 'i');
      const match = inputBlock.match(regex);
      return match ? match[1].trim() : undefined;
    };
    
    const parseNumberValue = (key: string): number | undefined => {
      const regex = new RegExp(`${key}\\s*=\\s*([^\\n#]+)`, 'i');
      const match = inputBlock.match(regex);
      if (match) {
        const numValue = parseFloat(match[1].trim());
        return isNaN(numValue) ? undefined : numValue;
      }
      return undefined;
    };
    
    config.kb_layout = parseStringValue('kb_layout');
    config.kb_options = parseStringValue('kb_options');
    config.repeat_rate = parseNumberValue('repeat_rate');
    config.repeat_delay = parseNumberValue('repeat_delay');
    config.sensitivity = parseNumberValue('sensitivity');
    
    // Parse touchpad block
    const touchpadMatch = inputBlock.match(/touchpad\s*\{([^}]*)\}/s);
    if (touchpadMatch && touchpadMatch[1]) {
      const touchpadBlock = touchpadMatch[1];
      config.touchpad = {};
      
      // Parse boolean values
      const parseBool = (key: string): boolean | undefined => {
        const regex = new RegExp(`${key}\\s*=\\s*(true|false)`, 'i');
        const match = touchpadBlock.match(regex);
        return match ? match[1].toLowerCase() === 'true' : undefined;
      };
      
      config.touchpad.natural_scroll = parseBool('natural_scroll');
      config.touchpad.clickfinger_behavior = parseBool('clickfinger_behavior');
      
      // Parse scroll_factor
      const scrollFactorMatch = touchpadBlock.match(/scroll_factor\s*=\s*([0-9.]+)/i);
      if (scrollFactorMatch) {
        config.touchpad.scroll_factor = parseFloat(scrollFactorMatch[1]);
      }
    }
    
    return config;
  }
  
  static updateInputBlock(content: string, newConfig: Partial<InputConfig>): string {
    let result = content;
    
    // Find or create input block
    const inputMatch = content.match(/input\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/s);
    if (!inputMatch || !inputMatch[1]) {
      // Create new input block if it doesn't exist
      const newInputBlock = this.generateInputBlock(newConfig);
      return content + '\n\n' + newInputBlock;
    }
    
    let inputBlock = inputMatch[1];
    
    // Update simple values
    const updateStringValue = (key: string, value: string | undefined) => {
      if (value === undefined) return;
      
      const regex = new RegExp(`(\\s*${key}\\s*=\\s*)[^\\n#]+`, 'gi');
      const replacement = `$1${value}`;
      
      if (inputBlock.match(regex)) {
        inputBlock = inputBlock.replace(regex, replacement);
      } else {
        inputBlock = `  ${key} = ${value}\n` + inputBlock;
      }
    };
    
    const updateNumberValue = (key: string, value: number | undefined) => {
      if (value === undefined) return;
      
      const regex = new RegExp(`(\\s*${key}\\s*=\\s*)[^\\n#]+`, 'gi');
      const replacement = `$1${value}`;
      
      if (inputBlock.match(regex)) {
        inputBlock = inputBlock.replace(regex, replacement);
      } else {
        inputBlock = `  ${key} = ${value}\n` + inputBlock;
      }
    };
    
    updateStringValue('kb_layout', newConfig.kb_layout);
    updateStringValue('kb_options', newConfig.kb_options);
    updateNumberValue('repeat_rate', newConfig.repeat_rate);
    updateNumberValue('repeat_delay', newConfig.repeat_delay);
    updateNumberValue('sensitivity', newConfig.sensitivity);
    
    // Handle touchpad block
    if (newConfig.touchpad) {
      const touchpadMatch = inputBlock.match(/touchpad\s*\{([^}]*)\}/s);
      if (touchpadMatch && touchpadMatch[1]) {
        let touchpadBlock = touchpadMatch[1];
        
        const updateTouchpadValue = (key: string, value: boolean | number | undefined) => {
          if (value === undefined) return;
          
          const regex = new RegExp(`(\\s*${key}\\s*=\\s*)[^\\n#]+`, 'gi');
          const replacement = `$1${value}`;
          
          if (touchpadBlock.match(regex)) {
            touchpadBlock = touchpadBlock.replace(regex, replacement);
          } else {
            touchpadBlock = `    ${key} = ${value}\n` + touchpadBlock;
          }
        };
        
        updateTouchpadValue('natural_scroll', newConfig.touchpad.natural_scroll);
        updateTouchpadValue('clickfinger_behavior', newConfig.touchpad.clickfinger_behavior);
        updateTouchpadValue('scroll_factor', newConfig.touchpad.scroll_factor);
        
        inputBlock = inputBlock.replace(/touchpad\s*\{[^}]*\}/s, `touchpad {\n${touchpadBlock}  }`);
      } else {
        // Create touchpad block if it doesn't exist
        const touchpadBlock = this.generateTouchpadBlock(newConfig.touchpad);
        inputBlock += '\n  ' + touchpadBlock;
      }
    }
    
    // Replace the input block in the full content
    result = content.replace(/input\s*\{[^}]*(?:\{[^}]*\}[^}]*)*\}/s, `input {\n${inputBlock}}`);
    
    return result;
  }
  
  private static generateInputBlock(config: Partial<InputConfig>): string {
    let block = 'input {\n';
    
    if (config.kb_layout) block += `  kb_layout = ${config.kb_layout}\n`;
    if (config.kb_options) block += `  kb_options = ${config.kb_options}\n`;
    if (config.repeat_rate !== undefined) block += `  repeat_rate = ${config.repeat_rate}\n`;
    if (config.repeat_delay !== undefined) block += `  repeat_delay = ${config.repeat_delay}\n`;
    if (config.sensitivity !== undefined) block += `  sensitivity = ${config.sensitivity}\n`;
    
    if (config.touchpad) {
      block += '\n' + this.generateTouchpadBlock(config.touchpad, '  ');
    }
    
    block += '}';
    return block;
  }
  
  private static generateTouchpadBlock(touchpad: NonNullable<InputConfig['touchpad']>, indent = ''): string {
    let block = `${indent}touchpad {\n`;
    
    if (touchpad.natural_scroll !== undefined) {
      block += `${indent}  natural_scroll = ${touchpad.natural_scroll}\n`;
    }
    if (touchpad.clickfinger_behavior !== undefined) {
      block += `${indent}  clickfinger_behavior = ${touchpad.clickfinger_behavior}\n`;
    }
    if (touchpad.scroll_factor !== undefined) {
      block += `${indent}  scroll_factor = ${touchpad.scroll_factor}\n`;
    }
    
    block += `${indent}}`;
    return block;
  }
}