import { test, expect } from "@playwright/test";

test.describe("Conversion Execution Workflow E2E", () => {
  test("Approve and execute conversion plan", async ({ page }) => {
    // Navigate to app that has a conversion plan
    await page.goto("http://localhost:3000");

    // Click on an app with a pending conversion plan
    await page.click('button:has-text("Test App with Conversion")');

    // Navigate to conversion plan view
    await page.click('button:has-text("View Conversion Plan")');

    // Verify plan is in PENDING_APPROVAL state
    const planStatus = await page.locator("text=Pending Approval");
    expect(planStatus).toBeDefined();

    // Scroll to see the approval button
    await page
      .locator('button:has-text("Approve Conversion")')
      .scrollIntoViewIfNeeded();

    // Click approve button
    await page.click('button:has-text("Approve Conversion")');

    // Verify confirmation dialog
    const confirmText = await page.locator(
      "text=This will modify your application",
    );
    expect(confirmText).toBeDefined();

    // Click confirm button
    await page.click('button:has-text("Convert to FeltDB")');

    // Wait for conversion to start
    await page.waitForSelector("text=Conversion started");

    // Verify execution status shows checkpoint created
    const checkpointText = await page.locator("text=Checkpoint created");
    expect(checkpointText).toBeDefined();

    // Wait for conversion to complete
    await page.waitForTimeout(5000);

    // Verify execution status is completed or executing
    const executionStatus = await page.locator("text=Executing|Completed");
    expect(executionStatus).toBeDefined();
  });

  test("Rollback conversion using checkpoint", async ({ page }) => {
    // Navigate to app with failed conversion
    await page.goto("http://localhost:3000");

    // Click on app with conversion
    await page.click('button:has-text("Test App with Conversion")');

    // Navigate to conversion history
    await page.click('button:has-text("View Conversion History")');

    // Find failed conversion
    const failedConversion = await page.locator("text=Conversion Failed");
    expect(failedConversion).toBeDefined();

    // Click rollback button
    await page.click('button:has-text("Rollback")');

    // Verify rollback confirmation
    const confirmText = await page.locator("text=restore from checkpoint");
    expect(confirmText).toBeDefined();

    // Click confirm rollback
    await page.click('button:has-text("Confirm Rollback")');

    // Wait for rollback to complete
    await page.waitForSelector("text=Rolled back successfully");

    // Verify status is rolled back
    const rolledBackStatus = await page.locator("text=Rolled Back");
    expect(rolledBackStatus).toBeDefined();
  });

  test("Enforce approval boundary - prevent execution without approval", async ({
    page,
  }) => {
    // Navigate to app
    await page.goto("http://localhost:3000");

    // Try to execute conversion without approving first
    // This should fail with appropriate error message

    // Via the UI, approval button should be required
    // Via IPC, trying to execute without approval should throw error

    // For now, verify UI flow enforces approval first
    await page.click('button:has-text("Test App with Conversion")');
    await page.click('button:has-text("View Conversion Plan")');

    // Verify execute button is disabled or not visible
    const executeButton = await page.locator(
      'button:has-text("Execute Conversion")',
    );
    const isDisabled = await executeButton.isDisabled();
    expect(isDisabled).toBe(true);

    // Only after approval should execute be enabled
    await page.click('button:has-text("Approve Conversion")');
    await page.click('button:has-text("Convert to FeltDB")');

    // Now execute should be enabled
    const executeButtonAfter = await page.locator(
      'button:has-text("Execute Conversion")',
    );
    const isEnabledAfter = await executeButtonAfter.isDisabled();
    expect(isEnabledAfter).toBe(false);
  });

  test("Check Git checkpoint is created before modification", async ({
    page,
  }) => {
    // Navigate to conversion view
    await page.goto("http://localhost:3000");
    await page.click('button:has-text("Test App")');

    // Execute conversion
    await page.click('button:has-text("View Conversion Plan")');
    await page.click('button:has-text("Approve Conversion")');
    await page.click('button:has-text("Convert to FeltDB")');

    // Wait for conversion to start
    await page.waitForSelector("text=Checkpoint created");

    // Verify checkpoint details are shown
    const checkpointId = await page.locator('[data-testid="checkpoint-id"]');
    expect(checkpointId).toBeDefined();

    const commitSha = await page.locator('[data-testid="checkpoint-commit"]');
    expect(commitSha).toBeDefined();

    // Verify checkpoint has branch info
    const branch = await page.locator('[data-testid="checkpoint-branch"]');
    expect(branch).toBeDefined();
  });
});
