import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { merchApi } from '../api/client';

interface NavItem {
  label: string;
  path: string;
}

interface DropdownConfig {
  label: string;
  items: NavItem[];
}

const DROPDOWNS: DropdownConfig[] = [
  {
    label: 'Merchandising',
    items: [
      { label: 'Styles', path: '/styles' },
      { label: 'File Openings', path: '/file-openings' },
      { label: 'Purchase Orders', path: '/purchase-orders' },
      { label: 'BOMs', path: '/boms' },
      { label: 'Costings', path: '/costings' },
      { label: 'Fit Specs', path: '/fit-specs' },
      { label: 'Design Sheets', path: '/design-sheets' },
      { label: 'Job Requests', path: '/jobs' },
      { label: 'Tech Pack Import', path: '/styles/techpack-import' },
    ],
  },
  {
    label: 'T&A',
    items: [
      { label: 'List', path: '/tas' },
      { label: 'Calendar', path: '/tas/calendar' },
      { label: 'Heatmap', path: '/tas/heatmap' },
    ],
  },
  {
    label: 'Fabric',
    items: [
      { label: 'Categories', path: '/fabric/categories' },
      { label: 'HTS Codes', path: '/fabric/hts-codes' },
      { label: 'Suppliers', path: '/fabric/suppliers' },
      { label: 'Mills', path: '/fabric/mills' },
      { label: 'RFQs', path: '/fabric/rfqs' },
      { label: 'Bookings', path: '/fabric/bookings' },
      { label: 'Orders', path: '/fabric/orders' },
      { label: 'Dockets', path: '/fabric/dockets' },
      { label: 'Tolerances', path: '/fabric/tolerances' },
      { label: 'Utilization', path: '/fabric/utilizations' },
    ],
  },
  {
    label: 'Production',
    items: [
      { label: 'Plans', path: '/production' },
      { label: 'Daily Reports', path: '/production/daily' },
      { label: 'Order Manager', path: '/order-manager' },
      { label: 'Factory Portal', path: '/production/portal' },
      { label: 'Dashboard', path: '/production/dashboard' },
    ],
  },
  {
    label: 'Quality',
    items: [
      { label: 'Inspections', path: '/quality' },
      { label: 'Corrective Actions', path: '/quality/caps' },
      { label: 'Gold Seals', path: '/quality/gold-seals' },
      { label: 'Compliance Audit', path: '/quality/compliance-audits' },
      { label: 'Dashboard', path: '/quality/dashboard' },
    ],
  },
  {
    label: 'Logistics',
    items: [
      { label: 'Shipments', path: '/logistics' },
      { label: 'Booking Schedule', path: '/logistics/booking-schedule' },
      { label: 'Freight Forwarders', path: '/logistics/forwarders' },
      { label: 'Paperwork Comparison', path: '/paperwork-comparison' },
      { label: 'Final Hit Reconciliation', path: '/logistics/reconciliations' },
      { label: 'Dashboard', path: '/logistics/dashboard' },
    ],
  },
  {
    label: 'Commercial',
    items: [
      { label: 'Proforma Invoices', path: '/pis' },
      { label: 'Letters of Credit', path: '/lcs' },
      { label: 'Sales Contracts', path: '/scs' },
      { label: 'Sales Confirmations', path: '/sales-confirmations' },
      { label: 'Debit Notes', path: '/debit-notes' },
      { label: 'Invoice Approvals', path: '/invoice-approvals' },
      { label: 'Banks', path: '/banks' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { label: 'Dashboard', path: '/reports' },
      { label: 'Builder', path: '/reports/builder' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { label: 'Setup', path: '/setup' },
      { label: 'Users', path: '/admin/users' },
      { label: 'Roles', path: '/admin/roles' },
      { label: 'Audit Logs', path: '/admin/audit-logs' },
      { label: 'Health', path: '/admin/health' },
    ],
  },
];

function DropdownMenu({
  config,
  isOpen,
  onToggle,
  dropdownRef,
  isActive,
  onNavigate,
  onClose,
}: {
  config: DropdownConfig;
  isOpen: boolean;
  onToggle: () => void;
  dropdownRef: (el: HTMLDivElement | null) => void;
  isActive: (path: string) => boolean;
  onNavigate: (path: string) => void;
  onClose: () => void;
}) {
  const anyActive = config.items.some((item) => isActive(item.path));

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={onToggle}
        className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1 ${
          anyActive
            ? 'text-heading bg-surface-alt font-medium'
            : 'text-muted hover:text-heading hover:bg-surface-alt/50'
        }`}
      >
        {config.label}
        <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-surface border border-border rounded-lg shadow-xl py-1 z-50 min-w-[180px]">
          {config.items.map((item) => (
            <button
              key={item.path}
              onClick={() => {
                onNavigate(item.path);
                onClose();
              }}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                location.pathname === item.path
                  ? 'text-heading bg-surface-alt font-medium'
                  : 'text-muted hover:text-heading hover:bg-surface-alt/50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg text-muted hover:text-heading hover:bg-surface-alt/50 transition-colors"
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [alerts, setAlerts] = useState<{ overdue_count: number; upcoming_count: number } | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    merchApi.getTAAlerts()
      .then((r) => setAlerts(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      Object.entries(dropdownRefs.current).forEach(([key, ref]) => {
        if (ref && !ref.contains(target)) {
          setOpenDropdown((prev) => (prev === key ? null : prev));
        }
      });
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-page text-heading">
      {/* Top Nav */}
      <nav className="bg-surface border-b border-border">
        <div className="px-4 lg:px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <span className="font-bold text-lg text-heading">BHMS</span>
          </div>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1 flex-1 justify-center">
            <button
              onClick={() => navigate('/dashboard')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                location.pathname === '/dashboard'
                  ? 'text-heading bg-surface-alt font-medium'
                  : 'text-muted hover:text-heading hover:bg-surface-alt/50'
              }`}
            >
              Dashboard
            </button>
            {DROPDOWNS.map((config) => (
              <DropdownMenu
                key={config.label}
                config={config}
                isOpen={openDropdown === config.label}
                onToggle={() => setOpenDropdown(openDropdown === config.label ? null : config.label)}
                dropdownRef={(el) => { dropdownRefs.current[config.label] = el; }}
                isActive={isActive}
                onNavigate={navigate}
                onClose={() => setOpenDropdown(null)}
              />
            ))}
          </div>

          {/* Desktop right */}
          <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
            <ThemeToggle />
            <a href="/help" className="w-8 h-8 flex items-center justify-center text-faint hover:text-muted hover:bg-surface-alt rounded-lg transition-colors" title="Help Center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </a>
            <span className="text-sm text-muted truncate max-w-[160px]">{user?.full_name || user?.email}</span>
            <button
              onClick={logout}
              className="px-3 py-1.5 text-sm text-muted hover:text-heading hover:bg-surface-alt rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-muted hover:text-heading"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border px-4 pb-4">
            <button
              onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm rounded-lg mt-2 ${
                location.pathname === '/dashboard' ? 'text-heading bg-surface-alt' : 'text-muted'
              }`}
            >
              Dashboard
            </button>
            {DROPDOWNS.map((config) => (
              <div key={config.label} className="mt-2">
                <div className="px-3 py-1 text-xs font-semibold text-faint uppercase tracking-wider">
                  {config.label}
                </div>
                {config.items.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
                    className={`w-full text-left px-6 py-2 text-sm rounded-lg ${
                      location.pathname === item.path
                        ? 'text-heading bg-surface-alt'
                        : 'text-muted hover:text-heading'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted">{user?.full_name || user?.email}</span>
                <ThemeToggle />
                <a href="/help" className="w-8 h-8 flex items-center justify-center text-faint hover:text-muted hover:bg-surface-alt rounded-lg transition-colors" title="Help">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </a>
              </div>
              <button onClick={logout} className="text-sm text-muted hover:text-heading">Logout</button>
            </div>
          </div>
        )}
      </nav>

      {/* Alert banner */}
      {alerts && (alerts.overdue_count > 0 || alerts.upcoming_count > 0) && (
        <div onClick={() => navigate('/tas')} className="cursor-pointer px-6 py-2 flex items-center gap-4 text-sm border-b border-border bg-surface/80">
          {alerts.overdue_count > 0 && (
            <span className="flex items-center gap-1.5 text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              {alerts.overdue_count} overdue milestone{alerts.overdue_count !== 1 ? 's' : ''}
            </span>
          )}
          {alerts.upcoming_count > 0 && (
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              {alerts.upcoming_count} due this week
            </span>
          )}
          <span className="text-faint ml-auto">View T&A →</span>
        </div>
      )}

      <main>{children}</main>
    </div>
  );
}
