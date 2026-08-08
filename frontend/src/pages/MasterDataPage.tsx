import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import DataTable, { type Column } from '../components/DataTable';
import SearchableSelect from '../components/SearchableSelect';
import { setupApi } from '../api/client';
import { useToast } from '../contexts/ToastContext';

type ApiMethods = {
  list: (params?: Record<string, string>) => Promise<{ data: { results: unknown[]; count: number } }>;
  create: (data: Record<string, unknown>) => Promise<unknown>;
  update: (id: string, data: Record<string, unknown>) => Promise<unknown>;
  delete: (id: string) => Promise<unknown>;
};

interface TypeConfig {
  title: string;
  columns: Column[];
  formFields: string[];
  requiredFields?: string[];
  api: ApiMethods;
}

const TYPE_CONFIG: Record<string, TypeConfig> = {
  buyers: {
    title: 'Buyers',
    columns: [
      { key: 'code', label: 'Code', className: 'font-mono text-emerald-400' },
      { key: 'name', label: 'Name' },
      { key: 'contact_person', label: 'Contact' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'country_name', label: 'Country' },
      { key: 'status', label: 'Status', render: (v: unknown) => (v as string) === 'active' ? 'Active' : 'Inactive' },
    ],
    formFields: ['code', 'name', 'contact_person', 'email', 'phone', 'address', 'country', 'currency', 'payment_terms', 'credit_limit', 'status', 'notes'],
    requiredFields: ['code', 'name'],
    api: {
      list: setupApi.getBuyers,
      create: setupApi.createBuyer,
      update: setupApi.updateBuyer,
      delete: setupApi.deleteBuyer,
    },
  },
  factories: {
    title: 'Factories',
    columns: [
      { key: 'code', label: 'Code', className: 'font-mono text-emerald-400' },
      { key: 'name', label: 'Name' },
      { key: 'contact_person', label: 'Contact' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'country_name', label: 'Country' },
      { key: 'status', label: 'Status', render: (v: unknown) => (v as string) === 'active' ? 'Active' : 'Inactive' },
    ],
    formFields: ['code', 'name', 'contact_person', 'email', 'phone', 'address', 'city', 'country', 'factory_type', 'capacity', 'capacity_unit', 'status', 'notes'],
    requiredFields: ['code', 'name'],
    api: {
      list: setupApi.getFactories,
      create: setupApi.createFactory,
      update: setupApi.updateFactory,
      delete: setupApi.deleteFactory,
    },
  },
  currencies: {
    title: 'Currencies',
    columns: [
      { key: 'code', label: 'Code', className: 'font-mono text-emerald-400' },
      { key: 'name', label: 'Name' },
      { key: 'symbol', label: 'Symbol' },
      { key: 'exchange_rate', label: 'Rate' },
      { key: 'is_default', label: 'Default', render: (v: unknown) => v ? 'Yes' : 'No' },
      { key: 'status', label: 'Status' },
    ],
    formFields: ['code', 'name', 'symbol', 'exchange_rate', 'is_default', 'status'],
    requiredFields: ['code', 'name'],
    api: {
      list: setupApi.getCurrencies,
      create: setupApi.createCurrency,
      update: setupApi.updateCurrency,
      delete: setupApi.deleteCurrency,
    },
  },
  seasons: {
    title: 'Seasons',
    columns: [
      { key: 'code', label: 'Code', className: 'font-mono text-emerald-400' },
      { key: 'name', label: 'Name' },
      { key: 'start_date', label: 'Start' },
      { key: 'end_date', label: 'End' },
      { key: 'status', label: 'Status' },
    ],
    formFields: ['code', 'name', 'start_date', 'end_date', 'status', 'description'],
    requiredFields: ['code', 'name'],
    api: {
      list: setupApi.getSeasons,
      create: setupApi.createSeason,
      update: setupApi.updateSeason,
      delete: setupApi.deleteSeason,
    },
  },
  categories: {
    title: 'Product Categories',
    columns: [
      { key: 'code', label: 'Code', className: 'font-mono text-emerald-400' },
      { key: 'name', label: 'Name' },
      { key: 'parent_name', label: 'Parent' },
      { key: 'status', label: 'Status' },
    ],
    formFields: ['code', 'name', 'parent', 'status', 'description'],
    requiredFields: ['code', 'name'],
    api: {
      list: setupApi.getCategories,
      create: setupApi.createCategory,
      update: setupApi.updateCategory,
      delete: setupApi.deleteCategory,
    },
  },
  types: {
    title: 'Product Types',
    columns: [
      { key: 'code', label: 'Code', className: 'font-mono text-emerald-400' },
      { key: 'name', label: 'Name' },
      { key: 'category_name', label: 'Category' },
      { key: 'status', label: 'Status' },
    ],
    formFields: ['code', 'name', 'category', 'status', 'description'],
    requiredFields: ['code', 'name', 'category'],
    api: {
      list: setupApi.getTypes,
      create: setupApi.createType,
      update: setupApi.updateType,
      delete: setupApi.deleteType,
    },
  },
  'payment-terms': {
    title: 'Payment Terms',
    columns: [
      { key: 'code', label: 'Code', className: 'font-mono text-emerald-400' },
      { key: 'name', label: 'Name' },
      { key: 'days', label: 'Days' },
      { key: 'status', label: 'Status' },
    ],
    formFields: ['code', 'name', 'days', 'status', 'description'],
    requiredFields: ['code', 'name', 'days'],
    api: {
      list: setupApi.getPaymentTerms,
      create: setupApi.createPaymentTerms,
      update: setupApi.updatePaymentTerms,
      delete: setupApi.deletePaymentTerms,
    },
  },
  uoms: {
    title: 'Units of Measurement',
    columns: [
      { key: 'code', label: 'Code', className: 'font-mono text-emerald-400' },
      { key: 'name', label: 'Name' },
      { key: 'status', label: 'Status' },
    ],
    formFields: ['code', 'name', 'status', 'description'],
    requiredFields: ['code', 'name'],
    api: {
      list: setupApi.getUOMs,
      create: setupApi.createUOM,
      update: setupApi.updateUOM,
      delete: setupApi.deleteUOM,
    },
  },
  countries: {
    title: 'Countries',
    columns: [
      { key: 'code', label: 'Code', className: 'font-mono text-emerald-400' },
      { key: 'name', label: 'Name' },
      { key: 'default_currency_code', label: 'Currency' },
      { key: 'status', label: 'Status' },
    ],
    formFields: ['code', 'name', 'default_currency', 'status'],
    requiredFields: ['code', 'name'],
    api: {
      list: setupApi.getCountries,
      create: setupApi.createCountry,
      update: setupApi.updateCountry,
      delete: setupApi.deleteCountry,
    },
  },
  'color-codes': {
    title: 'Color Codes',
    columns: [
      { key: 'code', label: 'Code', className: 'font-mono text-emerald-400' },
      { key: 'name', label: 'Name' },
      {
        key: 'hex_code', label: 'Color',
        render: (v: unknown) => {
          const hex = v as string | null;
          return hex ? (
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 rounded border border-input-border" style={{ background: hex }} />
              <span className="font-mono text-xs">{hex}</span>
            </span>
          ) : <span>-</span>;
        },
      },
      { key: 'status', label: 'Status' },
    ],
    formFields: ['code', 'name', 'hex_code', 'status'],
    requiredFields: ['code', 'name'],
    api: {
      list: setupApi.getColorCodes,
      create: setupApi.createColorCode,
      update: setupApi.updateColorCode,
      delete: setupApi.deleteColorCode,
    },
  },
  departments: {
    title: 'Departments',
    columns: [
      { key: 'code', label: 'Code', className: 'font-mono text-emerald-400' },
      { key: 'name', label: 'Name' },
      { key: 'parent_name', label: 'Parent' },
      { key: 'status', label: 'Status' },
    ],
    formFields: ['code', 'name', 'parent', 'status', 'description'],
    requiredFields: ['code', 'name'],
    api: {
      list: setupApi.getDepartments,
      create: setupApi.createDepartment,
      update: setupApi.updateDepartment,
      delete: setupApi.deleteDepartment,
    },
  },
  designations: {
    title: 'Designations',
    columns: [
      { key: 'code', label: 'Code', className: 'font-mono text-emerald-400' },
      { key: 'name', label: 'Name' },
      { key: 'department_name', label: 'Department' },
      { key: 'status', label: 'Status' },
    ],
    formFields: ['code', 'name', 'department', 'status', 'description'],
    requiredFields: ['code', 'name'],
    api: {
      list: setupApi.getDesignations,
      create: setupApi.createDesignation,
      update: setupApi.updateDesignation,
      delete: setupApi.deleteDesignation,
    },
  },
  'product-departments': {
    title: 'Product Departments',
    columns: [
      { key: 'code', label: 'Code', className: 'font-mono text-emerald-400' },
      { key: 'name', label: 'Name' },
      { key: 'status', label: 'Status' },
    ],
    formFields: ['code', 'name', 'status'],
    requiredFields: ['code', 'name'],
    api: {
      list: setupApi.getProductDepartments,
      create: setupApi.createProductDepartment,
      update: setupApi.updateProductDepartment,
      delete: setupApi.deleteProductDepartment,
    },
  },
  'compliance-doc-types': {
    title: 'Compliance Doc Types',
    columns: [
      { key: 'code', label: 'Code', className: 'font-mono text-emerald-400' },
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description' },
      { key: 'validity_days', label: 'Validity (Days)' },
      { key: 'status', label: 'Status' },
    ],
    formFields: ['code', 'name', 'description', 'validity_days', 'status'],
    requiredFields: ['code', 'name'],
    api: {
      list: setupApi.getComplianceDocumentTypes,
      create: setupApi.createComplianceDocumentType,
      update: setupApi.updateComplianceDocumentType,
      delete: setupApi.deleteComplianceDocumentType,
    },
  },
  'delivery-modes': {
    title: 'Delivery Modes',
    columns: [
      { key: 'code', label: 'Code', className: 'font-mono text-emerald-400' },
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description' },
      { key: 'status', label: 'Status' },
    ],
    formFields: ['code', 'name', 'description', 'status'],
    requiredFields: ['code', 'name'],
    api: {
      list: setupApi.getDeliveryModes,
      create: setupApi.createDeliveryMode,
      update: setupApi.updateDeliveryMode,
      delete: setupApi.deleteDeliveryMode,
    },
  },
  vendors: {
    title: 'Vendors',
    columns: [
      { key: 'code', label: 'Code', className: 'font-mono text-emerald-400' },
      { key: 'name', label: 'Name' },
      { key: 'contact_person', label: 'Contact' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'city', label: 'City' },
      { key: 'country_name', label: 'Country' },
      { key: 'lead_time_days', label: 'Lead Time' },
      { key: 'rating', label: 'Rating' },
      { key: 'is_approved', label: 'Approved' },
      { key: 'approved_by_name', label: 'Approved By' },
      { key: 'status', label: 'Status' },
    ],
    formFields: ['code', 'name', 'contact_person', 'email', 'phone', 'address', 'city', 'country', 'payment_terms', 'lead_time_days', 'rating', 'is_approved', 'status', 'notes'],
    requiredFields: ['code', 'name'],
    api: {
      list: setupApi.getVendors,
      create: setupApi.createVendor,
      update: setupApi.updateVendor,
      delete: setupApi.deleteVendor,
    },
  },
  brands: {
    title: 'Brands',
    columns: [
      { key: 'buyer_name', label: 'Buyer' },
      { key: 'code', label: 'Code', className: 'font-mono text-emerald-400' },
      { key: 'name', label: 'Name' },
      { key: 'status', label: 'Status' },
    ],
    formFields: ['buyer', 'code', 'name', 'status'],
    requiredFields: ['buyer', 'code', 'name'],
    api: {
      list: setupApi.getBrands,
      create: setupApi.createBrand,
      update: setupApi.updateBrand,
      delete: setupApi.deleteBrand,
    },
  },
  'risk-levels': {
    title: 'Risk Levels',
    columns: [
      { key: 'code', label: 'Code', className: 'font-mono text-heading' },
      { key: 'name', label: 'Name' },
      {
        key: 'color', label: 'Color',
        render: (v: unknown) => {
          const hex = v as string | null;
          return hex ? (
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 rounded border border-input-border" style={{ background: hex }} />
              <span className="font-mono text-xs">{hex}</span>
            </span>
          ) : <span>-</span>;
        },
      },
      { key: 'sort_order', label: 'Order' },
      { key: 'status', label: 'Status' },
    ],
    formFields: ['code', 'name', 'color', 'description', 'sort_order', 'status'],
    requiredFields: ['code', 'name'],
    api: {
      list: setupApi.getRiskLevels,
      create: setupApi.createRiskLevel,
      update: setupApi.updateRiskLevel,
      delete: setupApi.deleteRiskLevel,
    },
  },
};

const FIELD_LABELS: Record<string, string> = {
  code: 'Code',
  name: 'Name',
  contact_person: 'Contact Person',
  email: 'Email',
  phone: 'Phone',
  address: 'Address',
  country: 'Country',
  is_active: 'Active',
  symbol: 'Symbol',
  exchange_rate: 'Exchange Rate',
  is_default: 'Default Currency',
  status: 'Status',
  start_date: 'Start Date',
  end_date: 'End Date',
  description: 'Description',
  parent: 'Parent',
  category: 'Category',
  days: 'Payment Days',
  default_currency: 'Default Currency',
  hex_code: 'Hex Color Code',
  department: 'Department',
  validity_days: 'Validity Days',
  lead_time_days: 'Lead Time (Days)',
  rating: 'Rating',
  buyer: 'Buyer',
  currency: 'Currency',
  payment_terms: 'Payment Terms',
  credit_limit: 'Credit Limit',
  city: 'City',
  factory_type: 'Factory Type',
  capacity: 'Capacity',
  capacity_unit: 'Capacity Unit',
  notes: 'Notes',
  color: 'Color (Hex)',
  sort_order: 'Sort Order',
  is_approved: 'Approved',
  approved_by_name: 'Approved By',
  approved_at: 'Approved At',
};

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'draft', label: 'Draft' },
];

const FACTORY_TYPE_OPTIONS = [
  { value: 'cmt', label: 'CMT (Cut, Make, Trim)' },
  { value: 'full_package', label: 'Full Package' },
  { value: 'fob', label: 'FOB' },
];

const CAPACITY_UNIT_OPTIONS = [
  { value: 'pieces/day', label: 'Pieces/Day' },
  { value: 'dozens/day', label: 'Dozens/Day' },
  { value: 'tons/month', label: 'Tons/Month' },
];

const NUMERIC_FIELDS = new Set(['days', 'validity_days', 'lead_time_days', 'rating', 'exchange_rate', 'credit_limit', 'capacity', 'sort_order']);

interface FKFieldConfig {
  label: string;
  fetchFn: () => Promise<{ data: { results: { id: string; name: string; code?: string }[]; count: number } }>;
  labelFn?: (item: { id: string; name: string; code?: string }) => string;
  descriptionFn?: (item: { id: string; name: string; code?: string }) => string;
}

function getFKFieldMap(): Record<string, FKFieldConfig> {
  return {
    country: {
      label: 'Country',
      fetchFn: () => setupApi.getCountries({ page_size: '500' }),
      labelFn: (item) => item.name,
    },
    currency: {
      label: 'Currency',
      fetchFn: () => setupApi.getCurrencies({ page_size: '500' }),
      labelFn: (item) => `${item.code} - ${item.name}`,
    },
    payment_terms: {
      label: 'Payment Terms',
      fetchFn: () => setupApi.getPaymentTerms({ page_size: '500' }),
      labelFn: (item) => `${item.name} (${(item as Record<string, unknown>).days ?? ''} days)`,
    },
    default_currency: {
      label: 'Default Currency',
      fetchFn: () => setupApi.getCurrencies({ page_size: '500' }),
      labelFn: (item) => `${item.code} - ${item.name}`,
    },
    category: {
      label: 'Category',
      fetchFn: () => setupApi.getCategories({ page_size: '500' }),
      labelFn: (item) => item.name,
    },
    parent: {
      label: 'Parent',
      fetchFn: () => setupApi.getCategories({ page_size: '500' }),
      labelFn: (item) => item.name,
    },
    department: {
      label: 'Department',
      fetchFn: () => setupApi.getDepartments({ page_size: '500' }),
      labelFn: (item) => item.name,
    },
    buyer: {
      label: 'Buyer',
      fetchFn: () => setupApi.getBuyers({ page_size: '500' }),
      labelFn: (item) => item.name,
    },
  };
}

const FK_FIELDS_MAP = getFKFieldMap();

function buildFormField(
  field: string,
  value: string | number | boolean | null,
  onChange: (v: string) => void,
  _fkOptions?: { value: string; label: string; description?: string }[],
) {
  if (field === 'is_active' || field === 'is_default' || field === 'is_approved') {
    return (
      <label key={field} className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
          className="w-4 h-4 rounded bg-surface-alt border-input-border text-emerald-500 focus:ring-emerald-500"
        />
        <span className="text-sm text-body">{FIELD_LABELS[field] || field}</span>
      </label>
    );
  }

  if (field === 'status') {
    return (
      <div key={field}>
        <label className="block text-sm text-muted mb-1">{FIELD_LABELS[field]}</label>
        <select
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">Select...</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    );
  }

  if (field === 'factory_type') {
    return (
      <div key={field}>
        <label className="block text-sm text-muted mb-1">{FIELD_LABELS[field]}</label>
        <select
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">Select...</option>
          {FACTORY_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    );
  }

  if (field === 'capacity_unit') {
    return (
      <div key={field}>
        <label className="block text-sm text-muted mb-1">{FIELD_LABELS[field]}</label>
        <select
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">Select...</option>
          {CAPACITY_UNIT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    );
  }

  if (field === 'start_date' || field === 'end_date') {
    return (
      <div key={field}>
        <label className="block text-sm text-muted mb-1">{FIELD_LABELS[field]}</label>
        <input
          type="date"
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>
    );
  }

  if (field === 'description' || field === 'notes') {
    return (
      <div key={field}>
        <label className="block text-sm text-muted mb-1">{FIELD_LABELS[field]}</label>
        <textarea
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none placeholder:text-faint"
          placeholder={`Enter ${FIELD_LABELS[field]?.toLowerCase() || field}`}
        />
      </div>
    );
  }

  if (NUMERIC_FIELDS.has(field)) {
    return (
      <div key={field}>
        <label className="block text-sm text-muted mb-1">{FIELD_LABELS[field]}</label>
        <input
          type="number"
          value={(value as string | number) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          min="0"
          step={field === 'rating' ? '0.5' : '1'}
          max={field === 'rating' ? '5' : undefined}
          className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>
    );
  }

  return (
    <div key={field}>
      <label className="block text-sm text-muted mb-1">{FIELD_LABELS[field] || field}</label>
      <input
        type={field.includes('email') ? 'email' : 'text'}
        value={(value as string) || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-faint"
        placeholder={`Enter ${FIELD_LABELS[field]?.toLowerCase() || field}`}
      />
    </div>
  );
}

export default function MasterDataPage() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const config = type ? TYPE_CONFIG[type] : undefined;

  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [fkOptions, setFkOptions] = useState<Record<string, { value: string; label: string; description?: string }[]>>({});
  const [fkLoading, setFkLoading] = useState<Record<string, boolean>>({});
  const fkLoadedRef = useRef<Set<string>>(new Set());

  const pageSize = 20;

  const fetchFkOptions = useCallback(async (fieldName: string) => {
    if (fkLoadedRef.current.has(fieldName)) return;
    const fkConfig = FK_FIELDS_MAP[fieldName];
    if (!fkConfig) return;

    setFkLoading((prev) => ({ ...prev, [fieldName]: true }));
    try {
      const res = await fkConfig.fetchFn();
      const options = res.data.results.map((item) => ({
        value: item.id,
        label: fkConfig.labelFn ? fkConfig.labelFn(item) : item.name,
        description: fkConfig.descriptionFn ? fkConfig.descriptionFn(item) : undefined,
      }));
      setFkOptions((prev) => ({ ...prev, [fieldName]: options }));
      fkLoadedRef.current.add(fieldName);
    } catch {
      // silently fail
    } finally {
      setFkLoading((prev) => ({ ...prev, [fieldName]: false }));
    }
  }, []);

  useEffect(() => {
    if (!config) return;
    const fkFields = config.formFields.filter((f) => f in FK_FIELDS_MAP);
    fkFields.forEach((f) => fetchFkOptions(f));
  }, [config, fetchFkOptions]);

  const fetchData = useCallback(async () => {
    if (!config) return;
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), page_size: String(pageSize) };
      if (search) params.search = search;
      const res = await config.api.list(params);
      setData(res.data.results as Record<string, unknown>[]);
      setTotalCount(res.data.count);
    } catch {
      toast('error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [config, page, search, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  if (!config) {
    return (
      <Layout>
        <div className="p-6 text-center text-muted">
          Unknown master data type: {type}
          <button onClick={() => navigate('/setup')} className="block mx-auto mt-4 text-emerald-400 hover:underline">
            Back to Setup
          </button>
        </div>
      </Layout>
    );
  }

  const openCreate = () => {
    setEditingId(null);
    const initial: Record<string, string> = {};
    config.formFields.forEach((f) => {
      if (f === 'is_active' || f === 'is_default' || f === 'is_approved') initial[f] = 'false';
      else if (f === 'status') initial[f] = 'active';
      else initial[f] = '';
    });
    setFormValues(initial);
    setShowModal(true);
  };

  const openEdit = (row: Record<string, unknown>) => {
    setEditingId(row.id as string);
    const vals: Record<string, string> = {};
    config.formFields.forEach((f) => {
      const v = row[f];
      if (typeof v === 'boolean') vals[f] = v ? 'true' : 'false';
      else if (v === null || v === undefined) vals[f] = '';
      else vals[f] = String(v);
    });
    setFormValues(vals);
    setShowModal(true);
  };

  const handleSave = async () => {
    const required = config.requiredFields || ['code', 'name'];
    const missing = required.filter((f) => !formValues[f]?.trim());
    if (missing.length > 0) {
      toast('warning', `Required fields: ${missing.map((f) => FIELD_LABELS[f] || f).join(', ')}`);
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      Object.entries(formValues).forEach(([k, v]) => {
        if (k === 'is_active' || k === 'is_default' || k === 'is_approved') {
          payload[k] = v === 'true';
        } else if (NUMERIC_FIELDS.has(k)) {
          payload[k] = v ? parseFloat(v) : null;
        } else if (v === '') {
          payload[k] = null;
        } else {
          payload[k] = v;
        }
      });

      if (editingId) {
        await config.api.update(editingId, payload);
        toast('success', `${config.title.replace(/s$/, '')} updated`);
      } else {
        await config.api.create(payload);
        toast('success', `${config.title.replace(/s$/, '')} created`);
      }
      setShowModal(false);
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      toast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    setDeleting(id);
    try {
      await config.api.delete(id);
      toast('success', 'Deleted successfully');
      fetchData();
    } catch {
      toast('error', 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  const columnsWithActions: Column[] = [
    ...config.columns,
    {
      key: '_actions',
      label: 'Actions',
      className: 'text-right',
      render: (_v: unknown, row: Record<string, unknown>) => (
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => openEdit(row)}
            className="px-2 py-1 text-xs text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(row.id as string)}
            disabled={deleting === row.id}
            className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
          >
            {deleting === row.id ? '...' : 'Delete'}
          </button>
        </div>
      ),
    },
  ];

  const renderFormField = (field: string) => {
    const fkConfig = FK_FIELDS_MAP[field];
    if (fkConfig) {
      const options = fkOptions[field] || [];
      const isLoading = fkLoading[field];
      return (
        <div key={field}>
          <label className="block text-sm text-muted mb-1">{fkConfig.label}</label>
          {isLoading ? (
            <div className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-muted text-sm">
              Loading...
            </div>
          ) : (
            <SearchableSelect
              options={options}
              value={formValues[field] || null}
              onChange={(v) => setFormValues((prev) => ({ ...prev, [field]: String(v || '') }))}
              placeholder={`Select ${fkConfig.label.toLowerCase()}...`}
            />
          )}
        </div>
      );
    }
    return buildFormField(field, formValues[field] ?? '', (v) => setFormValues((prev) => ({ ...prev, [field]: v })));
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted mb-1">
              <button onClick={() => navigate('/setup')} className="hover:text-heading transition-colors">Setup</button>
              <span>/</span>
              <span className="text-heading">{config.title}</span>
            </div>
            <h1 className="text-2xl font-bold text-heading">{config.title}</h1>
          </div>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + Add {config.title.replace(/s$/, '')}
          </button>
        </div>

        <DataTable
          data={data}
          columns={columnsWithActions}
          totalCount={totalCount}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={`Search ${config.title.toLowerCase()}...`}
          loading={loading}
          onRowClick={openEdit}
        />

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-surface border border-border rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="text-lg font-semibold text-heading">
                  {editingId ? 'Edit' : 'Add'} {config.title.replace(/s$/, '')}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-muted hover:text-heading text-xl leading-none">&times;</button>
              </div>
              <div className="px-6 py-4 space-y-4">
                {config.formFields.map((field) => renderFormField(field))}
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-muted hover:text-heading transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
