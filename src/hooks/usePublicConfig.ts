'use client';

import { useState, useEffect } from 'react';
import { authApi } from '@/lib/api';

export interface PublicConfig {
  siteName: string;
  productName: string;
  slogan: string;
  siteUrl: string;
  contactEmail: string;
  contactPhone: string;
  supportEmail: string;
  companyName: string;
  companyAddress: string;
  icp: string;
  policeICP: string;
  businessLicense: string;
  otherLicense: string;
  footerText: string;
  footerCopyright: string;
  friendLinks: string;
  lightLogo: string;
  darkLogo: string;
  favicon: string;
  loginBg: string;
  loginCaptcha: boolean;
}

const DEFAULT_CONFIG: PublicConfig = {
  siteName: '巴特星球',
  productName: '巴特星球',
  slogan: '',
  siteUrl: '',
  contactEmail: '',
  contactPhone: '',
  supportEmail: '',
  companyName: '',
  companyAddress: '',
  icp: '',
  policeICP: '',
  businessLicense: '',
  otherLicense: '',
  footerText: '',
  footerCopyright: '',
  friendLinks: '',
  lightLogo: '',
  darkLogo: '',
  favicon: '',
  loginBg: '',
  loginCaptcha: false,
};

// 进程内缓存（SPA 导航间不重复请求）
let cachedConfig: PublicConfig | null = null;
let pendingPromise: Promise<PublicConfig> | null = null;

async function fetchConfig(): Promise<PublicConfig> {
  if (cachedConfig) return cachedConfig;
  if (pendingPromise) return pendingPromise;
  pendingPromise = (async () => {
    try {
      const res = await authApi.getPublicConfig();
      const data = (res.data || {}) as Partial<PublicConfig>;
      const merged: PublicConfig = { ...DEFAULT_CONFIG, ...data };
      cachedConfig = merged;
      return merged;
    } catch {
      return DEFAULT_CONFIG;
    } finally {
      pendingPromise = null;
    }
  })();
  return pendingPromise;
}

export function refreshPublicConfig() {
  cachedConfig = null;
  pendingPromise = null;
}

/**
 * 读取站点公开配置（登录页/侧栏/页脚等）。自动缓存在进程内。
 */
export function usePublicConfig(): PublicConfig {
  const [config, setConfig] = useState<PublicConfig>(() => cachedConfig || DEFAULT_CONFIG);

  useEffect(() => {
    let cancelled = false;
    fetchConfig().then((c) => {
      if (!cancelled) setConfig(c);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return config;
}
