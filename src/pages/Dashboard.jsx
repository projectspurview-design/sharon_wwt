// src/pages/Dashboard.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { parseCSV, computeStats, buildTechActivity, getRowDate, pct } from '../utils/excelUtils';

const SHEET_ID = '1WvfO6YtmzIwf4XVEjLI-3Xu38WM_xWgapCWGtAtIxbo';

const C = {
  bg: '#f8fafc', surface: '#ffffff', navy: '#0f172a', text: '#0f172a',
  muted: '#64748b', line: '#e2e8f0', blue: '#2563eb', cyan: '#0891b2',
  green: '#16a34a', red: '#dc2626', amber: '#d97706', violet: '#7c3aed', slate: '#475569',
};

// --- HELPER LOGIC FOR DOA DETECTION ---
function getStatusColor(value) {
  const v = String(value || '').toLowerCase();
  if (v.includes('good') || v.includes('ok') || v.includes('yes') || v.includes('scanned') || v.includes('completed')) {
    return C.green;
  }
  if (v.includes('damage') || v.includes('bad') || v.includes('no') || v.includes('missing') || v.includes('pending') || v.includes('fail')) {
    return C.red;
  }
  return C.slate;
}

// --- COMPONENTS ---

// COMPACTED: Shrunk radius, padding, and text for higher density
function MiniPieChart({ value, total, label, color }) {
  const p = total > 0 ? (value / total) * 100 : 0;
  const r = 18, cx = 22, cy = 22, circ = 2 * Math.PI * r;
  const dash = (p / 100) * circ;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
      <div>
        <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color, marginTop: 2 }}>{value}</div>
      </div>
      <svg width={44} height={44} viewBox="0 0 44 44">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="5" />
        {p > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="5" strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={0} transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="round" />}
        <text x={cx} y={cy + 3} textAnchor="middle" fill={C.text} fontSize="10" fontWeight="800">{Math.round(p)}%</text>
      </svg>
    </div>
  );
}

// COMPACTED: Thinner bars
function StackBar({ good, damaged, empty, total }) {
  return (
    <div style={{ display: 'flex', height: 6, borderRadius: 999, overflow: 'hidden', background: '#e2e8f0' }}>
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
        <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color }}>{Math.round(p)}%</span>
      </div>
      <div style={{ height: 6, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${p}%`, background: color, borderRadius: 999 }} />
      </div>
    </div>
  );
}

// COMPACTED: Tighter layout and smaller fonts to save vertical space
function ConditionBarCard({ good, damaged, empty, total }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: '10px', padding: '10px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
      <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginBottom: 8 }}>Condition</div>
      <StackBar good={good} damaged={damaged} empty={empty} total={total} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
        <div style={{ textAlign: 'center' }}><div style={{ fontSize: 15, fontWeight: 800, color: C.green, lineHeight: 1 }}>{good}</div><div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>Good</div></div>
        <div style={{ textAlign: 'center' }}><div style={{ fontSize: 15, fontWeight: 800, color: C.red, lineHeight: 1 }}>{damaged}</div><div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>Dmg</div></div>
        <div style={{ textAlign: 'center' }}><div style={{ fontSize: 15, fontWeight: 800, color: C.slate, lineHeight: 1 }}>{empty}</div><div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>Empty</div></div>
      </div>
    </div>
  );
}

// COMPACTED: Shrunk padding and gaps between total/good/dmg stats
function StatusCard({ title, good, damaged, empty, total, accent }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: '10px', padding: '10px 14px', borderLeft: `4px solid ${accent}`, boxShadow: '0 1px 2px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: C.navy }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginBottom: 8 }}>
        {[{ label: 'Total', val: total, color: accent },
          { label: 'Good', val: good, color: C.green },
          { label: 'Damaged', val: damaged, color: C.red },
          { label: 'Empty', val: empty, color: C.slate }].map(item => (
          <div key={item.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: item.color, lineHeight: 1 }}>{item.val}</div>
            <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', fontWeight: 600, marginTop: 2 }}>{item.label}</div>
          </div>
        ))}
      </div>
      <StackBar good={good} damaged={damaged} empty={empty} total={total} />
    </div>
  );
}

function DOATable({ data }) {
  const doaItems = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.filter(row => {
      return Object.values(row).some(value => getStatusColor(value) === C.red);
    });
  }, [data]);

  const headers = data.length > 0 ? Object.keys(data[0]).filter(h => String(h).trim() !== '') : [];
  const primaryCol = headers[0] || 'Asset';

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: '10px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
      <div style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 700, borderBottom: `1px solid #fecaca`, background: '#fef2f2', flexShrink: 0, color: C.red, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          ⚠️ Dead On Arrival (DOA)
        </span>
        <span style={{ background: C.red, color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>{doaItems.length}</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {doaItems.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: C.muted, fontSize: 13 }}>No DOA items detected.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ position: 'sticky', top: 0, background: '#fff', borderBottom: `1px solid ${C.line}`, zIndex: 1 }}>
              <tr>
                <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, color: C.muted }}>{primaryCol}</th>
                <th style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 600, color: C.muted }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {doaItems.map((row, i) => (
                <tr key={i} style={{ borderBottom: i !== doaItems.length - 1 ? `1px solid ${C.line}` : 'none' }}>
                  <td style={{ padding: '8px 14px', fontWeight: 600, color: C.navy, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150 }}>
                    {row[primaryCol] || 'Unknown'}
                  </td>
                  <td style={{ padding: '8px 14px', color: C.red, fontWeight: 600, textAlign: 'right' }}>Failed</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
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
    // Fixed wrapper to clear the App Navigation Bar without triggering a global scroll
    <div style={{ position: 'fixed', inset: 0, background: C.bg, overflow: 'hidden', paddingTop: '80px', boxSizing: 'border-box', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Inner Container */}
      <div style={{ width: '100%', maxWidth: '1600px', margin: '0 auto', height: '100%', padding: '0 16px 16px 16px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Top Nav Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.surface, padding: '10px 16px', borderRadius: '10px', border: `1px solid ${C.line}`, flexShrink: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.02)', marginBottom: '12px' }}>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.navy, letterSpacing: '-0.5px' }}>Data Center Assets</h1>
          
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ padding: '6px 10px', fontSize: '12px', width: 160, border: `1px solid ${C.line}`, borderRadius: '6px', outline: 'none' }} />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', border: `1px solid ${C.line}` }}>
              <span style={{ fontSize: '11px', color: C.muted, fontWeight: 600 }}>Date:</span>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} min={allDates[0]} style={{ border: 'none', background: 'transparent', fontSize: '11px', outline: 'none', color: C.text }} />
              <span style={{ fontSize: '11px', color: C.muted }}>-</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} max={allDates[allDates.length - 1]} style={{ border: 'none', background: 'transparent', fontSize: '11px', outline: 'none', color: C.text }} />
            </div>

            {(searchTerm || dateFrom || dateTo) && (
              <button onClick={() => { setSearchTerm(''); setDateFrom(''); setDateTo(''); }} style={{ padding: '6px 10px', fontSize: '11px', color: C.red, background: '#fee2e2', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Clear</button>
            )}
            
            <button onClick={fetchData} style={{ padding: '6px 14px', fontSize: '12px', background: C.navy, color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, marginLeft: '4px' }}>
              Refresh
            </button>
          </div>
        </div>

        {/* 
            TOP GRID (KPIs) 
            COMPACTED: Decreased gaps and padding to save massive vertical space
        */}
        {st && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.2fr', gap: '12px', flexShrink: 0, marginBottom: '12px' }}>
            {/* Row 1 */}
            <div style={{ background: `linear-gradient(135deg, ${C.navy}, #1e293b)`, borderRadius: '10px', padding: '12px 16px', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: 10, opacity: 0.8, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Total Assets</div>
              <div style={{ fontSize: 32, fontWeight: 800, marginTop: 2, lineHeight: 1 }}>{st.total}</div>
            </div>
            <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: '10px', padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
              <ProgressBar value={st.scanned} max={st.total} label="Overall Scan Completion" color={C.blue} />
            </div>
            <ConditionBarCard good={st.condGood} damaged={st.condDmg} empty={st.condEmpty} total={st.total} />

            {/* Row 2 */}
            <MiniPieChart value={st.scanned} total={st.total} label="Scanned" color={C.blue} />
            <StatusCard title="⚡ PSU-1 Status" good={st.psu1Good} damaged={st.psu1Dmg} empty={st.psu1Empty} total={st.total} accent={C.violet} />
            <MiniPieChart value={st.powerCord} total={st.total} label="Power Cord" color={C.violet} />

            {/* Row 3 */}
            <MiniPieChart value={st.notScanned} total={st.total} label="Pending" color={C.amber} />
            <StatusCard title="⚡ PSU-2 Status" good={st.psu2Good} damaged={st.psu2Dmg} empty={st.psu2Empty} total={st.total} accent={C.cyan} />
            <MiniPieChart value={st.rails} total={st.total} label="Rails" color={C.cyan} />
          </div>
        )}

        {/* 
            BOTTOM GRID (Tables) 
            Since top grid is much smaller, these tables now have massive vertical space.
        */}
        {st && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px', flex: 1, minHeight: 0 }}>
            
            {/* Tech Table */}
            <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: '10px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
              <div style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 700, borderBottom: `1px solid ${C.line}`, background: '#f8fafc', flexShrink: 0, color: C.navy }}>
                Recent Technician Activity
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {activities.length === 0 ? (
                  <div style={{ padding: 30, textAlign: 'center', color: C.muted, fontSize: 13 }}>No recent scans found.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#fff', borderBottom: `1px solid ${C.line}`, zIndex: 1 }}>
                      <tr>
                        <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, color: C.muted }}>Technician</th>
                        <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, color: C.muted }}>Date</th>
                        <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, color: C.muted }}>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activities.map((row, i) => (
                        <tr key={i} style={{ borderBottom: i !== activities.length - 1 ? `1px solid ${C.line}` : 'none' }}>
                          <td style={{ padding: '8px 14px', fontWeight: 600, color: C.navy }}>{row.userName}</td>
                          <td style={{ padding: '8px 14px', color: C.slate }}>{row.date || '—'}</td>
                          <td style={{ padding: '8px 14px', color: C.slate }}>{row.time || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* DOA Component */}
            <DOATable data={filteredData} />

          </div>
        )}
      </div>
    </div>
  );
}