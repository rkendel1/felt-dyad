import { expect } from "@playwright/test";
import { testSkipIfWindows } from "./helpers/test_helper";

testSkipIfWindows(
  "PR4: Select button shows label and status",
  async ({ po }) => {
    await po.setUp();
    await po.sendPrompt("tc=basic");
    await po.clickTogglePreviewPanel();

    // Button should show "Select" label when not picking
    const selectButton = po.page.getByTestId("preview-pick-element-button");
    await expect(selectButton).toBeVisible();
    await expect(selectButton).toContainText("Select");

    // Click to activate selection mode
    await selectButton.click();

    // Button should now show "✓ Selecting" when active
    await expect(selectButton).toContainText("✓ Selecting");
    await expect(selectButton).toHaveClass(/bg-purple-500/);

    // Click again to deactivate
    await selectButton.click();

    // Button should revert to "Select"
    await expect(selectButton).toContainText("Select");
  },
);

testSkipIfWindows(
  "PR4: Selection display shows improved UI",
  async ({ po }) => {
    await po.setUp();
    await po.sendPrompt("tc=basic");
    await po.clickTogglePreviewPanel();
    await po.clickPreviewPickElement();

    // Select a component
    await po
      .getPreviewIframeElement()
      .contentFrame()
      .getByRole("heading", { name: "Welcome to Your Blank App" })
      .click();

    // Check that the selection display is visible with proper structure
    const selectedDisplay = po.getSelectedComponentsDisplay();
    await expect(selectedDisplay).toBeVisible();

    // Should have "Selected" label
    await expect(selectedDisplay.getByText(/Selected/)).toBeVisible();

    // Should show component count
    await expect(selectedDisplay.getByText(/component/i)).toBeVisible();

    // Should have component name visible
    await expect(
      selectedDisplay.getByText(/Welcome to Your Blank App|Heading/i),
    ).toBeVisible();

    // Snapshot the selection display
    await po.snapshotSelectedComponentsDisplay();
  },
);

testSkipIfWindows(
  "PR4: Edit with AI button focuses chat input",
  async ({ po }) => {
    await po.setUp();
    await po.sendPrompt("tc=basic");
    await po.clickTogglePreviewPanel();
    await po.clickPreviewPickElement();

    // Select a component
    await po
      .getPreviewIframeElement()
      .contentFrame()
      .getByRole("heading", { name: "Welcome to Your Blank App" })
      .click();

    // Find and click "Edit with AI" button
    const editWithAIButton = po.page.getByRole("button", {
      name: /Edit with AI/i,
    });
    await expect(editWithAIButton).toBeVisible();

    // Get the chat input before clicking
    const chatInput = po.page.getByTestId("chat-input-content-editable");

    // Click "Edit with AI"
    await editWithAIButton.click();

    // Chat input should now be focused
    await expect(chatInput).toBeFocused();
  },
);

testSkipIfWindows(
  "PR4: Multi-component selection shows correct count",
  async ({ po }) => {
    await po.setUp();
    await po.sendPrompt("tc=basic");
    await po.clickTogglePreviewPanel();
    await po.clickPreviewPickElement();

    // Select first component
    await po
      .getPreviewIframeElement()
      .contentFrame()
      .getByRole("heading", { name: "Welcome to Your Blank App" })
      .click();

    // Select second component
    await po
      .getPreviewIframeElement()
      .contentFrame()
      .getByText("Start building your amazing project here!")
      .click();

    // Check that both components are displayed
    const selectedDisplay = po.getSelectedComponentsDisplay();
    await expect(selectedDisplay).toBeVisible();

    // Should show "2 components"
    await expect(selectedDisplay.getByText(/2 components/i)).toBeVisible();

    // Should show "Edit with AI" button
    const editWithAIButton = po.page.getByRole("button", {
      name: /Edit with AI/i,
    });
    await expect(editWithAIButton).toBeVisible();

    // Snapshot with both selected
    await po.snapshotSelectedComponentsDisplay();
  },
);

testSkipIfWindows(
  "PR4: Keyboard shortcut activates selection mode",
  async ({ po }) => {
    await po.setUp();
    await po.sendPrompt("tc=basic");
    await po.clickTogglePreviewPanel();

    // Use keyboard shortcut to activate selection
    // Ctrl+Shift+C on Linux/Windows, Cmd+Shift+C on Mac
    const isMac = await po.page.evaluate(() =>
      navigator.platform.toUpperCase().includes("MAC"),
    );

    if (isMac) {
      await po.page.keyboard.press("Meta+Shift+KeyC");
    } else {
      await po.page.keyboard.press("Control+Shift+KeyC");
    }

    // Selection button should be active
    const selectButton = po.page.getByTestId("preview-pick-element-button");
    await expect(selectButton).toContainText("✓ Selecting");
    await expect(selectButton).toHaveClass(/bg-purple-500/);
  },
);

testSkipIfWindows(
  "PR4: Selection persists after preview refresh",
  async ({ po }) => {
    await po.setUp();
    await po.sendPrompt("tc=basic");
    await po.clickTogglePreviewPanel();
    await po.clickPreviewPickElement();

    // Select a component
    await po
      .getPreviewIframeElement()
      .contentFrame()
      .getByRole("heading", { name: "Welcome to Your Blank App" })
      .click();

    // Verify selection is visible
    await expect(po.getSelectedComponentsDisplay()).toBeVisible();

    // Refresh the preview
    await po.clickPreviewRefresh();

    // Wait for preview to reload
    await po.expectPreviewIframeIsVisible();

    // Selection should still be visible after refresh
    // (Note: This tests the intended behavior. If the current implementation
    // doesn't preserve selection, this documents that as a known limitation)
    await expect(po.getSelectedComponentsDisplay()).toBeVisible();
  },
);

testSkipIfWindows(
  "PR4: Component selection sent to AI with selected components parameter",
  async ({ po }) => {
    await po.setUp();
    await po.sendPrompt("tc=basic");
    await po.clickTogglePreviewPanel();
    await po.clickPreviewPickElement();

    // Select a component
    await po
      .getPreviewIframeElement()
      .contentFrame()
      .getByRole("heading", { name: "Welcome to Your Blank App" })
      .click();

    // Send a prompt with the selected component
    await po.sendPrompt("[dump] make it smaller");

    // Check that the server received the selected component
    await po.snapshotServerDump("last-message");

    // The dump should include selectedComponents information
    const dumpText = po.page.locator("code").last();
    const text = await dumpText.textContent();

    // Should contain selectedComponents
    expect(text).toContain("selectedComponents");
  },
);

testSkipIfWindows(
  "PR4: Clear all selected components removes all selections",
  async ({ po }) => {
    await po.setUp();
    await po.sendPrompt("tc=basic");
    await po.clickTogglePreviewPanel();
    await po.clickPreviewPickElement();

    // Select multiple components
    await po
      .getPreviewIframeElement()
      .contentFrame()
      .getByRole("heading", { name: "Welcome to Your Blank App" })
      .click();

    await po
      .getPreviewIframeElement()
      .contentFrame()
      .getByText("Start building your amazing project here!")
      .click();

    // Verify both are selected
    await expect(po.getSelectedComponentsDisplay()).toBeVisible();

    // Click "Clear all"
    const clearAllButton = po.page.getByRole("button", {
      name: /Clear all/i,
    });
    await clearAllButton.click();

    // Selection display should disappear
    await expect(po.getSelectedComponentsDisplay()).not.toBeVisible();
  },
);
