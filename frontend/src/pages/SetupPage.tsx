import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { setupApi } from '../api/client';

interface Card {
  title: string;
  path: string;
  icon: string;
  color: string;
  countKey: string;
}

const CARDS: Card[] = [
  { title: 'Company Setup', path: '/setup/tenant', icon: '🏢', color: 'emerald', countKey: '_tenant' },
  { title: 'Offices', path: '/setup/offices', icon: '📍', color: 'blue', countKey: '_offices' },
  { title: 'Buyers', path: '/setup/buyers', icon: '👤', color: 'emerald', countKey: 'buyers' },
  { title: 'Factories', path: '/setup/factories', icon: '🏭', color: 'blue', countKey: 'factories' },
  { title: 'Currencies', path: '/setup/currencies', icon: '💱', color: 'amber', countKey: 'currencies' },
  { title: 'Seasons', path: '/setup/seasons', icon: '🍂', color: 'orange', countKey: 'seasons' },
  { title: 'Product Categories', path: '/setup/categories', icon: '📂', color: 'purple', countKey: 'categories' },
  { title: 'Product Types', path: '/setup/types', icon: '🏷️', color: 'pink', countKey: 'types' },
  { title: 'Payment Terms', path: '/setup/payment-terms', icon: '💳', color: 'cyan', countKey: 'paymentTerms' },
  { title: 'UOMs', path: '/setup/uoms', icon: '📏', color: 'teal', countKey: 'uoms' },
  { title: 'Countries', path: '/setup/countries', icon: '🌍', color: 'indigo', countKey: 'countries' },
  { title: 'Color Codes', path: '/setup/color-codes', icon: '🎨', color: 'rose', countKey: 'colorCodes' },
  { title: 'Departments', path: '/setup/departments', icon: '🏢', color: 'violet', countKey: 'departments' },
  { title: 'Designations', path: '/setup/designations', icon: '🎖️', color: 'lime', countKey: 'designations' },
  { title: 'Product Departments', path: '/setup/product-departments', icon: '🏛️', color: 'sky', countKey: 'productDepartments' },
  { title: 'Compliance Doc Types', path: '/setup/compliance-doc-types', icon: '📜', color: 'yellow', countKey: 'complianceDocTypes' },
  { title: 'Delivery Modes', path: '/setup/delivery-modes', icon: '🚚', color: 'red', countKey: 'deliveryModes' },
  { title: 'Vendors', path: '/setup/vendors', icon: '🤝', color: 'fuchsia', countKey: 'vendors' },
  { title: 'Brands', path: '/setup/brands', icon: '🔖', color: 'stone', countKey: 'brands' },
  { title: 'Risk Levels', path: '/setup/risk-levels', icon: '⚠️', color: 'red', countKey: 'riskLevels' },
];

const COUNT_API: Record<string, () => Promise<{ data: { count: number } }>> = {
  buyers: () => setupApi.getBuyers({ page_size: '1' }),
  factories: () => setupApi.getFactories({ page_size: '1' }),
  currencies: () => setupApi.getCurrencies({ page_size: '1' }),
  seasons: () => setupApi.getSeasons({ page_size: '1' }),
  categories: () => setupApi.getCategories({ page_size: '1' }),
  types: () => setupApi.getTypes({ page_size: '1' }),
  paymentTerms: () => setupApi.getPaymentTerms({ page_size: '1' }),
  uoms: () => setupApi.getUOMs({ page_size: '1' }),
  countries: () => setupApi.getCountries({ page_size: '1' }),
  colorCodes: () => setupApi.getColorCodes({ page_size: '1' }),
  departments: () => setupApi.getDepartments({ page_size: '1' }),
  designations: () => setupApi.getDesignations({ page_size: '1' }),
  productDepartments: () => setupApi.getProductDepartments({ page_size: '1' }),
  complianceDocTypes: () => setupApi.getComplianceDocumentTypes({ page_size: '1' }),
  deliveryModes: () => setupApi.getDeliveryModes({ page_size: '1' }),
  vendors: () => setupApi.getVendors({ page_size: '1' }),
  brands: () => setupApi.getBrands({ page_size: '1' }),
  riskLevels: () => setupApi.getRiskLevels({ page_size: '1' }),
};

const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  pink: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  teal: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20' },
  indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
  lime: { bg: 'bg-lime-500/10', text: 'text-lime-400', border: 'border-lime-500/20' },
  sky: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20' },
  yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  red: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  fuchsia: { bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-400', border: 'border-fuchsia-500/20' },
  stone: { bg: 'bg-stone-500/10', text: 'text-stone-400', border: 'border-stone-500/20' },
};

export default function SetupPage() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled(
      Object.entries(COUNT_API).map(([key, fn]) =>
        fn().then((r) => ({ key, count: r.data.count })).catch(() => ({ key, count: 0 }))
      )
    ).then((results) => {
      const newCounts: Record<string, number> = {};
      results.forEach((r) => {
        if (r.status === 'fulfilled') {
          newCounts[r.value.key] = r.value.count;
        }
      });
      setCounts(newCounts);
      setLoading(false);
    });
  }, []);

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-heading">Setup & Configuration</h1>
          <p className="text-muted text-sm mt-1">Manage master data for your organization</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {CARDS.map((card) => {
            const colors = COLOR_MAP[card.color];
            return (
              <button
                key={card.path}
                onClick={() => navigate(card.path)}
                className={`p-5 rounded-xl border ${colors.border} ${colors.bg} hover:scale-[1.02] transition-all text-left group`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-2xl">{card.icon}</span>
                  {loading ? (
                    <div className="h-5 w-12 bg-surface-alt rounded animate-pulse" />
                  ) : (
                    <span className={`text-sm font-medium ${colors.text}`}>
                      {counts[card.countKey] ?? 0}
                    </span>
                  )}
                </div>
                <h3 className="text-heading font-medium mt-3 group-hover:text-emerald-400 transition-colors">
                  {card.title}
                </h3>
              </button>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
