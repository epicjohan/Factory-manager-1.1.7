import React, { useEffect, useState } from 'react';
import { useAppUpdate } from '../hooks/useAppUpdate';

/**
 * UpdateBanner
 * Verschijnt onderaan het scherm als er een nieuwe versie beschikbaar is.
 * De gebruiker kan klikken op "Vernieuwen" om de update toe te passen,
 * of op "Later" om de banner te sluiten.
 */
export const UpdateBanner: React.FC = () => {
  const { updateAvailable, swUpdateReady, currentBuild, applyUpdate, dismiss } = useAppUpdate();
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (updateAvailable) {
      setVisible(true);
      // Kleine delay voor smooth slide-in animatie
      requestAnimationFrame(() => {
        setTimeout(() => setAnimateIn(true), 50);
      });
    } else {
      setAnimateIn(false);
      const timeout = setTimeout(() => setVisible(false), 400);
      return () => clearTimeout(timeout);
    }
  }, [updateAvailable]);

  if (!visible) return null;

  const buildLabel = currentBuild > 0 ? `Build ${currentBuild}` : 'Nieuwe versie';

  return (
    <>
      <style>{`
        @keyframes fm-slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes fm-slide-down {
          from { transform: translateY(0);    opacity: 1; }
          to   { transform: translateY(100%); opacity: 0; }
        }
        .fm-update-banner {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%) translateY(100%);
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px 20px;
          border-radius: 14px;
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          border: 1px solid rgba(99, 102, 241, 0.4);
          box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.15);
          color: #f1f5f9;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 14px;
          min-width: 320px;
          max-width: 480px;
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
          opacity: 0;
        }
        .fm-update-banner.fm-visible {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
        .fm-update-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 18px;
        }
        .fm-update-text {
          flex: 1;
          min-width: 0;
        }
        .fm-update-title {
          font-weight: 600;
          color: #f1f5f9;
          font-size: 14px;
          line-height: 1.3;
        }
        .fm-update-sub {
          font-size: 12px;
          color: #94a3b8;
          margin-top: 2px;
        }
        .fm-update-btn {
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .fm-update-btn-primary {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
        }
        .fm-update-btn-primary:hover {
          background: linear-gradient(135deg, #7c7ffa, #a07af7);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(99,102,241,0.4);
        }
        .fm-update-btn-secondary {
          background: transparent;
          color: #64748b;
          padding: 8px 10px;
        }
        .fm-update-btn-secondary:hover {
          color: #94a3b8;
        }
        .fm-pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22c55e;
          animation: fm-pulse 2s infinite;
          flex-shrink: 0;
        }
        @keyframes fm-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.3); }
        }
      `}</style>

      <div className={`fm-update-banner${animateIn ? ' fm-visible' : ''}`} role="alert">
        <div className="fm-update-icon">🚀</div>
        <div className="fm-update-text">
          <div className="fm-update-title">
            Nieuwe versie beschikbaar
          </div>
          <div className="fm-update-sub">
            {swUpdateReady ? `${buildLabel} klaar — herlaad om bij te werken` : `${buildLabel} gedetecteerd`}
          </div>
        </div>
        <div className="fm-pulse-dot" />
        <button
          className="fm-update-btn fm-update-btn-primary"
          onClick={applyUpdate}
          id="fm-update-apply-btn"
        >
          Vernieuwen
        </button>
        <button
          className="fm-update-btn fm-update-btn-secondary"
          onClick={dismiss}
          id="fm-update-dismiss-btn"
          title="Later herinneren"
        >
          ✕
        </button>
      </div>
    </>
  );
};
