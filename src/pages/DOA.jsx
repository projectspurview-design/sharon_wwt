// src/pages/DOA.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { parseCSV, getRowDate, extractStatus } from '../utils/excelUtils';
import { LoadingSpinner } from '../App';

const SHEET_ID = '1y3VvRFSigDBo1Vkn8ijDJnEawBLCz9smlH1vvECzlJU';

const C = {
  bg: '#f3f6fb', surface: '#ffffff', navy: '#0f172a', text: '#0f172a',
  muted: '#64748b', line: '#e2e8f0', blue: '#2563eb', green: '#16a34a',
  red: '#dc2626', slate: '#475569',
};

function getStatusColor(value) {
  const v = String(value || '').toLowerCase();
  if (v.includes('good') || v.includes('ok') || v.includes('yes') || v.includes('scanned') || v.includes('completed')) return C.green;
  if (v.includes('damage') || v.includes('bad') || v.includes('no') || v.includes('missing') || v.includes('pending')) return C.red;
  return C.slate;
}

function normalizeHeaderName(header) {
  return String(header || '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function DOA() {
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [page, setPage] = useState(1);
  const rowsPerPage = 15;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`);
      const txt = await res.text();
      const rows = parseCSV(txt);
      const hdrs = rows[0];
      const dataRows = rows.slice(1).map(row => {
        const o = {};
        hdrs.forEach((h, i) => { o[h] = row[i] || ''; });
        return o;
      });
      setHeaders(hdrs);
      setData(dataRows);
      setPage(1);
    } catch (err) {
      console.error(err);
      setError('Failed to load DOA data. Make sure the sheet is public.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const allDates = useMemo(() => {
    const s = new Set();
    data.forEach(row => {
      const d = getRowDate(row);
      if (d) s.add(d);
    });
    return Array.from(s).sort();
  }, [data]);

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

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = filteredData.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div style={{ background: C.bg, height: '100vh', width: '100vw', position: 'fixed', inset: 0, padding: 40, overflow: 'auto' }}>
        <div style={{ color: C.red, fontSize: 16 }}>{error}</div>
      </div>
    );
  }

  return (
    // ROOT: Fixed Full Screen with Top Padding for Navbar
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: C.bg,
        overflow: 'hidden',
        paddingTop: '80px', // Clearance for top navbar
        boxSizing: 'border-box'
      }}
    >
      {/* CONTAINER: Fills remaining space (100vh - 80px) */}
      <div
        style={{
          width: '100%',
          maxWidth: '1600px',
          height: '100%',
          padding: '0 24px 24px 24px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          overflow: 'hidden'
        }}
      >
        {/* 1. HEADER */}
        <div
          style={{
            flex: '0 0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: C.navy }}>
              ⚠️ Dead On Arrival (DOA) Items
            </h1>
            <p style={{ color: C.muted, marginTop: 8 }}>
              Total: <strong style={{ color: C.red }}>{filteredData.length}</strong> items
            </p>
          </div>
        </div>

        {/* 2. FILTERS */}
        <div
          style={{
            flex: '0 0 auto',
            background: C.surface,
            padding: 20,
            borderRadius: 16,
            border: `1px solid ${C.line}`,
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
            alignItems: 'center'
          }}
        >
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
            style={{ padding: '10px 16px', width: 320, border: `1px solid ${C.line}`, borderRadius: 10, outline: 'none' }}
          />
          <span style={{ color: C.muted, fontWeight: 500 }}>Date:</span>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} min={allDates[0]} style={{ padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.line}` }} />
          <span style={{ color: C.muted }}>to</span>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} max={allDates[allDates.length - 1]} style={{ padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.line}` }} />

          {(searchTerm || dateFrom || dateTo) && (
            <button onClick={() => { setSearchTerm(''); setDateFrom(''); setDateTo(''); setPage(1); }} style={{ padding: '9px 16px', background: C.red, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Clear Filters</button>
          )}

          <button onClick={fetchData} style={{ marginLeft: 'auto', padding: '10px 20px', background: C.navy, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Refresh</button>
        </div>

        {/* 3. TABLE CARD */}
        <div
          style={{
            flex: 1,
            background: C.surface,
            border: `1px solid ${C.line}`,
            borderRadius: 16,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minHeight: 0,
          }}
        >
          {filteredData.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.muted }}>
              <div style={{ fontSize: 18, fontWeight: 600 }}>✓ No DOA items found</div>
              <div style={{ fontSize: 14, marginTop: 8 }}>All items are in good condition!</div>
            </div>
          ) : (
            <>
              {/* SCROLLABLE AREA */}
              <div style={{ overflow: 'auto', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 1000 }}>
                  <thead style={{ background: '#f8fafc', borderBottom: `2px solid ${C.line}`, position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr>
                      {headers.map(h => (
                        <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: C.navy, whiteSpace: 'nowrap' }}>
                          {normalizeHeaderName(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((row, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${C.line}`, background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        {headers.map(h => {
                          const val = row[h] || '';
                          const color = getStatusColor(val);
                          return (
                            <td key={h} style={{ padding: '12px 16px', color: val ? color : C.muted, fontWeight: val && (val.toLowerCase().includes('good') || val.toLowerCase().includes('damaged')) ? 600 : 400, whiteSpace: 'nowrap' }}>
                              {val || '—'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* FOOTER / PAGINATION */}
              {totalPages > 1 && (
                <div
                  style={{
                    flex: '0 0 auto',
                    padding: '16px 20px',
                    borderTop: `1px solid ${C.line}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12
                  }}
                >
                  <div style={{ fontSize: 13, color: C.muted }}>
                    Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({filteredData.length} total)
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${C.line}`, background: page === 1 ? '#f1f5f9' : '#fff', color: page === 1 ? C.muted : C.navy, cursor: page === 1 ? 'not-allowed' : 'pointer', fontWeight: 600 }}>Previous</button>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${C.line}`, background: page === totalPages ? '#f1f5f9' : C.navy, color: page === totalPages ? C.muted : '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontWeight: 600 }}>Next</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}