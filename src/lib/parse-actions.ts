'use server';

/**
 * Parse Server Actions - 精简版
 */

const PARSE_SERVER_URL = process.env.PARSE_SERVER_URL || 'http://localhost:1337/parse';
const PARSE_APP_ID = process.env.PARSE_APP_ID || process.env.NEXT_PUBLIC_PARSE_APP_ID || 'aigccloud';
const PARSE_REST_API_KEY = process.env.PARSE_REST_API_KEY || 'restapi_service_key';
const PARSE_MASTER_KEY = process.env.PARSE_MASTER_KEY || '';

// ============ 错误信息翻译 ============

function translateError(error: unknown, context?: Record<string, unknown>): string {
  // 确保 error 是字符串
  const errorStr = typeof error === 'string' ? error : (error as Error)?.message || String(error);
  
  const errorMap: Record<string, string> = {
    'Account already exists for this username.': `用户名已存在${context?.username ? ` (${context.username})` : ''}`,
    'Invalid username/password.': '用户名或密码错误',
    'Invalid session token': '登录已过期，请重新登录',
    'Object not found.': '数据不存在',
    'unauthorized': '未授权访问',
    'Invalid key': '无效的密钥',
  };
  
  for (const [en, zh] of Object.entries(errorMap)) {
    if (errorStr.toLowerCase().includes(en.toLowerCase())) {
      return zh;
    }
  }
  return errorStr;
}

// ============ 核心请求 ============

async function parseRequest(
  endpoint: string,
  method: string = 'GET',
  body?: Record<string, unknown>,
  sessionToken?: string
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Parse-Application-Id': PARSE_APP_ID,
    'X-Parse-REST-API-Key': PARSE_REST_API_KEY,
  };
  // 写操作使用 Master Key（Server Action 运行在服务端，安全）
  if (method !== 'GET' && PARSE_MASTER_KEY) {
    headers['X-Parse-Master-Key'] = PARSE_MASTER_KEY;
  }
  if (sessionToken) headers['X-Parse-Session-Token'] = sessionToken;

  const url = `${PARSE_SERVER_URL}${endpoint}`;
  // 只在写操作时输出日志
  const isWriteOp = method !== 'GET';
  if (isWriteOp) {
    console.log(`[ParseRequest] ${method} ${endpoint}`);
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const errorMsg = translateError(error.error || `HTTP ${response.status}`, body);
      // 不显示 Notification 表不存在的预期错误
      if (!errorMsg.includes('non-existent class: Notification')) {
        console.log(`[ParseRequest] 错误: ${method} ${endpoint} - ${response.status} - ${errorMsg}`);
      }
      throw new Error(errorMsg);
    }
    const result = await response.json();
    if (isWriteOp) {
      console.log(`[ParseRequest] 成功:`, result.objectId || 'OK');
    }
    return result;
  } catch (error) {
    // 不显示 Notification 表不存在的预期错误
    const errorMsg = (error as Error).message;
    if (!errorMsg.includes('non-existent class: Notification')) {
      console.log(`[ParseRequest] 异常: ${method} ${endpoint} -`, error);
    }
    throw error;
  }
}

// ============ 通用类型 ============

export interface ParseUser {
  objectId: string;
  sessionToken?: string;
  username: string;
  email: string;
  phone?: string;
  role?: string;
  level?: number;
  memberLevel?: 'normal' | 'vip' | 'svip';
  memberExpireAt?: string;
  web3Address?: string;
  inviteCount?: number;
  successRegCount?: number;
  totalIncentive?: number;
  avatar?: string;
  avatarKey?: string;
}

export interface PaginatedResult<T> {
  success: boolean;
  data: T[];
  total: number;
  error?: string;
}

// ============ 通用 CRUD ============

export async function queryObjects(
  className: string,
  options?: { where?: Record<string, unknown>; limit?: number; skip?: number; order?: string; include?: string }
) {
  try {
    const params = new URLSearchParams();
    if (options?.where) params.set('where', JSON.stringify(options.where));
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.skip) params.set('skip', String(options.skip));
    if (options?.order) params.set('order', options.order);
    if (options?.include) params.set('include', options.include);

    const query = params.toString() ? `?${params.toString()}` : '';
    const result = await parseRequest(`/classes/${className}${query}`, 'GET');
    return { success: true, data: result.results || [] };
  } catch (error) {
    return { success: false, error: (error as Error).message, data: [] };
  }
}

export async function getObject(className: string, objectId: string) {
  try {
    const result = await parseRequest(`/classes/${className}/${objectId}`, 'GET');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function createObject(className: string, data: Record<string, unknown>) {
  try {
    const result = await parseRequest(`/classes/${className}`, 'POST', data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function updateObject(className: string, objectId: string, data: Record<string, unknown>) {
  try {
    const result = await parseRequest(`/classes/${className}/${objectId}`, 'PUT', data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteObject(className: string, objectId: string) {
  try {
    await parseRequest(`/classes/${className}/${objectId}`, 'DELETE');
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function countObjects(className: string, where?: Record<string, unknown>) {
  try {
    const params = new URLSearchParams({ count: '1', limit: '0' });
    if (where) params.set('where', JSON.stringify(where));
    const result = await parseRequest(`/classes/${className}?${params.toString()}`, 'GET');
    return { success: true, count: result.count || 0 };
  } catch (error) {
    return { success: false, error: (error as Error).message, count: 0 };
  }
}

// ============ 通用分页查询 ============

async function paginatedQuery<T>(
  className: string,
  where: Record<string, unknown>,
  page = 1,
  limit = 20,
  order = '-createdAt'
): Promise<PaginatedResult<T>> {
  try {
    const skip = (page - 1) * limit;
    const [result, countResult] = await Promise.all([
      queryObjects(className, { where, limit, skip, order }),
      countObjects(className, where),
    ]);
    return { success: true, data: result.data as T[], total: countResult.count };
  } catch (error) {
    return { success: false, error: (error as Error).message, data: [], total: 0 };
  }
}

// ============ 通用 Toggle 关系 ============

async function toggleRelation(
  className: string,
  where: Record<string, unknown>,
  data: Record<string, unknown>,
  counterField?: { className: string; objectId: string; field: string }
) {
  try {
    const existing = await queryObjects(className, { where, limit: 1 });
    const exists = existing.data && existing.data.length > 0;

    if (exists) {
      await deleteObject(className, existing.data[0].objectId);
      if (counterField) {
        await parseRequest(`/classes/${counterField.className}/${counterField.objectId}`, 'PUT', {
          [counterField.field]: { __op: 'Increment', amount: -1 },
        });
      }
    } else {
      await createObject(className, data);
      if (counterField) {
        await parseRequest(`/classes/${counterField.className}/${counterField.objectId}`, 'PUT', {
          [counterField.field]: { __op: 'Increment', amount: 1 },
        });
      }
    }
    return { success: true, active: !exists };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// ============ 用户认证 ============

export async function loginUser(username: string, password: string) {
  try {
    const result = await parseRequest(`/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`, 'GET');
    return { success: true, user: result as ParseUser };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function registerUser(username: string, email: string, password: string) {
  try {
    const result = await parseRequest('/users', 'POST', {
      username, email, password, role: 'user', level: 1, memberLevel: 'normal',
      inviteCount: 0, successRegCount: 0, totalIncentive: 0,
    });
    return { success: true, user: result as ParseUser };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function logoutUser(sessionToken: string) {
  try {
    await parseRequest('/logout', 'POST', undefined, sessionToken);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function getCurrentUser(sessionToken: string) {
  try {
    const result = await parseRequest('/users/me', 'GET', undefined, sessionToken);
    return { success: true, user: result };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function resetPassword(email: string) {
  try {
    await parseRequest('/requestPasswordReset', 'POST', { email });
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function changePassword(username: string, currentPassword: string, newPassword: string) {
  try {
    const loginResult = await loginUser(username, currentPassword);
    if (!loginResult.success) return { success: false, error: '当前密码错误' };
    
    const { sessionToken, objectId } = loginResult.user || {};
    if (!sessionToken || !objectId) return { success: false, error: '验证失败' };
    
    await parseRequest(`/users/${objectId}`, 'PUT', { password: newPassword }, sessionToken);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function updateUserProfile(
  userId: string,
  data: { username?: string; email?: string; phone?: string; bio?: string; avatar?: string; avatarKey?: string; web3Address?: string },
  sessionToken: string
) {
  try {
    const result = await parseRequest(`/users/${userId}`, 'PUT', data, sessionToken);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function getUserById(userId: string, sessionToken?: string) {
  try {
    console.log('[getUserById] userId:', userId, 'sessionToken:', sessionToken ? sessionToken.substring(0, 20) + '...' : 'undefined');
    const result = await parseRequest(`/users/${userId}`, 'GET', undefined, sessionToken);
    return { success: true, user: result };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// ============ 社交互动 ============

export async function toggleLike(productId: string, userId: string) {
  const result = await toggleRelation('Like', { productId, userId }, { productId, userId },
    { className: 'Product', objectId: productId, field: 'likeCount' });
  return { ...result, liked: result.active };
}

export async function toggleFavorite(productId: string, userId: string) {
  const result = await toggleRelation('Favorite', { productId, userId }, { productId, userId });
  return { ...result, favorited: result.active };
}

export async function toggleFollow(followerId: string, followingId: string) {
  if (followerId === followingId) return { success: false, error: '不能关注自己' };
  const result = await toggleRelation('Follow', { followerId, followingId }, { followerId, followingId });
  return { ...result, following: result.active };
}

export async function checkLikeAndFavorite(productId: string, userId: string) {
  try {
    const [likeResult, favoriteResult] = await Promise.all([
      queryObjects('Like', { where: { productId, userId }, limit: 1 }),
      queryObjects('Favorite', { where: { productId, userId }, limit: 1 }),
    ]);
    return { success: true, liked: likeResult.data?.length > 0, favorited: favoriteResult.data?.length > 0 };
  } catch (error) {
    return { success: false, error: (error as Error).message, liked: false, favorited: false };
  }
}

// 批量检查用户对多个商品的喜欢/收藏状态
export async function checkUserLikesAndFavorites(productIds: string[], userId: string) {
  if (!userId || productIds.length === 0) {
    return { success: true, likedIds: new Set<string>(), favoritedIds: new Set<string>() };
  }
  try {
    const [likeResult, favoriteResult] = await Promise.all([
      queryObjects('Like', { where: { productId: { $in: productIds }, userId }, limit: 1000 }),
      queryObjects('Favorite', { where: { productId: { $in: productIds }, userId }, limit: 1000 }),
    ]);
    const likedIds = new Set<string>(likeResult.data?.map((l: { productId: string }) => l.productId) || []);
    const favoritedIds = new Set<string>(favoriteResult.data?.map((f: { productId: string }) => f.productId) || []);
    return { success: true, likedIds, favoritedIds };
  } catch (error) {
    return { success: false, error: (error as Error).message, likedIds: new Set<string>(), favoritedIds: new Set<string>() };
  }
}

export async function checkFollowing(followerId: string, followingId: string) {
  try {
    const result = await queryObjects('Follow', { where: { followerId, followingId }, limit: 1 });
    return { success: true, following: result.data?.length > 0 };
  } catch (error) {
    return { success: false, error: (error as Error).message, following: false };
  }
}

// ============ 分页查询接口 ============

export async function getUserFavorites(userId: string, page = 1, limit = 20) {
  try {
    // 先查询收藏记录
    const favoritesResult = await paginatedQuery<{ objectId: string; productId: string; userId: string }>('Favorite', { userId }, page, limit);
    if (!favoritesResult.success || !favoritesResult.data || favoritesResult.data.length === 0) {
      return favoritesResult;
    }

    // 获取所有收藏商品的ID
    const productIds = favoritesResult.data.map(f => f.productId);
    
    // 查询商品详情
    const productsResult = await queryObjects('Product', {
      where: { objectId: { $in: productIds } },
      limit: productIds.length,
    });
    
    // 创建商品映射
    const productMap = new Map<string, Product>();
    if (productsResult.data) {
      for (const product of productsResult.data) {
        productMap.set(product.objectId, product as Product);
      }
    }
    
    // 合并数据
    const dataWithProducts = favoritesResult.data.map(favorite => ({
      ...favorite,
      product: productMap.get(favorite.productId) || null,
    }));
    
    return {
      ...favoritesResult,
      data: dataWithProducts,
    };
  } catch (error) {
    console.error('[getUserFavorites] 查询失败:', error);
    return { success: false, error: (error as Error).message, data: [], total: 0 };
  }
}

export async function getUserFollowing(userId: string, page = 1, limit = 20) {
  try {
    const followResult = await paginatedQuery<{ objectId: string; followerId: string; followingId: string }>('Follow', { followerId: userId }, page, limit);
    if (!followResult.success || !followResult.data || followResult.data.length === 0) {
      return followResult;
    }

    // 获取所有关注用户的ID
    const followingIds = followResult.data.map(f => f.followingId);
    
    // 批量查询用户信息
    const usersResult = await queryObjects('_User', {
      where: { objectId: { $in: followingIds } },
      limit: followingIds.length,
    });
    
    // 创建用户映射
    const userMap = new Map<string, { objectId: string; username: string; avatar?: string; bio?: string; level?: number }>();
    if (usersResult.data) {
      for (const u of usersResult.data) {
        userMap.set(u.objectId, { objectId: u.objectId, username: u.username, avatar: u.avatar, bio: u.bio, level: u.level });
      }
    }
    
    // 合并数据
    const dataWithUsers = followResult.data.map(follow => ({
      ...follow,
      followingUser: userMap.get(follow.followingId) || null,
    }));
    
    return {
      ...followResult,
      data: dataWithUsers,
    };
  } catch (error) {
    console.error('[getUserFollowing] 查询失败:', error);
    return { success: false, error: (error as Error).message, data: [], total: 0 };
  }
}

export async function getUserFollowers(userId: string, page = 1, limit = 20) {
  return paginatedQuery('Follow', { followingId: userId }, page, limit);
}

export async function getComments(productId: string, page = 1, limit = 20) {
  return paginatedQuery('Comment', { productId, parentId: null }, page, limit);
}

// ============ 评论 ============

export interface Comment {
  objectId: string;
  productId: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  content: string;
  rating?: number;
  likeCount?: number;
  parentId?: string | null;
  replyToId?: string;  // 回复的用户ID
  createdAt: string;
}

export async function getProductComments(productId: string, page = 1, limit = 10) {
  return paginatedQuery<Comment>('Comment', { productId }, page, limit, '-createdAt');
}

// 获取顶级评论（不含回复）
export async function getTopLevelComments(productId: string, page = 1, limit = 10) {
  return paginatedQuery<Comment>('Comment', { where: { productId, parentId: { $exists: false } } }, page, limit, '-createdAt');
}

// 获取评论的所有回复
export async function getCommentReplies(parentId: string, page = 1, limit = 10) {
  return paginatedQuery<Comment>('Comment', { where: { parentId } }, page, limit, 'createdAt');
}

export async function createComment(comment: Omit<Comment, 'objectId' | 'createdAt'>) {
  const result = await createObject('Comment', { ...comment, likeCount: 0 });
  if (result.success) {
    await parseRequest(`/classes/Product/${comment.productId}`, 'PUT', {
      commentCount: { __op: 'Increment', amount: 1 },
    });
  }
  return result;
}

export async function addComment(productId: string, userId: string, content: string, parentId?: string) {
  try {
    const comment = await createObject('Comment', { productId, userId, content, parentId: parentId || null });
    await parseRequest(`/classes/Product/${productId}`, 'PUT', { commentCount: { __op: 'Increment', amount: 1 } });
    return { success: true, data: comment.data };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteComment(commentId: string, productId: string) {
  try {
    await deleteObject('Comment', commentId);
    await parseRequest(`/classes/Product/${productId}`, 'PUT', { commentCount: { __op: 'Increment', amount: -1 } });
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// 回复评论
export async function replyComment(
  productId: string,
  userId: string,
  userName: string,
  content: string,
  parentId: string,
  replyToId: string
) {
  try {
    const comment = await createObject('Comment', {
      productId,
      userId,
      userName,
      content,
      parentId,
      replyToId,
      likeCount: 0,
    });
    await parseRequest(`/classes/Product/${productId}`, 'PUT', {
      commentCount: { __op: 'Increment', amount: 1 },
    });
    return { success: true, data: comment.data };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// ============ 评分 ============

export interface ProductRating {
  objectId: string;
  productId: string;
  userId: string;
  rating: number; // 1-5
  createdAt: string;
}

export async function rateProduct(productId: string, userId: string, rating: number) {
  try {
    // 检查是否已评分
    const existing = await queryObjects('ProductRating', {
      where: { productId, userId },
      limit: 1,
    });
    if (existing.data && existing.data.length > 0) {
      // 更新已有评分
      await parseRequest(`/classes/ProductRating/${existing.data[0].objectId}`, 'PUT', { rating });
    } else {
      // 创建新评分
      await parseRequest('/classes/ProductRating', 'POST', { productId, userId, rating });
    }
    // 计算平均分并更新 Product
    const allRatings = await queryObjects('ProductRating', {
      where: { productId },
      limit: 1000,
    });
    if (allRatings.data && allRatings.data.length > 0) {
      const avg = allRatings.data.reduce((sum: number, r: Record<string, unknown>) => sum + (r.rating as number), 0) / allRatings.data.length;
      await parseRequest(`/classes/Product/${productId}`, 'PUT', {
        rating: Math.round(avg * 10) / 10,
        ratingCount: allRatings.data.length,
      });
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function getUserRating(productId: string, userId: string): Promise<number | null> {
  try {
    const res = await queryObjects('ProductRating', {
      where: { productId, userId },
      limit: 1,
    });
    if (res.data && res.data.length > 0) {
      return res.data[0].rating as number;
    }
    return null;
  } catch {
    return null;
  }
}

// ============ 商品 ============

export interface Product {
  objectId: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  originalPrice?: number;
  cover?: string;
  images?: string[];
  rating?: number;
  sales?: number;
  likeCount?: number;
  favoriteCount?: number;
  commentCount?: number;
  views?: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'offline';
  creatorId: string;
  creatorName?: string;
  creatorAddress?: string;
  owner: string; // 当前拥有者的web3地址，初始等于creatorAddress，交易后更新为购买者地址
  mockType?: string;
  mockOwner?: string;
  tags?: string[];
  previewUrl?: string;
  fileUrl?: string; // 实际文件下载地址（购买后可见）
  fileSize?: number; // 文件大小（字节）
  fileFormat?: string; // 文件格式（png/mp3/mp4等）
  duration?: number; // 音视频时长（秒）
  dimensions?: string; // 图片尺寸（如 "1920x1080"）
  ratingCount?: number; // 评分人数
  createdAt: string;
  updatedAt?: string;
}

// ============ AIIP资产 ============

export interface AIIPAsset {
  objectId: string;
  name: string;
  description?: string;
  category: string; // image/audio/video/model
  cover?: string;
  images?: string[];
  fileUrl?: string; // 资产文件URL
  fileSize?: number;
  fileType?: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'offline';
  ownerId: string; // 拥有者用户ID
  ownerAddress: string; // 拥有者web3地址
  ownerName?: string;
  price?: number; // 上架价格
  isListed?: boolean; // 是否已上架到商城
  listedProductId?: string; // 对应的商城商品ID
  views?: number;
  mockOwner?: string; // 模拟数据创建者
  tags?: string[];
  copyright?: string;
  license?: string;
  assetUrl?: string;
  // 审核相关：用于展示驳回/下架原因与审核时间
  reviewNote?: string;
  offlineReason?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

// 获取用户的AIIP资产
export async function getUserAIIPAssets(ownerAddress: string, options?: { status?: string; category?: string; page?: number; limit?: number }) {
  const where: Record<string, unknown> = { ownerAddress };
  if (options?.status && options.status !== 'all') where.status = options.status;
  if (options?.category && options.category !== 'all') where.category = options.category;
  return paginatedQuery<AIIPAsset>('AIIPAsset', where, options?.page || 1, options?.limit || 20);
}

// 创建AIIP资产
export async function createAIIPAsset(asset: Omit<AIIPAsset, 'objectId' | 'createdAt'>) {
  return createObject('AIIPAsset', {
    ...asset,
    views: 0,
    isListed: false,
  });
}

// 更新AIIP资产状态
export async function updateAIIPAssetStatus(assetId: string, status: AIIPAsset['status']) {
  return updateObject('AIIPAsset', assetId, { status });
}

// 删除AIIP资产
export async function deleteAIIPAsset(assetId: string, ownerKey?: string) {
  // 验证所有权：只能删除自己的资产
  if (ownerKey) {
    const asset = await queryObjects('AIIPAsset', { where: { objectId: assetId }, limit: 1 });
    const data = asset.data?.[0];
    if (!data) return { success: false, error: '资产不存在' };
    if (data.ownerAddress !== ownerKey && data.ownerId !== ownerKey) {
      return { success: false, error: '无权删除他人的资产' };
    }
  }
  return deleteObject('AIIPAsset', assetId);
}

export async function getProducts(options?: { category?: string; search?: string; sortBy?: string; page?: number; limit?: number }) {
  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const where: Record<string, unknown> = { status: 'approved' };
  if (options?.category && options.category !== 'all') where.category = options.category;
  if (options?.search) where.name = { $regex: options.search, $options: 'i' };

  const orderMap: Record<string, string> = { sales: '-sales', price_asc: 'price', price_desc: '-price', rating: '-rating', newest: '-createdAt' };
  const order = orderMap[options?.sortBy || ''] || '-createdAt';

  return paginatedQuery<Product>('Product', where, page, limit, order);
}

export async function getProductById(productId: string) {
  return getObject('Product', productId);
}

// 获取用户自己的商品（AIIP资产）- 按 owner 字段查询
export async function getUserProducts(ownerAddress: string, options?: { status?: string; category?: string; page?: number; limit?: number }) {
  const where: Record<string, unknown> = { owner: ownerAddress };
  if (options?.status && options.status !== 'all') where.status = options.status;
  if (options?.category && options.category !== 'all') where.category = options.category;
  return paginatedQuery<Product>('Product', where, options?.page || 1, options?.limit || 20);
}

// 创建商品
export async function createProduct(product: Omit<Product, 'objectId' | 'createdAt'>) {
  return createObject('Product', {
    ...product,
    sales: 0,
    likeCount: 0,
    favoriteCount: 0,
    commentCount: 0,
    views: 0,
    rating: 0,
  });
}

// 更新商品
export async function updateProduct(productId: string, data: Partial<Product>) {
  return updateObject('Product', productId, data);
}

// 上架/下架商品
export async function updateProductStatus(productId: string, status: Product['status']) {
  return updateObject('Product', productId, { status });
}

// 初始化模拟商品数据
const MOCK_USER_ADDRESS = '0xe5c52a1b6f6bff745fde3a4ec9607accdba2e77e';

export async function initMockProducts(forceCreate = false) {
  // 检查是否已有数据
  if (!forceCreate) {
    const existing = await queryObjects('Product', { where: { creatorAddress: MOCK_USER_ADDRESS }, limit: 1 });
    if (existing.data && existing.data.length > 0) {
      console.log('[initMockProducts] 已存在模拟数据');
      return { success: true, message: '已存在模拟数据' };
    }
  }

  const mockProducts = [
    { name: '梦幻星空壁纸', category: 'image', price: 29, description: 'AI生成的奇幻星空场景', cover: 'https://picsum.photos/seed/product1/400/300', status: 'approved' as const },
    { name: '电子音乐合集', category: 'audio', price: 49, description: '原创AI电子音乐合集', cover: 'https://picsum.photos/seed/product2/400/300', status: 'approved' as const },
    { name: '动态卡通头像', category: 'video', price: 19, description: '可爱的动态卡通头像', cover: 'https://picsum.photos/seed/product3/400/300', status: 'approved' as const },
    { name: '赛博朋克风格套图', category: 'image', price: 39, description: '赛博朋克风格的城市场景套图', cover: 'https://picsum.photos/seed/product4/400/300', status: 'approved' as const },
    { name: '自然白噪音合集', category: 'audio', price: 9, description: '放松的自然白噪音', cover: 'https://picsum.photos/seed/product5/400/300', status: 'approved' as const },
    { name: 'Q版游戏角色', category: 'image', price: 59, description: 'Q版风格的游戏角色设计', cover: 'https://picsum.photos/seed/product6/400/300', status: 'approved' as const },
    { name: '古风水墨画套图', category: 'image', price: 79, description: '中国风水墨画风格插画', cover: 'https://picsum.photos/seed/product7/400/300', status: 'approved' as const },
    { name: '说唱伴奏曲', category: 'audio', price: 39, description: 'AI生成的说唱伴奏曲', cover: 'https://picsum.photos/seed/product8/400/300', status: 'approved' as const },
    { name: '产品宣传视频', category: 'video', price: 99, description: 'AI生成的产品宣传视频', cover: 'https://picsum.photos/seed/product9/400/300', status: 'approved' as const },
    { name: '抽象艺术套图', category: 'image', price: 45, description: '抗象派风格的艺术插画', cover: 'https://picsum.photos/seed/product10/400/300', status: 'approved' as const },
  ];

  try {
    for (const product of mockProducts) {
      await createObject('Product', {
        ...product,
        creatorId: 'mock_user_id',
        creatorName: '模拟用户',
        creatorAddress: MOCK_USER_ADDRESS,
        owner: MOCK_USER_ADDRESS, // 初始拥有者等于创建者
        sales: Math.floor(Math.random() * 100),
        likeCount: Math.floor(Math.random() * 50),
        favoriteCount: Math.floor(Math.random() * 30),
        views: Math.floor(Math.random() * 500),
        rating: 3 + Math.random() * 2,
        commentCount: 0,
        tags: [],
      });
    }
    console.log('[initMockProducts] 创建10条模拟数据成功');
    return { success: true, message: '创建模拟数据成功' };
  } catch (error) {
    console.log('[initMockProducts] 创建失败:', error);
    return { success: false, error: (error as Error).message };
  }
}

// 清空模拟商品数据
export async function clearMockProducts() {
  try {
    const result = await queryObjects('Product', { where: { creatorAddress: MOCK_USER_ADDRESS }, limit: 100 });
    if (!result.data || result.data.length === 0) {
      return { success: true, message: '没有模拟数据需要清空' };
    }
    for (const product of result.data) {
      await deleteObject('Product', product.objectId);
    }
    console.log(`[clearMockProducts] 清空${result.data.length}条模拟数据成功`);
    return { success: true, message: `清空${result.data.length}条模拟数据成功` };
  } catch (error) {
    console.log('[clearMockProducts] 清空失败:', error);
    return { success: false, error: (error as Error).message };
  }
}

// 为当前用户创建AIIP资产模拟数据
export async function initUserAIIPAssets(userId: string, userAddress: string, userName: string) {
  if (!userAddress) {
    return { success: false, error: '请先登录' };
  }

  const mockAssets = [
    { name: '我的AI风景画', category: 'image', price: 35, description: '自己创作的风景插画', cover: 'https://picsum.photos/seed/aiip1/400/300', status: 'approved' as const },
    { name: '原创背景音乐', category: 'audio', price: 25, description: '原创AI背景音乐', cover: 'https://picsum.photos/seed/aiip2/400/300', status: 'approved' as const },
    { name: '动态Logo设计', category: 'video', price: 88, description: 'AI生成的动态Logo', cover: 'https://picsum.photos/seed/aiip3/400/300', status: 'approved' as const },
    { name: '商业插画套图', category: 'image', price: 128, description: '商用级别的AI插画', cover: 'https://picsum.photos/seed/aiip4/400/300', status: 'approved' as const },
    { name: '放松音乐合集', category: 'audio', price: 18, description: '放松身心的音乐', cover: 'https://picsum.photos/seed/aiip5/400/300', status: 'approved' as const },
    { name: '科幻场景设计', category: 'image', price: 66, description: '未来科幻风格场景', cover: 'https://picsum.photos/seed/aiip6/400/300', status: 'approved' as const },
    { name: '品牌宣传短片', category: 'video', price: 199, description: '品牌宣传短视频', cover: 'https://picsum.photos/seed/aiip7/400/300', status: 'approved' as const },
    { name: '游戏UI素材', category: 'image', price: 45, description: '游戏界面UI素材包', cover: 'https://picsum.photos/seed/aiip8/400/300', status: 'approved' as const },
    { name: '播客片头音乐', category: 'audio', price: 29, description: '播客节目片头音乐', cover: 'https://picsum.photos/seed/aiip9/400/300', status: 'approved' as const },
    { name: '数字艺术NFT图', category: 'image', price: 299, description: '限量版数字艺术作品', cover: 'https://picsum.photos/seed/aiip10/400/300', status: 'approved' as const },
  ];

  try {
    for (const asset of mockAssets) {
      await createObject('AIIPAsset', {
        name: asset.name,
        category: asset.category,
        description: asset.description,
        cover: asset.cover,
        status: asset.status,
        price: asset.price,
        ownerId: userId,
        ownerAddress: userAddress,
        ownerName: userName,
        mockOwner: userAddress,
        views: Math.floor(Math.random() * 300),
        isListed: false,
        tags: [],
      });
    }
    console.log(`[initUserAIIPAssets] 为用户 ${userAddress} 创建10条AIIP资产成功`);
    return { success: true, message: '创建10条AIIP资产成功' };
  } catch (error) {
    console.log('[initUserAIIPAssets] 创建失败:', error);
    return { success: false, error: (error as Error).message };
  }
}

// 清空当前用户的AIIP资产模拟数据
export async function clearUserAIIPAssets(userAddress: string) {
  if (!userAddress) {
    return { success: false, error: '请先登录' };
  }
  try {
    // 只清除当前用户创建的AIIP模拟数据
    const result = await queryObjects('AIIPAsset', { 
      where: { mockOwner: userAddress }, 
      limit: 100 
    });
    if (!result.data || result.data.length === 0) {
      return { success: true, message: '没有AIIP资产需要清空' };
    }
    for (const asset of result.data) {
      await deleteObject('AIIPAsset', asset.objectId);
    }
    console.log(`[clearUserAIIPAssets] 清空${result.data.length}条AIIP资产成功`);
    return { success: true, message: `清空${result.data.length}条AIIP资产成功` };
  } catch (error) {
    console.log('[clearUserAIIPAssets] 清空失败:', error);
    return { success: false, error: (error as Error).message };
  }
}

// 为商城创建模拟商品数据（供购买测试）
export async function initMarketMockProducts(userAddress: string, userId?: string, userName?: string) {
  if (!userAddress) {
    return { success: false, error: '请先登录' };
  }

  const mockProducts = [
    { name: '梦幻星空壁纸', category: 'image', price: 29, description: 'AI生成的奇幻星空场景', cover: 'https://picsum.photos/seed/market1/400/300' },
    { name: '电子音乐合集', category: 'audio', price: 49, description: '原创AI电子音乐合集', cover: 'https://picsum.photos/seed/market2/400/300' },
    { name: '动态卡通头像', category: 'video', price: 19, description: '可爱的动态卡通头像', cover: 'https://picsum.photos/seed/market3/400/300' },
    { name: '赛博朋克风格套图', category: 'image', price: 39, description: '赛博朋克风格的城市场景套图', cover: 'https://picsum.photos/seed/market4/400/300' },
    { name: '自然白噪音合集', category: 'audio', price: 9, description: '放松的自然白噪音', cover: 'https://picsum.photos/seed/market5/400/300' },
    { name: 'Q版游戏角色', category: 'image', price: 59, description: 'Q版风格的游戏角色设计', cover: 'https://picsum.photos/seed/market6/400/300' },
    { name: '古风水墨画套图', category: 'image', price: 79, description: '中国风水墨画风格插画', cover: 'https://picsum.photos/seed/market7/400/300' },
    { name: '说唱伴奏曲', category: 'audio', price: 39, description: 'AI生成的说唱伴奏曲', cover: 'https://picsum.photos/seed/market8/400/300' },
    { name: '产品宣传视频', category: 'video', price: 99, description: 'AI生成的产品宣传视频', cover: 'https://picsum.photos/seed/market9/400/300' },
    { name: '抽象艺术套图', category: 'image', price: 45, description: '抽象派风格的艺术插画', cover: 'https://picsum.photos/seed/market10/400/300' },
  ];

  try {
    for (const product of mockProducts) {
      await createObject('Product', {
        ...product,
        status: 'approved',
        // creatorId 使用 userId（objectId），用于前端与当前用户 objectId 比对；回退到地址
        creatorId: userId || userAddress,
        // creatorName 写入真实用户名，避免前端硬编码显示“当前用户”
        creatorName: userName || '',
        creatorAddress: userAddress,
        owner: userAddress, // 当前用户拥有
        mockType: 'market', // 标记为商城模拟数据
        mockOwner: userAddress, // 记录是谁创建的
        sales: Math.floor(Math.random() * 100),
        likeCount: Math.floor(Math.random() * 50),
        favoriteCount: Math.floor(Math.random() * 30),
        views: Math.floor(Math.random() * 500),
        rating: 3 + Math.random() * 2,
        commentCount: 0,
        tags: [],
      });
    }
    console.log(`[initMarketMockProducts] 创建10条当前用户的模拟商品成功`);
    return { success: true, message: '创建10条当前用户的模拟商品成功' };
  } catch (error) {
    console.log('[initMarketMockProducts] 创建失败:', error);
    return { success: false, error: (error as Error).message };
  }
}

// 清空当前用户创建的商城模拟数据
export async function clearMarketMockProducts(userAddress: string) {
  if (!userAddress) {
    return { success: false, error: '请先登录' };
  }
  try {
    // 只清除当前用户创建的商城模拟数据
    const result = await queryObjects('Product', { 
      where: { mockType: 'market', mockOwner: userAddress }, 
      limit: 100 
    });
    if (!result.data || result.data.length === 0) {
      return { success: true, message: '没有商城模拟数据需要清空' };
    }
    for (const product of result.data) {
      await deleteObject('Product', product.objectId);
    }
    console.log(`[clearMarketMockProducts] 清空${result.data.length}条商城模拟数据成功`);
    return { success: true, message: `清空${result.data.length}条商城模拟数据成功` };
  } catch (error) {
    console.log('[clearMarketMockProducts] 清空失败:', error);
    return { success: false, error: (error as Error).message };
  }
}

// ============ 资产 ============

export interface Asset {
  objectId: string;
  name: string;
  type: string;
  status: string;
  price: number;
  views: number;
  likes: number;
  ownerId: string;
  createdAt: string;
}

export async function getUserAssets(userId: string, options?: { type?: string; status?: string; page?: number; limit?: number }) {
  const where: Record<string, unknown> = { ownerId: userId };
  if (options?.type && options.type !== 'all') where.type = options.type;
  if (options?.status && options.status !== 'all') where.status = options.status;
  return paginatedQuery<Asset>('Asset', where, options?.page || 1, options?.limit || 20);
}

// ============ AI任务 ============

export type TaskType = 'txt2img' | 'img2img' | 'txt2speech' | 'speech2txt' | 'txt2music' | 'txt2video';
export type TaskStatus = 0 | 1 | 2 | 3 | 4; // 0:排队中, 1:处理中, 2:完成, 3:失败, 4:已奖励

export interface TaskResult {
  CID?: string;
  url: string;
  thumbnail?: string;
}

export interface AITask {
  objectId?: string;
  taskId?: string;
  designer: string;  // User objectId
  executor?: string; // Web3 address
  type: TaskType;
  model: string;
  data: {
    prompt: string;
    negativePrompt?: string;
    style?: string;
    size?: string;
    quality?: string;
    referenceImage?: string;  // 图生图参考图 URL
    strength?: string;        // 图生图变化强度
    inputFile?: string;       // 语音识别输入文件 URL
    [key: string]: string | undefined;
  };
  status: TaskStatus;
  results?: TaskResult[];
  errorMessage?: string;
  cost?: number;
  createdAt?: string;
  updatedAt?: string;
}

export async function createAITask(task: Omit<AITask, 'objectId' | 'createdAt'>) {
  console.log('[createAITask] 创建任务:', JSON.stringify(task, null, 2));
  const result = await createObject('AITask', task);
  console.log('[createAITask] 结果:', JSON.stringify(result, null, 2));
  return result;
}

export async function getAITask(taskId: string) {
  return getObject('AITask', taskId);
}

export async function getUserAITasks(userId: string, options?: { type?: string; status?: number; page?: number; limit?: number }) {
  console.log('[getUserAITasks] 查询用户任务, userId:', userId, 'options:', options);
  const where: Record<string, unknown> = { designer: userId };
  if (options?.type && options.type !== 'all') where.type = options.type;
  if (options?.status !== undefined) where.status = options.status;
  console.log('[getUserAITasks] where:', JSON.stringify(where));
  const result = await paginatedQuery<AITask>('AITask', where, options?.page || 1, options?.limit || 20);
  console.log('[getUserAITasks] 结果:', result.success, '总数:', result.total);
  return result;
}

export async function pollAITaskStatus(taskId: string, maxAttempts = 60, interval = 2000) {
  console.log(`[pollAITaskStatus] 开始轮询任务: ${taskId}`);
  for (let i = 0; i < maxAttempts; i++) {
    const result = await getAITask(taskId);
    if (!result.success) {
      console.log(`[pollAITaskStatus] 查询失败: ${result.error}`);
      return result;
    }
    const task = result.data as AITask;
    if (task?.status === 2) {
      console.log(`[pollAITaskStatus] 任务完成`);
      return result; // 2:完成
    }
    if (task?.status === 3) {
      console.log(`[pollAITaskStatus] 任务失败`);
      return result; // 3:失败
    }
    // 每10次输出一次状态
    if (i % 10 === 0) {
      console.log(`[pollAITaskStatus] 第${i + 1}次轮询, 状态: ${task?.status}`);
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  console.log(`[pollAITaskStatus] 任务超时`);
  return { success: false, error: '任务超时' };
}

// ============ 订单/交易/通知/收益 ============

export interface Order {
  objectId: string;
  orderNo: string;
  userId: string;
  buyerAddress: string;  // 买家web3地址
  sellerAddress: string; // 卖家web3地址
  productId: string;
  productName: string;
  productImage?: string;
  productCover?: string;
  productCategory?: string;
  productFileUrl?: string; // 商品文件下载地址
  type: 'purchase' | 'subscription' | 'recharge';
  amount: number;
  status: 'pending' | 'paid' | 'payment_failed' | 'completed' | 'cancelled' | 'refunded';
  paymentMethod: 'web3' | 'coins';
  txHash?: string;       // 链上交易hash
  createdAt: string;
  paidAt?: string;
  completedAt?: string;
}

export interface Transaction {
  objectId: string;
  userId: string;
  type: 'recharge' | 'consume' | 'reward' | 'withdraw' | 'refund';
  amount: number;
  coins?: number;
  description?: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

export interface Notification {
  objectId: string;
  userId: string;
  type: 'success' | 'info' | 'warning' | 'reward' | 'system';
  title: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export interface EarningRecord {
  objectId: string;
  userId: string;
  type: 'sale' | 'reward' | 'withdraw' | 'refund';
  amount: number;
  description?: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

export async function getUserOrders(userId: string, options?: { status?: string; page?: number; limit?: number }) {
  const where: Record<string, unknown> = { userId };
  if (options?.status && options.status !== 'all') where.status = options.status;
  return paginatedQuery<Order>('Order', where, options?.page || 1, options?.limit || 20);
}

// 创建订单
export async function createOrder(order: Omit<Order, 'objectId' | 'createdAt' | 'orderNo'>) {
  const orderNo = `ORD${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  return createObject('Order', { ...order, orderNo });
}

// 创建待支付订单（第一步：客户端创建订单）
export async function createPendingOrder(buyerId: string, buyerAddress: string, product: Product) {
  try {
    const orderResult = await createOrder({
      userId: buyerId,
      buyerAddress,
      sellerAddress: product.owner,
      productId: product.objectId,
      productName: product.name,
      productImage: product.cover,
      type: 'purchase',
      amount: product.price,
      status: 'pending',
      paymentMethod: 'web3',
    });
    if (!orderResult.success) {
      throw new Error(orderResult.error || '创建订单失败');
    }
    return { 
      success: true, 
      orderId: orderResult.data?.objectId,
      orderNo: orderResult.data?.orderNo,
      sellerAddress: product.owner,
      amount: product.price,
    };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// 查询订单状态
export async function getOrderStatus(orderId: string) {
  return getObject('Order', orderId);
}

// 更新订单交易hash（用户转账后调用）
export async function updateOrderTxHash(orderId: string, txHash: string) {
  return updateObject('Order', orderId, { txHash, status: 'paid' });
}

// 取消订单
export async function cancelOrder(orderId: string) {
  return updateObject('Order', orderId, { status: 'cancelled' });
}

// 使用积分余额购买商品（调用FastAPI，需 JWT）
export async function purchaseWithBalance(assetId: string) {
  try {
    let token: string | null = null;
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem('auth-storage');
        if (raw) {
          const parsed = JSON.parse(raw);
          token = parsed?.state?.user?.jwtToken || null;
        }
      } catch {
        token = null;
      }
    }
    if (!token) {
      return { success: false, error: '登录已过期，请重新登录' };
    }
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${base}/api/v1/assets/${assetId}/purchase-with-balance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, error: data?.detail || data?.message || '支付失败' };
    }
    return {
      success: true,
      orderNo: data?.order_no,
      amount: data?.amount,
      message: data?.message || '购买成功',
    };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// 验证Web3转账并完成订单（调用FastAPI）
export async function verifyTransferAndCompleteOrder(orderId: string, txHash: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/payment/verify-transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId, tx_hash: txHash }),
    });
    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.detail || '验证失败' };
    }
    return { success: true, message: data.message };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function getUserTransactions(userId: string, options?: { type?: string; page?: number; limit?: number }) {
  const where: Record<string, unknown> = { userId };
  if (options?.type && options.type !== 'all') where.type = options.type;
  return paginatedQuery<Transaction>('Transaction', where, options?.page || 1, options?.limit || 20);
}

export async function getUserNotifications(userId: string, options?: { unreadOnly?: boolean; page?: number; limit?: number }) {
  const where: Record<string, unknown> = { userId };
  if (options?.unreadOnly) where.read = false;
  return paginatedQuery<Notification>('Notification', where, options?.page || 1, options?.limit || 20);
}

export async function markNotificationRead(notificationId: string) {
  return updateObject('Notification', notificationId, { read: true });
}

export async function markAllNotificationsRead(userId: string) {
  try {
    const result = await queryObjects('Notification', { where: { userId, read: false }, limit: 100 });
    if (result.data?.length) {
      await Promise.all(result.data.map((n: { objectId: string }) => updateObject('Notification', n.objectId, { read: true })));
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function getUserEarnings(userId: string, options?: { type?: string; page?: number; limit?: number }) {
  const where: Record<string, unknown> = { userId };
  if (options?.type && options.type !== 'all') where.type = options.type;
  return paginatedQuery<EarningRecord>('EarningRecord', where, options?.page || 1, options?.limit || 20);
}

export async function getUserEarningStats(userId: string) {
  try {
    const allRecords = await queryObjects('EarningRecord', { where: { userId, status: 'completed' }, limit: 1000 });
    const records = allRecords.data as EarningRecord[];
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    let totalEarnings = 0, thisMonthEarnings = 0, lastMonthEarnings = 0, withdrawn = 0;
    records.forEach(r => {
      const date = new Date(r.createdAt);
      if (r.type === 'sale' || r.type === 'reward') {
        totalEarnings += r.amount;
        if (date >= thisMonth) thisMonthEarnings += r.amount;
        else if (date >= lastMonth && date <= lastMonthEnd) lastMonthEarnings += r.amount;
      } else if (r.type === 'withdraw') {
        withdrawn += Math.abs(r.amount);
      }
    });

    return { success: true, data: { totalEarnings, thisMonth: thisMonthEarnings, lastMonth: lastMonthEarnings, pending: totalEarnings - withdrawn, withdrawn } };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// ============ 提现功能 ============

export interface WithdrawRequest {
  objectId?: string;
  userId: string;
  amount: number;
  method: 'alipay' | 'wechat' | 'bank';
  account: string;
  accountName: string;
  bankName?: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  rejectReason?: string;
  createdAt?: string;
}

export async function createWithdrawRequest(
  userId: string,
  data: { amount: number; method: 'alipay' | 'wechat' | 'bank'; account: string; accountName: string; bankName?: string }
) {
  try {
    // 检查可提现余额
    const statsResult = await getUserEarningStats(userId);
    if (!statsResult.success || !statsResult.data) {
      return { success: false, error: '获取余额失败' };
    }
    
    if (data.amount > statsResult.data.pending) {
      return { success: false, error: '提现金额超过可提现余额' };
    }
    
    if (data.amount < 10) {
      return { success: false, error: '最低提现金额为10元' };
    }

    // 检查是否有待处理的提现申请
    const pendingWithdraws = await queryObjects('WithdrawRequest', { 
      where: { userId, status: { $in: ['pending', 'processing'] } }, 
      limit: 1 
    });
    if (pendingWithdraws.data?.length > 0) {
      return { success: false, error: '您有一笔提现正在处理中，请等待完成后再申请' };
    }

    // 创建提现申请
    const result = await createObject('WithdrawRequest', {
      userId,
      amount: data.amount,
      method: data.method,
      account: data.account,
      accountName: data.accountName,
      bankName: data.bankName || '',
      status: 'pending',
    });

    if (!result.success) {
      return { success: false, error: result.error || '创建提现申请失败' };
    }

    // 创建提现记录（负数）
    await createObject('EarningRecord', {
      userId,
      type: 'withdraw',
      amount: -data.amount,
      description: `提现到${data.method === 'alipay' ? '支付宝' : data.method === 'wechat' ? '微信' : '银行卡'}`,
      status: 'completed',
      relatedId: result.data?.objectId,
    });

    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function getUserWithdrawRequests(userId: string, page = 1, limit = 20) {
  return paginatedQuery<WithdrawRequest>('WithdrawRequest', { userId }, page, limit);
}

// ============ 用户统计 ============

export async function getUserStats(userId: string) {
  try {
    const [assets, orders, followers, following] = await Promise.all([
      countObjects('Asset', { ownerId: userId }),
      countObjects('Order', { userId }),
      countObjects('Follow', { followingId: userId }),
      countObjects('Follow', { followerId: userId }),
    ]);
    return { success: true, data: { assetCount: assets.count, orderCount: orders.count, followerCount: followers.count, followingCount: following.count } };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
