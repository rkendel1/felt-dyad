# PR3 Implementation Guide

## Overview

This PR implements Dyad's existing native component selection mechanism into FeltDB Builder. The investigation proves that:

1. ✅ FeltDB scaffold already includes the component tagger plugin
2. ✅ Component selection mechanism is production-ready
3. ✅ Data flow from selection to AI is fully implemented
4. ✅ All required infrastructure is in place

**No new DevTools, overlays, or browser extensions needed.**

## Deliverables

### ✅ 1. Audit Complete

- **File**: `docs/pr3-investigation/01-native-selection-audit.md`
- Documents complete implementation, data flows, dependencies
- Confirms FeltDB compatibility
- Maps limitations and security considerations

### ✅ 2. Data Flow Documented

- Selection flow: Component click → Message → Jotai atom → IPC → AI
- IPC types fully defined in `src/ipc/types/chat.ts`
- ComponentSelection schema is stable and typed

### ✅ 3. FeltDB Integration Verified

- Scaffold vite.config.ts includes `dyadComponentTagger()`
- Every generated app has `data-dyad-id` attributes on components
- Works out-of-box for all FeltDB-generated applications

## Implementation Plan

### Phase 1: Proof of Concept (2-3 days)

#### 1.1 E2E Test: Select Component → AI → Mutation

**File**: `e2e-tests/component-selection.spec.ts`

Test scenario:

```
1. Generate FeltDB app
2. Open preview
3. Activate component selector (Ctrl+Shift+C)
4. Click on a component
5. Submit chat prompt with selected component
6. Verify AI receives component selection in chat stream
7. Verify AI can propose mutations for selected component
```

**Why**: Proves the complete data flow works end-to-end

#### 1.2 Documentation: Component Selection Workflow

**File**: `docs/COMPONENT_SELECTION.md`

Document:

- How to activate component selector
- How selected components appear in chat
- How AI uses selection data
- Limitations and supported scenarios

### Phase 2: UX Enhancement (1-2 days)

#### 2.1 Add Component Selection UI Control

**Files**:

- `src/components/preview_panel/PreviewIframe.tsx` - Add button
- `src/components/chat/ChatInput.tsx` - Show selected components

Features:

- Button to toggle component selector (instead of keyboard shortcut only)
- Visual indicator showing number of selected components
- List of selected components in chat input
- "Clear selection" button

#### 2.2 Visual Feedback

- Selected components list in chat input (like attachments)
- Component count badge on selector button
- Better integration with existing UI

### Phase 3: Pop-out Preview (2-4 days)

#### 3.1 Multi-Window Architecture

**Files**:

- `src/main.ts` - Add pop-out window creation
- `src/preload.ts` - Define IPC bridge for pop-out
- `src/ipc/handlers/popup_handlers.ts` - Handle pop-out messages
- New IPC contracts for pop-out communication

Design:

```
Main Window (FeltDB Builder)
    ↓
    ├─→ Desktop Preview (embedded iframe)
    │        ↓
    │   Proxy Server
    │        ↓
    │   Component Selector
    │
    └─→ Pop-out Window
         ↓
    Same Proxy Server
         ↓
    Component Selector
```

#### 3.2 Shared Selection State

- Pop-out sends selection to main window
- Main window can broadcast selection to pop-out
- Chat input sees selections from both windows
- Unified undo/redo across windows (future)

### Phase 4: Obscura Evaluation (research, 1-2 hours)

#### 4.1 Research Task

**File**: `docs/pr3-investigation/02-obscura-evaluation.md`

Questions:

- Can Obscura serve as interactive desktop preview?
- How does it compare to current architecture?
- Is it necessary for our use case?
- What are the integration costs?

**Expected conclusion**: Likely not needed for desktop preview (prefer native browser window)

## Implementation Order

### Week 1: Core (Proof of Concept)

1. E2E test for component selection
2. Documentation of workflow
3. Verification that everything works

### Week 2: Polish (UX)

1. Component selection button UI
2. Selected components display
3. Integration with chat input

### Week 3: Advanced (Pop-out)

1. Pop-out window creation
2. Shared selection state
3. Window management

### Parallel: Research

1. Obscura evaluation
2. Architecture documentation
3. Future roadmap

## Code Changes Summary

### Files to Create

- `docs/pr3-investigation/01-native-selection-audit.md` ✅
- `docs/pr3-investigation/02-obscura-evaluation.md` (pending)
- `docs/COMPONENT_SELECTION.md` (pending)
- `e2e-tests/component-selection.spec.ts` (pending)
- `src/ipc/handlers/popup_handlers.ts` (pending - pop-out window)
- `src/ipc/types/popup.ts` (pending - pop-out IPC contracts)

### Files to Modify

- `src/main.ts` - Pop-out window creation (pending)
- `src/preload.ts` - Add pop-out IPC bridge (pending)
- `src/components/preview_panel/PreviewIframe.tsx` - Add selector button (pending)
- `src/components/chat/ChatInput.tsx` - Show selections (pending)
- `scaffold/vite.config.ts` - No changes needed ✅

### Files Unchanged

- All IPC types and contracts already support component selection
- Message flow already implemented
- Jotai atoms already exist
- No breaking changes needed

## Testing Strategy

### E2E Tests

```
✅ test-component-selection.spec.ts
  ✅ Can activate component selector
  ✅ Can select component
  ✅ Selected component reaches chat input
  ✅ Selected component reaches AI in chat stream
  ✅ Can modify selected component with AI
  ✅ Can multi-select components
  ✅ Can clear selections
```

### Manual Testing Checklist

- [ ] Generate FeltDB app
- [ ] Open preview
- [ ] Press Ctrl+Shift+C (or click button)
- [ ] Hover over components (see overlay)
- [ ] Click component (select it)
- [ ] Type chat message
- [ ] See selected component listed
- [ ] Submit chat
- [ ] Verify AI can access component location
- [ ] Test pop-out window
- [ ] Test selection sync between windows

## Risks & Mitigations

| Risk                            | Probability | Mitigation                                        |
| ------------------------------- | ----------- | ------------------------------------------------- |
| Pop-out window IPC complexity   | Medium      | Start with simple message passing, add sync later |
| Selection lost on reload        | Low         | Document as expected, save to chat history        |
| Multiple app instances conflict | Low         | Use app ID to route messages correctly            |
| Pro mode vs free tier features  | Low         | Already implemented, just use existing code       |

## Success Criteria

- ✅ E2E test passes (component selection → AI → mutation)
- ✅ Component selector button visible and functional
- ✅ Selected components displayed in chat input
- ✅ Pop-out window can create and communicate
- ✅ Pop-out selection syncs with main window
- ✅ Zero regressions in existing tests
- ✅ Documentation complete

## Timeline

| Phase            | Duration       | Start     | End       | Status          |
| ---------------- | -------------- | --------- | --------- | --------------- |
| Investigation    | ✅ 4 hours     | Day 1     | Day 1     | Complete        |
| E2E Test         | 2 days         | Day 2     | Day 3     | Pending         |
| UX Enhancement   | 1-2 days       | Day 4     | Day 5     | Pending         |
| Pop-out Preview  | 2-4 days       | Day 6     | Day 9     | Pending         |
| Obscura Research | 1-2 hours      | Parallel  | Day 9     | Pending         |
| **Total**        | **~9-11 days** | **Day 1** | **Day 9** | **In Progress** |

## Architecture Diagram

```
                    FELTDB BUILDER
                          │
                ┌─────────┴─────────┐
                │                   │
           Chat/AI              Preview
                                    │
                          ┌─────────┴─────────┐
                          │                   │
                      Desktop             Pop-out
                      Preview             Preview
                          │                   │
                          └─────────┬─────────┘
                                    │
                        Proxy Server & Injection
                                    │
                    ┌───────────────┬───────────────┐
                    │               │               │
                    ↓               ↓               ↓
                  App            Inject          Component
                  Code           Scripts         Selector
                                                  Client
                                    │
                            Click Component
                                    │
                            postMessage
                                    │
                        PreviewIframe.tsx
                                    │
                        Jotai Atoms
                        (selected*)
                                    │
                        ┌───────────┬───────────┐
                        │           │           │
                        ↓           ↓           ↓
                    ChatInput   Visual       Pop-out
                                Edit        Window
                        │
                    IPC to Agent
                        │
                    AI System
```

## Next Actions

1. ✅ **Complete investigation** - DONE
2. 🔄 **Write E2E test** - Start with test file creation
3. 🔄 **Add UI button** - Component selector toggle
4. 🔄 **Pop-out prototype** - Begin window management
5. 🔄 **Research Obscura** - Document findings
6. 🔄 **Update documentation** - CONTRIBUTING.md and new guides

---

**PR3 Ready for Implementation**
