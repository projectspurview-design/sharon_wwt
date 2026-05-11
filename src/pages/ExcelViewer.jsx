// src/pages/ExcelViewer.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';

const SHEET_ID = '1qfCQnJkj-h51TdiCVWcRWmrtBdL0chW1';

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Strip Excel/BOM junk: unicode BOM, non-breaking spaces, zero-width chars, CRLF normalise
function cleanStr(s) {
  return s
    .replace(/^\uFEFF/, '')          // UTF-8 BOM at file start
    .replace(/\u00A0/g, ' ')         // non-breaking space → regular space
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '') // zero-width chars
    .replace(/\r\n/g, '\n')          // normalise CRLF → LF
    .replace(/\r/g, '\n');           // normalise stray CR → LF
}

// Normalise a single cell value: trim per-line, collapse truly blank lines
function cleanCell(raw) {
  if (!raw) return '';
  return raw
    .split('\n')
    .map(l => l.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')  // collapse 3+ blank lines to max 2
    .trim();
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────
// • Newlines inside quoted cells are preserved as \n (not row breaks)
// • BOM and unicode junk stripped before parsing
// • Trailing all-empty rows (Google Sheets ghost rows) filtered out
// • Cell values are cleaned per-line, not just outer-trimmed
function parseCSV(csvText) {
  // Strip BOM and normalise line endings before character-level parse
  const text = cleanStr(csvText);

  const rows = [];
  let row = [], cell = '', inQ = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];

    if (c === '"') {
      if (inQ && n === '"') { cell += '"'; i++; }  // escaped quote ""
      else inQ = !inQ;                               // open/close quote
    } else if (c === ',' && !inQ) {
      row.push(cleanCell(cell)); cell = '';
    } else if (c === '\n' && !inQ) {
      // Real row break
      row.push(cleanCell(cell)); cell = '';
      if (row.length > 0) rows.push(row);
      row = [];
    } else if (c === '\n' && inQ) {
      // Newline inside a quoted cell — preserve it
      cell += '\n';
    } else {
      cell += c;
    }
  }
  // Flush last cell/row
  if (cell || row.length) {
    row.push(cleanCell(cell));
    if (row.length > 0) rows.push(row);
  }

  if (rows.length === 0) return rows;

  const headerLength = rows[0].length;

  // Normalise every row to header length
  const normalised = rows.map(r => {
    const out = [...r];
    while (out.length < headerLength) out.push('');
    if (out.length > headerLength) out.splice(headerLength);
    return out;
  });

  // Drop all-empty data rows (Google Sheets exports trailing ghost rows)
  const header = normalised[0];
  const dataRows = normalised.slice(1).filter(r => r.some(cell => cell !== ''));

  return [header, ...dataRows];
}

// ─── Strict scan line parser ──────────────────────────────────────────────────
// Matches lines starting with User<word>_ and extracts technician + timestamp.
// Handles:
//   User1_samsung SM-M526B_abc @ 2026-05-06 15:01:33   → YYYY-MM-DD + HH:MM
//   User2_samsung SM-M526B_abc 06/05 18:36              → MM/DD + HH:MM (trailing, no @)
//   User3_devicename                                    → tech only, no timestamp
function parseStrictScanLines(raw) {
  if (!raw || !raw.trim()) return null;
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const results = [];

  for (const line of lines) {
    // Must start with User<word>_  (case-insensitive)
    const userMatch = line.match(/^(User[A-Za-z0-9]+)_/i);
    if (!userMatch) continue;

    // Extract both parts:
    //   userId     = "User1"            (the prefix before first _)
    //   deviceName = "samsung SM-M526B" (the part between first _ and next _ or @)
    const userId = userMatch[1];
    const afterPrefix = line.replace(/^User[A-Za-z0-9]+_/i, '');
    const deviceName = afterPrefix.split(/[_@]/)[0].trim();
    // Display as "User1 · samsung SM-M526B", fallback to just userId if no device name
    const userName = deviceName ? `${userId} · ${deviceName}` : userId;

    // Format 1: @ YYYY-MM-DD HH:MM  (most reliable, preferred)
    const isoMatch = line.match(/@\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/);
    if (isoMatch) {
      results.push({ userName, userId, deviceName, date: isoMatch[1], time: isoMatch[2] });
      continue;
    }

    // Format 2: MM/DD HH:MM at end of line (optional trailing whitespace)
    // Anchored with \s* at end so trailing spaces don't break the match
    const shortMatch = line.match(/(\d{2})\/(\d{2})\s+(\d{2}:\d{2})\s*$/);
    if (shortMatch) {
      const year = new Date().getFullYear();
      const mm = shortMatch[1], dd = shortMatch[2], time = shortMatch[3];
      results.push({ userName, userId, deviceName, date: `${year}-${mm}-${dd}`, time });
      continue;
    }

    // User_ found but no recognisable timestamp — record tech with nulls
    results.push({ userName, userId, deviceName, date: null, time: null });
  }

  return results.length > 0 ? results : null;
}

// ─── Extract ALL dates from a scan cell (returns sorted array, most recent first)
// Only matches timestamps that are part of a User_ scan entry to avoid false positives
// on asset IDs, serial numbers, or product codes that contain digits and slashes.
function extractDatesFromScanCell(raw) {
  if (!raw || !raw.trim()) return [];
  const dates = [];
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    // Only extract from lines that are actual User_ scan entries
    if (!/^User[A-Za-z0-9]+_/i.test(line)) continue;

    const isoMatch = line.match(/@\s*(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) { dates.push(isoMatch[1]); continue; }

    const shortMatch = line.match(/(\d{2})\/(\d{2})\s+\d{2}:\d{2}\s*$/);
    if (shortMatch) {
      dates.push(`${new Date().getFullYear()}-${shortMatch[1]}-${shortMatch[2]}`);
    }
  }

  return dates.sort().reverse(); // most recent first
}

// Returns the most recent scan date found across all scan columns of a row
function getRowDate(row) {
  const scanCols = ['Serial No', 'Condition', 'PSU-1 Cond', 'PSU-2 Cond'];
  const allDates = [];
  for (const col of scanCols) {
    const dates = extractDatesFromScanCell(row[col] || '');
    allDates.push(...dates);
  }
  if (allDates.length === 0) return null;
  // Return the most recent date found across all columns
  return allDates.sort().reverse()[0];
}

// ─── Build technician activity ────────────────────────────────────────────────
function buildTechActivity(data) {
  const scanCols = ['Serial No', 'Condition', 'PSU-1 Cond', 'PSU-2 Cond'];
  const activities = [];

  data.forEach(row => {
    scanCols.forEach(col => {
      const entries = parseStrictScanLines(row[col] || '');
      if (!entries) return;
      entries.forEach(e => {
        activities.push({ tech: e.userName, userId: e.userId, deviceName: e.deviceName, date: e.date, time: e.time });
      });
    });
  });

  // Sort most-recent first
  activities.sort((a, b) => {
    const fa = a.date && a.time ? `${a.date} ${a.time}` : '';
    const fb = b.date && b.time ? `${b.date} ${b.time}` : '';
    return fb.localeCompare(fa);
  });

  // Dedup by tech + date + time (same scan entry appearing across multiple cells)
  const seen = new Set();
  return activities.filter(a => {
    const key = `${a.tech}|${a.date}|${a.time}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 20);
}

// Extract just the plain status value from a cell (ignores User_ scan lines and blank/junk lines)
// Works whether status is on line 1 ("good\nUser1_...") or line 2 ("User1_...\ngood")
function extractStatus(raw) {
  if (!raw || !raw.trim()) return '';
  const lines = raw
    .replace(/[\uFEFF\u00A0\u200B]/g, '') // strip BOM/NBSP/zero-width
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
  for (const line of lines) {
    // Skip User_ scan lines
    if (/^User[A-Za-z0-9]+_/i.test(line)) continue;
    // Skip lines that look like timestamps or device strings
    if (/^\d{4}-\d{2}-\d{2}/.test(line)) continue;
    if (/^\d{2}\/\d{2}\s+\d{2}:\d{2}/.test(line)) continue;
    // Return first meaningful non-scan line as the status
    return line.toLowerCase();
  }
  return '';
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function computeStats(data) {
  const total = data.length;
  const scanned = data.filter(r => (r['Serial No'] || '').trim() !== '').length;
  const condGood  = data.filter(r => extractStatus(r['Condition'])   === 'good').length;
  const condDmg   = data.filter(r => extractStatus(r['Condition'])   === 'damaged').length;
  const condEmpty = data.filter(r => extractStatus(r['Condition'])   === '').length;
  const psu1Good  = data.filter(r => extractStatus(r['PSU-1 Cond'])  === 'good').length;
  const psu1Dmg   = data.filter(r => extractStatus(r['PSU-1 Cond'])  === 'damaged').length;
  const psu1Empty = data.filter(r => extractStatus(r['PSU-1 Cond'])  === '').length;
  const psu2Good  = data.filter(r => extractStatus(r['PSU-2 Cond'])  === 'good').length;
  const psu2Dmg   = data.filter(r => extractStatus(r['PSU-2 Cond'])  === 'damaged').length;
  const psu2Empty = data.filter(r => extractStatus(r['PSU-2 Cond'])  === '').length;
  const powerCord = data.filter(r => (r['Power Cord'] || '').trim() !== '').length;
  const rails     = data.filter(r => (r['Rails']      || '').trim() !== '').length;
  return {
    total, scanned, notScanned: total - scanned,
    condGood, condDmg, condEmpty,
    psu1Good, psu1Dmg, psu1Empty,
    psu2Good, psu2Dmg, psu2Empty,
    powerCord, rails,
  };
}

function pct(n, d) { return d > 0 ? Math.round((n / d) * 100) : 0; }

const C = {
  bg: '#f3f6fb', surface: '#ffffff', navy: '#0f172a', text: '#0f172a',
  muted: '#64748b', line: '#e2e8f0', blue: '#2563eb', cyan: '#0891b2',
  green: '#16a34a', red: '#dc2626', amber: '#d97706', violet: '#7c3aed', slate: '#475569',
};

// ─── Donut ────────────────────────────────────────────────────────────────────
function Donut({ good, damaged, empty, size = 90 }) {
  const r = 32, cx = 41, cy = 41, circ = 2 * Math.PI * r;
  const total = good + damaged + empty;
  const gD = (good / total || 0) * circ, dD = (damaged / total || 0) * circ, eD = (empty / total || 0) * circ;
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={size} height={size} viewBox="0 0 82 82">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        {eD > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke="#cbd5e1" strokeWidth="8" strokeDasharray={`${eD} ${circ - eD}`} strokeDashoffset={-(gD + dD)} transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="round" />}
        {dD > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.red} strokeWidth="8" strokeDasharray={`${dD} ${circ - dD}`} strokeDashoffset={-gD} transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="round" />}
        {gD > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.green} strokeWidth="8" strokeDasharray={`${gD} ${circ - gD}`} strokeDashoffset={0} transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="round" />}
        <text x={cx} y={cy + 5} textAnchor="middle" fill={C.text} fontSize="16" fontWeight="800">{pct(good, total)}%</text>
      </svg>
      <div style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>Good Condition</div>
    </div>
  );
}

// ─── Mini Pie ─────────────────────────────────────────────────────────────────
function MiniPieChart({ value, total, label, color }) {
  const p = total > 0 ? (value / total) * 100 : 0;
  const r = 28, cx = 35, cy = 35, circ = 2 * Math.PI * r;
  const dash = (p / 100) * circ;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
          <div style={{ fontSize: 11, color: C.muted }}>{Math.round(p)}% complete</div>
        </div>
        <svg width={70} height={70} viewBox="0 0 70 70">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth="7" />
          {p > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="7" strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={0} transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="round" />}
          <text x={cx} y={cy + 4} textAnchor="middle" fill={C.text} fontSize="13" fontWeight="800">{Math.round(p)}%</text>
        </svg>
      </div>
    </div>
  );
}

// ─── Stack Bar ────────────────────────────────────────────────────────────────
function StackBar({ good, damaged, empty, total, height = 8 }) {
  return (
    <div style={{ display: 'flex', height, borderRadius: 20, overflow: 'hidden', background: '#e2e8f0' }}>
      <div style={{ width: `${pct(good, total)}%`, background: C.green }} />
      <div style={{ width: `${pct(damaged, total)}%`, background: C.red }} />
      <div style={{ width: `${pct(empty, total)}%`, background: '#cbd5e1' }} />
    </div>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ value, max, label, color }) {
  const p = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color }}>{Math.round(p)}%</span>
      </div>
      <div style={{ height: 8, background: '#e2e8f0', borderRadius: 20, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${p}%`, background: color, borderRadius: 20, transition: 'width 0.6s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontSize: 10, color: C.muted }}>{value} completed</span>
        <span style={{ fontSize: 10, color: C.muted }}>{max - value} remaining</span>
      </div>
    </div>
  );
}

// ─── Status Card ──────────────────────────────────────────────────────────────
function StatusCard({ title, good, damaged, empty, total, accent }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16, padding: 18, borderTop: `3px solid ${accent}` }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 18 }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {[{ label: 'Scanned', val: good + damaged, color: accent }, { label: 'Good', val: good, color: C.green }, { label: 'Damaged', val: damaged, color: C.red }, { label: 'Empty', val: empty, color: C.slate }].map(({ label, val, color }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color }}>{val}</div>
            <div style={{ fontSize: 9, color: C.muted }}>{label}</div>
          </div>
        ))}
      </div>
      <StackBar good={good} damaged={damaged} empty={empty} total={total} />
      <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 10, flexWrap: 'wrap' }}>
        <span style={{ color: C.green }}>● {pct(good, total)}% Good</span>
        <span style={{ color: C.red }}>● {pct(damaged, total)}% Damaged</span>
        <span style={{ color: C.slate }}>● {pct(empty, total)}% Empty</span>
      </div>
    </div>
  );
}

// ─── Technician Activity Table ────────────────────────────────────────────────
function TechActivityTable({ data }) {
  const activities = useMemo(() => buildTechActivity(data), [data]);

  if (activities.length === 0) {
    return (
      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 20, overflow: 'hidden' }}>
        <div style={{ padding: 18, borderBottom: `1px solid ${C.line}`, fontWeight: 700 }}>👨‍🔧 Recent Technician Activity</div>
        <div style={{ padding: 32, textAlign: 'center', color: C.muted, fontSize: 13 }}>
          No <code>User_xxx</code> scan entries found in sheet yet.
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 20, overflow: 'hidden' }}>
      <div style={{ padding: 18, borderBottom: `1px solid ${C.line}`, fontWeight: 700 }}>
        👨‍🔧 Recent Technician Activity ({activities.length})
      </div>
      <div style={{ overflowX: 'auto', maxHeight: 320, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
            <tr>
              {['Technician', 'Date', 'Time'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.muted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activities.map((row, i) => (
              <tr key={i} style={{ borderTop: `1px solid ${C.line}` }}>
                <td style={{ padding: '10px 16px' }}>
                  {row.deviceName
                    ? <><div style={{ fontWeight: 700, color: C.blue, fontSize: 13 }}>{row.deviceName}</div>
                        <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{row.userId}</div></>
                    : <span style={{ fontWeight: 600, color: C.blue }}>{row.tech}</span>}
                </td>
                <td style={{ padding: '10px 16px', color: C.muted, fontSize: 12 }}>{row.date || '—'}</td>
                <td style={{ padding: '10px 16px', color: C.muted, fontSize: 12 }}>{row.time || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Multi-line cell renderer ─────────────────────────────────────────────────
// Renders each \n-separated line as its own styled block within one <td>
function MultiLineCell({ value, isCondition, getStatusColor }) {
  if (!value || !value.trim()) return <span style={{ color: C.muted }}>—</span>;

  const lines = value.split('\n').map(l => l.trim()).filter(Boolean);

  if (lines.length <= 1) {
    // For condition columns use extractStatus so BOM/junk doesn't affect colour
    const displayColor = isCondition ? getStatusColor(isCondition ? extractStatus(value) : value) : C.text;
    return (
      <span style={{ color: displayColor, fontWeight: isCondition ? 600 : 400 }}>
        {value || '—'}
      </span>
    );
  }

  // Multiple lines: show each as a pill/block stacked vertically
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {lines.map((line, idx) => {
        const lineStatus = isCondition ? extractStatus(line) : '';
        const bg = isCondition
          ? (lineStatus === 'good' ? '#dcfce7' : lineStatus === 'damaged' ? '#fee2e2' : '#f1f5f9')
          : '#f1f5f9';
        const color = isCondition ? getStatusColor(lineStatus) : C.text;
        return (
          <span
            key={idx}
            style={{
              display: 'block',
              fontSize: 11,
              padding: '2px 7px',
              borderRadius: 6,
              background: bg,
              color,
              fontWeight: isCondition ? 600 : 400,
              whiteSpace: 'nowrap',
              maxWidth: 220,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={line}
          >
            {line}
          </span>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const ExcelViewer = () => {
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
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
      if (!res.ok) throw new Error();
      const txt = await res.text();
      const rows = parseCSV(txt);
      if (!rows.length) throw new Error();
      const hdrs = rows[0];
      const dataRows = rows.slice(1).map(row => {
        const o = {}; hdrs.forEach((h, i) => { o[h] = row[i] || ''; }); return o;
      });
      setHeaders(hdrs);
      setData(dataRows);
    } catch {
      setError('Failed to load data. Make sure the sheet is public.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const st = data.length > 0 ? computeStats(data) : null;

  const displayHeaders = ['Name', 'Description', 'Product ID', 'Asset No', 'Serial No', 'Condition', 'PSU-1 Cond', 'PSU-2 Cond', 'Power Cord', 'Rails'];
  const visibleHeaders = displayHeaders.filter(h => headers.includes(h));

  const allDates = useMemo(() => {
    const s = new Set();
    data.forEach(row => { const d = getRowDate(row); if (d) s.add(d); });
    return Array.from(s).sort();
  }, [data]);

  const minDate = allDates[0] || '';
  const maxDate = allDates[allDates.length - 1] || '';

  let filteredRows = [...data];

  if (searchTerm) {
    filteredRows = filteredRows.filter(r =>
      Object.values(r).some(v => String(v).toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }

  if (dateFrom || dateTo) {
    filteredRows = filteredRows.filter(row => {
      const d = getRowDate(row);
      if (!d) return false;
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    });
  }

  if (sortKey) {
    filteredRows.sort((a, b) =>
      String(a[sortKey] || '').localeCompare(String(b[sortKey] || '')) * sortDir
    );
  }

  const getStatusColor = (val) => {
    // Use extractStatus so multi-line cells (with User_ scan lines) still get correct color
    const l = extractStatus(val) || String(val).trim().toLowerCase();
    if (l === 'good') return C.green;
    if (l === 'damaged') return C.red;
    return C.slate;
  };

  if (loading) return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, border: `3px solid ${C.line}`, borderTopColor: C.blue, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: C.muted }}>Loading inventory data...</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', background: C.surface, padding: 32, borderRadius: 20, border: `1px solid ${C.line}` }}>
        <p style={{ color: C.red, marginBottom: 20 }}>{error}</p>
        <button onClick={fetchData} style={{ background: C.navy, color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}>Retry</button>
      </div>
    </div>
  );

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: '#fff', borderBottom: `1px solid ${C.line}`, padding: '12px 24px', backdropFilter: 'blur(10px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#006d77" />
              <path d="M16 9L18.5 13.5H13.5L16 9Z" fill="white" />
              <path d="M16 23L13.5 18.5H18.5L16 23Z" fill="white" />
              <rect x="15" y="12" width="2" height="8" fill="white" />
              <path d="M9 16H7M25 16H23M16 7V5M16 27V25" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="16" cy="16" r="3" fill="white" />
            </svg>
            <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: C.text }}>Data Center Infra Management System</h1>
          </div>
          <button onClick={fetchData} style={{ background: C.navy, color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 500, fontSize: 13 }}>🔄 Refresh</button>
        </div>
      </div>

      <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '24px' }}>

        {/* KPI Cards */}
        {st && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 24 }}>
            <div style={{ background: `linear-gradient(135deg, ${C.navy}, #1e293b)`, borderRadius: 20, padding: 20, color: '#fff' }}>
              <div style={{ fontSize: 13, opacity: 0.8 }}>Total Assets</div>
              <div style={{ fontSize: 42, fontWeight: 800, marginTop: 8 }}>{st.total}</div>
              <div style={{ fontSize: 11, opacity: 0.6, marginTop: 8 }}>records loaded</div>
            </div>
            <MiniPieChart value={st.scanned} total={st.total} label="Scanned" color={C.blue} />
            <MiniPieChart value={st.notScanned} total={st.total} label="Pending Scan" color={C.amber} />
            <MiniPieChart value={st.powerCord} total={st.total} label="Power Cord" color={C.violet} />
            <MiniPieChart value={st.rails} total={st.total} label="Rails" color={C.cyan} />
          </div>
        )}

        {/* Progress & Condition */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          {st && (
            <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 20, padding: 20 }}>
              <ProgressBar value={st.scanned} max={st.total} label="Scan Completion" color={C.blue} />
            </div>
          )}
          {st && (
            <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 20, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 30, flexWrap: 'wrap' }}>
                <Donut good={st.condGood} damaged={st.condDmg} empty={st.condEmpty} size={100} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 20, marginBottom: 15 }}>
                    <div><div style={{ fontSize: 28, fontWeight: 800, color: C.green }}>{st.condGood}</div><div style={{ fontSize: 11, color: C.muted }}>Good</div></div>
                    <div><div style={{ fontSize: 28, fontWeight: 800, color: C.red }}>{st.condDmg}</div><div style={{ fontSize: 11, color: C.muted }}>Damaged</div></div>
                    <div><div style={{ fontSize: 28, fontWeight: 800, color: C.slate }}>{st.condEmpty}</div><div style={{ fontSize: 11, color: C.muted }}>Not filled</div></div>
                  </div>
                  <StackBar good={st.condGood} damaged={st.condDmg} empty={st.condEmpty} total={st.total} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PSU + Tech Activity */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          <div>
            {st && (
              <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 20, padding: 20, marginBottom: 24 }}>
                <StatusCard title="⚡ PSU-1 Status" good={st.psu1Good} damaged={st.psu1Dmg} empty={st.psu1Empty} total={st.total} accent={C.violet} />
              </div>
            )}
            {st && (
              <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 20, padding: 20 }}>
                <StatusCard title="⚡ PSU-2 Status" good={st.psu2Good} damaged={st.psu2Dmg} empty={st.psu2Empty} total={st.total} accent={C.cyan} />
              </div>
            )}
          </div>
          <TechActivityTable data={data} />
        </div>

        {/* Inventory Table */}
        <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 20, overflow: 'hidden' }}>
          <div style={{ padding: 18, borderBottom: `1px solid ${C.line}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <span style={{ fontWeight: 700 }}>📋 Inventory Details</span>
                <span style={{ marginLeft: 12, fontSize: 12, color: C.muted }}>
                  {filteredRows.length} of {data.length} records
                  {(dateFrom || dateTo) && (
                    <span style={{ marginLeft: 8, color: C.blue, fontWeight: 600 }}>· date filter active</span>
                  )}
                </span>
              </div>
              <input
                type="text"
                placeholder="🔍 Search inventory..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ padding: '8px 14px', border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 13, width: 220 }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>📅 Filter by scan date:</span>
              <label style={{ fontSize: 12, color: C.muted }}>From</label>
              <input
                type="date"
                value={dateFrom}
                min={minDate || undefined}
                max={dateTo || maxDate || undefined}
                onChange={e => setDateFrom(e.target.value)}
                style={{ padding: '6px 10px', border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 12, color: C.text, background: '#fff' }}
              />
              <label style={{ fontSize: 12, color: C.muted }}>To</label>
              <input
                type="date"
                value={dateTo}
                min={dateFrom || minDate || undefined}
                max={maxDate || undefined}
                onChange={e => setDateTo(e.target.value)}
                style={{ padding: '6px 10px', border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 12, color: C.text, background: '#fff' }}
              />
              {(dateFrom || dateTo) && (
                <button
                  onClick={() => { setDateFrom(''); setDateTo(''); }}
                  style={{ padding: '6px 14px', border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 12, background: '#fff4f4', color: C.red, cursor: 'pointer', fontWeight: 600 }}
                >
                  ✕ Clear
                </button>
              )}
              {allDates.length > 0 && (
                <span style={{ fontSize: 11, color: C.muted }}>
                  Available: {minDate} → {maxDate}
                </span>
              )}
            </div>
          </div>

          {/* Table body */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  {visibleHeaders.map(h => (
                    <th
                      key={h}
                      onClick={() => { if (sortKey === h) setSortDir(d => d * -1); else { setSortKey(h); setSortDir(1); } }}
                      style={{ padding: '12px 16px', textAlign: 'left', cursor: 'pointer', fontWeight: 700, color: sortKey === h ? C.blue : C.muted, borderBottom: `1px solid ${C.line}` }}
                    >
                      {h}{sortKey === h ? (sortDir === 1 ? ' ↑' : ' ↓') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.slice(0, 200).map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.line}`, background: i % 2 === 0 ? '#fff' : '#fafafa', verticalAlign: 'top' }}>
                    {visibleHeaders.map(h => {
                      const val = row[h] || '';
                      const isCondition = h.includes('Cond') || h === 'Condition';
                      return (
                        <td key={h} style={{ padding: '10px 16px', maxWidth: 240 }}>
                          <MultiLineCell value={val} isCondition={isCondition} getStatusColor={getStatusColor} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRows.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>No matching records</div>
            )}
            {filteredRows.length > 200 && (
              <div style={{ textAlign: 'center', padding: 12, fontSize: 11, color: C.muted, borderTop: `1px solid ${C.line}` }}>
                Showing first 200 of {filteredRows.length} records
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ExcelViewer;