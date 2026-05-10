/**
 * 运营订单处理端到端测试
 */
import { test, expect } from '@playwright/test';

test.describe('运营端页面访问', () => {
  test('访问运营统计页面', async ({ page }) => {
    await page.goto('/operator');
    
    // 页面应该加载
    await expect(page).toHaveURL(/\/operator/);
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('运营端订单管理页面', async ({ page }) => {
    await page.goto('/operator/orders');
    
    // 页面应该加载
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('管理端页面访问', () => {
  test('访问管理后台', async ({ page }) => {
    await page.goto('/admin');
    
    // 页面应该加载
    await expect(page).toHaveURL(/\/admin/);
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('管理端用户管理页面', async ({ page }) => {
    await page.goto('/admin/users');
    
    // 页面应该加载
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('管理端商品管理页面', async ({ page }) => {
    await page.goto('/admin/products');
    
    // 页面应该加载
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});