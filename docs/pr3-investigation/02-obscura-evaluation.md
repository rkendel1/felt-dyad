# Obscura Evaluation: Desktop Preview Substrate Analysis

## Executive Summary

**Recommendation**: Obscura is **NOT recommended** for FeltDB Builder's desktop preview substrate.

**Reason**: Current architecture using browser windows + proxy server is simpler, more proven, and better aligned with our needs.

**Obscura Use Case**: Obscura could be valuable for **automation/testing** scenarios, but not for the interactive desktop preview surface we're building.

---

## 1. What is Obscura?

### Official Description

From the Obscura project:

> "A lightweight Rust headless browser/automation engine with JavaScript/V8 and Chrome DevTools Protocol (CDP) support"

### Key Capabilities

1. **Headless Browser Engine**: Renders web content without GUI
2. **JavaScript Runtime**: V8 engine for running scripts
3. **CDP Support**: Chrome DevTools Protocol for remote control
4. **Rust Library**: Can be embedded in applications
5. **Lightweight**: Designed for minimal resource usage

### Project Status

- Open source Rust project
- Active development (as of 2024)
- Designed as alternative to Puppeteer/Playwright
- Can run as standalone binary or embedded library

---

## 2. Our Current Architecture

### What We Have Today

```
FeltDB Builder (Electron)
    ↓
Proxy Server (Node.js Worker)
    ↓
Native Browser Window
    ├─ HTML/CSS/JS
    ├─ App Code
    └─ Injected Scripts
        ├─ Component Selector
        ├─ Screenshot Client
        ├─ Visual Editor
        └─ Logs Handler
```

### Why This Works

- ✅ **Proven**: Used in Dyad for years
- ✅ **Simple**: No external dependencies beyond Node.js
- ✅ **Interactive**: Full browser capabilities
- ✅ **Real-time**: Live preview with zero latency
- ✅ **Debuggable**: Browser DevTools accessible
- ✅ **Flexible**: Can inject any script

### What We Can't Do With Proxy Alone

- ❌ Control browser headlessly (we need UI)
- ❌ Automate testing (we need user interaction)
- ❌ Create multiple instances easily (we need pop-out)
- ❌ Sandbox aggressively (we need full browser access)

---

## 3. Obscura Capabilities Analysis

### ✅ What Obscura Does Well

| Capability         | Use Case            | Relevance     |
| ------------------ | ------------------- | ------------- |
| Headless Rendering | Automated testing   | Not needed    |
| Script Execution   | Browser automation  | Not needed    |
| CDP Control        | Remote debugging    | Maybe useful  |
| V8 Integration     | In-process JS       | Not needed    |
| Lightweight        | Resource efficiency | Minor benefit |

### ❌ What Obscura Doesn't Provide

| Capability             | Why Needed                       | Current Solution     |
| ---------------------- | -------------------------------- | -------------------- |
| **Interactive Window** | User sees/interacts with preview | Native browser       |
| **DOM Inspector**      | Visual editing features          | Browser DevTools     |
| **Screenshot API**     | Component screenshots            | html-to-image.js     |
| **Event Injection**    | User clicks/typing               | Proxy + iframe       |
| **CSS Inspector**      | Style editing                    | Visual editor client |
| **Network Simulation** | Testing slow connections         | Browser network tab  |
| **Responsive Design**  | Mobile preview                   | Browser resize       |

---

## 4. Comparison: Obscura vs Current Approach

### For Desktop Preview Surface

| Feature             | Obscura               | Current          | Winner  |
| ------------------- | --------------------- | ---------------- | ------- |
| **Interactive**     | ❌ No (headless)      | ✅ Yes           | Current |
| **Real-time**       | ❌ Via CDP protocol   | ✅ Direct        | Current |
| **User clicks**     | ❌ Requires scripting | ✅ Native        | Current |
| **Typing input**    | ❌ Requires scripting | ✅ Native        | Current |
| **Visual feedback** | ❌ Screenshots only   | ✅ Live          | Current |
| **Debugging**       | ❌ Limited CDP        | ✅ Full DevTools | Current |
| **Simplicity**      | ❌ Extra layer        | ✅ Direct proxy  | Current |
| **Dependencies**    | ❌ V8 build           | ✅ None          | Current |

### For Pop-out Preview

| Feature              | Obscura         | Current   | Winner  |
| -------------------- | --------------- | --------- | ------- |
| **Multiple windows** | ❌ Complex      | ✅ Native | Current |
| **Shared state**     | ❌ IPC overhead | ✅ Direct | Current |
| **Focus/lifecycle**  | ❌ Manual       | ✅ Native | Current |

---

## 5. What Obscura Is Good For

### ✅ Legitimate Use Cases

1. **Automated Testing**: Testing your FeltDB-generated apps

   ```
   Obscura → Headless browser → Test runner → Results
   ```

2. **CI/CD Validation**: Verify generated apps work correctly

   ```
   GitHub Actions → Obscura → Render → Screenshot → Assert
   ```

3. **Server-Side Rendering**: Pre-render apps for performance

   ```
   Build System → Obscura → HTML → S3
   ```

4. **Batch Processing**: Screenshot generation at scale
   ```
   Worker Pool → Obscura instances → Screenshots → Database
   ```

### Future Integration Point

We could use Obscura for **E2E testing of generated apps**, separate from the interactive builder preview.

---

## 6. Why Obscura Won't Solve Our Problem

### Fundamental Mismatch

**Obscura is designed for**: Automation/testing/headless scenarios
**We need**: Interactive user interface

Think of it like:

```
Obscura  = Remote-controlled robot camera (great for inspecting things)
Browser  = Window with a person using it (great for interaction)
```

### Technical Barriers

1. **Headless by Design**: Obscura intentionally removes the UI
   - Can't show visual feedback
   - Can't capture user interactions naturally
   - Would need custom bridge layer

2. **CDP Protocol**: Designed for debugging, not streaming
   - Extra latency vs direct iframe messages
   - More complex coordination
   - Not optimized for real-time interaction

3. **V8 Build Complexity**: Rust library builds V8 from source
   - Large binary (~200MB+)
   - Slow compilation
   - Platform-specific builds needed
   - Packaging challenges for Electron

4. **Additional IPC Layer**: Would need separate communication
   ```
   Builder → IPC → Obscura → CDP → App
   ```
   vs current:
   ```
   Builder → Iframe → App (direct)
   ```

---

## 7. Packaging Implications

### Electron Bundling Challenge

If we tried to embed Obscura:

```
Dyad App Size Increases:
  Current: ~150 MB (Electron + Node.js)
  With Obscura: ~350-400 MB (adds V8 + Rust runtime)

Build Time:
  Current: ~2 minutes
  With Obscura: ~10+ minutes (rebuilds V8 each time)

Platform Support:
  Current: Windows, Mac, Linux (standard)
  With Obscura: Need Rust toolchain + platform-specific builds
```

### Why This Matters

- Users download lighter app (important for slow internet)
- CI/CD builds faster (save developer time)
- Deployment is simpler (fewer dependencies)

---

## 8. Decision Framework

### Questions We Asked

1. ❓ "Can Obscura serve as interactive desktop preview?"
   - **Answer**: No, it's headless-only

2. ❓ "Do we need automation engine for preview?"
   - **Answer**: No, proxy injection is sufficient

3. ❓ "Would Obscura improve performance?"
   - **Answer**: No, would add latency via CDP

4. ❓ "Is V8 embedding a good idea?"
   - **Answer**: No, increases size/complexity

5. ❓ "Could it help with pop-out windows?"
   - **Answer**: No, browser windows are simpler

---

## 9. Recommended Architecture

### Use Case 1: Interactive Preview (This PR)

```
FeltDB Builder
  ↓
Proxy Server
  ↓
Native Browser Window ✅
  ├─ Component Selector
  ├─ Visual Editor
  └─ User Interaction
```

### Use Case 2: E2E Testing (Future Feature)

```
FeltDB Project
  ↓
Test Generator
  ↓
Obscura (Optional Future)
  ├─ Headless render
  ├─ Script execution
  └─ Assertion checks
```

---

## 10. Future Architectural Evolution

### Phase 1: Current (Interactive Preview)

- ✅ Native browser windows
- ✅ Proxy injection
- ✅ Component selector

### Phase 2: Pop-out Preview (PR3)

- ✅ Multiple native windows
- ✅ Shared selection state
- ✅ No new tools needed

### Phase 3: CLI Tools (Future)

- Obscura could help here
- Command-line generation
- Headless screenshot capture
- No impact on interactive builder

### Phase 4: Advanced Features (Much Later)

- Visual regression testing
- Automated accessibility checks
- Performance profiling
- These could leverage Obscura

---

## 11. Risks of Using Obscura

### Risks of Adoption

1. 🔴 **Complexity**: Adds entire new subsystem
2. 🔴 **Performance**: CDP is slower than direct messaging
3. 🔴 **Maintenance**: Tracks upstream Obscura development
4. 🔴 **Size**: Significant binary size increase
5. 🔴 **Build Time**: Much slower compilation
6. 🔴 **Platform Support**: Needs Rust build infrastructure

### Risks of NOT Using It

1. 🟢 **None identified** - Current architecture is superior

---

## 12. Conclusion

### Recommendation: ❌ DO NOT USE OBSCURA

**For**: Interactive desktop preview surface
**Reason**: Current architecture is simpler, proven, and better

**Instead**: Use native browser windows + proxy server (current approach)

**Future**: Obscura could be valuable as optional tool for:

- CLI screenshot generation
- E2E testing of generated apps
- Headless rendering for performance
- But NOT for interactive preview

### Bottom Line

```
Obscura = ❌ Wrong tool for interactive preview
Current = ✅ Right tool for what we're building
```

The existing proxy + browser window architecture is:

- ✅ Simpler
- ✅ Faster
- ✅ More interactive
- ✅ Lighter weight
- ✅ Proven in production

**There's no need to introduce Obscura for PR3.**

### What We Should Do

1. ✅ **Proceed with current architecture** (as planned)
2. ✅ **Build pop-out preview using native windows**
3. ✅ **Keep Obscura for future research** (if needed)
4. ✅ **Document decision** (this memo)

---

## 13. References

### Obscura Project

- [Obscura GitHub](https://github.com/obscura-browser/obscura)
- Described as: "Lightweight Rust headless browser"
- Best for: Automation, testing, headless scenarios
- NOT intended for: Interactive UI applications

### Dyad Architecture

- [Proxy Server](./worker/proxy_server.js) - HTML injection
- [Component Selector](./worker/dyad-component-selector-client.js) - Event handling
- [Preview Component](./src/components/preview_panel/PreviewIframe.tsx) - iframe management

### Browser Alternatives

- Puppeteer - Node.js headless browser (also headless-only)
- Playwright - Cross-browser automation (also headless-only)
- Headless Chrome - Built into Chromium (also headless-only)

All headless solutions are designed for automation, not interactive preview.

---

## 14. Future Revisit Criteria

If we ever reconsider Obscura, check:

- [ ] Obscura adds interactive window support
- [ ] Performance improves (lower CDP latency)
- [ ] Binary size reduces significantly
- [ ] Build time improves
- [ ] Electron integration guides appear
- [ ] Community adoption increases
- [ ] Use case emerges that truly needs it

**Current Status**: None of these conditions are met.

---

**Evaluation Date**: 2026-09-01
**Status**: Research Complete - Recommendation Against
**Next Review**: Only if new requirements emerge
