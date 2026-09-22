export type RiskPayload = { code: 'none' | 'green' | 'amber' | 'red'; label: string; color: string; numeric: 0 | 1 | 2 | 3 };

export type SalesOrderStatuses = {
  fabric: RiskPayload;
  trims: RiskPayload;
  production: RiskPayload;
  delivery: RiskPayload;
  overall: RiskPayload;
};

export type DesignStatus = 'active' | 'archived' | 'draft';

export interface DesignMaterial {
  id: string;
  type: string;
  description: string;
  code: string;
  location: string;
  supplier: string;
  colour: string;
  width_size: string;
  qty: number;
  unit: string;
  notes: string;
}

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
  issue_date: string;
  block: string;
  designer: string;
  size: string;
  issuer: string;
  length: string;
  description: string;
  design_notes: string;
  created_at: string;
  updated_at: string;
  sketch_url?: string;
  materials: DesignMaterial[];
}

export interface DesignCreateInput {
  design_code: string;
  style_type?: string;
  category: string;
  buyer: string;
  status?: DesignStatus;
  issue_date?: string;
  block?: string;
  designer?: string;
  size?: string;
  issuer?: string;
  length?: string;
  description?: string;
  design_notes?: string;
  sketch_url?: string;
  materials?: DesignMaterial[];
}

export interface DesignUpdateInput {
  category?: string;
  buyer?: string;
  status?: DesignStatus;
  issue_date?: string;
  block?: string;
  designer?: string;
  size?: string;
  issuer?: string;
  length?: string;
  description?: string;
  design_notes?: string;
  sketch_url?: string;
  materials?: DesignMaterial[];
}

export type POStatus =
  | 'draft'
  | 'open'
  | 'confirmed'
  | 'in_production'
  | 'quality_check'
  | 'ready'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type DesignVersionStatus =
  | 'draft'
  | 'open'
  | 'approved'
  | 'in_production'
  | 'delivered'
  | 'cancelled';

export type DesignFabricStatus = 'none' | 'in_work' | 'delivered' | 'sticky_red';

export type BomCategory = 'trims' | 'labels' | 'accessories' | 'other';

export type BomStatus = 'Ordered' | 'TBC' | 'Partial' | 'Completed';

export type TechPackStatus = 'not_started' | 'extracting' | 'review' | 'imported';

export interface DesignVersion {
  id: string;
  version_number: string;
  fn_number: string;
  status: DesignVersionStatus;
  is_current: boolean;
  is_quick_lead: boolean;
  quick_lead_agreed_by: string;
  is_repeat: boolean;
  original_fn: string;
  repeat_approved_by: string;
  revision_notes: string;
  issue_date: string;
  quantity: number;
  unit_price: string;
  stock_fabric: boolean;
}

export interface FileOpeningNote {
  id: string;
  author: string;
  action: string;
  note: string;
  milestone_date: string;
}

export interface DesignFileOpening {
  id: string;
  fn_number: string;
  version_number: string;
  buyer: string;
  factory: string;
  status: DesignVersionStatus;
  open_date: string;
  approved_date: string;
  notes: FileOpeningNote[];
}

export interface DesignPO {
  id: string;
  po_number: string;
  version_number: string;
  fn_number: string;
  buyer: string;
  factory: string;
  currency: string;
  quantity: number;
  unit_price: string;
  total_value: string;
  delivery_date: string;
  status: POStatus;
  fabric_status: DesignFabricStatus;
  daily_production_qty: number;
  schedule_qty: number;
}

export interface DesignPOWithStatus extends DesignPO {
  statuses: SalesOrderStatuses;
}

export interface DesignItem {
  id: string;
  item_code: string;
  colour: string;
  size: string;
  colour_ways: number;
  quantity: number;
}

export interface DesignBomItem {
  id: string;
  version_number: string;
  category: BomCategory;
  description: string;
  code: string;
  supplier: string;
  unit: string;
  qty: number;
  status: BomStatus;
  ta_date: string;
}

export interface DesignImage {
  id: string;
  label: string;
  url: string;
  annotation: string;
  uploaded_at: string;
}

export interface DesignSketch {
  id: string;
  label: string;
  url: string;
  version_number: string;
}

export interface TechPackSection {
  key: string;
  label: string;
  progress: number;
}

export interface DesignTechPack {
  id: string;
  name: string;
  version: string;
  uploaded_at: string;
  status: TechPackStatus;
  sections: TechPackSection[];
}

export interface DesignDetailCore {
  versions: DesignVersion[];
  file_openings: DesignFileOpening[];
  pos: DesignPO[];
  items: DesignItem[];
  bom: DesignBomItem[];
  images: DesignImage[];
  sketches: DesignSketch[];
  tech_packs: DesignTechPack[];
}

export interface DesignDetail extends DesignDetailCore {
  design: DesignRegisterRow;
  sales_order: SalesOrderStatuses;
  pos: DesignPOWithStatus[];
}