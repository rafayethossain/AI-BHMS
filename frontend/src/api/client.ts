import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const tenantId = localStorage.getItem('tenant_id');
  if (tenantId) {
    config.headers['X-Tenant-ID'] = tenantId;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const res = await axios.post('/api/v1/auth/token/refresh/', { refresh });
          localStorage.setItem('access_token', res.data.access);
          if (res.data.refresh) {
            localStorage.setItem('refresh_token', res.data.refresh);
          }
          originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          localStorage.removeItem('tenant_id');
          window.location.href = '/login';
        }
      } else {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        localStorage.removeItem('tenant_id');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  action: string;
  description: string;
  user: string;
  user_name: string;
  ip_address: string;
  created_at: string;
}

export interface SystemHealth {
  id: string;
  service: string;
  status: string;
  response_time_ms: number | null;
  message: string;
  checked_at: string;
}

export interface Alert {
  id: string;
  alert_type: string;
  service: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_by_name: string | null;
  resolved_at: string | null;
  created_at: string;
}

export const monitoringApi = {
  getAuditLogs: (params?: Record<string, string>) =>
    api.get<{ results: AuditLog[]; count: number }>('/monitoring/audit-logs/', { params }),
  getAuditLog: (id: string) => api.get<AuditLog>(`/monitoring/audit-logs/${id}/`),

  getHealth: (params?: Record<string, string>) =>
    api.get<{ results: SystemHealth[]; count: number }>('/monitoring/system-health/', { params }),
  runHealthChecks: () => api.post('/monitoring/system-health/run_checks/'),

  getAlerts: (params?: Record<string, string>) =>
    api.get<{ results: Alert[]; count: number }>('/monitoring/alerts/', { params }),
};

export interface LoginResponse {
  access: string;
  refresh: string;
  user: {
    id: string;
    username: string;
    email: string;
    full_name: string;
    tenant_id: string | null;
  };
}

export interface MFAResponse {
  secret: string;
  provisioning_uri: string;
}

export interface MFAStatus {
  mfa_enabled: boolean;
  backup_codes_remaining: number;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login/', { email, password }),

  logout: (refresh: string) =>
    api.post('/auth/logout/', { refresh }),

  verifyToken: () =>
    api.get('/auth/token/verify/'),

  getMe: () =>
    api.get<User>('/users/me/'),

  changePassword: (old_password: string, new_password: string, new_password_confirm: string) =>
    api.post('/auth/password/change/', { old_password, new_password, new_password_confirm }),

  mfaSetup: () =>
    api.get<MFAResponse>('/auth/mfa/setup/'),

  mfaVerifySetup: (secret: string, code: string) =>
    api.post('/auth/mfa/verify-setup/', { secret, code }),

  mfaStatus: () =>
    api.get<MFAStatus>('/auth/mfa/status/'),

  mfaDisable: (code: string) =>
    api.post('/auth/mfa/disable/', { code }),

  mfaRegenerateBackupCodes: (code: string) =>
    api.post('/auth/mfa/regenerate-backup-codes/', { code }),
};

export interface Style {
  id: string;
  style_number: string;
  name: string;
  description: string;
  buyer: string;
  buyer_name: string;
  brand: string | null;
  category: string | null;
  product_type: string | null;
  department: string | null;
  season: string | null;
  season_name: string | null;
  tech_pack: string | null;
  sketch_front: string | null;
  sketch_back: string | null;
  sketch_side: string | null;
  sketch_detail: string | null;
  current_version: number;
  status: string;
  main_image: string | null;
  file_openings_count: number;
  purchase_orders_count: number;
  created_at: string;
}

export interface DesignImage {
  id: string;
  style: string;
  style_number: string;
  image: string;
  role: 'main' | 'range' | 'colourway' | 'detail';
  caption: string;
  colourway: string;
  sort_order: number;
  is_main: boolean;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  file_opening: string;
  buyer: string;
  buyer_name: string;
  brand: string | null;
  brand_name: string | null;
  factory: string;
  factory_name: string;
  po_date: string;
  delivery_date: string;
  quantity: number;
  unit_price: string;
  total_value: string;
  status: string;
  destination_country: string | null;
  destination_country_name: string | null;
  destination_port: string | null;
  currency: string | null;
  currency_name: string | null;
  currency_code: string | null;
  payment_terms: string | null;
  payment_terms_name: string | null;
  delivery_mode: string | null;
  delivery_mode_name: string | null;
  remarks: string | null;
  items: PurchaseOrderItem[];
  created_at: string;
  risk_level: string | null;
  risk_level_detail: { id: string; code: string; name: string; color: string } | null;
}

export interface PurchaseOrderItem {
  id: string;
  color: string;
  color_name: string;
  size: string;
  quantity: number;
  unit_price: string;
}

export interface POAmendment {
  id: string;
  purchase_order: string;
  amendment_number: string;
  field_name: string;
  old_value: string;
  new_value: string;
  reason: string;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface BOM {
  id: string;
  style_version: string;
  style_number: string;
  style_id: string;
  name: string;
  version: number;
  status: string;
  items: BOMItem[];
  total_cost: number;
  created_at: string;
}

export interface BOMItem {
  id: string;
  category: string;
  item_name: string;
  description: string;
  uom: string | null;
  uom_name: string | null;
  consumption: string | null;
  waste_percent: string | null;
  unit_price: string | null;
  vendor: string | null;
  vendor_name: string | null;
  supplier: string | null;
  supplier_name: string | null;
  ordered_qty: string | null;
  delivered_qty: string | null;
  eta_date: string | null;
  confirmed_date: string | null;
  actual_date: string | null;
  status: string;
  line_total: number | null;
}

export interface Hit {
  id: string;
  purchase_order: string;
  po_number: string;
  hit_number: string;
  colour: string;
  colour_name: string;
  delivery_mode: string;
  delivery_type: string;
  factory_override: string | null;
  factory_name: string | null;
  original_delivery_date: string | null;
  actual_delivery_date: string | null;
  created_at: string;
}

export interface FitSpec {
  id: string;
  purchase_order: string;
  po_number: string;
  fit_stage: string;
  version: number;
  measurements: Record<string, unknown>;
  images: string[];
  notes: string;
  is_current: boolean;
  created_at: string;
}

export type JobType = 'pattern' | 'sample' | '3d' | 'mini_marker';
export type JobStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface JobRequest {
  id: string;
  job_number: string;
  job_type: JobType;
  job_type_display: string;
  style: string;
  style_number: string;
  purchase_order: string | null;
  po_number: string | null;
  description: string;
  work_location: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  required_by_date: string | null;
  priority: number;
  priority_display: string;
  status: JobStatus;
  status_display: string;
  notes: string;
  created_at: string;
}

export interface JobDashboard {
  total: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  by_priority: Record<string, number>;
  overdue: number;
  due_this_week: number;
  unassigned: number;
}

export interface UnsoldAnalysisRow {
  style_id: string;
  style_number: string;
  style_name: string;
  buyer_name: string | null;
  sample_count: number;
  has_file: boolean;
  not_sold: boolean;
  main_image: string | null;
}

export interface UnsoldAnalysisResponse {
  period: { start: string; end: string };
  summary: {
    total_samples: number;
    styles_sampled: number;
    sold: number;
    not_sold: number;
  };
  results: UnsoldAnalysisRow[];
}

export interface StyleVersion {
  id: string;
  style: string;
  style_number: string;
  version_number: number;
  revision_notes: string;
  status: string;
  created_at: string;
}

export interface StyleItem {
  id: string;
  style: string;
  category: string;
  item_name: string;
  description: string;
  uom: string | null;
  uom_name: string | null;
  consumption: number | null;
  waste_percent: number | null;
  unit_price: number | null;
  vendor: string | null;
  vendor_name: string | null;
  sort_order: number;
  line_total: number | null;
}

export interface FileOpening {
  id: string;
  file_number: string;
  style: string;
  style_number: string;
  style_version: string;
  buyer: string;
  buyer_name: string;
  brand: string | null;
  factory: string;
  factory_name: string;
  file_date: string;
  status: string;
  remarks: string;
  purchase_orders_count: number;
  created_at: string;
  is_quick_lead: boolean;
  quick_lead_agreed_by: string[];
  quick_lead_agreement_complete: boolean;
  missing_agreements: string[];
  original_fn: string | null;
  original_fn_number: string;
  is_repeat: boolean;
  repeat_approved_by: string[];
  repeat_approval_complete: boolean;
  missing_repeat_approvals: string[];
  is_stock_fabric: boolean;
  stock_fabric_description: string;
  total_meters: string | null;
  allocated_meters: string;
  stock_balance_meters: string;
  stock_photo: string | null;
  stock_allocations: StockFabricAllocation[];
}

export interface StockFabricAllocation {
  id: string;
  stock: string;
  allocated_to: string | null;
  allocated_to_number: string;
  meters: string;
  allocated_date: string;
  notes: string;
  created_at: string;
}

// Setup master data interfaces
export interface Buyer { id: string; name: string; code: string; contact_person: string; email: string; phone: string; address: string; country: string | null; is_active: boolean; }
export interface Factory { id: string; name: string; code: string; contact_person: string; email: string; phone: string; address: string; country: string | null; is_active: boolean; }
export interface Currency { id: string; name: string; code: string; symbol: string; exchange_rate: string; is_default: boolean; status: string; }
export interface Season { id: string; name: string; code: string; start_date: string | null; end_date: string | null; status: string; description: string; }
export interface ProductCategory { id: string; name: string; code: string; parent: string | null; parent_name: string | null; status: string; description: string; }
export interface ProductType { id: string; name: string; code: string; category: string; category_name: string; status: string; description: string; }
export interface PaymentTerms { id: string; name: string; code: string; days: number; description: string; status: string; }
export interface UOM { id: string; name: string; code: string; description: string; status: string; }
export interface Country { id: string; name: string; code: string; default_currency: string | null; default_currency_name: string | null; status: string; }
export interface ColorCode { id: string; name: string; code: string; hex_code: string | null; status: string; }
export interface Department { id: string; name: string; code: string; parent: string | null; parent_name: string | null; status: string; description: string; }
export interface Designation { id: string; name: string; code: string; department: string | null; department_name: string | null; status: string; description: string; }
export interface Office { id: string; name: string; office_type: string; address: string; city: string; country: string | null; phone: string; email: string; is_active: boolean; }
export interface TenantConfig { id: string; name: string; legal_name: string; address: string; phone: string; email: string; logo: string | null; timezone: string; currency: string | null; currency_name: string | null; plan: string; }

export interface ProductDepartment {
  id: string;
  code: string;
  name: string;
  status: 'active' | 'inactive';
  is_active: boolean;
  created_at: string;
}

export interface ComplianceDocumentType {
  id: string;
  code: string;
  name: string;
  description: string;
  validity_days: number | null;
  status: 'active' | 'inactive';
  is_active: boolean;
  created_at: string;
}

export interface DeliveryMode {
  id: string;
  code: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  is_active: boolean;
  created_at: string;
}

export interface Vendor {
  id: string;
  code: string;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string | null;
  country_name: string;
  product_categories: string[];
  payment_terms: string | null;
  payment_terms_name: string;
  lead_time_days: number | null;
  rating: number | null;
  status: 'active' | 'inactive';
  is_active: boolean;
  notes: string;
  created_at: string;
}

export interface Brand {
  id: string;
  buyer: string;
  buyer_name: string;
  code: string;
  name: string;
  status: 'active' | 'inactive';
  is_active: boolean;
  created_at: string;
}

export interface RiskLevel {
  id: string;
  code: string;
  name: string;
  color: string;
  description: string;
  sort_order: number;
  status: 'active' | 'inactive';
  created_at: string;
}

export const setupApi = {
  // Buyers
  getBuyers: (params?: Record<string, string>) => api.get<{ results: Buyer[]; count: number }>('/setup/buyers/', { params }),
  createBuyer: (data: Record<string, unknown>) => api.post('/setup/buyers/', data),
  updateBuyer: (id: string, data: Record<string, unknown>) => api.patch(`/setup/buyers/${id}/`, data),
  deleteBuyer: (id: string) => api.delete(`/setup/buyers/${id}/`),
  // Factories
  getFactories: (params?: Record<string, string>) => api.get<{ results: Factory[]; count: number }>('/setup/factories/', { params }),
  createFactory: (data: Record<string, unknown>) => api.post('/setup/factories/', data),
  updateFactory: (id: string, data: Record<string, unknown>) => api.patch(`/setup/factories/${id}/`, data),
  deleteFactory: (id: string) => api.delete(`/setup/factories/${id}/`),
  // Currencies
  getCurrencies: (params?: Record<string, string>) => api.get<{ results: Currency[]; count: number }>('/setup/currencies/', { params }),
  createCurrency: (data: Record<string, unknown>) => api.post('/setup/currencies/', data),
  updateCurrency: (id: string, data: Record<string, unknown>) => api.patch(`/setup/currencies/${id}/`, data),
  deleteCurrency: (id: string) => api.delete(`/setup/currencies/${id}/`),
  // Seasons
  getSeasons: (params?: Record<string, string>) => api.get<{ results: Season[]; count: number }>('/setup/seasons/', { params }),
  createSeason: (data: Record<string, unknown>) => api.post('/setup/seasons/', data),
  updateSeason: (id: string, data: Record<string, unknown>) => api.patch(`/setup/seasons/${id}/`, data),
  deleteSeason: (id: string) => api.delete(`/setup/seasons/${id}/`),
  // Categories
  getCategories: (params?: Record<string, string>) => api.get<{ results: ProductCategory[]; count: number }>('/setup/product-categories/', { params }),
  createCategory: (data: Record<string, unknown>) => api.post('/setup/product-categories/', data),
  updateCategory: (id: string, data: Record<string, unknown>) => api.patch(`/setup/product-categories/${id}/`, data),
  deleteCategory: (id: string) => api.delete(`/setup/product-categories/${id}/`),
  // Types
  getTypes: (params?: Record<string, string>) => api.get<{ results: ProductType[]; count: number }>('/setup/product-types/', { params }),
  createType: (data: Record<string, unknown>) => api.post('/setup/product-types/', data),
  updateType: (id: string, data: Record<string, unknown>) => api.patch(`/setup/product-types/${id}/`, data),
  deleteType: (id: string) => api.delete(`/setup/product-types/${id}/`),
  // Payment Terms
  getPaymentTerms: (params?: Record<string, string>) => api.get<{ results: PaymentTerms[]; count: number }>('/setup/payment-terms/', { params }),
  createPaymentTerms: (data: Record<string, unknown>) => api.post('/setup/payment-terms/', data),
  updatePaymentTerms: (id: string, data: Record<string, unknown>) => api.patch(`/setup/payment-terms/${id}/`, data),
  deletePaymentTerms: (id: string) => api.delete(`/setup/payment-terms/${id}/`),
  // UOMs
  getUOMs: (params?: Record<string, string>) => api.get<{ results: UOM[]; count: number }>('/setup/uoms/', { params }),
  createUOM: (data: Record<string, unknown>) => api.post('/setup/uoms/', data),
  updateUOM: (id: string, data: Record<string, unknown>) => api.patch(`/setup/uoms/${id}/`, data),
  deleteUOM: (id: string) => api.delete(`/setup/uoms/${id}/`),
  // Countries
  getCountries: (params?: Record<string, string>) => api.get<{ results: Country[]; count: number }>('/setup/countries/', { params }),
  createCountry: (data: Record<string, unknown>) => api.post('/setup/countries/', data),
  updateCountry: (id: string, data: Record<string, unknown>) => api.patch(`/setup/countries/${id}/`, data),
  deleteCountry: (id: string) => api.delete(`/setup/countries/${id}/`),
  // Color Codes
  getColorCodes: (params?: Record<string, string>) => api.get<{ results: ColorCode[]; count: number }>('/setup/color-codes/', { params }),
  createColorCode: (data: Record<string, unknown>) => api.post('/setup/color-codes/', data),
  updateColorCode: (id: string, data: Record<string, unknown>) => api.patch(`/setup/color-codes/${id}/`, data),
  deleteColorCode: (id: string) => api.delete(`/setup/color-codes/${id}/`),
  // Departments
  getDepartments: (params?: Record<string, string>) => api.get<{ results: Department[]; count: number }>('/setup/departments/', { params }),
  createDepartment: (data: Record<string, unknown>) => api.post('/setup/departments/', data),
  updateDepartment: (id: string, data: Record<string, unknown>) => api.patch(`/setup/departments/${id}/`, data),
  deleteDepartment: (id: string) => api.delete(`/setup/departments/${id}/`),
  // Designations
  getDesignations: (params?: Record<string, string>) => api.get<{ results: Designation[]; count: number }>('/setup/designations/', { params }),
  createDesignation: (data: Record<string, unknown>) => api.post('/setup/designations/', data),
  updateDesignation: (id: string, data: Record<string, unknown>) => api.patch(`/setup/designations/${id}/`, data),
  deleteDesignation: (id: string) => api.delete(`/setup/designations/${id}/`),
  // Offices
  getOffices: (params?: Record<string, string>) => api.get<{ results: Office[]; count: number }>('/setup/offices/', { params }),
  createOffice: (data: Record<string, unknown>) => api.post('/setup/offices/', data),
  updateOffice: (id: string, data: Record<string, unknown>) => api.patch(`/setup/offices/${id}/`, data),
  deleteOffice: (id: string) => api.delete(`/setup/offices/${id}/`),
  // ProductDepartments
  getProductDepartments: (params?: Record<string, string>) => api.get<{ results: ProductDepartment[]; count: number }>('/setup/product-departments/', { params }),
  createProductDepartment: (data: Record<string, unknown>) => api.post('/setup/product-departments/', data),
  updateProductDepartment: (id: string, data: Record<string, unknown>) => api.patch(`/setup/product-departments/${id}/`, data),
  deleteProductDepartment: (id: string) => api.delete(`/setup/product-departments/${id}/`),
  // ComplianceDocumentTypes
  getComplianceDocumentTypes: (params?: Record<string, string>) => api.get<{ results: ComplianceDocumentType[]; count: number }>('/setup/compliance-document-types/', { params }),
  createComplianceDocumentType: (data: Record<string, unknown>) => api.post('/setup/compliance-document-types/', data),
  updateComplianceDocumentType: (id: string, data: Record<string, unknown>) => api.patch(`/setup/compliance-document-types/${id}/`, data),
  deleteComplianceDocumentType: (id: string) => api.delete(`/setup/compliance-document-types/${id}/`),
  // DeliveryModes
  getDeliveryModes: (params?: Record<string, string>) => api.get<{ results: DeliveryMode[]; count: number }>('/setup/delivery-modes/', { params }),
  createDeliveryMode: (data: Record<string, unknown>) => api.post('/setup/delivery-modes/', data),
  updateDeliveryMode: (id: string, data: Record<string, unknown>) => api.patch(`/setup/delivery-modes/${id}/`, data),
  deleteDeliveryMode: (id: string) => api.delete(`/setup/delivery-modes/${id}/`),
  // Vendors
  getVendors: (params?: Record<string, string>) => api.get<{ results: Vendor[]; count: number }>('/setup/vendors/', { params }),
  createVendor: (data: Record<string, unknown>) => api.post('/setup/vendors/', data),
  updateVendor: (id: string, data: Record<string, unknown>) => api.patch(`/setup/vendors/${id}/`, data),
  deleteVendor: (id: string) => api.delete(`/setup/vendors/${id}/`),
  // Brands
  getBrands: (params?: Record<string, string>) => api.get<{ results: Brand[]; count: number }>('/setup/brands/', { params }),
  createBrand: (data: Record<string, unknown>) => api.post('/setup/brands/', data),
  updateBrand: (id: string, data: Record<string, unknown>) => api.patch(`/setup/brands/${id}/`, data),
  deleteBrand: (id: string) => api.delete(`/setup/brands/${id}/`),
  // Risk Levels
  getRiskLevels: (params?: Record<string, string>) => api.get<{ results: RiskLevel[]; count: number }>('/setup/risk-levels/', { params }),
  createRiskLevel: (data: Record<string, unknown>) => api.post('/setup/risk-levels/', data),
  updateRiskLevel: (id: string, data: Record<string, unknown>) => api.patch(`/setup/risk-levels/${id}/`, data),
  deleteRiskLevel: (id: string) => api.delete(`/setup/risk-levels/${id}/`),
};

export const tenantApi = {
  getTenant: () => api.get<TenantConfig>('/tenants/current/'),
  updateTenant: (data: Record<string, unknown>) => api.patch<TenantConfig>('/tenants/current/', data),
};

export interface CostingLine {
  id: string;
  costing: string;
  category: string;
  category_label: string;
  description: string;
  unit_price: string;
  consumption: string;
  line_total: string;
  is_additional: boolean;
  original_description: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  size_width: string;
  sort_order: number;
  created_at: string;
}

export interface SizeRatioEntry {
  size: string;
  ratio: number;
}

export interface Costing {
  id: string;
  purchase_order: string;
  po_number: string;
  bom: string | null;
  bom_name: string | null;
  bom_style_number: string | null;
  version: number;
  fabric_cost: string;
  trim_cost: string;
  cm_cost: string;
  overhead_cost: string;
  total_cost: string;
  target_price: string | null;
  margin: string;
  margin_percent: number | null;
  status: string;
  sheet_type: string;
  sheet_type_label: string;
  is_live: boolean;
  exchange_rate: string | null;
  landed_cost: string | null;
  lines: CostingLine[];
  approved_by: string | null;
  approved_at: string | null;
  notes: string;
  is_single_size: boolean;
  single_size_watermark: boolean;
  size_ratio: SizeRatioEntry[];
  confirmed: boolean;
  confirmed_by: string | null;
  confirmed_at: string | null;
  is_patterned: boolean;
  patterned_fabric_options: string[];
  created_at: string;
}

export interface TA {
  id: string;
  purchase_order: string;
  po_number: string;
  delivery_date: string;
  status: string;
  critical_path: Record<string, unknown> | null;
  created_at: string;
  milestones?: TAMilestone[];
}

export interface TAMilestone {
  id: string;
  ta: string;
  name: string;
  description: string;
  planned_date: string;
  actual_date: string | null;
  status: string;
  is_critical: boolean;
  sort_order: number;
}

export interface TAlerts {
  overdue: TA[];
  upcoming: TA[];
  overdue_count: number;
  upcoming_count: number;
}

export interface Bank {
  id: string;
  code: string;
  name: string;
  swift_code: string;
  address: string;
  contact_person: string;
  phone: string;
  email: string;
  status: string;
}

export interface LC {
  id: string;
  lc_number: string;
  lc_type: 'master' | 'b2b';
  buyer: string;
  buyer_name: string;
  purchase_order: string | null;
  po_number: string | null;
  parent_lc: string | null;
  bank: string | null;
  bank_name: string | null;
  amount: string;
  currency: string;
  currency_name: string | null;
  currency_code: string | null;
  issued_date: string | null;
  expiry_date: string;
  status: string;
  utilized_amount: string;
  balance_amount: string;
  utilization_percent: number;
  amendments: LCAmendment[];
  remarks: string;
}

export interface LCAmendment {
  id: string;
  lc: string;
  amendment_number: number;
  amount_change: string | null;
  expiry_date_change: string | null;
  quantity_change: number | null;
  reason: string;
  status: string;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
}

export interface LCDashboard {
  total_lcs: number;
  active_lcs: number;
  total_value: string;
  utilized_value: string;
  expiring_soon: LC[];
  draft_lcs: number;
}

export interface ProformaInvoice {
  id: string;
  pi_number: string;
  purchase_order: string;
  po_number: string;
  buyer: string;
  buyer_name: string;
  lc: string | null;
  amount: string;
  currency: string;
  issued_date: string;
  validity_date: string | null;
  status: string;
  remarks: string;
}

export interface SalesContract {
  id: string;
  contract_number: string;
  purchase_order: string;
  po_number: string;
  buyer: string;
  buyer_name: string;
  contract_date: string;
  total_amount: string;
  currency: string;
  payment_terms: string | null;
  delivery_terms: string | null;
  status: string;
  remarks: string;
}

export interface SalesConfirmation {
  id: string;
  confirmation_number: string;
  purchase_order: string;
  po_number: string;
  buyer: string;
  buyer_name: string;
  sent_at: string | null;
  disputed_at: string | null;
  accepted_at: string | null;
  status: string;
  status_display: string;
  dispute_reason: string;
  auto_accepted: boolean;
  remarks: string | null;
  window_elapsed: boolean;
  created_at: string;
  updated_at: string;
}

export interface SalesConfirmationDashboard {
  total: number;
  by_status: Record<string, number>;
  overdue: number;
  sent_within_window: number;
}

export interface DebitNote {
  id: string;
  debit_number: string;
  debit_type: string;
  debit_type_display: string;
  party_type: string;
  party_type_display: string;
  debited_party: string;
  purchase_order: string | null;
  po_number: string | null;
  buyer_name: string | null;
  reconciliation: string | null;
  reconciliation_number: string | null;
  amount: string;
  currency: string | null;
  currency_code: string | null;
  currency_name: string | null;
  shortage_units: string;
  tolerance_pct: string;
  reason: string;
  status: string;
  status_display: string;
  compliance_email: string;
  compliance_email_sent: boolean;
  email_sent_at: string | null;
  raised_by: string | null;
  raised_by_name: string | null;
  raised_at: string;
  issued_at: string | null;
  paid_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface DebitNoteDashboard {
  total: number;
  total_value: string;
  by_status: Record<string, number>;
  compliance_emails_sent: number;
  pending_value: string;
}

export interface OverToleranceCandidate {
  po_id: string;
  po_number: string;
  buyer_name: string;
  status: string;
  ordered_quantity: number;
  shipped_quantity: string;
  quantity_variance: string;
  quantity_variance_pct: string | null;
  tolerance_pct: string;
  over_tolerance: boolean;
  shipped_fabric_meters: string | null;
  consumption_per_garment: string | null;
  producible_garments: number | null;
  garment_variance: number | null;
  can_cover_order: boolean | null;
}

export interface InvoiceApproval {
  id: string;
  invoice_number: string;
  invoice_type: string;
  invoice_type_display: string;
  purchase_order: string | null;
  po_number: string | null;
  buyer_name: string | null;
  invoice_date: string | null;
  quantity: string;
  unit_price: string;
  amount: string;
  currency: string | null;
  currency_code: string | null;
  currency_name: string | null;
  status: string;
  status_display: string;
  rejection_reason: string;
  debit_note: string | null;
  debit_number: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_by_name: string | null;
  rejected_at: string | null;
  is_match: boolean;
  over_tolerance: boolean;
  auto_approval_eligible: boolean;
  tolerance_pct: string;
  quantity_variance_pct: string | null;
  match_status: string;
  mismatch_reasons: string[];
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceApprovalDashboard {
  total: number;
  by_status: Record<string, number>;
  over_tolerance: number;
  auto_approval_eligible: number;
}

export const commercialApi = {
  getLCs: (params?: Record<string, string>) =>
    api.get<{ results: LC[]; count: number }>('/commercial/lcs/', { params }),
  getLC: (id: string) =>
    api.get<LC>(`/commercial/lcs/${id}/`),
  createLC: (data: Record<string, unknown>) =>
    api.post<LC>('/commercial/lcs/', data),
  updateLC: (id: string, data: Record<string, unknown>) =>
    api.patch<LC>(`/commercial/lcs/${id}/`, data),
  deleteLC: (id: string) =>
    api.delete(`/commercial/lcs/${id}/`),
  approveLC: (id: string) =>
    api.post(`/commercial/lcs/${id}/approve/`),
  acceptLC: (id: string) =>
    api.post(`/commercial/lcs/${id}/accept/`),
  cancelLC: (id: string) =>
    api.post(`/commercial/lcs/${id}/cancel/`),
  getLCUtilization: (id: string) =>
    api.get(`/commercial/lcs/${id}/utilization/`),
  exportLC: (id: string) =>
    api.get(`/commercial/lcs/${id}/export/`, { responseType: 'blob' }),
  getLCDashboard: () =>
    api.get('/commercial/lcs/dashboard/'),
  getAmendments: (params?: Record<string, string>) =>
    api.get<{ results: LCAmendment[]; count: number }>('/commercial/lc-amendments/', { params }),
  createAmendment: (data: Record<string, unknown>) =>
    api.post('/commercial/lc-amendments/', data),
  approveAmendment: (id: string) =>
    api.post(`/commercial/lc-amendments/${id}/approve/`),
  rejectAmendment: (id: string) =>
    api.post(`/commercial/lc-amendments/${id}/reject/`),
  getBanks: (params?: Record<string, string>) =>
    api.get<{ results: Bank[]; count: number }>('/commercial/banks/', { params }),
  getBank: (id: string) =>
    api.get<Bank>(`/commercial/banks/${id}/`),
  createBank: (data: Record<string, unknown>) =>
    api.post<Bank>('/commercial/banks/', data),
  updateBank: (id: string, data: Record<string, unknown>) =>
    api.patch<Bank>(`/commercial/banks/${id}/`, data),
  deleteBank: (id: string) =>
    api.delete(`/commercial/banks/${id}/`),
  // Proforma Invoices
  getPIs: (params?: Record<string, string>) =>
    api.get<{ results: ProformaInvoice[]; count: number }>('/commercial/proforma-invoices/', { params }),
  getPI: (id: string) => api.get<ProformaInvoice>(`/commercial/proforma-invoices/${id}/`),
  createPI: (data: Record<string, unknown>) => api.post('/commercial/proforma-invoices/', data),
  updatePI: (id: string, data: Record<string, unknown>) => api.patch(`/commercial/proforma-invoices/${id}/`, data),
  deletePI: (id: string) => api.delete(`/commercial/proforma-invoices/${id}/`),
  sendPI: (id: string) => api.post(`/commercial/proforma-invoices/${id}/send/`),
  acceptPI: (id: string) => api.post(`/commercial/proforma-invoices/${id}/accept/`),
  rejectPI: (id: string) => api.post(`/commercial/proforma-invoices/${id}/reject/`),
  exportPI_pdf: (id: string) => api.get(`/commercial/proforma-invoices/${id}/export_pdf/`, { responseType: 'blob' }),
  // Sales Contracts
  getSCs: (params?: Record<string, string>) =>
    api.get<{ results: SalesContract[]; count: number }>('/commercial/sales-contracts/', { params }),
  getSC: (id: string) => api.get<SalesContract>(`/commercial/sales-contracts/${id}/`),
  createSC: (data: Record<string, unknown>) => api.post('/commercial/sales-contracts/', data),
  updateSC: (id: string, data: Record<string, unknown>) => api.patch(`/commercial/sales-contracts/${id}/`, data),
  deleteSC: (id: string) => api.delete(`/commercial/sales-contracts/${id}/`),
  exportSC_pdf: (id: string) => api.get(`/commercial/sales-contracts/${id}/export_pdf/`, { responseType: 'blob' }),
  // Sales Confirmations
  getSalesConfirmations: (params?: Record<string, string>) =>
    api.get<{ results: SalesConfirmation[]; count: number }>('/commercial/sales-confirmations/', { params }),
  getSalesConfirmation: (id: string) =>
    api.get<SalesConfirmation>(`/commercial/sales-confirmations/${id}/`),
  createSalesConfirmation: (data: Record<string, unknown>) =>
    api.post('/commercial/sales-confirmations/', data),
  updateSalesConfirmation: (id: string, data: Record<string, unknown>) =>
    api.patch(`/commercial/sales-confirmations/${id}/`, data),
  deleteSalesConfirmation: (id: string) =>
    api.delete(`/commercial/sales-confirmations/${id}/`),
  sendSalesConfirmation: (id: string) =>
    api.post(`/commercial/sales-confirmations/${id}/send/`),
  disputeSalesConfirmation: (id: string, reason: string) =>
    api.post(`/commercial/sales-confirmations/${id}/dispute/`, { dispute_reason: reason }),
  acceptSalesConfirmation: (id: string) =>
    api.post(`/commercial/sales-confirmations/${id}/accept/`),
  autoAcceptSalesConfirmations: () =>
    api.post<{ auto_accepted: number }>('/commercial/sales-confirmations/auto_accept/'),
  getSalesConfirmationsDashboard: () =>
    api.get<SalesConfirmationDashboard>('/commercial/sales-confirmations/dashboard/'),
  // Debit Notes (RQ-034 GC-023)
  getDebitNotes: (params?: Record<string, string>) =>
    api.get<{ results: DebitNote[]; count: number }>('/commercial/debit-notes/', { params }),
  getDebitNote: (id: string) =>
    api.get<DebitNote>(`/commercial/debit-notes/${id}/`),
  createDebitNote: (data: Record<string, unknown>) =>
    api.post('/commercial/debit-notes/', data),
  updateDebitNote: (id: string, data: Record<string, unknown>) =>
    api.patch(`/commercial/debit-notes/${id}/`, data),
  deleteDebitNote: (id: string) =>
    api.delete(`/commercial/debit-notes/${id}/`),
  issueDebitNote: (id: string) =>
    api.post<DebitNote>(`/commercial/debit-notes/${id}/issue/`),
  markDebitNotePaid: (id: string) =>
    api.post<DebitNote>(`/commercial/debit-notes/${id}/mark_paid/`),
  getPendingOverTolerance: () =>
    api.get<{ count: number; results: OverToleranceCandidate[] }>('/commercial/debit-notes/pending_over_tolerance/'),
  getDebitNotesDashboard: () =>
    api.get<DebitNoteDashboard>('/commercial/debit-notes/dashboard/'),
  exportDebitNotes: () =>
    api.get('/commercial/debit-notes/export/', { responseType: 'blob' }),
  getInvoiceApprovals: (params?: Record<string, string>) =>
    api.get<{ results: InvoiceApproval[]; count: number }>('/commercial/invoice-approvals/', { params }),
  getInvoiceApproval: (id: string) =>
    api.get<InvoiceApproval>(`/commercial/invoice-approvals/${id}/`),
  createInvoiceApproval: (data: Record<string, unknown>) =>
    api.post<InvoiceApproval>('/commercial/invoice-approvals/', data),
  updateInvoiceApproval: (id: string, data: Record<string, unknown>) =>
    api.patch<InvoiceApproval>(`/commercial/invoice-approvals/${id}/`, data),
  deleteInvoiceApproval: (id: string) =>
    api.delete(`/commercial/invoice-approvals/${id}/`),
  approveInvoice: (id: string) =>
    api.post<InvoiceApproval>(`/commercial/invoice-approvals/${id}/approve/`),
  rejectInvoice: (id: string, rejection_reason: string) =>
    api.post<InvoiceApproval>(`/commercial/invoice-approvals/${id}/reject/`, { rejection_reason }),
  raiseDebitForInvoice: (id: string) =>
    api.post<DebitNote>(`/commercial/invoice-approvals/${id}/raise_debit/`),
  getInvoiceApprovalsDashboard: () =>
    api.get<InvoiceApprovalDashboard>('/commercial/invoice-approvals/dashboard/'),
  exportInvoiceApprovals: () =>
    api.get('/commercial/invoice-approvals/export/', { responseType: 'blob' }),
};

// ── RQ-028 Order Manager Dashboard (GC-019) ─────────────────────────────────
export interface OrderManagerProductionTile {
  total: number;
  open: number;
  overdue: number;
  completed: number;
}

export interface OrderManagerTechnicalTile {
  fit_stage: string | null;
  fit_stage_label: string;
}

export interface OrderManagerLogisticsTile {
  shipments_total: number;
  delivered: number;
  in_transit: number;
  delivered_pct: number;
}

export interface OrderManagerDocketsTile {
  total: number;
  final_raised: number;
  over_limit_pending: number;
}

export interface OrderManagerReconciliationTile {
  pending_debits: number;
  shortage_units: string;
}

export interface OrderManagerScheduleTile {
  items_total: number;
  items_delivered: number;
  delivered_pct: number;
}

export interface OrderManagerGoldSealTile {
  status: string | null;
  status_label: string;
}

export interface OrderManagerRisk {
  level: 'ok' | 'watch' | 'risk';
  flags: string[];
}

export interface OrderManagerRow {
  po_id: string;
  po_number: string;
  file_number: string | null;
  buyer_name: string | null;
  style_number: string | null;
  delivery_date: string | null;
  quantity: number;
  status: string;
  status_label: string;
  production: OrderManagerProductionTile;
  technical: OrderManagerTechnicalTile;
  logistics: OrderManagerLogisticsTile;
  dockets: OrderManagerDocketsTile;
  reconciliation: OrderManagerReconciliationTile;
  schedule: OrderManagerScheduleTile;
  gold_seal: OrderManagerGoldSealTile;
  risk: OrderManagerRisk;
}

export interface OrderManagerSummary {
  total_orders: number;
  open_orders: number;
  delivered_orders: number;
  ok: number;
  watch: number;
  risk: number;
  pending_debits: number;
  overdue_production: number;
}

export interface OrderManagerDashboard {
  summary: OrderManagerSummary;
  results: OrderManagerRow[];
}

export const merchApi = {
  getStyles: (params?: Record<string, string>) =>
    api.get<{ results: Style[]; count: number }>('/merchandising/styles/', { params }),

  getStyle: (id: string) =>
    api.get<Style>(`/merchandising/styles/${id}/`),

  createStyle: (data: Record<string, unknown>) =>
    api.post<Style>('/merchandising/styles/', data),

  updateStyle: (id: string, data: Record<string, unknown>) =>
    api.patch<Style>(`/merchandising/styles/${id}/`, data),

  deleteStyle: (id: string) =>
    api.delete(`/merchandising/styles/${id}/`),

  transitionStyle: (id: string, newStatus: string) =>
    api.post(`/merchandising/styles/${id}/transition/`, { status: newStatus }),

  getStyleVersions: (styleId: string) =>
    api.get<StyleVersion[]>(`/merchandising/styles/${styleId}/versions/`),

  getAllStyleVersions: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<StyleVersion>>('/merchandising/style-versions/', { params }),

  createStyleVersion: (styleId: string, data: { revision_notes: string; status?: string }) =>
    api.post<StyleVersion>('/merchandising/style-versions/', { style: styleId, ...data }),

  getStyleFileOpenings: (styleId: string) =>
    api.get<FileOpening[]>(`/merchandising/styles/${styleId}/file_openings/`),

  getStylePOs: (styleId: string) =>
    api.get<PurchaseOrder[]>(`/merchandising/styles/${styleId}/purchase_orders/`),

  getStyleBOMs: (styleId: string) =>
    api.get<BOM[]>(`/merchandising/styles/${styleId}/boms/`),

  getStyleItems: (styleId: string) =>
    api.get<StyleItem[]>(`/merchandising/styles/${styleId}/items/`),

  getStyleDesignImages: (styleId: string) =>
    api.get<DesignImage[]>(`/merchandising/styles/${styleId}/design_images/`),

  getStyleTechPacks: (styleId: string) =>
    api.get<StyleTechPack[]>(`/merchandising/styles/${styleId}/tech_packs/`),

  getDesignImages: (params?: Record<string, string>) =>
    api.get<{ results: DesignImage[]; count: number }>('/merchandising/design-images/', { params }),

  createDesignImage: (data: FormData) =>
    api.post<DesignImage>('/merchandising/design-images/', data,
      { headers: { 'Content-Type': 'multipart/form-data' } }),

  updateDesignImage: (id: string, data: Record<string, unknown> | FormData) =>
    api.patch<DesignImage>(`/merchandising/design-images/${id}/`, data,
      data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined),

  deleteDesignImage: (id: string) =>
    api.delete(`/merchandising/design-images/${id}/`),

  setMainDesignImage: (id: string) =>
    api.post<{ id: string; is_main: boolean }>(`/merchandising/design-images/${id}/set_main/`),

  createStyleItem: (data: Record<string, unknown>) =>
    api.post<StyleItem>('/merchandising/style-items/', data),

  updateStyleItem: (id: string, data: Record<string, unknown>) =>
    api.patch<StyleItem>(`/merchandising/style-items/${id}/`, data),

  deleteStyleItem: (id: string) =>
    api.delete(`/merchandising/style-items/${id}/`),

  getFileOpenings: (params?: Record<string, string>) =>
    api.get<{ results: FileOpening[]; count: number }>('/merchandising/file-openings/', { params }),

  getFileOpening: (id: string) =>
    api.get<FileOpening>(`/merchandising/file-openings/${id}/`),

  createFileOpening: (data: Record<string, unknown>) =>
    api.post<FileOpening>('/merchandising/file-openings/', data),

  updateFileOpening: (id: string, data: Record<string, unknown>) =>
    api.patch<FileOpening>(`/merchandising/file-openings/${id}/`, data),

  deleteFileOpening: (id: string) =>
    api.delete(`/merchandising/file-openings/${id}/`),

  markQuickLead: (id: string) =>
    api.post<FileOpening>(`/merchandising/file-openings/${id}/quick_lead/`),

  unmarkQuickLead: (id: string) =>
    api.post<FileOpening>(`/merchandising/file-openings/${id}/unmark_quick_lead/`),

  agreeQuickLead: (id: string, party: string) =>
    api.post<FileOpening>(`/merchandising/file-openings/${id}/agree_quick_lead/`, { party }),

  getQuickLeadStatus: (id: string) =>
    api.get<{ is_quick_lead: boolean; agreed_by: string[]; required_parties: string[]; agreement_complete: boolean; missing_agreements: string[] }>(`/merchandising/file-openings/${id}/quick_lead_status/`),

  createRepeat: (id: string) =>
    api.post<FileOpening>(`/merchandising/file-openings/${id}/create_repeat/`),

  approveRepeat: (id: string, party: string) =>
    api.post<FileOpening>(`/merchandising/file-openings/${id}/approve_repeat/`, { party }),

  getRepeatStatus: (id: string) =>
    api.get<{ is_repeat: boolean; original_fn: string | null; original_fn_number: string; approved_by: string[]; required_parties: string[]; approval_complete: boolean; missing_approvals: string[] }>(`/merchandising/file-openings/${id}/repeat_status/`),

  markAsStockFabric: (id: string, data: { stock_fabric_description: string; total_meters: string | number }) =>
    api.post<FileOpening>(`/merchandising/file-openings/${id}/mark_as_stock_fabric/`, data),

  allocateStock: (id: string, data: { allocated_to: string; meters: string | number; notes?: string }) =>
    api.post<FileOpening>(`/merchandising/file-openings/${id}/allocate_stock/`, data),

  getStockStatus: (id: string) =>
    api.get<{ is_stock_fabric: boolean; stock_fabric_description: string; total_meters: string | null; allocated_meters: string; stock_balance_meters: string; allocations: StockFabricAllocation[] }>(`/merchandising/file-openings/${id}/stock_status/`),

  getFileOpeningPOs: (foId: string) =>
    api.get<PurchaseOrder[]>(`/merchandising/file-openings/${foId}/purchase_orders/`),

  getPO_TA: (poId: string) =>
    api.get<{ id: string; status: string | null; delivery_date: string | null; milestones: TAMilestone[] }>(`/merchandising/purchase-orders/${poId}/ta/`),

  createPO_TAMilestone: (poId: string, data: Record<string, unknown>) =>
    api.post<TAMilestone>(`/merchandising/purchase-orders/${poId}/create_ta_milestone/`, data),

  bulkCreatePO_TAMilestones: (poId: string, milestones: Record<string, unknown>[]) =>
    api.post<{ created: number; milestones: TAMilestone[] }>(`/merchandising/purchase-orders/${poId}/bulk_create_ta_milestones/`, { milestones }),

  getTATemplates: () =>
    api.get<{ id: string; name: string; description: string; milestones: { name: string; description: string; offset_days: number; is_critical: boolean }[] }[]>('/merchandising/purchase-orders/ta_templates/'),

  getPOJourney: (poId: string) =>
    api.get<{
      steps: {
        key: string; label: string; status: string; id: string | null; code: string | null;
        name?: string; quantity?: number; total_value?: string;
        file_openings_count?: number; purchase_orders_count?: number;
        items_count?: number; total_cost?: string; margin?: string;
        milestones_total?: number; milestones_completed?: number;
        plans_count?: number; inspections_count?: number; shipments_count?: number;
        pi_status?: string | null; sc_status?: string | null; lc_status?: string | null;
      }[];
      current_step: string;
      completion_percentage: number;
    }>(`/merchandising/purchase-orders/${poId}/journey/`),

  getPO_BOMCosting: (poId: string) =>
    api.get<{
      bom: {
        id: string; name: string; version: number; status: string;
        style_number: string | null; item_count: number;
        categories: { fabric: number; trim: number; accessories: number; overhead: number; total: number };
      } | null;
      costings: Costing[];
    }>(`/merchandising/purchase-orders/${poId}/bom_costing/`),

  createPO_BOM: (poId: string, data: { name?: string; items?: Record<string, unknown>[] }) =>
    api.post<BOM>(`/merchandising/purchase-orders/${poId}/create_bom/`, data),

  getPOs: (params?: Record<string, string>) =>
    api.get<{ results: PurchaseOrder[]; count: number }>('/merchandising/purchase-orders/', { params }),

  getOrderManager: (params?: Record<string, string>) =>
    api.get<OrderManagerDashboard>('/merchandising/purchase-orders/order_manager/', { params }),

  importPOs: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ success: number; errors: { row: number; error: string }[]; created_pos: { po_number: string; buyer: string; factory: string; items_count: number; total_value: string }[] }>(
      '/merchandising/purchase-orders/bulk_import/', formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  },

  getPO: (id: string) =>
    api.get<PurchaseOrder>(`/merchandising/purchase-orders/${id}/`),

  createPO: (data: Record<string, unknown>) =>
    api.post<PurchaseOrder>('/merchandising/purchase-orders/', data),

  updatePO: (id: string, data: Record<string, unknown>) =>
    api.patch<PurchaseOrder>(`/merchandising/purchase-orders/${id}/`, data),

  deletePO: (id: string) =>
    api.delete(`/merchandising/purchase-orders/${id}/`),

  transitionPO: (id: string, newStatus: string) =>
    api.post(`/merchandising/purchase-orders/${id}/transition/`, { status: newStatus }),

  getPOTransitionInfo: (id: string) =>
    api.get<{
      current_status: string;
      transitions: Record<string, {
        label: string;
        description?: string;
        effects?: { type: string; text: string }[];
        warnings?: string[];
      }>;
    }>(`/merchandising/purchase-orders/${id}/transition_info/`),

  getPOItems: (poId: string) =>
    api.get(`/merchandising/purchase-orders/${poId}/items/`),

  exportPO: (id: string) =>
    api.get(`/merchandising/purchase-orders/${id}/export/`, { responseType: 'blob' }),

  generatePI: (poId: string) =>
    api.post<{ pi_id: string; pi_number: string; status: string }>(`/merchandising/purchase-orders/${poId}/generate_pi/`),

  generateSC: (poId: string) =>
    api.post<{ sc_id: string; contract_number: string; status: string }>(`/merchandising/purchase-orders/${poId}/generate_sc/`),

  getPOLinked: (id: string) =>
    api.get<{
      style: { id: string; style_number: string; name: string; status: string; url: string } | null;
      file_opening: { id: string; file_number: string; status: string; url: string } | null;
      ta: { id: string; status: string; completed_milestones: number; total_milestones: number; url: string } | null;
      bom: { id: string; name: string; version: number; status: string; item_count: number; url: string } | null;
      costing: { id: string; version: number; status: string; total_cost: number; url: string } | null;
      production_plan: { id: string; status: string; quantity: number; start_date: string | null; end_date: string | null; url: string } | null;
      quality_inspections: { id: string; inspection_type: string; status: string; inspection_date: string; url: string }[];
      proforma_invoice: { id: string; pi_number: string; status: string; amount: number; url: string } | null;
      sales_contract: { id: string; contract_number: string; status: string; total_amount: number; url: string } | null;
    }>(`/merchandising/purchase-orders/${id}/linked/`),

  getPOTrail: (id: string) =>
    api.get<{
      po_number: string;
      total_events: number;
      events: { date: string; title: string; description: string; color: string; icon: string; sort_key: string }[];
    }>(`/merchandising/purchase-orders/${id}/trail/`),

  getPOProfit: (id: string) =>
    api.get<{
      po_number: string;
      quantity: number;
      unit_price: number;
      revenue: number;
      revenue_per_unit: number;
      revenue_source: string;
      cost_breakdown: { fabric: number; trim: number; cm: number; overhead: number; total: number; version: number; status: string } | null;
      total_cost: number;
      cost_per_unit: number;
      profit: number;
      margin_percent: number;
    }>(`/merchandising/purchase-orders/${id}/profit/`),

  getPOAmendments: (poId: string) =>
    api.get(`/merchandising/purchase-orders/${poId}/amendments/`),

  createPOItem: (data: Record<string, unknown>) =>
    api.post('/merchandising/po-items/', data),

  updatePOItem: (id: string, data: Record<string, unknown>) =>
    api.patch(`/merchandising/po-items/${id}/`, data),

  deletePOItem: (id: string) =>
    api.delete(`/merchandising/po-items/${id}/`),

  createAmendment: (data: Record<string, unknown>) =>
    api.post('/merchandising/po-amendments/', data),

  approveAmendment: (id: string) =>
    api.post(`/merchandising/po-amendments/${id}/approve/`),

  rejectAmendment: (id: string) =>
    api.post(`/merchandising/po-amendments/${id}/reject/`),

  getBOMs: (params?: Record<string, string>) =>
    api.get<{ results: BOM[]; count: number }>('/merchandising/boms/', { params }),

  getBOM: (id: string) =>
    api.get<BOM>(`/merchandising/boms/${id}/`),

  createBOM: (data: Record<string, unknown>) =>
    api.post<BOM>('/merchandising/boms/', data),

  updateBOM: (id: string, data: Record<string, unknown>) =>
    api.patch<BOM>(`/merchandising/boms/${id}/`, data),

  deleteBOM: (id: string) =>
    api.delete(`/merchandising/boms/${id}/`),

  getBOMItems: (bomId: string) =>
    api.get(`/merchandising/boms/${bomId}/items/`),

  copyTrims: (bomId: string, data: { source_bom: string; overwrite?: boolean; selective?: 'all' | 'detail' | 'washcare' }) =>
    api.post(`/merchandising/boms/${bomId}/copy-trims/`, data),

  activateBOM: (id: string) =>
    api.post(`/merchandising/boms/${id}/activate/`),

  createBOMItem: (data: Record<string, unknown>) =>
    api.post('/merchandising/bom-items/', data),

  updateBOMItem: (id: string, data: Record<string, unknown>) =>
    api.patch(`/merchandising/bom-items/${id}/`, data),

  deleteBOMItem: (id: string) =>
    api.delete(`/merchandising/bom-items/${id}/`),

  getFitSpecifications: (params?: Record<string, string>) =>
    api.get<{ results: FitSpecification[]; count: number }>('/merchandising/fit-specifications/', { params }),

  createFitSpecification: (data: Record<string, unknown>) =>
    api.post<FitSpecification>('/merchandising/fit-specifications/', data),

  updateFitSpecification: (id: string, data: Record<string, unknown>) =>
    api.patch<FitSpecification>(`/merchandising/fit-specifications/${id}/`, data),

  createFitImage: (data: FormData) =>
    api.post<FitImage>('/merchandising/fit-images/', data),

  deleteFitImage: (id: string) =>
    api.delete(`/merchandising/fit-images/${id}/`),

  updateFitImage: (id: string, data: Record<string, unknown>) =>
    api.patch<FitImage>(`/merchandising/fit-images/${id}/`, data),

  createDesignSheetJob: (designSheetId: string, data: Record<string, unknown>) =>
    api.post<DesignJobRequest>(`/merchandising/design-sheets/${designSheetId}/create-job/`, data),

  copyFitSpec: (targetId: string, data: Record<string, unknown>) =>
    api.post<FitSpecification>(`/merchandising/design-sheets/${targetId}/copy-fit-spec/`, data),

  getDesignJobRequests: (params?: Record<string, string>) =>
    api.get<{ results: DesignJobRequest[]; count: number }>('/merchandising/design-job-requests/', { params }),

  updateDesignJobRequest: (id: string, data: Record<string, unknown>) =>
    api.patch<DesignJobRequest>(`/merchandising/design-job-requests/${id}/`, data),

  getCostings: (params?: Record<string, string>) =>
    api.get<{ results: Costing[]; count: number }>('/merchandising/costings/', { params }),

  getCosting: (id: string) =>
    api.get<Costing>(`/merchandising/costings/${id}/`),

  createCosting: (data: Record<string, unknown>) =>
    api.post<Costing>('/merchandising/costings/', data),
  updateCosting: (id: string, data: Record<string, unknown>) =>
    api.patch<Costing>(`/merchandising/costings/${id}/`, data),

  approveCosting: (id: string) =>
    api.post(`/merchandising/costings/${id}/approve/`),

  rejectCosting: (id: string) =>
    api.post(`/merchandising/costings/${id}/reject/`),

  getTAs: (params?: Record<string, string>) =>
    api.get<{ results: TA[]; count: number }>('/merchandising/tas/', { params }),

  getTA: (id: string) =>
    api.get<TA>(`/merchandising/tas/${id}/`),

  createTAMilestone: (data: Record<string, unknown>) =>
    api.post('/merchandising/ta-milestones/', data),

  updateTAMilestone: (id: string, data: Record<string, unknown>) =>
    api.patch(`/merchandising/ta-milestones/${id}/`, data),

  getTAAlerts: () => api.get('/merchandising/tas/alerts/'),
  getTACalendarData: (params?: Record<string, string>) =>
    api.get('/merchandising/tas/calendar_data/', { params }),
  getTAHeatmap: (params?: Record<string, string>) =>
    api.get('/merchandising/tas/heatmap/', { params }),
  generateCostingFromBOM: (data: { bom_id: string; purchase_order_id: string }) =>
    api.post('/merchandising/costings/generate_from_bom/', data),
  compareCostings: (ids: string[]) => api.post('/merchandising/costings/compare/', { ids }),
  exportCosting: (id: string) => api.get(`/merchandising/costings/${id}/export/`, { responseType: 'blob' }),
  setLiveCosting: (id: string) => api.post(`/merchandising/costings/${id}/set_live/`),
  confirmCosting: (id: string) => api.post(`/merchandising/costings/${id}/confirm/`),
  patternAmendmentCosting: (id: string, note: string) =>
    api.post<Costing>(`/merchandising/costings/${id}/pattern_amendment/`, { note }),
  getCostingLines: (params?: Record<string, string>) =>
    api.get<{ results: CostingLine[]; count: number }>('/merchandising/costing-lines/', { params }),
  createCostingLine: (data: Record<string, unknown>) =>
    api.post<CostingLine>('/merchandising/costing-lines/', data),
  approveCostingLine: (id: string) =>
    api.post<CostingLine>(`/merchandising/costing-lines/${id}/approve/`),

  // Hits (GC-010) — nested under purchase order
  getPOHits: (poId: string, params?: Record<string, string>) =>
    api.get<{ results: Hit[]; count: number }>(`/merchandising/purchase-orders/${poId}/hits/`, { params }),
  createPOHit: (poId: string, data: Record<string, unknown>) =>
    api.post<Hit>(`/merchandising/purchase-orders/${poId}/hits/`, data),
  updatePOHit: (poId: string, id: string, data: Record<string, unknown>) =>
    api.patch<Hit>(`/merchandising/purchase-orders/${poId}/hits/${id}/`, data),
  deletePOHit: (poId: string, id: string) =>
    api.delete(`/merchandising/purchase-orders/${poId}/hits/${id}/`),

  // Fit Specs (GC-011 / GC-012)
  getFitSpecs: (params?: Record<string, string>) =>
    api.get<{ results: FitSpec[]; count: number }>('/merchandising/fit-specs/', { params }),
  getFitSpec: (id: string) => api.get<FitSpec>(`/merchandising/fit-specs/${id}/`),
  createFitSpec: (data: Record<string, unknown>) => api.post<FitSpec>('/merchandising/fit-specs/', data),
  updateFitSpec: (id: string, data: Record<string, unknown>) => api.patch<FitSpec>(`/merchandising/fit-specs/${id}/`, data),
  deleteFitSpec: (id: string) => api.delete(`/merchandising/fit-specs/${id}/`),
  setCurrentFitSpec: (id: string) => api.post(`/merchandising/fit-specs/${id}/set-current/`),
  copyFitSpecFromOrder: (data: { source_order: string; target_order: string }) =>
    api.post<FitSpec>('/merchandising/fit-specs/copy-from-order/', data),

  // Job Requests (GC-013 / GC-014)
  getJobRequests: (params?: Record<string, string>) =>
    api.get<{ results: JobRequest[]; count: number }>('/merchandising/job-requests/', { params }),
  getJobRequest: (id: string) => api.get<JobRequest>(`/merchandising/job-requests/${id}/`),
  createJobRequest: (data: Record<string, unknown>) => api.post<JobRequest>('/merchandising/job-requests/', data),
  updateJobRequest: (id: string, data: Record<string, unknown>) => api.patch<JobRequest>(`/merchandising/job-requests/${id}/`, data),
  deleteJobRequest: (id: string) => api.delete(`/merchandising/job-requests/${id}/`),
  getJobDashboard: () => api.get<JobDashboard>('/merchandising/job-requests/dashboard/'),

  getUnsoldAnalysis: (params?: Record<string, string>) =>
    api.get<UnsoldAnalysisResponse>('/merchandising/job-requests/unsold_analysis/', { params }),
  getJobQueue: (params?: Record<string, string>) =>
    api.get<{ results: JobRequest[]; count: number }>('/merchandising/job-requests/queue/', { params }),

  // Tech Packs (RQ-036 / RQ-040)
  uploadTechPack: (id: string, file: File) => {
    const fd = new FormData();
    fd.append('tech_pack', file);
    return api.post<{ tech_pack: string }>(`/merchandising/styles/${id}/upload-tech-pack/`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  extractTechPack: (file: File, buyer: string) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('buyer', buyer);
    return api.post<TechPackExtractResult>('/merchandising/styles/techpack/extract/', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getTechPackExcel: (techpackId: string) =>
    api.get(`/merchandising/styles/techpack/excel/`, {
      params: { techpack: techpackId },
      responseType: 'blob',
    }),
  importTechPack: (file: File, buyer: string, techpackId?: string) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('buyer', buyer);
    if (techpackId) fd.append('techpack', techpackId);
    return api.post<TechPackImportResult>('/merchandising/styles/techpack/import/', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  // Design Sheet - Sketch Upload
  uploadTechPackSketch: (techpackId: string, file: File) => {
    const fd = new FormData();
    fd.append('sketch_image', file);
    return api.put<{ sketch_image_url: string; message: string }>(
      `/merchandising/styles/techpack/${techpackId}/sketch/`,
      fd,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },
  // Design Sheet - Notes Update
  updateTechPackNotes: (techpackId: string, data: { note?: string; notes_initials?: string }) =>
    api.put<{ note: string; notes_initials: string; notes_date: string; message: string }>(
      `/merchandising/styles/techpack/${techpackId}/notes/`,
      data
    ),
  // Design Sheets
  getDesignSheets: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<DesignSheet>>('/merchandising/design-sheets/', { params }),
  getDesignSheet: (id: string) =>
    api.get<DesignSheet>(`/merchandising/design-sheets/${id}/`),
  transitionDesignSheet: (id: string, status: string) =>
    api.post<{ status: string; message: string }>(`/merchandising/design-sheets/${id}/transition/`, { status }),
  saveDesignSheetAnnotations: (id: string, annotations: SketchAnnotation[]) =>
    api.patch<{ annotations: SketchAnnotation[] }>(`/merchandising/design-sheets/${id}/annotations/`, { annotations }),
};

export interface TechPackExtractResult {
  id: string;
  techpack_number: string;
  status: string;
  data: Record<string, unknown>;
  excel_download_url: string;
}

export interface TechPackImportResult {
  style: { id: string; style_number: string; name: string };
  style_version: { id: string; version_number: string };
  bom: { id: string; name: string; version: string };
  created: boolean;
  style_items_created: number;
  bom_items_created: number;
  design_sheet: { id: string; status: string } | null;
}

export interface StyleTechPack {
  id: string;
  techpack_number: string;
  style: string;
  status: string;
  source_pdf_url: string | null;
  excel_url: string | null;
  bom_items_count: number;
  issue_date: string | null;
  block: string;
  based_on: string;
  customer: string;
  style_number: string;
  size: string;
  designer: string;
  pattern_cutter: string;
  issuer: string;
  cloth_code: string;
  length: string;
  sketch: string;
  description: string;
  note: string;
  errors: string[];
  warnings: string[];
  created_at: string;
  updated_at: string;
}

export interface FitImage {
  id: string;
  fit_spec: string;
  image: string;
  caption: string;
  order: number;
  created_at: string;
}

export interface FitSpecification {
  id: string;
  design_sheet: string;
  fit_number: string;
  fit_date: string | null;
  description: string;
  notes: string;
  is_selected: boolean;
  images: FitImage[];
  created_at: string;
}

export interface DesignJobRequest {
  id: string;
  design_sheet: string;
  design_sheet_number: string;
  job_type: string;
  required_by: string | null;
  work_location: string;
  no_of_garments: number | null;
  allocated_to: string | null;
  allocated_to_name: string | null;
  notes: string;
  status: string;
  created_at: string;
}

export interface SketchAnnotation {
  id: string;
  x: number;
  y: number;
  text: string;
}

export interface DesignSheet {
  id: string;
  tech_pack: string;
  status: string;
  style_code: string;
  style_id?: string;
  season?: string;
  buyer_name: string;
  file_number: string;
  sketch_url: string | null;
  issue_date: string | null;
  block: string;
  based_on: string;
  customer: string;
  style_number: string;
  size: string;
  designer: string;
  pattern_cutter: string;
  issuer: string;
  cloth_code: string;
  length: string;
  sketch: string;
  description: string;
  note: string;
  sketch_annotations: SketchAnnotation[];
  fit_specs: FitSpecification[];
  job_requests: DesignJobRequest[];
  material_items?: DesignSheetMaterialItem[];
  created_at: string;
  updated_at: string;
}

export type DesignSheetMaterialItem = {
  id: string;
  bom_id: string;
  type: string;
  description_code: string;
  location: string;
  supplier: string;
  colour: string;
  width_size: string;
  qty: number | null;
  match: string;
} & Record<string, unknown>;

export interface ProductionPlan {
  id: string;
  purchase_order: string;
  po_number: string;
  factory: string;
  factory_name: string;
  plan_date: string;
  start_date: string | null;
  end_date: string | null;
  quantity: number;
  status: string;
  remarks: string;
}

export interface DailyProduction {
  id: string;
  factory: string;
  factory_name: string;
  purchase_order: string;
  po_number: string;
  production_date: string;
  line_number: number | null;
  target_quantity: number | null;
  actual_quantity: number;
  passed_quantity: number;
  rejected_quantity: number;
  efficiency: number | null;
  dhu: number | null;
  manpower: number | null;
  working_hours: number | null;
  status: string;
}

export interface Inspection {
  id: string;
  purchase_order: string;
  po_number: string;
  factory: string;
  factory_name: string;
  inspection_type: string;
  inspection_date: string;
  inspector: string | null;
  aql_level: number;
  sample_size: number | null;
  passed_quantity: number;
  rejected_quantity: number;
  status: string;
  remarks: string;
  items: InspectionItem[];
}

export interface InspectionItem {
  id: string;
  inspection: string;
  defect_type: string;
  defect_count: number;
  severity: string;
  description: string;
}

export interface CorrectiveAction {
  id: string;
  inspection: string;
  title: string;
  description: string;
  root_cause: string | null;
  corrective_measure: string;
  preventive_measure: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  due_date: string;
  completed_date: string | null;
  priority: string;
  status: string;
  verified_by: string | null;
  verified_by_name: string | null;
  verified_at: string | null;
  created_at: string;
}

export interface GoldSeal {
  id: string;
  shipment: string;
  shipment_number: string;
  po_number: string;
  status: string;
  status_label: string;
  sent_date: string | null;
  approval_date: string | null;
  notes: string;
  created_at: string;
}

export interface ComplianceAuditChecklistItem {
  key: string;
  label: string;
}

export interface ComplianceAudit {
  id: string;
  purchase_order: string;
  po_number: string;
  buyer_name: string;
  po_status: string;
  style_number: string | null;
  delivery_date: string | null;
  week_start: string;
  efficiency_rate: string | null;
  fabric_paperwork_status: string;
  dockets_status: string;
  fabric_utilisation_status: string;
  factory_invoice_status: string;
  fabric_rating_status: string;
  recon_costed_vs_actual_status: string;
  final_hits_status: string;
  notes: string;
  mini_marker_efficiency_status: string;
  efficiency_met: boolean | null;
  fail_count: number;
  overall_pass: boolean;
  reviewed: boolean;
  warning_count: number;
  warning_label: string;
  created_at: string;
}

export interface ComplianceAuditPendingOrder {
  po_id: string;
  po_number: string;
  buyer_name: string;
  delivery_date: string;
}

export interface ComplianceAuditOverview {
  week_start: string;
  threshold: number;
  checklist: ComplianceAuditChecklistItem[];
  summary: {
    total_orders: number;
    audited: number;
    pass: number;
    fail: number;
    incomplete: number;
    pending: number;
  };
  pending_orders: ComplianceAuditPendingOrder[];
  results: ComplianceAudit[];
}

export interface FreightForwarder {
  id: string;
  name: string;
  code: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  country: string | null;
  notes: string | null;
  is_active: boolean;
}

export interface ShipmentDashboard {
  total_shipments: number;
  in_transit: number;
  at_port: number;
  delivered: number;
  etd_today: number;
  eta_today: number;
  overdue: number;
  status_counts?: Record<string, number>;
}

export interface Shipment {
  id: string;
  shipment_number: string;
  purchase_order: string;
  po_number: string;
  factory: string;
  factory_name: string;
  freight_forwarder: string | null;
  freight_forwarder_name: string | null;
  mode: string;
  status: string;
  booking_date: string | null;
  booking_reference: string;
  booking_ref_required_date: string | null;
  booking_ref_status: 'ok' | 'na' | 'due';
  etd: string | null;
  eta: string | null;
  atd: string | null;
  ata: string | null;
  port_of_loading: string | null;
  port_of_discharge: string | null;
  vessel_name: string | null;
  voyage_number: string | null;
  container_number: string | null;
  seal_number: string | null;
  container_size: string | null;
  quantity: number;
  weight_kg: number | null;
  cbm: number | null;
  marks: string | null;
  remarks: string | null;
  documents: ShippingDocument[];
  risk_level: string | null;
  risk_level_detail: { id: string; code: string; name: string; color: string } | null;
}

export interface ShippingDocument {
  id: string;
  shipment: string;
  document_type: string;
  document_number: string | null;
  document_date: string | null;
  file: string;
  notes: string | null;
}

export interface BookingScheduleItem {
  id: string;
  shipment: string;
  shipment_number: string;
  po_number: string;
  hit: string | null;
  hit_number: string | null;
  hit_colour: string | null;
  status: string;
  status_label: string;
  cut_qty: string;
  garments_ready_qty: string;
  ex_factory_date: string | null;
  ex_factory_notes: string;
  risk_level: string | null;
  risk_level_detail: { id: string; code: string; name: string; color: string } | null;
  week_ending: string;
  notes: string;
  is_at_risk: boolean;
  is_reconciliation_trigger: boolean;
}

export interface Docket {
  id: string;
  docket_number: string;
  shipment: string;
  shipment_number: string;
  po_number: string;
  contract_price: string | null;
  date_raised: string | null;
  delivery_date: string | null;
  total_fabric_meters: string | null;
  unused_fabric_meters: string | null;
  is_final: boolean;
  sales_notified: boolean;
  sales_notified_at: string | null;
  notes: string;
  requires_sales_notification: boolean;
  created_at: string;
}

export interface FinalHitReconciliation {
  id: string;
  shipment: string;
  shipment_number: string;
  po_number: string;
  schedule_item: string | null;
  schedule_item_id: string | null;
  docket_quantity: string;
  shipped_quantity: string;
  shortage_units: string;
  reasons_evident: boolean;
  notes: string;
  status: 'pending' | 'reconciled' | 'debited' | 'waived';
  status_label: string;
  reconciled_at: string | null;
  reconciled_by: string | null;
  reconciled_by_name: string | null;
  is_short: boolean;
  requires_debit: boolean;
  created_at: string;
}

export interface PaperworkComparisonRow {
  po_number: string;
  buyer_name: string;
  status: string;
  ordered_quantity: number;
  shipped_quantity: number;
  quantity_variance: number;
  quantity_variance_pct: number | null;
  tolerance_pct: number;
  over_tolerance: boolean;
  shipped_fabric_meters: number | null;
  consumption_per_garment: number | null;
  producible_garments: number | null;
  garment_variance: number | null;
  can_cover_order: boolean | null;
}

export interface PaperworkComparison {
  count: number;
  summary: {
    checked: number;
    over_tolerance_count: number;
    cannot_cover_count: number;
  };
  results: PaperworkComparisonRow[];
}

export const productionApi = {
  getPlans: (params?: Record<string, string>) =>
    api.get<{ results: ProductionPlan[]; count: number }>('/production/plans/', { params }),
  getPlan: (id: string) => api.get<ProductionPlan>(`/production/plans/${id}/`),
  createPlan: (data: Record<string, unknown>) => api.post<ProductionPlan>('/production/plans/', data),
  updatePlan: (id: string, data: Record<string, unknown>) => api.patch<ProductionPlan>(`/production/plans/${id}/`, data),
  deletePlan: (id: string) => api.delete(`/production/plans/${id}/`),
  startPlan: (id: string) => api.post(`/production/plans/${id}/start/`),
  completePlan: (id: string) => api.post(`/production/plans/${id}/complete/`),
  exportPlan: (id: string) => api.get(`/production/plans/${id}/export/`, { responseType: 'blob' }),
  getProductionDashboard: () => api.get('/production/plans/dashboard/'),
  getLinePerformance: (params?: Record<string, string>) =>
    api.get('/production/plans/line_performance/', { params }),

  getDailyReports: (params?: Record<string, string>) =>
    api.get<{ results: DailyProduction[]; count: number }>('/production/daily/', { params }),
  getDailyReport: (id: string) => api.get<DailyProduction>(`/production/daily/${id}/`),
  createDailyReport: (data: Record<string, unknown>) => api.post<DailyProduction>('/production/daily/', data),
  updateDailyReport: (id: string, data: Record<string, unknown>) => api.patch<DailyProduction>(`/production/daily/${id}/`, data),
  deleteDailyReport: (id: string) => api.delete(`/production/daily/${id}/`),
  approveDailyReport: (id: string) => api.post(`/production/daily/${id}/approve/`),
};

export const qualityApi = {
  getInspections: (params?: Record<string, string>) =>
    api.get<{ results: Inspection[]; count: number }>('/quality/inspections/', { params }),
  getInspection: (id: string) => api.get<Inspection>(`/quality/inspections/${id}/`),
  createInspection: (data: Record<string, unknown>) => api.post<Inspection>('/quality/inspections/', data),
  updateInspection: (id: string, data: Record<string, unknown>) => api.patch<Inspection>(`/quality/inspections/${id}/`, data),
  deleteInspection: (id: string) => api.delete(`/quality/inspections/${id}/`),
  startInspection: (id: string) => api.post(`/quality/inspections/${id}/start/`),
  completeInspection: (id: string) => api.post(`/quality/inspections/${id}/complete/`),
  exportInspection: (id: string) => api.get(`/quality/inspections/${id}/export/`, { responseType: 'blob' }),

  getInspectionItems: (params?: Record<string, string>) =>
    api.get('/quality/inspection-items/', { params }),
  createInspectionItem: (data: Record<string, unknown>) => api.post('/quality/inspection-items/', data),
  deleteInspectionItem: (id: string) => api.delete(`/quality/inspection-items/${id}/`),

  getCorrectiveActions: (params?: Record<string, string>) =>
    api.get<{ results: CorrectiveAction[]; count: number }>('/quality/corrective-actions/', { params }),
  getCorrectiveAction: (id: string) => api.get<CorrectiveAction>(`/quality/corrective-actions/${id}/`),
  createCorrectiveAction: (data: Record<string, unknown>) => api.post('/quality/corrective-actions/', data),
  updateCorrectiveAction: (id: string, data: Record<string, unknown>) => api.patch(`/quality/corrective-actions/${id}/`, data),
  deleteCorrectiveAction: (id: string) => api.delete(`/quality/corrective-actions/${id}/`),
  completeCorrectiveAction: (id: string) => api.post(`/quality/corrective-actions/${id}/complete/`),
  verifyCorrectiveAction: (id: string) => api.post(`/quality/corrective-actions/${id}/verify/`),
  closeCorrectiveAction: (id: string) => api.post(`/quality/corrective-actions/${id}/close/`),

  getGoldSeals: (params?: Record<string, string>) =>
    api.get<{ results: GoldSeal[]; count: number }>('/quality/gold-seals/', { params }),
  getGoldSeal: (id: string) => api.get<GoldSeal>(`/quality/gold-seals/${id}/`),
  createGoldSeal: (data: Record<string, unknown>) => api.post<GoldSeal>('/quality/gold-seals/', data),
  updateGoldSeal: (id: string, data: Record<string, unknown>) => api.patch<GoldSeal>(`/quality/gold-seals/${id}/`, data),
  deleteGoldSeal: (id: string) => api.delete(`/quality/gold-seals/${id}/`),
  sendGoldSeal: (id: string) => api.post<{ status: string; sent_date: string }>(`/quality/gold-seals/${id}/send/`),
  approveGoldSeal: (id: string) => api.post<{ status: string; approval_date: string }>(`/quality/gold-seals/${id}/approve/`),
  rejectGoldSeal: (id: string) => api.post<{ status: string }>(`/quality/gold-seals/${id}/reject/`),

  getComplianceAudits: (params?: Record<string, string>) =>
    api.get<{ results: ComplianceAudit[]; count: number }>('/quality/compliance-audits/', { params }),
  getComplianceAudit: (id: string) => api.get<ComplianceAudit>(`/quality/compliance-audits/${id}/`),
  createComplianceAudit: (data: Record<string, unknown>) => api.post<ComplianceAudit>('/quality/compliance-audits/', data),
  updateComplianceAudit: (id: string, data: Record<string, unknown>) => api.patch<ComplianceAudit>(`/quality/compliance-audits/${id}/`, data),
  deleteComplianceAudit: (id: string) => api.delete(`/quality/compliance-audits/${id}/`),
  getComplianceWeeklyOverview: (params?: Record<string, string>) =>
    api.get<ComplianceAuditOverview>('/quality/compliance-audits/weekly_overview/', { params }),
  exportComplianceAudits: (params?: Record<string, string>) =>
    api.get(`/quality/compliance-audits/export/`, { params, responseType: 'blob' }),
};

export const logisticsApi = {
  getShipments: (params?: Record<string, string>) =>
    api.get<{ results: Shipment[]; count: number }>('/logistics/shipments/', { params }),
  getShipment: (id: string) => api.get<Shipment>(`/logistics/shipments/${id}/`),
  createShipment: (data: Record<string, unknown>) => api.post('/logistics/shipments/', data),
  updateShipment: (id: string, data: Record<string, unknown>) => api.patch(`/logistics/shipments/${id}/`, data),
  deleteShipment: (id: string) => api.delete(`/logistics/shipments/${id}/`),
  transitionShipment: (id: string, status: string) => api.post(`/logistics/shipments/${id}/transition/`, { status }),
  exportShipment: (id: string) => api.get(`/logistics/shipments/${id}/export/`, { responseType: 'blob' }),
  getShipmentDashboard: () => api.get<ShipmentDashboard>('/logistics/shipments/dashboard/'),
  getBookingRefAlerts: () =>
    api.get<{ count: number; results: Shipment[] }>('/logistics/shipments/booking_ref_alerts/'),
  getPaperworkComparison: () =>
    api.get<PaperworkComparison>('/logistics/shipments/paperwork_comparison/'),

  getDocuments: (params?: Record<string, string>) =>
    api.get('/logistics/documents/', { params }),
  createDocument: (data: Record<string, unknown>) => api.post('/logistics/documents/', data),
  deleteDocument: (id: string) => api.delete(`/logistics/documents/${id}/`),

  getFreightForwarders: (params?: Record<string, string>) =>
    api.get<{ results: FreightForwarder[]; count: number }>('/logistics/freight-forwarders/', { params }),
  createFreightForwarder: (data: Record<string, unknown>) => api.post('/logistics/freight-forwarders/', data),
  updateFreightForwarder: (id: string, data: Record<string, unknown>) => api.patch(`/logistics/freight-forwarders/${id}/`, data),
  deleteFreightForwarder: (id: string) => api.delete(`/logistics/freight-forwarders/${id}/`),

  getBookingSchedule: (params?: Record<string, string>) =>
    api.get<{ results: BookingScheduleItem[]; count: number }>('/logistics/booking-schedule/', { params }),
  getBookingScheduleItem: (id: string) => api.get<BookingScheduleItem>(`/logistics/booking-schedule/${id}/`),
  createBookingScheduleItem: (data: Record<string, unknown>) => api.post<BookingScheduleItem>('/logistics/booking-schedule/', data),
  updateBookingScheduleItem: (id: string, data: Record<string, unknown>) => api.patch<BookingScheduleItem>(`/logistics/booking-schedule/${id}/`, data),
  deleteBookingScheduleItem: (id: string) => api.delete(`/logistics/booking-schedule/${id}/`),
  transitionBookingScheduleItem: (id: string, status: string) =>
    api.post<{ status: string }>(`/logistics/booking-schedule/${id}/transition/`, { status }),
  getWeeklyBookingSchedule: (weekEnding?: string) =>
    api.get<{ count: number; results: BookingScheduleItem[] }>('/logistics/booking-schedule/weekly/', { params: weekEnding ? { week_ending: weekEnding } : undefined }),

  // Dockets (GC-020)
  getDockets: (params?: Record<string, string>) =>
    api.get<{ results: Docket[]; count: number }>('/logistics/dockets/', { params }),
  getDocket: (id: string) => api.get<Docket>(`/logistics/dockets/${id}/`),
  createDocket: (data: Record<string, unknown>) => api.post<Docket>('/logistics/dockets/', data),
  updateDocket: (id: string, data: Record<string, unknown>) => api.patch<Docket>(`/logistics/dockets/${id}/`, data),
  deleteDocket: (id: string) => api.delete(`/logistics/dockets/${id}/`),
  sendDocketToSales: (id: string) =>
    api.post<{ sales_notified: boolean; sales_notified_at: string }>(`/logistics/dockets/${id}/send_to_sales/`),
  getOverLimitDockets: () =>
    api.get<{ count: number; results: Docket[] }>('/logistics/dockets/over_limit/'),

  // Final Hit Reconciliation (GC-021)
  getReconciliations: (params?: Record<string, string>) =>
    api.get<{ results: FinalHitReconciliation[]; count: number }>('/logistics/reconciliations/', { params }),
  getReconciliation: (id: string) => api.get<FinalHitReconciliation>(`/logistics/reconciliations/${id}/`),
  createReconciliation: (data: Record<string, unknown>) =>
    api.post<FinalHitReconciliation>('/logistics/reconciliations/', data),
  updateReconciliation: (id: string, data: Record<string, unknown>) =>
    api.patch<FinalHitReconciliation>(`/logistics/reconciliations/${id}/`, data),
  deleteReconciliation: (id: string) => api.delete(`/logistics/reconciliations/${id}/`),
  reconcileHit: (id: string, shippedQuantity?: string) =>
    api.post<FinalHitReconciliation>(`/logistics/reconciliations/${id}/reconcile/`, shippedQuantity ? { shipped_quantity: shippedQuantity } : {}),
  markDebited: (id: string) => api.post<FinalHitReconciliation>(`/logistics/reconciliations/${id}/mark_debited/`, {}),
  waiveReconciliation: (id: string, data: Record<string, unknown>) =>
    api.post<FinalHitReconciliation>(`/logistics/reconciliations/${id}/waive/`, data),
  getOverLimitReconciliations: () =>
    api.get<{ count: number; results: FinalHitReconciliation[] }>('/logistics/reconciliations/over_limit/'),
};

export const dashboardApi = {
  getRichSummary: () => api.get<{
    pipeline: { stage: string; total: number; active: number; path: string; breakdown?: Record<string, number> }[];
    financials: {
      total_revenue: number; total_cost: number; profit_margin: number; profit_margin_pct: number;
      accepted_pis: number; total_pis: number; approved_costings: number; total_costings: number;
      lc_total: number; lc_utilized: number; lc_utilization_pct: number;
      active_contracts: number; total_contracts: number; po_value_total: number;
    };
    tasks: {
      overdue_milestones: number; upcoming_milestones: number; pending_inspections: number;
      pending_costings: number; draft_pos: number;
      overdue_items: { id: string; name: string; po_number: string; planned_date: string; days_overdue: number; url: string }[];
    };
    alerts: { type: string; title: string; description: string; path: string }[];
  }>('/dashboard/summary/'),
};

export interface SavedReport {
  id: string;
  name: string;
  report_type: string;
  description: string | null;
  config: Record<string, unknown>;
  is_scheduled: boolean;
  created_by: string;
  created_by_name: string | null;
  created_at: string;
}

export interface ReportResult {
  columns: string[];
  rows: Record<string, unknown>[];
  count: number;
}

export const reportingApi = {
  getReports: (params?: Record<string, string>) =>
    api.get<{ results: SavedReport[]; count: number }>('/reporting/reports/', { params }),
  getReport: (id: string) => api.get<SavedReport>(`/reporting/reports/${id}/`),
  createReport: (data: Record<string, unknown>) => api.post('/reporting/reports/', data),
  updateReport: (id: string, data: Record<string, unknown>) => api.patch(`/reporting/reports/${id}/`, data),
  deleteReport: (id: string) => api.delete(`/reporting/reports/${id}/`),
  executeReport: (id: string) => api.post<ReportResult>(`/reporting/reports/${id}/execute/`),
  exportReport: (id: string) => api.get(`/reporting/reports/${id}/export/`, { responseType: 'blob' }),
};

export interface User {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string | null;
  designation: string | null;
  department: string | null;
  status: string;
  roles: string[];
  mfa_enabled: boolean;
  last_login: string | null;
  created_at: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
  permissions: Permission[];
  created_at: string;
}

export interface Permission {
  id: string;
  module: string;
  action: string;
  description: string;
}

export interface UserRole {
  id: string;
  user: string;
  role: string;
  user_username: string;
  role_name: string;
  created_at: string;
}

export const usersApi = {
  getUsers: (params?: Record<string, string>) =>
    api.get<{ results: User[]; count: number }>('/users/', { params }),
  getUser: (id: string) => api.get<User>(`/users/${id}/`),
  createUser: (data: Record<string, unknown>) => api.post('/users/', data),
  updateUser: (id: string, data: Record<string, unknown>) => api.patch(`/users/${id}/`, data),
  deleteUser: (id: string) => api.delete(`/users/${id}/`),
  getRoles: (params?: Record<string, string>) =>
    api.get<{ results: Role[]; count: number }>('/users/roles/', { params }),
  createRole: (data: Record<string, unknown>) => api.post('/users/roles/', data),
  updateRole: (id: string, data: Record<string, unknown>) => api.patch(`/users/roles/${id}/`, data),
  deleteRole: (id: string) => api.delete(`/users/roles/${id}/`),
  getPermissions: (params?: Record<string, string>) =>
    api.get<{ results: Permission[]; count: number }>('/users/permissions/', { params }),
  getUserRoles: (params?: Record<string, string>) =>
    api.get<{ results: UserRole[]; count: number }>('/users/user-roles/', { params }),
  assignUserRole: (userId: string, roleId: string) =>
    api.post('/users/user-roles/', { user: userId, role: roleId }),
  removeUserRole: (userRoleId: string) =>
    api.delete(`/users/user-roles/${userRoleId}/`),
};

// ── Fabric Management (GC-004 to GC-007) ──────────────────────────────

export interface FabricCategory {
  id: string;
  code: string;
  name: string;
  parent: string | null;
  parent_code: string | null;
  description: string;
  is_active: boolean;
  created_at: string;
}

export interface HTSCode {
  id: string;
  code: string;
  description: string;
  fabric_category: string | null;
  fabric_category_name: string | null;
  duty_rate: string | null;
  created_at: string;
}

export interface FabricSupplier {
  id: string;
  code: string;
  name: string;
  vendor: string | null;
  vendor_name: string | null;
  contact_person: string;
  email: string;
  phone: string;
  country: string | null;
  country_name: string | null;
  lead_time_days: number | null;
  moq_meters: string | null;
  is_mill: boolean;
  is_active: boolean;
  notes: string;
  created_at: string;
}

export interface FabricMill {
  id: string;
  code: string;
  name: string;
  country: string | null;
  country_name: string | null;
  city: string;
  capacity_meters_month: number | null;
  rating: string | null;
  certification: string;
  is_active: boolean;
  notes: string;
  created_at: string;
}

export interface RFQ {
  id: string;
  rfq_number: string;
  supplier: string;
  supplier_name: string;
  status: string;
  notes: string;
  closed_at: string | null;
  line_items: RFQLineItem[];
  created_at: string;
}

export interface RFQLineItem {
  id: string;
  rfq: string;
  fabric_category: string | null;
  fabric_category_name: string | null;
  quantity_meters: string;
  target_price: string | null;
  notes: string;
}

export interface RFQResponse {
  id: string;
  rfq: string;
  rfq_number: string;
  supplier: string;
  supplier_name: string;
  response_date: string | null;
  valid_until: string | null;
  notes: string;
  response_items: RFQResponseItem[];
}

export interface RFQResponseItem {
  id: string;
  response: string;
  line_item: string;
  quoted_price: string | null;
  available_qty_meters: string | null;
  lead_days: number | null;
  notes: string;
}

export interface FabricBooking {
  id: string;
  booking_number: string;
  supplier: string;
  supplier_name: string;
  fabric_category: string | null;
  fabric_category_name: string | null;
  quantity_meters: string;
  status: string;
  origin_country: string | null;
  origin_country_name: string | null;
  expected_delivery: string | null;
  actual_delivery: string | null;
  notes: string;
  created_at: string;
}

export interface FabricOrder {
  id: string;
  order_number: string;
  supplier: string;
  supplier_name: string;
  fabric_category: string | null;
  fabric_category_name: string | null;
  quantity_meters: string;
  unit_price: string;
  total_price: string;
  status: string;
  lab_dip_required_date: string | null;
  lab_dip_actual_date: string | null;
  lab_dip_approval_date: string | null;
  lab_dip_notes: string;
  bulk_approved_date: string | null;
  bulk_approved_by: string | null;
  bulk_approved_by_name: string | null;
  onboard_date: string | null;
  eta_date: string | null;
  clearance_date: string | null;
  risk_level: string | null;
  risk_level_code: string | null;
  risk_level_name: string | null;
  risk_notes: string;
  date_owners: Record<string, string>;
  effective_owners: Record<string, string>;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FabricRiskStatus {
  order_number: string;
  status: string;
  policy_code: string;
  risk_level: string | null;
  risk_level_code: string | null;
  risk_level_name: string | null;
  risk_notes: string;
  effective_owners: Record<string, string>;
  bulk_approved_date: string | null;
  onboard_date: string | null;
  clearance_date: string | null;
}

export interface FabricScheduleHandoff {
  date_key: string;
  from_role: string;
  to_role: string;
  trigger: string;
  handed_off_by: string | null;
  handed_off_at: string;
  notes: string;
}

export interface FabricScheduleStatus {
  order_number: string;
  date_owners: Record<string, string>;
  effective_owners: Record<string, string>;
  handoffs: FabricScheduleHandoff[];
}

export const FABRIC_ORDER_STATUSES = [
  'draft', 'submitted', 'lab_dip_pending', 'lab_dip_approved',
  'bulk_approved', 'in_production', 'shipped', 'delivered', 'cancelled',
] as const;

export interface FabricTolerance {
  id: string;
  customer_type: 'primark' | 'other' | 'fur';
  customer_type_display: string;
  qty_from: string;
  qty_to: string | null;
  tolerance_pct: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  primark: "Primark/Penney's",
  other: 'Other Customers',
  fur: 'All Fur Orders',
};

export interface ToleranceResolution {
  customer_type: string;
  quantity: string;
  tolerance_pct: string | null;
  tolerance_meters: string | null;
  qty_from: string | null;
  qty_to: string | null;
}

export interface FabricUtilization {
  id: string;
  order: string;
  order_number: string;
  supplier_name: string;
  fabric_category_name: string | null;
  period: string;
  received_meters: string;
  used_meters: string;
  wasted_meters: string;
  damaged_meters: string;
  ordered_meters: string;
  over_under_meters: string;
  over_under_pct: string;
  accounted_meters: string;
  excess_meters: string;
  efficiency_pct: string;
  notes: string;
  recorded_by: string | null;
  recorded_by_name: string | null;
  recorded_at: string;
}

export interface FabricUtilizationSummary {
  orders_count: number;
  ordered_meters: string;
  received_meters: string;
  used_meters: string;
  wasted_meters: string;
  damaged_meters: string;
  excess_meters: string;
  over_under_meters: string;
  over_under_pct: string;
  efficiency_pct: string;
}

export interface MonthlySummary {
  period: string;
  summary: FabricUtilizationSummary;
  rows: FabricUtilization[];
}

export interface QuarterlyMillReport {
  year: number;
  quarter: number;
  periods: string[];
  summary: FabricUtilizationSummary;
  mills: (FabricUtilizationSummary & {
    supplier_id: string;
    supplier_name: string;
  })[];
}

export const fabricApi = {
  // Categories
  getCategories: (params?: Record<string, string>) =>
    api.get<{ results: FabricCategory[]; count: number }>('/fabric/categories/', { params }),
  getCategory: (id: string) => api.get<FabricCategory>(`/fabric/categories/${id}/`),
  createCategory: (data: Record<string, unknown>) => api.post<FabricCategory>('/fabric/categories/', data),
  updateCategory: (id: string, data: Record<string, unknown>) => api.patch<FabricCategory>(`/fabric/categories/${id}/`, data),
  deleteCategory: (id: string) => api.delete(`/fabric/categories/${id}/`),

  // HTS Codes
  getHTSCodes: (params?: Record<string, string>) =>
    api.get<{ results: HTSCode[]; count: number }>('/fabric/hts-codes/', { params }),
  createHTSCode: (data: Record<string, unknown>) => api.post('/fabric/hts-codes/', data),
  updateHTSCode: (id: string, data: Record<string, unknown>) => api.patch(`/fabric/hts-codes/${id}/`, data),
  deleteHTSCode: (id: string) => api.delete(`/fabric/hts-codes/${id}/`),

  // Suppliers
  getSuppliers: (params?: Record<string, string>) =>
    api.get<{ results: FabricSupplier[]; count: number }>('/fabric/suppliers/', { params }),
  getSupplier: (id: string) => api.get<FabricSupplier>(`/fabric/suppliers/${id}/`),
  createSupplier: (data: Record<string, unknown>) => api.post<FabricSupplier>('/fabric/suppliers/', data),
  updateSupplier: (id: string, data: Record<string, unknown>) => api.patch<FabricSupplier>(`/fabric/suppliers/${id}/`, data),
  deleteSupplier: (id: string) => api.delete(`/fabric/suppliers/${id}/`),

  // Mills
  getMills: (params?: Record<string, string>) =>
    api.get<{ results: FabricMill[]; count: number }>('/fabric/mills/', { params }),
  createMill: (data: Record<string, unknown>) => api.post('/fabric/mills/', data),
  updateMill: (id: string, data: Record<string, unknown>) => api.patch(`/fabric/mills/${id}/`, data),
  deleteMill: (id: string) => api.delete(`/fabric/mills/${id}/`),

  // RFQs
  getRFQs: (params?: Record<string, string>) =>
    api.get<{ results: RFQ[]; count: number }>('/fabric/rfqs/', { params }),
  createRFQ: (data: Record<string, unknown>) => api.post<RFQ>('/fabric/rfqs/', data),
  updateRFQ: (id: string, data: Record<string, unknown>) => api.patch<RFQ>(`/fabric/rfqs/${id}/`, data),
  deleteRFQ: (id: string) => api.delete(`/fabric/rfqs/${id}/`),

  // RFQ Line Items
  getRFQLineItems: (params?: Record<string, string>) =>
    api.get<{ results: RFQLineItem[]; count: number }>('/fabric/rfq-line-items/', { params }),
  createRFQLineItem: (data: Record<string, unknown>) => api.post('/fabric/rfq-line-items/', data),
  updateRFQLineItem: (id: string, data: Record<string, unknown>) => api.patch(`/fabric/rfq-line-items/${id}/`, data),
  deleteRFQLineItem: (id: string) => api.delete(`/fabric/rfq-line-items/${id}/`),

  // RFQ Responses
  getRFQResponses: (params?: Record<string, string>) =>
    api.get<{ results: RFQResponse[]; count: number }>('/fabric/rfq-responses/', { params }),
  createRFQResponse: (data: Record<string, unknown>) => api.post('/fabric/rfq-responses/', data),
  updateRFQResponse: (id: string, data: Record<string, unknown>) => api.patch(`/fabric/rfq-responses/${id}/`, data),
  deleteRFQResponse: (id: string) => api.delete(`/fabric/rfq-responses/${id}/`),
  getRFQResponse: (id: string) => api.get<RFQResponse>(`/fabric/rfq-responses/${id}/`),

  // RFQ Response Items
  getRFQResponseItems: (params?: Record<string, string>) =>
    api.get<{ results: RFQResponseItem[]; count: number }>('/fabric/rfq-response-items/', { params }),
  createRFQResponseItem: (data: Record<string, unknown>) => api.post('/fabric/rfq-response-items/', data),

  // Bookings
  getBookings: (params?: Record<string, string>) =>
    api.get<{ results: FabricBooking[]; count: number }>('/fabric/bookings/', { params }),
  getBooking: (id: string) => api.get<FabricBooking>(`/fabric/bookings/${id}/`),
  createBooking: (data: Record<string, unknown>) => api.post<FabricBooking>('/fabric/bookings/', data),
  updateBooking: (id: string, data: Record<string, unknown>) => api.patch<FabricBooking>(`/fabric/bookings/${id}/`, data),
  deleteBooking: (id: string) => api.delete(`/fabric/bookings/${id}/`),

  // Orders (GC-006)
  getOrders: (params?: Record<string, string>) =>
    api.get<{ results: FabricOrder[]; count: number }>('/fabric/orders/', { params }),
  getOrder: (id: string) => api.get<FabricOrder>(`/fabric/orders/${id}/`),
  createOrder: (data: Record<string, unknown>) => api.post<FabricOrder>('/fabric/orders/', data),
  updateOrder: (id: string, data: Record<string, unknown>) => api.patch<FabricOrder>(`/fabric/orders/${id}/`, data),
  deleteOrder: (id: string) => api.delete(`/fabric/orders/${id}/`),

  // Fabric Risk & Schedule (GC-007)
  getRiskStatus: (id: string) => api.get<FabricRiskStatus>(`/fabric/orders/${id}/risk_status/`),
  setRisk: (id: string, data: Record<string, unknown>) => api.post<FabricOrder>(`/fabric/orders/${id}/set_risk/`, data),
  recomputeRisk: (id: string) => api.post<FabricOrder>(`/fabric/orders/${id}/recompute_risk/`),
  updateScheduleDates: (id: string, dates: Record<string, string | null>) =>
    api.post<FabricOrder>(`/fabric/orders/${id}/update_schedule_dates/`, { dates }),
  getScheduleStatus: (id: string) => api.get<FabricScheduleStatus>(`/fabric/orders/${id}/schedule_status/`),
  handoffSchedule: (id: string, dateKey: string, notes?: string) =>
    api.post<{ order: FabricOrder; handoff: FabricScheduleHandoff }>(`/fabric/orders/${id}/handoff_schedule/`, { date_key: dateKey, notes: notes || '' }),

  // Fabric Tolerances (GC-005)
  getTolerances: (params?: Record<string, string>) =>
    api.get<{ results: FabricTolerance[]; count: number }>('/fabric/tolerances/', { params }),
  createTolerance: (data: Record<string, unknown>) => api.post<FabricTolerance>('/fabric/tolerances/', data),
  updateTolerance: (id: string, data: Record<string, unknown>) => api.patch<FabricTolerance>(`/fabric/tolerances/${id}/`, data),
  deleteTolerance: (id: string) => api.delete(`/fabric/tolerances/${id}/`),
  resolveTolerance: (customerType: string, quantity: string) =>
    api.get<ToleranceResolution>('/fabric/tolerances/tolerance_for/', { params: { customer_type: customerType, quantity } }),

  // Fabric Utilization Reports (GC-030)
  getUtilizations: (params?: Record<string, string>) =>
    api.get<{ results: FabricUtilization[]; count: number }>('/fabric/utilizations/', { params }),
  createUtilization: (data: Record<string, unknown>) => api.post<FabricUtilization>('/fabric/utilizations/', data),
  updateUtilization: (id: string, data: Record<string, unknown>) => api.patch<FabricUtilization>(`/fabric/utilizations/${id}/`, data),
  deleteUtilization: (id: string) => api.delete(`/fabric/utilizations/${id}/`),
  getMonthlySummary: (period?: string) =>
    api.get<MonthlySummary>('/fabric/utilizations/monthly_summary/', { params: period ? { period } : undefined }),
  getQuarterlyMillReport: (year: string, quarter: string) =>
    api.get<QuarterlyMillReport>('/fabric/utilizations/quarterly_mill_report/', { params: { year, quarter } }),
};

export default api;
