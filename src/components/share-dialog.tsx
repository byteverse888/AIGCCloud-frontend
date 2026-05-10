'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { QrCode, Copy, Check, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { copyText } from '@/lib/utils';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  url: string;
  platform: 'wechat' | 'weibo';
}

export function ShareDialog({ open, onOpenChange, title, description, url, platform }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyText(url);
    if (ok) {
      setCopied(true);
      toast.success('链接已复制');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('复制失败，请手动复制');
    }
  };

  // 生成二维码URL（使用公共API）
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;

  if (platform === 'wechat') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
                <MessageCircle className="h-4 w-4 text-white" />
              </div>
              分享到微信
            </DialogTitle>
            <DialogDescription>
              打开微信扫一扫，分享给好友或朋友圈
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center space-y-4 py-4">
            <div className="p-4 bg-white rounded-lg border">
              <img src={qrCodeUrl} alt="微信分享二维码" className="w-48 h-48" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {title}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground text-center">
                {description}
              </p>
            )}
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    复制链接
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // 微博分享 - 直接打开微博分享页面
  const weiboShareUrl = `https://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}${description ? `&summary=${encodeURIComponent(description)}` : ''}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center">
              <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9.197 7.098C6.22 7.88 3.97 10.56 3.97 13.68c0 3.6 3.57 6.18 7.17 6.18 4.62 0 8.88-3.18 8.88-7.02 0-2.1-1.5-3.54-3.42-3.54-2.34 0-4.26 2.04-4.26 4.38 0 1.5 1.08 2.58 2.58 2.58.9 0 1.68-.42 2.1-1.08.12-.18.06-.36-.12-.42-.6-.18-1.08-.6-1.08-1.32 0-1.14.96-2.1 2.1-2.1 1.44 0 2.4 1.14 2.4 2.64 0 2.88-2.88 5.16-6.54 5.16-2.88 0-5.28-1.98-5.28-4.68 0-2.52 2.16-4.8 4.86-5.4.36-.06.54-.42.42-.78-.12-.36-.48-.54-.84-.42z"/>
              </svg>
            </div>
            分享到微博
          </DialogTitle>
          <DialogDescription>
            将内容分享到新浪微博
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4 py-4">
          <div className="p-4 bg-muted rounded-lg w-full">
            <p className="text-sm font-medium">{title}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
            <p className="text-xs text-primary mt-2 truncate">{url}</p>
          </div>
          
          <div className="flex gap-2 w-full">
            <Button variant="outline" className="flex-1" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  复制链接
                </>
              )}
            </Button>
            <Button
              className="flex-1 bg-red-500 hover:bg-red-600"
              onClick={() => window.open(weiboShareUrl, '_blank', 'width=600,height=500')}
            >
              立即分享
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 简便的分享按钮组件
interface ShareButtonProps {
  platform: 'wechat' | 'weibo';
  url: string;
  title: string;
  description?: string;
  className?: string;
}

export function ShareButton({ platform, url, title, description, className }: ShareButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleClick = () => {
    if (platform === 'weibo') {
      // 微博可以直接打开分享页面
      const weiboShareUrl = `https://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}${description ? `&summary=${encodeURIComponent(description)}` : ''}`;
      window.open(weiboShareUrl, '_blank', 'width=600,height=500');
    } else {
      // 微信需要显示二维码
      setDialogOpen(true);
    }
  };

  return (
    <>
      <Button variant="outline" className={className} onClick={handleClick}>
        {platform === 'wechat' ? (
          <>
            <MessageCircle className="mr-2 h-4 w-4" />
            分享到微信
          </>
        ) : (
          <>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9.197 7.098C6.22 7.88 3.97 10.56 3.97 13.68c0 3.6 3.57 6.18 7.17 6.18 4.62 0 8.88-3.18 8.88-7.02 0-2.1-1.5-3.54-3.42-3.54-2.34 0-4.26 2.04-4.26 4.38 0 1.5 1.08 2.58 2.58 2.58.9 0 1.68-.42 2.1-1.08.12-.18.06-.36-.12-.42-.6-.18-1.08-.6-1.08-1.32 0-1.14.96-2.1 2.1-2.1 1.44 0 2.4 1.14 2.4 2.64 0 2.88-2.88 5.16-6.54 5.16-2.88 0-5.28-1.98-5.28-4.68 0-2.52 2.16-4.8 4.86-5.4.36-.06.54-.42.42-.78-.12-.36-.48-.54-.84-.42z"/>
            </svg>
            分享到微博
          </>
        )}
      </Button>
      
      {platform === 'wechat' && (
        <ShareDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          platform="wechat"
          url={url}
          title={title}
          description={description}
        />
      )}
    </>
  );
}
