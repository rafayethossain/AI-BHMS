import type { DesignRegisterRow } from './types';

const base = '2026-09-10';

let counter = 0;
const id = () => `design-${String(++counter).padStart(2, '0')}`;

export const designSeed: DesignRegisterRow[] = [
  { id: id(), design_code: 'REG-1001', style_type: 'TOP', category: 'Womenswear', buyer: 'Nike Inc.', current_version: 'v2', status: 'active', live_po_count: 3, completed_po_count: 1, created_at: base, updated_at: base },
  { id: id(), design_code: 'REG-1002', style_type: 'DRESS', category: 'Womenswear', buyer: 'Zara', current_version: 'v1', status: 'active', live_po_count: 2, completed_po_count: 0, created_at: base, updated_at: base },
  { id: id(), design_code: 'REG-1003', style_type: 'JACKET', category: 'Outerwear', buyer: 'Primark', current_version: 'v1', status: 'draft', live_po_count: 1, completed_po_count: 0, created_at: base, updated_at: base },
  { id: id(), design_code: 'REG-1004', style_type: 'TROUSER', category: 'Menswear', buyer: 'Aldi', current_version: 'v2', status: 'active', live_po_count: 4, completed_po_count: 2, created_at: base, updated_at: base },
  { id: id(), design_code: 'REG-1005', style_type: 'SKIRT', category: 'Womenswear', buyer: 'Addidas', current_version: 'v1', status: 'active', live_po_count: 1, completed_po_count: 0, created_at: base, updated_at: base },
  { id: id(), design_code: 'REG-1006', style_type: 'SHIRT', category: 'Menswear', buyer: 'Walmart', current_version: 'v1', status: 'archived', live_po_count: 0, completed_po_count: 3, created_at: base, updated_at: base },
  { id: id(), design_code: 'REG-1007', style_type: 'TOP', category: 'Activewear', buyer: 'Costco', current_version: 'v1', status: 'active', live_po_count: 2, completed_po_count: 0, created_at: base, updated_at: base },
  { id: id(), design_code: 'REG-1008', style_type: 'SHORT', category: 'Activewear', buyer: 'Nike Inc.', current_version: 'v1', status: 'draft', live_po_count: 0, completed_po_count: 0, created_at: base, updated_at: base },
  { id: id(), design_code: 'REG-1009', style_type: 'BLOUSE', category: 'Womenswear', buyer: 'Zara', current_version: 'v1', status: 'active', live_po_count: 1, completed_po_count: 0, created_at: base, updated_at: base },
  { id: id(), design_code: 'REG-1010', style_type: 'COAT', category: 'Outerwear', buyer: 'Primark', current_version: 'v1', status: 'active', live_po_count: 2, completed_po_count: 1, created_at: base, updated_at: base },
  { id: id(), design_code: 'DSD-1001', style_type: 'TOP', category: 'Knitwear', buyer: 'Aldi', current_version: 'v1', status: 'active', live_po_count: 1, completed_po_count: 0, created_at: base, updated_at: base },
  { id: id(), design_code: 'DSD-1002', style_type: 'VEST', category: 'Knitwear', buyer: 'Addidas', current_version: 'v1', status: 'active', live_po_count: 1, completed_po_count: 0, created_at: base, updated_at: base },
  { id: id(), design_code: 'DSD-1003', style_type: 'HOODIE', category: 'Activewear', buyer: 'Walmart', current_version: 'v1', status: 'draft', live_po_count: 0, completed_po_count: 0, created_at: base, updated_at: base },
  { id: id(), design_code: 'DSD-1004', style_type: 'CARDIGAN', category: 'Knitwear', buyer: 'Costco', current_version: 'v1', status: 'active', live_po_count: 0, completed_po_count: 1, created_at: base, updated_at: base },
  { id: id(), design_code: 'DSD-1005', style_type: 'POLO', category: 'Activewear', buyer: 'Nike Inc.', current_version: 'v1', status: 'active', live_po_count: 0, completed_po_count: 0, created_at: base, updated_at: base },
];