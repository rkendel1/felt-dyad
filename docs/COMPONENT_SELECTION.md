# Component Selection Workflow Guide

## Overview

FeltDB Builder has native component selection capability built in. This guide explains how it works and how to use it.

## How Component Selection Works

### 1. Component Instrumentation

Every component in your FeltDB app is automatically tagged with metadata attributes during development:

```jsx
// Generated code includes:
<Button data-dyad-id="src/components/Button.tsx:5:2" data-dyad-name="Button">
  Click me
</Button>
```

These attributes are added automatically by the Vite component tagger plugin and don't affect your app's functionality or performance.

### 2. Selecting Components

#### Using Keyboard Shortcut

- **Mac**: `Cmd + Shift + C`
- **Windows/Linux**: `Ctrl + Shift + C`

This activates the component selector mode. Your cursor will change and components will show purple overlays as you hover over them.

#### Using the Component Selector Button

A visual button in the preview panel lets you activate component selection without memorizing shortcuts.

#### Visual Feedback

- **Purple overlay**: Marks component boundaries while hovering
- **Component label**: Shows component name and file location
- **Blue highlight**: Indicates selected component

### 3. Viewing Selected Components

After selecting components, you'll see them listed in the chat input area, similar to file attachments. This shows:

- Component name
- File path
- Source location (line:column)

### 4. Using Selected Components in Chat

When you send a prompt with selected components:

```
"Move this button to the right" ← prompt
├─ Button (src/components/Button.tsx:5:2) ← selected component
└─ [Send]
```

The AI receives:

- Your prompt text
- Full component metadata (file path, line, column)
- Component name
- Runtime instance ID

This allows the AI to:

- Locate the exact component in your code
- Understand its current position
- Propose modifications
- Apply changes automatically

### 5. Multi-Component Selection

You can select multiple components at once:

1. Activate component selector
2. Click the first component
3. Continue clicking other components (without deactivating selector)
4. All selected components appear in the chat input
5. Send prompt with multiple selected components

### 6. Deselecting Components

#### Clear All

A "Clear Selection" button in the chat input removes all selected components.

#### Clear Individual Component

Click the X button next to a component name to deselect it individually.

#### Deselect by Clicking

With component selector active, click a selected component again to deselect it.

## Use Cases

### Use Case 1: Quick Style Changes

```
User: "Make this button bigger"
     [Select Button component]
└─ AI locates component in code
└─ AI increases padding/font-size
└─ User sees preview update
```

### Use Case 2: Layout Adjustments

```
User: "Move this to the right side"
     [Select Card component]
└─ AI understands component layout
└─ AI changes grid positioning
└─ User sees updated layout
```

### Use Case 3: Multi-Component Changes

```
User: "Make these buttons match"
     [Select Button A, Button B]
└─ AI receives both components
└─ AI applies same styling
└─ Both buttons update consistently
```

## Technical Details

### Component Identification

Components are identified by their source location:

```
filepath:line:column
src/components/Button.tsx:5:2
   ↑                      ↑  ↑
   file path          line column
```

This allows the AI to:

- Find exact component in source code
- Apply changes to correct component (not similar ones)
- Maintain accurate source mapping

### Runtime ID

Each selected instance also gets a unique runtime ID:

```
dyad-1725158472000-abc12def
   ↑                    ↑
   timestamp        random ID
```

This helps when:

- Same component appears multiple times
- Need to track which instance user clicked
- Maintaining consistency across page reloads

### Data Sent to AI

When you send a prompt with selected components:

```json
{
  "chatId": 123,
  "prompt": "Make this button bigger",
  "selectedComponents": [
    {
      "id": "src/components/Button.tsx:5:2",
      "name": "Button",
      "runtimeId": "dyad-1725158472000-abc12def",
      "relativePath": "src/components/Button.tsx",
      "lineNumber": 5,
      "columnNumber": 2
    }
  ]
}
```

## Limitations

### What Works

- ✅ React components (JSX)
- ✅ TypeScript (TSX)
- ✅ Stateless components
- ✅ Components in `src/` directory
- ✅ Nested components
- ✅ Multiple instances of same component

### What Doesn't Work

- ❌ Non-JSX HTML elements (created outside React)
- ❌ Dynamically created elements (e.g., `document.createElement`)
- ❌ Iframes within your app
- ❌ Third-party component libraries (without source)
- ❌ Built-in HTML tags without JSX wrapper

### Persistence

- Selection is cleared when:
  - Page is reloaded
  - Preview is restarted
  - Different app is opened

- Selection is preserved when:
  - Sending multiple prompts
  - Browsing different routes
  - Changing chat messages (until reload)

## Troubleshooting

### Components Not Showing Overlays

**Problem**: When I press Ctrl+Shift+C, nothing happens.

**Solutions**:

1. Make sure preview panel is open
2. Try clicking in the preview area first
3. Check browser console for errors (F12 in preview)
4. Verify app is running (look for green status indicator)

### Component Not Appearing in List

**Problem**: I clicked a component but it doesn't appear in chat input.

**Solutions**:

1. Make sure selector mode is still active (press Ctrl+Shift+C again if needed)
2. Try clicking a different component
3. Check that you're clicking on a JSX element (not a plain HTML element)
4. Try refreshing the preview (R key in preview panel)

### AI Can't Find Component

**Problem**: AI says it can't locate the selected component.

**Solutions**:

1. Regenerate the app (save triggers regeneration)
2. Check that component file exists at the path shown
3. Clear selection and try selecting a different component
4. Use file mentions in chat as alternative

## Advanced Features

### Visual Editing

Selected components show:

- **Toolbar below component**: Edit styling directly
- **Green highlight**: Shows which component is being edited
- **Live preview**: See changes in real-time
- **Commit changes**: Save styling modifications

### Multi-Window Selection

If you open a pop-out preview window:

- Selections sync between main and pop-out windows
- Selecting in pop-out updates main window
- Selecting in main window updates pop-out
- Same selection state across windows

## Tips & Tricks

1. **Quick Selection**: Double-click component name in overlay to select it

2. **Nested Components**: If multiple components are nested, the smallest one is selected

3. **Keyboard Focus**: Press Escape to deactivate selector mode

4. **Mobile Testing**: Component selection works on mobile device previews too

5. **Code Changes**: After AI modifies a component, click "Select" again to see updated code

## API Reference (Developers)

### Activating Component Selection Programmatically

```typescript
import { IpcClient } from "@/ipc/ipc_client";

const ipc = IpcClient.getInstance();
// Send message to preview iframe to activate selector
// (internal use, not documented API)
```

### Selected Components in Chat Stream

Selected components are passed via `selectedComponents` field in `ChatStreamParams`:

```typescript
interface ChatStreamParams {
  chatId: number;
  prompt: string;
  selectedComponents?: ComponentSelection[];
}

interface ComponentSelection {
  id: string; // "filepath:line:column"
  name: string; // Component name
  runtimeId?: string; // Unique runtime ID
  relativePath: string; // File path
  lineNumber: number; // Source line
  columnNumber: number; // Source column
}
```

## See Also

- [PR3 Investigation](./pr3-investigation/01-native-selection-audit.md) - Technical architecture
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Development guidelines
- [Visual Editing](./VISUAL_EDITING.md) - Visual editing features

---

**Last Updated**: 2026-09-01
**Status**: Stable & Production Ready
