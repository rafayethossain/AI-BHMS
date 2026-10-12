import { designSeed } from './seed';
import type {
  BomCategory,
  BomStatus,
  DesignBomItem,
  DesignDetailCore,
  DesignFileOpening,
  DesignImage,
  DesignItem,
  DesignPO,
  DesignRegisterRow,
  DesignSketch,
  DesignTechPack,
  DesignVersion,
  DesignVersionStatus,
  POStatus,
  TechPackStatus,
} from './types';

const TODAY = '2026-09-10';

const PO_STATUSES: POStatus[] = [
  'open',
  'in_production',
  'quality_check',
  'delivered',
  'ready',
  'shipped',
  'draft',
  'confirmed',
  'cancelled',
  'in_production',
  'open',
];

const FABRIC: DesignPO['fabric_status'][] = ['delivered', 'in_work', 'sticky_red', 'none'];

const BOM_CATEGORIES: BomCategory[] = ['trims', 'labels', 'accessories', 'other'];
const BOM_STATUSES: BomStatus[] = ['Ordered', 'TBC', 'Partial', 'Completed'];
const BOM_DESCRIPTIONS = [
  'NYLON ZIPPER FRONT FLY',
  'WOVEN BRAND LABEL',
  'BUTTON 4 HOLES',
  'POLY BAG 12x16',
  'ELASTIC BAND',
  'CARE LABEL',
];
const SUPPLIERS = ['YKK', 'FOURSEASONS', 'KT TRIMS', 'DOAN KET'];
const FACTORIES = ['Dhaka Apparels', 'Chittagong Knit', 'Gazipur Textiles', 'Narayanganj Fashions'];
const TECH_PACK_STATUSES: TechPackStatus[] = ['imported', 'review', 'extracting', 'not_started'];

const TECH_PACK_SECTIONS = [
  { key: 'sketches', label: 'Sketches' },
  { key: 'design_images', label: 'Design images' },
  { key: 'tech_packs', label: 'Tech packs' },
  { key: 'fit_specs', label: 'Fit specs' },
  { key: 'job_requests', label: 'Job requests' },
  { key: 'materials', label: 'Materials' },
];

const COLORS = ['BLACK', 'NAVY', 'MINT', 'ECRU', 'BROWN'];
const SIZES = ['S', 'M', 'L', 'XL'];

let bomSeq = 0;
let noteSeq = 0;

function pad(n: number, width = 3): string {
  return String(n).padStart(width, '0');
}

function versionStatus(row: DesignRegisterRow, isCurrent: boolean): DesignVersionStatus {
  if (row.status === 'archived') return 'delivered';
  if (row.status === 'draft') return 'draft';
  return isCurrent ? 'in_production' : 'approved';
}

function versionsFor(row: DesignRegisterRow, i: number): DesignVersion[] {
  const count = row.current_version === 'v2' ? 2 : 1;
  const out: DesignVersion[] = [];
  for (let v = 1; v <= count; v += 1) {
    const isCurrent = v === count;
    out.push({
      id: `${row.id}-v${v}`,
      version_number: `v${v}`,
      fn_number: `FO-2025-${pad(100 + i * 2 + v)}`,
      status: versionStatus(row, isCurrent),
      is_current: isCurrent,
      is_quick_lead: i % 5 === 0 && v === 1,
      quick_lead_agreed_by: i % 5 === 0 && v === 1 ? 'merchandising' : '',
      is_repeat: i % 4 === 0 && v === 1,
      original_fn: i % 4 === 0 && v === 1 ? `FO-2024-${pad(50 + i)}` : '',
      repeat_approved_by: i % 4 === 0 && v === 1 ? 'merchandising' : '',
      revision_notes: v === 1 ? 'Initial issue' : 'Buyer fit comments applied',
      issue_date: row.issue_date,
      quantity: 1000 + i * 50,
      unit_price: (3 + (i % 5) * 0.75).toFixed(2),
      stock_fabric: i % 6 === 0,
    });
  }
  return out;
}

function fileOpeningsFor(
  row: DesignRegisterRow,
  i: number,
  versions: DesignVersion[],
): DesignFileOpening[] {
  return versions.map((v) => {
    const note: DesignFileOpening['notes'][number] = {
      id: `${row.id}-${v.version_number}-note-${(noteSeq += 1)}`,
      author: 'F. Rahman',
      action: 'Opened',
      note: 'Commercial file opened for the version',
      milestone_date: row.issue_date,
    };
    return {
      id: `${row.id}-${v.version_number}-fo`,
      fn_number: v.fn_number,
      version_number: v.version_number,
      buyer: row.buyer,
      factory: FACTORIES[i % FACTORIES.length],
      status: v.status,
      open_date: row.issue_date,
      approved_date: v.status === 'draft' ? '' : '2026-08-20',
      notes: [note],
      ...(v.stock_fabric && {
        stock_description: 'Stock fabric roll',
        total_meters: 500,
        allocations: [
          {
            id: `${row.id}-${v.version_number}-alloc-1`,
            allocated_to: 'FO-2025-102',
            meters: 120,
            notes: 'Sewing trial',
          },
        ],
      }),
    };
  });
}

function posFor(row: DesignRegisterRow, i: number, versions: DesignVersion[]): DesignPO[] {
  const current = versions[versions.length - 1];
  const count = row.design_code === 'REG-1004'
    ? 11
    : Math.min(3, Math.max(1, row.live_po_count + row.completed_po_count));
  const out: DesignPO[] = [];
  for (let p = 0; p < count; p += 1) {
    const status = PO_STATUSES[p % PO_STATUSES.length];
    const overdue = p < 3;
    const quantity = 1000 + i * 100 + p * 50;
    const unitPrice = 3 + (p % 4) * 0.5;
    out.push({
      id: `${row.id}-po-${p + 1}`,
      po_number: `PO-2025-${pad(i * 10 + p + 1, 4)}`,
      version_number: current.version_number,
      fn_number: current.fn_number,
      buyer: row.buyer,
      factory: FACTORIES[i % FACTORIES.length],
      currency: 'USD',
      quantity,
      unit_price: unitPrice.toFixed(2),
      total_value: (quantity * unitPrice).toFixed(2),
      delivery_date: overdue ? `2026-0${7 + (p % 2)}-20` : `2026-${10 + (p % 3)}-15`,
      status,
      fabric_status: FABRIC[p % FABRIC.length],
      daily_production_qty: status === 'in_production' ? Math.round(quantity * 0.9) : 0,
      schedule_qty: status === 'in_production' ? Math.round(quantity * 0.1) : 0,
    });
  }
  return out;
}

function itemsFor(row: DesignRegisterRow, i: number): DesignItem[] {
  const count = row.design_code === 'REG-1001' ? 4 : 2;
  return Array.from({ length: count }, (_, n) => ({
    id: `${row.id}-item-${n + 1}`,
    item_code: `${row.design_code}-${SIZES[n % SIZES.length]}`,
    colour: COLORS[(i + n) % COLORS.length],
    size: SIZES[n % SIZES.length],
    colour_ways: 1 + (n % 3),
    quantity: 300 + n * 75,
  }));
}

function bomFor(row: DesignRegisterRow, versions: DesignVersion[]): DesignBomItem[] {
  const current = versions[versions.length - 1];
  const count = row.design_code === 'REG-1001' ? 6 : 3;
  return Array.from({ length: count }, (_, n) => {
    const seq = bomSeq;
    bomSeq += 1;
    return {
      id: `${row.id}-bom-${n + 1}`,
      version_number: current.version_number,
      category: BOM_CATEGORIES[seq % BOM_CATEGORIES.length],
      description: BOM_DESCRIPTIONS[seq % BOM_DESCRIPTIONS.length],
      code: `B${pad(100 + seq)}`,
      supplier: SUPPLIERS[seq % SUPPLIERS.length],
      unit: seq % 3 === 0 ? 'm' : 'pcs',
      qty: 1 + (seq % 5),
      status: BOM_STATUSES[seq % BOM_STATUSES.length],
      ta_date: '2026-09-25',
    };
  });
}

function imagesFor(row: DesignRegisterRow): DesignImage[] {
  const count = row.design_code === 'REG-1001' ? 3 : 2;
  return Array.from({ length: count }, (_, n) => ({
    id: `${row.id}-img-${n + 1}`,
    label: ['Front view', 'Back view', 'Trim detail'][n % 3],
    url: `https://picsum.photos/seed/${row.design_code}-${n}/400/400`,
    annotation: n === 0 ? 'Approved by buyer' : '',
    uploaded_at: row.created_at,
  }));
}

function sketchesFor(row: DesignRegisterRow, versions: DesignVersion[]): DesignSketch[] {
  const count = row.design_code === 'REG-1001' ? 2 : 1;
  return Array.from({ length: count }, (_, n) => ({
    id: `${row.id}-sketch-${n + 1}`,
    label: `Sketch ${n + 1}`,
    url: `https://picsum.photos/seed/${row.design_code}-sketch-${n}/480/480`,
    version_number: versions[versions.length - 1 - (n % versions.length)].version_number,
  }));
}

function techPacksFor(row: DesignRegisterRow, i: number, versions: DesignVersion[]): DesignTechPack[] {
  const current = versions[versions.length - 1];
  const status: TechPackStatus =
    row.design_code === 'REG-1001' ? 'imported' : TECH_PACK_STATUSES[i % TECH_PACK_STATUSES.length];
  return [
    {
      id: `${row.id}-tp-1`,
      name: `${row.design_code} tech pack.pdf`,
      version: current.version_number,
      uploaded_at: row.issue_date,
      status,
      sections: TECH_PACK_SECTIONS.map((s, n) => ({
        key: s.key,
        label: s.label,
        progress: status === 'imported' ? 100 : Math.max(0, 100 - n * 15 - (3 - (i % 4)) * 5),
      })),
    },
  ];
}

function buildCore(row: DesignRegisterRow, i: number): DesignDetailCore {
  const versions = versionsFor(row, i);
  return {
    versions,
    file_openings: fileOpeningsFor(row, i, versions),
    pos: posFor(row, i, versions),
    items: itemsFor(row, i),
    bom: bomFor(row, versions),
    images: imagesFor(row),
    sketches: sketchesFor(row, versions),
    tech_packs: techPacksFor(row, i, versions),
  };
}

export const DEMO_TODAY = TODAY;

export const designDetailSeed: Record<string, DesignDetailCore> = Object.fromEntries(
  designSeed.map((row, i) => [row.design_code, buildCore(row, i)]),
);