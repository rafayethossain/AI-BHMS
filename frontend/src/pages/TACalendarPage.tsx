import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { merchApi } from '../api/client';
import Layout from '../components/Layout';
import { useToast } from '../contexts/ToastContext';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  status: string;
  po_number: string;
  is_milestone?: boolean;
  ta_id?: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-blue-500/20 text-badge-blue border-blue-500/30',
  completed: 'bg-emerald-500/20 text-badge-emerald border-emerald-500/30',
  delayed: 'bg-red-500/20 text-badge-red border-red-500/30',
  pending: 'bg-surface-alt/20 text-muted border-border',
  in_progress: 'bg-amber-500/20 text-badge-amber border-amber-500/30',
  draft: 'bg-surface-alt/20 text-muted border-border',
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

export default function TACalendarPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const { toast } = useToast();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
      const res = await merchApi.getTACalendarData({ start, end });
      setEvents(res.data);
    } catch { toast('error', 'Failed to load calendar events'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchEvents(); }, [year, month]);

  const prevMonth = () => { setCurrentDate(new Date(year, month - 1, 1)); setSelectedDay(null); };
  const nextMonth = () => { setCurrentDate(new Date(year, month + 1, 1)); setSelectedDay(null); };
  const goToday = () => { setCurrentDate(new Date()); setSelectedDay(null); };

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter((e) => e.date === dateStr);
  };

  const today = new Date();
  const isToday = (day: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const selectedEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">T&A Calendar</h1>
            <p className="text-muted text-sm mt-1">Monthly view of T&A milestones and deliveries</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="px-3 py-1.5 bg-surface-alt hover:bg-surface-alt text-heading rounded-lg text-sm transition-colors">&larr; Prev</button>
            <button onClick={goToday} className="px-3 py-1.5 bg-surface-alt hover:bg-surface-alt text-heading rounded-lg text-sm transition-colors">Today</button>
            <button onClick={nextMonth} className="px-3 py-1.5 bg-surface-alt hover:bg-surface-alt text-heading rounded-lg text-sm transition-colors">Next &rarr;</button>
            <span className="text-heading font-medium text-lg ml-2">{monthName}</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-px bg-surface-alt rounded-xl overflow-hidden border border-border">
            {DAYS.map((d) => (
              <div key={d} className="bg-surface px-3 py-2 text-sm font-medium text-muted text-center">{d}</div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-input min-h-[100px]" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDay(day);
              const selected = selectedDay === day;
              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(selected ? null : day)}
                  className={`bg-surface min-h-[100px] p-2 cursor-pointer transition-colors ${
                    isToday(day) ? 'ring-2 ring-emerald-500/50' : ''
                  } ${selected ? 'bg-surface-alt' : 'hover:bg-surface-alt'}`}
                >
                  <div className={`text-sm font-medium mb-1 ${isToday(day) ? 'text-emerald-400' : 'text-body'}`}>
                    {day}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <div
                        key={ev.id}
                        onClick={(e) => { e.stopPropagation(); if (ev.is_milestone && ev.ta_id) navigate(`/tas/${ev.ta_id}`); else if (!ev.is_milestone) navigate('/tas'); }}
                        className={`text-xs px-1.5 py-0.5 rounded border truncate ${STATUS_COLORS[ev.status] || 'bg-surface-alt text-muted border-input-border'}`}
                        title={`${ev.title} - ${ev.status}`}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-faint">+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedDay && selectedEvents.length > 0 && (
          <div className="mt-6 bg-surface rounded-xl border border-border p-6">
            <h2 className="text-lg font-bold mb-4">
              Events for {year}-{String(month + 1).padStart(2, '0')}-{String(selectedDay).padStart(2, '0')}
            </h2>
            <div className="space-y-2">
              {selectedEvents.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => { if (ev.is_milestone && ev.ta_id) navigate(`/tas/${ev.ta_id}`); else if (!ev.is_milestone) navigate('/tas'); }}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-surface-alt/50 transition-colors ${STATUS_COLORS[ev.status] || 'border-input-border'}`}
                >
                  <div>
                    <span className="font-medium text-sm text-heading">{ev.title}</span>
                    {ev.po_number && <span className="ml-2 text-xs text-muted font-mono">{ev.po_number}</span>}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[ev.status] || ''}`}>
                    {ev.is_milestone ? 'Milestone' : ev.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}
