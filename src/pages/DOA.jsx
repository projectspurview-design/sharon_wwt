// src/pages/DOA.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { parseCSV, getRowDate, extractStatus } from '../utils/excelUtils';
import { config } from '../config';

const SHEET_ID = config.SHEET_ID;
const C = {
  bg: '#f3f6fb', surface: '#ffffff', navy: '#0f172a', text: '#0f172a',
  muted: '#64748b', line: '#e2e8f0', blue: '#2563eb', green: '#16a34a', 
  red: '#dc2626', slate: '#475569',
};

function MultiLineCell({ value, isCondition }) {
  if (!value || !value.trim()) return <span style={{ color: C.muted }}>—</span>;

  const lines = value.split('\n').map(l => l.trim()).filter(Boolean);

  if (lines.length <= 1) {
    const status = isCondition ? extractStatus(value) : '';
    const color = isCondition 
      ? (status === 'good' ? C.green : status === 'damaged' ? C.red : C.slate)
      : C.text;
    return <span style={{ color, fontWeight: isCondition ? 600 : 400 }}>{value}</span>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {lines.map((line, idx) => {
        const lineStatus = isCondition ? extractStatus(line) : '';
        const bg = isCondition
          ? (lineStatus === 'good' ? '#dcfce7' : lineStatus === 'damaged' ? '#fee2e2' : '#f1f5f9')
          : '#f1f5f9';
        const color = isCondition 
          ? (lineStatus === 'good' ? C.green : lineStatus === 'damaged' ? C.red : C.slate)
          : C.text;
        return (
          <span key={idx} style={{
            padding: '4px 8px',
            background: bg,
            borderRadius: 6,
            fontSize: 12,
            color,
            fontWeight: isCondition ? 600 : 400,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }} title={line}>
            {line}
          </span>
        );
      })}
    </div>
  );
}

export default function DOA() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState(1);
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
        const o = {}; hdrs.forEach((h, i) => { o[h] = row[i] || ''; }); return o;
      });
      // Filter for DOA items (Condition = "DOA")
      const doaRows = dataRows.filter(row => 
        row['Condition'] && row['Condition'].toLowerCase().includes('doa')
      );
      setData(doaRows);
    } catch {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const allDates = useMemo(() => {
    const s = new Set();
    data.forEach(row => { const d = getRowDate(row); if (d) s.add(d); });
    return Array.from(s).sort();
  }, [data]);

  const minDate = allDates[0] || '';
  const maxDate = allDates[allDates.length - 1] || '';

  const filteredRows = useMemo(() => {
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
    if (sortKey) {
      rows.sort((a, b) => String(a[sortKey] || '').localeCompare(String(b[sortKey] || '')) * sortDir);
    }
    return rows;
  }, [data, searchTerm, dateFrom, dateTo, sortKey, sortDir]);

  const displayHeaders = ['Description', 'Product ID', 'Serial No', 'Condition', 'PSU-1 Cond', 'PSU-2 Cond', 'Power Cord Qty', 'Rail Qty'];

  if (loading) return <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading DOA Items...</div>;
  if (error) return <div style={{ color: 'red', padding: 40 }}>{error}</div>;

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '24px' }}>
        <h1 style={{ marginBottom: 24 }}>⚠️ Dead On Arrival (DOA) Items</h1>

        <div style={{ marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="🔍 Search..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ padding: '10px 14px', width: 300, border: `1px solid ${C.line}`, borderRadius: 10 }}
          />
          <input type="date" value={dateFrom} min={minDate} onChange={e => setDateFrom(e.target.value)} />
          <span>to</span>
          <input type="date" value={dateTo} max={maxDate} onChange={e => setDateTo(e.target.value)} />
          <button onClick={() => { setSearchTerm(''); setDateFrom(''); setDateTo(''); }}>Clear</button>
        </div>

        {filteredRows.length === 0 ? (
          <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 20, padding: 60, textAlign: 'center', color: C.muted }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>✓ No DOA items found</div>
            <div style={{ fontSize: 14, marginTop: 8 }}>All items are in good condition!</div>
          </div>
        ) : (
          <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 20, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    {displayHeaders.map(h => (
                      <th
                        key={h}
                        onClick={() => {
                          if (sortKey === h) setSortDir(d => d * -1);
                          else { setSortKey(h); setSortDir(1); }
                        }}
                        style={{ padding: '14px 16px', textAlign: 'left', cursor: 'pointer', fontWeight: 700 }}
                      >
                        {h} {sortKey === h ? (sortDir === 1 ? '↑' : '↓') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.slice(0, 300).map((row, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.line}`, background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      {displayHeaders.map(h => {
                        const val = row[h] || '';
                        const isCondition = h.includes('Cond') || h === 'Condition';
                        return (
                          <td key={h} style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                            <MultiLineCell value={val} isCondition={isCondition} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ marginTop: 20, fontSize: 13, color: C.muted }}>
          Total DOA Items: <strong style={{ color: C.red }}>{filteredRows.length}</strong>
        </div>
      </div>
    </div>
  );
}