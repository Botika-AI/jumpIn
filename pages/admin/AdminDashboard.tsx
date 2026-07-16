import React, { useState, useEffect } from 'react';
import { Users, Building2, Calendar, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { JumpInEvent } from '../../types';

// ── Tipi ─────────────────────────────────────────────────────────────────────

interface KPI { studenti: number; aziende: number; esperienze: number; feedback: number }
type EventStatus = 'Concluso' | 'In corso' | 'Pianificato';

interface EventRow {
  id: string; name: string; event_date: string;
  event_end: string | null; partecipanti: number; stato: EventStatus;
}

interface ChartBin { label: string; studenti: number; aziende: number }

interface RecentUser {
  first_name: string; last_name: string; email: string; last_checkin: string | null; user_type: string;
}

// ── Helper ────────────────────────────────────────────────────────────────────

function eventStatus(e: JumpInEvent): EventStatus {
  const today = new Date();
  const start = new Date(e.event_date);
  const end = e.event_end ? new Date(e.event_end) : new Date(e.event_date);
  end.setHours(23, 59, 59, 999);
  if (today < start) return 'Pianificato';
  if (today > end) return 'Concluso';
  return 'In corso';
}

function make15DayBins() {
  const bins: { start: Date; end: Date; label: string }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const end = new Date(now);
    end.setDate(end.getDate() - i * 15);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - 14);
    start.setHours(0, 0, 0, 0);
    bins.push({ start, end, label: end.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) });
  }
  return bins;
}

// ── SVG Line Chart ─────────────────────────────────────────────────────────────

const LineChart: React.FC<{ data: ChartBin[] }> = ({ data }) => {
  const W = 800, H = 260;
  const PAD = { top: 20, right: 30, bottom: 52, left: 55 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(...data.map(d => Math.max(d.studenti, d.aziende)), 50);
  const yStep = Math.ceil(maxVal / 4 / 50) * 50;
  const yMax = yStep * 4;

  const xOf = (i: number) => PAD.left + (i / (data.length - 1)) * plotW;
  const yOf = (v: number) => PAD.top + (1 - v / yMax) * plotH;
  const lineD = (key: 'studenti' | 'aziende') =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i).toFixed(1)} ${yOf(d[key]).toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ fontFamily: 'inherit' }}>
      {/* Grid */}
      {[0, 1, 2, 3, 4].map(i => {
        const v = i * yStep;
        const y = yOf(v);
        return (
          <g key={i}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#E5E7EB" strokeDasharray="4 4" />
            <text x={PAD.left - 8} y={y + 4} textAnchor="end" fontSize={11} fill="#9CA3AF">{v}</text>
          </g>
        );
      })}
      {/* X labels */}
      {data.map((d, i) => (
        <text key={i} x={xOf(i)} y={H - PAD.bottom + 18} textAnchor="middle" fontSize={11} fill="#9CA3AF">
          {d.label}
        </text>
      ))}
      {/* Lines */}
      <path d={lineD('aziende')} fill="none" stroke="#4A7CF6" strokeWidth={2.5} strokeLinejoin="round" />
      <path d={lineD('studenti')} fill="none" stroke="#F0813C" strokeWidth={2.5} strokeLinejoin="round" />
      {/* Dots */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={xOf(i)} cy={yOf(d.aziende)} r={4} fill="#4A7CF6" />
          <circle cx={xOf(i)} cy={yOf(d.studenti)} r={4} fill="#F0813C" />
        </g>
      ))}
      {/* Legend */}
      <g transform={`translate(${W / 2 - 75}, ${H - 10})`}>
        <circle cx={0} cy={0} r={4} fill="#4A7CF6" />
        <text x={10} y={4} fontSize={11} fill="#6B7280">Aziende</text>
        <circle cx={80} cy={0} r={4} fill="#F0813C" />
        <text x={90} y={4} fontSize={11} fill="#6B7280">Studenti</text>
      </g>
    </svg>
  );
};

// ── Sotto-componenti ───────────────────────────────────────────────────────────

const KpiCard: React.FC<{ label: string; value: number; delta?: string; Icon: React.ElementType }> = ({
  label, value, delta, Icon,
}) => (
  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex-1 min-w-0">
    <div className="flex items-start justify-between mb-3">
      <p className="text-xs text-gray-400 font-medium leading-snug">{label}</p>
      <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center shrink-0 ml-2">
        <Icon size={18} className="text-orange-400" strokeWidth={1.75} />
      </div>
    </div>
    <p className="text-2xl font-bold text-gray-900 font-montserrat tabular-nums">
      {value.toLocaleString('it-IT')}
    </p>
    {delta && <p className="text-xs text-green-500 font-medium mt-1">{delta}</p>}
  </div>
);

const StatusBadge: React.FC<{ status: EventStatus }> = ({ status }) => {
  const style = {
    'Concluso':    'bg-green-50 text-green-600',
    'In corso':    'bg-orange-50 text-orange-500',
    'Pianificato': 'bg-blue-50 text-blue-500',
  }[status];
  return <span className={`px-3 py-1 rounded-full text-xs font-medium ${style}`}>{status}</span>;
};

// ── Dashboard principale ───────────────────────────────────────────────────────

export const AdminDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState<KPI>({ studenti: 0, aziende: 0, esperienze: 0, feedback: 0 });
  const [eventiRows, setEventiRows] = useState<EventRow[]>([]);
  const [chartData, setChartData] = useState<ChartBin[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const [studentiRes, eventiRes, attendancesRes, logsRes, recentLogsRes] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_admin', false),
      supabase.from('events').select('id, name, event_date, event_end').order('event_date', { ascending: false }),
      supabase.from('iscrizioni_eventi').select('user_id, event_id, stato'),
      // access_logs per grafico 90 giorni
      supabase.from('access_logs')
        .select('user_id, user_type, accessed_at')
        .gte('accessed_at', ninetyDaysAgo.toISOString()),
      // access_logs per utenti recenti (escludi admin leggendo is_admin dal profilo)
      supabase.from('access_logs')
        .select('user_id, user_type, accessed_at, profiles(first_name, last_name, email, is_admin)')
        .order('accessed_at', { ascending: false })
        .limit(50),
    ]);

    // Aziende: tabella potrebbe non esistere ancora
    let aziendeCount = 0;
    try {
      const { count } = await supabase.from('aziende').select('*', { count: 'exact', head: true });
      aziendeCount = count ?? 0;
    } catch {}

    const allEvents = (eventiRes.data ?? []) as JumpInEvent[];
    const allAttendances = attendancesRes.data ?? [];
    const allLogs = logsRes.data ?? [];

    // KPI
    const esperienze = allEvents.filter(e => eventStatus(e) !== 'Concluso').length;
    setKpi({ studenti: studentiRes.count ?? 0, aziende: aziendeCount, esperienze, feedback: 0 });

    // Partecipazioni recenti: ultimi 3 eventi + conteggio iscritti accettati da iscrizioni_eventi
    const partsPerEvento = allAttendances.reduce<Record<string, Set<string>>>((acc, a) => {
      if (a.stato !== 'accettata') return acc;
      if (!acc[a.event_id]) acc[a.event_id] = new Set();
      acc[a.event_id].add(a.user_id);
      return acc;
    }, {});

    setEventiRows(allEvents.slice(0, 3).map(e => ({
      id: e.id, name: e.name, event_date: e.event_date, event_end: e.event_end ?? null,
      partecipanti: partsPerEvento[e.id]?.size ?? 0,
      stato: eventStatus(e),
    })));

    // Grafico: accessi reali da access_logs per bin di 15 giorni
    const bins = make15DayBins();
    setChartData(bins.map(bin => {
      const inBin = allLogs.filter(l => {
        const d = new Date(l.accessed_at);
        return d >= bin.start && d <= bin.end;
      });
      return {
        label: bin.label,
        studenti: new Set(inBin.filter(l => l.user_type === 'studente').map(l => l.user_id)).size,
        aziende:  new Set(inBin.filter(l => l.user_type === 'azienda').map(l => l.user_id)).size,
      };
    }));

    // Utenti recenti: deduplica per user_id (prende l'accesso più recente per utente)
    const seen = new Set<string>();
    const recent: RecentUser[] = [];
    for (const log of (recentLogsRes.data ?? [])) {
      if (seen.has(log.user_id)) continue;
      seen.add(log.user_id);
      const raw = log.profiles;
      const p = (Array.isArray(raw) ? raw[0] : raw) as { first_name: string; last_name: string; email: string; is_admin: boolean } | null;
      if (!p || p.is_admin) continue;
      recent.push({ first_name: p.first_name, last_name: p.last_name, email: p.email, last_checkin: log.accessed_at, user_type: log.user_type });
      if (recent.length === 5) break;
    }
    setRecentUsers(recent);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold font-montserrat text-gray-900">Dashboard Generale</h1>
        <p className="text-sm text-gray-400 mt-0.5">Panoramica dell'attività della piattaforma</p>
      </div>

      {/* KPI */}
      <div className="flex gap-4">
        <KpiCard label="Studenti totali"   value={kpi.studenti}   Icon={Users}          />
        <KpiCard label="Aziende totali"    value={kpi.aziende}    Icon={Building2}      />
        <KpiCard label="Esperienze attive" value={kpi.esperienze} Icon={Calendar}       />
        <KpiCard label="Feedback raccolti" value={kpi.feedback}   Icon={MessageSquare}  />
      </div>

      {/* Partecipazioni recenti */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="font-bold font-montserrat text-gray-900 mb-4">Partecipazioni recenti</h2>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-bold text-gray-700">
              <th className="text-left pb-3 pr-4">Evento</th>
              <th className="text-left pb-3 pr-4">Data</th>
              <th className="text-left pb-3 pr-4">Partecipanti</th>
              <th className="text-left pb-3">Stato</th>
            </tr>
          </thead>
          <tbody>
            {eventiRows.length === 0 ? (
              <tr><td colSpan={4} className="py-8 text-center text-sm text-gray-400">Nessun evento trovato</td></tr>
            ) : eventiRows.map((row, i) => (
              <tr key={row.id} className={i < eventiRows.length - 1 ? 'border-b border-gray-50' : ''}>
                <td className="py-3 pr-4 text-sm text-gray-800 font-medium">{row.name}</td>
                <td className="py-3 pr-4 text-sm text-gray-500">{new Date(row.event_date).toLocaleDateString('it-IT')}</td>
                <td className="py-3 pr-4 text-sm text-gray-500">{row.partecipanti}</td>
                <td className="py-3"><StatusBadge status={row.stato} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="font-bold font-montserrat text-gray-900">Attività ultimi 90 giorni</h2>
        <p className="text-xs text-gray-400 mt-0.5 mb-4">Accessi giornalieri per studenti e aziende</p>
        <LineChart data={chartData} />
      </div>

      {/* Utenti recenti */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="font-bold font-montserrat text-gray-900 mb-4">Utenti attivi recenti</h2>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-bold text-gray-700">
              <th className="text-left pb-3 pr-4">Nome</th>
              <th className="text-left pb-3 pr-4">Tipo utente</th>
              <th className="text-left pb-3 pr-4">Ultimo accesso</th>
              <th className="text-left pb-3">Stato</th>
            </tr>
          </thead>
          <tbody>
            {recentUsers.length === 0 ? (
              <tr><td colSpan={4} className="py-8 text-center text-sm text-gray-400">Nessun utente trovato</td></tr>
            ) : recentUsers.map((u, i) => {
              const daysSince = u.last_checkin
                ? (Date.now() - new Date(u.last_checkin).getTime()) / (1000 * 60 * 60 * 24)
                : Infinity;
              const statusColor = daysSince < 7 ? 'text-green-600' : daysSince < 30 ? 'text-yellow-500' : 'text-red-400';
              const dotColor   = daysSince < 7 ? 'bg-green-400'  : daysSince < 30 ? 'bg-yellow-400'  : 'bg-red-400';
              const statusLabel = daysSince < 7 ? 'Attivo' : daysSince < 30 ? 'Poco attivo' : 'Inattivo';
              const tipoLabel = u.user_type === 'admin' ? 'Admin' : u.user_type === 'azienda' ? 'Azienda' : 'Studente';
              return (
                <tr key={i} className={i < recentUsers.length - 1 ? 'border-b border-gray-50' : ''}>
                  <td className="py-3 pr-4 text-sm text-gray-800 font-medium">{u.first_name} {u.last_name}</td>
                  <td className="py-3 pr-4 text-sm text-gray-500">{tipoLabel}</td>
                  <td className="py-3 pr-4 text-sm text-gray-500">
                    {u.last_checkin ? new Date(u.last_checkin).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="py-3">
                    <span className={`flex items-center gap-1.5 text-xs font-medium ${statusColor}`}>
                      <span className={`w-2 h-2 rounded-full inline-block ${dotColor}`} />
                      {statusLabel}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
