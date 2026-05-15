import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { parseCSV, getRowDate } from '../utils/excelUtils';

const SHEET_ID = "1WvfO6YtmzIwf4XVEjLI-3Xu38WM_xWgapCWGtAtIxbo";

const C = {
  bg: '#f3f6fb',
  surface: '#ffffff',
  navy: '#0f172a',
  text: '#0f172a',
  muted: '#64748b',
  line: '#e2e8f0',
  blue: '#2563eb',
  green: '#16a34a',
  red: '#dc2626',
  amber: '#d97706',
  slate: '#475569',
};

function getStatusColor(value) {
  const v = String(value || '').toLowerCase();

  if (
    v.includes('good') ||
    v.includes('ok') ||
    v.includes('yes') ||
    v.includes('scanned') ||
    v.includes('completed')
  ) {
    return C.green;
  }

  if (
    v.includes('damage') ||
    v.includes('bad') ||
    v.includes('no') ||
    v.includes('missing') ||
    v.includes('pending')
  ) {
    return C.red;
  }

  return C.slate;
}

function normalizeHeaderName(header) {
  return String(header || '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function Inventory() {
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
      const res = await fetch(
        `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`
      );

      if (!res.ok) {
        throw new Error('Sheet fetch failed');
      }

      const text = await res.text();
      const rows = parseCSV(text);

      if (!rows || rows.length === 0) {
        setHeaders([]);
        setData([]);
        return;
      }

      const sheetHeaders = rows[0];

      const parsedRows = rows.slice(1).map((row) => {
        const obj = {};

        sheetHeaders.forEach((header, index) => {
          obj[header] = row[index] || '';
        });

        return obj;
      });

      setHeaders(sheetHeaders);
      setData(parsedRows);
      setPage(1);
    } catch (err) {
      console.error(err);
      setError('Failed to load inventory. Make sure the Google Sheet is public.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const allDates = useMemo(() => {
    const s = new Set();

    data.forEach((row) => {
      const d = getRowDate(row);
      if (d) s.add(d);
    });

    return Array.from(s).sort();
  }, [data]);

  const filteredData = useMemo(() => {
    let rows = [...data];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();

      rows = rows.filter((row) =>
        Object.values(row).some((value) =>
          String(value).toLowerCase().includes(term)
        )
      );
    }

    if (dateFrom || dateTo) {
      rows = rows.filter((row) => {
        const d = getRowDate(row);

        if (!d) return false;
        if (dateFrom && d < dateFrom) return false;
        if (dateTo && d > dateTo) return false;

        return true;
      });
    }

    return rows;
  }, [data, searchTerm, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, page]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, dateFrom, dateTo]);

  const visibleHeaders = useMemo(() => {
    if (!headers || headers.length === 0) return [];

    return headers.filter((h) => String(h || '').trim() !== '');
  }, [headers]);

  if (loading) {
    return (
      <div
        style={{
          background: C.bg,
          height: '100vh',
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: C.navy,
          fontWeight: 700,
          position: 'fixed',
          top: 0, left: 0
        }}
      >
        Loading Inventory...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: C.bg, height: '100vh', width: '100vw', position: 'fixed', top:0, left:0, padding: 40, overflow: 'auto' }}>
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.line}`,
            borderRadius: 16,
            padding: 24,
            color: C.red,
            fontWeight: 700,
          }}
        >
          {error}
        </div>
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
        // ADDED: Padding to clear the top navbar (approx 80px)
        paddingTop: '80px', 
        boxSizing: 'border-box'
      }}
    >
      {/* CONTAINER: Fills remaining space (100vh - 80px) */}
      <div 
        style={{ 
          width: '100%',
          maxWidth: '1600px',
          // Fills the available height inside the padded root
          height: '100%', 
          padding: '0 24px 24px 24px', // Removed top padding here to utilize root padding
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
            <h1
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 800,
                color: C.navy,
              }}
            >
              Inventory Table
            </h1>
            <p style={{ margin: '6px 0 0', color: C.muted }}>
              Complete asset inventory from Google Sheet
            </p>
          </div>
          <button
            onClick={fetchData}
            style={{
              padding: '10px 20px',
              background: C.navy,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            Refresh
          </button>
        </div>

        {/* 2. FILTERS */}
        <div
          style={{
            flex: '0 0 auto',
            background: C.surface,
            border: `1px solid ${C.line}`,
            borderRadius: 16,
            padding: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <input
            type="text"
            placeholder="Search inventory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '10px 16px',
              width: 320,
              border: `1px solid ${C.line}`,
              borderRadius: 10,
              outline: 'none',
            }}
          />
          <span style={{ color: C.muted, fontWeight: 600 }}>
            Scan Date:
          </span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            min={allDates[0]}
            style={{
              padding: '9px 12px',
              borderRadius: 8,
              border: `1px solid ${C.line}`,
            }}
          />
          <span style={{ color: C.muted }}>to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            max={allDates[allDates.length - 1]}
            style={{
              padding: '9px 12px',
              borderRadius: 8,
              border: `1px solid ${C.line}`,
            }}
          />
          {(searchTerm || dateFrom || dateTo) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setDateFrom('');
                setDateTo('');
              }}
              style={{
                color: C.red,
                background: '#fff',
                border: `1px solid ${C.line}`,
                padding: '9px 14px',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Clear
            </button>
          )}
          <div
            style={{
              marginLeft: 'auto',
              color: C.muted,
              fontWeight: 700,
            }}
          >
            Showing {paginatedRows.length} of {filteredData.length} records
          </div>
        </div>

        {/* 3. TABLE CARD: Fills remaining height */}
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
          <div style={{ overflow: 'auto', flex: 1 }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 14,
                minWidth: 1000,
              }}
            >
              <thead
                style={{
                  position: 'sticky',
                  top: 0,
                  background: '#f8fafc',
                  zIndex: 1,
                }}
              >
                <tr>
                  {visibleHeaders.map((header) => (
                    <th
                      key={header}
                      style={{
                        padding: '14px 16px',
                        textAlign: 'left',
                        color: C.navy,
                        borderBottom: `1px solid ${C.line}`,
                        fontSize: 12,
                        textTransform: 'uppercase',
                        letterSpacing: 0.4,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {normalizeHeaderName(header)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={visibleHeaders.length || 1}
                      style={{
                        padding: 40,
                        textAlign: 'center',
                        color: C.muted,
                      }}
                    >
                      No inventory records found.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      style={{
                        borderBottom: `1px solid ${C.line}`,
                        background: rowIndex % 2 === 0 ? '#fff' : '#f8fafc',
                      }}
                    >
                      {visibleHeaders.map((header) => {
                        const value = row[header] || '';
                        const headerName = String(header).toLowerCase();
                        const isStatusColumn =
                          headerName.includes('status') ||
                          headerName.includes('condition') ||
                          headerName.includes('scanned') ||
                          headerName.includes('psu') ||
                          headerName.includes('rail') ||
                          headerName.includes('power');

                        return (
                          <td
                            key={header}
                            style={{
                              padding: '13px 16px',
                              color: isStatusColumn
                                ? getStatusColor(value)
                                : C.text,
                              fontWeight: isStatusColumn ? 700 : 500,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {value || '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* FOOTER */}
          <div
            style={{
              flex: '0 0 auto',
              padding: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: `1px solid ${C.line}`,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ color: C.muted, fontWeight: 600 }}>
              Page {page} of {totalPages}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: `1px solid ${C.line}`,
                  background: page === 1 ? '#f1f5f9' : '#fff',
                  color: page === 1 ? C.muted : C.navy,
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                }}
              >
                Previous
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: `1px solid ${C.line}`,
                  background: page === totalPages ? '#f1f5f9' : C.navy,
                  color: page === totalPages ? C.muted : '#fff',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}