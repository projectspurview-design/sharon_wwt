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

const C = {
  bg: '#f8fafc',
  surface: '#ffffff',
  navy: '#0f172a',
  text: '#1e293b',
  muted: '#64748b',
  line: '#e2e8f0',
  blue: '#2563eb',
  cyan: '#0891b2',
  green: '#10b981',
  red: '#ef4444',
  amber: '#f59e0b',
  violet: '#8b5cf6',
  slate: '#94a3b8',
  orange: '#f97316',
};

// --- COMMON HELPERS ---

function cleanValue(value) {
  return String(value || '').trim();
}

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasMeaningfulValue(value) {
  const v = normalizeKey(value);

  return (
    v !== '' &&
    v !== '-' &&
    v !== 'na' &&
    v !== 'n/a' &&
    v !== 'null' &&
    v !== 'undefined' &&
    v !== 'unknown'
  );
}

function getStatusColor(value) {
  const v = normalizeKey(value);

  if (
    v.includes('no damage') ||
    v.includes('good') ||
    v.includes('ok') ||
    v.includes('yes') ||
    v.includes('scanned') ||
    v.includes('completed') ||
    v.includes('pass') ||
    v.includes('working') ||
    v.includes('available')
  ) {
    return C.green;
  }

  if (
    v.includes('damage') ||
    v.includes('damaged') ||
    v.includes('bad') ||
    v.includes('no') ||
    v.includes('missing') ||
    v.includes('pending') ||
    v.includes('fail') ||
    v.includes('failed')
  ) {
    return C.red;
  }

  return C.slate;
}

function isPassValue(value) {
  const v = normalizeKey(value);

  return (
    v.includes('no damage') ||
    v.includes('good') ||
    v.includes('ok') ||
    v.includes('pass') ||
    v.includes('passed') ||
    v.includes('yes') ||
    v.includes('scanned') ||
    v.includes('completed') ||
    v.includes('available') ||
    v.includes('working')
  );
}

function isFailValue(value) {
  const v = normalizeKey(value);

  if (v.includes('no damage')) {
    return false;
  }

  return (
    v.includes('damage') ||
    v.includes('damaged') ||
    v.includes('bad') ||
    v.includes('fail') ||
    v.includes('failed') ||
    v.includes('missing') ||
    v.includes('pending') ||
    v === 'no' ||
    v === 'not ok' ||
    v === 'not scanned'
  );
}

function classifyParameterValue(value, header) {
  const h = normalizeKey(header);
  const v = cleanValue(value);

  if (!hasMeaningfulValue(v)) {
    return null;
  }

  if (isPassValue(v)) {
    return 'pass';
  }

  if (isFailValue(v)) {
    return 'fail';
  }

  if (
    h.includes('scan') ||
    h.includes('barcode') ||
    h.includes('asset no') ||
    h.includes('serial no')
  ) {
    return 'pass';
  }

  return null;
}

function isParameterHeader(header) {
  const h = normalizeKey(header);

  if (!h) return false;

  const blocked =
    h.includes('image') ||
    h.includes('preview') ||
    h.includes('path') ||
    h.includes('audit') ||
    h.includes('last updated') ||
    h.includes('description') ||
    h.includes('product id') ||
    h === 'name';

  if (blocked) return false;

  return (
    h.includes('condition') ||
    h.includes('cond') ||
    h.includes('status') ||
    h.includes('scan') ||
    h.includes('barcode') ||
    h.includes('power cord') ||
    h.includes('rails') ||
    h.includes('psu') ||
    h.includes('fan') ||
    h.includes('air') ||
    h.includes('led')
  );
}

function findGroupHeader(headers) {
  const preferredPatterns = [
    /equipment\s*group/i,
    /equipment\s*type/i,
    /asset\s*type/i,
    /device\s*type/i,
    /category/i,
    /type/i,
    /name/i,
  ];

  for (const pattern of preferredPatterns) {
    const found = headers.find((header) => pattern.test(header));
    if (found) return found;
  }

  return null;
}

function getGroupName(row, groupHeader) {
  if (groupHeader && hasMeaningfulValue(row[groupHeader])) {
    return cleanValue(row[groupHeader]);
  }

  return 'Uncategorized';
}

function makeTitleFromHeader(header) {
  return String(header || '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findHeader(headers, patterns) {
  return headers.find((header) =>
    patterns.some((pattern) => pattern.test(String(header || '')))
  );
}

function getValueByHeader(row, header) {
  if (!header) return '';
  return cleanValue(row[header]);
}

function shortText(value, max = 28) {
  const text = cleanValue(value);
  if (!text) return '—';
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

// --- COMPACT TABLE STYLES ---

const compactTh = {
  padding: '9px 12px',
  textAlign: 'left',
  fontWeight: 900,
  color: C.navy,
  fontSize: 10,
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
};

const compactTd = {
  padding: '9px 12px',
  color: C.slate,
  fontWeight: 700,
  whiteSpace: 'nowrap',
};

const compactTdStrong = {
  padding: '9px 12px',
  color: C.navy,
  fontWeight: 800,
  whiteSpace: 'nowrap',
};

// --- COMMON UI COMPONENTS ---

function CompactStat({ label, value, subText, color = C.blue }) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: `1px solid ${C.line}`,
        borderRadius: 10,
        padding: '10px 12px',
        minHeight: 68,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: C.muted,
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.4px',
          marginBottom: 6,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 22,
          color,
          fontWeight: 900,
          lineHeight: 1,
        }}
      >
        {value}
      </div>

      {subText && (
        <div
          style={{
            fontSize: 10,
            color: C.slate,
            fontWeight: 700,
            marginTop: 6,
          }}
        >
          {subText}
        </div>
      )}
    </div>
  );
}

function Donut({ good, damaged, empty, size = 60 }) {
  const r = 26;
  const cx = 32;
  const cy = 32;
  const circ = 2 * Math.PI * r;
  const total = good + damaged + empty || 1;

  const gD = (good / total) * circ;
  const dD = (damaged / total) * circ;
  const eD = (empty / total) * circ;

  const pctGood = Math.round((good / total) * 100) || 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '84px',
        flexShrink: 0,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 64 64">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="6" />

        {eD > 0 && (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={C.slate}
            strokeWidth="6"
            strokeDasharray={`${eD} ${circ - eD}`}
            strokeDashoffset={-(gD + dD)}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="round"
          />
        )}

        {dD > 0 && (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={C.red}
            strokeWidth="6"
            strokeDasharray={`${dD} ${circ - dD}`}
            strokeDashoffset={-gD}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="round"
          />
        )}

        {gD > 0 && (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={C.green}
            strokeWidth="6"
            strokeDasharray={`${gD} ${circ - gD}`}
            strokeDashoffset={0}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="round"
          />
        )}

        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fill={C.orange}
          fontSize="13"
          fontWeight="800"
        >
          {pctGood}%
        </text>
      </svg>

      <div
        style={{
          fontSize: 10,
          color: C.muted,
          marginTop: 4,
          fontWeight: 700,
          textTransform: 'uppercase',
        }}
      >
        Condition
      </div>
    </div>
  );
}

function MiniPieChart({ value, total, label }) {
  const p = total > 0 ? (value / total) * 100 : 0;
  const r = 20;
  const cx = 24;
  const cy = 24;
  const circ = 2 * Math.PI * r;
  const dash = (p / 100) * circ;
  const valColor = value > 0 ? C.blue : C.slate;

  return (
    <div
      style={{
        flex: 1,
        background: C.surface,
        border: `1px solid ${C.line}`,
        borderRadius: 10,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
      }}
    >
      <div>
        <div
          style={{
            fontSize: 10,
            color: C.navy,
            textTransform: 'uppercase',
            fontWeight: 900,
            letterSpacing: '0.45px',
          }}
        >
          {label}
        </div>

        <div
          style={{
            fontSize: 24,
            fontWeight: 900,
            color: valColor,
            marginTop: 4,
            lineHeight: 1,
          }}
        >
          {value}
        </div>
      </div>

      <svg width={48} height={48} viewBox="0 0 48 48">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="5" />

        {p > 0 && (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={C.orange}
            strokeWidth="5"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={0}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="round"
          />
        )}

        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fill={C.orange}
          fontSize="11"
          fontWeight="800"
        >
          {Math.round(p)}%
        </text>
      </svg>
    </div>
  );
}

function StackBar({ good, damaged, empty, total }) {
  return (
    <div
      style={{
        display: 'flex',
        height: 5,
        borderRadius: 999,
        overflow: 'hidden',
        background: '#f1f5f9',
        width: '100%',
      }}
    >
      <div style={{ width: `${pct(good, total)}%`, background: C.green }} />
      <div style={{ width: `${pct(damaged, total)}%`, background: C.red }} />
      <div style={{ width: `${pct(empty, total)}%`, background: C.slate }} />
    </div>
  );
}

function ProgressBar({ value, max, label }) {
  const p = max > 0 ? (value / max) * 100 : 0;

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 900,
            color: C.navy,
            textTransform: 'uppercase',
            letterSpacing: '0.45px',
          }}
        >
          {label}
        </span>

        <span
          style={{
            fontSize: 13,
            fontWeight: 900,
            color: C.orange,
          }}
        >
          {Math.round(p)}%
        </span>
      </div>

      <div
        style={{
          height: 5,
          background: '#f1f5f9',
          borderRadius: 999,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${p}%`,
            background: C.orange,
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  );
}

function ConditionBarCard({ good, damaged, empty, total }) {
  return (
    <div
      style={{
        flex: 1,
        background: C.surface,
        border: `1px solid ${C.line}`,
        borderRadius: 10,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
      }}
    >
      <Donut good={good} damaged={damaged} empty={empty} />

      <div style={{ flex: 1 }}>
        <div
          style={{
            display: 'flex',
            gap: 14,
            marginBottom: 7,
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: C.green, lineHeight: 1 }}>
              {good}
            </div>
            <div style={{ fontSize: 9, color: C.muted, marginTop: 4, fontWeight: 800 }}>
              Good
            </div>
          </div>

          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: C.red, lineHeight: 1 }}>
              {damaged}
            </div>
            <div style={{ fontSize: 9, color: C.muted, marginTop: 4, fontWeight: 800 }}>
              Damaged
            </div>
          </div>

          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: C.slate, lineHeight: 1 }}>
              {empty}
            </div>
            <div style={{ fontSize: 9, color: C.muted, marginTop: 4, fontWeight: 800 }}>
              Empty
            </div>
          </div>
        </div>

        <StackBar good={good} damaged={damaged} empty={empty} total={total} />
      </div>
    </div>
  );
}

function StatusCard({ title, good, damaged, empty, total }) {
  const rows = [
    { label: 'Total', val: total, color: total > 0 ? C.blue : C.slate },
    { label: 'Good', val: good, color: C.green },
    { label: 'Damaged', val: damaged, color: C.red },
    { label: 'Empty', val: empty, color: C.slate },
  ];

  return (
    <div
      style={{
        flex: 1,
        background: C.surface,
        border: `1px solid ${C.line}`,
        borderRadius: 10,
        padding: '12px 14px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 900,
          color: C.navy,
          textTransform: 'uppercase',
          letterSpacing: '0.45px',
          marginBottom: 10,
        }}
      >
        {title}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 5,
          marginBottom: 8,
        }}
      >
        {rows.map((item) => (
          <div key={item.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: item.color, lineHeight: 1 }}>
              {item.val}
            </div>

            <div style={{ fontSize: 8.5, color: C.muted, fontWeight: 800, marginTop: 4 }}>
              {item.label}
            </div>
          </div>
        ))}
      </div>

      <StackBar good={good} damaged={damaged} empty={empty} total={total} />
    </div>
  );
}

function StabilityCard({ title, passed, total }) {
  const percent = total > 0 ? Math.round((passed / total) * 100) : 0;

  return (
    <div
      style={{
        background: C.surface,
        borderRadius: 8,
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        border: `1px solid ${C.line}`,
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
          gap: 8,
        }}
      >
        <div
          style={{
            color: C.navy,
            fontSize: 10,
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.35px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={title}
        >
          {title}
        </div>

        <div
          style={{
            color: C.slate,
            fontSize: 10,
            fontWeight: 800,
            whiteSpace: 'nowrap',
          }}
        >
          {passed}/{total}
        </div>
      </div>

      <div
        style={{
          height: 4,
          background: '#f1f5f9',
          borderRadius: 999,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: '100%',
            background: percent >= 80 ? C.green : percent >= 50 ? C.orange : C.red,
            borderRadius: 999,
            transition: 'width 0.5s ease-out',
          }}
        />
      </div>
    </div>
  );
}

// --- PARAMETER STABILITY ACROSS DEVICES - FULLY DYNAMIC ---

const PARAMETER_STABILITY_CONFIG = [
  {
    id: 'psu',
    title: 'PSU Stability',
    columnPatterns: [
      /\bpsu\b/i,
      /psu.*condition/i,
      /psu.*cond/i,
      /psu.*scan/i,
      /power\s*supply/i,
    ],
  },
  {
    id: 'fan',
    title: 'Fan Stability',
    columnPatterns: [
      /\bfan\b/i,
      /fan.*condition/i,
      /fan.*status/i,
      /fan.*operation/i,
    ],
  },
  {
    id: 'airflow',
    title: 'Airflow Stability',
    columnPatterns: [
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
    columnPatterns: [
      /\bled\b/i,
      /led.*condition/i,
      /led.*status/i,
      /indicator/i,
      /light.*status/i,
    ],
  },
];

function findDynamicGroupHeader(headers) {
  const preferredPatterns = [
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

  for (const pattern of preferredPatterns) {
    const found = headers.find((header) => pattern.test(String(header || '')));
    if (found) return found;
  }

  return null;
}

function getDynamicGroupName(row, groupHeader) {
  if (groupHeader && hasMeaningfulValue(row[groupHeader])) {
    return cleanValue(row[groupHeader]);
  }

  return 'Uncategorized';
}

function findMatchingParameterColumns(headers, columnPatterns) {
  return headers.filter((header) => {
    const h = String(header || '');

    const blocked =
      /image/i.test(h) ||
      /preview/i.test(h) ||
      /path/i.test(h) ||
      /audit/i.test(h) ||
      /last\s*updated/i.test(h) ||
      /^description$/i.test(h) ||
      /^product\s*id$/i.test(h) ||
      /^name$/i.test(h);

    if (blocked) return false;

    return columnPatterns.some((pattern) => pattern.test(h));
  });
}

function classifyStabilityValue(value, header) {
  const h = normalizeKey(header);
  const v = cleanValue(value);

  if (!hasMeaningfulValue(v)) return null;

  if (isFailValue(v)) return 'fail';
  if (isPassValue(v)) return 'pass';

  // For scan/barcode-like fields, any non-empty value means completed/pass.
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

function getParameterStateForRow(row, columns) {
  if (!columns || columns.length === 0) return null;

  let hasValidValue = false;
  let hasPass = false;
  let hasFail = false;

  columns.forEach((column) => {
    const state = classifyStabilityValue(row[column], column);

    if (!state) return;

    hasValidValue = true;

    if (state === 'pass') hasPass = true;
    if (state === 'fail') hasFail = true;
  });

  if (!hasValidValue) return null;

  // One failed value makes that unit fail for that parameter.
  if (hasFail) return 'fail';

  if (hasPass) return 'pass';

  return null;
}

function ParameterDonut({ percent }) {
  const r = 17;
  const cx = 21;
  const cy = 21;
  const circ = 2 * Math.PI * r;
  const dash = (percent / 100) * circ;

  const color = percent >= 90 ? C.green : percent >= 60 ? C.orange : C.red;

  return (
    <svg width={42} height={42} viewBox="0 0 42 42">
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#f1f5f9"
        strokeWidth="4"
      />

      {percent > 0 && (
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={0}
          transform={`rotate(-90 ${cx} ${cy})`}
          strokeLinecap="round"
        />
      )}

      <text
        x={cx}
        y={cy + 4}
        textAnchor="middle"
        fill={color}
        fontSize="11"
        fontWeight="900"
      >
        {percent}%
      </text>
    </svg>
  );
}

function DOAAnalytics({ data }) {
  const headers = useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]).filter((h) => String(h).trim() !== '');
  }, [data]);

  const groupHeader = useMemo(() => {
    return findDynamicGroupHeader(headers);
  }, [headers]);

  const parameterColumns = useMemo(() => {
    const map = {};

    PARAMETER_STABILITY_CONFIG.forEach((parameter) => {
      map[parameter.id] = findMatchingParameterColumns(
        headers,
        parameter.columnPatterns
      );
    });

    return map;
  }, [headers]);

  const analytics = useMemo(() => {
    return PARAMETER_STABILITY_CONFIG.map((parameter) => {
      const columns = parameterColumns[parameter.id] || [];
      const groupMap = new Map();

      let totalPassed = 0;
      let totalChecked = 0;

      data.forEach((row) => {
        const state = getParameterStateForRow(row, columns);

        if (!state) return;

        const groupName = getDynamicGroupName(row, groupHeader);

        if (!groupMap.has(groupName)) {
          groupMap.set(groupName, {
            name: groupName,
            passed: 0,
            total: 0,
          });
        }

        const group = groupMap.get(groupName);

        group.total += 1;
        totalChecked += 1;

        if (state === 'pass') {
          group.passed += 1;
          totalPassed += 1;
        }
      });

      return {
        id: parameter.id,
        title: parameter.title,
        totalPassed,
        totalChecked,
        groups: Array.from(groupMap.values())
          .filter((group) => group.total > 0)
          .sort((a, b) => b.total - a.total),
      };
    });
  }, [data, groupHeader, parameterColumns]);

  if (!data || data.length === 0) {
    return null;
  }

  const hasAnyValidData = analytics.some((item) => item.totalChecked > 0);

  return (
    <div style={analyticsCardStyle}>
      <div style={analyticsHeaderRowStyle}>
        <span style={analyticsTitleStyle}>
          Parameter Stability Across Devices
        </span>

        <span style={analyticsSubTitleStyle}>
          Grouped by: {groupHeader || 'Uncategorized'}
        </span>
      </div>

      {!hasAnyValidData ? (
        <div
          style={{
            padding: 18,
            color: C.muted,
            fontSize: 13,
            fontWeight: 700,
            lineHeight: 1.6,
          }}
        >
          No valid PSU, Fan, Airflow, or LED columns found in the sheet.
          Add columns like <b>PSU Status</b>, <b>Fan Status</b>,{' '}
          <b>Airflow Status</b>, and <b>LED Status</b>.
        </div>
      ) : (
        <div style={analyticsBodyStyle}>
          {analytics.map((param) => {
            const overallPct =
              param.totalChecked > 0
                ? Math.round((param.totalPassed / param.totalChecked) * 100)
                : 0;

            return (
              <div
                key={param.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={analyticsParamHeaderStyle}>
                  <div style={{ flexShrink: 0, width: 42, height: 42 }}>
                    <ParameterDonut percent={overallPct} />
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      minWidth: 150,
                    }}
                  >
                    <h3 style={analyticsParamTitleStyle}>{param.title}</h3>

                    <span style={analyticsParamSubTextStyle}>
                      {param.totalChecked > 0
                        ? `${param.totalPassed} / ${param.totalChecked} Units Passed`
                        : 'No valid data'}
                    </span>
                  </div>

                  <div style={analyticsDividerStyle} />
                </div>

                {param.groups.length === 0 ? (
                  <div
                    style={{
                      padding: '10px 12px',
                      border: `1px dashed ${C.line}`,
                      borderRadius: 8,
                      color: C.muted,
                      fontSize: 11,
                      fontWeight: 700,
                      background: '#f8fafc',
                    }}
                  >
                    No usable {param.title} values found.
                  </div>
                ) : (
                  <div style={analyticsGridStyle}>
                    {param.groups.map((group) => (
                      <StabilityCard
                        key={`${param.id}-${group.name}`}
                        title={group.name}
                        passed={group.passed}
                        total={group.total}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- CABLING ANALYTICS WITH DUMMY DATA ---

const DUMMY_CABLING_DATA = [
  { rack: 'Rack A', total: 12, connected: 11, labeled: 10, routed: 9, portMapped: 10 },
  { rack: 'Rack B', total: 10, connected: 8, labeled: 7, routed: 8, portMapped: 6 },
  { rack: 'Rack C', total: 14, connected: 13, labeled: 12, routed: 11, portMapped: 12 },
  { rack: 'Rack D', total: 8, connected: 6, labeled: 5, routed: 6, portMapped: 5 },
];

function CablingAnalytics() {
  const cablingParams = [
    { id: 'connected', title: 'Cable Connectivity' },
    { id: 'labeled', title: 'Cable Labeling' },
    { id: 'routed', title: 'Routing Completion' },
    { id: 'portMapped', title: 'Port Mapping' },
  ];

  return (
    <div style={analyticsCardStyle}>
      <div style={analyticsHeaderRowStyle}>
        <span style={analyticsTitleStyle}>Cabling</span>
        <span style={analyticsSubTitleStyle}>Dummy Analytics</span>
      </div>

      <div style={analyticsBodyStyle}>
        {cablingParams.map((param) => {
          const totalPassed = DUMMY_CABLING_DATA.reduce(
            (sum, rack) => sum + rack[param.id],
            0
          );

          const totalChecked = DUMMY_CABLING_DATA.reduce(
            (sum, rack) => sum + rack.total,
            0
          );

          const overallPct =
            totalChecked > 0 ? Math.round((totalPassed / totalChecked) * 100) : 0;

          const r = 17;
          const cx = 21;
          const cy = 21;
          const circ = 2 * Math.PI * r;
          const dash = (overallPct / 100) * circ;

          return (
            <div key={param.id} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={analyticsParamHeaderStyle}>
                <div style={{ flexShrink: 0, width: 42, height: 42 }}>
                  <svg width={42} height={42} viewBox="0 0 42 42">
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="4" />

                    {overallPct > 0 && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill="none"
                        stroke={C.orange}
                        strokeWidth="4"
                        strokeDasharray={`${dash} ${circ - dash}`}
                        strokeDashoffset={0}
                        transform={`rotate(-90 ${cx} ${cy})`}
                        strokeLinecap="round"
                      />
                    )}

                    <text
                      x={cx}
                      y={cy + 4}
                      textAnchor="middle"
                      fill={C.orange}
                      fontSize="11"
                      fontWeight="900"
                    >
                      {overallPct}%
                    </text>
                  </svg>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <h3 style={analyticsParamTitleStyle}>{param.title}</h3>
                  <span style={analyticsParamSubTextStyle}>
                    {totalPassed} / {totalChecked} Cables Passed
                  </span>
                </div>

                <div style={analyticsDividerStyle} />
              </div>

              <div style={analyticsGridStyle}>
                {DUMMY_CABLING_DATA.map((rack) => (
                  <StabilityCard
                    key={`${param.id}-${rack.rack}`}
                    title={rack.rack}
                    passed={rack[param.id]}
                    total={rack.total}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- PRODUCT ID ANALYTICS FROM INVENTORY DATA ---

function ProductInventoryAnalytics({ data }) {
  const headers = useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]).filter((h) => String(h).trim() !== '');
  }, [data]);

  const columnMap = useMemo(() => {
    return {
      productId: findHeader(headers, [/product\s*id/i, /^pid$/i, /product/i]),
      name: findHeader(headers, [/^name$/i, /item\s*name/i, /asset\s*name/i, /device\s*name/i]),
      description: findHeader(headers, [/description/i, /desc/i]),
      assetNo: findHeader(headers, [/asset\s*no/i, /asset\s*number/i, /asset/i]),
      serialNo: findHeader(headers, [/serial\s*no/i, /serial\s*number/i, /^serial$/i]),
      condition: findHeader(headers, [/condition/i, /goods\s*condition/i]),
      psu1Scan: findHeader(headers, [/psu.*1.*scan/i, /psu-1.*scan/i, /psu1.*scan/i]),
      psu1Cond: findHeader(headers, [/psu.*1.*cond/i, /psu-1.*cond/i, /psu1.*condition/i]),
      psu2Scan: findHeader(headers, [/psu.*2.*scan/i, /psu-2.*scan/i, /psu2.*scan/i]),
      psu2Cond: findHeader(headers, [/psu.*2.*cond/i, /psu-2.*cond/i, /psu2.*condition/i]),
      powerCord: findHeader(headers, [/power\s*cord/i]),
      rails: findHeader(headers, [/rails/i, /rail/i]),
      lastUpdatedBy: findHeader(headers, [/last\s*updated/i, /updated\s*by/i, /technician/i]),
    };
  }, [headers]);

  const analytics = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        totalRows: 0,
        uniqueProducts: 0,
        products: [],
        scannedRows: 0,
        damagedRows: 0,
        accessoryReady: 0,
      };
    }

    const productMap = new Map();

    let scannedRows = 0;
    let damagedRows = 0;
    let accessoryReady = 0;

    data.forEach((row, index) => {
      const productId =
        getValueByHeader(row, columnMap.productId) ||
        `Unknown Product ${index + 1}`;

      const name = getValueByHeader(row, columnMap.name);
      const description = getValueByHeader(row, columnMap.description);
      const assetNo = getValueByHeader(row, columnMap.assetNo);
      const serialNo = getValueByHeader(row, columnMap.serialNo);
      const condition = getValueByHeader(row, columnMap.condition);
      const psu1Scan = getValueByHeader(row, columnMap.psu1Scan);
      const psu1Cond = getValueByHeader(row, columnMap.psu1Cond);
      const psu2Scan = getValueByHeader(row, columnMap.psu2Scan);
      const psu2Cond = getValueByHeader(row, columnMap.psu2Cond);
      const powerCord = getValueByHeader(row, columnMap.powerCord);
      const rails = getValueByHeader(row, columnMap.rails);
      const lastUpdatedBy = getValueByHeader(row, columnMap.lastUpdatedBy);

      const hasScan =
        hasMeaningfulValue(serialNo) ||
        hasMeaningfulValue(assetNo) ||
        hasMeaningfulValue(psu1Scan) ||
        hasMeaningfulValue(psu2Scan);

      const isDamaged = getStatusColor(condition) === C.red;
      const hasPowerCord = getStatusColor(powerCord) === C.green;
      const hasRails = getStatusColor(rails) === C.green;

      if (hasScan) scannedRows += 1;
      if (isDamaged) damagedRows += 1;
      if (hasPowerCord && hasRails) accessoryReady += 1;

      if (!productMap.has(productId)) {
        productMap.set(productId, {
          productId,
          name,
          description,
          total: 0,
          scanned: 0,
          damaged: 0,
          good: 0,
          psu1Ready: 0,
          psu2Ready: 0,
          powerCordReady: 0,
          railsReady: 0,
          sampleAssetNo: assetNo,
          sampleSerialNo: serialNo,
          lastUpdatedBy,
        });
      }

      const product = productMap.get(productId);

      product.total += 1;

      if (!product.name && name) product.name = name;
      if (!product.description && description) product.description = description;
      if (!product.sampleAssetNo && assetNo) product.sampleAssetNo = assetNo;
      if (!product.sampleSerialNo && serialNo) product.sampleSerialNo = serialNo;
      if (!product.lastUpdatedBy && lastUpdatedBy) product.lastUpdatedBy = lastUpdatedBy;

      if (hasScan) product.scanned += 1;
      if (isDamaged) product.damaged += 1;
      if (getStatusColor(condition) === C.green) product.good += 1;
      if (getStatusColor(psu1Scan || psu1Cond) === C.green) product.psu1Ready += 1;
      if (getStatusColor(psu2Scan || psu2Cond) === C.green) product.psu2Ready += 1;
      if (hasPowerCord) product.powerCordReady += 1;
      if (hasRails) product.railsReady += 1;
    });

    const products = Array.from(productMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    return {
      totalRows: data.length,
      uniqueProducts: productMap.size,
      products,
      scannedRows,
      damagedRows,
      accessoryReady,
    };
  }, [data, columnMap]);

  if (!data || data.length === 0) {
    return null;
  }

  const scanPct =
    analytics.totalRows > 0
      ? Math.round((analytics.scannedRows / analytics.totalRows) * 100)
      : 0;

  const accessoryPct =
    analytics.totalRows > 0
      ? Math.round((analytics.accessoryReady / analytics.totalRows) * 100)
      : 0;

  return (
    <div style={analyticsCardStyle}>
      <div style={analyticsHeaderRowStyle}>
        <span style={analyticsTitleStyle}>Product ID Analytics</span>
        <span style={analyticsSubTitleStyle}>Dynamic from inventory</span>
      </div>

      <div
        style={{
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 10,
          }}
        >
          <CompactStat
            label="Unique Product IDs"
            value={analytics.uniqueProducts}
            subText={`${analytics.totalRows} rows`}
            color={C.blue}
          />

          <CompactStat
            label="Scanned"
            value={`${scanPct}%`}
            subText={`${analytics.scannedRows}/${analytics.totalRows}`}
            color={C.green}
          />

          <CompactStat
            label="Damaged"
            value={analytics.damagedRows}
            subText="Condition issues"
            color={analytics.damagedRows > 0 ? C.red : C.slate}
          />

          <CompactStat
            label="Accessory Ready"
            value={`${accessoryPct}%`}
            subText={`${analytics.accessoryReady}/${analytics.totalRows}`}
            color={C.orange}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {analytics.products.map((product) => {
            const productScanPct =
              product.total > 0 ? Math.round((product.scanned / product.total) * 100) : 0;

            const accessoryCount = product.powerCordReady + product.railsReady;
            const accessoryTotal = product.total * 2;
            const accessoryProgress =
              accessoryTotal > 0 ? Math.round((accessoryCount / accessoryTotal) * 100) : 0;

            return (
              <div
                key={product.productId}
                style={{
                  border: `1px solid ${C.line}`,
                  borderRadius: 10,
                  padding: '10px 12px',
                  background: '#ffffff',
                  display: 'grid',
                  gridTemplateColumns: '1.4fr 1fr',
                  gap: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 5,
                    }}
                  >
                    <span style={{ color: C.navy, fontSize: 13, fontWeight: 900 }}>
                      {product.productId}
                    </span>

                    <span
                      style={{
                        color: C.muted,
                        fontSize: 10,
                        fontWeight: 800,
                        background: '#f1f5f9',
                        padding: '3px 7px',
                        borderRadius: 999,
                      }}
                    >
                      {product.total} units
                    </span>
                  </div>

                  <div
                    style={{
                      color: C.text,
                      fontSize: 12,
                      fontWeight: 800,
                      marginBottom: 4,
                    }}
                  >
                    {shortText(product.name || product.description, 42)}
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 6,
                      color: C.muted,
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    <span>Asset: {shortText(product.sampleAssetNo, 18)}</span>
                    <span>Serial: {shortText(product.sampleSerialNo, 18)}</span>
                    <span>PSU-1: {product.psu1Ready}/{product.total}</span>
                    <span>PSU-2: {product.psu2Ready}/{product.total}</span>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <MiniProgress label="Scan" value={productScanPct} color={C.green} />
                  <MiniProgress label="Accessories" value={accessoryProgress} color={C.orange} />

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 10,
                      fontWeight: 800,
                      color: C.muted,
                    }}
                  >
                    <span>Good: {product.good}</span>
                    <span style={{ color: product.damaged > 0 ? C.red : C.slate }}>
                      Damaged: {product.damaged}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MiniProgress({ label, value, color }) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 10,
          fontWeight: 800,
          color: C.muted,
          marginBottom: 4,
          textTransform: 'uppercase',
        }}
      >
        <span>{label}</span>
        <span>{value}%</span>
      </div>

      <div
        style={{
          height: 5,
          background: '#f1f5f9',
          borderRadius: 999,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${value}%`,
            background: color,
          }}
        />
      </div>
    </div>
  );
}

// --- SHARED ANALYTICS STYLES ---

const analyticsCardStyle = {
  background: C.surface,
  borderRadius: 10,
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
  border: `1px solid ${C.line}`,
  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
};

const analyticsHeaderStyle = {
  padding: '12px 14px',
  borderBottom: `1px solid ${C.line}`,
  background: '#f8fafc',
  color: C.navy,
  fontSize: 12,
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const analyticsHeaderRowStyle = {
  padding: '12px 14px',
  borderBottom: `1px solid ${C.line}`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexShrink: 0,
  background: '#f8fafc',
  gap: 12,
};

const analyticsTitleStyle = {
  color: C.navy,
  fontSize: 12,
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const analyticsSubTitleStyle = {
  color: C.muted,
  fontSize: 10,
  fontWeight: 800,
  textTransform: 'uppercase',
};

const analyticsBodyStyle = {
  padding: 14,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  overflowY: 'auto',
};

const analyticsParamHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  marginBottom: 10,
};

const analyticsParamTitleStyle = {
  margin: 0,
  color: C.navy,
  fontSize: 13,
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '0.45px',
};

const analyticsParamSubTextStyle = {
  color: C.slate,
  fontSize: 10,
  fontWeight: 800,
  textTransform: 'uppercase',
};

const analyticsDividerStyle = {
  height: 1,
  flex: 1,
  background: C.line,
  marginLeft: 6,
};

const analyticsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
  gap: 8,
};

// --- MAIN DASHBOARD ---

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(
        `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`
      );

      const txt = await res.text();
      const rows = parseCSV(txt);

      const hdrs = rows[0] || [];

      const dataRows = rows.slice(1).map((row) => {
        const o = {};
        hdrs.forEach((h, i) => {
          o[h] = row[i] || '';
        });
        return o;
      });

      setData(dataRows);
    } catch {
      setError('Failed to load data.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filteredData = useMemo(() => {
    let rows = [...data];

    if (searchTerm) {
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

  const st = useMemo(
    () => (filteredData.length > 0 ? computeStats(filteredData) : null),
    [filteredData]
  );

  const activities = useMemo(
    () => buildTechActivity(filteredData),
    [filteredData]
  );

  const allDates = useMemo(() => {
    const s = new Set();

    data.forEach((row) => {
      const d = getRowDate(row);
      if (d) s.add(d);
    });

    return Array.from(s).sort();
  }, [data]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div style={{ color: C.red, padding: 50 }}>
        {error}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: C.bg,
        overflowY: 'auto',
        paddingTop: '80px',
        boxSizing: 'border-box',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1600px',
          margin: '0 auto',
          height: '100%',
          padding: '0 24px 24px 24px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: C.surface,
            padding: '11px 14px',
            borderRadius: 10,
            border: `1px solid ${C.line}`,
            flexShrink: 0,
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 900,
              color: C.navy,
              letterSpacing: '-0.5px',
              textTransform: 'uppercase',
            }}
          >
            Data Center Assets
          </h1>

          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <input
              type="text"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '8px 12px',
                fontSize: 12,
                width: 220,
                border: `1px solid ${C.line}`,
                borderRadius: 8,
                outline: 'none',
                fontWeight: 600,
                color: C.text,
              }}
            />

            <span style={{ fontSize: 10, color: C.navy, fontWeight: 900 }}>
              From
            </span>

            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              min={allDates[0]}
              style={{
                padding: '7px 9px',
                border: `1px solid ${C.line}`,
                borderRadius: 8,
                background: C.surface,
                fontSize: 12,
                outline: 'none',
                color: C.text,
                fontWeight: 600,
              }}
            />

            <span style={{ fontSize: 10, color: C.navy, fontWeight: 900 }}>
              To
            </span>

            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              max={allDates[allDates.length - 1]}
              style={{
                padding: '7px 9px',
                border: `1px solid ${C.line}`,
                borderRadius: 8,
                background: C.surface,
                fontSize: 12,
                outline: 'none',
                color: C.text,
                fontWeight: 600,
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
                  padding: '8px 12px',
                  fontSize: 11,
                  color: C.red,
                  background: '#fef2f2',
                  border: `1px solid #fecaca`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                }}
              >
                Clear
              </button>
            )}

            <button
              onClick={fetchData}
              style={{
                padding: '8px 14px',
                fontSize: 11,
                background: C.navy,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 900,
                textTransform: 'uppercase',
              }}
            >
              Refresh
            </button>
          </div>
        </div>

        {st && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1.25fr 1fr',
              gap: 14,
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                style={{
                  flex: 1,
                  background: C.surface,
                  border: `1px solid ${C.line}`,
                  borderRadius: 10,
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: C.navy,
                    textTransform: 'uppercase',
                    fontWeight: 900,
                    letterSpacing: '0.45px',
                  }}
                >
                  Total Assets
                </div>

                <div
                  style={{
                    fontSize: 34,
                    fontWeight: 900,
                    color: st.total > 0 ? C.blue : C.slate,
                    marginTop: 4,
                    lineHeight: 1,
                  }}
                >
                  {st.total}
                </div>
              </div>

              <MiniPieChart value={st.scanned} total={st.total} label="Scanned" />
              <MiniPieChart value={st.notScanned} total={st.total} label="Pending" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                style={{
                  flex: 1,
                  background: C.surface,
                  border: `1px solid ${C.line}`,
                  borderRadius: 10,
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                }}
              >
                <ProgressBar
                  value={st.scanned}
                  max={st.total}
                  label="Overall Scan Completion"
                />
              </div>

              <StatusCard
                title="PSU-1 Status"
                good={st.psu1Good}
                damaged={st.psu1Dmg}
                empty={st.psu1Empty}
                total={st.total}
              />

              <StatusCard
                title="PSU-2 Status"
                good={st.psu2Good}
                damaged={st.psu2Dmg}
                empty={st.psu2Empty}
                total={st.total}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <ConditionBarCard
                good={st.condGood}
                damaged={st.condDmg}
                empty={st.condEmpty}
                total={st.total}
              />

              <MiniPieChart
                value={st.powerCord}
                total={st.total}
                label="Power Cord"
              />

              <MiniPieChart value={st.rails} total={st.total} label="Rails" />
            </div>
          </div>
        )}

        {st && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 14,
              flex: 1,
              minHeight: 0,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateRows: '0.72fr 1.28fr',
                gap: 14,
                minHeight: 0,
              }}
            >
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.line}`,
                  borderRadius: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  overflow: 'hidden',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                }}
              >
                <div
                  style={{
                    padding: '12px 14px',
                    fontSize: 12,
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderBottom: `1px solid ${C.line}`,
                    background: '#f8fafc',
                    flexShrink: 0,
                    color: C.navy,
                  }}
                >
                  Recent Technician Activity
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {activities.length === 0 ? (
                    <div
                      style={{
                        padding: 24,
                        textAlign: 'center',
                        color: C.muted,
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      No recent scans found.
                    </div>
                  ) : (
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: 12,
                      }}
                    >
                      <thead
                        style={{
                          position: 'sticky',
                          top: 0,
                          background: '#fff',
                          borderBottom: `1px solid ${C.line}`,
                          zIndex: 1,
                        }}
                      >
                        <tr>
                          <th style={compactTh}>Technician</th>
                          <th style={compactTh}>Date</th>
                          <th style={compactTh}>Time</th>
                        </tr>
                      </thead>

                      <tbody>
                        {activities.map((row, i) => (
                          <tr
                            key={i}
                            style={{
                              borderBottom:
                                i !== activities.length - 1
                                  ? `1px solid ${C.line}`
                                  : 'none',
                            }}
                          >
                            <td style={compactTdStrong}>{row.userName}</td>
                            <td style={compactTd}>{row.date || '—'}</td>
                            <td style={compactTd}>{row.time || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <ProductInventoryAnalytics data={filteredData} />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateRows: '1fr 1fr',
                gap: 14,
                minHeight: 0,
              }}
            >
              <DOAAnalytics data={filteredData} />
              <CablingAnalytics />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}