# Omarchy GUI - Configuration Management Application

## Project Vision

A **stupid simple** GUI application that uses Bun shell and Bun file API to make config file editing accessible to non-technical users. The app functions as a system settings interface (like Windows/Mac system preferences) but specifically for Omarchy configuration files.

## Core Philosophy

- **Local-first**: Runs locally, not as a hosted website (eventually compiled as a desktop app)
- **Direct file manipulation**: Edits files directly as if the user opened them in neovim
- **User transparency**: Users should always know what's happening behind the scenes
- **Opinionated design**: Manually crafted interfaces for supported configs, no automatic generation
- **Fallback support**: Every config can fall back to a raw text editor
- **Tasteful UX**: Clean, simple, and intuitive interface

## Current State

### Existing Components
- **ConfigFileEditor**: A file editor component with syntax highlighting, edit/preview modes, and save functionality
- **Basic UI Components**: Button, Card, Form, Input, Label, Select, Textarea (shadcn/ui based)
- **File Browser**: Proof of concept (to be deprecated/replaced)
- **Tech Stack**: React 19, Bun, TailwindCSS, Radix UI, Prism syntax highlighting

### Existing Features
- File reading/writing via API endpoints
- Syntax highlighted code preview
- Edit/preview mode toggle
- Change tracking and reset functionality
- Error handling and success feedback

## Requirements

### 1. Core Components to Build

#### A. Enhanced File Editor Component
- **Pure component** that takes a file path and handles all file I/O
- Self-contained reading and writing operations
- Syntax highlighting for various config formats
- Save button that actually writes to the file system
- Support for file update notifications
- **Location**: Already exists at `src/components/ConfigFileEditor.tsx` - needs refinement

#### B. Application Menu/Navigation
- Sidebar or main menu with different configuration categories
- Categories include: Display, Input, Keybinds, System, etc.
- Non-functional placeholder items are acceptable during development
- Clean, system-settings-like interface

#### C. Config-Specific GUI Components
- **Input Settings GUI**: Toggle for natural scroll, sensitivity sliders, etc.
- **Display Settings GUI**: Resolution, refresh rate, monitor configuration
- **Keybind Settings GUI**: Key binding editor with conflict detection
- Each GUI component should modify the underlying config file directly

### 2. Target Configuration Files

#### Input Configuration (`input.conf`)
```bash
input {
  kb_options = compose:caps
  repeat_rate = 40
  repeat_delay = 600
  
  touchpad {
    natural_scroll = true
    scroll_factor = 0.2
  }
}
```

**GUI Elements Needed:**
- Toggle: Natural scroll (touchpad.natural_scroll)
- Slider: Mouse/trackpad sensitivity 
- Number input: Repeat rate and delay
- Keyboard layout selector

#### Display Configuration
- Monitor arrangement
- Resolution settings
- Refresh rate
- Color profiles

#### Keybind Configuration
- Key binding editor
- Conflict detection
- Category organization (window management, applications, etc.)

### 3. Technical Architecture

#### File Operations
- Use **Bun file API** for all file I/O operations
- Use **Bun shell** for system interactions
- Direct file editing (no intermediate formats)
- Real-time file watching for external changes

#### Component Structure
```
src/
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── ConfigFileEditor.tsx   # Core file editor (existing)
│   ├── AppMenu.tsx           # Main navigation menu
│   ├── config/               # Config-specific components
│   │   ├── InputSettings.tsx
│   │   ├── DisplaySettings.tsx
│   │   └── KeybindSettings.tsx
│   └── layout/               # Layout components
└── lib/
    ├── config-parsers/       # Config file parsing utilities
    ├── file-operations.ts    # Bun file API wrappers
    └── shell-commands.ts     # Bun shell utilities
```

#### Data Flow
1. User interacts with GUI component
2. Component validates input
3. Component calls config parser to modify file content
4. Modified content is written directly to file system
5. File editor reflects changes in real-time

### 4. User Experience Requirements

#### Transparency & Control
- Users can always view the raw config file being modified
- Clear indication when changes are pending
- Confirmation dialogs for destructive operations
- Undo functionality (file-level rollback)

#### Error Handling
- Clear error messages for file I/O failures
- Validation feedback for invalid configurations
- Graceful degradation when config parsing fails

#### Performance
- Fast file operations using Bun APIs
- Minimal latency between GUI changes and file updates
- Efficient syntax highlighting for large config files

### 5. Development Principles

#### Reusability
- Build reusable components from the start
- Common patterns: toggle settings, slider inputs, key binding editors
- Shared config parsing utilities
- Consistent styling and behavior patterns

#### Simplicity
- No over-engineering
- Direct approach to file manipulation
- Explicit rather than implicit behavior
- Minimal abstraction layers

#### Maintainability
- Clear separation between GUI components and file operations
- Well-documented config file formats and parsing logic
- Consistent error handling patterns
- Type safety with TypeScript

### 6. Future Considerations

#### Desktop App Compilation
- Eventually package as a standalone desktop application
- Consider Tauri or Electron alternatives that work well with Bun
- Maintain local-first architecture

#### Config File Discovery
- Automatic detection of Omarchy config files
- Support for different config file locations
- Version compatibility checking

#### Advanced Features (Future)
- Config file templates
- Import/export functionality  
- Configuration profiles/presets
- Backup and restore capabilities

## Implementation Phases

### Phase 1: Foundation
1. Refine existing ConfigFileEditor component
2. Build main application menu/navigation
3. Create basic input settings GUI
4. Implement file operations with Bun APIs

### Phase 2: Core Features
1. Display settings GUI
2. Keybind settings GUI  
3. Enhanced error handling and validation
4. Undo/redo functionality

### Phase 3: Polish
1. Advanced input settings
2. Configuration discovery
3. User onboarding
4. Desktop app packaging

## Success Criteria

- Non-technical users can easily modify common Omarchy settings
- All changes are transparent and reversible
- The application feels native and responsive
- Config files remain compatible with manual editing
- Zero data loss or corruption scenarios