# Playwright E2E Tests

This directory contains end-to-end tests for the Anode notebook application using Playwright.

## Test Overview

The tests verify that:

- The runtime status indicator appears correctly
- The status indicator shows green when the runtime is healthy
- The application loads properly with a specific notebook ID

## Running Tests

### Prerequisites

1. Install Playwright browsers:

   ```bash
   npx playwright install
   ```

2. Make sure you have the required dependencies:
   ```bash
   pnpm install
   ```

### Running Tests

1. **Run all tests (headless):**

   ```bash
   pnpm test:e2e
   ```

2. **Run tests with UI (interactive):**

   ```bash
   pnpm test:e2e:ui
   ```

3. **Run tests in headed mode (visible browser):**

   ```bash
   pnpm test:e2e:headed
   ```

4. **Run a specific test file:**
   ```bash
   npx playwright test runtime-status.spec.ts
   ```

## Test Configuration

The tests are configured in `playwright.config.ts` at the project root. The configuration:

- Uses Chromium browser
- Starts the development server with `NOTEBOOK_ID=test-notebook pnpm dev`
- Waits for the server to be available at `http://localhost:5173`
- Sets appropriate timeouts for runtime startup

## Test Structure

- `runtime-status.spec.ts` - Tests the runtime status indicator functionality
  - Verifies the indicator appears with correct styling
  - Checks that the status turns green when runtime is healthy
  - Monitors status changes over time

## Troubleshooting

If tests fail:

1. **Runtime not connecting:** The tests include wait times for the runtime to connect. If the runtime takes longer than expected, you may need to increase the timeout values.

2. **Server not starting:** Make sure all dependencies are installed and the development environment is properly configured.

3. **Browser issues:** Try running with `--headed` flag to see what's happening in the browser.

## Notes

- The tests use a specific notebook ID (`test-notebook`) to ensure consistent behavior
- The runtime startup process may take 10-25 seconds, which is accounted for in the test timeouts
- Tests include console logging to help debug runtime status changes
