import { Link } from 'react-router-dom';

const MODULES = [
  { name: 'Design', path: '/design', description: 'Design register, tech pack import, fit specs and design costings.' },
  { name: 'Merchandising', path: '/file-openings', description: 'File openings, purchase orders, BOMs and costings.' },
  { name: 'T&A', path: '/tas', description: 'Time and action tracker with calendar and heatmap views.' },
  { name: 'Fabric', path: '/fabric/orders', description: 'Fabric categories, suppliers, mills, bookings and orders.' },
  { name: 'Production', path: '/production', description: 'Production plans, daily reports and factory portal.' },
  { name: 'Quality', path: '/quality', description: 'Inspections, corrective actions, gold seals and compliance audits.' },
  { name: 'Logistics', path: '/logistics', description: 'Shipments, recaps, supplier payments and cost reconciliations.' },
  { name: 'Commercial', path: '/pis', description: 'Proforma invoices, letters of credit and sales contracts.' },
  { name: 'Reports', path: '/reports', description: 'Report dashboard, builder and report viewers.' },
  { name: 'Admin', path: '/setup', description: 'Setup, users, roles, audit logs and health.' },
];

export default function DashboardPage() {
  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-xl font-semibold text-heading">Dashboard</h1>
      <p className="text-muted mt-1 text-sm">
        Pick a module to explore the interactive prototype screens.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => (
          <Link
            key={m.name}
            to={m.path}
            className="block bg-surface border border-border rounded-xl p-4 transition-colors hover:border-emerald-500"
          >
            <h2 className="font-medium text-heading">{m.name}</h2>
            <p className="text-muted text-sm mt-1">{m.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}