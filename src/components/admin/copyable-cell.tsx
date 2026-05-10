'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface CopyableCellProps {
  /** 实际要复制的完整文本 */
  value: string;
  /** 展示文本，默认与 value 相同（支持截短展示） */
  display?: string;
  /** Tailwind 最大宽度类名，控制单元格宽度 */
  maxWidth?: string;
  className?: string;
  fallback?: string;
  mono?: boolean;
}

/**
 * 可复制单元格
 * - 超长文本使用 truncate 省略显示
 * - 鼠标悬停显示完整内容（title tooltip）
 * - 点击右侧复制按钮一键复制
 */
export function CopyableCell({
  value,
  display,
  maxWidth = 'max-w-[180px]',
  className = '',
  fallback = '-',
  mono = false,
}: CopyableCellProps) {
  const [copied, setCopied] = useState(false);
  const text = value || '';

  if (!text) {
    return <span className="text-muted-foreground">{fallback}</span>;
  }

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // 尝试使用 Clipboard API（仅在 HTTPS/localhost 下可用）
    const tryClipboardApi = async (): Promise<boolean> => {
      try {
        if (
          typeof navigator !== 'undefined' &&
          navigator.clipboard &&
          typeof navigator.clipboard.writeText === 'function' &&
          (typeof window === 'undefined' || window.isSecureContext !== false)
        ) {
          await navigator.clipboard.writeText(text);
          return true;
        }
      } catch {
        // 跌回 execCommand
      }
      return false;
    };

    // 降级方案：临时 textarea + document.execCommand('copy')
    const tryExecCommand = (): boolean => {
      if (typeof document === 'undefined') return false;
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '0';
        ta.style.left = '0';
        ta.style.width = '1px';
        ta.style.height = '1px';
        ta.style.opacity = '0';
        ta.style.pointerEvents = 'none';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ta.setSelectionRange(0, text.length);
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
      } catch {
        return false;
      }
    };

    const ok = (await tryClipboardApi()) || tryExecCommand();
    if (ok) {
      setCopied(true);
      toast.success('已复制');
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error('复制失败，请手动复制');
    }
  };

  return (
    <div className={`group inline-flex items-center gap-1 align-middle ${maxWidth} ${className}`}>
      <span
        className={`truncate ${mono ? 'font-mono' : ''}`}
        title={text}
      >
        {display || text}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        className="flex-shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity"
        title="复制"
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-600" />
        ) : (
          <Copy className="h-3 w-3 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}
