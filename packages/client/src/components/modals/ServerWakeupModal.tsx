import React, { useState, useEffect } from 'react';
import {
  Server,
  Zap,
  Activity,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  X,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { BackendKeepAliveState } from '../../hooks/useBackendKeepAlive';
import { API_BASE_URL } from '../../config';

interface ServerWakeupModalProps {
  keepAlive: BackendKeepAliveState;
}

export const ServerWakeupModal: React.FC<ServerWakeupModalProps> = ({ keepAlive }) => {
  const { status, latency, countdown, retryCount, isWakingUp, manualPing, resetWarmup } = keepAlive;

  const [minimized, setMinimized] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);
  const [isManualChecking, setIsManualChecking] = useState<boolean>(false);

  // When transition from waking up to online happens, show brief success banner
  useEffect(() => {
    if (status === 'ONLINE' && retryCount > 0) {
      setShowSuccessToast(true);
      const timer = setTimeout(() => {
        setShowSuccessToast(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [status, retryCount]);

  // When waking up starts, ensure not dismissed
  useEffect(() => {
    if (isWakingUp) {
      setDismissed(false);
    }
  }, [isWakingUp]);

  const handleForcePing = async () => {
    setIsManualChecking(true);
    await manualPing();
    setIsManualChecking(false);
  };

  // If dismissed or online without recent warmup toast, do not show modal
  if (dismissed && !showSuccessToast) return null;
  if (!isWakingUp && !showSuccessToast) return null;

  // Calculate 50s progress percentage
  const totalSeconds = 50;
  const elapsed = Math.max(0, totalSeconds - countdown);
  const progressPercent = Math.min(100, Math.round((elapsed / totalSeconds) * 100));

  // Success Toast view
  if (showSuccessToast && status === 'ONLINE') {
    return (
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 99999,
          background: 'var(--bg-surface-elevated, #ffffff)',
          border: '1px solid var(--trade-buy, #10b981)',
          borderRadius: '10px',
          boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          animation: 'slideInRight 0.3s ease-out',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--trade-buy, #10b981)',
          }}
        >
          <CheckCircle2 size={18} />
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
            Render Backend Connected!
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary, #64748b)' }}>
            Latency: {latency !== null ? `${latency}ms` : 'Active'} • 10s Keep-Alive Heartbeat Enabled
          </div>
        </div>
        <button
          onClick={() => setShowSuccessToast(false)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-tertiary, #94a3b8)',
            padding: 4,
          }}
        >
          <X size={15} />
        </button>
      </div>
    );
  }

  // Minimized Floating Pill
  if (minimized) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 99999,
          background: 'var(--bg-surface-elevated, #ffffff)',
          border: '1px solid var(--border-medium, #cbd5e1)',
          borderRadius: '24px',
          boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          cursor: 'pointer',
          transition: 'transform 0.2s ease',
        }}
        onClick={() => setMinimized(false)}
        title="Click to expand Render cold-start status"
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#f59e0b',
            boxShadow: '0 0 8px #f59e0b',
            animation: 'pulse 1.5s infinite',
          }}
        />
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
          Waking Backend: ~{countdown}s
        </span>
        <ChevronUp size={14} color="var(--text-tertiary, #94a3b8)" />
      </div>
    );
  }

  // Full Expanded Warmup Card / Floating Banner
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        maxWidth: '420px',
        width: 'calc(100vw - 48px)',
        zIndex: 99999,
        background: 'var(--bg-surface-elevated, #ffffff)',
        border: '1px solid var(--border-medium, #cbd5e1)',
        borderRadius: '14px',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.18), 0 4px 12px rgba(0, 0, 0, 0.08)',
        padding: '18px',
        color: 'var(--text-primary, #0f172a)',
        fontFamily: 'var(--font-sans, sans-serif)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d97706',
            }}
          >
            <Server size={20} className={isManualChecking ? 'spin' : ''} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Waking Cloud Server</span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: '#d97706',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                Render Free Tier
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary, #64748b)', marginTop: '2px' }}>
              Cold start activation: takes ~50 seconds
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => setMinimized(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-tertiary, #94a3b8)',
              padding: '4px',
              borderRadius: '4px',
            }}
            title="Minimize"
          >
            <ChevronDown size={16} />
          </button>
          <button
            onClick={() => setDismissed(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-tertiary, #94a3b8)',
              padding: '4px',
              borderRadius: '4px',
            }}
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Progress Bar & Countdown HUD */}
      <div
        style={{
          background: 'var(--bg-surface-hover, #f8fafc)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '12px',
          border: '1px solid var(--border-subtle, #e2e8f0)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Clock size={13} />
            Estimated Wait:
          </span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#d97706', fontFamily: 'var(--font-mono, monospace)' }}>
            ~{countdown}s remaining
          </span>
        </div>

        {/* Animated Progress Bar */}
        <div
          style={{
            height: '6px',
            background: 'var(--border-subtle, #e2e8f0)',
            borderRadius: '3px',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, #f59e0b, #10b981)',
              borderRadius: '3px',
              transition: 'width 1s linear',
            }}
          />
        </div>

        {/* Retry & Heartbeat Details */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '8px',
            fontSize: '11px',
            color: 'var(--text-tertiary, #94a3b8)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Activity size={12} style={{ color: '#f59e0b' }} />
            Pinging every 10s (Attempt #{retryCount || 1})
          </span>
          <span>Target: {API_BASE_URL.replace(/https?:\/\//, '').slice(0, 20)}...</span>
        </div>
      </div>

      {/* Explanatory Note */}
      <p style={{ fontSize: '11px', color: 'var(--text-secondary, #64748b)', margin: '0 0 12px 0', lineHeight: 1.45 }}>
        Render spins down free web services after 15 minutes of inactivity. Our client sends a ping <strong>every 10 seconds</strong> to wake it up and keep it active all the time once online.
      </p>

      {/* Action Footer */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleForcePing}
          disabled={isManualChecking}
          style={{
            flex: 1,
            background: 'var(--accent-primary, #2563eb)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 12px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: isManualChecking ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'background 0.15s ease',
          }}
        >
          <RefreshCw size={13} className={isManualChecking ? 'spin' : ''} />
          <span>{isManualChecking ? 'Probing Server...' : 'Check Status Now'}</span>
        </button>

        <button
          onClick={() => setMinimized(true)}
          style={{
            background: 'transparent',
            color: 'var(--text-secondary, #64748b)',
            border: '1px solid var(--border-medium, #cbd5e1)',
            borderRadius: '6px',
            padding: '8px 12px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Minimize
        </button>
      </div>
    </div>
  );
};
