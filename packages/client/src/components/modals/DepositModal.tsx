import React, { useState } from 'react';
import { X, ArrowDownCircle, ArrowUpCircle, ShieldCheck, CreditCard, Landmark, Coins } from 'lucide-react';

interface DepositModalProps {
  balance: number;
  onClose: () => void;
  onDepositSuccess: (amount: number, method: string) => void;
  onWithdrawSuccess: (amount: number, method: string) => void;
}

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

  const methods = [
    { id: 'STRIPE', name: 'Credit/Debit Card (Stripe Gateway)', icon: CreditCard, fee: '0.00%' },
    { id: 'COINBASE', name: 'Crypto Instant (BTC / ETH / USDT)', icon: Coins, fee: '0.00%' },
    { id: 'BANK_WIRE', name: 'Instant Bank Wire / SEPA', icon: Landmark, fee: '$15.00 flat' },
  ];

  const handleAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    if (activeTab === 'deposit') {
      onDepositSuccess(amount, selectedMethod);
    } else {
      if (amount > balance) {
        alert('Insufficient settled balance for withdrawal.');
        return;
      }
      onWithdrawSuccess(amount, selectedMethod);
    }
    onClose();
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
            onClick={() => setActiveTab('deposit')}
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
            onClick={() => setActiveTab('withdraw')}
          >
            <ArrowUpCircle size={14} /> Withdraw
          </button>
        </div>

        <form onSubmit={handleAction} className="modal-body">
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
            style={{
              padding: '12px',
              width: '100%',
              justifyContent: 'center',
              fontSize: '13px',
              background: activeTab === 'deposit' ? 'var(--accent-primary)' : '#10b981',
            }}
          >
            {activeTab === 'deposit' ? `Deposit $${amount} USD` : `Request Withdrawal of $${amount} USD`}
          </button>
        </form>
      </div>
    </div>
  );
};
