# Omarchy GUI Development Guide

This document explains the architecture and patterns used in the Omarchy GUI project to help future developers (human or AI) understand and extend the system to add new configuration pages.

## Architecture Overview

The Omarchy GUI is built with a simple but powerful architecture:

- **Frontend**: React 19 + TypeScript + TailwindCSS
- **Backend**: Bun runtime with direct file I/O
- **Config Parsing**: Simple regex-based parsers (not AST)
- **File Management**: Direct file editing with comprehensive backup system

## Project Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── AppMenu.tsx           # Sidebar navigation
│   │   └── MainContent.tsx       # Main content area with routing
│   └── ui/                       # Reusable UI components
├── lib/
│   ├── simple-input-config.ts    # Input-specific config parser
│   ├── config-backup.ts          # Backup management system  
│   └── hyprland-parser.ts        # Complex parser (deprecated)
└── index.tsx                     # Bun server with API routes
```

## How the Input Page Works

The input page serves as the reference implementation for all future config pages. Here's how it works:

### 1. Config Parser (`simple-input-config.ts`)

```typescript
export interface SimpleInputSettings {
  sensitivity?: { value: number; enabled: boolean };
  natural_scroll?: { value: boolean; enabled: boolean };
  // ... more properties
}

export class SimpleInputConfigManager {
  // Single-pass regex-based parsing for performance
  // Direct file content manipulation
  // Settings validation
}
```

**Key Features:**
- **Simple regex parsing** - Avoids complex AST parsing for reliability
- **Single-pass parsing** - Optimized for performance  
- **Property state tracking** - Each setting has `value` and `enabled` state
- **Direct content manipulation** - Modifies file content strings directly

### 2. UI Components (`MainContent.tsx`)

The UI follows this pattern:

```typescript
function InputContent() {
  // State management
  const [configManager, setConfigManager] = useState<SimpleInputConfigManager | null>(null);
  const [currentSettings, setCurrentSettings] = useState<SimpleInputSettings>({});
  const [backupInfo, setBackupInfo] = useState({backupCount: 0, hasOriginal: false});

  // File operations
  const fetchInputConfig = async () => { /* Load and parse file */ };
  const handleSave = async () => { /* Save with backup */ };
  const handleRevert = async () => { /* Revert from backup */ };
  
  // UI rendering with form controls
}
```

**UI Patterns:**
- **DEFAULT/CUSTOM badges** instead of ENABLED/DISABLED (better UX)
- **Conditional controls** - Only show value controls when enabled
- **Validation feedback** - Real-time validation with error messages
- **File operations panel** - Consistent save/revert interface

### 3. Backend API Routes (`index.tsx`)

Three main API endpoints:

```typescript
"/api/config-file": {
  GET: (req) => { /* Read config file */ },
  POST: (req) => { /* Write config file */ }
}

"/api/backup": {
  GET: (req) => { /* List backup info */ },
  POST: (req) => { /* Save/revert operations */ }
}

"/api/hyprctl": {
  POST: (req) => { /* Execute hyprctl commands */ }
}
```

## Adding a New Config Page (Example: Display)

To add a display page, follow this pattern:

### Step 1: Create Display Parser

```typescript
// src/lib/simple-display-config.ts
export interface SimpleDisplaySettings {
  monitor_resolution?: { value: string; enabled: boolean };
  monitor_refresh?: { value: number; enabled: boolean };
  // ...
}

export class SimpleDisplayConfigManager {
  // Copy pattern from SimpleInputConfigManager
  // Adjust regex patterns for display-specific syntax
  // Update validation rules for display values
}
```

### Step 2: Create Display UI Component

```typescript
// In MainContent.tsx
function DisplayContent() {
  // Copy InputContent structure
  // Replace SimpleInputConfigManager with SimpleDisplayConfigManager
  // Update filePath to '~/.config/hypr/monitors.conf' (or appropriate)
  // Adjust form controls for display-specific settings
  // Add link to https://wiki.hypr.land/Configuring/Monitors/
}
```

### Step 3: Wire Up Display Route

```typescript
// In MainContent.tsx renderCategoryContent()
switch (activeCategory) {
  case 'input':
    return <InputContent />;
  case 'display':
    return <DisplayContent />;
  case 'about':
    return <AboutContent />;
  // ...
}
```

## Key Patterns and Best Practices

### 1. Configuration Parsing Strategy

**✅ DO: Simple Regex-Based Parsing**
```typescript
// Fast, reliable, handles edge cases well
const propertyMatch = line.match(/^\s*(\w+)\s*=\s*(.+?)(?:\s*#.*)?$/);
```

**❌ DON'T: Complex AST Parsing**
```typescript
// Avoided due to complexity and error-proneness
// Original hyprland-parser.ts was too complex
```

### 2. State Management

**Property State Pattern:**
```typescript
interface PropertyState {
  value: any;           // Current value
  enabled: boolean;     // Whether property is active (uncommented)
}
```

**Backup State Pattern:**
```typescript
interface BackupInfo {
  backupCount: number;  // Number of timestamped backups
  hasOriginal: boolean; // Whether .original backup exists
}
```

### 3. File Operations

**Always use this sequence:**
1. **Validate** settings before saving
2. **Create backups** (original + timestamped)
3. **Write file** using `Bun.write()`
4. **Refresh Hyprland** for immediate effect
5. **Update UI state** to reflect changes

### 4. Error Handling

**Graceful degradation:**
```typescript
try {
  // File operation
} catch (error) {
  console.error('Operation failed:', error);
  setError(error instanceof Error ? error.message : 'Operation failed');
  // Don't crash, show user-friendly error
}
```

### 5. UI/UX Guidelines

**Form Controls:**
- Use DEFAULT/CUSTOM badges instead of enabled/disabled
- Show value controls only when property is enabled
- Provide real-time validation feedback
- Include links to relevant Hyprland documentation

**File Operations:**
- Always show backup status
- Provide easy revert options
- Show file locations and allow opening them
- Confirm destructive operations

## Reusable Components

These components can be extracted for reuse across config pages:

### 1. PropertyControl Component
```typescript
interface PropertyControlProps {
  label: string;
  value: any;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onValueChange: (value: any) => void;
  controlType: 'slider' | 'switch' | 'input';
  validation?: (value: any) => string | null;
  docsUrl?: string;
}
```

### 2. FileOperationsPanel Component
```typescript
interface FileOperationsPanelProps {
  filePath: string;
  backupInfo: BackupInfo;
  onSave: () => void;
  onRevert: () => void;
  saving: boolean;
}
```

### 3. ConfigSection Component
```typescript
interface ConfigSectionProps {
  title: string;
  description?: string;
  docsUrl?: string;
  children: React.ReactNode;
}
```

## Configuration File Patterns

Different Hyprland config files follow these patterns:

**Block-based (like input.conf):**
```bash
input {
    kb_layout = us
    sensitivity = 0.5
    
    touchpad {
        natural_scroll = true
    }
}
```

**Line-based (like monitors.conf):**
```bash
monitor=DP-1,1920x1080@60,0x0,1
monitor=HDMI-1,1920x1080@60,1920x0,1
```

**Variable-based:**
```bash
$terminal = alacritty
$fileManager = dolphin
```

Adjust regex patterns accordingly for each type.

## Testing Strategy

**Manual Testing Checklist:**
- [ ] File loads correctly on page load
- [ ] Settings can be toggled between DEFAULT and CUSTOM
- [ ] Value changes are reflected in UI immediately
- [ ] Save creates backups and writes file
- [ ] Revert operations work correctly
- [ ] Validation prevents invalid values
- [ ] Hyprland reload applies changes
- [ ] File/folder links open correctly
- [ ] Error states are handled gracefully

## Performance Considerations

1. **Single-pass parsing** - Parse entire file once, don't scan repeatedly
2. **Memoized computations** - Use `useMemo` for expensive operations
3. **Debounced updates** - Don't update on every keystroke
4. **Efficient re-renders** - Use proper React keys and state structure

## Security Considerations

1. **Path validation** - Ensure file paths are within expected directories
2. **Input sanitization** - Validate all user inputs before writing
3. **Backup integrity** - Verify backups before overwriting originals
4. **Permission checks** - Handle file permission errors gracefully

## Future Extensions

The architecture supports:
- Multiple config file types (monitors, workspaces, keybinds, etc.)
- Import/export of entire configurations
- Configuration profiles/presets  
- Real-time preview of changes
- Undo/redo functionality
- Configuration validation and warnings

This system is designed to be simple, reliable, and easily extensible. The input page serves as a complete reference implementation for any future configuration pages.