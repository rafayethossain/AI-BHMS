import type { Costing, DesignMaterial, DesignRegisterRow, FitSpec, JobRequest } from './types';

const base = '2026-09-10';

let counter = 0;
const id = () => `design-${String(++counter).padStart(2, '0')}`;

let matCounter = 0;
const matId = () => `mat-${String(++matCounter).padStart(2, '0')}`;

let fitCounter = 0;
const fitId = () => `fit-${String(++fitCounter).padStart(2, '0')}`;

let jobCounter = 0;
const jobId = () => `job-${String(++jobCounter).padStart(2, '0')}`;

let costingCounter = 0;
const costingId = () => `costing-${String(++costingCounter).padStart(2, '0')}`;

export const reg1001Materials: DesignMaterial[] = [
  { id: matId(), type: 'Cloth', description: 'SANDWASH LINEN', code: 'XK-529', location: 'MAIN', supplier: 'ALICE', colour: 'BLACK', width_size: '132CM', qty: 1.67, unit: 'm', notes: '' },
  { id: matId(), type: 'Trims', description: 'BUTTON 4 HOLES', code: 'FV9757', location: 'W/B', supplier: 'FOURSEASONS', colour: 'BROWN #09', width_size: '24LN', qty: 2, unit: 'pcs', notes: '' },
  { id: matId(), type: 'Trims', description: 'NYLON ZIPPER FRONT FLY', code: 'YKK', location: 'FRONT FLY', supplier: 'YKK', colour: 'DTM', width_size: '3/17CM', qty: 1, unit: 'pc', notes: '' },
  { id: matId(), type: 'Trims', description: 'ELASTIC BAND', code: 'P701', location: 'BACK WAIST', supplier: 'KT TRIMS', colour: 'BLACK', width_size: '5CM', qty: 0.47, unit: 'm', notes: '' },
  { id: matId(), type: 'Interfacing', description: 'FUSING', code: '2012', location: 'AS PER PATTERN', supplier: 'THANH PHONG', colour: 'BLACK', width_size: '150CM', qty: 0.12, unit: 'm', notes: '' },
  { id: matId(), type: 'Lining', description: 'POLY COTTON POCKET BAG', code: 'DOAN KET', location: 'POCKET', supplier: 'DOAN KET', colour: 'DTM', width_size: '145CM', qty: 0.16, unit: 'm', notes: '' },
];

export const reg1002Materials: DesignMaterial[] = [
  { id: matId(), type: 'Cloth', description: 'CREPE DE CHINE', code: 'XK-604', location: 'MAIN', supplier: 'ALICE', colour: 'MINT', width_size: '140CM', qty: 2.2, unit: 'm', notes: '' },
  { id: matId(), type: 'Trims', description: 'INVISIBLE ZIPPER', code: 'YKK-3', location: 'CB', supplier: 'YKK', colour: 'DTM', width_size: '3/40CM', qty: 1, unit: 'pc', notes: '' },
];

export const designSeed: DesignRegisterRow[] = [
  { id: id(), design_code: 'REG-1001', style_type: 'TOP', category: 'Womenswear', buyer: 'Nike Inc.', current_version: 'v2', status: 'active', live_po_count: 3, completed_po_count: 1, issue_date: '2026-08-01', block: 'B2', designer: 'F. Rahman', size: 'S–XL', issuer: 'Merchandising', length: '38 in', description: 'Crew neck oversized top', design_notes: 'Contrast stitch detail', created_at: base, updated_at: base, materials: reg1001Materials },
  { id: id(), design_code: 'REG-1002', style_type: 'DRESS', category: 'Womenswear', buyer: 'Zara', current_version: 'v1', status: 'active', live_po_count: 2, completed_po_count: 0, issue_date: '2026-07-25', block: 'B1', designer: 'S. Akter', size: '6–12', issuer: 'Design Studio', length: '42 in', description: 'Floral midi dress', design_notes: 'Side zip closure', created_at: base, updated_at: base, materials: reg1002Materials },
  { id: id(), design_code: 'REG-1003', style_type: 'JACKET', category: 'Outerwear', buyer: 'Primark', current_version: 'v1', status: 'draft', live_po_count: 1, completed_po_count: 0, issue_date: '2026-06-30', block: 'C4', designer: 'M. Hossain', size: 'XS–L', issuer: 'Merchandising', length: '28 in', description: 'Quilted bomber jacket', design_notes: 'Top-stitch collar', created_at: base, updated_at: base, materials: [] },
  { id: id(), design_code: 'REG-1004', style_type: 'TROUSER', category: 'Menswear', buyer: 'Aldi', current_version: 'v2', status: 'active', live_po_count: 4, completed_po_count: 2, issue_date: '2026-06-18', block: 'A1', designer: 'J. Paul', size: '30–38', issuer: 'Sampling', length: '40 in', description: 'Slim fit chino trouser', design_notes: 'Hidden button fly', created_at: base, updated_at: base, materials: [] },
  { id: id(), design_code: 'REG-1005', style_type: 'SKIRT', category: 'Womenswear', buyer: 'Addidas', current_version: 'v1', status: 'active', live_po_count: 1, completed_po_count: 0, issue_date: '2026-05-12', block: 'D3', designer: 'F. Rahman', size: 'XS–XXL', issuer: 'Design Studio', length: '26 in', description: 'A-line running skirt', design_notes: 'Heat-seal logo', created_at: base, updated_at: base, materials: [] },
  { id: id(), design_code: 'REG-1006', style_type: 'SHIRT', category: 'Menswear', buyer: 'Walmart', current_version: 'v1', status: 'archived', live_po_count: 0, completed_po_count: 3, issue_date: '2026-04-02', block: 'A2', designer: 'K. Gomes', size: 'S–3XL', issuer: 'Merchandising', length: '34 in', description: 'Button down oxford shirt', design_notes: 'Pocket with flap', created_at: base, updated_at: base, materials: [] },
  { id: id(), design_code: 'REG-1007', style_type: 'TOP', category: 'Activewear', buyer: 'Costco', current_version: 'v1', status: 'active', live_po_count: 2, completed_po_count: 0, issue_date: '2026-03-20', block: 'B2', designer: 'L. Bari', size: '10–20', issuer: 'Sampling', length: '36 in', description: 'Seamless active top', design_notes: 'Moisture wick fabric', created_at: base, updated_at: base, materials: [] },
  { id: id(), design_code: 'REG-1008', style_type: 'SHORT', category: 'Activewear', buyer: 'Nike Inc.', current_version: 'v1', status: 'draft', live_po_count: 0, completed_po_count: 0, issue_date: '2026-03-08', block: 'C2', designer: 'S. Akter', size: 'S–2XL', issuer: 'Design Studio', length: '20 in', description: 'Basketball training short', design_notes: 'Inner drawcord', created_at: base, updated_at: base, materials: [] },
  { id: id(), design_code: 'REG-1009', style_type: 'BLOUSE', category: 'Womenswear', buyer: 'Zara', current_version: 'v1', status: 'active', live_po_count: 1, completed_po_count: 0, issue_date: '2026-02-26', block: 'B3', designer: 'R. Uddin', size: '8–16', issuer: 'Merchandising', length: '30 in', description: 'Satin puff sleeve blouse', design_notes: 'Pearl button cuff', created_at: base, updated_at: base, materials: [] },
  { id: id(), design_code: 'REG-1010', style_type: 'COAT', category: 'Outerwear', buyer: 'Primark', current_version: 'v1', status: 'active', live_po_count: 2, completed_po_count: 1, issue_date: '2026-01-15', block: 'C1', designer: 'M. Hossain', size: 'XS–2XL', issuer: 'Design Studio', length: '48 in', description: 'Wool blend long coat', design_notes: 'Horn buttons', created_at: base, updated_at: base, materials: [] },
  { id: id(), design_code: 'DSD-1001', style_type: 'TOP', category: 'Knitwear', buyer: 'Aldi', current_version: 'v1', status: 'active', live_po_count: 1, completed_po_count: 0, issue_date: '2026-01-06', block: 'A3', designer: 'N. Islam', size: 'S–XL', issuer: 'Sampling', length: '37 in', description: 'Ribbed knit polo top', design_notes: 'Self fabric placket', created_at: base, updated_at: base, materials: [] },
  { id: id(), design_code: 'DSD-1002', style_type: 'VEST', category: 'Knitwear', buyer: 'Addidas', current_version: 'v1', status: 'active', live_po_count: 1, completed_po_count: 0, issue_date: '2025-12-18', block: 'D1', designer: 'F. Rahman', size: 'M–4XL', issuer: 'Merchandising', length: '24 in', description: 'Sleeveless knit vest', design_notes: 'V neck binding', created_at: base, updated_at: base, materials: [] },
  { id: id(), design_code: 'DSD-1003', style_type: 'HOODIE', category: 'Activewear', buyer: 'Walmart', current_version: 'v1', status: 'draft', live_po_count: 0, completed_po_count: 0, issue_date: '2025-12-02', block: 'A2', designer: 'K. Gomes', size: 'XS–XXL', issuer: 'Design Studio', length: '30 in', description: 'French terry hoodie', design_notes: 'Kangaroo pocket', created_at: base, updated_at: base, materials: [] },
  { id: id(), design_code: 'DSD-1004', style_type: 'CARDIGAN', category: 'Knitwear', buyer: 'Costco', current_version: 'v1', status: 'active', live_po_count: 0, completed_po_count: 1, issue_date: '2025-11-20', block: 'B4', designer: 'L. Bari', size: 'S–3XL', issuer: 'Sampling', length: '44 in', description: 'Open front knit cardigan', design_notes: 'Side seam pockets', created_at: base, updated_at: base, materials: [] },
  { id: id(), design_code: 'DSD-1005', style_type: 'POLO', category: 'Activewear', buyer: 'Nike Inc.', current_version: 'v1', status: 'active', live_po_count: 0, completed_po_count: 0, issue_date: '2025-11-08', block: 'C3', designer: 'R. Uddin', size: 'S–2XL', issuer: 'Merchandising', length: '33 in', description: 'Performance pique polo', design_notes: 'Contrast collar', created_at: base, updated_at: base, materials: [] },
];

export const fitSpecSeed: Record<string, FitSpec[]> = {
  'REG-1001': [
    { id: fitId(), fit_number: 'FIT-1001-01', fit_stage: 'dev', version_number: 'v1', fit_date: '2026-06-05', description: 'Initial dev spec', measurements: 'Chest 52, Waist 44', notes: '', is_selected: false },
    { id: fitId(), fit_number: 'FIT-1001-02', fit_stage: '1st', version_number: 'v1', fit_date: '2026-06-25', description: 'First fit sample', measurements: 'Chest 51, Waist 43.5', notes: 'Sleeve shortened 1cm', is_selected: false },
    { id: fitId(), fit_number: 'FIT-1001-03', fit_stage: '2nd', version_number: 'v2', fit_date: '2026-07-15', description: 'Second fit sample', measurements: 'Chest 52, Waist 44', notes: '', is_selected: true },
    { id: fitId(), fit_number: 'FIT-1001-04', fit_stage: '3rd', version_number: 'v2', fit_date: '2026-08-02', description: 'Third fit sample', measurements: 'Chest 52.5, Waist 44.5', notes: 'Approved by buyer', is_selected: false },
  ],
  'REG-1002': [
    { id: fitId(), fit_number: 'FIT-1002-01', fit_stage: 'dev', version_number: 'v1', fit_date: '2026-05-20', description: 'Dev spec for floral midi', measurements: 'Bust 88, Waist 70', notes: '', is_selected: false },
    { id: fitId(), fit_number: 'FIT-1002-02', fit_stage: '1st', version_number: 'v1', fit_date: '2026-06-10', description: 'First fit sample', measurements: 'Bust 87, Waist 69', notes: 'Side zip moved 2cm', is_selected: true },
  ],
  'REG-1004': [
    { id: fitId(), fit_number: 'FIT-1004-01', fit_stage: 'dev', version_number: 'v1', fit_date: '2026-04-18', description: 'Dev spec for chino', measurements: 'Waist 32, Inseam 40', notes: '', is_selected: false },
    { id: fitId(), fit_number: 'FIT-1004-02', fit_stage: '1st', version_number: 'v1', fit_date: '2026-05-06', description: 'First fit sample', measurements: 'Waist 32, Inseam 40', notes: 'Rise lowered 5mm', is_selected: false },
    { id: fitId(), fit_number: 'FIT-1004-03', fit_stage: 'pp', version_number: 'v2', fit_date: '2026-06-12', description: 'Pre-production spec', measurements: 'Waist 32, Inseam 40', notes: 'Signed off', is_selected: true },
  ],
  'REG-1005': [
    { id: fitId(), fit_number: 'FIT-1005-01', fit_stage: 'dev', version_number: 'v1', fit_date: '2026-05-15', description: 'Dev spec for running skirt', measurements: 'Waist 68, Length 26', notes: '', is_selected: true },
  ],
  'DSD-1001': [
    { id: fitId(), fit_number: 'FIT-DSD1001-01', fit_stage: 'dev', version_number: 'v1', fit_date: '2026-02-10', description: 'Dev spec for knit polo', measurements: 'Chest 96, Body 68', notes: '', is_selected: true },
  ],
};

export const assigneeSeed: string[] = [
  'F. Rahman',
  'S. Akter',
  'M. Hossain',
  'J. Paul',
  'K. Gomes',
  'L. Bari',
  'R. Uddin',
  'N. Islam',
];

const job = (
  job_number: string,
  job_type: JobRequest['job_type'],
  purchase_order: string,
  description: string,
  work_location: string,
  assigned_to: string,
  required_by_date: string,
  priority: JobRequest['priority'],
  status: JobRequest['status'],
): JobRequest => ({
  id: jobId(),
  job_number,
  job_type,
  purchase_order,
  description,
  work_location,
  assigned_to,
  required_by_date,
  priority,
  status,
  notes: '',
});

export const jobRequestSeed: Record<string, JobRequest[]> = {
  'REG-1001': [
    job('JOB-1001-01', 'pattern', 'PO-2025-0001', 'Draft pattern for crew neck top', 'Pattern Room', 'F. Rahman', '2026-06-01', 2, 'completed'),
    job('JOB-1001-02', 'sample', '', 'Fit sample size M', 'Sample Room', 'S. Akter', '2026-06-20', 3, 'in_progress'),
    job('JOB-1001-03', '3d', '', '3D render for buyer review', 'Studio', '', '2026-10-01', 2, 'pending'),
    job('JOB-1001-04', 'mini_marker', '', 'Mini marker for fabric consumption', 'CAD', 'M. Hossain', '2026-06-10', 1, 'cancelled'),
  ],
  'REG-1002': [
    job('JOB-1002-01', 'pattern', 'PO-2025-0011', 'Floral placement pattern', 'Pattern Room', 'S. Akter', '2026-06-10', 2, 'completed'),
    job('JOB-1002-02', 'sample', '', 'First fit dress sample', 'Sample Room', 'F. Rahman', '2026-06-30', 3, 'pending'),
  ],
  'REG-1004': [
    job('JOB-1004-01', 'pattern', 'PO-2025-0031', 'Chino block pattern', 'Pattern Room', 'J. Paul', '2026-05-15', 2, 'completed'),
    job('JOB-1004-02', 'sample', '', 'Slim fit trouser sample', 'Sample Room', 'M. Hossain', '2026-06-01', 3, 'in_progress'),
    job('JOB-1004-03', 'mini_marker', '', 'Marker for waistband', 'CAD', 'K. Gomes', '2026-06-25', 1, 'pending'),
  ],
  'REG-1005': [
    job('JOB-1005-01', '3d', '', 'Running skirt 3D sample', 'Studio', 'L. Bari', '2026-07-05', 2, 'pending'),
  ],
  'DSD-1001': [
    job('JOB-DSD1001-01', 'pattern', 'PO-2025-0101', 'Knit polo pattern', 'Pattern Room', 'N. Islam', '2026-03-01', 2, 'completed'),
  ],
};

const costing = (
  po_number: string,
  version: number,
  sheet_type: Costing['sheet_type'],
  status: Costing['status'],
  is_live: boolean,
  exchange_rate: string,
  target_price: string,
  fabric_cost: string,
  trim_cost: string,
  cm_cost: string,
  overhead_cost: string,
): Costing => ({
  id: costingId(),
  po_number,
  version,
  sheet_type,
  status,
  is_live,
  exchange_rate,
  target_price,
  fabric_cost,
  trim_cost,
  cm_cost,
  overhead_cost,
  notes: '',
});

export const costingSeed: Record<string, Costing[]> = {
  'REG-1001': [
    costing('PO-2025-0001', 1, 'sl', 'approved', true, '0.79', '12.50', '4.20', '1.10', '2.30', '0.90'),
    costing('PO-2025-0001', 2, 'sl', 'pending', false, '0.80', '12.50', '4.50', '1.15', '2.35', '0.95'),
    costing('PO-2025-0002', 1, 'vn', 'draft', false, '', '11.00', '3.90', '1.00', '2.10', '0.85'),
    costing('PO-2025-0003', 1, 'bd', 'rejected', false, '0.78', '10.50', '4.80', '1.30', '2.60', '1.00'),
  ],
  'REG-1002': [
    costing('PO-2025-0011', 1, 'sl', 'approved', true, '0.79', '11.00', '3.60', '0.95', '2.05', '0.80'),
    costing('PO-2025-0012', 1, 'cn', 'pending', false, '0.81', '10.00', '3.30', '0.90', '1.95', '0.75'),
  ],
  'REG-1004': [
    costing('PO-2025-0031', 1, 'sl', 'approved', true, '0.79', '15.00', '5.10', '1.40', '2.80', '1.05'),
    costing('PO-2025-0032', 1, 'vn', 'draft', false, '', '14.50', '4.90', '1.35', '2.70', '1.00'),
    costing('PO-2025-0033', 1, 'bd', 'pending', false, '0.78', '15.00', '5.30', '1.45', '2.90', '1.10'),
  ],
  'REG-1005': [
    costing('PO-2025-0041', 1, 'other', 'draft', false, '', '9.50', '3.10', '0.85', '1.90', '0.70'),
  ],
};