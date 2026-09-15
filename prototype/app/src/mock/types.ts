export type RiskPayload = { code: 'none' | 'green' | 'amber' | 'red'; label: string; color: string; numeric: 0 | 1 | 2 | 3 };

export type SalesOrderStatuses = {
  fabric: RiskPayload;
  trims: RiskPayload;
  production: RiskPayload;
  delivery: RiskPayload;
  overall: RiskPayload;
};

export type DesignStatus = 'active' | 'archived' | 'draft';

export interface DesignRegisterRow {
  id: string;
  design_code: string;
  style_type: string | null;
  category: string;
  buyer: string;
  current_version: string;
  status: DesignStatus;
  live_po_count: number;
  completed_po_count: number;
  created_at: string;
  updated_at: string;
}

export interface DesignCreateInput {
  design_code: string;
  style_type?: string;
  category: string;
  buyer: string;
  status?: DesignStatus;
}

export interface DesignUpdateInput {
  category?: string;
  buyer?: string;
  status?: DesignStatus;
}