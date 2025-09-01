// Robust Hyprland Config Parser
// Handles comments, nested blocks, edge cases, and preserves formatting

export interface ParsedComment {
  type: 'comment';
  content: string;
  line: number;
}

export interface ParsedProperty {
  type: 'property';
  key: string;
  value: string | number | boolean;
  comment?: string;
  line: number;
  isCommented?: boolean; // If the property is commented out
}

export interface ParsedCommentedProperty {
  type: 'commented-property';
  key: string;
  value: string | number | boolean;
  comment?: string;
  line: number;
}

export interface ParsedBlock {
  type: 'block';
  name: string;
  properties: (ParsedProperty | ParsedCommentedProperty | ParsedComment | ParsedBlock)[];
  line: number;
}

export interface ParsedConfig {
  type: 'root';
  properties: (ParsedProperty | ParsedCommentedProperty | ParsedComment | ParsedBlock)[];
}

export type ParsedNode = ParsedProperty | ParsedCommentedProperty | ParsedComment | ParsedBlock | ParsedConfig;

enum TokenType {
  IDENTIFIER = 'IDENTIFIER',
  EQUALS = 'EQUALS',
  LBRACE = 'LBRACE',
  RBRACE = 'RBRACE',
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  COMMENT = 'COMMENT',
  NEWLINE = 'NEWLINE',
  EOF = 'EOF',
}

interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

export class HyprlandConfigParser {
  private tokens: Token[] = [];
  private current = 0;
  private line = 1;
  private column = 1;

  static parse(content: string): ParsedConfig {
    const parser = new HyprlandConfigParser();
    return parser.parseConfig(content);
  }

  static serialize(config: ParsedConfig, preserveComments = true): string {
    return this.serializeNode(config, 0, preserveComments);
  }

  private parseConfig(content: string): ParsedConfig {
    this.tokenize(content);
    return this.parseRoot();
  }

  private tokenize(content: string): void {
    this.tokens = [];
    this.current = 0;
    this.line = 1;
    this.column = 1;

    let i = 0;
    while (i < content.length) {
      const char = content[i];
      const startLine = this.line;
      const startColumn = this.column;

      // Skip whitespace (except newlines)
      if (char === ' ' || char === '\t' || char === '\r') {
        this.advance();
        i++;
        continue;
      }

      // Newlines
      if (char === '\n') {
        this.tokens.push({
          type: TokenType.NEWLINE,
          value: '\n',
          line: startLine,
          column: startColumn
        });
        this.line++;
        this.column = 1;
        i++;
        continue;
      }

      // Comments
      if (char === '#') {
        let comment = '';
        i++; // Skip #
        while (i < content.length && content[i] !== '\n') {
          comment += content[i];
          i++;
        }
        
        // Check if this looks like a commented property (has = sign)
        const commentText = comment.trim();
        if (commentText.includes('=')) {
          this.tokens.push({
            type: TokenType.COMMENT,
            value: commentText,
            line: startLine,
            column: startColumn
          });
        } else {
          this.tokens.push({
            type: TokenType.COMMENT,
            value: commentText,
            line: startLine,
            column: startColumn
          });
        }
        
        this.column += comment.length + 1;
        continue;
      }

      // Braces
      if (char === '{') {
        this.tokens.push({
          type: TokenType.LBRACE,
          value: '{',
          line: startLine,
          column: startColumn
        });
        this.advance();
        i++;
        continue;
      }

      if (char === '}') {
        this.tokens.push({
          type: TokenType.RBRACE,
          value: '}',
          line: startLine,
          column: startColumn
        });
        this.advance();
        i++;
        continue;
      }

      // Equals
      if (char === '=') {
        this.tokens.push({
          type: TokenType.EQUALS,
          value: '=',
          line: startLine,
          column: startColumn
        });
        this.advance();
        i++;
        continue;
      }

      // Strings (handle quoted and unquoted)
      if (char === '"' || char === "'") {
        const quote = char;
        let value = '';
        i++; // Skip opening quote
        this.advance();
        
        while (i < content.length && content[i] !== quote) {
          if (content[i] === '\\' && i + 1 < content.length) {
            // Handle escape sequences
            i++;
            this.advance();
            value += content[i];
          } else {
            value += content[i];
          }
          if (content[i] === '\n') {
            this.line++;
            this.column = 1;
          } else {
            this.advance();
          }
          i++;
        }
        
        if (i < content.length) {
          i++; // Skip closing quote
          this.advance();
        }
        
        this.tokens.push({
          type: TokenType.STRING,
          value,
          line: startLine,
          column: startColumn
        });
        continue;
      }

      // Numbers, booleans, and identifiers
      if (this.isAlphaNumeric(char) || char === '-' || char === '.') {
        let value = '';
        while (i < content.length && 
               (this.isAlphaNumeric(content[i]) || 
                content[i] === '-' || 
                content[i] === '.' || 
                content[i] === '_' || 
                content[i] === ':')) {
          value += content[i];
          this.advance();
          i++;
        }

        // Determine token type
        let tokenType = TokenType.IDENTIFIER;
        if (value === 'true' || value === 'false') {
          tokenType = TokenType.BOOLEAN;
        } else if (!isNaN(Number(value)) && value !== '') {
          tokenType = TokenType.NUMBER;
        }

        this.tokens.push({
          type: tokenType,
          value,
          line: startLine,
          column: startColumn
        });
        continue;
      }

      // Unknown character - treat as part of identifier/value
      let value = '';
      while (i < content.length && 
             content[i] !== ' ' && 
             content[i] !== '\t' && 
             content[i] !== '\n' && 
             content[i] !== '\r' && 
             content[i] !== '=' && 
             content[i] !== '{' && 
             content[i] !== '}' && 
             content[i] !== '#') {
        value += content[i];
        this.advance();
        i++;
      }

      if (value) {
        this.tokens.push({
          type: TokenType.IDENTIFIER,
          value,
          line: startLine,
          column: startColumn
        });
      }
    }

    this.tokens.push({
      type: TokenType.EOF,
      value: '',
      line: this.line,
      column: this.column
    });
  }

  private advance(): void {
    this.column++;
  }

  private isAlphaNumeric(char: string): boolean {
    return /[a-zA-Z0-9]/.test(char);
  }

  private parseRoot(): ParsedConfig {
    const properties: (ParsedProperty | ParsedComment | ParsedBlock)[] = [];
    
    while (!this.isAtEnd()) {
      this.skipNewlines();
      
      if (this.isAtEnd()) break;
      
      const node = this.parseStatement();
      if (node) {
        properties.push(node);
      }
    }

    return {
      type: 'root',
      properties
    };
  }

  private parseStatement(): ParsedProperty | ParsedCommentedProperty | ParsedComment | ParsedBlock | null {
    if (this.check(TokenType.COMMENT)) {
      return this.parseCommentOrCommentedProperty();
    }

    if (this.check(TokenType.IDENTIFIER)) {
      return this.parsePropertyOrBlock();
    }

    // Skip unknown tokens
    this.advance();
    return null;
  }

  private parseCommentOrCommentedProperty(): ParsedComment | ParsedCommentedProperty {
    const token = this.consume(TokenType.COMMENT, 'Expected comment');
    
    // Check if this is a commented property (contains =)
    if (token.value.includes('=')) {
      return this.parseCommentedProperty(token);
    }
    
    return {
      type: 'comment',
      content: token.value,
      line: token.line
    };
  }

  private parseCommentedProperty(commentToken: Token): ParsedCommentedProperty {
    const content = commentToken.value.trim();
    const parts = content.split('=', 2);
    
    if (parts.length !== 2) {
      // Fallback to regular comment if parsing fails
      return {
        type: 'comment',
        content: commentToken.value,
        line: commentToken.line
      } as any;
    }
    
    const key = parts[0].trim();
    let valueAndComment = parts[1].trim();
    let value: string | number | boolean = valueAndComment;
    let comment: string | undefined;
    
    // Check for additional comment after the value
    const commentMatch = valueAndComment.match(/^([^#]*)(#(.*))?$/);
    if (commentMatch) {
      value = commentMatch[1].trim();
      comment = commentMatch[3]?.trim();
    }
    
    // Parse value type
    if (value === 'true' || value === 'false') {
      value = value === 'true';
    } else if (!isNaN(Number(value)) && value !== '') {
      value = Number(value);
    }
    
    return {
      type: 'commented-property',
      key,
      value,
      comment,
      line: commentToken.line
    };
  }

  private parsePropertyOrBlock(): ParsedProperty | ParsedBlock {
    const nameToken = this.consume(TokenType.IDENTIFIER, 'Expected identifier');
    
    if (this.check(TokenType.LBRACE)) {
      return this.parseBlock(nameToken);
    } else {
      return this.parseProperty(nameToken);
    }
  }

  private parseProperty(keyToken: Token): ParsedProperty {
    this.consume(TokenType.EQUALS, 'Expected = after property name');
    
    let value: string | number | boolean = '';
    let comment: string | undefined;
    
    // Parse value
    if (this.check(TokenType.STRING)) {
      value = this.advance().value;
    } else if (this.check(TokenType.NUMBER)) {
      value = Number(this.advance().value);
    } else if (this.check(TokenType.BOOLEAN)) {
      value = this.advance().value === 'true';
    } else if (this.check(TokenType.IDENTIFIER)) {
      value = this.advance().value;
    }

    // Check for inline comment
    if (this.check(TokenType.COMMENT)) {
      comment = this.advance().value;
    }

    return {
      type: 'property',
      key: keyToken.value,
      value,
      comment,
      line: keyToken.line
    };
  }

  private parseBlock(nameToken: Token): ParsedBlock {
    this.consume(TokenType.LBRACE, 'Expected { after block name');
    
    const properties: (ParsedProperty | ParsedComment | ParsedBlock)[] = [];
    
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      this.skipNewlines();
      
      if (this.check(TokenType.RBRACE)) break;
      
      const node = this.parseStatement();
      if (node) {
        properties.push(node);
      }
    }
    
    this.consume(TokenType.RBRACE, 'Expected } after block content');
    
    return {
      type: 'block',
      name: nameToken.value,
      properties,
      line: nameToken.line
    };
  }

  private skipNewlines(): void {
    while (this.check(TokenType.NEWLINE)) {
      this.advance();
    }
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    
    const current = this.peek();
    throw new Error(`${message} at line ${current.line}, column ${current.column}. Got ${current.type}: "${current.value}"`);
  }

  private static serializeNode(node: ParsedNode, indent = 0, preserveComments = true): string {
    const indentStr = '  '.repeat(indent);
    
    switch (node.type) {
      case 'root':
        return node.properties
          .map(prop => this.serializeNode(prop, indent, preserveComments))
          .filter(Boolean)
          .join('\n') + '\n';
      
      case 'comment':
        return preserveComments ? `${indentStr}# ${node.content}` : '';
      
      case 'property':
        const comment = preserveComments && node.comment ? ` # ${node.comment}` : '';
        return `${indentStr}${node.key} = ${node.value}${comment}`;
      
      case 'commented-property':
        const commentedComment = preserveComments && node.comment ? ` # ${node.comment}` : '';
        return `${indentStr}# ${node.key} = ${node.value}${commentedComment}`;
      
      case 'block':
        const blockContent = node.properties
          .map(prop => this.serializeNode(prop, indent + 1, preserveComments))
          .filter(Boolean)
          .join('\n');
        
        return `${indentStr}${node.name} {\n${blockContent}\n${indentStr}}`;
      
      default:
        return '';
    }
  }

  // Helper methods for finding and updating specific blocks/properties
  static findBlock(config: ParsedConfig, blockName: string): ParsedBlock | null {
    for (const prop of config.properties) {
      if (prop.type === 'block' && prop.name === blockName) {
        return prop;
      }
    }
    return null;
  }

  static findProperty(block: ParsedBlock, propertyName: string): ParsedProperty | null {
    for (const prop of block.properties) {
      if (prop.type === 'property' && prop.key === propertyName) {
        return prop;
      }
    }
    return null;
  }

  static findCommentedProperty(block: ParsedBlock, propertyName: string): ParsedCommentedProperty | null {
    for (const prop of block.properties) {
      if (prop.type === 'commented-property' && prop.key === propertyName) {
        return prop;
      }
    }
    return null;
  }

  static findPropertyOrCommented(block: ParsedBlock, propertyName: string): { 
    property: ParsedProperty | null, 
    commented: ParsedCommentedProperty | null,
    isCommented: boolean 
  } {
    const property = this.findProperty(block, propertyName);
    const commented = this.findCommentedProperty(block, propertyName);
    
    return {
      property,
      commented,
      isCommented: !!commented && !property
    };
  }

  static updateOrAddProperty(block: ParsedBlock, key: string, value: string | number | boolean): void {
    const existing = this.findProperty(block, key);
    if (existing) {
      existing.value = value;
    } else {
      block.properties.push({
        type: 'property',
        key,
        value,
        line: -1 // Will be recalculated on serialize
      });
    }
  }

  static togglePropertyComment(block: ParsedBlock, key: string, value?: string | number | boolean): void {
    const result = this.findPropertyOrCommented(block, key);
    
    if (result.property) {
      // Convert active property to commented
      const index = block.properties.indexOf(result.property);
      const commentedProperty: ParsedCommentedProperty = {
        type: 'commented-property',
        key: result.property.key,
        value: result.property.value,
        comment: result.property.comment,
        line: result.property.line
      };
      block.properties[index] = commentedProperty;
    } else if (result.commented) {
      // Convert commented property to active
      const index = block.properties.indexOf(result.commented);
      const activeProperty: ParsedProperty = {
        type: 'property',
        key: result.commented.key,
        value: value !== undefined ? value : result.commented.value,
        comment: result.commented.comment,
        line: result.commented.line
      };
      block.properties[index] = activeProperty;
    } else if (value !== undefined) {
      // Create new property
      block.properties.push({
        type: 'property',
        key,
        value,
        line: -1
      });
    }
  }

  static setPropertyEnabled(block: ParsedBlock, key: string, enabled: boolean, value?: string | number | boolean): void {
    const result = this.findPropertyOrCommented(block, key);
    
    if (enabled) {
      if (result.commented) {
        // Uncomment the property
        this.togglePropertyComment(block, key, value);
      } else if (!result.property && value !== undefined) {
        // Create new property
        this.updateOrAddProperty(block, key, value);
      } else if (result.property && value !== undefined) {
        // Update existing property
        result.property.value = value;
      }
    } else {
      if (result.property) {
        // Comment out the property
        this.togglePropertyComment(block, key);
      }
    }
  }

  static ensureBlock(config: ParsedConfig, blockName: string): ParsedBlock {
    let block = this.findBlock(config, blockName);
    if (!block) {
      block = {
        type: 'block',
        name: blockName,
        properties: [],
        line: -1
      };
      config.properties.push(block);
    }
    return block;
  }
}