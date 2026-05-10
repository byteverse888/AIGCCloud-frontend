/**
 * 认证相关端到端测试
 */
import { test, expect } from '@playwright/test';

test.describe('认证流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('访问首页应该显示登录入口', async ({ page }) => {
    // 检查页面标题
    await expect(page).toHaveTitle(/AIGC/);
    
    // 检查是否有登录按钮/链接
    const loginButton = page.getByRole('link', { name: /登录/i });
    await expect(loginButton).toBeVisible();
  });

  test('点击登录按钮跳转到登录页', async ({ page }) => {
    await page.click('text=登录');
    await expect(page).toHaveURL(/\/login/);
  });

  test('登录页面元素完整性', async ({ page }) => {
    await page.goto('/login');
    
    // 检查表单元素
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /登录/i })).toBeVisible();
    
    // 检查注册链接
    await expect(page.getByText(/注册/)).toBeVisible();
  });

  test('空表单提交应显示错误', async ({ page }) => {
    await page.goto('/login');
    
    // 点击登录按钮
    await page.click('button[type="submit"]');
    
    // 应该显示验证错误
    await expect(page.getByText(/必填|请输入/)).toBeVisible();
  });

  test('错误的凭证应显示错误消息', async ({ page }) => {
    await page.goto('/login');
    
    // 填写错误的凭证
    await page.fill('input[name="username"]', 'wronguser');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // 应该显示错误消息
    await expect(page.getByText(/错误|失败/)).toBeVisible({ timeout: 10000 });
  });

  test('注册页面元素完整性', async ({ page }) => {
    await page.goto('/register');
    
    // 检查表单元素
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /注册/i })).toBeVisible();
  });
});

test.describe('管理后台访问控制', () => {
  test.skip('未登录用户访问/admin应被重定向或提示', async ({ page }) => {
    await page.goto('/admin');
    
    // 应该被重定向到登录页或显示登录提示
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    const isRedirected = currentUrl.includes('/login');
    const hasLoginPrompt = await page.getByText(/登录|请先登录|需要登录/).isVisible().catch(() => false);
    const isOnAdmin = currentUrl.includes('/admin');
    
    // 如果还在admin页面，检查是否有权限提示
    if (isOnAdmin) {
      const hasPermissionError = await page.getByText(/权限|无权访问|403/).isVisible().catch(() => false);
      expect(hasLoginPrompt || hasPermissionError).toBeTruthy();
    } else {
      expect(isRedirected).toBeTruthy();
    }
  });
});
