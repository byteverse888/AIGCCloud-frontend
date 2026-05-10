/**
 * 完整端到端流程测试
 * 注册 → 登录 → 浏览商城 → 访问资产页面
 */
import { test, expect } from '@playwright/test';

const TEST_USER = {
  username: `flow_test_${Date.now()}`,
  email: `flow_test_${Date.now()}@example.com`,
  password: 'Test123456',
};

test.describe.serial('完整端到端流程', () => {
  test('完整流程：注册 → 登录 → 访问资产和商城', async ({ page, request }) => {
    // ===== 步骤1: 通过 Parse API 直接创建已验证用户（绕过邮件激活） =====
    const createUserResponse = await request.post('http://localhost:1337/parse/users', {
      headers: {
        'X-Parse-Application-Id': 'aigccloud',
        'X-Parse-Master-Key': 'masterkey123',
        'Content-Type': 'application/json',
      },
      data: {
        username: TEST_USER.username,
        email: TEST_USER.email,
        password: TEST_USER.password,
        emailVerified: true,
        role: 'user',
      }
    });
    
    const userData = await createUserResponse.json();
    console.log('Parse用户创建状态:', createUserResponse.status(), userData.objectId);
    
    // ===== 步骤2: 后端API登录获取JWT =====
    const loginResponse = await request.post('http://localhost:8001/api/v1/auth/login', {
      data: {
        username: TEST_USER.username,
        password: TEST_USER.password,
      }
    });
    
    const loginData = await loginResponse.json();
    console.log('后端登录状态:', loginResponse.status(), loginData.success);
    
    expect(loginData.success).toBeTruthy();
    const jwtToken = loginData.token;
    
    // ===== 步骤3: 在前端设置登录状态（绕过登录表单） =====
    await page.goto('/login');
    
    // 通过 localStorage 设置 JWT token，模拟登录状态
    await page.evaluate(({ token, user }) => {
      localStorage.setItem('aigccloud_auth_token', token);
      localStorage.setItem('aigccloud_user', JSON.stringify(user));
    }, { 
      token: jwtToken, 
      user: {
        objectId: userData.objectId,
        username: TEST_USER.username,
        email: TEST_USER.email,
        role: 'user',
      }
    });
    
    // 刷新页面以应用登录状态
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    const currentUrl = page.url();
    console.log('登录后首页URL:', currentUrl);
    
    // 验证已登录（不在登录页）
    expect(currentUrl).not.toContain('/login');
    
    // ===== 步骤4: 访问资产页面 =====
    await page.goto('/assets');
    await expect(page).toHaveURL(/\/assets/);
    const body = page.locator('body');
    await expect(body).toBeVisible();
    console.log('资产页面访问成功');
    
    // ===== 步骤5: 访问商城页面 =====
    await page.goto('/market');
    await expect(page).toHaveURL(/\/market/);
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible();
    console.log('商城页面访问成功');
    
    // ===== 清理：删除测试用户 =====
    await request.delete(`http://localhost:1337/parse/users/${userData.objectId}`, {
      headers: {
        'X-Parse-Application-Id': 'aigccloud',
        'X-Parse-Master-Key': 'masterkey123',
      }
    });
    console.log('测试用户已清理');
  });

  test('首页导航到登录页', async ({ page }) => {
    await page.goto('/');
    
    // 点击登录链接
    const loginLink = page.getByRole('link', { name: /登录/i });
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    
    // 应该跳转到登录页
    await expect(page).toHaveURL(/\/login/);
    
    // 检查登录表单
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });
});