# PR3 Investigation: Native Preview Selection Architecture

## Executive Summary

Dyad's existing component selection system is **already functional and non-invasive**. It requires:

1. Components instrumented with `data-dyad-id` attributes (via Vite plugin)
2. A proxy server that injects the component selector client script
3. Message passing from the preview iframe to the builder

The architecture is clean and requires minimal new code to integrate with FeltDB Builder.

## 1. Component Selection Mechanism

### 1.1 Component Instrumentation

**Where**: `/packages/@dyad-sh/react-vite-component-tagger/src/index.ts`

**How it works**:

- Vite plugin runs during `serve` mode
- Processes all `.jsx` and `.tsx` files (except node_modules)
- Uses Babel parser to find all JSX elements
- Adds two attributes to each JSX opening element:
  - `data-dyad-id="filepath:line:column"` - Uniquely identifies component source location
  - `data-dyad-name="ComponentName"` - Display name for the component

**Example**:

```jsx
// Before plugin:
<Button>Click me</Button>

// After plugin:
<Button data-dyad-id="src/components/Button.tsx:5:2" data-dyad-name="Button">Click me</Button>
```

**Key Properties**:

- Non-invasive: Pure attribute addition, no code changes
- Preserves source mapping: Line and column info enables exact file location
- Works with all component types
- Minimal performance impact

### 1.2 Component Selector Client Script

**File**: `/worker/dyad-component-selector-client.js`

**Injected by**: Proxy server into all HTML responses (see below)

**What it does**:

1. **Discovery Phase** (on page load):
   - Waits for DOM elements with `data-dyad-id` attributes
   - Sends `dyad-component-selector-initialized` message to parent

2. **Hover Phase** (when selector mode is active):
   - Listens to `mousemove` events
   - Displays purple overlay around hovered component
   - Shows component name and file in label

3. **Selection Phase** (on click):
   - User clicks with component selector active
   - Generates a unique `runtimeId` for the selected element
   - Sends message to parent:

   ```javascript
   {
     type: "dyad-component-selected",
     component: {
       id: "src/components/Button.tsx:5:2",           // From data-dyad-id
       name: "Button",                                 // From data-dyad-name
       runtimeId: "dyad-1725158472000-abc12def"       // Generated at click time
     },
     coordinates: {
       top: 100,
       left: 200,
       width: 150,
       height: 40
     }
   }
   ```

4. **Activation**:
   - Activated by `Ctrl+Shift+C` keyboard shortcut (Mac: `Cmd+Shift+C`)
   - Or programmatically via `activate-dyad-component-selector` message
   - Hides hover overlay when deactivated

**Key Properties**:

- Decoupled from app code: Injected externally
- Multi-selection capable: Can select multiple components
- Tracks runtime state: Maintains overlay positions during scrolling/resize
- Modal-friendly: Includes toolbar position detection for hover label placement

## 2. Proxy Server Integration

**File**: `/worker/proxy_server.js`

**Architecture**:

- Node.js worker thread that proxies HTTP requests to the actual app server
- Intercepts HTML responses and injects Dyad scripts
- Configurable injection of multiple client scripts

**Script Injection Flow**:

```
incoming request → proxy to upstream → response received
  ↓
check if HTML (needsInjection checks for empty extension or .html)
  ↓
load pre-read script files:
  - dyad-shim.js (error handling)
  - stacktrace.js (error stack traces)
  - dyad-component-selector-client.js ← component selection
  - dyad-screenshot-client.js (screenshot capability)
  - dyad-visual-editor-client.js (visual editing)
  - dyad-logs.js (log capture)
  - dyad-sw.js (service worker)
  ↓
inject scripts into HTML <body>
  ↓
send response to client
```

**Key Properties**:

- Transparent to the app: No app modifications needed
- Preserves legacy apps: Detects if app already has shim, doesn't double-inject
- Zero dependencies in injected code
- Works with all frameworks

## 3. Data Flow: Selection to Builder

### 3.1 Complete Message Flow

```
Preview Iframe (PreviewIframe.tsx)
        ↓
   receives message from iframe.contentWindow
   (event.source === iframeRef.current?.contentWindow)
        ↓
   type === "dyad-component-selected"
        ↓
   parseComponentSelection(event.data)
        ↓
   validates & parses component data
        ↓
   updates selectedComponentsPreviewAtom (Jotai)
   + updates visualEditingSelectedComponentAtom
   + stores coordinates in currentComponentCoordinatesAtom
        ↓
ChatInput component (watches selectedComponentsPreviewAtom)
        ↓
   user submits prompt
        ↓
   reads selectedComponentsPreviewAtom
        ↓
   calls streamMessage() with selectedComponents
        ↓
useStreamChat hook
        ↓
   calls ipc.chatStream.start() with selectedComponents in params
        ↓
IPC channel "chat:stream"
        ↓
   Backend receives ChatStreamParams with selectedComponents
        ↓
   AI/agent system has selected component data available
        ↓
   agent can inspect/modify selected component
```

### 3.2 Key Data Structures

**ComponentSelection (IPC Type)**:

```typescript
// File: src/ipc/types/chat.ts
export const ComponentSelectionSchema = z.object({
  id: z.string(), // "filepath:line:column"
  name: z.string(), // Component name
  runtimeId: z.string().optional(),
  relativePath: z.string(), // Normalized file path
  lineNumber: z.number(), // Source line
  columnNumber: z.number(), // Source column
});
```

**ChatStreamParams**:

```typescript
export const ChatStreamParamsSchema = z.object({
  chatId: z.number(),
  prompt: z.string(),
  redo: z.boolean().optional(),
  attachments: z.array(ChatAttachmentSchema).optional(),
  selectedComponents: z.array(ComponentSelectionSchema).optional(), // ← HERE
});
```

### 3.3 Component Parsing

**File**: `src/components/preview_panel/PreviewIframe.tsx` (lines 1135-1183)

```typescript
function parseComponentSelection(data: any): ComponentSelection | null {
  // Validates message type
  if (data.type !== "dyad-component-selected") return null;

  // Extracts component data
  const { id, name, runtimeId } = data.component;

  // Parses id format: "filepath:line:column"
  const parts = id.split(":");
  const columnStr = parts.pop();
  const lineStr = parts.pop();
  const relativePath = parts.join(":");

  // Validates and parses line/column as integers
  const lineNumber = parseInt(lineStr, 10);
  const columnNumber = parseInt(columnStr, 10);

  // Returns validated ComponentSelection
  return {
    id,
    name,
    runtimeId,
    relativePath: normalizePath(relativePath),
    lineNumber,
    columnNumber,
  };
}
```

## 4. FeltDB Compatibility

### 4.1 Requirements for FeltDB Apps

FeltDB-generated apps will work with component selection if they:

1. ✅ **Use React with Vite** - FeltDB scaffold uses `vite.config.ts`
2. ✅ **Process JSX during development** - Vite will apply plugins during serve
3. ✅ **Run through proxy server** - Dyad app runner already uses proxy
4. ❓ **Include the Vite tagger plugin** - MUST VERIFY

### 4.2 Verification Needed

The FeltDB scaffold needs to include the component tagger plugin in its Vite config:

```typescript
// scaffold/vite.config.ts
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";

export default defineConfig({
  plugins: [
    dyadComponentTagger(), // ← NEEDS TO BE HERE
    react(),
    // ... other plugins
  ],
});
```

**Status**: MUST VERIFY if this plugin is included

### 4.3 Expected Behavior with FeltDB Apps

Once verified that plugin is included:

1. ✅ User creates/edits FeltDB app in builder
2. ✅ Builder generates app code (includes JSX)
3. ✅ App runs through preview proxy server
4. ✅ Proxy injects component selector client
5. ✅ Vite plugin adds `data-dyad-id` attributes to JSX
6. ✅ User can click `Ctrl+Shift+C` to activate selector
7. ✅ Click components to select them
8. ✅ Selected component passes to AI in next prompt
9. ✅ AI can modify selected component

## 5. Dependencies and Limitations

### 5.1 External Dependencies

- **Required**: Vite (already in FeltDB scaffold)
- **Required**: React (already in FeltDB scaffold)
- **Required**: Proxy server (already in Dyad app runner)
- **Optional**: All other injected scripts are independent

### 5.2 Limitations

1. **Source Mapping**:
   - Works only for JSX elements directly in source
   - Not for dynamically created DOM elements
   - Not for iframes within the app

2. **Persistence**:
   - Selection doesn't survive page reload
   - Component identity uses runtime ID (generated at selection time)
   - Server-rendered elements won't have data-dyad-id attributes

3. **Security**:
   - Requires same-origin sandbox policy (iframe uses allow-same-origin)
   - Selection data travels through IPC (internal, Electron safe)
   - No exposed API to external systems

4. **Performance**:
   - Minimal: Only event listeners on DOM
   - Overlay rendering is efficient (uses absolute positioning)
   - No polling, only event-driven

## 6. What Works Today

✅ Component selection mechanism is **production-ready**
✅ Data flow to AI is **properly typed** and **implemented**
✅ Message protocol is **stable** and **well-documented**
✅ Proxy injection is **reliable** and **tested**
✅ FeltDB integration is **possible** (needs plugin verification)

## 7. What Needs Implementation

### For PR3 Proof-of-Concept:

1. **Verify FeltDB scaffold has tagger plugin** (1-2 hours)
   - Check vite.config.ts includes component tagger
   - If missing, add it to scaffold generation
   - Test that generated apps have data-dyad-id attributes

2. **E2E test for component selection** (2-3 hours)
   - Generate FeltDB app
   - Open preview
   - Select component via Ctrl+Shift+C
   - Submit prompt with selected component
   - Verify AI can inspect selected component

3. **UI improvements for component selection** (2-3 hours)
   - Button to activate component selector (instead of keyboard shortcut only)
   - Show which components are currently selected
   - Visual feedback in chat input
   - Clear selected components UI

4. **Pop-out preview prototype** (3-5 hours)
   - Create separate window for preview
   - Share same app URL and selection state
   - Bidirectional message passing for selection
   - Basic window management (open/close/focus)

5. **Obscura evaluation** (research task, 1-2 hours)
   - Research Obscura capabilities vs current architecture
   - Document findings
   - Decision: necessary or optional?

## 8. Architecture Assessment

### Current Architecture (No Changes Needed)

```
                  FELTDB BUILDER
                        │
              ┌─────────┴─────────┐
              │                   │
          Chat/AI              Preview
                                  │
                         ┌────────┴────────┐
                         │                 │
                     Embedded          Pop-out
                         │                 │
                         └────────┬────────┘
                                  │
                           Proxy Server
                                  │
                      ┌───────────┬───────────┐
                      │           │           │
                      ↓           ↓           ↓
                   App         Inject      Component
                              Scripts      Selector
                                           Client
                                  │
                           Select Element
                                  │
                                  ↓
                             Select Message
                                  │
                                  ↓
                            PreviewIframe
                                  │
                                  ↓
                            Jotai Atom
                                  │
                                  ↓
                            ChatInput
                                  │
                                  ↓
                            IPC to Agent
```

### Why This Works (Without New Architecture)

1. **No browser extension needed** - All work happens in same process
2. **No separate DevTools** - Builder owns the preview
3. **No secondary WebSocket** - Uses existing iframe messages
4. **No external inspector** - Component selector is injected client
5. **No new auth** - Electron IPC is secure by default
6. **No duplicate state** - Jotai atom is source of truth

## 9. Risks & Mitigations

| Risk                                  | Mitigation                                    |
| ------------------------------------- | --------------------------------------------- |
| FeltDB scaffold missing tagger plugin | Add to scaffold generation template           |
| Selection breaks on framework changes | Monitor Vite plugin ecosystem                 |
| Performance with many components      | Overlay rendering already optimized           |
| Security regression in messaging      | IPC type validation already in place          |
| Pop-out window state sync issues      | Design message protocol before implementation |

## 10. Next Steps

### For PR3 Implementation:

1. ✅ **Investigation Complete** - This document
2. 🔄 **Verification**: Check FeltDB scaffold for tagger plugin
3. 🔄 **E2E Test**: Create proof-of-concept end-to-end test
4. 🔄 **UI Enhancement**: Add component selection UI/UX
5. 🔄 **Pop-out Prototype**: Implement basic pop-out window
6. 🔄 **Documentation**: Update CONTRIBUTING.md with selection workflow
7. 🔄 **Obscura Research**: Document findings (likely: not needed for desktop preview)

---

**Investigation conducted**: Audit of existing Dyad component selection mechanism
**Date**: 2026-09-01
**Status**: Ready for proof-of-concept implementation
