import { test, expect } from "@playwright/test";

test.describe.serial("Session Signatures Page", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/session-signatures");
    });

    async function testOperationFlow(page: any, operationId: string) {
        // Verify initial state
        const button = page.getByTestId(`button-${operationId}`);
        await expect(button).toBeEnabled();
        await expect(button).toBeVisible();
        await expect(
            page.getByTestId(`success-${operationId}`)
        ).not.toBeVisible();
        await expect(
            page.getByTestId(`loading-${operationId}`)
        ).not.toBeVisible();

        // Click the button and verify loading state
        await button.click();
        await expect(button).toBeDisabled();
        await expect(page.getByTestId(`loading-${operationId}`)).toBeVisible();

        // Wait for success message (assuming the operation succeeds)
        await expect(page.getByTestId(`success-${operationId}`)).toBeVisible({
            timeout: 30000,
        });

        // Verify final state
        await expect(button).toBeEnabled();
        await expect(
            page.getByTestId(`loading-${operationId}`)
        ).not.toBeVisible();
    }

    test("Lit Action operation shows correct states", async ({ page }) => {
        await testOperationFlow(page, "litAction");
    });

    test("PKP operation shows correct states", async ({ page }) => {
        await testOperationFlow(page, "pkp");
    });

    test("AuthSig operation shows correct states", async ({ page }) => {
        await testOperationFlow(page, "authSig");
    });
});