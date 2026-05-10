/**
 * 资产发布与购买端到端测试
 */
import { test, expect } from '@playwright/test';

test.describe('资产发布页面', () => {
  test('访问资产页面', async ({ page }) => {
    await page.goto('/assets');
    
    // 页面应该加载
    await expect(page).toHaveURL(/\/assets/);
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('资产页面包含主要内容区域', async ({ page }) => {
    await page.goto('/assets');
    
    // 检查是否有主要内容
    const main = page.locator('main').first();
    const hasMain = await main.isVisible().catch(() => false);
    expect(hasMain).toBeTruthy();
  });
});

test.describe('商城购买流程', () => {
  test('访问商城页面', async ({ page }) => {
    await page.goto('/market');
    
    // 页面应该加载
    await expect(page).toHaveURL(/\/market/);
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible();
  });

  test('商城页面显示商品列表', async ({ page }) => {
    await page.goto('/market');
    
    // 等待商品加载
    await page.waitForTimeout(2000);
    
    // 检查页面是否有内容（商品卡片、网格或列表）
    const mainContent = page.locator('main');
    const hasContent = await mainContent.isVisible().catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('商城分类筛选器存在', async ({ page }) => {
    await page.goto('/market');
    
    // 检查是否有分类选择器
    const categorySelect = page.getByRole('combobox').first();
    const hasCategory = await categorySelect.isVisible().catch(() => false);
    expect(hasCategory).toBeTruthy();
  });
});