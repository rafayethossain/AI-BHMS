import type { ReactNode } from 'react';

export interface ReportTableProps {
  columns: string[];
  children: ReactNode;
  testId?: string;
}

export default function ReportTable({ columns, children, testId }: ReportTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-input-border">
      <table data-testid={testId} className="w-full text-sm">
        <thead>
          <tr className="bg-surface-alt text-left text-xs uppercase tracking-wide text-muted">
            {columns.map((c) => (
              <th key={c} className="px-3 py-2 font-medium whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function ReportCell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <td className={`px-3 py-2 align-top text-body ${className}`}>{children}</td>;
}