// src/pages/Dashboard.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  parseCSV,
  computeStats,
  buildTechActivity,
  getRowDate,
  pct,
} from '../utils/excelUtils';
import { LoadingSpinner } from '../App';

const SHEET_ID = '1WvfO6YtmzIwf4XVEjLI-3Xu38WM_xWgapCWGtAtIxbo';

// ============================================================
// COLOR SYSTEM
// ============================================================
const C = {
  bg: '#f5f7fb',
  surface: '#ffffff',
  navy: '#1a2c3e',
  text: '#2c3e50',
  textSecondary: '#6c7a89',
  muted: '#95a5a6',
  line: '#e8ecef',
  border: '#dfe4e8',

  success: '#27ae60',
  successLight: '#e8f8f0',
  danger: '#e74c3c',
  dangerLight: '#fdedeb',
  warning: '#f39c12',
  warningLight: '#fef5e7',
  info: '#3498db',

  blue: '#3498db',
  cyan: '#1abc9c',
  green: '#2ecc71',
  red: '#e74c3c',
  amber: '#f39c12',
  violet: '#9b59b6',
  slate: '#7f8c8d',
  orange: '#e67e22',
  pink: '#e84393',
  purple: '#9b59b6',

  gradientBlue: 'linear-gradient(135deg, #3498db, #2980b9)',
  gradientGreen: 'linear-gradient(135deg, #27ae60, #2ecc71)',
  gradientOrange: 'linear-gradient(135deg, #f39c12, #e67e22)',
  gradientRed: 'linear-gradient(135deg, #e74c3c, #c0392b)',
  gradientPurple: 'linear-gradient(135deg, #9b59b6, #8e44ad)',
  gradientDark: 'linear-gradient(135deg, #2c3e50, #1a2c3e)',
};

// ============================================================
// SVG ICON COMPONENTS
// ============================================================
const IconBuilding  = () => (<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="22" x2="9" y2="18"/><line x1="15" y1="22" x2="15" y2="18"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/></svg>);
const IconScan      = () => (<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9V5a2 2 0 0 1 2-2h4"/><path d="M21 9V5a2 2 0 0 0-2-2h-4"/><path d="M3 15v4a2 2 0 0 0 2 2h4"/><path d="M21 15v4a2 2 0 0 1-2 2h-4"/><line x1="10" y1="3" x2="14" y2="3"/><line x1="10" y1="21" x2="14" y2="21"/></svg>);
const IconHeart     = () => (<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>);
const IconTool      = () => (<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>);
const IconDatabase  = () => (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>);
const IconStorage   = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>);
const IconNetwork   = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="4"/><circle cx="8" cy="8" r="2"/><circle cx="16" cy="16" r="2"/><line x1="10" y1="10" x2="14" y2="14"/><line x1="14" y1="10" x2="10" y2="14"/></svg>);
const IconGpu       = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="8" width="14" height="12" rx="2"/><circle cx="12" cy="14" r="2"/><line x1="8" y1="8" x2="8" y2="5"/><line x1="16" y1="8" x2="16" y2="5"/></svg>);
const IconCompute   = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="6" width="16" height="12" rx="2"/><line x1="8" y1="6" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="18"/><circle cx="12" cy="12" r="2"/></svg>);
const IconManagement= () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>);
const IconSearch    = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>);
const IconRefresh   = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/></svg>);
const IconClear     = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>);
const IconCalendar  = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>);
const IconClock     = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>);
const IconUser      = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>);

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
function cleanValue(value)        { return String(value || '').trim(); }

function normalizeKey(value) {
  return String(value || '').toLowerCase().replace(/-/g, ' ').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}

function hasMeaningfulValue(value) {
  const v = normalizeKey(value);
  return v !== '' && v !== '-' && v !== 'na' && v !== 'n/a' && v !== 'null' && v !== 'undefined' && v !== 'unknown';
}

function getStatusColor(value) {
  const v = normalizeKey(value);
  if (v.includes('good') || v.includes('ok') || v.includes('yes') || v.includes('scanned') || v.includes('completed') || v.includes('pass') || v.includes('working') || v.includes('available')) return C.green;
  if (v.includes('damage') || v.includes('damaged') || v.includes('bad') || v.includes('no') || v.includes('missing') || v.includes('pending') || v.includes('fail') || v.includes('failed')) return C.red;
  return C.slate;
}

function isPassValue(value) {
  const v = normalizeKey(value);
  return v.includes('good') || v.includes('ok') || v.includes('pass') || v.includes('passed') || v.includes('yes') || v.includes('scanned') || v.includes('completed') || v.includes('available') || v.includes('working');
}

function isFailValue(value) {
  const v = normalizeKey(value);
  if (v.includes('no damage')) return false;
  return v.includes('damage') || v.includes('damaged') || v.includes('bad') || v.includes('fail') || v.includes('failed') || v.includes('missing') || v.includes('pending') || v === 'no' || v === 'not ok' || v === 'not scanned';
}

function classifyParameterValue(value, header) {
  const h = normalizeKey(header);
  const v = cleanValue(value);
  if (!hasMeaningfulValue(v)) return null;
  if (isPassValue(v)) return 'pass';
  if (isFailValue(v)) return 'fail';
  if (h.includes('scan') || h.includes('barcode') || h.includes('asset no') || h.includes('serial no')) return 'pass';
  return null;
}

function findGroupHeader(headers) {
  const patterns = [/equipment\s*group/i, /equipment\s*type/i, /asset\s*type/i, /device\s*type/i, /category/i, /type/i, /name/i];
  for (const pattern of patterns) {
    const found = headers.find(h => pattern.test(h));
    if (found) return found;
  }
  return null;
}

function getGroupName(row, groupHeader) {
  if (groupHeader && hasMeaningfulValue(row[groupHeader])) return cleanValue(row[groupHeader]);
  return 'Uncategorized';
}

function findHeader(headers, patterns) {
  return headers.find(h => patterns.some(p => p.test(String(h || ''))));
}

function shortText(value, max = 35) {
  const text = cleanValue(value);
  if (!text) return '—';
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

/**
 * Normalise any date string from a spreadsheet cell into YYYY-MM-DD so it
 * can be compared with the <input type="date"> values from the filter bar.
 *
 * Handles:
 *   • YYYY-MM-DD   (ISO – already fine)
 *   • DD/MM/YYYY   (common spreadsheet locale)
 *   • MM/DD/YYYY   (US locale)
 *   • D-Mon-YYYY   (e.g. "4-Jan-2025")
 *   • JavaScript Date serialisation (timestamp numbers via Google Sheets export)
 */
function normaliseDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;

  // Already ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD/MM/YYYY or MM/DD/YYYY  →  try both; prefer DD/MM when day ≤ 12 is ambiguous
  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, a, b, y] = slashMatch;
    // If first part is clearly > 12 it must be DD; otherwise assume DD/MM/YYYY
    const dd = parseInt(a, 10) > 12 ? a.padStart(2, '0') : a.padStart(2, '0');
    const mm = parseInt(a, 10) > 12 ? b.padStart(2, '0') : b.padStart(2, '0');
    // Distinguish DD/MM vs MM/DD: if a>12 it's the day
    if (parseInt(a, 10) > 12) {
      return `${y}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`; // DD/MM → YYYY-MM-DD
    }
    return `${y}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`; // assume DD/MM/YYYY
  }

  // D-Mon-YYYY  e.g. "4-Jan-2025"
  const monMatch = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (monMatch) {
    const months = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };
    const mm = months[monMatch[2].toLowerCase()];
    if (mm) return `${monMatch[3]}-${mm}-${monMatch[1].padStart(2, '0')}`;
  }

  // Fallback: let Date parse it, then re-format
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }

  return null;
}

// ============================================================
// SHARED CHART PRIMITIVES
// ============================================================

/** Single donut ring – used for both metric cards and group status. */
function Donut({ value, total, size = 100, thickness = 10, color, showPercent = true, label }) {
  const percentage   = total > 0 ? (value / total) * 100 : 0;
  const radius       = (size - thickness) / 2;
  const circumference= 2 * Math.PI * radius;
  const offset       = circumference - (percentage / 100) * circumference;
  const resolvedColor = color ?? (percentage >= 80 ? C.success : percentage >= 50 ? C.warning : C.danger);
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={C.line} strokeWidth={thickness}/>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={resolvedColor} strokeWidth={thickness}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}/>
        {showPercent && (
          <text x={size/2} y={size/2 + size*0.06} textAnchor="middle" fill={C.text} fontSize={size*0.16} fontWeight="800">
            {Math.round(percentage)}%
          </text>
        )}
      </svg>
      {label && <span style={{ fontSize: 12, color: C.textSecondary, marginTop: 8, fontWeight: 600 }}>{label}</span>}
    </div>
  );
}

/** Horizontal stacked bar: green / red / grey. */
function StackBar({ good, damaged, empty, total }) {
  return (
    <div style={{ display: 'flex', height: 8, borderRadius: 10, overflow: 'hidden', background: C.line, width: '100%' }}>
      <div style={{ width: `${pct(good,    total)}%`, background: C.green }}/>
      <div style={{ width: `${pct(damaged, total)}%`, background: C.red }}/>
      <div style={{ width: `${pct(empty,   total)}%`, background: C.slate }}/>
    </div>
  );
}

// ============================================================
// SHARED UI COMPONENTS
// ============================================================

function MetricCard({ title, value, subtitle, icon: Icon, color = C.blue }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: C.surface, borderRadius: 20, padding: '20px',
        border: `1px solid ${hovered ? color : C.line}`,
        transition: 'all 0.3s ease',
        transform: hovered ? 'translateY(-4px)' : 'none',
        boxShadow: hovered ? '0 12px 24px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.04)',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{title}</span>
        <span style={{ color }}>{Icon && <Icon />}</span>
      </div>
      <div style={{ fontSize: 40, fontWeight: 800, color: C.text, marginBottom: 8, lineHeight: 1 }}>{value}</div>
      {subtitle && <div style={{ fontSize: 13, color: C.textSecondary, fontWeight: 500 }}>{subtitle}</div>}
    </div>
  );
}

function StatusCard({ title, good, damaged, empty, total }) {
  const rows = [
    { label: 'Total',   val: total,   color: total   > 0 ? C.blue  : C.slate },
    { label: 'Good',    val: good,    color: C.green },
    { label: 'Damaged', val: damaged, color: C.red   },
    { label: 'Empty',   val: empty,   color: C.slate },
  ];
  return (
    <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.textSecondary, textTransform: 'uppercase', marginBottom: 12 }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
        {rows.map(item => (
          <div key={item.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: item.color }}>{item.val}</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>{item.label}</div>
          </div>
        ))}
      </div>
      <StackBar good={good} damaged={damaged} empty={empty} total={total}/>
    </div>
  );
}

/** Condition card with donut + stack bar side-by-side. */
function ConditionCard({ good, damaged, empty, total }) {
  return (
    <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
      {/* Donut – reuse shared component, fixed 80 px */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 100, flexShrink: 0 }}>
        <Donut value={good} total={total} size={80} thickness={8} color={C.orange} label="Condition"/>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
          <div><div style={{ fontSize: 20, fontWeight: 800, color: C.green  }}>{good}</div>   <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Good</div></div>
          <div><div style={{ fontSize: 20, fontWeight: 800, color: C.red    }}>{damaged}</div><div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Damaged</div></div>
          <div><div style={{ fontSize: 20, fontWeight: 800, color: C.slate  }}>{empty}</div>  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Empty</div></div>
        </div>
        <StackBar good={good} damaged={damaged} empty={empty} total={total}/>
      </div>
    </div>
  );
}

/** Mini metric tile with a small donut ring (replaces MiniPieChart). */
function MiniMetricTile({ value, total, label }) {
  return (
    <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16, padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: 12, color: C.textSecondary, textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 32, fontWeight: 800, color: value > 0 ? C.blue : C.slate, lineHeight: 1 }}>{value}</div>
      </div>
      <Donut value={value} total={total} size={70} thickness={6} color={C.orange} showPercent/>
    </div>
  );
}

function StabilityCard({ title, passed, total }) {
  const percent  = total > 0 ? Math.round((passed / total) * 100) : 0;
  const barColor = percent >= 80 ? C.success : percent >= 50 ? C.warning : C.danger;
  return (
    <div
      style={{ background: C.surface, borderRadius: 12, padding: '12px 14px', border: `1px solid ${C.line}`, transition: 'transform 0.2s ease', cursor: 'pointer' }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ color: C.text, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={title}>{title}</div>
        <div style={{ color: C.textSecondary, fontSize: 12, fontWeight: 700 }}>{passed}/{total}</div>
      </div>
      <div style={{ height: 6, background: C.line, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ width: `${percent}%`, height: '100%', background: barColor, borderRadius: 10, transition: 'width 0.4s ease' }}/>
      </div>
    </div>
  );
}

// ============================================================
// SYSTEM PARAMETER MANAGER
// Dynamic PSU / Fan / Airflow / LED analytics.
// Device/group names are NOT hardcoded; they are read from the sheet.
// ============================================================
const SYSTEM_PARAMETER_TYPES = [
  {
    id: 'psu',
    title: 'PSU Stability',
    icon: <IconTool />,
    color: C.amber,
    patterns: [
      /\bpsu\b/i,
      /psu.*condition/i,
      /psu.*cond/i,
      /psu.*scan/i,
      /power\s*supply/i,
      /power\s*supply.*condition/i,
      /power\s*supply.*status/i,
    ],
  },
  {
    id: 'fan',
    title: 'Fan Stability',
    icon: <IconManagement />,
    color: C.cyan,
    patterns: [
      /\bfan\b/i,
      /fan.*condition/i,
      /fan.*status/i,
      /fan.*operation/i,
      /cooling\s*fan/i,
    ],
  },
  {
    id: 'airflow',
    title: 'Airflow Stability',
    icon: <IconNetwork />,
    color: C.blue,
    patterns: [
      /air\s*flow/i,
      /airflow/i,
      /air.*condition/i,
      /air.*status/i,
      /cooling/i,
      /ventilation/i,
    ],
  },
  {
    id: 'led',
    title: 'LED Stability',
    icon: <IconScan />,
    color: C.violet,
    patterns: [
      /\bled\b/i,
      /led.*condition/i,
      /led.*status/i,
      /indicator/i,
      /light.*status/i,
    ],
  },
];

function findSystemGroupHeader(headers) {
  const patterns = [
    /equipment\s*group/i,
    /equipment\s*type/i,
    /asset\s*type/i,
    /device\s*type/i,
    /device\s*category/i,
    /category/i,
    /group/i,
    /type/i,
    /name/i,
    /description/i,
    /product\s*id/i,
  ];

  for (const pattern of patterns) {
    const found = headers.find(h => pattern.test(String(h || '')));
    if (found) return found;
  }

  return null;
}

function getSystemGroupName(row, groupHeader) {
  if (groupHeader && hasMeaningfulValue(row[groupHeader])) {
    return cleanValue(row[groupHeader]);
  }

  return 'Uncategorized';
}

function findMatchingSystemColumns(headers, patterns) {
  return headers.filter(h => {
    const test = String(h || '');

    const blocked =
      /image/i.test(test) ||
      /preview/i.test(test) ||
      /path/i.test(test) ||
      /audit/i.test(test) ||
      /last\s*updated/i.test(test) ||
      /^description$/i.test(test) ||
      /^product\s*id$/i.test(test) ||
      /^name$/i.test(test);

    if (blocked) return false;

    return patterns.some(p => p.test(test));
  });
}

function classifySystemParameterValue(value, header) {
  const h = normalizeKey(header);
  const v = cleanValue(value);

  if (!hasMeaningfulValue(v)) return null;

  if (v.toLowerCase().includes('no damage')) return 'pass';
  if (isFailValue(v)) return 'fail';
  if (isPassValue(v)) return 'pass';

  // For scan/barcode fields, any non-empty value means the check was completed.
  if (
    h.includes('scan') ||
    h.includes('barcode') ||
    h.includes('serial') ||
    h.includes('asset')
  ) {
    return 'pass';
  }

  return null;
}

function getSystemParameterState(row, columns) {
  if (!columns?.length) return null;

  let hasPass = false;
  let hasFail = false;

  for (const col of columns) {
    const state = classifySystemParameterValue(row[col], col);

    if (state === 'pass') hasPass = true;
    if (state === 'fail') hasFail = true;
  }

  // Any failed related field makes that unit fail for that parameter.
  if (hasFail) return 'fail';
  if (hasPass) return 'pass';

  return null;
}

function SystemParameterManager({ data }) {
  const headers = useMemo(
    () => data?.length ? Object.keys(data[0]).filter(h => h.trim()) : [],
    [data]
  );

  const groupHeader = useMemo(() => findSystemGroupHeader(headers), [headers]);

  const columnMap = useMemo(() => {
    const map = {};

    SYSTEM_PARAMETER_TYPES.forEach(parameter => {
      map[parameter.id] = findMatchingSystemColumns(headers, parameter.patterns);
    });

    return map;
  }, [headers]);

  const analytics = useMemo(() => SYSTEM_PARAMETER_TYPES.map(parameter => {
    const columns = columnMap[parameter.id] || [];
    const groups = new Map();

    let totalPassed = 0;
    let totalChecked = 0;

    data?.forEach(row => {
      const state = getSystemParameterState(row, columns);
      if (!state) return;

      const groupName = getSystemGroupName(row, groupHeader);

      if (!groups.has(groupName)) {
        groups.set(groupName, {
          name: groupName,
          passed: 0,
          total: 0,
        });
      }

      const group = groups.get(groupName);

      group.total += 1;
      totalChecked += 1;

      if (state === 'pass') {
        group.passed += 1;
        totalPassed += 1;
      }
    });

    return {
      ...parameter,
      columns,
      totalPassed,
      totalChecked,
      groups: Array.from(groups.values())
        .filter(group => group.total > 0)
        .sort((a, b) => b.total - a.total),
    };
  }), [data, groupHeader, columnMap]);

  const hasData = analytics.some(a => a.totalChecked > 0);

  const overallStatus = analytics.reduce(
    (acc, parameter) => {
      if (parameter.totalChecked > 0) {
        acc.total += parameter.totalChecked;
        acc.passed += parameter.totalPassed;
      }

      return acc;
    },
    { passed: 0, total: 0 }
  );

  return (
    <div style={{ background: C.surface, borderRadius: 20, border: `1px solid ${C.line}`, overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.line}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.text }}>System Parameters</h2>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: C.textSecondary }}>PSU, Fan, Airflow & LED stability across all devices</p>
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ background: C.bg, padding: '6px 16px', borderRadius: 30 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary }}>
                Grouped by: {groupHeader || 'Detected Group'}
              </span>
            </div>

            <Donut
              value={overallStatus.passed}
              total={overallStatus.total}
              size={70}
              thickness={8}
              label="Overall Score"
            />
          </div>
        </div>
      </div>

      <div style={{ padding: '24px' }}>
        {!hasData ? (
          <div style={{ padding: 50, textAlign: 'center', background: C.bg, borderRadius: 16 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📡</div>
            <div style={{ fontSize: 16, color: C.textSecondary }}>
              No PSU, Fan, Airflow, or LED data found. Add matching columns to see analytics.
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 20 }}>
            {analytics
              .filter(parameter => parameter.totalChecked > 0)
              .map(parameter => {
                const scorePct = Math.round((parameter.totalPassed / parameter.totalChecked) * 100);
                const barColor = scorePct >= 80 ? C.success : scorePct >= 60 ? C.warning : C.danger;
                const avgPerGroup = Math.round(parameter.totalChecked / (parameter.groups.length || 1));
                const lowestGroup = parameter.groups.length > 0
                  ? parameter.groups.reduce(
                      (min, group) =>
                        (group.passed / group.total) < (min.passed / min.total)
                          ? group
                          : min,
                      parameter.groups[0]
                    )
                  : null;
                const lowestRate = lowestGroup
                  ? Math.round((lowestGroup.passed / lowestGroup.total) * 100)
                  : 100;

                return (
                  <div key={parameter.id} style={{ background: C.bg, borderRadius: 16, padding: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: `${parameter.color}20`,
                          borderRadius: 12,
                          color: parameter.color,
                        }}
                      >
                        {parameter.icon}
                      </div>

                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.text }}>
                          {parameter.title}
                        </h3>
                        <span style={{ fontSize: 12, color: C.textSecondary }}>
                          {parameter.totalPassed}/{parameter.totalChecked} passed | {parameter.groups.length} groups
                        </span>
                      </div>

                      <Donut
                        value={parameter.totalPassed}
                        total={parameter.totalChecked}
                        size={56}
                        thickness={5}
                        color={parameter.color}
                      />
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary }}>Score</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: barColor }}>{scorePct}%</span>
                      </div>

                      <div style={{ height: 6, background: C.line, borderRadius: 10, overflow: 'hidden' }}>
                        <div style={{ width: `${scorePct}%`, height: '100%', background: barColor, borderRadius: 10 }} />
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 12,
                        marginBottom: 16,
                        padding: 10,
                        background: C.surface,
                        borderRadius: 12,
                      }}
                    >
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: parameter.color }}>
                          {parameter.groups.length}
                        </div>
                        <div style={{ fontSize: 10, color: C.textSecondary }}>Active Groups</div>
                      </div>

                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: C.warning }}>
                          {avgPerGroup}
                        </div>
                        <div style={{ fontSize: 10, color: C.textSecondary }}>Avg Checks/Group</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.textSecondary, marginBottom: 4 }}>
                        Device Groups
                      </div>

                      {parameter.groups.slice(0, 4).map(group => (
                        <StabilityCard
                          key={`${parameter.id}-${group.name}`}
                          title={group.name}
                          passed={group.passed}
                          total={group.total}
                        />
                      ))}

                      {parameter.groups.length > 4 && (
                        <div style={{ fontSize: 11, color: C.textSecondary, textAlign: 'center', paddingTop: 6 }}>
                          +{parameter.groups.length - 4} more groups
                        </div>
                      )}
                    </div>

                    {scorePct < 70 && (
                      <div style={{ marginTop: 12, padding: 8, background: C.dangerLight, borderRadius: 8, fontSize: 11, color: C.danger, textAlign: 'center' }}>
                        ⚠️ Score below threshold – Review {parameter.title}
                      </div>
                    )}

                    {lowestRate < 50 && lowestGroup && (
                      <div style={{ marginTop: 8, padding: 6, background: C.warningLight, borderRadius: 8, fontSize: 10, color: C.warning }}>
                        Critical: {shortText(lowestGroup.name, 20)} at {lowestRate}% status
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// CABLING ANALYTICS
// ============================================================
const CABLING_DATA = [
  { rack: 'Rack A', total: 12, connected: 11, labeled: 10, routed:  9, portMapped: 10 },
  { rack: 'Rack B', total: 10, connected:  8, labeled:  7, routed:  8, portMapped:  6 },
  { rack: 'Rack C', total: 14, connected: 13, labeled: 12, routed: 11, portMapped: 12 },
  { rack: 'Rack D', total:  8, connected:  6, labeled:  5, routed:  6, portMapped:  5 },
  { rack: 'Rack E', total: 16, connected: 15, labeled: 14, routed: 13, portMapped: 14 },
];

const CABLING_PARAMS = [
  { id: 'connected',  title: 'Connectivity', icon: '🔌', color: C.blue,   description: 'Physical connection status' },
  { id: 'labeled',    title: 'Labeling',     icon: '🏷️', color: C.violet, description: 'Documentation accuracy' },
  { id: 'routed',     title: 'Routing',      icon: '🔄', color: C.cyan,   description: 'Path verification' },
  { id: 'portMapped', title: 'Port Mapping', icon: '🗺️', color: C.orange, description: 'Port assignment accuracy' },
];

function CablingAnalytics() {
  const totalPorts = CABLING_DATA.reduce((s, r) => s + r.total, 0);
  return (
    <div style={{ background: C.surface, borderRadius: 20, border: `1px solid ${C.line}`, overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.line}` }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.text }}>Cabling Infrastructure</h2>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: C.textSecondary }}>Connectivity, labeling, routing & port mapping status by rack</p>
      </div>
      <div style={{ padding: '24px' }}>
        {/* Summary tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
          {CABLING_PARAMS.map(param => {
            const passed = CABLING_DATA.reduce((s, r) => s + r[param.id], 0);
            const rate   = Math.round((passed / totalPorts) * 100);
            return (
              <div key={param.id} style={{ textAlign: 'center', padding: 20, background: C.bg, borderRadius: 16, transition: 'transform 0.2s ease', cursor: 'pointer' }}
                   onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                   onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{param.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{param.title}</div>
                <div style={{ fontSize: 11, color: C.textSecondary, marginBottom: 12 }}>{param.description}</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: param.color }}>{rate}%</div>
                <div style={{ fontSize: 12, color: C.textSecondary }}>{passed}/{totalPorts} completed</div>
                <div style={{ marginTop: 12, height: 6, background: C.line, borderRadius: 10 }}>
                  <div style={{ width: `${rate}%`, height: '100%', background: param.color, borderRadius: 10 }}/>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.bg }}>
                <th style={{ padding: '14px 12px', textAlign: 'left',   fontSize: 13, fontWeight: 700, color: C.textSecondary }}>Rack</th>
                {CABLING_PARAMS.map(p => (
                  <th key={p.id} style={{ padding: '14px 12px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: C.textSecondary }}>{p.title}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CABLING_DATA.map(rack => (
                <tr key={rack.rack} style={{ borderBottom: `1px solid ${C.line}` }}>
                  <td style={{ padding: '14px 12px', fontWeight: 700, fontSize: 14, color: C.text }}>
                    {rack.rack} <span style={{ fontSize: 11, color: C.textSecondary }}>({rack.total} ports)</span>
                  </td>
                  {CABLING_PARAMS.map(p => {
                    const v = rack[p.id];
                    const col = v === rack.total ? C.success : v > rack.total / 2 ? C.warning : C.danger;
                    return (
                      <td key={p.id} style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{ color: col }}>{p.icon} {v}/{rack.total}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// INVENTORY INTELLIGENCE
// ============================================================
function InventoryIntelligence({ data }) {
  const headers   = useMemo(() => data?.length ? Object.keys(data[0]).filter(h => h.trim()) : [], [data]);
  const columnMap = useMemo(() => ({
    productId: findHeader(headers, [/product\s*id/i, /^pid$/i, /product/i]),
    condition: findHeader(headers, [/condition/i]),
    serialNo:  findHeader(headers, [/serial/i]),
  }), [headers]);

  const analytics = useMemo(() => {
    if (!data?.length) return { total: 0, unique: 0, scanned: 0, damaged: 0, good: 0, pending: 0, scanRate: 0, conditionScore: 0, products: [] };
    const productMap = new Map();
    let scanned = 0, damaged = 0, good = 0, pending = 0;
    data.forEach(row => {
      const pid      = row[columnMap.productId] || 'Unknown';
      const hasScan  = hasMeaningfulValue(row[columnMap.serialNo]);
      const condColor= getStatusColor(row[columnMap.condition]);
      const isDmg    = condColor === C.red;
      const isGood   = condColor === C.green;
      if (hasScan)  scanned++;
      if (isDmg)    damaged++;
      if (isGood)   good++;
      if (!hasScan && !isDmg && !isGood) pending++;
      if (!productMap.has(pid)) productMap.set(pid, { productId: pid, total: 0, scanned: 0, damaged: 0, good: 0 });
      const p = productMap.get(pid);
      p.total++;
      if (hasScan) p.scanned++;
      if (isDmg)   p.damaged++;
      if (isGood)  p.good++;
    });
    const total = data.length;
    return {
      total, unique: productMap.size, scanned, damaged, good, pending,
      scanRate:    Math.round((scanned / total) * 100),
      conditionScore: Math.round(((total - damaged) / total) * 100),
      products:    Array.from(productMap.values()).sort((a, b) => b.total - a.total).slice(0, 6),
    };
  }, [data, columnMap]);

  return (
    <div style={{ background: C.surface, borderRadius: 20, border: `1px solid ${C.line}`, overflow: 'hidden', height: '100%' }}>
      <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.line}` }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.text }}>Inventory Intelligence</h2>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: C.textSecondary }}>Asset tracking, condition monitoring & product analytics</p>
      </div>
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 20 }}>
          <div style={{ background: C.bg, borderRadius: 16, padding: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800 }}>Condition Distribution</h3>
            <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 16 }}>
              <Donut value={analytics.good}    total={analytics.total} size={80} thickness={8} color={C.success} label="Good"/>
              <Donut value={analytics.damaged} total={analytics.total} size={80} thickness={8} color={C.danger}  label="Damaged"/>
              <Donut value={analytics.pending} total={analytics.total} size={80} thickness={8} color={C.warning} label="Pending"/>
            </div>
            <div style={{ height: 6, background: C.line, borderRadius: 10, display: 'flex' }}>
              <div style={{ width: `${(analytics.good    / analytics.total) * 100}%`, background: C.success }}/>
              <div style={{ width: `${(analytics.damaged / analytics.total) * 100}%`, background: C.danger }}/>
              <div style={{ width: `${(analytics.pending / analytics.total) * 100}%`, background: C.warning }}/>
            </div>
          </div>
          <div style={{ background: C.bg, borderRadius: 16, padding: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800 }}>Top Products</h3>
            {analytics.products.map(p => {
              const rate = Math.round((p.good / p.total) * 100);
              return (
                <div key={p.productId} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{shortText(p.productId, 20)}</span>
                    <span style={{ fontSize: 12, color: rate >= 80 ? C.success : rate >= 50 ? C.warning : C.danger }}>{rate}% good</span>
                  </div>
                  <div style={{ height: 4, background: C.line, borderRadius: 10 }}>
                    <div style={{ width: `${rate}%`, height: '100%', background: rate >= 80 ? C.success : rate >= 50 ? C.warning : C.danger, borderRadius: 10 }}/>
                  </div>
                  <div style={{ fontSize: 10, color: C.textSecondary, marginTop: 4 }}>{p.scanned}/{p.total} scanned | {p.damaged} damaged</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TECHNICIAN ACTIVITY TABLE
// ============================================================
function TechnicianActivityTable({ activities }) {
  return (
    <div style={{ background: C.surface, borderRadius: 20, border: `1px solid ${C.line}`, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.line}` }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.text }}>Technician Activity Log</h2>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: C.textSecondary }}>Recent scans, updates & maintenance actions</p>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activities.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: C.textSecondary }}>No recent activity</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.line}` }}>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: C.textSecondary }}>Technician</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: C.textSecondary }}>Date</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: C.textSecondary }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((row, i) => (
                <tr key={i} style={{ borderBottom: i !== activities.length - 1 ? `1px solid ${C.line}` : 'none' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><IconUser /> {row.userName}</td>
                  <td style={{ padding: '14px 16px', color: C.textSecondary }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><IconCalendar /> {row.date || '—'}</div></td>
                  <td style={{ padding: '14px 16px', color: C.textSecondary }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><IconClock /> {row.time || '—'}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MAIN DASHBOARD
// ============================================================
export default function Dashboard() {
  const [data,       setData      ] = useState([]);
  const [loading,    setLoading   ] = useState(true);
  const [error,      setError     ] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom,   setDateFrom  ] = useState('');
  const [dateTo,     setDateTo    ] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res  = await fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`);
      const txt  = await res.text();
      const rows = parseCSV(txt);
      const hdrs = rows[0] || [];
      const dataRows = rows.slice(1).map(row => {
        const o = {};
        hdrs.forEach((h, i) => { o[h] = row[i] || ''; });
        return o;
      });
      setData(dataRows);
    } catch {
      setError('Failed to load data.');
    }
  }, []);

  useEffect(() => { setLoading(true); fetchData().finally(() => setLoading(false)); }, [fetchData]);
  useEffect(() => { const t = setInterval(fetchData, 30000); return () => clearInterval(t); }, [fetchData]);

  // Compute the normalised date for every row once, stored alongside the row.
  const dataWithDates = useMemo(() => data.map(row => ({ row, isoDate: normaliseDate(getRowDate(row)) })), [data]);

  const filteredData = useMemo(() => {
    return dataWithDates
      .filter(({ row, isoDate }) => {
        // Text search
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          if (!Object.values(row).some(v => String(v).toLowerCase().includes(term))) return false;
        }
        // Date range — both sides are YYYY-MM-DD strings; lexicographic comparison is correct for ISO dates
        if (dateFrom || dateTo) {
          if (!isoDate) return false;                   // row has no parseable date → exclude when a filter is active
          if (dateFrom && isoDate < dateFrom) return false;
          if (dateTo   && isoDate > dateTo  ) return false;
        }
        return true;
      })
      .map(({ row }) => row);
  }, [dataWithDates, searchTerm, dateFrom, dateTo]);

  // Derive sorted unique ISO dates from the dataset for clamping the date pickers
  const allIsoDates = useMemo(
    () => Array.from(new Set(dataWithDates.map(d => d.isoDate).filter(Boolean))).sort(),
    [dataWithDates],
  );

  const st         = useMemo(() => filteredData.length > 0 ? computeStats(filteredData) : null, [filteredData]);
  const activities = useMemo(() => buildTechActivity(filteredData), [filteredData]);

  if (loading) return <LoadingSpinner />;
  if (error)   return <div style={{ color: C.red, padding: 60, textAlign: 'center' }}>{error}</div>;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ maxWidth: 1600, margin: '0 auto', padding: '32px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32, animation: 'fadeInUp 0.5s ease-out' }}>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, background: C.gradientBlue, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Asset Management Dashboard
          </h1>
          <p style={{ marginTop: 10, color: C.textSecondary, fontSize: 15 }}>Real-time asset monitoring, predictive analytics & infrastructure status</p>
        </div>

        {/* Search & Filters */}
        <div style={{ background: C.surface, borderRadius: 20, padding: '16px 24px', marginBottom: 32, border: `1px solid ${C.line}`, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', flex: 1 }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 250 }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}><IconSearch /></span>
              <input type="text" placeholder="Search assets…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '12px 16px 12px 44px', background: C.bg, border: `1px solid ${C.line}`, borderRadius: 14, fontSize: 14, outline: 'none' }}/>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <IconCalendar />
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                min={allIsoDates[0]} max={allIsoDates[allIsoDates.length - 1]}
                style={{ padding: '11px 14px', background: C.bg, border: `1px solid ${C.line}`, borderRadius: 12, fontSize: 13 }}/>
              <span>→</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                min={allIsoDates[0]} max={allIsoDates[allIsoDates.length - 1]}
                style={{ padding: '11px 14px', background: C.bg, border: `1px solid ${C.line}`, borderRadius: 12, fontSize: 13 }}/>
            </div>
          </div>
          {(searchTerm || dateFrom || dateTo) && (
            <button onClick={() => { setSearchTerm(''); setDateFrom(''); setDateTo(''); }}
              style={{ padding: '11px 22px', background: C.dangerLight, border: 'none', borderRadius: 14, color: C.danger, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconClear /> Clear
            </button>
          )}
          <button onClick={fetchData}
            style={{ padding: '11px 24px', background: C.gradientBlue, border: 'none', borderRadius: 14, color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconRefresh /> Refresh
          </button>
        </div>

        {st && (
          <>
            {/* Top Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 28 }}>
              <MetricCard title="Total Assets"  value={st.total}                                            subtitle="active devices"                         icon={IconBuilding}/>
              <MetricCard title="Scan Rate"     value={`${Math.round((st.scanned / st.total) * 100)}%`}    subtitle={`${st.scanned}/${st.total}`}            icon={IconScan}    color={C.cyan}/>
              <MetricCard title="Score"  value={`${Math.round(((st.total - st.condDmg) / st.total) * 100)}%`} subtitle={`${st.condDmg} damaged`}    icon={IconHeart}   color={st.condDmg === 0 ? C.success : C.warning}/>
              <MetricCard title="Accessories"   value={st.powerCord + st.rails}                             subtitle={`${st.powerCord} cords, ${st.rails} rails`} icon={IconTool} color={C.violet}/>
            </div>

            {/* PSU & Condition */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: 20, marginBottom: 28 }}>
              <StatusCard  title="PSU-1 Status" good={st.psu1Good} damaged={st.psu1Dmg} empty={st.psu1Empty} total={st.total}/>
              <StatusCard  title="PSU-2 Status" good={st.psu2Good} damaged={st.psu2Dmg} empty={st.psu2Empty} total={st.total}/>
              <ConditionCard good={st.condGood} damaged={st.condDmg} empty={st.condEmpty} total={st.total}/>
            </div>

            {/* Power & Rails */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
              <MiniMetricTile value={st.powerCord} total={st.total} label="Power Cord Availability"/>
              <MiniMetricTile value={st.rails}     total={st.total} label="Rails Availability"/>
            </div>

            {/* Technician + Inventory */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 24, marginBottom: 28 }}>
              <TechnicianActivityTable activities={activities}/>
              <InventoryIntelligence   data={filteredData}/>
            </div>
          </>
        )}

        {/* System Parameters */}
        <div style={{ marginBottom: 28 }}>
          <SystemParameterManager data={filteredData}/>
        </div>

        {/* Cabling */}
        <CablingAnalytics />
      </div>
    </div>
  );
}