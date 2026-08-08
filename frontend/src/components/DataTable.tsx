import { useState } from 'react';

export interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  filterOptions?: string[];
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
  className?: string;
}

interface DataTableProps {
  data: Record<string, unknown>[];
  columns: Column[];
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  onSort?: (field: string, order: 'asc' | 'desc') => void;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  onRowClick?: (row: Record<string, unknown>) => void;
  loading?: boolean;
  filters?: Record<string, string>;
  onFilterChange?: (filters: Record<string, string>) => void;
}

export default function DataTable({
  data, columns, totalCount, page, pageSize, onPageChange,
  searchValue, onSearchChange, searchPlaceholder = 'Search...',
  onSort, sortField, sortOrder, onRowClick, loading,
  filters = {}, onFilterChange,
}: DataTableProps) {
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleFilterSelect = (key: string, value: string) => {
    const next = { ...filters, [key]: value };
    if (!value) delete next[key];
    onFilterChange?.(next);
    setOpenFilter(null);
  };

  const handleFilterText = (key: string, value: string) => {
    const next = { ...filters, [key]: value };
    if (!value) delete next[key];
    onFilterChange?.(next);
  };

  const hasActiveFilters = Object.values(filters).some(v => v);

  return (
    <div>
      {hasActiveFilters && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs text-faint">Active filters:</span>
          {Object.entries(filters).map(([key, val]) => {
            const col = columns.find(c => c.key === key);
            return (
              <button key={key} onClick={() => handleFilterSelect(key, '')}
                className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs hover:bg-emerald-500/20 transition-colors">
                {col?.label}: {val.replace('_', ' ')}
                <span className="ml-1 text-emerald-400/60">&times;</span>
              </button>
            );
          })}
          <button onClick={() => onFilterChange?.({})} className="text-xs text-faint hover:text-heading transition-colors">Clear all</button>
        </div>
      )}

      {searchValue !== undefined && onSearchChange && (
        <div className="mb-3">
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full max-w-sm px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm placeholder-faint focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      )}

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <p className="text-lg">No records found</p>
            {hasActiveFilters && <p className="text-sm mt-1">Try clearing filters</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-sm text-muted">
                  {columns.map(col => (
                    <th key={col.key} className={`px-6 py-3 ${col.className || ''}`}>
                      <div className="flex items-center gap-1">
                        {col.sortable && onSort ? (
                          <button onClick={() => onSort(col.key, sortField === col.key && sortOrder === 'asc' ? 'desc' : 'asc')}
                            className="flex items-center gap-1 hover:text-heading transition-colors">
                            {col.label}
                            {sortField === col.key && (
                              <span className="text-emerald-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </button>
                        ) : col.label}
                        {col.filterable && (
                          <div className="relative ml-1">
                            <button onClick={() => setOpenFilter(openFilter === col.key ? null : col.key)}
                              className={`text-xs px-1 rounded ${filters[col.key] ? 'text-emerald-400 bg-emerald-500/10' : 'text-faint hover:text-muted'}`}>
                              ▾
                            </button>
                            {openFilter === col.key && (
                              <div className="absolute top-full left-0 mt-1 z-50 bg-surface border border-input-border rounded-lg shadow-xl p-2 min-w-[150px]">
                                {col.filterOptions ? (
                                  <div className="space-y-1">
                                    <button onClick={() => handleFilterSelect(col.key, '')}
                                      className={`w-full px-2 py-1 text-left text-sm rounded hover:bg-surface-alt ${!filters[col.key] ? 'text-emerald-400' : 'text-body'}`}>
                                      All
                                    </button>
                                    {col.filterOptions.map(opt => (
                                      <button key={opt} onClick={() => handleFilterSelect(col.key, opt)}
                                        className={`w-full px-2 py-1 text-left text-sm rounded hover:bg-surface-alt capitalize ${filters[col.key] === opt ? 'text-emerald-400' : 'text-body'}`}>
                                        {opt.replace('_', ' ')}
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  <input value={filters[col.key] || ''} onChange={(e) => handleFilterText(col.key, e.target.value)}
                                    className="w-full px-2 py-1 bg-input border border-input-border rounded text-heading text-sm focus:outline-none"
                                    placeholder="Filter..." autoFocus />
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx} onClick={() => onRowClick?.(row)}
                    className={`border-b border-border hover:bg-surface-alt/30 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}>
                    {columns.map(col => (
                      <td key={col.key} className={`px-6 py-4 text-sm ${col.className || ''}`}>
                        {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalCount > 0 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-border">
            <p className="text-sm text-muted">
              Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount}
            </p>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => onPageChange(1)}
                className="px-2 py-1 text-sm text-muted hover:text-heading disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                «
              </button>
              <button disabled={page <= 1} onClick={() => onPageChange(page - 1)}
                className="px-2 py-1 text-sm text-muted hover:text-heading disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                ‹
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button key={pageNum} onClick={() => onPageChange(pageNum)}
                    className={`px-3 py-1 text-sm rounded transition-colors ${pageNum === page ? 'bg-emerald-600 text-white' : 'text-muted hover:text-heading hover:bg-surface-alt'}`}>
                    {pageNum}
                  </button>
                );
              })}
              <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}
                className="px-2 py-1 text-sm text-muted hover:text-heading disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                ›
              </button>
              <button disabled={page >= totalPages} onClick={() => onPageChange(totalPages)}
                className="px-2 py-1 text-sm text-muted hover:text-heading disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                »
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
