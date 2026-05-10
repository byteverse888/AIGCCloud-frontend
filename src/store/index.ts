import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { assetsApi } from '@/lib/api';

// 扩展 User 类型，添加 store 专用字段
interface StoreUser extends Omit<User, 'createdAt' | 'updatedAt' | 'memberExpireAt'> {
  sessionToken?: string;
  jwtToken?: string;
  memberExpireAt?: string | Date;
  coins?: number;
}

// ============ UI Store ============

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((state: UIState) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed: boolean) => set({ sidebarCollapsed: collapsed }),
    }),
    { name: 'ui-storage' }
  )
);

// ============ Auth Store ============

interface AuthState {
  user: StoreUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: StoreUser | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      setUser: (user: StoreUser | null) => {
        set({ user, isAuthenticated: !!user, isLoading: false });
        // 登录/切换用户：切换购物车属主，自动从后端拉取数据
        try {
          void useCartStore.getState().setOwner(user?.objectId ?? null);
        } catch {
          // 忽略初始化期异常
        }
      },
      setLoading: (loading: boolean) => set({ isLoading: loading }),
      logout: () => {
        set({ user: null, isAuthenticated: false, isLoading: false });
        // 登出：立即清空本地购物车内存态与钱包私钥
        try {
          void useCartStore.getState().setOwner(null);
          useWalletStore.getState().clearWallet();
        } catch {
          // 忽略
        }
      },
    }),
    {
      name: 'auth-storage',
      // persist 恢复后：若已登录，触发一次购物车拉取，保证刷新页面后购物车能恢复
      onRehydrateStorage: () => (state) => {
        const userId = state?.user?.objectId ?? null;
        if (userId) {
          try {
            void useCartStore.getState().setOwner(userId);
          } catch {
            // 忽略
          }
        }
      },
    }
  )
);

// ============ Cart Store ============

interface CartItem {
  id: string;           // = productId，用于 UI key
  productId: string;    // 后端 asset_id
  name: string;
  price: number;
  quantity: number;     // 后端每件商品只能加一次，这里固定为 1，仅作占位兼容
  image?: string;
}

interface CartState {
  items: CartItem[];
  loading: boolean;
  ownerUserId: string | null;
  setOwner: (userId: string | null) => Promise<void>;
  fetchCart: () => Promise<void>;
  addItem: (item: { productId: string; name: string; price: number; image?: string; quantity?: number }) => Promise<void>;
  removeItem: (idOrProductId: string) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => void; // 后端不支持数量，保留空实现兼容调用方
  clearCart: () => Promise<void>;
  getTotalPrice: () => number;
  getTotalItems: () => number;
}

// 购物车存储完全以后端 Redis 为权威源；前端 Store 仅作当前会话的 UI 缓存，不持久化。
export const useCartStore = create<CartState>()((set, get) => ({
  items: [],
  loading: false,
  ownerUserId: null,
  // 切换属主 userId：不同则重置本地，追加拉取后端最新数据
  setOwner: async (userId: string | null) => {
    const cur = get().ownerUserId;
    if (cur === userId) return;
    set({ ownerUserId: userId, items: [] });
    if (userId) {
      await get().fetchCart();
    }
  },
  fetchCart: async () => {
    if (!get().ownerUserId) return;
    set({ loading: true });
    try {
      const res = await assetsApi.cart.get();
      const items: CartItem[] = (res.data || []).map((it: any) => ({
        id: it.asset_id,
        productId: it.asset_id,
        name: it.name,
        price: it.price,
        quantity: 1,
        image: it.coverKey,
      }));
      set({ items });
    } catch {
      // 拉取失败保持本地为空，备用
    } finally {
      set({ loading: false });
    }
  },
  addItem: async (item) => {
    if (!get().ownerUserId) {
      throw new Error('请先登录');
    }
    // 前端先做重复检查，避免穿透后端报错
    const existed = get().items.find((i) => i.productId === item.productId);
    if (existed) {
      throw new Error('该商品已在购物车中');
    }
    await assetsApi.cart.add(item.productId);
    set((state: CartState) => ({
      items: [
        ...state.items,
        {
          id: item.productId,
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: 1,
          image: item.image,
        },
      ],
    }));
  },
  removeItem: async (idOrProductId: string) => {
    if (!get().ownerUserId) return;
    // 兼容传 id 或 productId（现在二者相等）
    const target = get().items.find((i) => i.id === idOrProductId || i.productId === idOrProductId);
    const pid = target?.productId || idOrProductId;
    await assetsApi.cart.remove(pid);
    set((state: CartState) => ({
      items: state.items.filter((i) => i.productId !== pid),
    }));
  },
  updateQuantity: () => {
    // 后端模型不支持数量：保留接口以避免调用方报错，实际为 no-op
  },
  clearCart: async () => {
    const pids = get().items.map((i) => i.productId);
    // 并发删除，在支付成功等场景使用
    await Promise.allSettled(pids.map((pid) => assetsApi.cart.remove(pid)));
    set({ items: [] });
  },
  getTotalPrice: () => {
    const state = get() as CartState;
    return state.items.reduce((total: number, item: CartItem) => total + item.price * item.quantity, 0);
  },
  getTotalItems: () => {
    const state = get() as CartState;
    return state.items.reduce((total: number, item: CartItem) => total + item.quantity, 0);
  },
}));

// ============ AI Creation Store ============

type TaskStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed';

interface AITask {
  id: string;
  type: string;
  status: TaskStatus;
  result?: string;
  error?: string;
}

interface AICreationState {
  currentTask: AITask | null;
  setCurrentTask: (task: AITask | null) => void;
  updateStatus: (status: TaskStatus, result?: string, error?: string) => void;
}

export const useAICreationStore = create<AICreationState>()((set) => ({
  currentTask: null,
  setCurrentTask: (task: AITask | null) => set(() => ({ currentTask: task })),
  updateStatus: (status: TaskStatus, result?: string, error?: string) => set((state: AICreationState) => ({
    currentTask: state.currentTask ? { ...state.currentTask, status, result, error } : null,
  })),
}));

// ============ Wallet Store (仅内存，不持久化) ============

interface WalletState {
  privateKey: string | null;  // 私钥（仅内存，不持久化）
  walletType: 'metamask' | 'privateKey' | 'mnemonic' | null;  // 登录方式
  setPrivateKey: (privateKey: string | null) => void;
  setWalletType: (type: 'metamask' | 'privateKey' | 'mnemonic' | null) => void;
  clearWallet: () => void;
}

// 注意：不使用 persist，私钥仅保存在内存中，刷新页面后会清除
export const useWalletStore = create<WalletState>()((set) => ({
  privateKey: null,
  walletType: null,
  setPrivateKey: (privateKey: string | null) => set({ privateKey }),
  setWalletType: (walletType: 'metamask' | 'privateKey' | 'mnemonic' | null) => set({ walletType }),
  clearWallet: () => set({ privateKey: null, walletType: null }),
}));
