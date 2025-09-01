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
    // Helper function to find matching braces
    const findMatchingBrace = (text: string, start: number): number => {
      let depth = 0;
      for (let i = start; i < text.length; i++) {
        if (text[i] === '{') depth++;
        if (text[i] === '}') {
          depth--;
          if (depth === 0) return i;
        }
      }
      return -1;
    };

    // Find the input block more carefully
    const inputStart = content.search(/input\s*\{/);
    if (inputStart === -1) {
      // Create new input block if it doesn't exist
      const newInputBlock = this.generateInputBlock(newConfig);
      return content + '\n\n' + newInputBlock;
    }

    const braceStart = content.indexOf('{', inputStart);
    const braceEnd = findMatchingBrace(content, braceStart);
    
    if (braceEnd === -1) {
      throw new Error('Malformed input block - missing closing brace');
    }

    const inputBlock = content.substring(braceStart + 1, braceEnd);
    let modifiedInputBlock = inputBlock;

    // Update simple values
    const updateValue = (key: string, value: string | number | undefined) => {
      if (value === undefined) return;
      
      const regex = new RegExp(`(\\s*${key}\\s*=\\s*)[^\\n#]*`, 'gm');
      const replacement = `$1${value}`;
      
      if (modifiedInputBlock.match(regex)) {
        modifiedInputBlock = modifiedInputBlock.replace(regex, replacement);
      } else {
        // Add new value at the beginning of the block
        modifiedInputBlock = `  ${key} = ${value}\n` + modifiedInputBlock;
      }
    };

    updateValue('kb_layout', newConfig.kb_layout);
    updateValue('kb_options', newConfig.kb_options);
    updateValue('repeat_rate', newConfig.repeat_rate);
    updateValue('repeat_delay', newConfig.repeat_delay);
    updateValue('sensitivity', newConfig.sensitivity);

    // Handle touchpad block
    if (newConfig.touchpad) {
      const touchpadStart = modifiedInputBlock.search(/touchpad\s*\{/);
      if (touchpadStart !== -1) {
        // Find the touchpad block
        const touchpadBraceStart = modifiedInputBlock.indexOf('{', touchpadStart);
        const touchpadBraceEnd = findMatchingBrace(modifiedInputBlock, touchpadBraceStart);
        
        if (touchpadBraceEnd !== -1) {
          let touchpadBlock = modifiedInputBlock.substring(touchpadBraceStart + 1, touchpadBraceEnd);
          
          const updateTouchpadValue = (key: string, value: boolean | number | undefined) => {
            if (value === undefined) return;
            
            const regex = new RegExp(`(\\s*${key}\\s*=\\s*)[^\\n#]*`, 'gm');
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
          
          // Replace the touchpad block
          const beforeTouchpad = modifiedInputBlock.substring(0, touchpadStart);
          const afterTouchpadBlock = modifiedInputBlock.substring(touchpadBraceEnd + 1);
          modifiedInputBlock = beforeTouchpad + `touchpad {${touchpadBlock}  }` + afterTouchpadBlock;
        }
      } else {
        // Create touchpad block if it doesn't exist
        const touchpadBlock = this.generateTouchpadBlock(newConfig.touchpad, '  ');
        modifiedInputBlock += '\n  ' + touchpadBlock;
      }
    }

    // Replace the entire input block in the content
    const beforeInput = content.substring(0, inputStart);
    const afterInput = content.substring(braceEnd + 1);
    
    return beforeInput + `input {${modifiedInputBlock}}` + afterInput;
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