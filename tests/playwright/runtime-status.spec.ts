import { test, expect } from "@playwright/test";

test.describe("Runtime Status Indicator", () => {
  test("should show green status when runtime is healthy", async ({ page }) => {
    // Navigate to the notebook with a specific notebook ID
    await page.goto("");

    // Wait for the page to load and the runtime status indicator to appear
    await page.waitForSelector('[data-testid="runtime-status-indicator"]', {
      timeout: 30000,
    });

    // Get the runtime status indicator element
    const statusIndicator = page.locator(
      '[data-testid="runtime-status-indicator"]'
    );

    // Check that the element exists
    await expect(statusIndicator).toBeVisible();

    // Wait up to 30 seconds for the status to turn green
    console.log("Waiting for runtime status to turn green...");
    await expect(async () => {
      const className = await statusIndicator.getAttribute("class");
      console.log("Current runtime status classes:", className);
      expect(className).toContain("text-green-500");
    }).toPass({ timeout: 30000 });

    console.log("Runtime status is now green!");
  });
});
