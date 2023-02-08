import { expect, test } from '@playwright/test';

test('three child elements should be rendered', async ({ page }) => {
	await page.goto('/');

	expect(await page.getByTestId('grid-item').count()).toBe(3);
});

test('the initialized callback should have run', async ({ page }) => {
	await page.goto('/');

	setTimeout(async () => {
		expect(await page.getByTestId('initialized').innerText()).toBe('true');
	}, 500);
});

test('adding items should make the layoutComplete event run once', async ({ page }) => {
	await page.goto('/');

	const button = page.getByTestId('add-button');

	expect(button).toBeDefined();

	await button.click();

	setTimeout(async () => {
		expect(await page.getByTestId('layout-runs').innerText()).toBe('1');
		expect(await page.getByTestId('grid-item').count()).toBe(4);
	}, 500);
});
