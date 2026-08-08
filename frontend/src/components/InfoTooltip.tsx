import { useState, useRef, useEffect } from 'react';

interface InfoTooltipProps {
  content: string;
  className?: string;
}

export default function InfoTooltip({ content, className = '' }: InfoTooltipProps) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!show) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShow(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [show]);

  return (
    <span ref={ref} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="text-faint hover:text-muted transition-colors"
        aria-label="More info"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 bg-heading text-white text-xs rounded-lg shadow-lg z-50 leading-relaxed pointer-events-none">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-heading rotate-45 -mt-1" />
        </div>
      )}
    </span>
  );
}

export const GARMENT_GLOSSARY: Record<string, string> = {
  'BOM': 'Bill of Materials — defines all fabric, trims, and components needed for production.',
  'AQL': 'Acceptable Quality Level — the maximum defect rate allowed during quality inspection.',
  'CM': 'Cut & Make — the manufacturing cost to cut fabric and sew the garment.',
  'T&A': 'Time & Action — milestone-based production timeline tracking key deadlines.',
  'PI': 'Proforma Invoice — preliminary invoice issued before shipment for buyer confirmation.',
  'SC': 'Sales Contract — formal agreement between buyer and factory for an order.',
  'LC': 'Letter of Credit — payment guarantee from a bank used in international trade.',
  'FO': 'File Opening — links a style to a buyer and factory, initiating the production workflow.',
  'TA': 'Time & Action — see T&A above.',
  'Costing': 'Detailed cost breakdown of a purchase order including fabric, trims, CM, and overhead.',
  'Amendment': 'A formal change request to an existing purchase order (quantity, price, date, etc.).',
  'Corrective Action': 'CAPA — Corrective and Preventive Action taken after a quality issue.',
  'Style': 'A product design/template for a garment with associated specifications.',
  'Buyer': 'The customer/ordering party who places purchase orders.',
  'Factory': 'The manufacturing facility that produces the garments.',
  'Style Version': 'A revision of a style (draft → active → approved). File openings and BOMs hang off a specific version.',
  'RFQ': 'Request for Quotation — sent to fabric suppliers to collect prices before booking or bulk ordering.',
  'Fabric Booking': 'Advance reservation of fabric quantity with a supplier before the bulk order is placed.',
  'Lab Dip': 'A fabric colour sample submitted for approval before bulk production can start.',
  'Bulk': 'Bulk fabric production or order that begins after lab dip approval.',
  'Docket': 'Fabric delivery note recording meters delivered vs cut, used to reconcile fabric consumption.',
  'Final Hit': 'The final shipped quantity per shipment; shortages beyond tolerance trigger debit notes.',
  'Gold Seal': 'The approved sample that the factory must match for a shipment — customer technical sign-off (pending → sent → approved/rejected).',
  'Debit Note': 'A formal claim against a factory or supplier for shortages, over-tolerance fabric, or other charges (pro forma → issued → paid).',
  'CAP': 'Corrective and Preventive Action — the formal fix-and-verify cycle after a quality failure.',
  'Fit Spec': 'Fit specification recording garment measurements by stage (Dev, 1st, 2nd, 3rd, Pre-Production).',
  'Mini-Marker': 'Marker efficiency check that should stay above 85% (Compliance Audit item).',
  'Master LC': 'Letter of Credit received from the buyer (customer) for an order.',
  'Back-to-Back LC': 'An LC opened by the buying house to its vendor, backed by the Master LC.',
  'Sales Confirmation': 'Order confirmation sent to the buyer with a 48-hour dispute window; auto-accepted if undisputed.',
  'HTS Code': 'Harmonized Tariff Schedule code used to classify and tax imported fabric.',
  'Booking Schedule': 'Weekly logistics schedule tracking shipments per week (Live / In Work / Delivered).',
  'Invoice Approval': 'Approval workflow for fabric, trimmings, and factory invoices against the order.',
  'Pre-Shipment Inspection': 'Final inspection before loading, measured against the AQL standard.',
  'Status Transition': 'A lifecycle move between statuses (e.g., draft → confirmed) performed via the Status Wizard.',
  'Draft': 'A working, uncommitted state before a record is finalised or approved.',
};
