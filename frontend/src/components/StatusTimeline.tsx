export interface TimelineEvent {
  date: string;
  title: string;
  description?: string;
  icon?: string;
  color?: string;
}

const EVENT_COLORS: Record<string, string> = {
  create: 'bg-emerald-500',
  transition: 'bg-blue-500',
  update: 'bg-amber-500',
  approve: 'bg-emerald-500',
  reject: 'bg-red-500',
  error: 'bg-red-500',
  info: 'bg-surface-alt',
};

export default function StatusTimeline({ events }: { events: TimelineEvent[] }) {
  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8">
        <svg className="w-8 h-8 text-faint mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-muted">No history yet</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
      <div className="space-y-4">
        {events.map((event, idx) => (
          <div key={idx} className="relative flex gap-4 group">
            <div className={`w-8 h-8 rounded-full ${EVENT_COLORS[event.color || 'info']} flex items-center justify-center flex-shrink-0 z-10 ring-4 ring-surface`}>
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {event.icon === 'check' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                ) : event.icon === 'plus' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                ) : event.icon === 'alert' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
            </div>
            <div className="flex-1 min-w-0 pb-4">
              <p className="text-xs text-faint">{event.date}</p>
              <p className="text-sm text-heading font-medium mt-0.5">{event.title}</p>
              {event.description && (
                <p className="text-xs text-muted mt-0.5">{event.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
