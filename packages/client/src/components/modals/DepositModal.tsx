import React, { useState } from 'react';
import { X, ArrowDownCircle, ArrowUpCircle, ShieldCheck, CreditCard, Landmark, Coins, CheckCircle, AlertCircle, Loader } from 'lucide-react';

interface DepositModalProps {
  balance: number;
  onClose: () => void;
  onDepositSuccess: (amount: number, method: string) => void;
  onWithdrawSuccess: (amount: number, method: string) => void;
}

import { API_BASE_URL } from '../../config';

const SERVER_BASE = API_BASE_URL;

export const DepositModal: React.FC<DepositModalProps> = ({
  balance,
  onClose,
  onDepositSuccess,
  onWithdrawSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState<number>(1000);
  const [selectedMethod, setSelectedMethod] = useState<string>('STRIPE');
  const [destinationInfo, setDestinationInfo] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successReceipt, setSuccessReceipt] = useState<{
    type: 'DEPOSIT' | 'WITHDRAWAL';
    amount: number;
    method: string;
    txId: string;
    details?: string;
  } | null>(null);

  const methods = [
    { id: 'STRIPE', name: 'Credit/Debit Card (Stripe Gateway)', icon: CreditCard, fee: '0.00%' },
    { id: 'COINBASE', name: 'Crypto Instant (BTC / ETH / USDT)', icon: Coins, fee: '0.00%' },
    { id: 'BANK_WIRE', name: 'Instant Bank Wire / SEPA', icon: Landmark, fee: '$15.00 flat' },
  ];

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;
    setErrorMsg(null);
    setLoading(true);

    try {
      if (activeTab === 'deposit') {
        const res = await fetch(`${SERVER_BASE}/api/wallet/deposit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, method: selectedMethod }),
        });
        const data = await res.json() as any;
        if (!res.ok) throw new Error(data.error || 'Deposit failed');

        if (data.intent?.redirectUrl) {
          window.open(data.intent.redirectUrl, '_blank');
        }

        const txId = data.transaction?.id || data.intent?.intentId || `tx_${Date.now()}`;
        setSuccessReceipt({
          type: 'DEPOSIT',
          amount,
          method: selectedMethod,
          txId,
          details: `Deposited $${amount.toFixed(2)} USD via ${selectedMethod}. Settled to trading account.`,
        });
        onDepositSuccess(amount, selectedMethod);
      } else {
        const res = await fetch(`${SERVER_BASE}/api/wallet/withdraw`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount,
            method: selectedMethod,
            destination: destinationInfo || 'Primary Registered Account',
          }),
        });
        const data = await res.json() as any;
        if (!res.ok) throw new Error(data.error || 'Withdrawal request rejected');

        const txId = data.transaction?.id || `tx_wth_${Date.now()}`;
        setSuccessReceipt({
          type: 'WITHDRAWAL',
          amount,
          method: selectedMethod,
          txId,
          details: `Processed withdrawal of $${amount.toFixed(2)} USD to ${destinationInfo || 'bank'}.`,
        });
        onWithdrawSuccess(amount, selectedMethod);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ width: 500 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700 }}>
              {activeTab === 'deposit' ? 'DEPOSIT FUNDS' : 'WITHDRAW FUNDS'}
            </span>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        {!successReceipt && (
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface-elevated)' }}>
            <button
              type="button"
              className="dock-tab-btn"
              style={{
                flex: 1,
                justifyContent: 'center',
                padding: '10px 0',
                borderBottom: activeTab === 'deposit' ? '2px solid var(--accent-primary)' : 'none',
                color: activeTab === 'deposit' ? 'var(--accent-primary)' : 'var(--text-tertiary)',
              }}
              onClick={() => {
                setActiveTab('deposit');
                setErrorMsg(null);
              }}
            >
              <ArrowDownCircle size={14} /> Deposit
            </button>
            <button
              type="button"
              className="dock-tab-btn"
              style={{
                flex: 1,
                justifyContent: 'center',
                padding: '10px 0',
                borderBottom: activeTab === 'withdraw' ? '2px solid var(--accent-primary)' : 'none',
                color: activeTab === 'withdraw' ? 'var(--accent-primary)' : 'var(--text-tertiary)',
              }}
              onClick={() => {
                setActiveTab('withdraw');
                setErrorMsg(null);
              }}
            >
              <ArrowUpCircle size={14} /> Withdraw
            </button>
          </div>
        )}

        {successReceipt ? (
          <div className="modal-body" style={{ textAlign: 'center', padding: '28px 20px' }}>
            <CheckCircle size={48} color="#10b981" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
              {successReceipt.type === 'DEPOSIT' ? 'Deposit Successful' : 'Withdrawal Completed'}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
              {successReceipt.details}
            </p>

            <div
              style={{
                background: 'var(--bg-surface-elevated)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                textAlign: 'left',
                fontSize: 11,
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Transaction ID:</span>
                <span style={{ fontFamily: 'monospace' }}>{successReceipt.txId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Amount:</span>
                <span style={{ fontWeight: 600 }}>${successReceipt.amount.toFixed(2)} USD</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Provider:</span>
                <span>{successReceipt.method}</span>
              </div>
            </div>

            <button
              className="btn-primary"
              style={{ width: '100%', padding: '12px', justifyContent: 'center' }}
              onClick={onClose}
            >
              Return to Trading
            </button>
          </div>
        ) : (
          <form onSubmit={handleAction} className="modal-body">
            {errorMsg && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-xs)',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #ef4444',
                  color: '#f87171',
                  fontSize: 12,
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Method Selection */}
            <div className="form-group">
              <span className="form-label-row">Authorized Payment Provider</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {methods.map((m) => {
                  const Icon = m.icon;
                  const isSel = selectedMethod === m.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMethod(m.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: isSel ? 'var(--accent-subtle)' : 'var(--bg-surface-elevated)',
                        border: `1px solid ${isSel ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        transition: 'var(--trans-fast)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Icon size={16} color={isSel ? 'var(--accent-primary)' : 'var(--text-secondary)'} />
                        <span style={{ fontSize: 12, fontWeight: 500 }}>{m.name}</span>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Fee: {m.fee}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Amount Input */}
            <div className="form-group">
              <div className="form-label-row">
                <span>Amount ({activeTab === 'withdraw' ? `Available: $${balance.toFixed(2)}` : 'USD'})</span>
              </div>
              <div className="form-input-container">
                <input
                  type="number"
                  min="10"
                  step="any"
                  className="form-input"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  disabled={loading}
                />
                <span className="form-unit">USD</span>
              </div>
            </div>

            {activeTab === 'withdraw' && (
              <div className="form-group">
                <span className="form-label-row">Destination Bank Account / Crypto Address</span>
                <div className="form-input-container">
                  <input
                    type="text"
                    placeholder="e.g. IBAN or ERC-20 / TRC-20 Address"
                    className="form-input"
                    value={destinationInfo}
                    onChange={(e) => setDestinationInfo(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            <div
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-xs)',
                background: 'var(--bg-surface-elevated)',
                fontSize: 11,
                color: 'var(--text-tertiary)',
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
              }}
            >
              <ShieldCheck size={16} color="var(--trade-buy)" style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                All transactions are routed strictly through licensed, PCI-DSS Level 1 compliant payment gateways.
                Card numbers are never transmitted to or stored on our servers.
              </span>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading || amount <= 0}
              style={{
                padding: '12px',
                width: '100%',
                justifyContent: 'center',
                fontSize: '13px',
                background: activeTab === 'deposit' ? 'var(--accent-primary)' : '#10b981',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Loader size={16} className="animate-spin" />
                  <span>Processing Transaction...</span>
                </div>
              ) : activeTab === 'deposit' ? (
                `Deposit $${amount} USD`
              ) : (
                `Request Withdrawal of $${amount} USD`
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
