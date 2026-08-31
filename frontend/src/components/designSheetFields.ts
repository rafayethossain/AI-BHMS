import type { DesignSheet } from '../api/client';

export const DESIGN_SHEET_STATUSES = ['new', 'rejected', 'closed', 'archived'];

export const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  rejected: 'Rejected',
  closed: 'Closed',
  archived: 'Archived',
};

export const DESIGN_INFO_FIELDS: { key: keyof DesignSheet; label: string }[] = [
  { key: 'issue_date', label: 'Issue Date' },
  { key: 'block', label: 'Block' },
  { key: 'based_on', label: 'Based On' },
  { key: 'customer', label: 'Customer' },
  { key: 'style_number', label: 'Style Number' },
  { key: 'season', label: 'Season' },
  { key: 'size', label: 'Size' },
  { key: 'designer', label: 'Designer' },
  { key: 'pattern_cutter', label: 'Pattern Cutter' },
  { key: 'issuer', label: 'Issuer' },
  { key: 'cloth_code', label: 'Cloth Code' },
  { key: 'length', label: 'Length' },
  { key: 'sketch', label: 'Sketch' },
  { key: 'description', label: 'Description' },
  { key: 'note', label: 'Note' },
];