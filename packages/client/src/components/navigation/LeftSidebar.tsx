import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  BarChart2,
  Briefcase,
  Activity,
  Settings,
  HelpCircle,
  Wallet,
} from 'lucide-react';

interface LeftSidebarProps {
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
  onOpenDeposit: () => void;
  onGoHome?: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  activeTab = 'trading',
  onSelectTab,
  onOpenDeposit,
  onGoHome,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, action: onGoHome },
    { id: 'trading', label: 'Trading', icon: TrendingUp },
    { id: 'markets', label: 'Markets', icon: BarChart2 },
    { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
    { id: 'analytics', label: 'Analytics', icon: Activity },
  ];

  const bottomItems = [
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help', icon: HelpCircle },
  ];

  return (
    <aside className="left-sidebar">
      {/* Top Nav Rail Items */}
      <div className="left-sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => {
                if (item.action) {
                  item.action();
                } else if (onSelectTab) {
                  onSelectTab(item.id);
                }
              }}
              title={item.label}
            >
              <Icon size={17} className="sidebar-icon" />
              <span className="sidebar-label">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom Nav Rail Items & Deposit CTA */}
      <div className="left-sidebar-bottom">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className="sidebar-nav-item"
              onClick={() => onSelectTab?.(item.id)}
              title={item.label}
            >
              <Icon size={17} className="sidebar-icon" />
              <span className="sidebar-label">{item.label}</span>
            </button>
          );
        })}

        {/* Big Blue Deposit Button */}
        <button
          className="sidebar-deposit-btn"
          onClick={onOpenDeposit}
          title="Deposit settled capital"
        >
          <Wallet size={15} />
          <span>Deposit</span>
        </button>
      </div>
    </aside>
  );
};
