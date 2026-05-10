'use client';

import { usePublicConfig } from '@/hooks/usePublicConfig';

/**
 * 站点页脚：版权 / 备案 / 联系方式 / 友情链接
 * 所有字段均从 /auth/public-config 动态读取，未配置则不渲染对应行
 */
export function SiteFooter() {
  const cfg = usePublicConfig();

  const hasBeian = !!(cfg.icp || cfg.policeICP || cfg.businessLicense || cfg.otherLicense);
  const hasContact = !!(cfg.contactPhone || cfg.supportEmail || cfg.contactEmail || cfg.companyAddress);
  const hasAny =
    hasBeian ||
    hasContact ||
    !!cfg.footerCopyright ||
    !!cfg.footerText ||
    !!cfg.companyName ||
    !!cfg.friendLinks;

  if (!hasAny) return null;

  let friendLinks: Array<{ name: string; url: string }> = [];
  if (cfg.friendLinks) {
    try {
      const parsed = JSON.parse(cfg.friendLinks);
      if (Array.isArray(parsed)) friendLinks = parsed;
    } catch {
      // ignore invalid JSON
    }
  }

  const copyright =
    cfg.footerCopyright ||
    `© ${new Date().getFullYear()} ${cfg.productName || cfg.siteName || '巴特星球'}. All Rights Reserved.`;

  return (
    <footer className="mt-auto border-t bg-background/60 px-6 py-4 text-xs text-muted-foreground">
      <div className="mx-auto max-w-6xl space-y-2">
        {hasContact && (
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            {cfg.companyName && <span>{cfg.companyName}</span>}
            {cfg.contactPhone && <span>客服电话：{cfg.contactPhone}</span>}
            {(cfg.supportEmail || cfg.contactEmail) && (
              <span>邮箱：{cfg.supportEmail || cfg.contactEmail}</span>
            )}
            {cfg.companyAddress && <span>地址：{cfg.companyAddress}</span>}
          </div>
        )}

        {hasBeian && (
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            {cfg.icp && (
              <a
                href="https://beian.miit.gov.cn/"
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground"
              >
                {cfg.icp}
              </a>
            )}
            {cfg.policeICP && (
              <a
                href="https://beian.mps.gov.cn/"
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground"
              >
                {cfg.policeICP}
              </a>
            )}
            {cfg.businessLicense && <span>{cfg.businessLicense}</span>}
            {cfg.otherLicense && <span>{cfg.otherLicense}</span>}
          </div>
        )}

        {friendLinks.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <span>友情链接：</span>
            {friendLinks.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground"
              >
                {link.name}
              </a>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <span>{copyright}</span>
          {cfg.footerText && <span>{cfg.footerText}</span>}
        </div>
      </div>
    </footer>
  );
}
