// src/pages/Dashboard.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { parseCSV, computeStats, buildTechActivity, getRowDate, pct } from '../utils/excelUtils';

const SHEET_ID = '12AfHsnz0Oum0AiXto6KNdAaAvzuZbLGv';

const C = {
  bg: '#f8fafc', surface: '#ffffff', navy: '#0f172a', text: '#0f172a',
  muted: '#64748b', line: '#e2e8f0', blue: '#2563eb', cyan: '#0891b2',
  green: '#16a34a', red: '#dc2626', amber: '#d97706', violet: '#7c3aed', slate: '#475569',
};

function Donut({ good, damaged, empty, size = 80 }) {
  const r = 32, cx = 41, cy = 41, circ = 2 * Math.PI * r;
  const total = good + damaged + empty || 1;
  const gD = (good / total) * circ, dD = (damaged / total) * circ, eD = (empty / total) * circ;
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={size} height={size} viewBox="0 0 82 82">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        {eD > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke="#cbd5e1" strokeWidth="8" strokeDasharray={`${eD} ${circ - eD}`} strokeDashoffset={-(gD + dD)} transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="round" />}
        {dD > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.red} strokeWidth="8" strokeDasharray={`${dD} ${circ - dD}`} strokeDashoffset={-gD} transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="round" />}
        {gD > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.green} strokeWidth="8" strokeDasharray={`${gD} ${circ - gD}`} strokeDashoffset={0} transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="round" />}
        <text x={cx} y={cy + 5} textAnchor="middle" fill={C.text} fontSize="17" fontWeight="800">{pct(good, total)}%</text>
      </svg>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 4, fontWeight: 600 }}>Good Condition</div>
    </div>
  );
}

function MiniPieChart({ value, total, label, color }) {
  const p = total > 0 ? (value / total) * 100 : 0;
  const r = 24, cx = 30, cy = 30, circ = 2 * Math.PI * r;
  const dash = (p / 100) * circ;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
      <div>
        <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 800, color, marginTop: 2 }}>{value}</div>
      </div>
      <svg width={60} height={60} viewBox="0 0 60 60">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="6" />
        {p > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="6" strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={0} transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="round" />}
        <text x={cx} y={cy + 4} textAnchor="middle" fill={C.text} fontSize="12" fontWeight="800">{Math.round(p)}%</text>
      </svg>
    </div>
  );
}

function StackBar({ good, damaged, empty, total }) {
  return (
    <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: '#e2e8f0' }}>
      <div style={{ width: `${pct(good, total)}%`, background: C.green }} />
      <div style={{ width: `${pct(damaged, total)}%`, background: C.red }} />
      <div style={{ width: `${pct(empty, total)}%`, background: '#cbd5e1' }} />
    </div>
  );
}

function ProgressBar({ value, max, label, color }) {
  const p = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{Math.round(p)}%</span>
      </div>
      <div style={{ height: 6, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${p}%`, background: color, borderRadius: 999 }} />
      </div>
    </div>
  );
}

function StatusCard({ title, good, damaged, empty, total, accent }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: '16px 20px', borderLeft: `4px solid ${accent}`, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: C.navy }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
        {[{ label: 'Total', val: total, color: accent },
          { label: 'Good', val: good, color: C.green },
          { label: 'Damaged', val: damaged, color: C.red },
          { label: 'Empty', val: empty, color: C.slate }].map(item => (
          <div key={item.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: item.color }}>{item.val}</div>
            <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', fontWeight: 600 }}>{item.label}</div>
          </div>
        ))}
      </div>
      <StackBar good={good} damaged={damaged} empty={empty} total={total} />
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`);
      const txt = await res.text();
      const rows = parseCSV(txt);
      const hdrs = rows[0];
      const dataRows = rows.slice(1).map(row => {
        const o = {}; hdrs.forEach((h, i) => { o[h] = row[i] || ''; });
        return o;
      });
      setData(dataRows);
    } catch {
      setError('Failed to load data. Make sure the sheet is public.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filteredData = useMemo(() => {
    let rows = [...data];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      rows = rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(term)));
    }
    if (dateFrom || dateTo) {
      rows = rows.filter(row => {
        const d = getRowDate(row);
        if (!d) return false;
        if (dateFrom && d < dateFrom) return false;
        if (dateTo && d > dateTo) return false;
        return true;
      });
    }
    return rows;
  }, [data, searchTerm, dateFrom, dateTo]);

  const st = useMemo(() => filteredData.length > 0 ? computeStats(filteredData) : null, [filteredData]);
  const activities = useMemo(() => buildTechActivity(filteredData), [filteredData]);

  const allDates = useMemo(() => {
    const s = new Set();
    data.forEach(row => { const d = getRowDate(row); if (d) s.add(d); });
    return Array.from(s).sort();
  }, [data]);

  if (loading) return <div style={{ background: C.bg, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Dashboard...</div>;
  if (error) return <div style={{ color: C.red, padding: 50 }}>{error}</div>;

  return (
    <div style={{ background: C.bg, height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '16px', boxSizing: 'border-box', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Top Nav Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.surface, padding: '12px 20px', borderRadius: '12px', border: `1px solid ${C.line}`, marginBottom: '16px', flexShrink: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.navy, letterSpacing: '-0.5px' }}>Data Center Assets</h1>
        
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ padding: '6px 12px', fontSize: '13px', width: 180, border: `1px solid ${C.line}`, borderRadius: '6px', outline: 'none' }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', border: `1px solid ${C.line}` }}>
            <span style={{ fontSize: '12px', color: C.muted, fontWeight: 600 }}>Date:</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} min={allDates[0]} style={{ border: 'none', background: 'transparent', fontSize: '12px', outline: 'none', color: C.text }} />
            <span style={{ fontSize: '12px', color: C.muted }}>-</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} max={allDates[allDates.length - 1]} style={{ border: 'none', background: 'transparent', fontSize: '12px', outline: 'none', color: C.text }} />
          </div>

          {(searchTerm || dateFrom || dateTo) && (
            <button onClick={() => { setSearchTerm(''); setDateFrom(''); setDateTo(''); }} style={{ padding: '6px 12px', fontSize: '12px', color: C.red, background: '#fee2e2', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Clear</button>
          )}
          
          <button onClick={fetchData} style={{ padding: '6px 16px', fontSize: '13px', background: C.navy, color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, marginLeft: '8px' }}>
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Row */}
      {st && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '16px', flexShrink: 0 }}>
          <div style={{ background: `linear-gradient(135deg, ${C.navy}, #1e293b)`, borderRadius: '12px', padding: '12px 20px', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: 11, opacity: 0.8, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Total Assets</div>
            <div style={{ fontSize: 32, fontWeight: 800, marginTop: 2, lineHeight: 1 }}>{st.total}</div>
          </div>
          <MiniPieChart value={st.scanned} total={st.total} label="Scanned" color={C.blue} />
          <MiniPieChart value={st.notScanned} total={st.total} label="Pending" color={C.amber} />
          <MiniPieChart value={st.powerCord} total={st.total} label="Power Cord" color={C.violet} />
          <MiniPieChart value={st.rails} total={st.total} label="Rails" color={C.cyan} />
        </div>
      )}

      {/* Main Content Grid */}
      {st && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '16px', flex: 1, minHeight: 0 }}>
          
          {/* Column 1: Condition & Progress */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <ProgressBar value={st.scanned} max={st.total} label="Overall Scan Completion" color={C.blue} />
            </div>
            
            <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <Donut good={st.condGood} damaged={st.condDmg} empty={st.condEmpty} size={80} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                  <div><div style={{ fontSize: 20, fontWeight: 800, color: C.green, lineHeight: 1 }}>{st.condGood}</div><div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Good</div></div>
                  <div><div style={{ fontSize: 20, fontWeight: 800, color: C.red, lineHeight: 1 }}>{st.condDmg}</div><div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Damaged</div></div>
                  <div><div style={{ fontSize: 20, fontWeight: 800, color: C.slate, lineHeight: 1 }}>{st.condEmpty}</div><div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Empty</div></div>
                </div>
                <StackBar good={st.condGood} damaged={st.condDmg} empty={st.condEmpty} total={st.total} />
              </div>
            </div>
          </div>

          {/* Column 2: PSUs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <StatusCard title="⚡ PSU-1 Status" good={st.psu1Good} damaged={st.psu1Dmg} empty={st.psu1Empty} total={st.total} accent={C.violet} />
            <StatusCard title="⚡ PSU-2 Status" good={st.psu2Good} damaged={st.psu2Dmg} empty={st.psu2Empty} total={st.total} accent={C.cyan} />
          </div>

          {/* Column 3: Tech Table 
              FIX: alignSelf: 'start' and maxHeight: '100%' replaces height: '100%'.
              This tells the card to tightly wrap its content but still allows scrolling if content overflows the page height. 
          */}
          <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: '12px', display: 'flex', flexDirection: 'column', alignSelf: 'start', maxHeight: '100%', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 700, borderBottom: `1px solid ${C.line}`, background: '#f8fafc', flexShrink: 0, color: C.navy }}>
              Recent Technician Activity
            </div>
            {/* Removed flex: 1 so the background doesn't stretch past the content */}
            <div style={{ overflowY: 'auto' }}>
              {activities.length === 0 ? (
                <div style={{ padding: 30, textAlign: 'center', color: C.muted, fontSize: 13 }}>No recent scans found.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#fff', borderBottom: `1px solid ${C.line}`, zIndex: 1 }}>
                    <tr>
                      <th style={{ padding: '8px 16px', textAlign: 'left', fontWeight: 600, color: C.muted }}>Technician</th>
                      <th style={{ padding: '8px 16px', textAlign: 'left', fontWeight: 600, color: C.muted }}>Date</th>
                      <th style={{ padding: '8px 16px', textAlign: 'left', fontWeight: 600, color: C.muted }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map((row, i) => (
                      <tr key={i} style={{ borderBottom: i !== activities.length - 1 ? `1px solid ${C.line}` : 'none' }}>
                        <td style={{ padding: '8px 16px', fontWeight: 600, color: C.navy }}>{row.userName}</td>
                        <td style={{ padding: '8px 16px', color: C.slate }}>{row.date || '—'}</td>
                        <td style={{ padding: '8px 16px', color: C.slate }}>{row.time || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}