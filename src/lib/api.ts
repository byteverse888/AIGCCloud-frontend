const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * 获取当前用户的 JWT Token（从 Zustand store 中读取）
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('auth-storage');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.user?.jwtToken || null;
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchApi<T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const { headers: customHeaders, ...restOptions } = options || {};
  
  // 自动注入 JWT Token
  const token = getAuthToken();
  const authHeaders: Record<string, string> = {};
  if (token) {
    authHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...customHeaders,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// User API
export const userApi = {
  register: (data: { email: string; password: string; username: string }) =>
    fetchApi('/api/v1/users/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  registerPhone: (data: { phone: string; code: string; password: string; username?: string }) =>
    fetchApi('/api/v1/users/register-phone', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  activate: (token: string) =>
    fetchApi(`/api/v1/users/activate/${token}`, { method: 'POST' }),

  bindWeb3: (userId: string, web3Address: string) =>
    fetchApi('/api/v1/users/bind-web3', {
      method: 'POST',
      body: JSON.stringify({ userId, web3Address }),
    }),

  verifyWeb3: (address: string) =>
    fetchApi(`/api/v1/users/verify-web3/${address}`),

  withdraw: (data: { amount: number; method: string; account: string; account_name: string; bank_name?: string }) =>
    fetchApi('/api/v1/users/withdraw', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Auth API
export const authApi = {
  sendSms: (phone: string, type: 'login' | 'register' = 'login') =>
    fetchApi('/api/v1/auth/send-sms', {
      method: 'POST',
      body: JSON.stringify({ phone, type }),
    }),

  phoneLogin: (phone: string, code: string) =>
    fetchApi('/api/v1/auth/phone-login', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    }),

  login: (
    username: string,
    password: string,
    captcha?: { captcha_id: string; captcha_text: string },
  ) =>
    fetchApi('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username,
        password,
        captcha_id: captcha?.captcha_id,
        captcha_text: captcha?.captcha_text,
      }),
    }),

  // 获取图形验证码
  getCaptcha: () =>
    fetchApi<{ captcha_id: string; image: string }>('/api/v1/auth/captcha'),

  // 站点公开配置（不需鉴权）
  getPublicConfig: () =>
    fetchApi<{
      success: boolean;
      data: {
        siteName: string;
        productName: string;
        siteUrl: string;
        contactEmail: string;
        contactPhone: string;
        icp: string;
        policeICP: string;
        footerText: string;
        footerCopyright: string;
        lightLogo: string;
        darkLogo: string;
        favicon: string;
        loginBg: string;
        loginCaptcha: boolean;
      };
    }>('/api/v1/auth/public-config'),

  // Web3 认证
  web3Init: (address: string) =>
    fetchApi<{
      success: boolean;
      nonce: string;
      message: string;
      address: string;
    }>('/api/v1/auth/web3/init', {
      method: 'POST',
      body: JSON.stringify({ address }),
    }),

  // Web3 注册
  web3Register: (address: string, signature: string, message: string, password: string) =>
    fetchApi<{
      success: boolean;
      token: string;
      user: {
        objectId: string;
        username: string;
        email?: string;
        phone?: string;
        role: string;
        level: number;
        memberLevel: 'normal' | 'vip' | 'svip';
        avatar?: string;
        avatarKey?: string;
        web3Address: string;
        inviteCount: number;
      };
      is_new_user: boolean;
      message: string;
    }>('/api/v1/auth/web3/register', {
      method: 'POST',
      body: JSON.stringify({ address, signature, message, password }),
    }),

  // Web3 登录
  web3Login: (address: string, signature: string, message: string, password: string) =>
    fetchApi<{
      success: boolean;
      token: string;
      user: {
        objectId: string;
        username: string;
        email?: string;
        phone?: string;
        role: string;
        level: number;
        memberLevel: 'normal' | 'vip' | 'svip';
        avatar?: string;
        avatarKey?: string;
        web3Address: string;
        inviteCount: number;
      };
      is_new_user: boolean;
      message: string;
    }>('/api/v1/auth/web3/login', {
      method: 'POST',
      body: JSON.stringify({ address, signature, message, password }),
    }),

  // 邮箱注册
  emailRegister: (email: string, password: string) =>
    fetchApi<{
      success: boolean;
      message: string;
      email: string;
    }>('/api/v1/auth/email/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  // 邮箱激活
  emailActivate: (token: string) =>
    fetchApi<{
      success: boolean;
      message: string;
      email: string;
    }>(`/api/v1/auth/email/activate?token=${token}`),

  // 邮箱登录
  emailLogin: (
    email: string,
    password: string,
    captcha?: { captcha_id: string; captcha_text: string },
  ) =>
    fetchApi<{
      success: boolean;
      token: string;
      user: {
        objectId: string;
        sessionToken: string;
        username: string;
        email?: string;
        phone?: string;
        role: string;
        level: number;
        memberLevel: 'normal' | 'vip' | 'svip';
        memberExpireAt?: string;
        avatar?: string;
        avatarKey?: string;
        web3Address?: string;
        inviteCount: number;
      };
      message: string;
    }>('/api/v1/auth/email/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        captcha_id: captcha?.captcha_id,
        captcha_text: captcha?.captcha_text,
      }),
    }),
};

// Payment API
export const paymentApi = {
  createOrder: (data: { 
    user_id: string; 
    amount: number; 
    type: string;
    plan?: string;
    product_id?: string;
    payment_method?: string;
  }, sessionToken?: string) =>
    fetchApi('/api/v1/payment/create-order', {
      method: 'POST',
      headers: sessionToken ? { 'X-Parse-Session-Token': sessionToken } : {},
      body: JSON.stringify(data),
    }),

  createCartOrder: (data: {
    user_id: string;
    items: Array<{
      product_id: string;
      name: string;
      price: number;
      quantity: number;
    }>;
    payment_method?: string;
  }) =>
    fetchApi('/api/v1/payment/create-cart-order', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  queryOrder: (orderId: string) =>
    fetchApi(`/api/v1/payment/order/${orderId}`),

  getSubscriptionPlans: () =>
    fetchApi('/api/v1/payment/plans'),
  
  cancelOrder: (orderId: string) =>
    fetchApi(`/api/v1/payment/order/${orderId}/cancel`, {
      method: 'POST',
    }),
  
  mockPay: (orderId: string) =>
    fetchApi(`/api/v1/payment/order/${orderId}/mock-pay`, {
      method: 'POST',
    }),
};

// Task API
export const taskApi = {
  submitTask: (data: {
    type: string;
    model: string;
    data: Record<string, unknown>;
    userId: string;
  }) =>
    fetchApi('/api/v1/tasks/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getTaskStatus: (taskId: string) =>
    fetchApi(`/api/v1/tasks/${taskId}`),

  getUserTasks: (userId: string, page = 1, limit = 20) =>
    fetchApi(`/api/v1/tasks/user/${userId}?page=${page}&limit=${limit}`),

  retryTask: (taskId: string, userId: string) =>
    fetchApi(`/api/v1/tasks/${taskId}/retry`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  convertTaskToAsset: (taskId: string) =>
    fetchApi<{ success: boolean; asset_id: string }>(
      `/api/v1/tasks/ai-task/${taskId}/convert`,
      { method: 'POST' }
    ),
};

// Incentive API
export const incentiveApi = {
  claimDailyReward: (userId: string) =>
    fetchApi('/api/v1/incentive/daily', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  getIncentiveHistory: (userId: string, page = 1, limit = 20) =>
    fetchApi(`/api/v1/incentive/history/${userId}?page=${page}&limit=${limit}`),

  // 获取余额汇总（账户积分 + 链上金币；未绑 web3 时 coins=null）
  getBalance: () =>
    fetchApi<{
      balance: number;              // 账户积分（totalIncentive）
      coins: number | null;         // 链上金币（未绑 web3 时为 null）
      web3_address?: string | null;
      member_level: string;
    }>('/api/v1/incentive/balance'),

  // 获取账户积分余额
  getAccountBalance: () =>
    fetchApi<{ balance: number; user_id: string }>(
      '/api/v1/incentive/account-balance'
    ),

  // 每日签到
  dailySign: () =>
    fetchApi<{
      success: boolean;
      signed?: boolean;
      amount?: number;
      balance_after?: number;
      continuousDays?: number;
      message?: string;
    }>('/api/v1/incentive/daily-sign', { method: 'POST' }),

  // 签到状态
  getDailySignStatus: () =>
    fetchApi<{ signed: boolean; continuousDays: number; date: string }>(
      '/api/v1/incentive/daily-sign/status'
    ),

  // 兑换比例
  getExchangeRate: () =>
    fetchApi<{ points: number; coins: number }>(
      '/api/v1/incentive/exchange-rate'
    ),

  // 账户积分 → 链上金币
  exchangeToWeb3: (amount: number) =>
    fetchApi<{
      success: boolean;
      points?: number;     // 已扣账户积分
      coins?: number;      // 已铸造链上金币
      tx_hash?: string;
      message?: string;
      error?: string;
    }>('/api/v1/incentive/exchange-to-web3', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),

  // 链上金币 → 账户积分
  exchangeToBalance: (amount: number) =>
    fetchApi<{
      success: boolean;
      coins?: number;      // 已销毁链上金币
      points?: number;     // 已到账账户积分
      tx_hash?: string;
      message?: string;
      error?: string;
    }>('/api/v1/incentive/exchange-to-balance', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),
};

// Promotion API
export const promotionApi = {
  getPromotionLink: (userId: string) =>
    fetchApi(`/api/v1/promotion/link/${userId}`),

  getPromotionStats: (userId: string) =>
    fetchApi(`/api/v1/promotion/stats/${userId}`),
};

// Member API
export const memberApi = {
  // 获取会员套餐列表
  getPlans: () =>
    fetchApi<Array<{
      plan_id: string;
      name: string;
      level: string;
      days: number;
      price: number;
      original_price: number;
      discount: number;
      bonus: number;
    }>>('/api/v1/member/plans'),

  // 创建订阅订单
  subscribe: (data: {
    user_id: string;
    plan_id: string;
    openid?: string;
  }) =>
    fetchApi<{
      success: boolean;
      order_id?: string;
      pay_params?: {
        prepay_id?: string;
        code_url?: string;
        test_mode?: boolean;
      };
      message?: string;
    }>('/api/v1/member/subscribe', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 模拟支付（测试模式）
  simulatePay: (data: { order_id: string }) =>
    fetchApi<{
      success: boolean;
      order_id?: string;
      message?: string;
    }>('/api/v1/member/simulate-pay', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 获取会员状态
  getStatus: (userId: string) =>
    fetchApi<{
      member_level: string;
      member_expire_at?: string;
      is_expired: boolean;
    }>(`/api/v1/member/status/${userId}`),

  // 获取订阅记录
  getOrders: (userId: string, limit = 20, skip = 0) =>
    fetchApi<{
      orders: Array<{
        orderId: string;
        planId: string;
        planName: string;
        level: string;
        days: number;
        amount: number;
        bonus: number;
        status: string;
        createdAt: string;
        paidAt?: string;
      }>;
      total: number;
    }>(`/api/v1/member/orders/${userId}?limit=${limit}&skip=${skip}`),

  // 查询订单支付状态（轮询用）
  checkOrderStatus: (orderId: string) =>
    fetchApi<{
      order_id: string;
      status: 'pending' | 'paid' | 'failed' | 'cancelled';
      paid_at?: string;
    }>(`/api/v1/member/order-status/${orderId}`),
};

// Wallet API
export const walletApi = {
  // 创建钱包（将加密后的 keystore 保存到服务器）
  createWallet: (web3Address: string, encryptedKeystore: string) =>
    fetchApi<{
      success: boolean;
      message: string;
      web3Address: string;
    }>('/api/v1/users/wallet/create', {
      method: 'POST',
      body: JSON.stringify({ web3_address: web3Address, encrypted_keystore: encryptedKeystore }),
    }),

  // 导入钱包
  importWallet: (web3Address: string, encryptedKeystore: string) =>
    fetchApi<{
      success: boolean;
      message: string;
      web3Address: string;
    }>('/api/v1/users/wallet/import', {
      method: 'POST',
      body: JSON.stringify({ web3_address: web3Address, encrypted_keystore: encryptedKeystore }),
    }),

  // 转账（使用密码解密 keystore 后转账）
  transfer: (toAddress: string, amount: string, password: string) =>
    fetchApi<{
      success: boolean;
      message: string;
      txHash: string;
      from: string;
      to: string;
      amount: string;
    }>('/api/v1/users/wallet/transfer', {
      method: 'POST',
      body: JSON.stringify({ to_address: toAddress, amount, password }),
    }),

  // 解绑钱包
  unbindWallet: () =>
    fetchApi<{
      success: boolean;
      message: string;
    }>('/api/v1/users/wallet/unbind', {
      method: 'POST',
    }),
};

// Storage API
export const storageApi = {
  // 预签名上传
  presignUpload: (data: { filename: string; content_type?: string; prefix?: string }) =>
    fetchApi<{
      upload_url: string;
      file_url: string;
      file_key: string;
      expires_in: number;
    }>('/api/v1/storage/presign/upload', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 预签名下载
  presignDownload: (fileKey: string) =>
    fetchApi<{
      download_url: string;
      expires_in: number;
    }>('/api/v1/storage/presign/download', {
      method: 'POST',
      body: JSON.stringify({ file_key: fileKey }),
    }),

  // 批量预签名上传
  presignBatchUpload: (
    data: { files: Array<{ filename: string; content_type?: string }>; prefix?: string }
  ) =>
    fetchApi<{
      files: Array<{
        filename: string;
        upload_url: string;
        file_url: string;
        file_key: string;
      }>;
      expires_in: number;
    }>('/api/v1/storage/presign/batch-upload', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 删除文件
  deleteFile: (fileKey: string) =>
    fetchApi<{ success: boolean; message: string }>(
      `/api/v1/storage/file/${fileKey}`,
      { method: 'DELETE' }
    ),
};

// Admin API
export const adminApi = {
  // 用户统计
  statsUsers: () =>
    fetchApi<{
      total_users: number;
      today_new: number;
      role_distribution: Record<string, number>;
    }>('/api/v1/admin/stats/users'),

  // 订单统计
  statsOrders: () =>
    fetchApi<{
      total: number;
      today_count: number;
      status_distribution: Record<string, number>;
      daily_trend: number[];
      average_order_value: number;
    }>('/api/v1/admin/stats/orders'),

  // 商品统计
  statsProducts: () =>
    fetchApi<{
      total: number;
      status_distribution: Record<string, number>;
      category_distribution: Array<{ category: string; count: number }>;
      top_products: Array<{ id: string; name: string; category: string; sales: number; revenue: number }>;
      pending_reports: number;
    }>('/api/v1/admin/stats/products'),

  // 收入统计
  statsRevenue: () =>
    fetchApi<{
      total_revenue: number;
      this_month: number;
      last_month: number;
      today: number;
      payment_methods: Array<{ method: string; amount: number; percentage: number }>;
      daily_trend: number[];
    }>('/api/v1/admin/stats/revenue'),

  // 管理员订单列表
  listOrders: (params: { page?: number; limit?: number; status?: string; search?: string; buyerUserId?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.status) qs.set('status', params.status);
    if (params.search) qs.set('search', params.search);
    if (params.buyerUserId) qs.set('buyer_user_id', params.buyerUserId);
    return fetchApi<{
      data: Array<{
        id: string;
        orderNo: string;
        user: string;
        userId: string;
        amount: number;
        status: string;
        type: string;
        paymentMethod: string;
        createdAt: string;
      }>;
      total: number;
      page: number;
      limit: number;
    }>(`/api/v1/admin/orders?${qs.toString()}`);
  },

  // 用户列表
listUsers: (params: { page?: number; limit?: number; role?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.role) qs.set('role', params.role);
    return fetchApi<{
      data: Array<Record<string, unknown>>;
      total: number;
      page: number;
      limit: number;
    }>(`/api/v1/users/admin/list?${qs.toString()}`);
  },

  // 管理员创建用户
  createUser: (data: {
    username: string;
    password: string;
    email?: string;
    phone?: string;
    role: string;
    level?: number;
    active?: boolean;
  }) =>
    fetchApi<{ success: boolean; user_id: string; objectId: string }>('/api/v1/users/admin/create', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 商品审核
  reviewProduct: (data: { product_id: string; status: string; review_note?: string }) =>
    fetchApi<{ success: boolean; product_id: string; status: string }>('/api/v1/products/review', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 批量审核
  batchReviewProducts: (data: { product_ids: string[]; status: string; review_note?: string }) =>
    fetchApi('/api/v1/products/batch-review', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 待审核商品列表
  getPendingProducts: (params: { page?: number; limit?: number; category?: string; status?: string; creatorId?: string; keyword?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.category) qs.set('category', params.category);
    if (params.status) qs.set('status', params.status);
    if (params.creatorId) qs.set('creator_id', params.creatorId);
    if (params.keyword) qs.set('keyword', params.keyword);
    return fetchApi<{
      data: Array<Record<string, unknown>>;
      total: number;
      page: number;
      limit: number;
    }>(`/api/v1/products/pending?${qs.toString()}`);
  },

  // AI 任务列表（管理员）
  listTasks: (params: { page?: number; limit?: number; type?: string; status?: number; designer?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.type) qs.set('type', params.type);
    if (params.status !== undefined && params.status !== null) qs.set('status', String(params.status));
    if (params.designer) qs.set('designer', params.designer);
    return fetchApi<{
      data: Array<{
        objectId: string;
        task_id: string;
        type: string;
        model: string;
        status: number;
        designer: string;
        username: string;
        results?: unknown;
        errorMessage?: string;
        data?: Record<string, unknown>;
        cost?: number;
        created_at: string;
        updated_at?: string;
      }>;
      total: number;
      page: number;
      limit: number;
    }>(`/api/v1/tasks/admin/list?${qs.toString()}`);
  },

  // 管理员/运营删除 AI 任务
  deleteAdminTask: (taskObjectId: string) =>
    fetchApi<{ success: boolean; task_id?: string }>(`/api/v1/tasks/admin/${taskObjectId}`, {
      method: 'DELETE',
    }),

  // AI 资产列表（管理员/运营）
  listAdminAssets: (params: { page?: number; limit?: number; status?: string; category?: string; keyword?: string; ownerId?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.status) qs.set('status', params.status);
    if (params.category) qs.set('category', params.category);
    if (params.keyword) qs.set('keyword', params.keyword);
    if (params.ownerId) qs.set('owner_id', params.ownerId);
    return fetchApi<{
      data: Array<{
        id: string;
        objectId: string;
        name: string;
        description: string;
        category: string;
        price: number;
        status: string;
        cover: string;
        assetUrl: string;
        ownerId: string;
        ownerName: string;
        isListed: boolean;
        listedProductId: string;
        views: number;
        createdAt: string;
        updatedAt?: string;
        reviewNote?: string;
        offlineReason?: string;
        reviewedAt?: string;
        reviewedBy?: string;
      }>;
      total: number;
      page: number;
      limit: number;
    }>(`/api/v1/assets/admin/list?${qs.toString()}`);
  },

  // 审核 AI 资产（管理员/运营）
  reviewAsset: (data: { asset_id: string; status: 'approved' | 'rejected'; review_note?: string }) =>
    fetchApi<{ success: boolean; asset_id: string; status: string }>('/api/v1/assets/admin/review', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // AI 资产统计（管理员/运营）
  getAssetStats: () =>
    fetchApi<{ draft: number; pending: number; approved: number; rejected: number; total: number }>(
      '/api/v1/assets/admin/stats'
    ),

  // 获取系统设置
  getSettings: () =>
    fetchApi<{ success: boolean; data: Record<string, Record<string, unknown>> }>('/api/v1/admin/settings'),

  // 更新系统设置
  updateSettings: (category: string, settings: Record<string, unknown>) =>
    fetchApi<{ success: boolean; category: string }>('/api/v1/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ category, settings }),
    }),

  // 角色管理
  listRoles: () =>
    fetchApi<{ roles: { objectId: string; name: string; label: string; description: string; permissions: string[]; userCount: number; createdAt: string }[] }>('/api/v1/admin/roles'),

  updateRole: (roleId: string, permissions: string[]) =>
    fetchApi<{ success: boolean }>(`/api/v1/admin/roles/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    }),

  createRole: (data: { name: string; label: string; description?: string; permissions?: string[] }) =>
    fetchApi<{ success: boolean; objectId: string }>('/api/v1/admin/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteRole: (roleId: string) =>
    fetchApi<{ success: boolean }>(`/api/v1/admin/roles/${roleId}`, {
      method: 'DELETE',
    }),

  // 券码管理
  listCoupons: () =>
    fetchApi<{ coupons: Array<{ id: string; code: string; type: string; value: number; minAmount?: number; scope: string; scopeDetail?: string; startDate: string; endDate: string; totalCount: number; usedCount: number; status: string; createdAt: string }> }>('/api/v1/admin/coupons'),

  createCoupon: (data: { code: string; type: string; value: number; min_amount?: number; scope?: string; scope_detail?: string; start_date: string; end_date: string; total_count?: number }) =>
    fetchApi<{ success: boolean; id: string }>('/api/v1/admin/coupons', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteCoupon: (couponId: string) =>
    fetchApi<{ success: boolean }>(`/api/v1/admin/coupons/${couponId}`, { method: 'DELETE' }),

  updateCouponStatus: (couponId: string, status: string) =>
    fetchApi<{ success: boolean }>(`/api/v1/admin/coupons/${couponId}/status?status=${status}`, { method: 'PUT' }),

  // 促销管理
  listPromotions: () =>
    fetchApi<{ promotions: Array<{ id: string; name: string; type: string; status: string; discount?: number; minAmount?: number; giftProduct?: string; startDate: string; endDate: string; productCount: number; orderCount: number; revenue: number; createdAt: string }> }>('/api/v1/admin/promotions'),

  createPromotion: (data: { name: string; type: string; discount?: number; min_amount?: number; gift_product?: string; start_date: string; end_date: string }) =>
    fetchApi<{ success: boolean; id: string }>('/api/v1/admin/promotions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updatePromotionStatus: (promoId: string, status: string) =>
    fetchApi<{ success: boolean }>(`/api/v1/admin/promotions/${promoId}/status?status=${status}`, { method: 'PUT' }),

  deletePromotion: (promoId: string) =>
    fetchApi<{ success: boolean }>(`/api/v1/admin/promotions/${promoId}`, { method: 'DELETE' }),

  // 充值管理
  listRechargeRecords: (params: { page?: number; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    return fetchApi<{ records: Array<{ id: string; userId: string; username: string; amount: number; bonus: number; method: string; status: string; createdAt: string }>; total: number }>(`/api/v1/admin/recharge/records?${qs.toString()}`);
  },

  listRechargePlans: () =>
    fetchApi<{ plans: Array<{ id: string; amount: number; bonus: number; enabled: boolean }> }>('/api/v1/admin/recharge/plans'),

  createRechargePlan: (data: { amount: number; bonus: number; enabled?: boolean }) =>
    fetchApi<{ success: boolean; id: string }>('/api/v1/admin/recharge/plans', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateRechargePlan: (planId: string, data: { amount: number; bonus: number; enabled: boolean }) =>
    fetchApi<{ success: boolean }>(`/api/v1/admin/recharge/plans/${planId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // 账户明细
  listAccountRecords: (params: { page?: number; limit?: number; userKw?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.userKw && params.userKw.trim()) qs.set('user_kw', params.userKw.trim());
    return fetchApi<{
      records: Array<{
        id: string;
        userId: string;
        username: string;
        type: string;
        category: string;
        amount: number;
        balance: number;
        balance_before?: number;
        balance_after?: number;
        description: string;
        relatedOrderNo?: string;
        operatorId?: string;
        operatorName?: string;
        createdAt: string;
      }>;
      total: number;
      page: number;
      limit: number;
    }>(`/api/v1/admin/accounts/records?${qs.toString()}`);
  },

  // 用户余额列表
  listUserBalances: (params: { page?: number; limit?: number; keyword?: string; role?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.keyword && params.keyword.trim()) qs.set('keyword', params.keyword.trim());
    if (params.role) qs.set('role', params.role);
    return fetchApi<{
      data: Array<{
        userId: string;
        username: string;
        email: string;
        role: string;
        level: number;
        memberLevel: string;
        balance: number;
        status: string;
        createdAt: string;
      }>;
      total: number;
      page: number;
      limit: number;
      pageBalanceTotal: number;
    }>(`/api/v1/admin/accounts/user-balances?${qs.toString()}`);
  },

  accountSummary: () =>
    fetchApi<{ balance: number; totalIncome: number; totalExpense: number }>('/api/v1/admin/accounts/summary'),

  // 重置用户密码（Operator/Admin权限）
  resetUserPassword: (userId: string, newPassword?: string) =>
    fetchApi<{ success: boolean; message: string; new_password: string }>('/api/v1/users/admin/reset-password', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, new_password: newPassword }),
    }),

  // 为用户充值（Operator/Admin权限）
  rechargeUserAccount: (userId: string, amount: number) =>
    fetchApi<{ success: boolean; message: string; amount: number; new_balance: number; record_id: string }>('/api/v1/users/admin/recharge', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, amount }),
    }),

  // 更新用户信息（Admin权限）
  updateUser: (userId: string, data: { email?: string; phone?: string; level?: number; status?: string }) =>
    fetchApi<{ success: boolean; message: string }>('/api/v1/users/admin/update', {
      method: 'PUT',
      body: JSON.stringify({ user_id: userId, ...data }),
    }),

  // 查询操作日志（admin 看全部，operator 只看自己）
  listOperationLogs: (params: {
    page?: number;
    limit?: number;
    action?: string;
    module?: string;
    operator_id?: string;
    keyword?: string;
  } = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.action) qs.set('action', params.action);
    if (params.module) qs.set('module', params.module);
    if (params.operator_id) qs.set('operator_id', params.operator_id);
    if (params.keyword) qs.set('keyword', params.keyword);
    return fetchApi<{
      data: Array<{
        objectId: string;
        operatorId: string;
        operatorName: string;
        operatorRole: string;
        action: string;
        module: string;
        targetClass: string;
        targetId: string;
        targetName: string;
        description: string;
        detail: Record<string, unknown>;
        ipAddress: string;
        userAgent: string;
        status: string;
        errorMessage: string;
        createdAt: string;
      }>;
      total: number;
      page: number;
      limit: number;
    }>(`/api/v1/operation-logs?${qs.toString()}`);
  },
};

// Assets API
export const assetsApi = {
  // 发布资产
  publish: (data: {
    name: string;
    description?: string;
    category: string;
    price: number;
    cover_key?: string;
  }) =>
    fetchApi<{
      success: boolean;
      id?: string;
      message?: string;
    }>('/api/v1/assets/publish', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 获取我的资产列表
  getMyAssets: (params: { page?: number; limit?: number; status?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.status) qs.set('status', params.status);
    return fetchApi<{
      data: Array<{
        id: string;
        name: string;
        description?: string;
        category: string;
        price: number;
        status: string;
        sales: number;
        coverKey?: string;
        createdAt: string;
      }>;
      total: number;
      page: number;
      limit: number;
    }>(`/api/v1/assets/my?${qs.toString()}`);
  },

  // 获取资产详情
  getAsset: (assetId: string) =>
    fetchApi<{
      id: string;
      name: string;
      description?: string;
      category: string;
      price: number;
      status: string;
      sales: number;
      coverKey?: string;
      creatorId?: string;
      owner?: string;
      createdAt: string;
    }>(`/api/v1/assets/${assetId}`),

  // 编辑资产
  updateAsset: (assetId: string, data: {
    name?: string;
    description?: string;
    category?: string;
    coverKey?: string;
    copyright?: string;
    license?: string;
    tags?: string[];
  }) =>
    fetchApi<{ success: boolean; message: string }>(
      `/api/v1/assets/${assetId}`,
      { method: 'PUT', body: JSON.stringify(data) }
    ),

  // 提交审核
  submitForReview: (assetId: string) =>
    fetchApi<{ success: boolean; product_id: string; message: string }>(
      `/api/v1/assets/${assetId}/submit`,
      { method: 'POST' }
    ),

  // 购买资产
  purchase: (assetId: string) =>
    fetchApi<{
      success: boolean;
      order_id?: string;
      amount?: number;
      free?: boolean;
      message?: string;
    }>(`/api/v1/assets/${assetId}/purchase`, { method: 'POST' }),

  // 获取已购买的资产
  getPurchases: (params: { page?: number; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    return fetchApi<{
      data: Array<{
        order_id: string;
        order_no: string;
        asset: { id: string; name: string; coverKey?: string };
        amount: number;
        status: string;
        createdAt: string;
      }>;
      total: number;
      page: number;
      limit: number;
    }>(`/api/v1/assets/purchases?${qs.toString()}`);
  },

  // 购物车
  cart: {
    get: () =>
      fetchApi<{
        data: Array<{
          asset_id: string;
          name: string;
          price: number;
          coverKey?: string;
          addedAt: string;
        }>;
        total: number;
      }>('/api/v1/assets/cart'),

    add: (assetId: string) =>
      fetchApi<{
        success: boolean;
        message: string;
        count: number;
      }>('/api/v1/assets/cart', {
        method: 'POST',
        body: JSON.stringify({ asset_id: assetId }),
      }),

    remove: (assetId: string) =>
      fetchApi<{
        success: boolean;
        message: string;
        count: number;
      }>(`/api/v1/assets/cart/${assetId}`, { method: 'DELETE' }),

    checkout: () =>
      fetchApi<{
        success: boolean;
        orders: Array<{ order_no: string; amount: number }>;
        total: number;
        message: string;
      }>('/api/v1/assets/cart/checkout', { method: 'POST' }),
  },
};

export default {
  user: userApi,
  auth: authApi,
  payment: paymentApi,
  task: taskApi,
  incentive: incentiveApi,
  promotion: promotionApi,
  member: memberApi,
  wallet: walletApi,
  storage: storageApi,
  assets: assetsApi,
  operator: {
    getOrders: (params: { page?: number; limit?: number; status?: string; search?: string } = {}) => {
      const qs = new URLSearchParams();
      if (params.page) qs.set('page', String(params.page));
      if (params.limit) qs.set('limit', String(params.limit));
      if (params.status) qs.set('status', params.status);
      if (params.search) qs.set('search', params.search);
      return fetchApi<{
        data: Array<{
          id: string;
          orderNo: string;
          user: string;
          userId: string;
          amount: number;
          status: string;
          type: string;
          paymentMethod: string;
          createdAt: string;
        }>;
        total: number;
        page: number;
        limit: number;
      }>(`/api/v1/operator/orders?${qs.toString()}`);
    },

    getOrderDetail: (orderId: string) =>
      fetchApi<{
        id: string;
        orderNo: string;
        userId: string;
        username: string;
        productId: string;
        productName: string;
        amount: number;
        status: string;
        type: string;
        paymentMethod: string;
        txHash: string;
        createdAt: string;
        paidAt?: string;
        completedAt?: string;
      }>(`/api/v1/operator/orders/${orderId}`),

    refund: (orderId: string, reason: string = '') =>
      fetchApi<{
        success: boolean;
        message: string;
        refund_amount: number;
      }>(`/api/v1/operator/orders/${orderId}/refund`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
  },
  admin: adminApi,
};
