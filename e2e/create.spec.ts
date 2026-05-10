/**
 * AI创作功能端到端测试
 */
import { test, expect } from '@playwright/test';

test.describe('AI创作页面', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/create');
  });

  test('创作页面正确加载', async ({ page }) => {
    // 页面应该能正常加载
    await expect(page).toHaveURL(/\/create/);
    // 检查页面是否有内容（body 不为空）
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('页面标题或标识存在', async ({ page }) => {
    // 检查页面是否有标题或主要内容区域
    const main = page.locator('main').first();
    const heading = page.locator('h1, h2').first();
    const hasMain = await main.isVisible().catch(() => false);
    const hasHeading = await heading.isVisible().catch(() => false);
    expect(hasMain || hasHeading).toBeTruthy();
  });
});
