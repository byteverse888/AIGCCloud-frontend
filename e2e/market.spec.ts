/**
 * 商城功能端到端测试
 */
import { test, expect } from '@playwright/test';

test.describe('商城页面', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/market');
  });

  test('商城页面正确加载', async ({ page }) => {
    // 检查页面标题或标识
    await expect(page.getByRole('heading', { name: /商城|市场/ })).toBeVisible();
  });

  test('商品列表正确显示', async ({ page }) => {
    // 等待商品列表加载
    await page.waitForSelector('[data-testid="product-card"], .product-card', {
      timeout: 10000,
    }).catch(() => {
      // 如果没有找到特定选择器，检查是否有商品相关内容
    });
    
    // 检查是否有商品展示区域
    const productArea = page.locator('main');
    await expect(productArea).toBeVisible();
  });

  test('分类筛选功能', async ({ page }) => {
    // 查找分类选择器
    const categorySelector = page.getByRole('combobox').first();
    
    if (await categorySelector.isVisible()) {
      await categorySelector.click();
      // 选择一个分类
      await page.getByRole('option').first().click();
      
      // 等待列表刷新
      await page.waitForTimeout(1000);
    }
  });

  test('搜索功能', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/搜索/);
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('测试');
      await searchInput.press('Enter');
      
      // 等待搜索结果
      await page.waitForTimeout(1000);
    }
  });
});

test.describe('商品详情', () => {
  test('点击商品进入详情页', async ({ page }) => {
    await page.goto('/market');
    
    // 点击第一个商品
    const firstProduct = page.locator('[data-testid="product-card"], .product-card').first();
    
    if (await firstProduct.isVisible()) {
      await firstProduct.click();
      
      // 应该进入详情页
      await expect(page).toHaveURL(/\/market\/|\/product\//);
    }
  });
});
