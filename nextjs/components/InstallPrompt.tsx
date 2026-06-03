'use client';

import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { Download, Share } from 'lucide-react';

interface InstallPromptProps {
  compact?: boolean;
}

export function InstallPrompt({ compact = false }: InstallPromptProps) {
  const { canInstall, isIOS, showPrompt, triggerInstall } = useInstallPrompt();

  if (!showPrompt) return null;

  const pixelFont = { fontFamily: '"Press Start 2P", monospace' };

  if (isIOS) {
    return (
      <div
        className="space-y-2"
        style={{
          padding: compact ? '10px 12px' : '12px 14px',
          border: '2px solid var(--border)',
          background: 'var(--surface-2)',
          boxShadow: '2px 2px 0 #000',
        }}
      >
        <div className="flex items-center gap-2">
          <Share size={13} color="var(--accent)" />
          <span style={{ ...pixelFont, fontSize: '7px', color: 'var(--accent)' }}>ADD TO HOME SCREEN</span>
        </div>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Tap the <span style={{ color: 'var(--text)', fontWeight: 600 }}>Share</span> icon in Safari, then{' '}
          <span style={{ color: 'var(--text)', fontWeight: 600 }}>&ldquo;Add to Home Screen&rdquo;</span>
        </p>
      </div>
    );
  }

  if (canInstall) {
    return (
      <button
        onClick={triggerInstall}
        className="w-full flex items-center justify-center gap-2 cursor-pointer transition-all active:translate-y-px"
        style={{
          ...pixelFont,
          fontSize: '8px',
          padding: compact ? '10px 14px' : '12px 14px',
          border: '2px solid var(--accent)',
          boxShadow: 'var(--glow-accent), 2px 2px 0 #000',
          background: 'var(--accent-light)',
          color: 'var(--accent)',
          borderBottom: '2px solid var(--border)'
        }}
      >
        <Download size={13} />
        ADD TO HOME SCREEN
      </button>
    );
  }

  return null;
}
