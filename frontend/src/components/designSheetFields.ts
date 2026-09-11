import type { DesignSheet } from '../api/client';

export const DESIGN_SHEET_STATUSES = ['new', 'rejected', 'closed', 'production', 'archived'];

export const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  rejected: 'Rejected',
  closed: 'Closed',
  production: 'Production',
  archived: 'Archived',
};

export const RELATIONSHIP_LABELS: Record<string, string> = {
  new: 'New',
  based_on: 'Based On',
  na: 'NA',
  recut: 'Recut',
};

export const RELATIONSHIP_OPTIONS: { value: string; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'based_on', label: 'Based On' },
  { value: 'na', label: 'NA' },
  { value: 'recut', label: 'Recut' },
];

export const DESIGN_INFO_FIELDS: { key: keyof DesignSheet; label: string }[] = [
  { key: 'issue_date', label: 'Issue Date' },
  { key: 'block', label: 'Block' },
  { key: 'based_on', label: 'Based On' },
  { key: 'relationship', label: 'Relationship' },
  { key: 'style_number', label: 'Style Number' },
  { key: 'season', label: 'Season' },
  { key: 'size', label: 'Size' },
  { key: 'designer', label: 'Designer' },
  { key: 'pattern_cutter', label: 'Pattern Cutter' },
  { key: 'issuer', label: 'Issuer' },
  { key: 'cloth_code', label: 'Cloth Code' },
  { key: 'length', label: 'Length' },
  { key: 'risk_date', label: 'Risk Date' },
  { key: 'pattern_request_date', label: 'Pattern Request Date' },
  { key: 'sketch', label: 'Sketch' },
  { key: 'description', label: 'Description' },
  { key: 'note', label: 'Note' },
];