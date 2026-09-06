import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { GARMENT_GLOSSARY } from '../components/InfoTooltip';
import { resetTour } from '../components/GuidedTour';
import OnboardingChecklist from '../components/OnboardingChecklist';
import ReleaseNotesTab from '../components/ReleaseNotesTab';

interface ModuleGuide {
  module: string;
  path: string;
  icon: string;
  steps: string[];
  links: { label: string; path: string }[];
}

const MODULE_GUIDES: ModuleGuide[] = [
  {
    module: 'Dashboard',
    path: '/dashboard',
    icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
    steps: [
      'See your tasks (assigned T&A milestones), order pipeline, financials, and alerts at a glance',
      'Click any card or stage to drill into the relevant list',
    ],
    links: [
      { label: 'Dashboard', path: '/dashboard' },
    ],
  },
  {
    module: 'Merchandising',
    path: '/styles',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
    steps: [
      'Create a Style (number, name, buyer, season) and upload tech packs and sketches',
      'Iterate Style Versions (draft → active → approved) with revision notes',
      'Open a File per buyer/factory to start the production workflow, then create Purchase Orders from it',
      'Add BOMs, Costings, Fit Specs (Dev → 1st → 2nd → 3rd → PP), and Job Requests (pattern/sample/3D/mini-marker)',
    ],
    links: [
      { label: 'Styles', path: '/styles' },
      { label: 'File Openings', path: '/file-openings' },
      { label: 'Purchase Orders', path: '/purchase-orders' },
      { label: 'BOMs', path: '/boms' },
      { label: 'Costings', path: '/costings' },
      { label: 'Fit Specs', path: '/fit-specs' },
      { label: 'Job Requests', path: '/jobs' },
    ],
  },
  {
    module: 'T&A (Time & Action)',
    path: '/tas',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    steps: [
      'Auto-created for every confirmed PO',
      'Add milestones (Pattern Making → Fabric Sourcing → Sample Dev → Lab Dip → Bulk Fabric → Trim Sourcing → Production → Inspection → Packing → Shipment Ready)',
      'Use templates — Standard Export Order, Fast Track Order, Domestic Order, or Blank — or Quick Add individual milestones',
      'Assign owners, mark critical path, and monitor via List, Calendar, and Heatmap views',
    ],
    links: [
      { label: 'List', path: '/tas' },
      { label: 'Calendar', path: '/tas/calendar' },
      { label: 'Heatmap', path: '/tas/heatmap' },
    ],
  },
  {
    module: 'Fabric',
    path: '/fabric/categories',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    steps: [
      'Set up Categories, HTS Codes, Suppliers, and Mills',
      'Raise RFQs, compare supplier quotes, and convert winners into Bookings and Orders',
      'Track each fabric order through Lab Dip Pending → Lab Dip Approved → Bulk Approved → In Production → Shipped → Delivered',
      'Record Dockets, Inventory, Tolerances (by customer type), and Utilization',
    ],
    links: [
      { label: 'Categories', path: '/fabric/categories' },
      { label: 'HTS Codes', path: '/fabric/hts-codes' },
      { label: 'Suppliers', path: '/fabric/suppliers' },
      { label: 'Mills', path: '/fabric/mills' },
      { label: 'RFQs', path: '/fabric/rfqs' },
      { label: 'Bookings', path: '/fabric/bookings' },
      { label: 'Orders', path: '/fabric/orders' },
      { label: 'Dockets', path: '/fabric/dockets' },
      { label: 'Tolerances', path: '/fabric/tolerances' },
      { label: 'Utilization', path: '/fabric/utilizations' },
    ],
  },
  {
    module: 'Production',
    path: '/production',
    icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
    steps: [
      'Create Production Plans linked to POs — factory and quantity default from the order',
      'Track daily output with target/actual, passed/rejected, efficiency, DHU, and manpower',
      'Factories enter their numbers via the Factory Portal; managers approve Daily Reports',
      'Order Manager gives a buyer/status/risk view across every order with gold-seal status',
    ],
    links: [
      { label: 'Plans', path: '/production' },
      { label: 'Daily Reports', path: '/production/daily' },
      { label: 'Order Manager', path: '/order-manager' },
      { label: 'Factory Portal', path: '/production/portal' },
      { label: 'Dashboard', path: '/production/dashboard' },
    ],
  },
  {
    module: 'Quality',
    path: '/quality',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    steps: [
      'Schedule Inline, Final, or Pre-Shipment inspections with an AQL level',
      'Record defects (critical / major / minor) and passed vs rejected quantities',
      'Open Corrective Actions for failures and verify fixes (open → in progress → completed → verified → closed)',
      'Track Gold Seals per shipment and run weekly Compliance Audits against the 8 checkpoints',
    ],
    links: [
      { label: 'Inspections', path: '/quality' },
      { label: 'Corrective Actions', path: '/quality/caps' },
      { label: 'Gold Seals', path: '/quality/gold-seals' },
      { label: 'Compliance Audit', path: '/quality/compliance-audits' },
      { label: 'Dashboard', path: '/quality/dashboard' },
    ],
  },
  {
    module: 'Logistics',
    path: '/logistics',
    icon: 'M8 17l4 4 4-4m-8-6l4-4 4 4m-4-4v12',
    steps: [
      'Create Shipments with container, vessel, ETD/ETA and move through 10 statuses (booking → booked → picked up → in transit → at port → on water → arrived → cleared → delivered)',
      'Maintain the weekly Booking Schedule (booking reference due ETA − 14 days) and Freight Forwarders',
      'Compare paperwork (expected vs actual, over/short) and reconcile Final Hits (docket vs shipped)',
      'Flag over-limit dockets and final-hit shortages — shortages beyond tolerance trigger a Debit Note',
    ],
    links: [
      { label: 'Shipments', path: '/logistics' },
      { label: 'Booking Schedule', path: '/logistics/booking-schedule' },
      { label: 'Freight Forwarders', path: '/logistics/forwarders' },
      { label: 'Paperwork Comparison', path: '/paperwork-comparison' },
      { label: 'Final Hit Reconciliation', path: '/logistics/reconciliations' },
      { label: 'Dashboard', path: '/logistics/dashboard' },
    ],
  },
  {
    module: 'Commercial',
    path: '/pis',
    icon: 'M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z',
    steps: [
      'Generate Proforma Invoices from confirmed POs (draft → sent → accepted / rejected)',
      'Manage Master and Back-to-Back LCs with utilization tracking and amendments',
      'Create Sales Contracts and Sales Confirmations — confirmations carry a 48-hour dispute window and auto-accept when undisputed',
      'Raise Debit Notes (pro forma → issued → paid) and approve fabric / trimmings / factory invoices against the order',
    ],
    links: [
      { label: 'Proforma Invoices', path: '/pis' },
      { label: 'Letters of Credit', path: '/lcs' },
      { label: 'Sales Contracts', path: '/scs' },
      { label: 'Sales Confirmations', path: '/sales-confirmations' },
      { label: 'Debit Notes', path: '/debit-notes' },
      { label: 'Invoice Approvals', path: '/invoice-approvals' },
      { label: 'Banks', path: '/banks' },
    ],
  },
  {
    module: 'Reports',
    path: '/reports',
    icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    steps: [
      'Run pre-built reports across Orders, Production, Commercial, Quality, Inventory, and Financial data',
      'Build custom reports with the Builder — pick a data source, columns, and filters, then preview and save',
    ],
    links: [
      { label: 'Dashboard', path: '/reports' },
      { label: 'Builder', path: '/reports/builder' },
    ],
  },
  {
    module: 'Admin & Setup',
    path: '/setup',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
    steps: [
      'Configure master data: company/tenant, offices, buyers, factories, currencies, seasons, categories, payment terms, UOMs, countries, color codes, and more',
      'Manage users, roles, and permissions (RBAC)',
      'Review Audit Logs (create/update/delete/view/export/transition) and run System Health checks',
    ],
    links: [
      { label: 'Setup', path: '/setup' },
      { label: 'Users', path: '/admin/users' },
      { label: 'Roles', path: '/admin/roles' },
      { label: 'Audit Logs', path: '/admin/audit-logs' },
      { label: 'Health', path: '/admin/health' },
    ],
  },
];

interface Workflow {
  title: string;
  icon: string;
  steps: string[];
  links: { label: string; path: string }[];
}

const WORKFLOWS: Workflow[] = [
  {
    title: 'Order Lifecycle',
    icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
    steps: [
      'Buyer Inquiry', 'Style', 'Style Versioning', 'Style Approval', 'File Opening',
      'Purchase Order', 'Costing per PO', 'Costing Approval', 'Confirm POs',
      'Generate T&A per PO', 'Sourcing', 'Procurement', 'Production', 'Quality Check',
      'Passed', 'Shipment', 'Document Preparation', 'Dispatch', 'Delivery Confirmation',
      'Invoice & Payment', 'PO Complete',
    ],
    links: [
      { label: 'Styles', path: '/styles' },
      { label: 'File Openings', path: '/file-openings' },
      { label: 'Purchase Orders', path: '/purchase-orders' },
      { label: 'Costings', path: '/costings' },
      { label: 'Order Manager', path: '/order-manager' },
    ],
  },
  {
    title: 'T&A Process',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    steps: [
      'PO Confirmed', 'Generate T&A', 'Set Milestones', 'Assign Owners', 'Monitor Progress',
      'On Track? Yes → Continue', 'Off Track → Escalate & Correct', 'All Milestones Complete', 'Ship Ready',
    ],
    links: [
      { label: 'List', path: '/tas' },
      { label: 'Calendar', path: '/tas/calendar' },
      { label: 'Heatmap', path: '/tas/heatmap' },
    ],
  },
  {
    title: 'Costing Workflow',
    icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
    steps: [
      'Get BOM', 'Fabric Cost', 'Trim Cost', 'CM (Making) Cost', 'Overhead', 'Add Margin',
      'Within Target? No → Revise / Negotiate', 'Yes → Submit for Approval', 'Approved → Version Locked',
    ],
    links: [
      { label: 'BOMs', path: '/boms' },
      { label: 'Costings', path: '/costings' },
    ],
  },
  {
    title: 'Sourcing & Procurement',
    icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
    steps: [
      'Material Requirement', 'Raise RFQ', 'Send to Suppliers', 'Receive & Compare Quotes',
      'Select Supplier', 'Fabric Booking', 'Bulk Fabric Order', 'Lab Dip Approval',
      'Track Delivery', 'Goods Receive',
    ],
    links: [
      { label: 'RFQs', path: '/fabric/rfqs' },
      { label: 'Bookings', path: '/fabric/bookings' },
      { label: 'Orders', path: '/fabric/orders' },
    ],
  },
  {
    title: 'Commercial Workflow',
    icon: 'M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z',
    steps: [
      'Order Confirmed', 'Create PI', 'Send to Buyer', 'Buyer Confirms', 'Receive Master LC',
      'LC Matches PI? No → Amendment', 'Yes → Accept LC', 'Create B2B LC to Vendor',
      'Track Utilization', 'Reconcile',
    ],
    links: [
      { label: 'Proforma Invoices', path: '/pis' },
      { label: 'Letters of Credit', path: '/lcs' },
      { label: 'Sales Contracts', path: '/scs' },
      { label: 'Sales Confirmations', path: '/sales-confirmations' },
      { label: 'Debit Notes', path: '/debit-notes' },
    ],
  },
  {
    title: 'Shipment Workflow',
    icon: 'M8 17l4 4 4-4m-8-6l4-4 4 4m-4-4v12',
    steps: [
      'Order Ready', 'Booking Request', 'Select Freight Forwarder', 'Confirm Booking',
      'Prepare Documents (Packing List, Commercial Invoice, BL, Certificates)',
      'Factory Loading', 'Container Stuffing', 'Gate In', 'Vessel Loading', 'ETD Confirmed',
      'Track Shipment', 'Port Arrival', 'Customs Clearance', 'Delivery',
    ],
    links: [
      { label: 'Shipments', path: '/logistics' },
      { label: 'Booking Schedule', path: '/logistics/booking-schedule' },
      { label: 'Paperwork Comparison', path: '/paperwork-comparison' },
      { label: 'Final Hit Reconciliation', path: '/logistics/reconciliations' },
    ],
  },
  {
    title: 'Production Workflow',
    icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
    steps: [
      'Production Plan', 'Line Assignment', 'Cutting', 'Sewing', 'Finishing',
      'Quality Check → Pass / Fail (defect marking → repair → recheck)',
      'Pressing', 'Labeling', 'Packing', 'Final Inspection (AQL)', 'Ready for Shipment',
    ],
    links: [
      { label: 'Plans', path: '/production' },
      { label: 'Daily Reports', path: '/production/daily' },
      { label: 'Factory Portal', path: '/production/portal' },
      { label: 'Order Manager', path: '/order-manager' },
    ],
  },
  {
    title: 'Quality Inspection Flow',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    steps: [
      'Inspection Requested', 'Schedule Inspection', 'Select Sample', 'Inspect Items',
      'Record Defects', 'Calculate AQL', 'Pass → Issue Certificate',
      'Fail → Report → Corrective Action → Re-inspection',
    ],
    links: [
      { label: 'Inspections', path: '/quality' },
      { label: 'Corrective Actions', path: '/quality/caps' },
      { label: 'Gold Seals', path: '/quality/gold-seals' },
      { label: 'Compliance Audit', path: '/quality/compliance-audits' },
    ],
  },
  {
    title: 'Approval Workflow',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    steps: [
      'Request Submitted', 'Level 1 Approval', 'Level 2 Required?', 'Level 3 Approval',
      'Approved', 'Rejected → Return with Comments', 'Revise & Resubmit',
    ],
    links: [
      { label: 'Costings', path: '/costings' },
      { label: 'Invoice Approvals', path: '/invoice-approvals' },
      { label: 'Roles', path: '/admin/roles' },
    ],
  },
];

const FAQ = [
  {
    q: 'How do I start a new order?',
    a: 'Create a Style under Merchandising → Styles. Approve a Style Version, then open a File (Merchandising → File Openings) linking the style to a buyer and factory. Create a Purchase Order from the file, add BOM & Costing, and confirm it — confirmation auto-creates the T&A, Proforma Invoice, and Sales Contract.',
  },
  {
    q: 'What is the Status Transition Wizard?',
    a: 'It\'s the guided tool on a PO detail page that shows you which status transitions are available, what side effects they trigger (e.g., confirming a PO auto-creates the T&A, PI, and Sales Contract), and any warnings before you confirm.',
  },
  {
    q: 'How does the Order Journey work?',
    a: 'Every PO detail page shows a visual stepper at the top tracking your progress through the entire lifecycle (draft → open → confirmed → in_production → quality_check → ready → shipped → delivered). Click any step to navigate there.',
  },
  {
    q: 'Can I bulk-create T&A milestones?',
    a: 'Yes. Open a PO detail page → T&A tab → "From Template" to pick a pre-built template (Standard Export Order, Fast Track Order, Domestic Order, or Blank), or use "Quick Add" for individual milestones.',
  },
  {
    q: 'How do I generate a Proforma Invoice?',
    a: 'Open a PO detail page. Once the PO is confirmed (not draft), the PI is auto-generated. Manage it under Commercial → Proforma Invoices (draft → sent → accepted / rejected).',
  },
  {
    q: 'What does the Financials tab show?',
    a: 'The Financials tab on the Dashboard and PO detail pages shows revenue, cost breakdown (fabric / trims / CM / overhead), profit margin, LC totals and utilization, and per-unit economics.',
  },
  {
    q: 'What is the difference between a Master LC and a Back-to-Back LC?',
    a: 'The Master LC is the letter of credit received from your buyer. The Back-to-Back LC is the one your buying house opens to its vendor (factory/supplier), backed by the Master LC. Both live under Commercial → Letters of Credit, with utilization tracked against the LC amount.',
  },
  {
    q: 'How do Sales Confirmations work?',
    a: 'A Sales Confirmation is sent to the buyer with a 48-hour dispute window (Commercial → Sales Confirmations). If the buyer does not dispute within 48 hours, it is auto-accepted.',
  },
  {
    q: 'When should I raise a Debit Note?',
    a: 'Raise one as soon as an issue is confirmed: fabric over/under tolerance, fabric or trim shortages, or a final-hit shortage. Final Hit Reconciliation auto-suggests a debit when a shipment is short by more than 20 units. Debit notes move pro forma → issued → paid and are managed by finance (Commercial → Debit Notes).',
  },
  {
    q: 'What is a Gold Seal and how do I track it?',
    a: 'The Gold Seal is the approved sample a factory must match for a shipment — customer technical sign-off. Track it under Quality → Gold Seals per shipment (pending → sent → approved / rejected).',
  },
  {
    q: 'What is the Compliance Audit?',
    a: 'A weekly per-order review (Quality → Compliance Audit) against 8 checkpoints: fabric paperwork, mini-marker efficiency (must be above 85%), dockets, fabric utilisation, factory invoice vs delivered & cut, fabric rating, recon costed vs actual, and final hits monitoring. Two consecutive warnings, then a third failure is escalated.',
  },
  {
    q: 'How do Final Hit Reconciliations work?',
    a: 'Under Logistics → Final Hit Reconciliation, each shipment compares the docket quantity against the shipped quantity. Over-limit items are flagged and can be reconciled, debited (shortages beyond tolerance), or waived with evidence.',
  },
  {
    q: 'What does Paperwork Comparison do?',
    a: 'It compares expected vs actual fabric paperwork per order and flags over/short positions against the agreed tolerance, so fabric over-deliveries and shortages surface before they reach compliance.',
  },
  {
    q: 'How do I source fabric?',
    a: 'Under Fabric: set up Suppliers and Mills, raise an RFQ to collect quotes, compare responses, then convert the winning quote into a Booking or a bulk Order. The order moves through Lab Dip Pending → Lab Dip Approved → Bulk Approved → In Production → Shipped → Delivered.',
  },
  {
    q: 'How do Reports work?',
    a: 'Reports → Dashboard runs pre-built reports across orders, production, commercial, quality, inventory, and financial data. Use the Builder to design custom reports (data source → columns → filters → preview → save) and run them on demand.',
  },
  {
    q: 'Where can I find audit history and system health?',
    a: 'Admin → Audit Logs records create/update/delete/view/export/transition actions with who and when. Admin → Health runs system checks (healthy / degraded / down).',
  },
  {
    q: 'How do roles and permissions work?',
    a: 'Admin → Roles defines what each role can access, and Admin → Users assigns roles to team members. Access is enforced per-tenant (multi-tenant RBAC), so each tenant only sees its own data.',
  },
  {
    q: 'Can I replay the guided tour?',
    a: 'Yes — press the "Replay Guided Tour" button at the top of this Help Center, or open Dashboard and use the tour controls. The tour walks through the dashboard, the order lifecycle, and getting started.',
  },
];

type TabKey = 'getting-started' | 'workflows' | 'modules' | 'onboarding' | 'glossary' | 'release-notes' | 'faq';

const LIFECYCLE_SPINE = [
  'Buyer Inquiry', 'Style', 'Style Version', 'Style Approval', 'File Opening', 'PO',
  'Costing', 'Costing Approved', 'Confirm POs', 'T&A', 'Sourcing', 'Procurement',
  'Production', 'Quality Check', 'Passed', 'Shipment', 'Documents', 'Dispatch',
  'Delivery', 'Invoice & Payment', 'PO Complete',
];

export default function HelpPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('getting-started');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [glossarySearch, setGlossarySearch] = useState('');

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-surface rounded-xl border border-border p-6 text-center">
          <h2 className="text-xl font-bold text-heading mb-2">BHMS Help Center</h2>
          <p className="text-sm text-muted">Workflows, module guides, glossary, and answers to common questions.</p>
          <button
            onClick={() => { resetTour(); window.location.reload(); }}
            className="mt-3 px-4 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
          >
            Replay Guided Tour
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface rounded-xl border border-border p-1 flex-wrap">
          {[
            { key: 'getting-started' as const, label: 'Getting Started' },
            { key: 'workflows' as const, label: 'Workflows' },
            { key: 'modules' as const, label: 'Modules' },
            { key: 'onboarding' as const, label: 'Onboarding' },
            { key: 'glossary' as const, label: 'Glossary' },
            { key: 'release-notes' as const, label: 'Release Notes' },
            { key: 'faq' as const, label: 'FAQ' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 px-4 py-2 text-sm rounded-lg transition-colors ${activeTab === t.key ? 'bg-emerald-600 text-white' : 'text-muted hover:text-heading hover:bg-surface-alt'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Getting Started */}
        {activeTab === 'getting-started' && (
          <div className="space-y-4">
            <div className="bg-surface rounded-xl border border-border p-6">
              <h3 className="text-sm font-bold text-heading mb-4">The Garment Order Lifecycle</h3>
              <div className="flex flex-wrap gap-2">
                {LIFECYCLE_SPINE.map((step, i) => (
                  <div key={step} className="flex items-center gap-2">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5 text-center">
                      <p className="text-[10px] text-emerald-400 font-medium">{i + 1}</p>
                      <p className="text-xs text-heading font-medium whitespace-nowrap">{step}</p>
                    </div>
                    {i < LIFECYCLE_SPINE.length - 1 && <svg className="w-3.5 h-3.5 text-faint flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {[
                { step: 1, title: 'Create a Style', desc: 'Define the garment: style number, name, buyer, season, and tech pack.', path: '/styles', action: 'Go to Styles' },
                { step: 2, title: 'Open a File', desc: 'Link the approved style version to a buyer and factory to start the workflow.', path: '/file-openings', action: 'Go to File Openings' },
                { step: 3, title: 'Create a Purchase Order', desc: 'Set quantities, pricing, delivery date, and destination.', path: '/purchase-orders', action: 'Go to Purchase Orders' },
                { step: 4, title: 'Add BOM & Costing', desc: 'Build the bill of materials, then create and approve the costing.', path: '/costings', action: 'Go to Costings' },
                { step: 5, title: 'Confirm & Track', desc: 'Confirm the PO with the Status Wizard — it auto-creates T&A, PI, and Sales Contract.', path: '/order-manager', action: 'Open Order Manager' },
                { step: 6, title: 'Execute & Ship', desc: 'Source fabric, run production, inspect quality, and ship — all tracked from the dashboard.', path: '/logistics', action: 'Go to Logistics' },
              ].map(s => (
                <div key={s.step} className="bg-surface rounded-xl border border-border p-5 flex items-center gap-4">
                  <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">{s.step}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-heading">{s.title}</p>
                    <p className="text-xs text-muted mt-0.5">{s.desc}</p>
                  </div>
                  <button onClick={() => navigate(s.path)} className="text-xs text-emerald-400 hover:text-emerald-300 font-medium whitespace-nowrap">{s.action} →</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Workflows */}
        {activeTab === 'workflows' && (
          <div className="grid grid-cols-1 gap-3">
            {WORKFLOWS.map(w => (
              <div key={w.title} className="bg-surface rounded-xl border border-border p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-surface-alt border border-border rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={w.icon} />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-heading">{w.title}</h3>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {w.steps.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5">
                      <span className="bg-emerald-500/5 border border-emerald-500/15 rounded-md px-2 py-1 text-[11px] text-muted leading-tight">{s}</span>
                      {i < w.steps.length - 1 && <svg className="w-3 h-3 text-faint flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {w.links.map(l => (
                    <button
                      key={l.path}
                      onClick={() => navigate(l.path)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                      {l.label} →
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modules */}
        {activeTab === 'modules' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {MODULE_GUIDES.map(m => (
              <div key={m.module} className="bg-surface rounded-xl border border-border p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-surface-alt border border-border rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={m.icon} />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-heading">{m.module}</h3>
                </div>
                <ol className="space-y-1.5">
                  {m.steps.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted">
                      <span className="text-emerald-400 font-mono mt-px">{i + 1}.</span>
                      {s}
                    </li>
                  ))}
                </ol>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
                  {m.links.map(l => (
                    <button
                      key={l.path}
                      onClick={() => navigate(l.path)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                      {l.label} →
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Glossary */}
        {activeTab === 'glossary' && (
          <div className="space-y-3">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search glossary terms..."
                value={glossarySearch}
                onChange={(e) => setGlossarySearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-surface border border-border rounded-lg text-heading placeholder-faint focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>
            <div className="bg-surface rounded-xl border border-border divide-y divide-border">
              {Object.entries(GARMENT_GLOSSARY)
                .filter(([term, definition]) => {
                  if (!glossarySearch) return true;
                  const q = glossarySearch.toLowerCase();
                  return term.toLowerCase().includes(q) || definition.toLowerCase().includes(q);
                })
                .map(([term, definition]) => (
                  <div key={term} className="p-4">
                    <p className="text-sm font-bold text-heading">{term}</p>
                    <p className="text-xs text-muted mt-1 leading-relaxed">{definition}</p>
                  </div>
                ))}
              {Object.entries(GARMENT_GLOSSARY).filter(([term, definition]) => {
                if (!glossarySearch) return false;
                const q = glossarySearch.toLowerCase();
                return !term.toLowerCase().includes(q) && !definition.toLowerCase().includes(q);
              }).length === 0 && glossarySearch && Object.keys(GARMENT_GLOSSARY).length > 0 && (
                <div className="p-4 text-center">
                  <p className="text-xs text-muted">No terms match &quot;{glossarySearch}&quot;</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Onboarding */}
        {activeTab === 'onboarding' && (
          <OnboardingChecklist />
        )}

        {/* Release Notes */}
        {activeTab === 'release-notes' && (
          <ReleaseNotesTab />
        )}

        {/* FAQ */}
        {activeTab === 'faq' && (
          <div className="space-y-2">
            {FAQ.map((item, i) => (
              <div key={i} className="bg-surface rounded-xl border border-border overflow-hidden">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <span className="text-sm font-medium text-heading">{item.q}</span>
                  <svg className={`w-4 h-4 text-faint transition-transform ${expandedFaq === i ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedFaq === i && (
                  <div className="px-4 pb-4">
                    <p className="text-xs text-muted leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
