# UI Design System: High-Precision Fintech Terminal ("Nexus Design System")

## 1. Aesthetic Foundation & Philosophy

The **Nexus Design System** is an ultra-modern, high-density fintech interface tailored for professional traders, quantitative analysts, and institutional operators. 

### Core Tenets:
- **Dark Mode as the Primary Canvas**: Reduces eye strain during multi-hour market monitoring. Deep charcoal/slate foundation (`#0b0e11` / `#12161c`) paired with crisp foreground typography.
- **Light Mode Parity**: Clean, high-contrast, paper-like architecture (`#f8fafc` / `#ffffff`) with slate contrast.
- **Anti-Card Clutter**: Avoid enclosing every widget in floating cards with heavy drop shadows. The terminal utilizes seamless border-delimited viewports, precision hairline rules (`1px solid var(--border-subtle)`), and monospaced financial alignment.
- **Dynamic Semantic Pulses**: Bid/Ask tickers pulse on tick changes with non-distracting gradient flashes (emerald for ticks up, crimson for ticks down).

---

## 2. Color Tokens & Theme Variables

```css
:root {
  /* Typography */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Roboto Mono', monospace;

  /* Spacing Scale */
  --space-xxs: 2px;
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 24px;
  --space-2xl: 32px;

  /* Radii */
  --radius-xs: 3px;
  --radius-sm: 5px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;
}

/* ==========================================================================
   DARK THEME (PRIMARY)
   ========================================================================== */
[data-theme='dark'] {
  /* Backgrounds */
  --bg-app: #080b0f;
  --bg-surface: #0f141c;
  --bg-surface-elevated: #161d28;
  --bg-surface-hover: #1e2634;
  --bg-surface-active: #252f40;

  /* Borders & Hairlines */
  --border-subtle: #1c2430;
  --border-medium: #2a3547;
  --border-focus: #3b82f6;

  /* Typography Colors */
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-tertiary: #64748b;
  --text-disabled: #334155;
  --text-inverse: #090d16;

  /* Trading Semantics */
  --trade-buy: #10b981;        /* Emerald Green */
  --trade-buy-hover: #059669;
  --trade-buy-subtle: rgba(16, 185, 129, 0.12);
  --trade-buy-glow: rgba(16, 185, 129, 0.25);

  --trade-sell: #f43f5e;       /* Rose / Crimson */
  --trade-sell-hover: #e11d48;
  --trade-sell-subtle: rgba(244, 63, 94, 0.12);
  --trade-sell-glow: rgba(244, 63, 94, 0.25);

  /* Status Badges */
  --badge-live: #10b981;
  --badge-paper: #f59e0b;      /* Amber / Orange */
  --badge-dev: #8b5cf6;        /* Purple */

  /* Terminal Accent */
  --accent-primary: #2563eb;
  --accent-hover: #1d4ed8;
  --accent-glow: rgba(37, 99, 235, 0.3);
}

/* ==========================================================================
   LIGHT THEME
   ========================================================================== */
[data-theme='light'] {
  /* Backgrounds */
  --bg-app: #f4f6f9;
  --bg-surface: #ffffff;
  --bg-surface-elevated: #ffffff;
  --bg-surface-hover: #f1f5f9;
  --bg-surface-active: #e2e8f0;

  /* Borders & Hairlines */
  --border-subtle: #e2e8f0;
  --border-medium: #cbd5e1;
  --border-focus: #2563eb;

  /* Typography Colors */
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-tertiary: #64748b;
  --text-disabled: #cbd5e1;
  --text-inverse: #ffffff;

  /* Trading Semantics */
  --trade-buy: #059669;
  --trade-buy-hover: #047857;
  --trade-buy-subtle: rgba(5, 150, 105, 0.1);
  --trade-buy-glow: rgba(5, 150, 105, 0.2);

  --trade-sell: #dc2626;
  --trade-sell-hover: #b91c1c;
  --trade-sell-subtle: rgba(220, 38, 38, 0.1);
  --trade-sell-glow: rgba(220, 38, 38, 0.2);

  /* Status Badges */
  --badge-live: #059669;
  --badge-paper: #d97706;
  --badge-dev: #7c3aed;

  /* Terminal Accent */
  --accent-primary: #2563eb;
  --accent-hover: #1d4ed8;
  --accent-glow: rgba(37, 99, 235, 0.2);
}
```

---

## 3. Typography & Financial Tabular Alignment

1. **Tabular Numerals**: All price ticks, quantities, P&L numbers, percentages, and timestamps utilize:
   ```css
   font-variant-numeric: tabular-nums lining-nums;
   font-family: var(--font-mono);
   ```
   This guarantees that changing numbers never cause layout jitter or misaligned columns.
2. **Spread Display**: Displayed as a discrete micro-pill:
   ```css
   .spread-pill {
     font-size: 11px;
     font-family: var(--font-mono);
     color: var(--text-secondary);
     background: var(--bg-surface-hover);
     padding: 2px 6px;
     border-radius: var(--radius-xs);
   }
   ```

---

## 4. Component Standards

### 4.1 Order Entry Buy / Sell Toggle

```
┌─────────────────────────────────┬─────────────────────────────────┐
│              BUY                │              SELL               │
│            94,821.10            │            94,820.50            │
└─────────────────────────────────┴─────────────────────────────────┘
```
- **Active Buy State**: Emerald border & subtle background glow, text highlight.
- **Active Sell State**: Crimson border & subtle background glow, text highlight.

### 4.2 Two-Step Order Confirmation Modal
The confirmation dialog must be non-intrusive yet impossible to submit accidentally:
- Clear headline with Side + Symbol (`BUY 0.10 BTC/USD`).
- Key financial parameters table: Entry Price, Order Type, Margin Required, Estimated Fees, Stop Loss, Take Profit.
- Secondary "Don't ask again (Enable One-Click Trading)" checkbox for advanced users.

### 4.3 High-Density Positions & Orders Table
- Flat row style with 36px row height.
- Hover highlight (`var(--bg-surface-hover)`).
- Action buttons (`Close`, `Edit SL/TP`) embedded in rightmost column as subtle icons with tooltip triggers.
