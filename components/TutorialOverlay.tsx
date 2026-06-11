import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useTutorial } from '../context/TutorialContext';

// ── Design tokens ─────────────────────────────────────────────────────────────
const ACCENT   = '#2d4070';
const BG       = '#ede0c4';
const BORDER   = '#b8a07a';
const TEXT     = '#1a2030';
const MUTED    = '#5a6880';
const GREEN    = '#1a6b35';
const TOOLTIP_W   = 300;
const TOOLTIP_MAX_H = 260; // max rendered height; used for vertical clamping
const POLL_MS  = 120;
const POLL_MAX = 25;  // ~3s
const OPEN_POLL_MS = 150;

// ── Helpers ───────────────────────────────────────────────────────────────────

interface SpotRect { x: number; y: number; w: number; h: number }

function buildClipPath(s: SpotRect, vpW: number, vpH: number): string {
  const { x, y, w, h } = s;
  return `polygon(0px 0px,${vpW}px 0px,${vpW}px ${vpH}px,0px ${vpH}px,0px 0px,${x}px ${y}px,${x}px ${y+h}px,${x+w}px ${y+h}px,${x+w}px ${y}px,${x}px ${y}px)`;
}

function routeMatchesPath(route: string, pathname: string): boolean {
  const clean = route.replace(/\/\([^)]+\)/g, '');
  return pathname === clean || pathname.startsWith(clean + '/');
}

const MAIN_TABS = ['/today', '/crews', '/history', '/leaderboard'];
function isMainTab(pathname: string): boolean {
  return MAIN_TABS.some((t) => pathname === t || pathname.startsWith(t + '/'));
}

// ── Exports ───────────────────────────────────────────────────────────────────

export function TutorialOverlay() {
  if (Platform.OS !== 'web') return null;
  return <TutorialOverlayWeb />;
}

// ── Web implementation ────────────────────────────────────────────────────────

function TutorialOverlayWeb() {
  const { isActive, currentStep, steps, nextStep, skipTutorial, triggerAction } = useTutorial();
  const router   = useRouter();
  const pathname = usePathname();

  const [spot, setSpot]       = useState<SpotRect | null>(null);
  const [visible, setVisible] = useState(false);
  const [vpSize, setVpSize]   = useState({
    w: typeof window !== 'undefined' ? window.innerWidth  : 0,
    h: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const openPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef    = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const stepRef     = useRef(currentStep);
  const wasActiveRef = useRef(false);
  stepRef.current   = currentStep;

  const stopAll = useCallback(() => {
    if (pollRef.current)     { clearInterval(pollRef.current);     pollRef.current     = null; }
    if (openPollRef.current) { clearInterval(openPollRef.current); openPollRef.current = null; }
    if (timerRef.current)    { clearTimeout(timerRef.current);     timerRef.current    = null; }
  }, []);

  // Inject CSS keyframes for the pulse animation once
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById('tutorial-keyframes')) return;
    const s = document.createElement('style');
    s.id = 'tutorial-keyframes';
    s.textContent = '@keyframes tutorial-pulse{0%,100%{opacity:1}50%{opacity:0.35}}';
    document.head.appendChild(s);
  }, []);

  // Viewport tracking
  useEffect(() => {
    const fn = () => setVpSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  // When tutorial ends while on a non-tab screen, send user home
  useEffect(() => {
    if (wasActiveRef.current && !isActive) {
      if (!isMainTab(pathname)) {
        router.replace('/(tabs)/today' as any);
      }
    }
    wasActiveRef.current = isActive;
  }, [isActive, pathname, router]);

  // Route watcher for advance:'route' steps — fires when pathname changes
  useEffect(() => {
    if (!isActive) return;
    const step = steps[currentStep];
    if (step.advance === 'route' && step.targetRoute) {
      if (routeMatchesPath(step.targetRoute, pathname)) {
        nextStep();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, isActive, currentStep]);

  // Core effect: navigation, spotlight, and polling
  useEffect(() => {
    if (!isActive) {
      stopAll();
      setVisible(false);
      setSpot(null);
      return;
    }

    const step = steps[currentStep];

    // For advance:'route', if the user just navigated to targetRoute, let the
    // route-watcher above handle it; don't navigate back.
    if (step.advance === 'route' && step.targetRoute && routeMatchesPath(step.targetRoute, pathname)) {
      return;
    }

    // Navigate if not on the right page
    if (!routeMatchesPath(step.route, pathname)) {
      stopAll();
      setVisible(false);
      router.replace(step.route as any);
      return;
    }

    // On the right page — reset and start
    setVisible(false);
    stopAll();

    if (step.action) triggerAction(step.action);
    const actionDelay = step.action ? (step.actionDelayMs ?? 350) : 0;

    // Center card (no targetId)
    if (!step.targetId) {
      timerRef.current = setTimeout(() => {
        setSpot(null);
        setVisible(true);
      }, actionDelay || 280);
      return;
    }

    // Poll for the target element
    timerRef.current = setTimeout(() => {
      let attempts = 0;
      pollRef.current = setInterval(() => {
        if (stepRef.current !== currentStep) { stopAll(); return; }
        attempts++;
        const el = document.getElementById(step.targetId!);
        if (el) {
          // If a gating element is required, wait for it to have data-open="true"
          if (step.gatingElementId) {
            const gateEl = document.getElementById(step.gatingElementId);
            if (!gateEl || (gateEl as HTMLElement).dataset.open !== 'true') {
              return; // menu not open yet — retry next tick
            }
          }
          const r = el.getBoundingClientRect();
          // Keep polling until the element is actually laid out (non-zero dimensions)
          if (r.width === 0 || r.height === 0) {
            return; // not ready yet — retry next tick
          }
          stopAll(); // stop target poll
          const pad = step.padding ?? 8;
          setSpot({ x: r.x - pad, y: r.y - pad, w: r.width + pad * 2, h: r.height + pad * 2 });
          setVisible(true);

          // For element-open: poll openElementId for data-open="true"
          if (step.advance === 'element-open' && step.openElementId) {
            openPollRef.current = setInterval(() => {
              if (stepRef.current !== currentStep) {
                clearInterval(openPollRef.current!); openPollRef.current = null; return;
              }
              const openEl = document.getElementById(step.openElementId!);
              if (!openEl) return;
              // Detect open via data attribute set by SideMenu
              if ((openEl as HTMLElement).dataset.open === 'true') {
                clearInterval(openPollRef.current!); openPollRef.current = null;
                // Wait for the slide-in animation to finish before advancing
                timerRef.current = setTimeout(nextStep, 300);
              }
            }, OPEN_POLL_MS);
          }
        } else if (attempts >= POLL_MAX) {
          stopAll();
          setSpot(null);
          setVisible(true);
        }
      }, POLL_MS);
    }, actionDelay);

    return stopAll;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, currentStep, pathname]);

  if (!isActive || typeof document === 'undefined') return null;

  const { createPortal } = require('react-dom');
  const step      = steps[currentStep];
  const isLast    = currentStep === steps.length - 1;
  const isDone    = isLast;
  const isInteractive = step.advance !== 'next'; // user must tap a real element
  const { w: vpW, h: vpH } = vpSize;

  const clipPath    = spot ? buildClipPath(spot, vpW, vpH) : undefined;
  const centerX     = spot ? spot.x + spot.w / 2 : vpW / 2;
  const tooltipLeft = Math.max(12, Math.min(centerX - TOOLTIP_W / 2, vpW - TOOLTIP_W - 12));

  let tooltipStyle: React.CSSProperties;
  if (!spot || step.tooltipPos === 'center') {
    tooltipStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  } else if (step.tooltipPos === 'above') {
    // Clamp so tooltip never gets pushed above viewport top (bottom-anchored)
    const rawBottom = vpH - spot.y + 14;
    tooltipStyle = { bottom: Math.min(rawBottom, vpH - TOOLTIP_MAX_H - 12), left: tooltipLeft };
  } else {
    // Clamp so tooltip never overflows viewport bottom
    const rawTop = spot.y + spot.h + 14;
    tooltipStyle = { top: Math.min(rawTop, vpH - TOOLTIP_MAX_H - 12), left: tooltipLeft };
  }

  const showArrow  = !!spot && step.tooltipPos !== 'center';
  const arrowLeft  = spot ? Math.max(16, Math.min(spot.x + spot.w / 2 - 8, vpW - 32)) : 0;
  const arrowUp    = step.tooltipPos !== 'above';

  const overlay = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99990,
        // For interactive steps the whole overlay is pointer-events:none so the
        // spotlighted element underneath can be tapped. The tooltip card overrides
        // this with its own explicit pointer-events:auto below.
        pointerEvents: visible ? (isInteractive ? 'none' : undefined) : 'none',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.22s ease',
      }}
    >
      {/* Dark backdrop — pointer-events:none for interactive steps so user can tap spotlight */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.72)',
          clipPath,
          transition: 'clip-path 0.38s cubic-bezier(0.4,0,0.2,1)',
          cursor: isInteractive ? 'default' : 'pointer',
          pointerEvents: isInteractive ? 'none' : undefined,
        }}
        onClick={!isInteractive ? skipTutorial : undefined}
        title={!isInteractive ? 'Tap to skip' : undefined}
      />

      {/* Highlight ring */}
      {spot && (
        <div
          style={{
            position: 'absolute',
            left: spot.x, top: spot.y,
            width: spot.w, height: spot.h,
            border: `2px solid ${ACCENT}`,
            borderRadius: 8,
            boxShadow: '0 0 0 1px rgba(45,64,112,0.25), 0 0 14px 3px rgba(45,64,112,0.2)',
            pointerEvents: 'none',
            transition: 'left 0.38s cubic-bezier(0.4,0,0.2,1), top 0.38s cubic-bezier(0.4,0,0.2,1), width 0.38s cubic-bezier(0.4,0,0.2,1), height 0.38s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      )}

      {/* Arrow */}
      {showArrow && (
        <div
          style={{
            position: 'absolute',
            left: arrowLeft,
            width: 0, height: 0,
            pointerEvents: 'none',
            ...(arrowUp
              ? { top: spot!.y + spot!.h, borderBottom: `10px solid ${ACCENT}`, borderLeft: '8px solid transparent', borderRight: '8px solid transparent' }
              : { top: spot!.y - 14,      borderTop:    `10px solid ${ACCENT}`, borderLeft: '8px solid transparent', borderRight: '8px solid transparent' }
            ),
            transition: 'left 0.38s cubic-bezier(0.4,0,0.2,1), top 0.38s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      )}

      {/* Tooltip card — always captures pointer events even when parent is none */}
      <div
        style={{
          position: 'fixed',
          width: TOOLTIP_W,
          maxHeight: TOOLTIP_MAX_H,
          overflowY: 'auto',
          background: BG,
          border: `2px solid ${ACCENT}`,
          boxShadow: '3px 3px 0 rgba(0,0,0,0.35)',
          padding: '18px 20px 16px',
          zIndex: 1,
          pointerEvents: 'auto',
          ...tooltipStyle,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 14 }}>
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === currentStep ? 14 : 6,
                height: 6,
                background: i === currentStep ? ACCENT : i < currentStep ? '#7a8898' : BORDER,
                transition: 'width 0.2s ease, background 0.2s ease',
              }}
            />
          ))}
        </div>

        {/* Title */}
        <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 11, color: ACCENT, marginBottom: 12, lineHeight: 1.6 }}>
          {step.title}
        </div>

        {/* Body */}
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: TEXT, marginBottom: 18, lineHeight: 1.6 }}>
          {step.body}
        </div>

        {/* Buttons / hint */}
        {isInteractive ? (
          // Interactive step: skip button + pulsing tap hint
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={skipTutorial} style={btn('ghost')}>SKIP TOUR</button>
            <div style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: 7,
              color: ACCENT,
              textAlign: 'right',
              lineHeight: 1.5,
              animation: 'tutorial-pulse 1.4s ease-in-out infinite',
            }}>
              {step.tooltipPos === 'above' ? 'TAP ↓ TO' : step.tooltipPos === 'center' ? 'TAP IT TO' : 'TAP ↑ TO'}{'\n'}CONTINUE
            </div>
          </div>
        ) : isDone ? (
          // Last done card
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={nextStep} style={btn('done')}>LET'S GO!</button>
          </div>
        ) : (
          // Standard next step
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <button onClick={skipTutorial} style={btn('ghost')}>SKIP TOUR</button>
            <button onClick={nextStep} style={btn('primary')}>{`NEXT  ${currentStep + 1}/${steps.length}`}</button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(overlay, document.body) as React.ReactElement;
}

// ── Button style helper ───────────────────────────────────────────────────────

function btn(variant: 'primary' | 'ghost' | 'done'): React.CSSProperties {
  const base: React.CSSProperties = {
    fontFamily: '"Press Start 2P", monospace',
    fontSize: 8,
    border: '2px solid',
    padding: '9px 14px',
    cursor: 'pointer',
    letterSpacing: 0,
    lineHeight: 1,
    WebkitTapHighlightColor: 'transparent',
  };
  if (variant === 'primary') return { ...base, color: BG,   background: ACCENT, borderColor: ACCENT, boxShadow: '2px 2px 0 rgba(0,0,0,0.35)' };
  if (variant === 'done')    return { ...base, color: BG,   background: GREEN,  borderColor: GREEN,  boxShadow: '2px 2px 0 rgba(0,0,0,0.35)' };
  return                            { ...base, color: MUTED, background: 'transparent', borderColor: BORDER };
}
