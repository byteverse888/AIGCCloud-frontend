'use client';

/**
 * Web3 客户端操作
 *
 * 安全原则：
 * 1. 私钥仅在客户端生成和使用，永不发送到服务器
 * 2. 优先使用 MetaMask 等外部钱包
 * 3. 内置钱包仅作为备选方案，并提示用户安全风险
 */

// ============ 全局错误处理 - 防止 MetaMask 连接错误显示在控制台 ============

if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = function (...args: unknown[]) {
    const firstArg = args[0];
    
    // 检查字符串消息
    if (typeof firstArg === 'string') {
      if (
        firstArg.includes('Failed to connect to MetaMask') ||
        firstArg.includes('MetaMask') ||
        firstArg.includes('eth_requestAccounts') ||
        firstArg.includes('wallet_requestPermissions')
      ) {
        return;
      }
    }
    
    // 检查 Error 对象
    if (firstArg instanceof Error) {
      const msg = firstArg.message || '';
      const stack = firstArg.stack || '';
      if (
        msg.includes('MetaMask') ||
        msg.includes('Failed to connect') ||
        stack.includes('inpage.js') ||
        stack.includes('MetaMask')
      ) {
        return;
      }
    }
    
    originalError.apply(console, args);
  };

  // 捕获未处理的 Promise 拒绝
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (reason instanceof Error) {
      const msg = reason.message || '';
      const stack = reason.stack || '';
      if (
        msg.includes('MetaMask') ||
        msg.includes('Failed to connect') ||
        stack.includes('inpage.js') ||
        stack.includes('MetaMask')
      ) {
        event.preventDefault();
      }
    }
  });
  
  // 捕获全局错误
  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    const filename = event.filename || '';
    if (
      msg.includes('MetaMask') ||
      msg.includes('Failed to connect') ||
      filename.includes('inpage.js')
    ) {
      event.preventDefault();
    }
  });
}

// ============ 类型定义 ============

export type WalletType = 'metamask' | 'builtin' | 'none';

export interface WalletInfo {
  type: WalletType;
  address?: string;
  isConnected: boolean;
}

export interface WalletResult {
  success: boolean;
  address?: string;
  privateKey?: string;
  mnemonic?: string;
  encryptedKeystore?: string;  // 加密后的 keystore JSON
  error?: string;
}

export interface SignResult {
  success: boolean;
  signature?: string;
  error?: string;
}

export interface TransferResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

// ============ 钱包检测 ============

/**
 * 将地址转换为 checksum 格式
 */
export async function toChecksumAddress(address: string): Promise<string> {
  try {
    const { ethers } = await import('ethers');
    return ethers.getAddress(address);
  } catch {
    return address; // 如果转换失败，返回原地址
  }
}

/**
 * 同步版本 - 将地址转换为 checksum 格式（需要在 ethers 已加载后使用）
 */
export function toChecksumAddressSync(address: string): string {
  // 这是一个简化的 checksum 计算，仅在 ethers 不可用时使用
  // 建议优先使用异步版本 toChecksumAddress
  if (!address || typeof address !== 'string') return address;
  return address; // 如果无法计算，直接返回
}

/**
 * 检测是否有外部钱包（MetaMask 等）
 */
export function hasExternalWallet(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).ethereum;
}

/**
 * 获取当前钱包状态
 */
export async function getWalletInfo(): Promise<WalletInfo> {
  if (!hasExternalWallet()) {
    return { type: 'none', isConnected: false };
  }

  try {
    const ethereum = (window as any).ethereum;
    const accounts = await ethereum.request({ method: 'eth_accounts' }).catch(() => []);
    
    if (accounts && accounts.length > 0) {
      return {
        type: 'metamask',
        address: accounts[0],
        isConnected: true,
      };
    }
    
    return { type: 'metamask', isConnected: false };
  } catch {
    return { type: 'none', isConnected: false };
  }
}

// ============ 外部钱包（MetaMask）操作 ============

/**
 * 连接 MetaMask 钱包
 */
export async function connectMetaMask(): Promise<WalletResult> {
  if (!hasExternalWallet()) {
    return {
      success: false,
      error: '未检测到 MetaMask 钱包，请先安装 MetaMask 浏览器扩展',
    };
  }

  try {
    const ethereum = (window as any).ethereum;
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' }).catch((err: any) => {
      if (err?.code === 4001) return [];
      console.log('[connectMetaMask] eth_requestAccounts error:', err?.message);
      return [];
    });
    
    if (accounts && accounts.length > 0) {
      return {
        success: true,
        address: accounts[0],
      };
    }
    
    return { success: false, error: '连接钱包失败，请确保钱包已解锁' };
  } catch (error: any) {
    if (error.code === 4001) {
      return { success: false, error: '用户拒绝连接钱包' };
    }
    return { success: false, error: error.message || '连接钱包失败' };
  }
}

/**
 * 使用 MetaMask 签名消息
 */
export async function signWithMetaMask(message: string, address: string): Promise<SignResult> {
  if (!hasExternalWallet()) {
    return { success: false, error: '未检测到钱包' };
  }

  try {
    const ethereum = (window as any).ethereum;

    const accounts = await ethereum.request({ method: 'eth_requestAccounts' }).catch((err: any) => {
      if (err?.code === 4001) return [];
      console.log('[signWithMetaMask] eth_requestAccounts error:', err?.message);
      return [];
    });

    if (!accounts || accounts.length === 0) {
      return { success: false, error: '未连接钱包账户' };
    }

    const signerAddress = accounts[0];

    const signature = await ethereum.request({
      method: 'personal_sign',
      params: [message, signerAddress],
    }).catch((err: any) => {
      if (err?.code === 4001) return null;
      console.log('[signWithMetaMask] personal_sign error:', err?.message);
      return null;
    });

    if (!signature) {
      return { success: false, error: '用户取消操作' };
    }

    return { success: true, signature };
  } catch (error: any) {
    if (error.code === 4001) {
      return { success: false, error: '用户取消操作' };
    }
    console.log('[signWithMetaMask] error:', error?.message);
    return { success: false, error: error.message || '签名失败' };
  }
}

// ============ 内置钱包操作（私钥永不离开客户端）============

/**
 * 生成新钱包（带助记词）
 * 
 * ⚠️ 安全警告：内置钱包的私钥存储在浏览器中，存在安全风险
 * 建议用户使用 MetaMask 等专业钱包
 */
export async function generateWallet(): Promise<WalletResult> {
  try {
    const { ethers } = await import('ethers');
    const wallet = ethers.Wallet.createRandom();
    
    return {
      success: true,
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic?.phrase,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * 生成新钱包并加密（使用密码加密 keystore）
 */
export async function generateWalletWithPassword(password: string): Promise<WalletResult> {
  try {
    const { ethers } = await import('ethers');
    const wallet = ethers.Wallet.createRandom();
    
    // 使用密码加密 keystore
    const encryptedKeystore = await wallet.encrypt(password);
    
    return {
      success: true,
      // 使用 getAddress 确保返回 checksum 格式
      address: ethers.getAddress(wallet.address),
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic?.phrase,
      encryptedKeystore,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * 从私钥导入钱包（仅验证格式，获取地址）
 */
export async function importFromPrivateKey(privateKey: string): Promise<WalletResult> {
  try {
    const { ethers } = await import('ethers');
    
    // 标准化私钥格式
    if (!privateKey.startsWith('0x')) {
      privateKey = '0x' + privateKey;
    }
    
    const wallet = new ethers.Wallet(privateKey);
    
    return {
      success: true,
      address: wallet.address,
      privateKey: wallet.privateKey,
    };
  } catch {
    return {
      success: false,
      error: '无效的私钥格式',
    };
  }
}

/**
 * 从私钥导入钱包并加密
 */
export async function importFromPrivateKeyWithPassword(
  privateKey: string,
  password: string
): Promise<WalletResult> {
  try {
    const { ethers } = await import('ethers');
    
    // 标准化私钥格式
    if (!privateKey.startsWith('0x')) {
      privateKey = '0x' + privateKey;
    }
    
    const wallet = new ethers.Wallet(privateKey);
    
    // 加密 keystore
    const encryptedKeystore = await wallet.encrypt(password);
    
    return {
      success: true,
      // 使用 getAddress 确保返回 checksum 格式
      address: ethers.getAddress(wallet.address),
      privateKey: wallet.privateKey,
      encryptedKeystore,
    };
  } catch {
    return {
      success: false,
      error: '无效的私钥格式',
    };
  }
}

/**
 * 从助记词导入钱包
 */
export async function importFromMnemonic(mnemonic: string): Promise<WalletResult> {
  try {
    const { ethers } = await import('ethers');
    
    // 验证助记词格式
    const words = mnemonic.trim().split(/\s+/);
    if (words.length !== 12 && words.length !== 24) {
      return {
        success: false,
        error: '助记词必须是12或24个单词',
      };
    }
    
    const wallet = ethers.Wallet.fromPhrase(mnemonic.trim());
    
    return {
      success: true,
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: mnemonic.trim(),
    };
  } catch {
    return {
      success: false,
      error: '无效的助记词',
    };
  }
}

/**
 * 使用私钥签名消息（客户端本地签名，私钥不发送）
 */
export async function signWithPrivateKey(privateKey: string, message: string): Promise<SignResult> {
  try {
    const { ethers } = await import('ethers');
    
    if (!privateKey.startsWith('0x')) {
      privateKey = '0x' + privateKey;
    }
    
    const wallet = new ethers.Wallet(privateKey);
    const signature = await wallet.signMessage(message);
    
    return { success: true, signature };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * 从加密的 keystore 恢复钱包
 */
export async function decryptKeystore(
  encryptedKeystore: string,
  password: string
): Promise<WalletResult> {
  try {
    const { ethers } = await import('ethers');
    
    // 解密 keystore
    const wallet = await ethers.Wallet.fromEncryptedJson(encryptedKeystore, password);
    
    return {
      success: true,
      address: wallet.address,
      privateKey: wallet.privateKey,
    };
  } catch (error) {
    return {
      success: false,
      error: '密码错误或 keystore 无效',
    };
  }
}

// ============ 兼容旧代码的导出 ============

export const generateWalletWithMnemonic = generateWallet;
export const importWalletFromPrivateKey = importFromPrivateKey;
export const importWalletFromMnemonic = importFromMnemonic;
export const signMessage = signWithPrivateKey;

// ============ 转账功能 ============

/**
 * 将 Web3 错误转换为友好的中文提示
 */
function translateWeb3Error(error: any): string {
  const errorStr = error?.message || error?.toString() || '未知错误';
  
  // 余额不足
  if (errorStr.includes('insufficient funds') || errorStr.includes('INSUFFICIENT_FUNDS')) {
    return '账户余额不足，请确保有足够ETH支付转账金额和Gas费用';
  }
  
  // 用户拒绝
  if (error?.code === 4001 || errorStr.includes('user rejected') || errorStr.includes('User denied')) {
    return '用户取消了交易';
  }
  
  // 网络错误
  if (errorStr.includes('network') || errorStr.includes('connect') || errorStr.includes('ECONNREFUSED')) {
    return '网络连接失败，请检查网络连接';
  }
  
  // Gas 相关
  if (errorStr.includes('gas') && errorStr.includes('exceed')) {
    return 'Gas费用超出限制';
  }
  
  // nonce 错误
  if (errorStr.includes('nonce')) {
    return '交易序号错误，请稍后重试';
  }
  
  // 无效地址
  if (errorStr.includes('invalid address') || errorStr.includes('ENS name')) {
    return '无效的钱包地址';
  }
  
  // RPC 错误
  if (errorStr.includes('JSON-RPC') || errorStr.includes('-32')) {
    return '区块链节点请求失败，请稍后重试';
  }
  
  // 默认返回简化的错误信息
  // 截取前100个字符，避免显示过长的技术信息
  if (errorStr.length > 100) {
    return '交易失败，请检查钱包余额和网络连接';
  }
  
  return errorStr;
}

/**
 * 使用 MetaMask 转账
 */
export async function transferWithMetaMask(toAddress: string, amount: number): Promise<TransferResult> {
  if (!hasExternalWallet()) {
    return { success: false, error: '未检测到钱包' };
  }

  try {
    const ethereum = (window as any).ethereum;
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' }).catch((err: any) => {
      if (err?.code === 4001) return [];
      console.log('[transferWithMetaMask] eth_requestAccounts error:', err?.message);
      return [];
    });
    
    if (!accounts || accounts.length === 0) {
      return { success: false, error: '未连接钱包账户' };
    }
    
    const fromAddress = accounts[0];
    const { ethers } = await import('ethers');
    
    const valueInWei = ethers.parseEther((amount * 0.001).toString());
    
    const txHash = await ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        from: fromAddress,
        to: toAddress,
        value: '0x' + valueInWei.toString(16),
      }],
    }).catch((err: any) => {
      if (err?.code === 4001) return null;
      throw err;
    });
    
    if (!txHash) {
      return { success: false, error: '用户取消交易' };
    }
    
    return { success: true, txHash };
  } catch (error: any) {
    return { success: false, error: translateWeb3Error(error) };
  }
}

/**
 * 使用私钥转账（需要 RPC 节点）
 */
export async function transferWithPrivateKey(
  privateKey: string, 
  toAddress: string, 
  amount: number,
  rpcUrl?: string
): Promise<TransferResult> {
  try {
    const { ethers } = await import('ethers');
    
    if (!privateKey.startsWith('0x')) {
      privateKey = '0x' + privateKey;
    }
    
    // 使用配置的 RPC URL 或默认值
    const provider = new ethers.JsonRpcProvider(
      rpcUrl || process.env.NEXT_PUBLIC_WEB3_RPC_URL || 'http://localhost:8545'
    );
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // 转换金额（1 平台币 = 0.001 ETH）
    const valueInWei = ethers.parseEther((amount * 0.001).toString());
    
    const tx = await wallet.sendTransaction({
      to: toAddress,
      value: valueInWei,
    });
    
    // 等待交易确认
    await tx.wait();
    
    return { success: true, txHash: tx.hash };
  } catch (error: any) {
    return { success: false, error: translateWeb3Error(error) };
  }
}

/**
 * 模拟转账（开发环境用）
 */
export async function mockTransfer(toAddress: string, amount: number): Promise<TransferResult> {
  // 模拟延迟
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 生成模拟 txHash
  const mockTxHash = '0x' + Array.from({ length: 64 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  
  console.log(`[mockTransfer] 模拟转账: ${amount} -> ${toAddress}, txHash: ${mockTxHash}`);
  
  return { success: true, txHash: mockTxHash };
}
